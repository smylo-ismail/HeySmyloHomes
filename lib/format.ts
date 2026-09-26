import { format, parseISO } from 'date-fns';
import type { BindingConstraint } from '@/lib/calc/loan';

const currencyFormatter = new Intl.NumberFormat('en-SG', {
  style: 'currency',
  currency: 'SGD',
  maximumFractionDigits: 0,
});

/** Rounds once, at display. Never round mid-calculation. */
export function formatSgd(amount: number): string {
  return currencyFormatter.format(Math.round(amount));
}

export function formatYesNo(value: boolean | undefined): string {
  if (value === undefined) return '—';
  return value ? 'yes' : 'no';
}

/** ISO date -> "15 Jan 2027", for review-step display. */
export function formatDateReadable(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'd MMM yyyy');
  } catch {
    return iso;
  }
}

/** "loan granted — X" suffix. FUNDS means the loan was sized to what's actually needed after
 *  CPF/grants, not capped by an LTV/MSR/TDSR eligibility ceiling — see loan.ts. */
export function formatBindingConstraint(constraint: BindingConstraint): string {
  return constraint === 'FUNDS' ? 'sized to need, below your eligible max' : `${constraint}-bound`;
}
