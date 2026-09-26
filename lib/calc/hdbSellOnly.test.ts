import { describe, expect, it } from 'vitest';
import { runHdbSellOnly } from './hdbSellOnly';
import type { HdbSellOnlyInput } from '@/lib/schema/hdbSellOnly';

const baseInput: HdbSellOnlyInput = {
  sellFlatType: '4R',
  sellPrice: 650_000,
  outstandingLoanBalance: 32_000,
  sellers: [{ cpfPrincipalUsed: 255_278, cpfUsageYears: 5 }],
  sellOtpGrantedDate: '2026-10-01',
};

describe('runHdbSellOnly — basic proceeds', () => {
  it('computes net cash proceeds with no buy leg involved', () => {
    const result = runHdbSellOnly(baseInput);
    expect(result.sell.salePrice).toBe(650_000);
    expect(result.sell.netCashProceeds).toBeGreaterThan(0);
    expect(result.sell.netCashProceeds).toBeLessThan(650_000);
  });

  it('estimates a sell completion date from the OTP-granted anchor', () => {
    const result = runHdbSellOnly(baseInput);
    expect(result.estimatedSellCompletionDate > baseInput.sellOtpGrantedDate).toBe(true);
  });
});

describe('runHdbSellOnly — resale levy only fires when self-declared as another subsidised flat', () => {
  it('no levy when not planning a next purchase at all', () => {
    const result = runHdbSellOnly(baseInput);
    expect(result.sell.resaleLevy.levy).toBe(0);
  });

  it('no levy when planning to buy, but not another subsidised flat', () => {
    const result = runHdbSellOnly({
      ...baseInput,
      planningNextPurchase: true,
      nextFlatIsAnotherSubsidisedFlat: false,
      nextFlatDestination: 'PRIVATE',
    });
    expect(result.sell.resaleLevy.levy).toBe(0);
  });

  it('levy fires when self-declared as buying another subsidised flat', () => {
    const result = runHdbSellOnly({
      ...baseInput,
      planningNextPurchase: true,
      nextFlatIsAnotherSubsidisedFlat: true,
      nextFlatDestination: 'HDB',
      nextLoanType: 'HDB',
    });
    expect(result.sell.resaleLevy.levy).toBeGreaterThan(0);
  });
});

describe('runHdbSellOnly — mandatory cash-to-loan preview', () => {
  it('is 0 when not planning a next HDB purchase with an HDB loan', () => {
    const result = runHdbSellOnly(baseInput);
    expect(result.cashMandatorilyAppliedToLoan).toBe(0);
  });

  it('is 0 for a next purchase that is private or bank-financed', () => {
    const result = runHdbSellOnly({
      ...baseInput,
      planningNextPurchase: true,
      nextFlatIsAnotherSubsidisedFlat: false,
      nextFlatDestination: 'PRIVATE',
    });
    expect(result.cashMandatorilyAppliedToLoan).toBe(0);
  });

  it('applies the greater-of-$25k-or-50% rule when next purchase is another HDB flat with an HDB loan', () => {
    const result = runHdbSellOnly({
      ...baseInput,
      planningNextPurchase: true,
      nextFlatIsAnotherSubsidisedFlat: true,
      nextFlatDestination: 'HDB',
      nextLoanType: 'HDB',
    });
    const basis = Math.max(result.sell.netCashProceeds, 0);
    const expectedKeep = Math.max(25_000, 0.5 * basis);
    expect(result.minCashSellerKeeps).toBeCloseTo(expectedKeep);
    expect(result.cashMandatorilyAppliedToLoan).toBeCloseTo(Math.max(basis - expectedKeep, 0));
  });
});

describe('runHdbSellOnly — multi-seller and manner of holding pass straight through to sellFlat', () => {
  it('splits proceeds per seller under tenancy-in-common', () => {
    const result = runHdbSellOnly({
      ...baseInput,
      sellers: [
        { cpfPrincipalUsed: 255_278, cpfUsageYears: 5 },
        { cpfPrincipalUsed: 142_679, cpfUsageYears: 3 },
      ],
      mannerOfHolding: 'TENANCY_IN_COMMON',
      ownershipShares: [0.6, 0.4],
    });
    expect(result.sell.proceedsBySeller).toHaveLength(2);
    expect(result.sell.proceedsBySeller[0].share).toBeCloseTo(0.6);
    expect(result.sell.proceedsBySeller[1].share).toBeCloseTo(0.4);
  });
});
