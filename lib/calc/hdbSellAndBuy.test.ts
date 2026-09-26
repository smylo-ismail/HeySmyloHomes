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
  sellers: [{ cpfPrincipalUsed: 150_000, cpfUsageYears: 5 }],
  sellOtpGrantedDate: '2026-10-01',

  applicationType: 'FAMILY',
  citizenshipMix: 'SC_SC',
  avgMonthlyHouseholdIncome: 9_000,
  employedContinuously12Months: true,
  buyerAges: [45, 43],
  flatDestination: 'HDB',
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

describe('runHdbSellAndBuy — resale levy trigger (only "another subsidised flat")', () => {
  it('an HDB resale bought with no grant at all owes no levy', () => {
    const result = runHdbSellAndBuy({ ...baseInput, proximity: 'NONE' });
    expect(result.grants.total).toBe(0); // no PHG (proximity none), no CHG/EHG (second-timer)
    expect(result.sell.resaleLevy.levy).toBe(0);
  });

  it('an HDB resale bought WITH a grant (e.g. PHG) still owes the levy', () => {
    const result = runHdbSellAndBuy(baseInput); // proximity: WITHIN_4KM -> PHG > 0
    expect(result.grants.total).toBeGreaterThan(0);
    expect(result.sell.resaleLevy.levy).toBeGreaterThan(0);
  });

  it('a BTO flat owes the levy regardless of grants (second-timers get none on BTO)', () => {
    const result = runHdbSellAndBuy({ ...baseInput, flatSource: 'BTO', proximity: 'NONE' });
    expect(result.grants.total).toBe(0);
    expect(result.sell.resaleLevy.levy).toBeGreaterThan(0);
  });

  it('buying a private property never owes the levy, even with sufficient funds', () => {
    const result = runHdbSellAndBuy({
      ...baseInput,
      flatDestination: 'PRIVATE',
      flatSource: undefined,
      flatType: undefined,
      remainingLeaseYears: undefined,
      proximity: undefined,
      loanType: 'BANK',
    });
    expect(result.sell.resaleLevy.levy).toBe(0);
  });
});

describe('runHdbSellAndBuy — buying private property', () => {
  const privateInput: HdbSellAndBuyInput = {
    ...baseInput,
    flatDestination: 'PRIVATE',
    flatSource: undefined,
    flatType: undefined,
    remainingLeaseYears: undefined,
    proximity: undefined,
    loanType: 'BANK',
  };

  it('never gets CPF housing grants', () => {
    const result = runHdbSellAndBuy(privateInput);
    expect(result.grants).toEqual({ ehg: 0, chg: 0, phg: 0, total: 0, ineligibilityReasons: [], warnings: [] });
  });

  it('is TDSR-bound, not MSR-bound — MSR only applies to HDB/EC purchases', () => {
    const result = runHdbSellAndBuy(privateInput);
    expect(result.loan.maxLoanMsr).toBeUndefined();
    expect(result.loan.maxLoanTdsr).toBeDefined();
  });

  it('uses private resale fee rates (0% buyer commission, unlike HDB’s 1%)', () => {
    const result = runHdbSellAndBuy(privateInput);
    expect(result.fees.commission).toBe(0);
  });

  it('owning an HDB flat alongside private property while the sale is pending is not a prohibition warning', () => {
    const result = runHdbSellAndBuy({ ...privateInput, buyAnchorDate: '2026-08-01' }); // buys before selling
    expect(result.warnings.some((w) => /two HDB flats at once/i.test(w))).toBe(false);
    expect(result.warnings.some((w) => /own 2 properties/i.test(w))).toBe(true);
    expect(result.absd.absd).toBeGreaterThan(0);
  });
});

describe('runHdbSellAndBuy — CPF refund feeds the buy leg', () => {
  it('sale CPF refund reduces (or eliminates) the buy leg’s cash top-up', () => {
    const withRefund = runHdbSellAndBuy(baseInput);
    const withoutRefund = runHdbSellAndBuy({ ...baseInput, sellers: [{ cpfPrincipalUsed: 0, cpfUsageYears: 0 }] });
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

describe('runHdbSellAndBuy — mandatory cash-to-loan rule interacts correctly with loan sizing', () => {
  it('proceeds don’t cover the loan redemption at all: no mandatory cash, floor stays $25,000', () => {
    const result = runHdbSellAndBuy({
      ...baseInput,
      sellPrice: 500_000,
      outstandingLoanBalance: 480_000, // heavily underwater
    });
    expect(result.sell.netCashProceeds).toBeLessThan(0);
    expect(result.cashMandatorilyAppliedToLoan).toBe(0);
    expect(result.minCashSellerKeeps).toBe(25_000);
  });

  it('when the loan is eligibility-capped (not funds-sized), the mandatory cash still funds the purchase — it just doesn’t shrink the loan further, and the final cash-required figure stays accurate rather than double-counting it', () => {
    // Very low income forces an MSR ceiling far below what would otherwise be borrowed, so the
    // loan is eligibility-bound even though there's ample mandatory cash from the sale.
    const result = runHdbSellAndBuy({
      ...baseInput,
      sellPrice: 900_000,
      sellers: [{ cpfPrincipalUsed: 0, cpfUsageYears: 0 }],
      avgMonthlyHouseholdIncome: 2_000,
      additionalCpfOaBalance: 0,
      proximity: 'NONE',
    });
    expect(result.loan.bindingConstraint).toBe('MSR');
    expect(result.loan.loanGranted).toBeCloseTo(result.loan.maxLoanMsr!);
    expect(result.cashMandatorilyAppliedToLoan).toBeGreaterThan(0);
    // The sale's full net proceeds (not just the "must-apply" slice) still cover the purchase
    // ahead of time, so nothing extra is required overall.
    expect(result.totalCashRequired).toBe(0);
  });
});

describe('runHdbSellAndBuy — sell-leg timing overrides', () => {
  it('an earlier-than-default option period pulls the sell completion date forward', () => {
    const withDefaults = runHdbSellAndBuy(baseInput);
    const earlyExercise = runHdbSellAndBuy({ ...baseInput, sellOptionPeriodDays: 10 });
    expect(earlyExercise.estimatedSellCompletionDate < withDefaults.estimatedSellCompletionDate).toBe(true);
  });

  it('a later-than-default application submission pushes the sell completion date back', () => {
    const withDefaults = runHdbSellAndBuy(baseInput);
    const lateSubmission = runHdbSellAndBuy({ ...baseInput, sellApplicationDays: 21 });
    expect(lateSubmission.estimatedSellCompletionDate > withDefaults.estimatedSellCompletionDate).toBe(true);
  });

  it('sell-leg overrides never affect the buy leg’s completion date', () => {
    const withDefaults = runHdbSellAndBuy(baseInput);
    const overridden = runHdbSellAndBuy({ ...baseInput, sellOptionPeriodDays: 5, sellApplicationDays: 30 });
    expect(overridden.estimatedBuyCompletionDate).toBe(withDefaults.estimatedBuyCompletionDate);
  });
});
