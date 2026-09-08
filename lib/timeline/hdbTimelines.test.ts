import { describe, expect, it } from 'vitest';
import {
  estimateBuyCompletionDate,
  estimateSellCompletionDate,
  getBtoBuyTimeline,
  getBtoBuyTimelineFromApplication,
  getBuyTimeline,
  getResaleBuyTimeline,
  getResaleBuyTimelineFromOtp,
  getResaleSellTimeline,
  getResaleSellTimelineFromOtp,
} from './hdbTimelines';

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

describe('getResaleSellTimeline', () => {
  const stages = getResaleSellTimeline();

  it('starts with registering Intent to Sell and ends with completion', () => {
    expect(stages[0].name).toBe('Register Intent to Sell');
    expect(stages[stages.length - 1].name).toBe('Resale completion');
  });

  it('states the cooling-off period and OTP option period as fixed durations', () => {
    expect(stages[0].duration).toBe('7-day cooling-off');
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

// OTP granted 1 Jan 2027 -> option ends 22 Jan (21 days) -> application 29 Jan-5 Feb (1-2wks)
// -> approval/completion 26 Feb-2 Apr (4-8wks further).
describe('getResaleBuyTimelineFromOtp', () => {
  const stages = getResaleBuyTimelineFromOtp('2027-01-01');

  it('computes the legally-fixed option-period end as a single exact date', () => {
    const optionStage = stages.find((s) => s.name.startsWith('Option period ends'));
    expect(optionStage?.date).toBe('22 Jan 2027');
  });

  it('widens application and approval into ranges rather than false-precision single dates', () => {
    const application = stages.find((s) => s.name === 'Resale application & valuation');
    expect(application?.date).toBe('29 Jan 2027 – 5 Feb 2027');
    const approval = stages.find((s) => s.name === 'HDB approval');
    expect(approval?.date).toBe('26 Feb 2027 – 2 Apr 2027');
  });

  it('every stage carries a computed date when anchored', () => {
    for (const stage of stages) {
      expect(stage.date).toBeTruthy();
    }
  });
});

describe('getResaleSellTimelineFromOtp', () => {
  it('uses the same date math as the buy side, with seller-facing copy', () => {
    const stages = getResaleSellTimelineFromOtp('2027-01-01');
    expect(stages[0].name).toBe('OTP granted to buyer');
    expect(stages[0].date).toBe('1 Jan 2027');
    const optionStage = stages.find((s) => s.name.startsWith('Option period ends'));
    expect(optionStage?.date).toBe('22 Jan 2027');
  });
});

describe('getBtoBuyTimelineFromApplication', () => {
  it('computes only the ballot-result window; later stages stay duration-only', () => {
    const stages = getBtoBuyTimelineFromApplication('2027-01-01');
    const launch = stages.find((s) => s.name === 'Launch & application');
    expect(launch?.date).toBe('1 Jan 2027');
    const ballot = stages.find((s) => s.name === 'Ballot result');
    expect(ballot?.date).toBe('15 Jan 2027 – 22 Jan 2027');
    const selection = stages.find((s) => s.name === 'Flat selection appointment');
    expect(selection?.date).toBeUndefined();
  });
});

describe('getBuyTimeline with an anchor date', () => {
  it('routes to the dated variant for each flat source when an anchor is given', () => {
    expect(getBuyTimeline('RESALE', '2027-01-01')).toEqual(getResaleBuyTimelineFromOtp('2027-01-01'));
    expect(getBuyTimeline('BTO', '2027-01-01')).toEqual(getBtoBuyTimelineFromApplication('2027-01-01'));
  });

  it('falls back to the undated variant when no anchor is given', () => {
    expect(getBuyTimeline('RESALE')).toEqual(getResaleBuyTimeline());
  });
});

describe('completion-date estimates (for cashflow sequencing, not display)', () => {
  it('resale: uses the latest (most conservative) end of the approval range', () => {
    expect(estimateSellCompletionDate('2027-01-01')).toBe('2027-04-02');
    expect(estimateBuyCompletionDate('RESALE', '2027-01-01')).toBe('2027-04-02');
  });

  it('BTO: uses the midpoint of the sourced 3-5 year construction range', () => {
    expect(estimateBuyCompletionDate('BTO', '2027-01-01')).toBe('2031-01-01');
  });
});
