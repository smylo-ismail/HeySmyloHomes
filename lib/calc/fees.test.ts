import { describe, expect, it } from 'vitest';
import { computeBuyFees, computeSellFees } from './fees';

describe('computeBuyFees — golden case 1 upfront cash breakdown', () => {
  const result = computeBuyFees({ kind: 'HDB', path: 'RESALE', price: 600_000 });

  it('option money totals $5,000 (initial $1,000 + exercise $4,000)', () => {
    expect(result.optionMoneyInitial).toBe(1_000);
    expect(result.optionMoneyExercise).toBe(4_000);
  });

  it('conveyancing is $400', () => {
    expect(result.conveyancing).toBe(400);
  });

  it('valuation is $120', () => {
    expect(result.valuation).toBe(120);
  });

  it('commission is $6,540 (1% + 9% GST on $600,000)', () => {
    expect(result.commission).toBeCloseTo(6_540, 6);
  });

  it('total upfront cash is $12,060', () => {
    expect(result.totalUpfrontCash).toBeCloseTo(12_060, 6);
  });
});

describe('computeBuyFees — private resale uses percentage-based option money, no buyer commission', () => {
  it('option money is 1% initial + 4% exercise, commission is 0', () => {
    const result = computeBuyFees({ kind: 'PRIVATE', path: 'RESALE', price: 1_000_000 });
    expect(result.optionMoneyInitial).toBe(10_000);
    expect(result.optionMoneyExercise).toBe(40_000);
    expect(result.commission).toBe(0);
  });
});

describe('computeBuyFees — new launch booking is 5% cash, no OTP-style exercise money', () => {
  it('booking money is 5% of price', () => {
    const result = computeBuyFees({ kind: 'PRIVATE', path: 'NEW_LAUNCH', price: 1_000_000 });
    expect(result.optionMoneyInitial).toBe(50_000);
    expect(result.optionMoneyExercise).toBe(0);
  });
});

describe('computeSellFees', () => {
  it('seller commission defaults to 2% + 9% GST', () => {
    const result = computeSellFees({ kind: 'HDB', price: 600_000 });
    expect(result.commission).toBe(600_000 * 0.02 * 1.09);
  });
});
