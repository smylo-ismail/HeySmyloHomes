import { z } from 'zod';

// remainingLeaseYears is deliberately optional even for resale flats — not everyone has the
// exact figure on hand. Left blank, grants.ts assumes the CHG 20-year minimum is met and warns
// that this needs confirming, rather than blocking the whole scenario on a field people often
// don't know offhand.
export const firstTimerHdbBuySchema = z.object({
  applicationType: z.enum(['FAMILY', 'SINGLE', 'JOINT_SINGLES', 'NON_RESIDENT_SPOUSE']),
  citizenshipMix: z.enum(['SC_SC', 'SC_SPR', 'SC_ONLY']),
  allFirstTimers: z.literal(true), // V1 unsupported for second-timers, see grants.ts
  avgMonthlyHouseholdIncome: z.number().int().positive(),
  employedContinuously12Months: z.boolean(),
  buyerAges: z.array(z.number().int().min(21).max(99)).min(1).max(2),
  flatSource: z.enum(['BTO', 'RESALE']),
  flatType: z.enum(['2R', '3R', '4R', '5R', 'EXEC', '3GEN']),
  price: z.number().int().positive(),
  valuation: z.number().int().positive(),
  remainingLeaseYears: z.number().int().positive().optional(),
  proximity: z.enum(['WITH_PARENTS_OR_CHILD', 'WITHIN_4KM', 'NONE']),
  ownsOrDisposedPrivateWithin30Months: z.boolean(),
  loanType: z.enum(['HDB', 'BANK']),
  tenureYears: z.number().int().positive(),
  cpfOaBalance: z.number().int().min(0),
  existingMonthlyDebt: z.number().int().min(0).optional(),
  bankActualRate: z.number().positive().optional(),
  // Optional — anchors the process timeline to real calendar dates instead of abstract
  // durations. RESALE: the date an OTP was/will be granted. BTO: the application date.
  timelineAnchorDate: z.string().optional(),
});

export type FirstTimerHdbBuyInput = z.infer<typeof firstTimerHdbBuySchema>;
