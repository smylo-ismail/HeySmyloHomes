import { RATES } from '@/config/rates';

export type LoanType = 'HDB' | 'BANK';
export type BindingConstraint = 'LTV' | 'MSR' | 'TDSR' | 'FUNDS';

export interface LoanInput {
  loanType: LoanType;
  price: number;
  valuation: number;
  tenureYears: number;
  avgMonthlyHouseholdIncome: number;
  existingMonthlyDebt?: number; // for TDSR (bank loans only)
  outstandingHousingLoans?: 0 | 1; // determines bank LTV tier (75% vs 45%)
  isHdbOrEcPurchase?: boolean; // bank MSR only applies to HDB/EC purchases
  buyerAges?: number[];
  /** Actual (non-stress-tested) bank interest rate, if the user has one in mind. No fixed
   *  bank rate is specified anywhere in the spec (only the 4% MAS stress rate is), so this
   *  is left as an optional user input rather than a guessed constant. */
  bankActualRate?: number;
  /** CPF OA balance + housing grants — verified directly against HDB's own resale payment-plan
   *  calculator (screenshots, Sep 2026): the loan actually disbursed is the residual after
   *  applying these funds, not automatically the max eligible amount. Confirmed for both HDB and
   *  bank loans (nothing HDB-specific about the mechanic — a bank buyer with ample CPF simply
   *  doesn't need to borrow as much either). Defaults to 0, which reduces to the old
   *  always-take-the-max-eligible-loan behavior for callers that don't have this figure (e.g.
   *  existing unit tests probing the eligibility ceilings in isolation). */
  cpfAndGrantsAvailable?: number;
  /** Price-related costs beyond the price itself that are also CPF-payable and therefore also
   *  reduce how much you need to borrow — stamp duties (BSD+ABSD) and the conveyancing fee.
   *  Confirmed CPF-eligible per the same HDB calculator screenshots (valuation and agent
   *  commission are NOT included there — HDB's own "costs & fees" breakdown never itemizes
   *  them, implying they're paid outside the CPF/loan pipeline, so they stay cash-only and are
   *  not part of this figure). Defaults to 0. */
  cpfEligibleUpfrontCosts?: number;
}

export interface LoanResult {
  maxLoanLtv: number;
  maxLoanMsr?: number;
  maxLoanTdsr?: number;
  loanGranted: number;
  bindingConstraint: BindingConstraint;
  /** Undefined for bank loans unless `bankActualRate` was supplied — see LoanInput note. */
  actualMonthlyPayment?: number;
  downpayment: number;
  minCashRequired: number;
  warnings: string[];
}

function maxLoanFromMonthlyPayment(monthlyPayment: number, annualRate: number, tenureYears: number): number {
  if (monthlyPayment <= 0) return 0;
  const n = tenureYears * 12;
  const r = annualRate / 12;
  return (monthlyPayment * (1 - Math.pow(1 + r, -n))) / r;
}

function monthlyPaymentForLoan(loanAmount: number, annualRate: number, tenureYears: number): number {
  if (loanAmount <= 0) return 0;
  const n = tenureYears * 12;
  const r = annualRate / 12;
  return (loanAmount * r) / (1 - Math.pow(1 + r, -n));
}

export function computeLoan(input: LoanInput): LoanResult {
  const warnings: string[] = [];
  // The lower of price/valuation — confirmed against HDB's own resale payment-plan calculator
  // (screenshots, Sep 2026): "Initial Payment... based on the lower of resale price or value of
  // the flat", so the loan (and thus the initial-payment/downpayment split) is sized off the
  // lower figure too. Any price-over-valuation gap (cash-over-valuation, COV) must be topped up
  // in cash separately — see grants.ts/absd.ts, which correctly use the HIGHER of the two for
  // stamp duty purposes (a different, unrelated basis) via their own `dutiable` constants.
  const ltvBasis = Math.min(input.price, input.valuation);

  const ltvPct =
    input.loanType === 'HDB'
      ? RATES.loan.hdb.ltvPct
      : input.outstandingHousingLoans && input.outstandingHousingLoans >= 1
        ? RATES.loan.bank.ltvPctWithOneOutstandingLoan
        : RATES.loan.bank.ltvPctFirstLoan;
  const maxLoanLtv = ltvBasis * ltvPct;

  const stressRate =
    input.loanType === 'HDB' ? RATES.loan.hdb.stressTestRate : RATES.loan.bank.stressTestRate;

  const msrApplies = input.loanType === 'HDB' || !!input.isHdbOrEcPurchase;
  const msrPct = input.loanType === 'HDB' ? RATES.loan.hdb.msrPct : RATES.loan.bank.msrPct;
  const maxLoanMsr = msrApplies
    ? maxLoanFromMonthlyPayment(input.avgMonthlyHouseholdIncome * msrPct, stressRate, input.tenureYears)
    : undefined;

  const maxLoanTdsr =
    input.loanType === 'BANK'
      ? maxLoanFromMonthlyPayment(
          Math.max(
            input.avgMonthlyHouseholdIncome * RATES.loan.bank.tdsrPct - (input.existingMonthlyDebt ?? 0),
            0
          ),
          stressRate,
          input.tenureYears
        )
      : undefined;

  const candidates: { amount: number; label: BindingConstraint }[] = [{ amount: maxLoanLtv, label: 'LTV' }];
  if (maxLoanMsr !== undefined) candidates.push({ amount: maxLoanMsr, label: 'MSR' });
  if (maxLoanTdsr !== undefined) candidates.push({ amount: maxLoanTdsr, label: 'TDSR' });
  const eligible = candidates.reduce((min, c) => (c.amount < min.amount ? c : min));

  const minCashPct = input.loanType === 'HDB' ? RATES.loan.hdb.minCashPct : RATES.loan.bank.minCashPct;
  const minCashRequired = input.price * minCashPct;

  // Needs-based sizing: the loan is however much is left after price + CPF-eligible costs are
  // funded by CPF/grants and the mandatory minimum cash — not automatically the max eligible
  // amount. See LoanInput's cpfAndGrantsAvailable comment for the source. `binding` reflects
  // which constraint actually determined the granted amount: an eligibility ceiling (LTV/MSR/
  // TDSR) only when funds alone would have needed to borrow more than that ceiling allows;
  // otherwise 'FUNDS' — the buyer simply doesn't need to borrow up to their eligible max.
  const fundingNeed = input.price + (input.cpfEligibleUpfrontCosts ?? 0);
  const loanNeeded = Math.max(fundingNeed - minCashRequired - (input.cpfAndGrantsAvailable ?? 0), 0);
  const binding: { amount: number; label: BindingConstraint } =
    loanNeeded >= eligible.amount ? eligible : { amount: loanNeeded, label: 'FUNDS' };
  const loanGranted = binding.amount;

  const actualMonthlyPayment =
    input.loanType === 'HDB'
      ? monthlyPaymentForLoan(loanGranted, RATES.loan.hdb.interestRate, input.tenureYears)
      : input.bankActualRate !== undefined
        ? monthlyPaymentForLoan(loanGranted, input.bankActualRate, input.tenureYears)
        : undefined;

  const maxTenure =
    input.loanType === 'HDB'
      ? RATES.loan.hdb.maxTenureYears
      : input.isHdbOrEcPurchase
        ? RATES.loan.bank.maxTenureYearsHdb
        : RATES.loan.bank.maxTenureYearsPrivate;
  if (input.tenureYears > maxTenure) {
    warnings.push(`Tenure exceeds the ${maxTenure}-year maximum for this loan type.`);
  }
  if (
    input.loanType === 'BANK' &&
    input.buyerAges &&
    input.buyerAges.length > 0 &&
    (input.tenureYears > RATES.loan.bank.tenureHaircutThresholdYears ||
      Math.max(...input.buyerAges) + input.tenureYears > RATES.loan.bank.borrowerAgeHaircutThreshold)
  ) {
    warnings.push(
      'Tenure beyond 30 years or extending past age 65 typically triggers an LTV haircut — not yet modeled here, flag this scenario to smylo.'
    );
  }

  return {
    maxLoanLtv,
    maxLoanMsr,
    maxLoanTdsr,
    loanGranted,
    bindingConstraint: binding.label,
    actualMonthlyPayment,
    downpayment: input.price - loanGranted,
    minCashRequired,
    warnings,
  };
}
