import { RATES } from '@/config/rates';

/**
 * Buyer's Stamp Duty for residential property, applied to the higher of price/valuation.
 * Full precision; round once at display.
 */
export function computeBsd(price: number, valuation: number): number {
  const dutiable = Math.max(price, valuation);
  let duty = 0;
  let lowerBound = 0;
  for (const band of RATES.bsd.bands) {
    if (dutiable <= lowerBound) break;
    const bandTop = Math.min(dutiable, band.upTo);
    const amountInBand = bandTop - lowerBound;
    duty += amountInBand * band.rate;
    lowerBound = band.upTo;
  }
  return duty;
}
