import { describe, expect, it } from 'vitest';
import { computeCpfBuySide, computeCpfRefund } from './cpf';

describe('computeCpfBuySide — golden case 1', () => {
  it('CPF covers the full need, no cash top-up', () => {
    const result = computeCpfBuySide({
      oaBalance: 60_000,
      grantsTotal: 130_000,
      downpayment: 157_159,
      stampDuty: 12_600,
      remainingLeaseYears: 70,
      youngestBuyerAge: 29,
    });
    expect(result.cpfAvailable).toBe(190_000);
    expect(result.cpfNeeded).toBe(169_759);
    expect(result.cashTopUp).toBe(0);
    expect(result.warnings).toEqual([]);
  });
});

describe('computeCpfBuySide — cash top-up when CPF is insufficient', () => {
  it('shortfall becomes cashTopUp', () => {
    const result = computeCpfBuySide({
      oaBalance: 10_000,
      grantsTotal: 0,
      downpayment: 100_000,
      stampDuty: 5_000,
    });
    expect(result.cashTopUp).toBe(95_000);
  });

  it('warns when lease does not cover youngest buyer to age 95', () => {
    const result = computeCpfBuySide({
      oaBalance: 10_000,
      grantsTotal: 0,
      downpayment: 100_000,
      stampDuty: 5_000,
      remainingLeaseYears: 40,
      youngestBuyerAge: 26,
    });
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('computeCpfRefund', () => {
  it('uses a direct accrued-interest override when provided', () => {
    const result = computeCpfRefund({ principal: 100_000, accruedInterestOverride: 12_345 });
    expect(result.totalRefund).toBe(112_345);
  });

  it('projects accrued interest at 2.5% annually compounded when no override given', () => {
    const result = computeCpfRefund({ principal: 100_000, years: 10 });
    expect(result.accruedInterest).toBeCloseTo(100_000 * (Math.pow(1.025, 10) - 1), 6);
  });
});
