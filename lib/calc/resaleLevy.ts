import { isBefore, parseISO } from 'date-fns';
import { RATES } from '@/config/rates';

export type LevyFlatType = keyof typeof RATES.resaleLevy.amountsByFlatType;

export interface ResaleLevyInput {
  /** Fires only when buying a second subsidised flat. */
  isSecondSubsidisedFlat: boolean;
  // The levy is a fixed sum set by the type of the FIRST (sold) flat, not the one being
  // bought — a common misconception. '3GEN' is accepted since a 3Gen flat can be sold, but
  // its levy amount isn't verified anywhere yet, so it surfaces a warning instead of a guess.
  flatTypeSold: LevyFlatType | '3GEN';
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

  if (input.flatTypeSold === '3GEN') {
    return {
      levy: 0,
      isLegacyPercentageBased: false,
      warnings: [
        'Resale levy amount for a 3Gen flat sold isn’t verified yet — worth a chat with smylo before relying on this figure.',
      ],
    };
  }

  return {
    levy: RATES.resaleLevy.amountsByFlatType[input.flatTypeSold],
    isLegacyPercentageBased: false,
    warnings: [],
  };
}
