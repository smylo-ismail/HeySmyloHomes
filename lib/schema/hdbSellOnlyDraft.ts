import type { HdbSellOnlyInput } from './hdbSellOnly';

/** Wizard's in-progress state — every field optional until the final step validates it. */
export type HdbSellOnlyDraft = Partial<HdbSellOnlyInput>;

export const EMPTY_SELL_ONLY_DRAFT: HdbSellOnlyDraft = {
  sellers: [{ cpfPrincipalUsed: 0, cpfUsageYears: 0 }],
  planningNextPurchase: false,
};
