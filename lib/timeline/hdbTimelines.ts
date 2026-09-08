import { addDays, addWeeks, addYears, format, parseISO } from 'date-fns';
import { RATES } from '@/config/rates';
import type { FlatSource } from '@/lib/calc/grants';

export interface TimelineStage {
  name: string;
  duration: string;
  description: string;
  /** Computed calendar date (or range), formatted for display — only set when an anchor date was given. */
  date?: string;
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
        'Fixed by law: the option period runs from when the seller grants the OTP, including weekends and public holidays.',
    },
    {
      name: 'Resale application & valuation',
      duration: weeksRangeLabel(t.applicationAndValuationWeeks),
      description: 'You and the seller submit the resale application; HDB arranges the flat valuation.',
    },
    {
      name: 'HDB approval',
      duration: weeksRangeLabel(t.hdbApprovalWeeks),
      description: 'HDB processes the application, including any grant and loan approvals.',
    },
    {
      name: 'Resale completion',
      duration: '—',
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
  const t = RATES.timeline.hdbResaleSell;
  return [
    {
      name: 'Register Intent to Sell',
      duration: `${t.intentToSellCoolingDays}-day cooling-off`,
      description: 'You can only grant an Option to Purchase to a buyer after this cooling-off period.',
    },
    {
      name: 'Find a buyer & grant OTP',
      duration: 'varies',
      description: 'No fixed duration — depends on the market and your asking price.',
    },
    {
      name: 'Buyer exercises Option to Purchase (OTP)',
      duration: `${t.otpDays} days`,
      description:
        'Fixed by law: the option period runs from when you grant the OTP, including weekends and public holidays.',
    },
    {
      name: 'Resale application & valuation',
      duration: weeksRangeLabel(t.applicationAndValuationWeeks),
      description: 'You and the buyer submit the resale application; HDB arranges the flat valuation.',
    },
    {
      name: 'HDB approval',
      duration: weeksRangeLabel(t.hdbApprovalWeeks),
      description: 'HDB processes the application, including any of the buyer’s grant and loan approvals.',
    },
    {
      name: 'Resale completion',
      duration: '—',
      description: 'Final payment received and keys handed over.',
    },
  ];
}

interface ResaleOtpLabels {
  otpName: string;
  otpDescription: string;
  optionEndDescription: string;
  applicationDescription: string;
  approvalDescription: string;
  completionName: string;
  completionDescription: string;
}

/** Shared date math for a resale timeline anchored on the date an OTP was/will be granted —
 *  the option period is legally fixed (exact date), everything after it widens into a range
 *  since HDB's own application/approval windows are themselves ranges, not fixed durations. */
function buildResaleTimelineFromOtp(otpDate: string, labels: ResaleOtpLabels): TimelineStage[] {
  const t = RATES.timeline.hdbResaleBuy; // same application/approval windows for buy and sell sides
  const otp = parseISO(otpDate);
  const optionEnd = addDays(otp, t.otpDays);
  const appMin = addWeeks(optionEnd, t.applicationAndValuationWeeks[0]);
  const appMax = addWeeks(optionEnd, t.applicationAndValuationWeeks[1]);
  const approvalMin = addWeeks(appMin, t.hdbApprovalWeeks[0]);
  const approvalMax = addWeeks(appMax, t.hdbApprovalWeeks[1]);

  return [
    { name: labels.otpName, duration: fmt(otp), date: fmt(otp), description: labels.otpDescription },
    {
      name: 'Option period ends (exercise by)',
      duration: `${t.otpDays} days after OTP`,
      date: fmt(optionEnd),
      description: labels.optionEndDescription,
    },
    {
      name: 'Resale application & valuation',
      duration: weeksRangeLabel(t.applicationAndValuationWeeks),
      date: dateRangeLabel(appMin, appMax),
      description: labels.applicationDescription,
    },
    {
      name: 'HDB approval',
      duration: weeksRangeLabel(t.hdbApprovalWeeks),
      date: dateRangeLabel(approvalMin, approvalMax),
      description: labels.approvalDescription,
    },
    {
      name: labels.completionName,
      duration: '—',
      date: dateRangeLabel(approvalMin, approvalMax),
      description: labels.completionDescription,
    },
  ];
}

export function getResaleBuyTimelineFromOtp(otpDate: string): TimelineStage[] {
  return buildResaleTimelineFromOtp(otpDate, {
    otpName: 'OTP granted',
    otpDescription: 'The date the seller granted you the Option to Purchase.',
    optionEndDescription:
      'Fixed by law — 21 calendar days from grant, including weekends and public holidays. Exercise the option by this date.',
    applicationDescription: 'You and the seller submit the resale application; HDB arranges the flat valuation.',
    approvalDescription: 'HDB processes the application, including any grant and loan approvals.',
    completionName: 'Resale completion (estimated)',
    completionDescription: 'Final payment and handover of keys.',
  });
}

export function getResaleSellTimelineFromOtp(otpDate: string): TimelineStage[] {
  return buildResaleTimelineFromOtp(otpDate, {
    otpName: 'OTP granted to buyer',
    otpDescription: 'The date you granted your buyer the Option to Purchase.',
    optionEndDescription:
      'Fixed by law — 21 calendar days from grant, including weekends and public holidays. Your buyer must exercise by this date.',
    applicationDescription: 'You and the buyer submit the resale application; HDB arranges the flat valuation.',
    approvalDescription: 'HDB processes the application, including any of the buyer’s grant and loan approvals.',
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
      ? { ...stage, date: fmt(application) }
      : stage.name === 'Ballot result'
        ? { ...stage, date: dateRangeLabel(ballotMin, ballotMax) }
        : stage
  );
}

export function getBuyTimeline(flatSource: FlatSource, anchorDate?: string): TimelineStage[] {
  if (anchorDate) {
    return flatSource === 'BTO' ? getBtoBuyTimelineFromApplication(anchorDate) : getResaleBuyTimelineFromOtp(anchorDate);
  }
  return flatSource === 'BTO' ? getBtoBuyTimeline() : getResaleBuyTimeline();
}

/** Conservative (latest-estimate) completion date, for feeding into cashflow sequencing —
 *  not for display; use the timeline functions above for the user-facing range. */
export function estimateBuyCompletionDate(flatSource: FlatSource, anchorDate: string): string {
  const anchor = parseISO(anchorDate);
  if (flatSource === 'BTO') {
    // No reliable sourced figure links application date to key collection directly; the
    // construction-years midpoint is the best defensible estimate for this long a horizon.
    const t = RATES.timeline.hdbBto;
    const midpointYears = (t.constructionYears[0] + t.constructionYears[1]) / 2;
    return addYears(anchor, midpointYears).toISOString().slice(0, 10);
  }
  const t = RATES.timeline.hdbResaleBuy;
  const optionEnd = addDays(anchor, t.otpDays);
  const appMax = addWeeks(optionEnd, t.applicationAndValuationWeeks[1]);
  const approvalMax = addWeeks(appMax, t.hdbApprovalWeeks[1]);
  return approvalMax.toISOString().slice(0, 10);
}

export function estimateSellCompletionDate(otpDate: string): string {
  const t = RATES.timeline.hdbResaleBuy;
  const otp = parseISO(otpDate);
  const optionEnd = addDays(otp, t.otpDays);
  const appMax = addWeeks(optionEnd, t.applicationAndValuationWeeks[1]);
  const approvalMax = addWeeks(appMax, t.hdbApprovalWeeks[1]);
  return approvalMax.toISOString().slice(0, 10);
}
