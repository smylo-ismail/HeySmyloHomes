import { describe, expect, it } from 'vitest';
import { runHdbSellAndBuy } from './hdbSellAndBuy';
import type { HdbSellAndBuyInput } from '@/lib/schema/hdbSellAndBuy';

// Both legs are RESALE-timed here, so completion = anchor + ~91 days (21-day OTP + up to 2wks
// application + up to 8wks approval) for both sides — the anchors' relative order alone
// determines which leg completes first.
const baseInput: HdbSellAndBuyInput = {
  sellFlatType: '3R', // deliberately different from flatType (bought) below
  sellPrice: 550_000,
  outstandingLoanBalance: 100_000,
  cpfPrincipalUsed: 150_000,
  cpfUsageYears: 5,
  sellOtpGrantedDate: '2026-10-01',

  applicationType: 'FAMILY',
  citizenshipMix: 'SC_SC',
  avgMonthlyHouseholdIncome: 9_000,
  employedContinuously12Months: true,
  buyerAges: [45, 43],
  flatSource: 'RESALE',
  flatType: '4R',
  price: 600_000,
  valuation: 600_000,
  remainingLeaseYears: 85,
  proximity: 'WITHIN_4KM',
  ownsOrDisposedPrivateWithin30Months: false,
  loanType: 'HDB',
  tenureYears: 20,
  additionalCpfOaBalance: 20_000,
  buyAnchorDate: '2026-12-15', // OTP granted ~2.5mo after the sell OTP — sells first
};

describe('runHdbSellAndBuy — sequencing', () => {
  it('sell-before-buy: no sequencing warning, propertyCount treated as 1 (no ABSD for SC/SC)', () => {
    const result = runHdbSellAndBuy(baseInput);
    expect(result.warnings.some((w) => /two HDB flats at once/i.test(w))).toBe(false);
    expect(result.absd.absd).toBe(0);
    expect(result.absd.remissionApplied).toBe(false); // never their first jointly-owned home
  });

  it('resale levy is keyed on the flat SOLD (3R -> $30,000), not the flat bought (4R)', () => {
    const result = runHdbSellAndBuy(baseInput);
    expect(result.sell.resaleLevy.levy).toBe(30_000);
  });

  it('buy-before-sell: sequencing warning fires and ABSD is priced at the 2nd-property rate', () => {
    // Buy OTP granted before the sell OTP -> buy completes first under the same offset.
    const badOrder = { ...baseInput, buyAnchorDate: '2026-08-01' };
    const result = runHdbSellAndBuy(badOrder);
    expect(result.warnings.some((w) => /two HDB flats at once/i.test(w))).toBe(true);
    expect(result.absd.absd).toBeGreaterThan(0);
  });
});

describe('runHdbSellAndBuy — grants (pure second-timer)', () => {
  it('CHG and EHG are zero; PHG still applies', () => {
    const result = runHdbSellAndBuy(baseInput);
    expect(result.grants.chg).toBe(0);
    expect(result.grants.ehg).toBe(0);
    expect(result.grants.phg).toBeGreaterThan(0);
  });
});

describe('runHdbSellAndBuy — CPF refund feeds the buy leg', () => {
  it('sale CPF refund reduces (or eliminates) the buy leg’s cash top-up', () => {
    const withRefund = runHdbSellAndBuy(baseInput);
    const withoutRefund = runHdbSellAndBuy({ ...baseInput, cpfPrincipalUsed: 0, cpfUsageYears: 0 });
    expect(withRefund.cpf.cashTopUp).toBeLessThanOrEqual(withoutRefund.cpf.cashTopUp);
  });
});

describe('runHdbSellAndBuy — combined cashflow', () => {
  it('totalCashRequired is 0 when sale proceeds and CPF fully cover the buy leg', () => {
    const result = runHdbSellAndBuy(baseInput);
    if (!result.cashflow.bridgingNeeded) {
      expect(result.totalCashRequired).toBe(0);
    } else {
      expect(result.totalCashRequired).toBe(result.cashflow.bridgingAmount);
    }
  });

  it('flags a bridging gap when the purchase needs funding well before the sale completes', () => {
    const result = runHdbSellAndBuy({
      ...baseInput,
      buyAnchorDate: '2026-06-01',
      sellOtpGrantedDate: '2027-01-01',
    });
    expect(result.cashflow.bridgingNeeded).toBe(true);
    expect(result.totalCashRequired).toBeGreaterThan(0);
  });
});
