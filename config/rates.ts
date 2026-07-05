// ALL rates, amounts, ceilings, and durations used by /lib/calc and /lib/timeline
// MUST be read from here. Never inline a rate/amount/duration in a calc file.
//
// Verified against: official HDB EHG table (post-Aug-2024, families), IRAS BSD/ABSD/SSD
// schedules, MAS/HDB loan rules, as hand-checked in golden-cases.json / goldentests.md.
export const RATES = {
  asOfDate: '2026-07-01',

  bsd: {
    // Residential Buyer's Stamp Duty bands, applied to the higher of price/valuation.
    // Each band's `rate` applies to the portion of the price falling within
    // (previous band's upTo, this band's upTo].
    bands: [
      { upTo: 180_000, rate: 0.01 },
      { upTo: 360_000, rate: 0.02 },
      { upTo: 1_000_000, rate: 0.03 },
      { upTo: 1_500_000, rate: 0.04 },
      { upTo: 3_000_000, rate: 0.05 },
      { upTo: Infinity, rate: 0.06 },
    ],
  },

  absd: {
    // Indexed by buyer profile: [1st property, 2nd property, 3rd+ property]
    SC: [0, 0.2, 0.3],
    SPR: [0.05, 0.3, 0.35],
    FOREIGNER: 0.6,
    // FTA nationals treated as SC for ABSD purposes.
    ftaNationalitiesTreatedAsSC: ['US', 'CH', 'NO', 'IS', 'LI'] as const,
  },

  ssd: {
    // Purchase date on/after this cutover uses the 4-year schedule; before uses the legacy 3-year schedule.
    scheduleCutoverDate: '2025-07-04',
    postCutoverScheduleByYear: [0.16, 0.12, 0.08, 0.04], // holding year 1,2,3,4
    legacyScheduleByYear: [0.12, 0.08, 0.04], // holding year 1,2,3
  },

  loan: {
    hdb: {
      interestRate: 0.026,
      stressTestRate: 0.03,
      msrPct: 0.3,
      ltvPct: 0.75,
      maxTenureYears: 25,
      minCashPct: 0,
      // Average monthly household income ceilings to qualify for an HDB loan at all.
      incomeCeilings: { family: 14_000, single: 7_000, extendedFamily: 21_000 },
    },
    bank: {
      stressTestRate: 0.04,
      msrPct: 0.3, // applies only when purchasing an HDB flat or EC
      tdsrPct: 0.55,
      ltvPctFirstLoan: 0.75,
      ltvPctWithOneOutstandingLoan: 0.45,
      minCashPct: 0.05,
      maxTenureYearsHdb: 30,
      maxTenureYearsPrivate: 35,
      // Beyond either threshold, LTV is haircut (not yet modeled — flag only).
      tenureHaircutThresholdYears: 30,
      borrowerAgeHaircutThreshold: 65,
    },
  },

  grants: {
    ehgIncomeCeiling: { FAMILY: 9_000, SINGLE: 4_500 },
    // Official HDB "Enhanced CPF Housing Grant (EHG) amount for first-timer households"
    // table, post-Aug-2024. Confirmed identical to HDB's "Grant amount for two or more
    // first-timer singles" table (Joint Singles Scheme) — see grants.ts householdTier.
    // Band is inclusive of maxIncome; income above the last band's maxIncome is ineligible.
    ehgFamilyBands: [
      { maxIncome: 1_500, amount: 120_000 },
      { maxIncome: 2_000, amount: 110_000 },
      { maxIncome: 2_500, amount: 105_000 },
      { maxIncome: 3_000, amount: 95_000 },
      { maxIncome: 3_500, amount: 90_000 },
      { maxIncome: 4_000, amount: 80_000 },
      { maxIncome: 4_500, amount: 70_000 },
      { maxIncome: 5_000, amount: 65_000 },
      { maxIncome: 5_500, amount: 55_000 },
      { maxIncome: 6_000, amount: 50_000 },
      { maxIncome: 6_500, amount: 40_000 },
      { maxIncome: 7_000, amount: 30_000 },
      { maxIncome: 7_500, amount: 25_000 },
      { maxIncome: 8_000, amount: 20_000 },
      { maxIncome: 8_500, amount: 10_000 },
      { maxIncome: 9_000, amount: 5_000 },
    ],
    // Official HDB "Grant amount for single applicant/single child" table (EHG Singles),
    // post-Aug-2024. Also used for the Non-Resident-Spouse scheme, but keyed on HALF the
    // average monthly household income rather than the individual's income directly — see
    // grants.ts computeEhg.
    ehgSingleBands: [
      { maxIncome: 750, amount: 60_000 },
      { maxIncome: 1_000, amount: 55_000 },
      { maxIncome: 1_250, amount: 52_500 },
      { maxIncome: 1_500, amount: 47_500 },
      { maxIncome: 1_750, amount: 45_000 },
      { maxIncome: 2_000, amount: 40_000 },
      { maxIncome: 2_250, amount: 35_000 },
      { maxIncome: 2_500, amount: 32_500 },
      { maxIncome: 2_750, amount: 27_500 },
      { maxIncome: 3_000, amount: 25_000 },
      { maxIncome: 3_250, amount: 20_000 },
      { maxIncome: 3_500, amount: 15_000 },
      { maxIncome: 3_750, amount: 12_500 },
      { maxIncome: 4_000, amount: 10_000 },
      { maxIncome: 4_250, amount: 5_000 },
      { maxIncome: 4_500, amount: 2_500 },
    ],
    // "EHG amount for couples comprising a first-timer and second-timer household" (the
    // Step-Up scheme) uses this same table, keyed on half the household income — deliberately
    // NOT wired into grants.ts: V1 explicitly doesn't support second-timer/mixed households
    // (spec §5 "!allFirstTimers" branch, §13 out-of-scope). Left here as a documented source
    // for whoever builds Step-Up later, so it doesn't need re-sourcing from scratch.
    ehgStepUpBandsHalfIncome: [
      { maxIncome: 750, amount: 60_000 },
      { maxIncome: 1_000, amount: 55_000 },
      { maxIncome: 1_250, amount: 52_500 },
      { maxIncome: 1_500, amount: 47_500 },
      { maxIncome: 1_750, amount: 45_000 },
      { maxIncome: 2_000, amount: 40_000 },
      { maxIncome: 2_250, amount: 35_000 },
      { maxIncome: 2_500, amount: 32_500 },
      { maxIncome: 2_750, amount: 27_500 },
      { maxIncome: 3_000, amount: 25_000 },
      { maxIncome: 3_250, amount: 20_000 },
      { maxIncome: 3_500, amount: 15_000 },
      { maxIncome: 3_750, amount: 12_500 },
      { maxIncome: 4_000, amount: 10_000 },
      { maxIncome: 4_250, amount: 5_000 },
      { maxIncome: 4_500, amount: 2_500 },
    ],
    chg: {
      incomeCeiling: { FAMILY: 14_000, SINGLE: 7_000, JOINT_SINGLES: 14_000 },
      minRemainingLeaseYears: 20,
      // 2R-4R vs 5R/EXEC/3GEN
      familyAmount: { smallFlat: 80_000, bigFlat: 50_000 },
      singleAmount: { smallFlat: 40_000, bigFlat: 25_000 },
      scSprPenalty: 10_000,
    },
    phg: {
      familyAmount: { withParentsOrChild: 30_000, within4km: 20_000 },
      singleAmount: { withParentsOrChild: 15_000, within4km: 10_000 },
    },
  },

  resaleLevy: {
    amountsByFlatType: {
      '2R': 15_000,
      '3R': 30_000,
      '4R': 40_000,
      '5R': 45_000,
      EXEC: 50_000,
      EC: 55_000,
    },
    legacyCutoverDate: '2006-03-03', // first flat sold before this date uses %-based legacy levy
  },

  fees: {
    conveyancing: {
      hdb: { min: 300, max: 600, default: 400 },
      private: { min: 1_800, max: 3_000, default: 2_400 },
    },
    valuation: { default: 120 },
    commission: {
      sellerPct: 0.02,
      buyerPctHdb: 0.01,
      buyerPctPrivateResale: 0,
      gstPct: 0.09,
    },
    optionMoney: {
      hdb: { initial: 1_000, exercise: 4_000 },
      privateResale: { initialPct: 0.01, exercisePct: 0.04 },
      newLaunchBookingPct: 0.05,
    },
  },

  cpf: {
    accruedInterestPct: 0.025,
  },

  timelinesWeeks: {
    hdbResaleBuy: { hfe: 3, otp: 3, hdbAcceptance: 2, completion: 8 },
    hdbResaleSell: { intentToSellCoolingDays: 7, otp: 3, hdbAcceptance: 2, completion: 8 },
    privateResaleBuy: { ipaMin: 1, ipaMax: 2, otpDays: 14, completionMin: 8, completionMax: 12 },
  },
} as const;
