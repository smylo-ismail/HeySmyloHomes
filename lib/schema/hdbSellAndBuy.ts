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

  // Buy leg — mirrors firstTimerHdbBuySchema, minus allFirstTimers (always false here)
  applicationType: z.enum(['FAMILY', 'SINGLE', 'JOINT_SINGLES', 'NON_RESIDENT_SPOUSE']),
  citizenshipMix: z.enum(['SC_SC', 'SC_SPR', 'SC_ONLY']),
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
  additionalCpfOaBalance: z.number().int().min(0), // CPF OA beyond what's tied up in the flat being sold
  existingMonthlyDebt: z.number().int().min(0).optional(),
  bankActualRate: z.number().positive().optional(),
  // RESALE: the date an OTP was/will be granted to you. BTO: your application date.
  // Completion is estimated forward from here rather than asked directly.
  buyAnchorDate: z.string(), // ISO date
});

export type HdbSellAndBuyInput = z.infer<typeof hdbSellAndBuySchema>;
