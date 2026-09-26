import { describe, expect, it } from 'vitest';
import { computeSellFlat } from './sellFlat';

const baseInput = {
  salePrice: 500_000,
  outstandingLoanBalance: 100_000,
  sellers: [{ principal: 150_000, accruedInterestOverride: 20_000 }],
  resaleLevy: { isSecondSubsidisedFlat: false, flatTypeSold: '4R' as const },
};

describe('computeSellFlat', () => {
  it('happy path: no resale levy, HDB default selling fees', () => {
    const result = computeSellFlat(baseInput);
    expect(result.cpfRefund.totalRefund).toBe(170_000);
    expect(result.resaleLevy.levy).toBe(0);
    expect(result.sellFees.conveyancing).toBe(2_400);
    expect(result.sellFees.commission).toBeCloseTo(500_000 * 0.02 * 1.09);
    // 500,000 - 100,000 (loan) - 170,000 (cpf) - 0 (levy) - 2,400 - 10,900 (fees)
    expect(result.netCashProceeds).toBeCloseTo(216_700);
    expect(result.warnings).toEqual([]);
  });

  it('resale levy deducts from proceeds when buying another subsidised flat', () => {
    const result = computeSellFlat({
      ...baseInput,
      resaleLevy: { isSecondSubsidisedFlat: true, flatTypeSold: '4R' },
    });
    expect(result.resaleLevy.levy).toBe(40_000);
    expect(result.netCashProceeds).toBeCloseTo(216_700 - 40_000);
  });

  it('CPF accrued interest compounds via years when no override is given', () => {
    const result = computeSellFlat({
      ...baseInput,
      sellers: [{ principal: 150_000, years: 5 }],
    });
    const expectedInterest = 150_000 * (Math.pow(1.025, 5) - 1);
    expect(result.cpfRefund.accruedInterest).toBeCloseTo(expectedInterest);
    expect(result.cpfRefund.totalRefund).toBeCloseTo(150_000 + expectedInterest);
  });

  it('warns when sale proceeds fall short of loan + CPF + levy + fees', () => {
    const result = computeSellFlat({
      ...baseInput,
      salePrice: 200_000,
      resaleLevy: { isSecondSubsidisedFlat: true, flatTypeSold: '4R' },
    });
    expect(result.netCashProceeds).toBeLessThan(0);
    expect(result.warnings.some((w) => /need cash to complete the sale/i.test(w))).toBe(true);
  });

  it('does not warn when proceeds are positive', () => {
    const result = computeSellFlat(baseInput);
    expect(result.netCashProceeds).toBeGreaterThan(0);
    expect(result.warnings.some((w) => /need cash to complete the sale/i.test(w))).toBe(false);
  });

  describe('multi-seller CPF', () => {
    it('sums per-seller refunds computed with their own years', () => {
      const result = computeSellFlat({
        ...baseInput,
        sellers: [
          { principal: 255_278, accruedInterestOverride: 0 },
          { principal: 142_679, accruedInterestOverride: 0 },
        ],
      });
      expect(result.cpfRefundBySeller.length).toBe(2);
      expect(result.cpfRefund.principal).toBe(397_957);
      expect(result.cpfRefund.totalRefund).toBe(397_957);
    });
  });

  describe('upgrading levy and outstanding upgrading costs', () => {
    it('deduct from net cash proceeds like the resale levy', () => {
      const result = computeSellFlat({
        ...baseInput,
        upgradingLevy: 5_000,
        outstandingUpgradingCost: 2_000,
      });
      expect(result.netCashProceeds).toBeCloseTo(216_700 - 5_000 - 2_000);
    });

    it('default to 0 when omitted', () => {
      const result = computeSellFlat(baseInput);
      expect(result.upgradingLevy).toBe(0);
      expect(result.outstandingUpgradingCost).toBe(0);
    });
  });

  describe('proceedsBySeller (manner of holding)', () => {
    it('splits equally for Joint Tenancy regardless of shares passed', () => {
      const result = computeSellFlat({
        ...baseInput,
        sellers: [{ principal: 100_000 }, { principal: 50_000 }],
        shareOfProceeds: { manner: 'JOINT_TENANCY' },
      });
      expect(result.proceedsBySeller.length).toBe(2);
      expect(result.proceedsBySeller[0].share).toBeCloseTo(0.5);
      expect(result.proceedsBySeller[0].amount).toBeCloseTo(result.netCashProceeds / 2);
      expect(result.proceedsBySeller[1].amount).toBeCloseTo(result.netCashProceeds / 2);
    });

    it('splits by the given shares for Tenancy-in-Common', () => {
      const result = computeSellFlat({
        ...baseInput,
        sellers: [{ principal: 100_000 }, { principal: 50_000 }],
        shareOfProceeds: { manner: 'TENANCY_IN_COMMON', shares: [0.7, 0.3] },
      });
      expect(result.proceedsBySeller[0].amount).toBeCloseTo(result.netCashProceeds * 0.7);
      expect(result.proceedsBySeller[1].amount).toBeCloseTo(result.netCashProceeds * 0.3);
    });

    it('defaults to an equal split when no shareOfProceeds is given', () => {
      const result = computeSellFlat(baseInput);
      expect(result.proceedsBySeller.length).toBe(1);
      expect(result.proceedsBySeller[0].amount).toBeCloseTo(result.netCashProceeds);
    });

    it('splits three ways with uneven shares, summing back to the total exactly', () => {
      const result = computeSellFlat({
        ...baseInput,
        sellers: [{ principal: 100_000 }, { principal: 50_000 }, { principal: 20_000 }],
        shareOfProceeds: { manner: 'TENANCY_IN_COMMON', shares: [0.5, 0.3, 0.2] },
      });
      expect(result.proceedsBySeller[0].amount).toBeCloseTo(result.netCashProceeds * 0.5);
      expect(result.proceedsBySeller[1].amount).toBeCloseTo(result.netCashProceeds * 0.3);
      expect(result.proceedsBySeller[2].amount).toBeCloseTo(result.netCashProceeds * 0.2);
      const summed = result.proceedsBySeller.reduce((sum, p) => sum + p.amount, 0);
      expect(summed).toBeCloseTo(result.netCashProceeds);
    });
  });
});
