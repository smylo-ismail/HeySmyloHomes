import { describe, expect, it } from 'vitest';
import { computeAbsd } from './absd';

describe('computeAbsd', () => {
  it('golden case 1: SC/SC, first property -> $0 (0% SC first-property rate)', () => {
    const result = computeAbsd({
      buyerCitizenships: ['SC', 'SC'],
      propertyCount: 1,
      price: 600_000,
      valuation: 600_000,
    });
    expect(result.absd).toBe(0);
  });

  it('golden case 2: married SC+SPR, first joint home -> $0 via spousal remission', () => {
    const result = computeAbsd({
      buyerCitizenships: ['SC', 'SPR'],
      propertyCount: 1,
      price: 780_000,
      valuation: 780_000,
      isMarriedCouple: true,
      isFirstJointProperty: true,
    });
    expect(result.absd).toBe(0);
    expect(result.remissionApplied).toBe(true);
    expect(result.note).toMatch(/spousal remission/i);
  });

  it('unmarried SC+SPR joint buyers, first property, no remission -> rated at SPR 5%', () => {
    const result = computeAbsd({
      buyerCitizenships: ['SC', 'SPR'],
      propertyCount: 1,
      price: 780_000,
      valuation: 780_000,
    });
    expect(result.absd).toBe(780_000 * 0.05);
    expect(result.remissionApplied).toBe(false);
  });

  it('SC buying 2nd property -> 20%', () => {
    const result = computeAbsd({
      buyerCitizenships: ['SC'],
      propertyCount: 2,
      price: 1_000_000,
      valuation: 1_000_000,
    });
    expect(result.absd).toBe(200_000);
  });

  it('SPR buying 1st property -> 5%', () => {
    const result = computeAbsd({
      buyerCitizenships: ['SPR'],
      propertyCount: 1,
      price: 1_000_000,
      valuation: 1_000_000,
    });
    expect(result.absd).toBe(50_000);
  });

  it('Foreigner buying 1st property -> 60%', () => {
    const result = computeAbsd({
      buyerCitizenships: ['FOREIGNER'],
      propertyCount: 1,
      price: 1_000_000,
      valuation: 1_000_000,
    });
    expect(result.absd).toBe(600_000);
  });

  it('SC buying 3rd property -> 30%', () => {
    const result = computeAbsd({
      buyerCitizenships: ['SC'],
      propertyCount: 3,
      price: 1_000_000,
      valuation: 1_000_000,
    });
    expect(result.absd).toBe(300_000);
  });

  it('uses higher of price/valuation as dutiable amount', () => {
    const result = computeAbsd({
      buyerCitizenships: ['SPR'],
      propertyCount: 1,
      price: 900_000,
      valuation: 1_000_000,
    });
    expect(result.absd).toBe(1_000_000 * 0.05);
  });
});
