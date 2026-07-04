import { differenceInCalendarDays, parseISO } from 'date-fns';

export type CashflowDirection = 'IN' | 'OUT';

export interface CashflowEvent {
  date: string; // ISO date
  label: string;
  /** Signed: positive = inflow, negative = outflow. */
  cash: number;
  cpf: number;
  direction: CashflowDirection;
}

export interface CashflowPoint extends CashflowEvent {
  runningCash: number;
  runningCpf: number;
}

export interface CashflowResult {
  timeline: CashflowPoint[];
  bridgingNeeded: boolean;
  bridgingAmount: number;
  bridgingWeeks: number;
  warnings: string[];
}

export interface CashflowOptions {
  /** HDB→HDB concurrent transactions can use the contra facility; only affects the banner copy here — actual date-shifting of sale proceeds belongs to the caller's event construction. */
  contraFacilityAvailable?: boolean;
}

/**
 * Merges buy + sell events into one dated stream, sorted by date, with running
 * cash/CPF balances. Any negative-cash window raises a bridging banner with the
 * gap amount and its duration in weeks.
 */
export function computeCashflow(events: CashflowEvent[], options?: CashflowOptions): CashflowResult {
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));

  let runningCash = 0;
  let runningCpf = 0;
  const timeline: CashflowPoint[] = sorted.map((event) => {
    runningCash += event.cash;
    runningCpf += event.cpf;
    return { ...event, runningCash, runningCpf };
  });

  let minCash = 0;
  let minCashIndex = -1;
  timeline.forEach((point, i) => {
    if (point.runningCash < minCash) {
      minCash = point.runningCash;
      minCashIndex = i;
    }
  });

  const bridgingNeeded = minCash < 0;
  const bridgingAmount = Math.abs(Math.min(minCash, 0));
  let bridgingWeeks = 0;

  if (bridgingNeeded) {
    const dipDate = parseISO(timeline[minCashIndex].date);
    const recovery = timeline.slice(minCashIndex).find((p) => p.runningCash >= 0);
    if (recovery) {
      bridgingWeeks = Math.max(1, Math.round(differenceInCalendarDays(parseISO(recovery.date), dipDate) / 7));
    }
  }

  const warnings: string[] = [];
  if (bridgingNeeded) {
    const contraNote = options?.contraFacilityAvailable
      ? ' — HDB→HDB contra facility may reduce or remove this gap.'
      : '';
    warnings.push(
      `bridging needed: $${Math.round(bridgingAmount).toLocaleString()} for ~${bridgingWeeks} weeks${contraNote}`
    );
  }

  return { timeline, bridgingNeeded, bridgingAmount, bridgingWeeks, warnings };
}
