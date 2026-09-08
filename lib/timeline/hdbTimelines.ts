import { RATES } from '@/config/rates';
import type { FlatSource } from '@/lib/calc/grants';

export interface TimelineStage {
  name: string;
  duration: string;
  description: string;
}

function weeksRangeLabel([min, max]: readonly [number, number]): string {
  return min === max ? `${min} weeks` : `${min}-${max} weeks`;
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

export function getBuyTimeline(flatSource: FlatSource): TimelineStage[] {
  return flatSource === 'BTO' ? getBtoBuyTimeline() : getResaleBuyTimeline();
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
