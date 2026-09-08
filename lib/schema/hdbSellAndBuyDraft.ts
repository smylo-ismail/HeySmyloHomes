import type { HdbSellAndBuyInput } from './hdbSellAndBuy';

/** Wizard's in-progress state — every field optional until the final step validates it. */
export type HdbSellAndBuyDraft = Partial<HdbSellAndBuyInput>;

export const EMPTY_SELL_AND_BUY_DRAFT: HdbSellAndBuyDraft = {
  cpfUsageYears: 0,
  employedContinuously12Months: true,
  ownsOrDisposedPrivateWithin30Months: false,
  proximity: 'NONE',
  buyerAges: [],
  additionalCpfOaBalance: 0,
};
