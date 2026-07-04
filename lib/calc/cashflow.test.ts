import { describe, expect, it } from 'vitest';
import { computeCashflow, type CashflowEvent } from './cashflow';

describe('computeCashflow', () => {
  it('produces a running cash/cpf balance sorted by date regardless of input order', () => {
    const events: CashflowEvent[] = [
      { date: '2026-03-01', label: 'sale completion', cash: 200_000, cpf: 50_000, direction: 'IN' },
      { date: '2026-01-01', label: 'option money', cash: -5_000, cpf: 0, direction: 'OUT' },
    ];
    const result = computeCashflow(events);
    expect(result.timeline.map((p) => p.label)).toEqual(['option money', 'sale completion']);
    expect(result.timeline[0].runningCash).toBe(-5_000);
    expect(result.timeline[1].runningCash).toBe(195_000);
  });

  it('flags a bridging banner with amount and week duration for a deliberate cash gap', () => {
    const events: CashflowEvent[] = [
      { date: '2026-01-01', label: 'buy option money', cash: -10_000, cpf: 0, direction: 'OUT' },
      { date: '2026-02-01', label: 'buy exercise', cash: -40_000, cpf: 0, direction: 'OUT' },
      { date: '2026-04-01', label: 'sell completion', cash: 100_000, cpf: 0, direction: 'IN' },
    ];
    const result = computeCashflow(events);
    expect(result.bridgingNeeded).toBe(true);
    expect(result.bridgingAmount).toBe(50_000);
    expect(result.bridgingWeeks).toBeGreaterThan(0);
    expect(result.warnings[0]).toMatch(/bridging needed: \$50,000 for ~\d+ weeks/);
  });

  it('no bridging banner when cash never goes negative', () => {
    const events: CashflowEvent[] = [
      { date: '2026-01-01', label: 'sell completion', cash: 100_000, cpf: 0, direction: 'IN' },
      { date: '2026-02-01', label: 'buy exercise', cash: -40_000, cpf: 0, direction: 'OUT' },
    ];
    const result = computeCashflow(events);
    expect(result.bridgingNeeded).toBe(false);
    expect(result.warnings).toEqual([]);
  });

  it('appends a contra-facility note to the banner when available', () => {
    const events: CashflowEvent[] = [
      { date: '2026-01-01', label: 'buy exercise', cash: -50_000, cpf: 0, direction: 'OUT' },
      { date: '2026-03-01', label: 'sell completion', cash: 50_000, cpf: 0, direction: 'IN' },
    ];
    const result = computeCashflow(events, { contraFacilityAvailable: true });
    expect(result.warnings[0]).toMatch(/contra facility/i);
  });
});
