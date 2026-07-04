import { RATES } from '@/config/rates';

export type BuyerCitizenship = 'SC' | 'SPR' | 'FOREIGNER';

export interface AbsdInput {
  /** One entry per buyer on the transaction, e.g. ['SC', 'SPR'] for a mixed-citizenship couple. */
  buyerCitizenships: BuyerCitizenship[];
  /** Residential property count at time of purchase, including this purchase. */
  propertyCount: 1 | 2 | 3;
  price: number;
  valuation: number;
  isMarriedCouple?: boolean;
  /** True when this is the couple's first jointly-owned residential property. */
  isFirstJointProperty?: boolean;
}

export interface AbsdResult {
  absd: number;
  rate: number;
  remissionApplied: boolean;
  note?: string;
}

const RATE_TABLE: Record<BuyerCitizenship, readonly number[]> = {
  SC: RATES.absd.SC,
  SPR: RATES.absd.SPR,
  FOREIGNER: [RATES.absd.FOREIGNER, RATES.absd.FOREIGNER, RATES.absd.FOREIGNER],
};

/**
 * Mixed-citizenship buyers are rated at the higher of the buyers' individual profile
 * rates, unless the spousal remission applies (married couple, >=1 SC, first jointly-owned home).
 */
export function computeAbsd(input: AbsdInput): AbsdResult {
  const dutiable = Math.max(input.price, input.valuation);
  const bandIndex = Math.min(input.propertyCount, 3) - 1;

  const spousalRemissionEligible =
    !!input.isMarriedCouple &&
    !!input.isFirstJointProperty &&
    input.propertyCount === 1 &&
    input.buyerCitizenships.includes('SC');

  if (spousalRemissionEligible) {
    return {
      absd: 0,
      rate: 0,
      remissionApplied: true,
      note: 'Spousal remission: married couple, at least one SC, first jointly-owned home.',
    };
  }

  const rate = Math.max(...input.buyerCitizenships.map((c) => RATE_TABLE[c][bandIndex]));
  return { absd: dutiable * rate, rate, remissionApplied: false };
}
