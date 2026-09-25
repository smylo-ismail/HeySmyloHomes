import { z } from 'zod';

// HDB_SELL_AND_BUY is, by definition, a second-timer purchase on the buy leg — you're only in
// this scenario because you already own the flat you're selling. See grants.ts's
// allSecondTimers path: no CHG/EHG, PHG only. Mixed first-timer/second-timer households (e.g.
// buying with a first-timer spouse) aren't supported — same "worth a chat" stop as the
// first-timer flow's second-timer gate.
// remainingLeaseYears is deliberately optional — see firstTimerHdbBuy.ts for why.
export const hdbSellAndBuySchema = z.object({
  // Sell leg
  sellFlatType: z.enum(['2R', '3R', '4R', '5R', 'EXEC', '3GEN']),
  sellPrice: z.number().int().positive(),
  outstandingLoanBalance: z.number().int().min(0),
  cpfPrincipalUsed: z.number().int().min(0),
  cpfUsageYears: z.number().int().min(0).optional(),
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
});

export type HdbSellAndBuyInput = z.infer<typeof hdbSellAndBuySchema>;
