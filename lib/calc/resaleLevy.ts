import { isBefore, parseISO } from 'date-fns';
import { RATES } from '@/config/rates';

export type LevyFlatType = keyof typeof RATES.resaleLevy.amountsByFlatType;

export interface ResaleLevyInput {
  /** Fires only when buying a second subsidised flat. */
  isSecondSubsidisedFlat: boolean;
  flatTypeBeingBought: LevyFlatType;
  firstFlatSoldDate?: string; // ISO date
}

export interface ResaleLevyResult {
  levy: number;
  isLegacyPercentageBased: boolean;
  warnings: string[];
}

export function computeResaleLevy(input: ResaleLevyInput): ResaleLevyResult {
  if (!input.isSecondSubsidisedFlat) {
    return { levy: 0, isLegacyPercentageBased: false, warnings: [] };
  }

  if (
    input.firstFlatSoldDate &&
    isBefore(parseISO(input.firstFlatSoldDate), parseISO(RATES.resaleLevy.legacyCutoverDate))
  ) {
    return {
      levy: 0,
      isLegacyPercentageBased: true,
      warnings: ['legacy levy — chat with smylo'],
    };
  }

  return {
    levy: RATES.resaleLevy.amountsByFlatType[input.flatTypeBeingBought],
    isLegacyPercentageBased: false,
    warnings: [],
  };
}
