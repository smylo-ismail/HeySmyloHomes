import { z } from 'zod';

// HDB_SELL_AND_BUY is, by definition, a second-timer purchase on the buy leg — you're only in
// this scenario because you already own the flat you're selling. See grants.ts's
// allSecondTimers path: no CHG/EHG, PHG only. Mixed first-timer/second-timer households (e.g.
// buying with a first-timer spouse) aren't supported — same "worth a chat" stop as the
// first-timer flow's second-timer gate.
// remainingLeaseYears is deliberately optional — see firstTimerHdbBuy.ts for why.
// One entry per co-owner selling the flat — HDB's own "Calculate Sale Proceeds" tool lets each
// seller enter their own CPF-used figure rather than a single household total, since co-owners
// don't necessarily share the same usage history.
const sellerSchema = z.object({
  cpfPrincipalUsed: z.number().int().min(0),
  cpfUsageYears: z.number().int().min(0).optional(),
});

export const hdbSellAndBuySchema = z.object({
  // Sell leg
  sellFlatType: z.enum(['2R', '3R', '4R', '5R', 'EXEC', '3GEN']),
  sellPrice: z.number().int().positive(),
  outstandingLoanBalance: z.number().int().min(0),
  sellers: z.array(sellerSchema).min(1),
  // Outstanding HDB upgrading levy and upgrading costs — both manual entries (HDB's own
  // calculator doesn't expose a formula for these; see sellFlat.ts's comment). Both optional,
  // defaulting to 0 when not applicable.
  upgradingLevy: z.number().int().min(0).optional(),
  outstandingUpgradingCost: z.number().int().min(0).optional(),
  // How net sale proceeds are split between sellers. Left blank (or Joint Tenancy), proceeds
  // split equally. Tenancy-in-Common requires one share per seller, summing to 1 — see
  // sellFlat.ts's ShareOfProceedsInput for the caveat about this not being independently
  // verified against HDB's own Tenancy-in-Common sub-form.
  mannerOfHolding: z.enum(['JOINT_TENANCY', 'TENANCY_IN_COMMON']).optional(),
  ownershipShares: z.array(z.number().min(0).max(1)).optional(),
  // The date you granted (or expect to grant) your buyer the OTP — a concrete, plannable
  // event, unlike guessing a completion date. Completion is estimated forward from here.
  sellOtpGrantedDate: z.string(), // ISO date

  // Buy leg — mirrors firstTimerHdbBuySchema, minus allFirstTimers (always false here).
  // flatDestination decides whether this is another HDB flat or a private resale property —
  // flatSource/flatType/proximity are HDB-only fields (superRefine below requires them when
  // flatDestination is 'HDB'; a private buy is resale-only for now, see hdbTimelines.ts).
  applicationType: z.enum(['FAMILY', 'SINGLE', 'JOINT_SINGLES', 'NON_RESIDENT_SPOUSE']),
  citizenshipMix: z.enum(['SC_SC', 'SC_SPR', 'SC_ONLY']),
  avgMonthlyHouseholdIncome: z.number().int().positive(),
  employedContinuously12Months: z.boolean(),
  buyerAges: z.array(z.number().int().min(21).max(99)).min(1).max(2),
  flatDestination: z.enum(['HDB', 'PRIVATE']),
  flatSource: z.enum(['BTO', 'RESALE']).optional(),
  flatType: z.enum(['2R', '3R', '4R', '5R', 'EXEC', '3GEN']).optional(),
  price: z.number().int().positive(),
  valuation: z.number().int().positive(),
  remainingLeaseYears: z.number().int().positive().optional(),
  proximity: z.enum(['WITH_PARENTS_OR_CHILD', 'WITHIN_4KM', 'NONE']).optional(),
  ownsOrDisposedPrivateWithin30Months: z.boolean(),
  loanType: z.enum(['HDB', 'BANK']),
  tenureYears: z.number().int().positive(),
  additionalCpfOaBalance: z.number().int().min(0), // CPF OA beyond what's tied up in the flat being sold
  existingMonthlyDebt: z.number().int().min(0).optional(),
  bankActualRate: z.number().positive().optional(),
  // RESALE/private: the date an OTP was/will be granted to you. BTO: your application date.
  // Completion is estimated forward from here rather than asked directly.
  buyAnchorDate: z.string(), // ISO date
  // Optional — not everyone renovates, and actual duration is entirely case-specific (scope of
  // works, permit processing, contractor availability). Left blank, the timeline stops at
  // completion/key collection as before. Buy leg only — you don't renovate a flat you're selling.
  expectedRenovationWeeks: z.number().int().positive().optional(),
  // Optional resale-process timing overrides (buy leg, RESALE flatSource only) — each defaults
  // to config/rates.ts's hdbResaleBuy figures when left blank. Buy leg only — see
  // hdbTimelines.ts's getResaleSellTimeline, which shares these same defaults with the sell leg
  // rather than a separate copy, so a dedicated sell-leg override isn't offered here.
  optionPeriodDays: z.number().int().positive().optional(),
  applicationDays: z.number().int().positive().optional(),
  acceptanceWeeks: z.number().int().positive().optional(),
  completionWeeksAfterAcceptance: z.number().int().positive().optional(),
}).superRefine((data, ctx) => {
  if (data.flatDestination === 'HDB') {
    if (!data.flatSource) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['flatSource'], message: 'Required for an HDB purchase.' });
    }
    if (!data.flatType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['flatType'], message: 'Required for an HDB purchase.' });
    }
    if (!data.proximity) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['proximity'], message: 'Required for an HDB purchase.' });
    }
  } else if (data.loanType === 'HDB') {
    // Defense-in-depth: the wizard only offers a bank loan once "private" is picked — this
    // only fires for a stale localStorage draft from before this field existed.
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['loanType'],
      message: 'An HDB loan can’t be used for a private property purchase.',
    });
  }
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
});

export type HdbSellAndBuyInput = z.infer<typeof hdbSellAndBuySchema>;
