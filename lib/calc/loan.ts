import { RATES } from '@/config/rates';

export type LoanType = 'HDB' | 'BANK';
export type BindingConstraint = 'LTV' | 'MSR' | 'TDSR';

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
  const dutiable = Math.max(input.price, input.valuation);

  const ltvPct =
    input.loanType === 'HDB'
      ? RATES.loan.hdb.ltvPct
      : input.outstandingHousingLoans && input.outstandingHousingLoans >= 1
        ? RATES.loan.bank.ltvPctWithOneOutstandingLoan
        : RATES.loan.bank.ltvPctFirstLoan;
  const maxLoanLtv = dutiable * ltvPct;

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
  const binding = candidates.reduce((min, c) => (c.amount < min.amount ? c : min));
  const loanGranted = binding.amount;

  const actualMonthlyPayment =
    input.loanType === 'HDB'
      ? monthlyPaymentForLoan(loanGranted, RATES.loan.hdb.interestRate, input.tenureYears)
      : input.bankActualRate !== undefined
        ? monthlyPaymentForLoan(loanGranted, input.bankActualRate, input.tenureYears)
        : undefined;

  const minCashPct = input.loanType === 'HDB' ? RATES.loan.hdb.minCashPct : RATES.loan.bank.minCashPct;
  const minCashRequired = input.price * minCashPct;

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
