import type { FirstTimerHdbBuyInput } from '@/lib/schema/firstTimerHdbBuy';
import { computeGrants, type GrantResult } from './grants';
import { computeBsd } from './bsd';
import { computeAbsd, type AbsdResult, type BuyerCitizenship } from './absd';
import { computeLoan, type LoanResult } from './loan';
import { computeCpfBuySide, type CpfBuySideResult } from './cpf';
import { computeBuyFees, type BuyFeesResult } from './fees';

export interface FirstTimerHdbBuyResult {
  grants: GrantResult;
  bsd: number;
  absd: AbsdResult;
  loan: LoanResult;
  cpf: CpfBuySideResult;
  fees: BuyFeesResult;
  totalCashRequired: number;
}

// citizenshipMix only ever carries a married-couple pairing (SC_SC / SC_SPR) or a single SC
// applicant (SC_ONLY) — see grants.ts for why SC_ONLY pairs with a SINGLE applicationType.
function citizenshipsFor(mix: FirstTimerHdbBuyInput['citizenshipMix']): {
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

/** Wires the calc engines together for the FIRST_TIMER_HDB_BUY scenario type. */
export function runFirstTimerHdbBuy(input: FirstTimerHdbBuyInput): FirstTimerHdbBuyResult {
  const grants = computeGrants({
    applicationType: input.applicationType,
    citizenshipMix: input.citizenshipMix,
    allFirstTimers: input.allFirstTimers,
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

  const { buyerCitizenships, isMarriedCouple } = citizenshipsFor(input.citizenshipMix);
  const absd = computeAbsd({
    buyerCitizenships,
    propertyCount: 1, // allFirstTimers is required for this scenario type
    price: input.price,
    valuation: input.valuation,
    isMarriedCouple,
    isFirstJointProperty: isMarriedCouple,
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
  });

  const cpf = computeCpfBuySide({
    oaBalance: input.cpfOaBalance,
    grantsTotal: grants.total,
    downpayment: loan.downpayment,
    stampDuty: bsd + absd.absd,
  });

  const fees = computeBuyFees({ kind: 'HDB', path: input.flatSource, price: input.price });

  const totalCashRequired = cpf.cashTopUp + fees.totalUpfrontCash;

  return { grants, bsd, absd, loan, cpf, fees, totalCashRequired };
}
