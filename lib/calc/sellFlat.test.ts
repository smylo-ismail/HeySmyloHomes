import { describe, expect, it } from 'vitest';
import { computeSellFlat } from './sellFlat';

const baseInput = {
  salePrice: 500_000,
  outstandingLoanBalance: 100_000,
  cpfRefund: { principal: 150_000, accruedInterestOverride: 20_000 },
  resaleLevy: { isSecondSubsidisedFlat: false, flatTypeBeingBought: '4R' as const },
};

describe('computeSellFlat', () => {
  it('happy path: no resale levy, HDB default selling fees', () => {
    const result = computeSellFlat(baseInput);
    expect(result.cpfRefund.totalRefund).toBe(170_000);
    expect(result.resaleLevy.levy).toBe(0);
    expect(result.sellFees.conveyancing).toBe(400);
    expect(result.sellFees.commission).toBeCloseTo(500_000 * 0.02 * 1.09);
    // 500,000 - 100,000 (loan) - 170,000 (cpf) - 0 (levy) - 400 - 10,900 (fees)
    expect(result.netCashProceeds).toBeCloseTo(218_700);
    expect(result.warnings).toEqual([]);
  });

  it('resale levy deducts from proceeds when buying another subsidised flat', () => {
    const result = computeSellFlat({
      ...baseInput,
      resaleLevy: { isSecondSubsidisedFlat: true, flatTypeBeingBought: '4R' },
    });
    expect(result.resaleLevy.levy).toBe(40_000);
    expect(result.netCashProceeds).toBeCloseTo(218_700 - 40_000);
  });

  it('CPF accrued interest compounds via years when no override is given', () => {
    const result = computeSellFlat({
      ...baseInput,
      cpfRefund: { principal: 150_000, years: 5 },
    });
    const expectedInterest = 150_000 * (Math.pow(1.025, 5) - 1);
    expect(result.cpfRefund.accruedInterest).toBeCloseTo(expectedInterest);
    expect(result.cpfRefund.totalRefund).toBeCloseTo(150_000 + expectedInterest);
  });

  it('warns when sale proceeds fall short of loan + CPF + levy + fees', () => {
    const result = computeSellFlat({
      ...baseInput,
      salePrice: 200_000,
      resaleLevy: { isSecondSubsidisedFlat: true, flatTypeBeingBought: '4R' },
    });
    expect(result.netCashProceeds).toBeLessThan(0);
    expect(result.warnings.some((w) => /need cash to complete the sale/i.test(w))).toBe(true);
  });

  it('does not warn when proceeds are positive', () => {
    const result = computeSellFlat(baseInput);
    expect(result.netCashProceeds).toBeGreaterThan(0);
    expect(result.warnings.some((w) => /need cash to complete the sale/i.test(w))).toBe(false);
  });
});
