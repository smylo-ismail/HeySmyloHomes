import { describe, expect, it } from 'vitest';
import { computeResaleLevy } from './resaleLevy';

describe('computeResaleLevy', () => {
  it('does not fire when not buying a second subsidised flat', () => {
    const result = computeResaleLevy({ isSecondSubsidisedFlat: false, flatTypeBeingBought: '4R' });
    expect(result.levy).toBe(0);
  });

  it('levy for each flat type matches the schedule', () => {
    expect(
      computeResaleLevy({ isSecondSubsidisedFlat: true, flatTypeBeingBought: '2R' }).levy
    ).toBe(15_000);
    expect(
      computeResaleLevy({ isSecondSubsidisedFlat: true, flatTypeBeingBought: '3R' }).levy
    ).toBe(30_000);
    expect(
      computeResaleLevy({ isSecondSubsidisedFlat: true, flatTypeBeingBought: '4R' }).levy
    ).toBe(40_000);
    expect(
      computeResaleLevy({ isSecondSubsidisedFlat: true, flatTypeBeingBought: '5R' }).levy
    ).toBe(45_000);
    expect(
      computeResaleLevy({ isSecondSubsidisedFlat: true, flatTypeBeingBought: 'EXEC' }).levy
    ).toBe(50_000);
    expect(
      computeResaleLevy({ isSecondSubsidisedFlat: true, flatTypeBeingBought: 'EC' }).levy
    ).toBe(55_000);
  });

  it('first flat sold before 3 Mar 2006 triggers the legacy percentage-based warning instead of a computed levy', () => {
    const result = computeResaleLevy({
      isSecondSubsidisedFlat: true,
      flatTypeBeingBought: '4R',
      firstFlatSoldDate: '2005-01-01',
    });
    expect(result.isLegacyPercentageBased).toBe(true);
    expect(result.levy).toBe(0);
    expect(result.warnings.some((w) => /legacy levy/i.test(w))).toBe(true);
  });
});
