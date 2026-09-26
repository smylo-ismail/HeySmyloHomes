import { z } from 'zod';

// HDB_SELL_ONLY — standalone "just selling" scenario, mirroring HDB's own "Calculate Sale
// Proceeds" tool (no buy leg modeled at all, unlike HDB_SELL_AND_BUY). Sell-leg fields below are
// identical to hdbSellAndBuy.ts's sell leg — see that file's comments for the sourcing/rationale
// behind each one (multi-seller CPF, upgrading levy/costs, manner of holding).
const sellerSchema = z.object({
  cpfPrincipalUsed: z.number().int().min(0),
  cpfUsageYears: z.number().int().min(0).optional(),
});

export const hdbSellOnlySchema = z
  .object({
    sellFlatType: z.enum(['2R', '3R', '4R', '5R', 'EXEC', '3GEN']),
    sellPrice: z.number().int().positive(),
    outstandingLoanBalance: z.number().int().min(0),
    sellers: z.array(sellerSchema).min(1),
    upgradingLevy: z.number().int().min(0).optional(),
    outstandingUpgradingCost: z.number().int().min(0).optional(),
    mannerOfHolding: z.enum(['JOINT_TENANCY', 'TENANCY_IN_COMMON']).optional(),
    ownershipShares: z.array(z.number().min(0).max(1)).optional(),
    sellOtpGrantedDate: z.string(), // ISO date
    // Optional resale-process timing overrides — each defaults to config/rates.ts's
    // hdbResaleBuy figures when left blank. In reality a buyer may exercise well before the
    // full 21-day option period runs out, or the resale application may go in earlier/later
    // than the typical week after exercise — these let the timeline reflect what actually
    // happened (or is expected) rather than always assuming the textbook durations.
    optionPeriodDays: z.number().int().positive().optional(),
    applicationDays: z.number().int().positive().optional(),
    acceptanceWeeks: z.number().int().positive().optional(),
    completionWeeksAfterAcceptance: z.number().int().positive().optional(),

    // "Next housing plans" — optional and informational only, matching HDB's own tool: there's
    // no buy leg here to actually size a loan against, so these only drive two display-only
    // figures below (the resale levy, and a preview of the mandatory minimum-cash-proceeds
    // rule), not a full second computation. Left blank, both stay at their "not buying again"
    // defaults (no levy, no mandatory-cash preview).
    planningNextPurchase: z.boolean().optional(),
    // Whether this counts as disposing of a subsidised flat to acquire ANOTHER subsidised flat —
    // the actual resale-levy trigger (see resaleLevy.ts). Asked directly, self-declared, rather
    // than re-deriving it from a full grants computation we're not running here.
    nextFlatIsAnotherSubsidisedFlat: z.boolean().optional(),
    nextFlatDestination: z.enum(['HDB', 'PRIVATE']).optional(),
    nextLoanType: z.enum(['HDB', 'BANK']).optional(), // only meaningful when nextFlatDestination is HDB
  })
  .superRefine((data, ctx) => {
    if (data.mannerOfHolding === 'TENANCY_IN_COMMON') {
      if (!data.ownershipShares || data.ownershipShares.length !== data.sellers.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ownershipShares'],
          message: 'One ownership share is needed per seller for Tenancy-in-Common.',
        });
      } else if (Math.abs(data.ownershipShares.reduce((sum, s) => sum + s, 0) - 1) > 0.01) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ownershipShares'],
          message: 'Ownership shares must add up to 100%.',
        });
      }
    }
    if (data.planningNextPurchase) {
      if (data.nextFlatIsAnotherSubsidisedFlat === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['nextFlatIsAnotherSubsidisedFlat'],
          message: 'Required when planning your next purchase.',
        });
      }
      if (!data.nextFlatDestination) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['nextFlatDestination'],
          message: 'Required when planning your next purchase.',
        });
      } else if (data.nextFlatDestination === 'HDB' && !data.nextLoanType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['nextLoanType'],
          message: 'Required for another HDB purchase.',
        });
      }
    }
  });

export type HdbSellOnlyInput = z.infer<typeof hdbSellOnlySchema>;
