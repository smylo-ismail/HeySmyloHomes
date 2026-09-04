import { z } from 'zod';

export const firstTimerHdbBuySchema = z
  .object({
    applicationType: z.enum(['FAMILY', 'SINGLE', 'JOINT_SINGLES', 'NON_RESIDENT_SPOUSE']),
    citizenshipMix: z.enum(['SC_SC', 'SC_SPR', 'SC_ONLY']),
    allFirstTimers: z.literal(true), // V1 unsupported for second-timers, see grants.ts
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
    cpfOaBalance: z.number().min(0),
    existingMonthlyDebt: z.number().min(0).optional(),
    bankActualRate: z.number().positive().optional(),
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

export type FirstTimerHdbBuyInput = z.infer<typeof firstTimerHdbBuySchema>;
