import { describe, expect, it } from 'vitest';
import { runFirstTimerHdbBuy } from './firstTimerHdbBuy';
import { firstTimerHdbBuySchema } from '@/lib/schema/firstTimerHdbBuy';

describe('runFirstTimerHdbBuy — golden case 1 end-to-end', () => {
  const input = firstTimerHdbBuySchema.parse({
    applicationType: 'FAMILY',
    citizenshipMix: 'SC_SC',
    allFirstTimers: true,
    avgMonthlyHouseholdIncome: 7_000,
    employedContinuously12Months: true,
    buyerAges: [30, 29],
    flatSource: 'RESALE',
    flatType: '4R',
    price: 600_000,
    valuation: 600_000,
    remainingLeaseYears: 70,
    proximity: 'WITHIN_4KM',
    ownsOrDisposedPrivateWithin30Months: false,
    loanType: 'HDB',
    tenureYears: 25,
    cpfOaBalance: 60_000,
  });

  const result = runFirstTimerHdbBuy(input);

  it('grants total $130,000', () => {
    expect(result.grants.total).toBe(130_000);
  });

  it('BSD is $12,600, ABSD is $0', () => {
    expect(result.bsd).toBe(12_600);
    expect(result.absd.absd).toBe(0);
  });

  // With $190,000 of CPF+grants available, the buyer needs less than the $442,841 MSR ceiling
  // would allow — needs-based sizing (see loan.ts) grants only $425,000, the residual after
  // funding price + BSD + conveyancing from CPF/grants. Confirmed against HDB's own resale
  // payment-plan calculator (screenshots, Sep 2026) — see the loan.ts/cpf.ts comments.
  it('loan is funds-bound (below the $442,841 MSR ceiling) at $425,000', () => {
    expect(result.loan.maxLoanMsr).toBeCloseTo(442_841, 0);
    expect(result.loan.bindingConstraint).toBe('FUNDS');
    expect(Math.round(result.loan.loanGranted)).toBe(425_000);
  });

  it('CPF covers the full requirement (downpayment + BSD + conveyancing), no cash top-up', () => {
    expect(Math.round(result.cpf.cpfNeeded)).toBe(190_000);
    expect(result.cpf.cashTopUp).toBe(0);
  });
});

describe('runFirstTimerHdbBuy — golden case 2 end-to-end (bank loan, spousal ABSD remission)', () => {
  const input = firstTimerHdbBuySchema.parse({
    applicationType: 'FAMILY',
    citizenshipMix: 'SC_SPR',
    allFirstTimers: true,
    avgMonthlyHouseholdIncome: 9_000,
    employedContinuously12Months: true,
    buyerAges: [30, 26],
    flatSource: 'RESALE',
    flatType: '5R',
    price: 780_000,
    valuation: 780_000,
    remainingLeaseYears: 40,
    proximity: 'WITH_PARENTS_OR_CHILD',
    ownsOrDisposedPrivateWithin30Months: false,
    loanType: 'BANK',
    tenureYears: 30,
    cpfOaBalance: 0,
    existingMonthlyDebt: 700,
  });

  const result = runFirstTimerHdbBuy(input);

  it('grants total $75,000', () => {
    expect(result.grants.total).toBe(75_000);
  });

  it('BSD is $18,000, ABSD is $0 via spousal remission', () => {
    expect(result.bsd).toBe(18_000);
    expect(result.absd.absd).toBe(0);
    expect(result.absd.remissionApplied).toBe(true);
  });

  it('loan is MSR-bound at $565,545 despite TDSR headroom', () => {
    expect(result.loan.bindingConstraint).toBe('MSR');
    expect(Math.round(result.loan.loanGranted)).toBe(565_545);
  });

  it('downpayment is $214,455 and min cash is $39,000', () => {
    expect(Math.round(result.loan.downpayment)).toBe(214_455);
    expect(Math.round(result.loan.minCashRequired)).toBe(39_000);
  });

  it('surfaces the lease-to-95 pro-ration warning', () => {
    expect(result.grants.warnings.some((w) => /pro-rat/i.test(w))).toBe(true);
  });
});

describe('runFirstTimerHdbBuy — golden case 3: 30-month disqualifier', () => {
  it('grants are zero but BSD/loan engines are unaffected', () => {
    const input = firstTimerHdbBuySchema.parse({
      applicationType: 'FAMILY',
      citizenshipMix: 'SC_SC',
      allFirstTimers: true,
      avgMonthlyHouseholdIncome: 7_000,
      employedContinuously12Months: true,
      buyerAges: [30, 29],
      flatSource: 'RESALE',
      flatType: '4R',
      price: 550_000,
      valuation: 550_000,
      remainingLeaseYears: 70,
      proximity: 'WITHIN_4KM',
      ownsOrDisposedPrivateWithin30Months: true,
      loanType: 'HDB',
      tenureYears: 25,
      cpfOaBalance: 60_000,
    });
    const result = runFirstTimerHdbBuy(input);
    expect(result.grants.total).toBe(0);
    expect(result.bsd).toBe(11_100);
  });
});
