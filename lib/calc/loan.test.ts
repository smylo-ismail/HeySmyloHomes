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

// Verified against HDB's own resale payment-plan calculator (screenshots, Sep 2026): loan
// amount = price + CPF-eligible costs − CPF/grants − mandatory minimum cash, not automatically
// the max eligible amount. Two runs of the same $878,000/$871,200-valuation scenario, only CPF
// changed by +$52,000 (from $148,000 to $200,000, both plus $100,000 grants) — HDB's own loan
// figure dropped by exactly $52,000 in response ($653,400 -> $601,400). See loan.ts's
// cpfAndGrantsAvailable/cpfEligibleUpfrontCosts comments.
describe('computeLoan — needs-based sizing (funds-bound, below eligibility ceiling)', () => {
  // This reproduces HDB's own calculator run exactly: $878,000 price, $871,200 valuation,
  // $148,000 CPF + $100,000 grants, $23,577.50 CPF-eligible costs (BSD+ABSD+conveyancing). Needed
  // funding ($901,577.50 total - $248,000 available = $653,577.50) is *slightly* above the LTV
  // ceiling ($653,400) — HDB's calculator flagged exactly this as "insufficient funds", with a
  // ~$177 cash top-up required (see cpf.ts, which is where that residual shows up as cashTopUp).
  it('stays LTV-bound when funds fall just short of what eligibility would otherwise allow', () => {
    const result = computeLoan({
      loanType: 'HDB',
      price: 878_000,
      valuation: 871_200,
      tenureYears: 25,
      avgMonthlyHouseholdIncome: 15_000,
      cpfAndGrantsAvailable: 248_000, // $148,000 CPF + $100,000 grants
      cpfEligibleUpfrontCosts: 23_577.5, // BSD + ABSD + conveyancing, matching HDB's "costs & fees"
    });
    expect(Math.round(result.maxLoanLtv)).toBe(653_400); // 75% of the lower of price/valuation
    expect(result.bindingConstraint).toBe('LTV');
    expect(Math.round(result.loanGranted)).toBe(653_400);
  });

  // Same scenario, but with $200,000 CPF instead of $148,000 (HDB's second run) — now funding
  // need ($601,577.50) is comfortably below the $653,400 LTV ceiling, so the loan is sized to
  // actual need rather than capped by eligibility. HDB's own loan figure dropped by exactly
  // $52,000 in response to this same $52,000 CPF increase ($653,400 -> $601,400, modulo HDB's own
  // administrative rounding to the nearest $100 — not replicated here).
  it('becomes funds-bound once funds clear the eligibility ceiling', () => {
    const result = computeLoan({
      loanType: 'HDB',
      price: 878_000,
      valuation: 871_200,
      tenureYears: 25,
      avgMonthlyHouseholdIncome: 15_000,
      cpfAndGrantsAvailable: 300_000, // $200,000 CPF + $100,000 grants
      cpfEligibleUpfrontCosts: 23_577.5,
    });
    expect(result.bindingConstraint).toBe('FUNDS');
    expect(Math.round(result.loanGranted)).toBe(601_578); // $901,577.50 - $300,000
  });

  it('drops the loan by exactly the CPF increase when both ends stay clear of the eligibility ceiling', () => {
    const base = {
      loanType: 'HDB' as const,
      price: 600_000,
      valuation: 600_000,
      tenureYears: 25,
      avgMonthlyHouseholdIncome: 15_000,
      cpfEligibleUpfrontCosts: 20_000,
    };
    const lower = computeLoan({ ...base, cpfAndGrantsAvailable: 400_000 });
    const higher = computeLoan({ ...base, cpfAndGrantsAvailable: 450_000 });
    expect(lower.bindingConstraint).toBe('FUNDS');
    expect(higher.bindingConstraint).toBe('FUNDS');
    expect(Math.round(lower.loanGranted - higher.loanGranted)).toBe(50_000);
  });

  it('falls back to the eligibility ceiling when funds fall well short of what is needed', () => {
    const result = computeLoan({
      loanType: 'HDB',
      price: 600_000,
      valuation: 600_000,
      tenureYears: 25,
      avgMonthlyHouseholdIncome: 7_000,
      cpfAndGrantsAvailable: 10_000,
      cpfEligibleUpfrontCosts: 12_600,
    });
    expect(result.bindingConstraint).toBe('MSR');
    expect(Math.round(result.loanGranted)).toBe(442_841);
  });

  it('respects the bank-loan minimum-cash floor even when CPF alone would cover everything', () => {
    const result = computeLoan({
      loanType: 'BANK',
      price: 1_000_000,
      valuation: 1_000_000,
      tenureYears: 30,
      avgMonthlyHouseholdIncome: 30_000,
      isHdbOrEcPurchase: false,
      cpfAndGrantsAvailable: 1_000_000, // more than enough to cover price + costs outright
      cpfEligibleUpfrontCosts: 30_000,
    });
    expect(result.bindingConstraint).toBe('FUNDS');
    expect(result.loanGranted).toBe(0);
    expect(Math.round(result.minCashRequired)).toBe(50_000); // 5% of price, still mandatory
  });

  it('omitting the new fields reproduces the old always-max-eligible-loan behavior', () => {
    const result = computeLoan({
      loanType: 'HDB',
      price: 600_000,
      valuation: 600_000,
      tenureYears: 25,
      avgMonthlyHouseholdIncome: 7_000,
    });
    expect(result.bindingConstraint).toBe('MSR');
    expect(Math.round(result.loanGranted)).toBe(442_841);
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
