import { describe, expect, it } from 'vitest';
import { computeGrants, type GrantInput } from './grants';

const case1Input: GrantInput = {
  applicationType: 'FAMILY',
  citizenshipMix: 'SC_SC',
  allFirstTimers: true,
  avgMonthlyHouseholdIncome: 7_000,
  employedContinuously12Months: true,
  buyerAges: [30, 29],
  flatSource: 'RESALE',
  flatType: '4R',
  remainingLeaseYears: 70,
  proximity: 'WITHIN_4KM',
  ownsOrDisposedPrivateWithin30Months: false,
};

const case2Input: GrantInput = {
  applicationType: 'FAMILY',
  citizenshipMix: 'SC_SPR',
  allFirstTimers: true,
  avgMonthlyHouseholdIncome: 9_000,
  employedContinuously12Months: true,
  buyerAges: [30, 26],
  flatSource: 'RESALE',
  flatType: '5R',
  remainingLeaseYears: 40,
  proximity: 'WITH_PARENTS_OR_CHILD',
  ownsOrDisposedPrivateWithin30Months: false,
};

describe('computeGrants — golden cases', () => {
  it('case 1: happy path first-timer SC/SC family, resale 4R', () => {
    const result = computeGrants(case1Input);
    expect(result.chg).toBe(80_000);
    expect(result.ehg).toBe(30_000);
    expect(result.phg).toBe(20_000);
    expect(result.total).toBe(130_000);
    expect(result.warnings).toEqual([]);
    expect(result.ineligibilityReasons).toEqual([]);
  });

  it('case 2: outlier stack — SC/SPR penalty, income-ceiling boundary, short lease', () => {
    const result = computeGrants(case2Input);
    expect(result.chg).toBe(40_000);
    expect(result.ehg).toBe(5_000);
    expect(result.phg).toBe(30_000);
    expect(result.total).toBe(75_000);
    expect(result.warnings.some((w) => /pro-rat/i.test(w))).toBe(true);
  });

  it('case 2 subtest: EHG at income $9,001 -> $0 (one dollar over ceiling)', () => {
    const result = computeGrants({ ...case2Input, avgMonthlyHouseholdIncome: 9_001 });
    expect(result.ehg).toBe(0);
  });

  it('case 2 subtest: EHG at income $9,000 (inclusive ceiling) -> $5,000', () => {
    const result = computeGrants({ ...case2Input, avgMonthlyHouseholdIncome: 9_000 });
    expect(result.ehg).toBe(5_000);
  });

  it('case 3: 30-month wait-out disqualifies all grants regardless of other inputs', () => {
    const result = computeGrants({ ...case1Input, ownsOrDisposedPrivateWithin30Months: true });
    expect(result.chg).toBe(0);
    expect(result.ehg).toBe(0);
    expect(result.phg).toBe(0);
    expect(result.total).toBe(0);
    expect(result.ineligibilityReasons.some((r) => /30-month wait-out/i.test(r))).toBe(true);
  });
});

describe('computeGrants — boundary sub-tests', () => {
  it.each([
    [1_500, 120_000],
    [1_501, 110_000],
    [2_000, 110_000],
    [2_001, 105_000],
    [7_000, 30_000],
    [9_000, 5_000],
    [9_001, 0],
  ])('EHG family band at income $%i -> $%i', (income, expected) => {
    const result = computeGrants({ ...case1Input, avgMonthlyHouseholdIncome: income });
    expect(result.ehg).toBe(expected);
  });

  it.each([
    [20, true],
    [19, false],
  ])('CHG lease gate at remainingLeaseYears=%i -> passes=%s', (years, passes) => {
    const result = computeGrants({ ...case1Input, remainingLeaseYears: years });
    expect(result.chg > 0).toBe(passes);
  });

  it('remainingLeaseYears omitted: CHG assumes the 20-year minimum is met, with a warning', () => {
    const withoutLease: GrantInput = { ...case1Input };
    delete withoutLease.remainingLeaseYears;
    const result = computeGrants(withoutLease);
    expect(result.chg).toBeGreaterThan(0);
    expect(result.ineligibilityReasons).toEqual([]);
    expect(result.warnings.some((w) => /wasn.t provided/i.test(w))).toBe(true);
  });

  // Raised from $14,000/$7,000 to $16,000/$8,000 effective 24 Aug 2026 (NDR 2026).
  it.each([
    [16_000, true],
    [16_001, false],
  ])('CHG income ceiling (FAMILY) at income $%i -> passes=%s', (income, passes) => {
    const result = computeGrants({ ...case1Input, avgMonthlyHouseholdIncome: income });
    expect(result.chg > 0).toBe(passes);
  });

  it.each([
    [8_000, true],
    [8_001, false],
  ])('CHG income ceiling (SINGLE) at income $%i -> passes=%s', (income, passes) => {
    const result = computeGrants({
      ...case1Input,
      applicationType: 'SINGLE',
      citizenshipMix: 'SC_ONLY',
      buyerAges: [35],
      avgMonthlyHouseholdIncome: income,
    });
    expect(result.chg > 0).toBe(passes);
  });

  it('PHG NONE -> $0 without affecting CHG/EHG', () => {
    const result = computeGrants({ ...case1Input, proximity: 'NONE' });
    expect(result.phg).toBe(0);
    expect(result.chg).toBe(80_000);
    expect(result.ehg).toBe(30_000);
  });
});

describe('computeGrants — remaining decision-tree branches', () => {
  it('second-timer / non-first-timer household -> all grants zero with reason', () => {
    const result = computeGrants({ ...case1Input, allFirstTimers: false });
    expect(result.total).toBe(0);
    expect(result.ineligibilityReasons.some((r) => /second-timer/i.test(r))).toBe(true);
  });

  it('pure second-timer RESALE: no CHG/EHG, PHG still applies', () => {
    const result = computeGrants({ ...case1Input, allFirstTimers: false, allSecondTimers: true });
    expect(result.chg).toBe(0);
    expect(result.ehg).toBe(0);
    expect(result.phg).toBe(20_000); // WITHIN_4KM, FAMILY tier
    expect(result.total).toBe(20_000);
    expect(result.ineligibilityReasons).toEqual([]);
    expect(result.warnings.some((w) => /one-time subsidy/i.test(w))).toBe(true);
    expect(result.warnings.some((w) => /first-timer-only grants/i.test(w))).toBe(true);
  });

  it('pure second-timer RESALE: no PHG when proximity is NONE -> no one-time-subsidy warning either', () => {
    const result = computeGrants({
      ...case1Input,
      allFirstTimers: false,
      allSecondTimers: true,
      proximity: 'NONE',
    });
    expect(result.total).toBe(0);
    expect(result.warnings.some((w) => /one-time subsidy/i.test(w))).toBe(false);
  });

  it('pure second-timer RESALE: high income doesn’t block PHG (no income ceiling)', () => {
    const result = computeGrants({
      ...case1Input,
      allFirstTimers: false,
      allSecondTimers: true,
      avgMonthlyHouseholdIncome: 30_000,
    });
    expect(result.phg).toBe(20_000);
    expect(result.ineligibilityReasons).toEqual([]);
  });

  it('pure second-timer BTO: zero grants, warns instead of erroring', () => {
    const result = computeGrants({
      ...case1Input,
      flatSource: 'BTO',
      allFirstTimers: false,
      allSecondTimers: true,
    });
    expect(result.total).toBe(0);
    expect(result.ineligibilityReasons).toEqual([]);
    expect(result.warnings.some((w) => /BTO flats/i.test(w))).toBe(true);
  });

  it('BTO branch: EHG only, no CHG/PHG even with proximity set', () => {
    const result = computeGrants({
      ...case1Input,
      flatSource: 'BTO',
      avgMonthlyHouseholdIncome: 7_000,
    });
    expect(result.ehg).toBe(30_000);
    expect(result.chg).toBe(0);
    expect(result.phg).toBe(0);
    expect(result.total).toBe(30_000);
  });

  it('BTO branch: EHG fails when not continuously employed 12 months', () => {
    const result = computeGrants({
      ...case1Input,
      flatSource: 'BTO',
      employedContinuously12Months: false,
    });
    expect(result.ehg).toBe(0);
  });

  it('BTO branch: EHG fails above the FAMILY $9,000 income ceiling', () => {
    const result = computeGrants({
      ...case1Input,
      flatSource: 'BTO',
      avgMonthlyHouseholdIncome: 9_001,
    });
    expect(result.ehg).toBe(0);
  });

  it('RESALE: CHG fails on income -> EHG also blocked even if independently eligible', () => {
    const result = computeGrants({ ...case1Input, avgMonthlyHouseholdIncome: 16_001 });
    expect(result.chg).toBe(0);
    expect(result.ehg).toBe(0);
    expect(result.ineligibilityReasons.length).toBeGreaterThan(0);
  });

  it('RESALE: CHG fails on lease<20 -> EHG also blocked, PHG still computed', () => {
    const result = computeGrants({ ...case1Input, remainingLeaseYears: 19 });
    expect(result.chg).toBe(0);
    expect(result.ehg).toBe(0);
    expect(result.phg).toBe(20_000);
  });

  it('RESALE FAMILY small flat (2R-4R) CHG amount is $80,000', () => {
    const result = computeGrants({ ...case1Input, flatType: '3R' });
    expect(result.chg).toBe(80_000);
  });

  it('RESALE FAMILY big flat (5R/EXEC/3GEN) CHG amount is $50,000', () => {
    const result = computeGrants({ ...case1Input, citizenshipMix: 'SC_SC', flatType: 'EXEC' });
    expect(result.chg).toBe(50_000);
  });

  it('SC_SPR penalty subtracts $10,000 from CHG and warns about Citizen Top-Up', () => {
    const result = computeGrants({ ...case1Input, citizenshipMix: 'SC_SPR' });
    expect(result.chg).toBe(70_000);
    expect(result.warnings.some((w) => /citizen top-up/i.test(w))).toBe(true);
  });

  it('PHG WITH_PARENTS_OR_CHILD (family) is $30,000', () => {
    const result = computeGrants({ ...case1Input, proximity: 'WITH_PARENTS_OR_CHILD' });
    expect(result.phg).toBe(30_000);
  });

  it('lease-to-95 warning fires when lease + youngest buyer age < 95', () => {
    const result = computeGrants({ ...case1Input, remainingLeaseYears: 60, buyerAges: [30, 30] });
    expect(result.warnings.some((w) => /pro-rat/i.test(w))).toBe(true);
  });

  it('lease-to-95 warning does not fire when coverage is exactly 95', () => {
    const result = computeGrants({ ...case1Input, remainingLeaseYears: 65, buyerAges: [30, 30] });
    expect(result.warnings.some((w) => /pro-rat/i.test(w))).toBe(false);
  });

  it('SINGLE application: EHG looked up from the official EHG Singles table', () => {
    const result = computeGrants({
      ...case1Input,
      applicationType: 'SINGLE',
      citizenshipMix: 'SC_ONLY',
      avgMonthlyHouseholdIncome: 4_000,
      buyerAges: [30],
    });
    // $3,751-$4,000 band -> $10,000
    expect(result.ehg).toBe(10_000);
  });

  it('SINGLE application: EHG ineligible above the $4,500 ceiling', () => {
    const result = computeGrants({
      ...case1Input,
      applicationType: 'SINGLE',
      citizenshipMix: 'SC_ONLY',
      avgMonthlyHouseholdIncome: 4_501,
      buyerAges: [30],
    });
    expect(result.ehg).toBe(0);
  });

  it('JOINT_SINGLES uses the same EHG table as FAMILY (confirmed identical HDB tables)', () => {
    const family = computeGrants({ ...case1Input, applicationType: 'FAMILY' });
    const jointSingles = computeGrants({ ...case1Input, applicationType: 'JOINT_SINGLES' });
    expect(jointSingles.ehg).toBe(family.ehg);
    expect(jointSingles.chg).toBe(family.chg);
  });

  it('NON_RESIDENT_SPOUSE: EHG keyed on half the household income against the Singles table', () => {
    // income 7,000 -> half 3,500 -> $3,251-$3,500 band -> $15,000
    const result = computeGrants({ ...case1Input, applicationType: 'NON_RESIDENT_SPOUSE' });
    expect(result.ehg).toBe(15_000);
    // CHG/PHG fall back to the SINGLE tier's amounts
    expect(result.chg).toBe(40_000);
    expect(result.phg).toBe(10_000);
  });

  it('NON_RESIDENT_SPOUSE: EHG ineligible once half of household income exceeds $4,500', () => {
    const result = computeGrants({
      ...case1Input,
      applicationType: 'NON_RESIDENT_SPOUSE',
      avgMonthlyHouseholdIncome: 9_001,
    });
    expect(result.ehg).toBe(0);
  });
});
