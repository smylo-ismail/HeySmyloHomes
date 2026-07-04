import { RATES } from '@/config/rates';

export type PropertyKind = 'HDB' | 'PRIVATE';
export type PurchasePath = 'BTO' | 'RESALE' | 'NEW_LAUNCH';

export interface BuyFeesInput {
  kind: PropertyKind;
  path: PurchasePath;
  price: number;
  conveyancingOverride?: number;
  valuationOverride?: number;
  buyerCommissionPctOverride?: number;
}

export interface BuyFeesResult {
  conveyancing: number;
  valuation: number;
  commission: number;
  optionMoneyInitial: number;
  optionMoneyExercise: number;
  totalUpfrontCash: number;
}

export function computeBuyFees(input: BuyFeesInput): BuyFeesResult {
  const conveyancing =
    input.conveyancingOverride ??
    (input.kind === 'HDB' ? RATES.fees.conveyancing.hdb.default : RATES.fees.conveyancing.private.default);
  const valuation = input.valuationOverride ?? RATES.fees.valuation.default;

  const buyerCommissionPct =
    input.buyerCommissionPctOverride ??
    (input.kind === 'HDB' ? RATES.fees.commission.buyerPctHdb : RATES.fees.commission.buyerPctPrivateResale);
  const commission = input.price * buyerCommissionPct * (1 + RATES.fees.commission.gstPct);

  let optionMoneyInitial = 0;
  let optionMoneyExercise = 0;
  if (input.kind === 'HDB' && input.path === 'RESALE') {
    optionMoneyInitial = RATES.fees.optionMoney.hdb.initial;
    optionMoneyExercise = RATES.fees.optionMoney.hdb.exercise;
  } else if (input.kind === 'PRIVATE' && input.path === 'NEW_LAUNCH') {
    optionMoneyInitial = input.price * RATES.fees.optionMoney.newLaunchBookingPct;
  } else if (input.kind === 'PRIVATE' && input.path === 'RESALE') {
    optionMoneyInitial = input.price * RATES.fees.optionMoney.privateResale.initialPct;
    optionMoneyExercise = input.price * RATES.fees.optionMoney.privateResale.exercisePct;
  }
  // BTO: no OTP-style option money in this flow; booking mechanics are handled in the
  // timeline builder, not the fee engine.

  const totalUpfrontCash = conveyancing + valuation + commission + optionMoneyInitial + optionMoneyExercise;

  return { conveyancing, valuation, commission, optionMoneyInitial, optionMoneyExercise, totalUpfrontCash };
}

export interface SellFeesInput {
  kind: PropertyKind;
  price: number;
  conveyancingOverride?: number;
  sellerCommissionPctOverride?: number;
}

export interface SellFeesResult {
  conveyancing: number;
  commission: number;
}

export function computeSellFees(input: SellFeesInput): SellFeesResult {
  const conveyancing =
    input.conveyancingOverride ??
    (input.kind === 'HDB' ? RATES.fees.conveyancing.hdb.default : RATES.fees.conveyancing.private.default);
  const sellerCommissionPct = input.sellerCommissionPctOverride ?? RATES.fees.commission.sellerPct;
  const commission = input.price * sellerCommissionPct * (1 + RATES.fees.commission.gstPct);
  return { conveyancing, commission };
}
