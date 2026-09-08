import type { HdbSellAndBuyInput } from '@/lib/schema/hdbSellAndBuy';
import { computeSellFlat, type SellFlatResult } from './sellFlat';
import { computeGrants, type GrantResult } from './grants';
import { computeBsd } from './bsd';
import { computeAbsd, type AbsdResult, type BuyerCitizenship } from './absd';
import { computeLoan, type LoanResult } from './loan';
import { computeCpfBuySide, type CpfBuySideResult } from './cpf';
import { computeBuyFees, type BuyFeesResult } from './fees';
import { computeCashflow, type CashflowEvent, type CashflowResult } from './cashflow';
import { estimateBuyCompletionDate, estimateSellCompletionDate } from '@/lib/timeline/hdbTimelines';

export interface HdbSellAndBuyResult {
  sell: SellFlatResult;
  grants: GrantResult;
  bsd: number;
  absd: AbsdResult;
  loan: LoanResult;
  cpf: CpfBuySideResult;
  fees: BuyFeesResult;
  cashflow: CashflowResult;
  /** Cash needed beyond what sale proceeds + CPF already cover — 0 if proceeds fully fund it. */
  totalCashRequired: number;
  /** ISO dates estimated from each leg's OTP/application anchor — see hdbTimelines.ts. */
  estimatedSellCompletionDate: string;
  estimatedBuyCompletionDate: string;
  warnings: string[];
}

// citizenshipMix only ever carries a married-couple pairing (SC_SC / SC_SPR) or a single SC
// applicant (SC_ONLY) — mirrors firstTimerHdbBuy.ts's citizenshipsFor.
function citizenshipsFor(mix: HdbSellAndBuyInput['citizenshipMix']): {
  buyerCitizenships: BuyerCitizenship[];
  isMarriedCouple: boolean;
} {
  switch (mix) {
    case 'SC_SC':
      return { buyerCitizenships: ['SC', 'SC'], isMarriedCouple: true };
    case 'SC_SPR':
      return { buyerCitizenships: ['SC', 'SPR'], isMarriedCouple: true };
    case 'SC_ONLY':
      return { buyerCitizenships: ['SC'], isMarriedCouple: false };
  }
}

/** Wires the calc engines together for the HDB_SELL_AND_BUY scenario type. */
export function runHdbSellAndBuy(input: HdbSellAndBuyInput): HdbSellAndBuyResult {
  const warnings: string[] = [];

  const sell = computeSellFlat({
    salePrice: input.sellPrice,
    outstandingLoanBalance: input.outstandingLoanBalance,
    cpfRefund: { principal: input.cpfPrincipalUsed, years: input.cpfUsageYears },
    resaleLevy: {
      isSecondSubsidisedFlat: true, // selling one subsidised HDB flat to buy another
      flatTypeSold: input.sellFlatType,
    },
  });

  const grants = computeGrants({
    applicationType: input.applicationType,
    citizenshipMix: input.citizenshipMix,
    allFirstTimers: false,
    allSecondTimers: true,
    avgMonthlyHouseholdIncome: input.avgMonthlyHouseholdIncome,
    employedContinuously12Months: input.employedContinuously12Months,
    buyerAges: input.buyerAges,
    flatSource: input.flatSource,
    flatType: input.flatType,
    remainingLeaseYears: input.remainingLeaseYears,
    proximity: input.proximity,
    ownsOrDisposedPrivateWithin30Months: input.ownsOrDisposedPrivateWithin30Months,
  });

  const bsd = computeBsd(input.price, input.valuation);

  // Neither leg's completion date is asked directly — both are estimated forward from the one
  // concrete, plannable date each side actually has: when an OTP was/will be granted (or, for
  // a BTO purchase, the application date). See lib/timeline/hdbTimelines.ts for the same math
  // driving the process-timeline display.
  const estimatedSellCompletionDate = estimateSellCompletionDate(input.sellOtpGrantedDate);
  const estimatedBuyCompletionDate = estimateBuyCompletionDate(input.flatSource, input.buyAnchorDate);

  // HDB doesn't allow owning two HDB flats concurrently, so the sale should complete on or
  // before the purchase. If the wizard's dates say otherwise, this couple would count as
  // owning 2 residential properties at the point of purchase — flag it and price it correctly
  // rather than silently assuming the (not actually available) 1-property rate.
  const sellsBeforeOrOnBuy = estimatedSellCompletionDate <= estimatedBuyCompletionDate;
  if (!sellsBeforeOrOnBuy) {
    warnings.push(
      'HDB doesn’t allow owning two HDB flats at once — buying before your sale completes isn’t normally possible without a special arrangement. Worth a chat with smylo.'
    );
  }
  const propertyCount = sellsBeforeOrOnBuy ? 1 : 2;

  const { buyerCitizenships, isMarriedCouple } = citizenshipsFor(input.citizenshipMix);
  const absd = computeAbsd({
    buyerCitizenships,
    propertyCount,
    price: input.price,
    valuation: input.valuation,
    isMarriedCouple,
    // Never their first jointly-owned home — they're selling one to buy this one — so no
    // spousal remission, unlike the FIRST_TIMER_HDB_BUY scenario.
    isFirstJointProperty: false,
  });

  const loan = computeLoan({
    loanType: input.loanType,
    price: input.price,
    valuation: input.valuation,
    tenureYears: input.tenureYears,
    avgMonthlyHouseholdIncome: input.avgMonthlyHouseholdIncome,
    existingMonthlyDebt: input.existingMonthlyDebt,
    isHdbOrEcPurchase: true,
    bankActualRate: input.bankActualRate,
    buyerAges: input.buyerAges,
    // The old loan is only actually redeemed once the sale completes (see sell leg above) — if
    // that hasn't happened yet by the time this loan is taken out, it's still outstanding and
    // drops the bank LTV tier from 75% to 45%.
    outstandingHousingLoans: sellsBeforeOrOnBuy ? 0 : 1,
  });

  // The sale's CPF refund lands back in CPF OA before it can fund the new purchase.
  const cpfOaBalance = input.additionalCpfOaBalance + sell.cpfRefund.totalRefund;

  const cpf = computeCpfBuySide({
    oaBalance: cpfOaBalance,
    grantsTotal: grants.total,
    downpayment: loan.downpayment,
    stampDuty: bsd + absd.absd,
  });

  const fees = computeBuyFees({ kind: 'HDB', path: input.flatSource, price: input.price });

  const events: CashflowEvent[] = [
    {
      date: estimatedSellCompletionDate,
      label: 'Sale completion — net proceeds',
      cash: sell.netCashProceeds,
      cpf: sell.cpfRefund.totalRefund,
      direction: 'IN',
    },
    {
      date: estimatedBuyCompletionDate,
      label: 'Purchase completion — downpayment, duties & fees',
      cash: -(cpf.cashTopUp + fees.totalUpfrontCash),
      cpf: -cpf.cpfNeeded,
      direction: 'OUT',
    },
  ];

  const cashflow = computeCashflow(events, { contraFacilityAvailable: input.flatSource === 'BTO' });

  warnings.push(...sell.warnings, ...grants.warnings, ...loan.warnings, ...cashflow.warnings);

  const totalCashRequired = cashflow.bridgingNeeded ? cashflow.bridgingAmount : 0;

  return {
    sell,
    grants,
    bsd,
    absd,
    loan,
    cpf,
    fees,
    cashflow,
    totalCashRequired,
    estimatedSellCompletionDate,
    estimatedBuyCompletionDate,
    warnings,
  };
}
