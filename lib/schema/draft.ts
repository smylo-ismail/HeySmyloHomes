import type { FirstTimerHdbBuyInput } from './firstTimerHdbBuy';

/** Wizard's in-progress state — every field optional until the final step validates it.
 *  `allFirstTimers` is widened back to `boolean` (the schema pins it to the literal `true`
 *  because V1 only supports first-timers) so the wizard can represent "user said no" too. */
export type FirstTimerHdbBuyDraft = Omit<Partial<FirstTimerHdbBuyInput>, 'allFirstTimers'> & {
  allFirstTimers?: boolean;
};

export const EMPTY_DRAFT: FirstTimerHdbBuyDraft = {
  allFirstTimers: true,
  employedContinuously12Months: true,
  ownsOrDisposedPrivateWithin30Months: false,
  proximity: 'NONE',
  buyerAges: [],
};
