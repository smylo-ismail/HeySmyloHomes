import { describe, expect, it } from 'vitest';
import {
  appendRenovation,
  estimateBuyCompletionDate,
  estimateSellCompletionDate,
  getBtoBuyTimeline,
  getBtoBuyTimelineFromApplication,
  getBuyTimeline,
  getPrivateResaleBuyTimeline,
  getPrivateResaleBuyTimelineFromOtp,
  getResaleBuyTimeline,
  getResaleBuyTimelineFromOtp,
  getResaleSellTimeline,
  getResaleSellTimelineFromOtp,
  mergeTimelines,
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

  it('separates submission, HDB acceptance, and completion into three distinct stages', () => {
    expect(stages.map((s) => s.name)).toEqual(
      expect.arrayContaining(['Resale application submitted', 'HDB notifies application acceptance', 'Resale completion'])
    );
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
    expect(getBuyTimeline('HDB', 'BTO')).toEqual(getBtoBuyTimeline());
    expect(getBuyTimeline('HDB', 'RESALE')).toEqual(getResaleBuyTimeline());
  });

  it('routes PRIVATE to the private resale timeline regardless of flatSource', () => {
    expect(getBuyTimeline('PRIVATE', undefined)).toEqual(getPrivateResaleBuyTimeline());
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

// OTP granted 1 Jan 2027 -> option ends 22 Jan (21 days) -> application submitted 29 Jan (+1wk)
// -> HDB accepts 26 Feb (+4wk) -> completion 23 Apr 2027 (+8wk). Matches smylo's Gordon & Angie
// case (OTP 23 Sep 2026 -> exercise 14 Oct -> submission 21 Oct -> acceptance 18 Nov ->
// completion 13 Jan 2027) — see config/rates.ts's hdbResaleBuy comment.
describe('getResaleBuyTimelineFromOtp', () => {
  const stages = getResaleBuyTimelineFromOtp('2027-01-01');

  it('computes the legally-fixed option-period end as a single exact date', () => {
    const optionStage = stages.find((s) => s.name.startsWith('Option period ends'));
    expect(optionStage?.date).toBe('22 Jan 2027');
  });

  it('uses single-figure dates for submission and acceptance, not ranges', () => {
    const application = stages.find((s) => s.name === 'Resale application submitted');
    expect(application?.date).toBe('29 Jan 2027');
    const acceptance = stages.find((s) => s.name === 'HDB notifies application acceptance');
    expect(acceptance?.date).toBe('26 Feb 2027');
  });

  it('every stage carries a computed date when anchored', () => {
    for (const stage of stages) {
      expect(stage.date).toBeTruthy();
    }
  });

  it('computes completion 8 weeks after acceptance', () => {
    const completion = stages.find((s) => s.name === 'Resale completion (estimated)');
    expect(completion?.date).toBe('23 Apr 2027');
  });

  it('matches the real Gordon & Angie case timeline', () => {
    const gordonAndAngie = getResaleBuyTimelineFromOtp('2026-09-23');
    expect(gordonAndAngie.find((s) => s.name.startsWith('Option period ends'))?.date).toBe('14 Oct 2026');
    expect(gordonAndAngie.find((s) => s.name === 'Resale application submitted')?.date).toBe('21 Oct 2026');
    expect(gordonAndAngie.find((s) => s.name === 'HDB notifies application acceptance')?.date).toBe('18 Nov 2026');
    expect(gordonAndAngie.find((s) => s.name === 'Resale completion (estimated)')?.date).toBe('13 Jan 2027');
  });

  it('lets a known case override any of the default durations', () => {
    const overridden = getResaleBuyTimelineFromOtp('2027-01-01', {
      otpDays: 14,
      applicationDays: 3,
      acceptanceWeeks: 2,
      completionWeeksAfterAcceptance: 6,
    });
    expect(overridden.find((s) => s.name.startsWith('Option period ends'))?.date).toBe('15 Jan 2027');
    expect(overridden.find((s) => s.name === 'Resale application submitted')?.date).toBe('18 Jan 2027');
    expect(overridden.find((s) => s.name === 'HDB notifies application acceptance')?.date).toBe('1 Feb 2027');
    expect(overridden.find((s) => s.name === 'Resale completion (estimated)')?.date).toBe('15 Mar 2027');
  });

  it('a partial override only replaces the given fields, defaulting the rest', () => {
    const overridden = getResaleBuyTimelineFromOtp('2027-01-01', { applicationDays: 14 });
    // option period (21 days, default) unaffected
    expect(overridden.find((s) => s.name.startsWith('Option period ends'))?.date).toBe('22 Jan 2027');
    // application pushed out to 14 days after option end instead of the default 7
    expect(overridden.find((s) => s.name === 'Resale application submitted')?.date).toBe('5 Feb 2027');
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
    expect(getBuyTimeline('HDB', 'RESALE', '2027-01-01')).toEqual(getResaleBuyTimelineFromOtp('2027-01-01'));
    expect(getBuyTimeline('HDB', 'BTO', '2027-01-01')).toEqual(getBtoBuyTimelineFromApplication('2027-01-01'));
    expect(getBuyTimeline('PRIVATE', undefined, '2027-01-01')).toEqual(getPrivateResaleBuyTimelineFromOtp('2027-01-01'));
  });

  it('falls back to the undated variant when no anchor is given', () => {
    expect(getBuyTimeline('HDB', 'RESALE')).toEqual(getResaleBuyTimeline());
  });
});

// OTP granted 1 Jan 2027 -> option ends 15 Jan (14 days) -> completion 12 Mar-9 Apr (8-12wks further).
describe('getPrivateResaleBuyTimelineFromOtp', () => {
  const stages = getPrivateResaleBuyTimelineFromOtp('2027-01-01');

  it('uses a 14-day option period, not HDB’s 21', () => {
    const optionStage = stages.find((s) => s.name.startsWith('Option period ends'));
    expect(optionStage?.date).toBe('15 Jan 2027');
  });

  it('has no HDB application/approval stage — just OTP then completion', () => {
    expect(stages.map((s) => s.name)).toEqual([
      'OTP granted',
      'Option period ends (exercise by)',
      'Completion (estimated)',
    ]);
  });

  it('widens completion into a range rather than a false-precision single date', () => {
    const completion = stages.find((s) => s.name === 'Completion (estimated)');
    expect(completion?.date).toBe('12 Mar 2027 – 9 Apr 2027');
  });
});

describe('mergeTimelines', () => {
  it('interleaves two legs in true chronological order and tags each stage', () => {
    const merged = mergeTimelines([
      { tag: 'SELL', stages: getResaleSellTimelineFromOtp('2027-01-01') },
      { tag: 'BUY', stages: getPrivateResaleBuyTimelineFromOtp('2027-01-15') },
    ]);

    // sell's OTP (Jan 1) comes before buy's OTP (Jan 15).
    expect(merged[0].tag).toBe('SELL');
    expect(merged[0].name).toBe('OTP granted to buyer');

    const dated = merged.filter((s) => s.sortKey !== undefined);
    for (let i = 1; i < dated.length; i++) {
      expect(dated[i].sortKey! >= dated[i - 1].sortKey!).toBe(true);
    }
    expect(dated.length).toBe(merged.length); // every stage here has a date
  });

  it('pushes undated stages (e.g. BTO construction) after every dated stage, in original order', () => {
    const merged = mergeTimelines([
      { tag: 'SELL', stages: getResaleSellTimelineFromOtp('2027-01-01') },
      { tag: 'BUY', stages: getBtoBuyTimelineFromApplication('2027-06-01') },
    ]);

    const undated = merged.filter((s) => s.sortKey === undefined);
    const lastDatedIndex = merged.findLastIndex((s) => s.sortKey !== undefined);
    const firstUndatedIndex = merged.findIndex((s) => s.sortKey === undefined);
    expect(firstUndatedIndex).toBeGreaterThan(lastDatedIndex);
    expect(undated.map((s) => s.name)).toEqual([
      'Flat selection appointment',
      'Agreement for Lease & option fee',
      'Construction',
      'Key collection',
    ]);
  });
});

describe('completion-date estimates (for cashflow sequencing, not display)', () => {
  it('resale: OTP + 21 days + 1 + 4 + 8 weeks', () => {
    expect(estimateSellCompletionDate('2027-01-01')).toBe('2027-04-23');
    expect(estimateBuyCompletionDate('HDB', 'RESALE', '2027-01-01')).toBe('2027-04-23');
  });

  it('BTO: uses the midpoint of the sourced 3-5 year construction range', () => {
    expect(estimateBuyCompletionDate('HDB', 'BTO', '2027-01-01')).toBe('2031-01-01');
  });

  it('private resale: uses the latest (most conservative) end of the completion range', () => {
    expect(estimateBuyCompletionDate('PRIVATE', undefined, '2027-01-01')).toBe('2027-04-09');
  });

  it('resale: respects timing overrides for cashflow sequencing, not just display', () => {
    const timing = { otpDays: 14, applicationDays: 3, acceptanceWeeks: 2, completionWeeksAfterAcceptance: 6 };
    expect(estimateBuyCompletionDate('HDB', 'RESALE', '2027-01-01', timing)).toBe('2027-03-15');
    expect(estimateSellCompletionDate('2027-01-01', timing)).toBe('2027-03-15');
  });
});

describe('appendRenovation', () => {
  it('schedules renovation from the day after a known completion date', () => {
    const base = getResaleBuyTimelineFromOtp('2027-01-01');
    const withReno = appendRenovation(base, '2027-04-23', 8);
    expect(withReno.length).toBe(base.length + 2);
    const start = withReno.find((s) => s.name === 'Renovation starts');
    expect(start?.date).toBe('24 Apr 2027');
    const complete = withReno.find((s) => s.name === 'Renovation complete — ready to move in');
    expect(complete?.date).toBe('19 Jun 2027'); // 24 Apr + 8 weeks
  });

  it('falls back to a duration-only stage when there is no completion date to anchor from (e.g. BTO)', () => {
    const base = getBtoBuyTimeline();
    const withReno = appendRenovation(base, undefined, 8);
    const reno = withReno.find((s) => s.name === 'Renovation');
    expect(reno).toBeDefined();
    expect(reno?.date).toBeUndefined();
    expect(reno?.duration).toBe('8 weeks');
  });
});

describe('getBuyTimeline with renovation', () => {
  it('appends renovation stages when a duration is given, and omits them when not', () => {
    const withoutReno = getBuyTimeline('HDB', 'RESALE', '2027-01-01');
    const withReno = getBuyTimeline('HDB', 'RESALE', '2027-01-01', 8);
    expect(withReno.length).toBe(withoutReno.length + 2);
    expect(withReno.some((s) => s.name === 'Renovation starts')).toBe(true);
  });
});
