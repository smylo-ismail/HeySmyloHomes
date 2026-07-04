import { describe, expect, it } from 'vitest';
import { computeBsd } from './bsd';

describe('computeBsd', () => {
  it('golden case 1: $600,000 -> $12,600', () => {
    expect(computeBsd(600_000, 600_000)).toBe(12_600);
  });

  it('golden case 2: $780,000 -> $18,000', () => {
    expect(computeBsd(780_000, 780_000)).toBe(18_000);
  });

  it('golden case 3: $550,000 -> $11,100', () => {
    expect(computeBsd(550_000, 550_000)).toBe(11_100);
  });

  it('boundary: exactly $180,000 -> $1,800', () => {
    expect(computeBsd(180_000, 180_000)).toBe(1_800);
  });

  it('boundary: exactly $360,000 -> $5,400', () => {
    expect(computeBsd(360_000, 360_000)).toBe(5_400);
  });

  it('boundary: exactly $1,000,000 -> $24,600', () => {
    expect(computeBsd(1_000_000, 1_000_000)).toBe(24_600);
  });

  it('uses the higher of price/valuation', () => {
    expect(computeBsd(500_000, 600_000)).toBe(computeBsd(600_000, 600_000));
    expect(computeBsd(600_000, 500_000)).toBe(computeBsd(600_000, 600_000));
  });
});
