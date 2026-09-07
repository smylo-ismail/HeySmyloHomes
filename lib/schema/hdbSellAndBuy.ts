import { z } from 'zod';

// HDB_SELL_AND_BUY is, by definition, a second-timer purchase on the buy leg — you're only in
// this scenario because you already own the flat you're selling. See grants.ts's
// allSecondTimers path: no CHG/EHG, PHG only. Mixed first-timer/second-timer households (e.g.
// buying with a first-timer spouse) aren't supported — same "worth a chat" stop as the
// first-timer flow's second-timer gate.
export const hdbSellAndBuySchema = z
  .object({
    // Sell leg
    sellFlatType: z.enum(['2R', '3R', '4R', '5R', 'EXEC', '3GEN']),
    sellPrice: z.number().positive(),
    outstandingLoanBalance: z.number().min(0),
    cpfPrincipalUsed: z.number().min(0),
    cpfUsageYears: z.number().min(0).optional(),
    expectedSellCompletionDate: z.string(), // ISO date

    // Buy leg — mirrors firstTimerHdbBuySchema, minus allFirstTimers (always false here)
    applicationType: z.enum(['FAMILY', 'SINGLE', 'JOINT_SINGLES', 'NON_RESIDENT_SPOUSE']),
    citizenshipMix: z.enum(['SC_SC', 'SC_SPR', 'SC_ONLY']),
    avgMonthlyHouseholdIncome: z.number().positive(),
    employedContinuously12Months: z.boolean(),
    buyerAges: z.array(z.number().int().min(21).max(99)).min(1).max(2),
    flatSource: z.enum(['BTO', 'RESALE']),
    flatType: z.enum(['2R', '3R', '4R', '5R', 'EXEC', '3GEN']),
    price: z.number().positive(),
    valuation: z.number().positive(),
    remainingLeaseYears: z.number().positive().optional(),
    proximity: z.enum(['WITH_PARENTS_OR_CHILD', 'WITHIN_4KM', 'NONE']),
    ownsOrDisposedPrivateWithin30Months: z.boolean(),
    loanType: z.enum(['HDB', 'BANK']),
    tenureYears: z.number().int().positive(),
    additionalCpfOaBalance: z.number().min(0), // CPF OA beyond what's tied up in the flat being sold
    existingMonthlyDebt: z.number().min(0).optional(),
    bankActualRate: z.number().positive().optional(),
    expectedBuyCompletionDate: z.string(), // ISO date
  })
  .superRefine((val, ctx) => {
    if (val.flatSource === 'RESALE' && val.remainingLeaseYears === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['remainingLeaseYears'],
        message: 'Remaining lease years is required for resale flats.',
      });
    }
  });

export type HdbSellAndBuyInput = z.infer<typeof hdbSellAndBuySchema>;
