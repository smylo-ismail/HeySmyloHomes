import { describe, expect, it } from 'vitest';
import { getBtoBuyTimeline, getBuyTimeline, getResaleBuyTimeline } from './hdbBuyTimeline';

describe('getResaleBuyTimeline', () => {
  const stages = getResaleBuyTimeline();

  it('starts with the HFE letter and ends with completion', () => {
    expect(stages[0].name).toBe('HFE letter');
    expect(stages[stages.length - 1].name).toBe('Resale completion');
  });

  it('states the OTP option period as a fixed 21 days, not a range', () => {
    const otpStage = stages.find((s) => s.name.includes('Option to Purchase'));
    expect(otpStage?.duration).toBe('21 days');
  });

  it('every stage has a non-empty name, duration, and description', () => {
    for (const stage of stages) {
      expect(stage.name.length).toBeGreaterThan(0);
      expect(stage.duration.length).toBeGreaterThan(0);
      expect(stage.description.length).toBeGreaterThan(0);
    }
  });
});

describe('getBtoBuyTimeline', () => {
  const stages = getBtoBuyTimeline();

  it('starts with launch & application and ends with key collection', () => {
    expect(stages[0].name).toBe('Launch & application');
    expect(stages[stages.length - 1].name).toBe('Key collection');
  });

  it('flags construction as a multi-year range, not a fixed date', () => {
    const construction = stages.find((s) => s.name === 'Construction');
    expect(construction?.duration).toMatch(/3-5 years/);
  });
});

describe('getBuyTimeline', () => {
  it('routes BTO to the BTO timeline and RESALE to the resale timeline', () => {
    expect(getBuyTimeline('BTO')).toEqual(getBtoBuyTimeline());
    expect(getBuyTimeline('RESALE')).toEqual(getResaleBuyTimeline());
  });
});
