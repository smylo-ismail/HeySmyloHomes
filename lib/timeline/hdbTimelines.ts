import { addDays, addWeeks, addYears, format, parseISO } from 'date-fns';
import { RATES } from '@/config/rates';
import type { FlatSource } from '@/lib/calc/grants';

export interface TimelineStage {
  name: string;
  duration: string;
  description: string;
  /** Computed calendar date (or range), formatted for display — only set when an anchor date was given. */
  date?: string;
  /** ISO date (yyyy-MM-dd), the start of this stage — only set alongside `date`. Exists purely
   *  for mergeTimelines below to interleave two legs' stages in true chronological order; not
   *  itself rendered. */
  sortKey?: string;
  /** Which leg of a combined (sell + buy) timeline this stage belongs to — set by
   *  mergeTimelines, not by the single-leg builders above. */
  tag?: string;
  /** Index into the `legs` array passed to mergeTimelines (0 or 1) — lets the Timeline
   *  component give each leg a distinct dot style/side without string-matching `tag`. */
  legIndex?: 0 | 1;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Interleaves two already-built leg timelines into one chronological sequence, tagging each
 *  stage with which leg it came from — the client-facing view of a sell + buy scenario, showing
 *  how the two processes actually overlap in calendar time rather than as two disconnected
 *  lists. Stages without a computed date (e.g. BTO's construction/key-collection, which stay
 *  duration-only — see getBtoBuyTimelineFromApplication) sort after every dated stage, in their
 *  original relative order, since there's no real date to interleave them by. */
export function mergeTimelines(
  legs: { tag: string; stages: TimelineStage[] }[]
): TimelineStage[] {
  const tagged = legs.flatMap(({ tag, stages }, legIndex) =>
    stages.map((s) => ({ ...s, tag, legIndex: legIndex as 0 | 1 }))
  );
  return tagged
    .map((stage, i) => ({ stage, i })) // stable sort: preserve original order among equal/missing keys
    .sort((a, b) => {
      if (a.stage.sortKey === undefined && b.stage.sortKey === undefined) return a.i - b.i;
      if (a.stage.sortKey === undefined) return 1;
      if (b.stage.sortKey === undefined) return -1;
      return a.stage.sortKey.localeCompare(b.stage.sortKey) || a.i - b.i;
    })
    .map(({ stage }) => stage);
}

function weeksRangeLabel([min, max]: readonly [number, number]): string {
  return min === max ? `${min} weeks` : `${min}-${max} weeks`;
}

function fmt(d: Date): string {
  return format(d, 'd MMM yyyy');
}

function dateRangeLabel(min: Date, max: Date): string {
  return min.getTime() === max.getTime() ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
}

export function getResaleBuyTimeline(): TimelineStage[] {
  const t = RATES.timeline.hdbResaleBuy;
  return [
    {
      name: 'HFE letter',
      duration: `~${t.hfeWeeks} weeks`,
      description:
        'Confirms your eligibility, HDB loan quantum, and CPF housing grants before you start flat-hunting.',
    },
    {
      name: 'Find a flat',
      duration: 'varies',
      description: 'No fixed duration — depends on the market and your search.',
    },
    {
      name: 'Grant & exercise Option to Purchase (OTP)',
      duration: `${t.otpDays} days`,
      description:
        'Fixed by law: the option period runs from when the seller grants the OTP ($1,000 option fee), including weekends and public holidays, to when you exercise it ($4,000 exercise fee). You can commission the flat valuation in parallel — typically $120, 7-14 working days.',
    },
    {
      name: 'Resale application submitted',
      duration: weeksRangeLabel([t.applicationWeeks, t.applicationWeeks]),
      description: 'You and the seller submit the resale application to HDB, typically within about a week of exercising.',
    },
    {
      name: 'HDB notifies application acceptance',
      duration: weeksRangeLabel([t.acceptanceWeeks, t.acceptanceWeeks]),
      description: 'HDB reviews and accepts the application, sets your final appointment date, and both parties log in to acknowledge the required documents.',
    },
    {
      name: 'Resale completion',
      duration: weeksRangeLabel([t.completionWeeksAfterAcceptance, t.completionWeeksAfterAcceptance]),
      description: 'Final payment and handover of keys.',
    },
  ];
}

export function getBtoBuyTimeline(): TimelineStage[] {
  const t = RATES.timeline.hdbBto;
  return [
    {
      name: 'Launch & application',
      duration: 'week 1',
      description: 'HDB opens the sales exercise on the HDB Flat Portal ($10 non-refundable application fee).',
    },
    {
      name: 'Ballot result',
      duration: weeksRangeLabel(t.ballotResultWeeks),
      description: 'HDB runs the ballot, applies priority schemes, and issues queue numbers.',
    },
    {
      name: 'Flat selection appointment',
      duration: 'varies by queue',
      description: 'Scheduled by queue order — you choose your specific unit.',
    },
    {
      name: 'Agreement for Lease & option fee',
      duration: weeksRangeLabel(t.leaseAgreementWeeks),
      description: 'Sign the lease agreement and pay the option fee.',
    },
    {
      name: 'Construction',
      duration: `${t.constructionYears[0]}-${t.constructionYears[1]} years total`,
      description:
        'Standard flats typically take 3-5 years from application to key collection; shorter for some Plus/Prime sites already under construction.',
    },
    {
      name: 'Key collection',
      duration: `within ${t.keyCollectionMonthsAfterBooking} months of booking`,
      description:
        'Sign the Agreement for Lease and collect your keys (completed flats); otherwise at construction completion.',
    },
  ];
}

export function getResaleSellTimeline(): TimelineStage[] {
  const sell = RATES.timeline.hdbResaleSell;
  // Application/acceptance/completion timing is shared with the buy side — read directly from
  // hdbResaleBuy rather than duplicating it here (a duplicate copy could drift out of sync).
  const t = RATES.timeline.hdbResaleBuy;
  return [
    {
      name: 'Register Intent to Sell',
      duration: `${sell.intentToSellCoolingDays}-day cooling-off`,
      description: 'You can only grant an Option to Purchase to a buyer after this cooling-off period.',
    },
    {
      name: 'Find a buyer & grant OTP',
      duration: 'varies',
      description: 'No fixed duration — depends on the market and your asking price.',
    },
    {
      name: 'Buyer exercises Option to Purchase (OTP)',
      duration: `${sell.otpDays} days`,
      description:
        'Fixed by law: the option period runs from when you grant the OTP ($1,000 option fee received), including weekends and public holidays, to when your buyer exercises it ($4,000 exercise fee).',
    },
    {
      name: 'Resale application submitted',
      duration: weeksRangeLabel([t.applicationWeeks, t.applicationWeeks]),
      description: 'You and your buyer submit the resale application to HDB, typically within about a week of exercising.',
    },
    {
      name: 'HDB notifies application acceptance',
      duration: weeksRangeLabel([t.acceptanceWeeks, t.acceptanceWeeks]),
      description: 'HDB reviews and accepts the application, including any of the buyer’s grant and loan approvals.',
    },
    {
      name: 'Resale completion',
      duration: weeksRangeLabel([t.completionWeeksAfterAcceptance, t.completionWeeksAfterAcceptance]),
      description: 'Final payment received and keys handed over.',
    },
  ];
}

interface ResaleOtpLabels {
  otpName: string;
  otpDescription: string;
  optionEndDescription: string;
  applicationDescription: string;
  acceptanceDescription: string;
  completionName: string;
  completionDescription: string;
}

/** Shared date math for a resale timeline anchored on the date an OTP was/will be granted. Every
 *  stage after the option period is a single-figure gap (not a range) — see
 *  config/rates.ts's hdbResaleBuy comment for why these replaced the previous blended
 *  application/approval ranges. */
function buildResaleTimelineFromOtp(otpDate: string, labels: ResaleOtpLabels): TimelineStage[] {
  const t = RATES.timeline.hdbResaleBuy; // same timing for buy and sell sides
  const otp = parseISO(otpDate);
  const optionEnd = addDays(otp, t.otpDays);
  const applicationDate = addWeeks(optionEnd, t.applicationWeeks);
  const acceptanceDate = addWeeks(applicationDate, t.acceptanceWeeks);
  const completionDate = addWeeks(acceptanceDate, t.completionWeeksAfterAcceptance);

  return [
    { name: labels.otpName, duration: fmt(otp), date: fmt(otp), sortKey: iso(otp), description: labels.otpDescription },
    {
      name: 'Option period ends (exercise by)',
      duration: `${t.otpDays} days after OTP`,
      date: fmt(optionEnd),
      sortKey: iso(optionEnd),
      description: labels.optionEndDescription,
    },
    {
      name: 'Resale application submitted',
      duration: weeksRangeLabel([t.applicationWeeks, t.applicationWeeks]),
      date: fmt(applicationDate),
      sortKey: iso(applicationDate),
      description: labels.applicationDescription,
    },
    {
      name: 'HDB notifies application acceptance',
      duration: weeksRangeLabel([t.acceptanceWeeks, t.acceptanceWeeks]),
      date: fmt(acceptanceDate),
      sortKey: iso(acceptanceDate),
      description: labels.acceptanceDescription,
    },
    {
      name: labels.completionName,
      duration: weeksRangeLabel([t.completionWeeksAfterAcceptance, t.completionWeeksAfterAcceptance]),
      date: fmt(completionDate),
      sortKey: iso(completionDate),
      description: labels.completionDescription,
    },
  ];
}

export function getResaleBuyTimelineFromOtp(otpDate: string): TimelineStage[] {
  return buildResaleTimelineFromOtp(otpDate, {
    otpName: 'OTP granted',
    otpDescription:
      'The date the seller granted you the Option to Purchase ($1,000 option fee). You can commission the flat valuation in parallel — typically $120, 7-14 working days.',
    optionEndDescription: 'Fixed by law — 21 calendar days from grant, including weekends and public holidays. Exercise by this date ($4,000 exercise fee).',
    applicationDescription: 'You and the seller submit the resale application to HDB, typically within about a week of exercising.',
    acceptanceDescription: 'HDB reviews and accepts the application, sets your final appointment date, and both parties log in to acknowledge the required documents.',
    completionName: 'Resale completion (estimated)',
    completionDescription: 'Final payment and handover of keys.',
  });
}

export function getResaleSellTimelineFromOtp(otpDate: string): TimelineStage[] {
  return buildResaleTimelineFromOtp(otpDate, {
    otpName: 'OTP granted to buyer',
    otpDescription: 'The date you granted your buyer the Option to Purchase ($1,000 option fee received). Your buyer can commission a valuation report in parallel.',
    optionEndDescription: 'Fixed by law — 21 calendar days from grant, including weekends and public holidays. Your buyer must exercise by this date ($4,000 exercise fee).',
    applicationDescription: 'You and your buyer submit the resale application to HDB, typically within about a week of exercising.',
    acceptanceDescription: 'HDB reviews and accepts the application, including any of the buyer’s grant and loan approvals.',
    completionName: 'Resale completion (estimated)',
    completionDescription: 'Final payment received and keys handed over.',
  });
}

/** Only the ballot-result window is reliably derivable from the application date — everything
 *  from flat selection onward depends on an unsourced, queue-dependent gap, so it stays
 *  duration-only rather than chaining a fabricated date through an unknown interval. */
export function getBtoBuyTimelineFromApplication(applicationDate: string): TimelineStage[] {
  const t = RATES.timeline.hdbBto;
  const application = parseISO(applicationDate);
  const ballotMin = addWeeks(application, t.ballotResultWeeks[0]);
  const ballotMax = addWeeks(application, t.ballotResultWeeks[1]);

  const stages = getBtoBuyTimeline();
  return stages.map((stage) =>
    stage.name === 'Launch & application'
      ? { ...stage, date: fmt(application), sortKey: iso(application) }
      : stage.name === 'Ballot result'
        ? { ...stage, date: dateRangeLabel(ballotMin, ballotMax), sortKey: iso(ballotMin) }
        : stage
  );
}

export function getPrivateResaleBuyTimeline(): TimelineStage[] {
  const t = RATES.timeline.privateResaleBuy;
  return [
    {
      name: 'In-principle loan approval (IPA)',
      duration: weeksRangeLabel(t.ipaWeeks),
      description: 'Typically sought before house-hunting so you know your borrowing limit — not statutory.',
    },
    {
      name: 'Find a unit',
      duration: 'varies',
      description: 'No fixed duration — depends on the market and your search.',
    },
    {
      name: 'Grant & exercise Option to Purchase (OTP)',
      duration: `${t.otpDays} days`,
      description: 'Customary private resale option period — not legally fixed the way HDB’s 21 days is.',
    },
    {
      name: 'Completion',
      duration: weeksRangeLabel(t.completionWeeks),
      description: 'Conveyancing and loan disbursement after the option is exercised.',
    },
  ];
}

/** Same date-math shape as buildResaleTimelineFromOtp, but for a private resale purchase — no
 *  HDB application/approval stage, and completion is a single stage (not approval + separate
 *  completion) since there's no HDB processing step in between. */
export function getPrivateResaleBuyTimelineFromOtp(otpDate: string): TimelineStage[] {
  const t = RATES.timeline.privateResaleBuy;
  const otp = parseISO(otpDate);
  const optionEnd = addDays(otp, t.otpDays);
  const completionMin = addWeeks(optionEnd, t.completionWeeks[0]);
  const completionMax = addWeeks(optionEnd, t.completionWeeks[1]);

  return [
    {
      name: 'OTP granted',
      duration: fmt(otp),
      date: fmt(otp),
      sortKey: iso(otp),
      description: 'The date the seller granted you the Option to Purchase.',
    },
    {
      name: 'Option period ends (exercise by)',
      duration: `${t.otpDays} days after OTP`,
      date: fmt(optionEnd),
      sortKey: iso(optionEnd),
      description: 'Customary private resale option period — exercise by this date.',
    },
    {
      name: 'Completion (estimated)',
      duration: weeksRangeLabel(t.completionWeeks),
      date: dateRangeLabel(completionMin, completionMax),
      sortKey: iso(completionMin),
      description: 'Final payment and handover of keys.',
    },
  ];
}

/** Appends renovation stages after a buy leg's timeline, if the buyer supplied an expected
 *  duration — optional, since not everyone renovates and the actual scope/timing is entirely
 *  case-specific (contractor availability, permit processing, extent of works). When a concrete
 *  completion date exists (resale/private), renovation is scheduled from the day after it; a BTO
 *  timeline never carries a display completion date (see getBtoBuyTimelineFromApplication), so
 *  renovation there stays duration-only rather than chaining a date off a fabricated estimate. */
export function appendRenovation(
  stages: TimelineStage[],
  completionDateIso: string | undefined,
  renovationWeeks: number
): TimelineStage[] {
  if (completionDateIso) {
    const start = addDays(parseISO(completionDateIso), 1);
    const end = addWeeks(start, renovationWeeks);
    return [
      ...stages,
      {
        name: 'Renovation starts',
        duration: fmt(start),
        date: fmt(start),
        sortKey: iso(start),
        description: 'Permits and works begin the day after completion.',
      },
      {
        name: 'Renovation complete — ready to move in',
        duration: weeksRangeLabel([renovationWeeks, renovationWeeks]),
        date: fmt(end),
        sortKey: iso(end),
        description: 'Estimated renovation duration — actual timing depends on scope of works, HDB permit processing, and contractor availability.',
      },
    ];
  }
  return [
    ...stages,
    {
      name: 'Renovation',
      duration: weeksRangeLabel([renovationWeeks, renovationWeeks]),
      description: 'Estimated renovation duration after key collection — actual timing depends on scope of works, HDB permit processing, and contractor availability.',
    },
  ];
}

export type FlatDestination = 'HDB' | 'PRIVATE';

export function getBuyTimeline(
  destination: FlatDestination,
  flatSource: FlatSource | undefined,
  anchorDate?: string,
  renovationWeeks?: number
): TimelineStage[] {
  let stages: TimelineStage[];
  // BTO's display timeline never carries a completion date (only ballot result is dated — see
  // getBtoBuyTimelineFromApplication), so renovation there always stays duration-only even
  // though estimateBuyCompletionDate can produce a (cashflow-only) fabricated midpoint for it.
  let completionDateIso: string | undefined;

  if (destination === 'PRIVATE') {
    stages = anchorDate ? getPrivateResaleBuyTimelineFromOtp(anchorDate) : getPrivateResaleBuyTimeline();
    completionDateIso = anchorDate ? estimateBuyCompletionDate(destination, flatSource, anchorDate) : undefined;
  } else if (flatSource === 'BTO') {
    stages = anchorDate ? getBtoBuyTimelineFromApplication(anchorDate) : getBtoBuyTimeline();
    completionDateIso = undefined;
  } else {
    stages = anchorDate ? getResaleBuyTimelineFromOtp(anchorDate) : getResaleBuyTimeline();
    completionDateIso = anchorDate ? estimateBuyCompletionDate(destination, flatSource, anchorDate) : undefined;
  }

  return renovationWeeks ? appendRenovation(stages, completionDateIso, renovationWeeks) : stages;
}

/** Conservative (latest-estimate) completion date, for feeding into cashflow sequencing —
 *  not for display; use the timeline functions above for the user-facing range. */
export function estimateBuyCompletionDate(
  destination: FlatDestination,
  flatSource: FlatSource | undefined,
  anchorDate: string
): string {
  const anchor = parseISO(anchorDate);
  if (destination === 'PRIVATE') {
    const t = RATES.timeline.privateResaleBuy;
    const optionEnd = addDays(anchor, t.otpDays);
    const completionMax = addWeeks(optionEnd, t.completionWeeks[1]);
    return completionMax.toISOString().slice(0, 10);
  }
  if (flatSource === 'BTO') {
    // No reliable sourced figure links application date to key collection directly; the
    // construction-years midpoint is the best defensible estimate for this long a horizon.
    const t = RATES.timeline.hdbBto;
    const midpointYears = (t.constructionYears[0] + t.constructionYears[1]) / 2;
    return addYears(anchor, midpointYears).toISOString().slice(0, 10);
  }
  const t = RATES.timeline.hdbResaleBuy;
  const optionEnd = addDays(anchor, t.otpDays);
  const applicationDate = addWeeks(optionEnd, t.applicationWeeks);
  const acceptanceDate = addWeeks(applicationDate, t.acceptanceWeeks);
  const completionDate = addWeeks(acceptanceDate, t.completionWeeksAfterAcceptance);
  return completionDate.toISOString().slice(0, 10);
}

export function estimateSellCompletionDate(otpDate: string): string {
  const t = RATES.timeline.hdbResaleBuy;
  const otp = parseISO(otpDate);
  const optionEnd = addDays(otp, t.otpDays);
  const applicationDate = addWeeks(optionEnd, t.applicationWeeks);
  const acceptanceDate = addWeeks(applicationDate, t.acceptanceWeeks);
  const completionDate = addWeeks(acceptanceDate, t.completionWeeksAfterAcceptance);
  return completionDate.toISOString().slice(0, 10);
}
