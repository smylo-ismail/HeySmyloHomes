import { describe, expect, it } from 'vitest';
import { computeLoan } from './loan';

describe('computeLoan — golden case 1 (HDB loan, MSR-bound)', () => {
  const result = computeLoan({
    loanType: 'HDB',
    price: 600_000,
    valuation: 600_000,
    tenureYears: 25,
    avgMonthlyHouseholdIncome: 7_000,
  });

  it('max loan by LTV is $450,000', () => {
    expect(Math.round(result.maxLoanLtv)).toBe(450_000);
  });

  it('max loan by MSR is $442,841', () => {
    expect(Math.round(result.maxLoanMsr!)).toBe(442_841);
  });

  it('loan granted is MSR-bound at $442,841', () => {
    expect(result.bindingConstraint).toBe('MSR');
    expect(Math.round(result.loanGranted)).toBe(442_841);
  });

  it('actual monthly payment @ 2.6% is $2,009', () => {
    expect(Math.round(result.actualMonthlyPayment!)).toBe(2_009);
  });

  it('downpayment is $157,159', () => {
    expect(Math.round(result.downpayment)).toBe(157_159);
  });

  it('min cash required is $0 for an HDB loan', () => {
    expect(result.minCashRequired).toBe(0);
  });
});

describe('computeLoan — golden case 2 (bank loan, MSR-bound despite TDSR headroom)', () => {
  const result = computeLoan({
    loanType: 'BANK',
    price: 780_000,
    valuation: 780_000,
    tenureYears: 30,
    avgMonthlyHouseholdIncome: 9_000,
    existingMonthlyDebt: 700,
    isHdbOrEcPurchase: true,
  });

  it('max loan by LTV is $585,000', () => {
    expect(Math.round(result.maxLoanLtv)).toBe(585_000);
  });

  it('max loan by MSR is $565,545', () => {
    expect(Math.round(result.maxLoanMsr!)).toBe(565_545);
  });

  it('max loan by TDSR is $890,210', () => {
    expect(Math.round(result.maxLoanTdsr!)).toBe(890_210);
  });

  it('loan granted is MSR-bound at $565,545 (MSR bites before TDSR)', () => {
    expect(result.bindingConstraint).toBe('MSR');
    expect(Math.round(result.loanGranted)).toBe(565_545);
  });

  it('downpayment is $214,455', () => {
    expect(Math.round(result.downpayment)).toBe(214_455);
  });

  it('min cash required is $39,000 (5% of price)', () => {
    expect(Math.round(result.minCashRequired)).toBe(39_000);
  });
});

describe('computeLoan — MSR/LTV crossover boundary', () => {
  it('case 1 inputs at income $7,200 -> MSR $455,493, LTV-bound at $450,000', () => {
    const result = computeLoan({
      loanType: 'HDB',
      price: 600_000,
      valuation: 600_000,
      tenureYears: 25,
      avgMonthlyHouseholdIncome: 7_200,
    });
    expect(Math.round(result.maxLoanMsr!)).toBe(455_493);
    expect(result.bindingConstraint).toBe('LTV');
    expect(Math.round(result.loanGranted)).toBe(450_000);
  });
});

describe('computeLoan — bank loan without HDB/EC purchase does not apply MSR', () => {
  it('no maxLoanMsr computed for a private-property bank loan', () => {
    const result = computeLoan({
      loanType: 'BANK',
      price: 1_000_000,
      valuation: 1_000_000,
      tenureYears: 30,
      avgMonthlyHouseholdIncome: 15_000,
      isHdbOrEcPurchase: false,
    });
    expect(result.maxLoanMsr).toBeUndefined();
    expect(result.bindingConstraint === 'LTV' || result.bindingConstraint === 'TDSR').toBe(true);
  });
});
