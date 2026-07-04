import { RATES } from '@/config/rates';

export type ApplicationType = 'FAMILY' | 'SINGLE' | 'JOINT_SINGLES' | 'NON_RESIDENT_SPOUSE';
export type CitizenshipMix = 'SC_SC' | 'SC_SPR' | 'SC_ONLY';
export type FlatSource = 'BTO' | 'RESALE';
export type FlatType = '2R' | '3R' | '4R' | '5R' | 'EXEC' | '3GEN';
export type Proximity = 'WITH_PARENTS_OR_CHILD' | 'WITHIN_4KM' | 'NONE';

export interface GrantInput {
  applicationType: ApplicationType;
  citizenshipMix: CitizenshipMix;
  allFirstTimers: boolean;
  avgMonthlyHouseholdIncome: number; // 12-mth avg, assessed ~2 mths before HFE application
  employedContinuously12Months: boolean;
  buyerAges: number[];
  flatSource: FlatSource;
  flatType: FlatType;
  remainingLeaseYears?: number; // resale only
  proximity: Proximity; // resale only
  ownsOrDisposedPrivateWithin30Months: boolean;
}

export interface GrantResult {
  ehg: number;
  chg: number;
  phg: number;
  total: number;
  ineligibilityReasons: string[]; // rendered in UI, human-readable
  warnings: string[]; // always rendered
}

const SMALL_FLAT_TYPES: readonly FlatType[] = ['2R', '3R', '4R'];
const isBigFlat = (flatType: FlatType) => !SMALL_FLAT_TYPES.includes(flatType);

// FAMILY maps directly onto the FAMILY tables. JOINT_SINGLES follows the SINGLE quantum
// for CHG/PHG/EHG-ceiling purposes — the spec gives no separate joint-singles figure, this
// is the closest documented tier. NON_RESIDENT_SPOUSE has no amounts specified anywhere in
// the spec, so it resolves to null and surfaces an explicit "needs confirmation" reason
// rather than guessing a number.
type HouseholdTier = 'FAMILY' | 'SINGLE';

function householdTier(applicationType: ApplicationType): HouseholdTier | null {
  if (applicationType === 'FAMILY') return 'FAMILY';
  if (applicationType === 'SINGLE' || applicationType === 'JOINT_SINGLES') return 'SINGLE';
  return null;
}

function lookupEhg(tier: HouseholdTier, income: number): { amount: number; unverified: boolean } {
  if (tier === 'SINGLE') {
    if (!RATES.grants.ehgSingleBands) return { amount: 0, unverified: true };
    const band = RATES.grants.ehgSingleBands.find((b) => income <= b.maxIncome);
    return { amount: band?.amount ?? 0, unverified: false };
  }
  const band = RATES.grants.ehgFamilyBands.find((b) => income <= b.maxIncome);
  return { amount: band?.amount ?? 0, unverified: false };
}

const EHG_SINGLES_UNVERIFIED_WARNING =
  "EHG income-band table for singles is pending verification against HDB's official page — check with smylo before relying on this figure.";

/** Applies the EHG income + employment-continuity gate and looks up the band amount. */
function computeEhg(tier: HouseholdTier, input: GrantInput, warnings: string[]): number {
  const ceiling = RATES.grants.ehgIncomeCeiling[tier];
  if (input.avgMonthlyHouseholdIncome > ceiling || !input.employedContinuously12Months) return 0;

  const looked = lookupEhg(tier, input.avgMonthlyHouseholdIncome);
  if (looked.unverified) warnings.push(EHG_SINGLES_UNVERIFIED_WARNING);
  return looked.amount;
}

/** Implements the §5 decision tree exactly; every branch is unit-tested in grants.test.ts. */
export function computeGrants(input: GrantInput): GrantResult {
  const ineligibilityReasons: string[] = [];
  const warnings: string[] = [];
  const zero = { ehg: 0, chg: 0, phg: 0, total: 0 };

  if (input.ownsOrDisposedPrivateWithin30Months) {
    ineligibilityReasons.push('30-month wait-out after private property disposal.');
    return { ...zero, ineligibilityReasons, warnings };
  }

  if (!input.allFirstTimers) {
    ineligibilityReasons.push(
      'Second-timer / mixed household — Step-Up & half-grant paths coming. Worth a chat.'
    );
    return { ...zero, ineligibilityReasons, warnings };
  }

  // HDB assesses the 12-month average ~2 months before HFE application; a household that
  // hasn't been continuously employed the full 12 months is the one signal available in
  // this input for "income may not be a stable, representative average."
  if (!input.employedContinuously12Months) {
    warnings.push(
      'HDB assesses your 12-month average income ~2 months before HFE application; irregular income can shift your grant band.'
    );
  }

  const tier = householdTier(input.applicationType);

  if (input.flatSource === 'BTO') {
    if (!tier) {
      ineligibilityReasons.push(
        `EHG amounts for ${input.applicationType} are not specified in the V1 spec — worth a chat with smylo.`
      );
      return { ...zero, ineligibilityReasons, warnings };
    }
    const ehg = computeEhg(tier, input, warnings);
    return { ehg, chg: 0, phg: 0, total: ehg, ineligibilityReasons, warnings };
  }

  // RESALE branch — order matters: CHG gate, then EHG (only if CHG passed), then PHG
  // (independent of CHG/EHG, no income ceiling).
  if (
    input.remainingLeaseYears !== undefined &&
    input.buyerAges.length > 0 &&
    input.remainingLeaseYears + Math.min(...input.buyerAges) < 95
  ) {
    warnings.push('Grants and CPF usage may be pro-rated; flag this flat to smylo.');
  }

  let chg = 0;
  let chgPassed = false;

  if (!tier) {
    ineligibilityReasons.push(
      `CHG amounts for ${input.applicationType} are not specified in the V1 spec — worth a chat with smylo.`
    );
  } else {
    const chgCeiling =
      input.applicationType === 'JOINT_SINGLES'
        ? RATES.grants.chg.incomeCeiling.JOINT_SINGLES
        : RATES.grants.chg.incomeCeiling[tier];
    const incomeOk = input.avgMonthlyHouseholdIncome <= chgCeiling;
    const leaseOk =
      input.remainingLeaseYears !== undefined &&
      input.remainingLeaseYears >= RATES.grants.chg.minRemainingLeaseYears;

    if (!incomeOk) {
      ineligibilityReasons.push(
        `Household income exceeds the CHG ceiling of $${chgCeiling.toLocaleString()}.`
      );
    }
    if (!leaseOk) {
      ineligibilityReasons.push(
        `Remaining lease must be at least ${RATES.grants.chg.minRemainingLeaseYears} years for CHG.`
      );
    }

    if (incomeOk && leaseOk) {
      chgPassed = true;
      const amounts =
        tier === 'FAMILY' ? RATES.grants.chg.familyAmount : RATES.grants.chg.singleAmount;
      chg = isBigFlat(input.flatType) ? amounts.bigFlat : amounts.smallFlat;
      if (input.citizenshipMix === 'SC_SPR') {
        chg -= RATES.grants.chg.scSprPenalty;
        warnings.push(
          `Citizen Top-Up $${RATES.grants.chg.scSprPenalty.toLocaleString()} claimable if SPR spouse becomes SC.`
        );
      }
    }
  }

  const ehg = tier && chgPassed ? computeEhg(tier, input, warnings) : 0;

  let phg = 0;
  if (tier) {
    const amounts = tier === 'FAMILY' ? RATES.grants.phg.familyAmount : RATES.grants.phg.singleAmount;
    if (input.proximity === 'WITH_PARENTS_OR_CHILD') phg = amounts.withParentsOrChild;
    else if (input.proximity === 'WITHIN_4KM') phg = amounts.within4km;
  }

  return { ehg, chg, phg, total: chg + ehg + phg, ineligibilityReasons, warnings };
}
