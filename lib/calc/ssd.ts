import { differenceInMonths, isBefore, parseISO } from 'date-fns';
import { RATES } from '@/config/rates';

export interface SsdInput {
  purchaseDate: string; // ISO date
  saleDate: string; // ISO date
  price: number;
}

export interface SsdResult {
  ssd: number;
  rate: number;
  scheduleUsed: 'post-4-Jul-2025' | 'legacy';
  /** 1-indexed holding-period year band used to select the rate (1 = held < 1 year). */
  holdingYearBand: number;
}

/**
 * Purchase date selects the SSD schedule: on/after the cutover uses the 4-year
 * schedule (16/12/8/4%); before it uses the legacy 3-year schedule (12/8/4%).
 * Holding periods beyond the selected schedule's length are exempt (0%).
 */
export function computeSsd(input: SsdInput): SsdResult {
  const purchase = parseISO(input.purchaseDate);
  const sale = parseISO(input.saleDate);
  const cutover = parseISO(RATES.ssd.scheduleCutoverDate);
  const usePostCutoverSchedule = !isBefore(purchase, cutover);

  const schedule = usePostCutoverSchedule
    ? RATES.ssd.postCutoverScheduleByYear
    : RATES.ssd.legacyScheduleByYear;

  const monthsHeld = differenceInMonths(sale, purchase);
  const yearIndex = Math.floor(monthsHeld / 12);
  const rate = yearIndex < schedule.length ? schedule[yearIndex] : 0;

  return {
    ssd: input.price * rate,
    rate,
    scheduleUsed: usePostCutoverSchedule ? 'post-4-Jul-2025' : 'legacy',
    holdingYearBand: yearIndex + 1,
  };
}
