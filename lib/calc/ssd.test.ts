import { describe, expect, it } from 'vitest';
import { computeSsd } from './ssd';

describe('computeSsd', () => {
  it('golden case 4a: bought Aug 2025, sold Mar 2026 (hold < 1yr) -> 16%', () => {
    const result = computeSsd({
      purchaseDate: '2025-08-15',
      saleDate: '2026-03-10',
      price: 1_200_000,
    });
    expect(result.rate).toBe(0.16);
    expect(result.ssd).toBe(192_000);
    expect(result.scheduleUsed).toBe('post-4-Jul-2025');
  });

  it('golden case 4b: bought Jun 2025 (pre-cutover), sold Mar 2026 -> 12% legacy', () => {
    const result = computeSsd({
      purchaseDate: '2025-06-15',
      saleDate: '2026-03-10',
      price: 1_200_000,
    });
    expect(result.rate).toBe(0.12);
    expect(result.ssd).toBe(144_000);
    expect(result.scheduleUsed).toBe('legacy');
  });

  it('golden case 4c: post-cutover purchase held > 4yrs -> exempt', () => {
    const result = computeSsd({
      purchaseDate: '2025-08-15',
      saleDate: '2029-09-01',
      price: 1_200_000,
    });
    expect(result.rate).toBe(0);
    expect(result.ssd).toBe(0);
  });
});
