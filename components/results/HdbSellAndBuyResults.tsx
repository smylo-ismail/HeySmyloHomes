'use client';

import { useMemo, useState } from 'react';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { HdbSellAndBuyInput } from '@/lib/schema/hdbSellAndBuy';
import { runHdbSellAndBuy } from '@/lib/calc/hdbSellAndBuy';
import { Figure } from '@/components/Figure';
import { RuledRow } from '@/components/RuledRow';
import { MicroLabel } from '@/components/MicroLabel';
import { WarningsPanel } from '@/components/WarningsPanel';
import { InkButton } from '@/components/InkButton';
import { Timeline } from '@/components/Timeline';
import { formatSgd } from '@/lib/format';
import { buildAnonymousDiscussUrl } from '@/lib/whatsapp';
import { getBuyTimeline, getResaleSellTimelineFromOtp, mergeTimelines } from '@/lib/timeline/hdbTimelines';

/** ROUGH DRAFT — not wired to replace anything, just for visual review. Two bars scaled to a
 *  shared date axis so "which finishes first, and by how much" reads in one glance, without
 *  parsing the detailed stage list below. */
function OverviewBars({
  sellLabel,
  sellStart,
  sellEnd,
  buyLabel,
  buyStart,
  buyEnd,
}: {
  sellLabel: string;
  sellStart: string;
  sellEnd: string;
  buyLabel: string;
  buyStart: string;
  buyEnd: string;
}) {
  const dates = [sellStart, sellEnd, buyStart, buyEnd].map((d) => parseISO(d));
  const axisStart = new Date(Math.min(...dates.map((d) => d.getTime())));
  const axisEnd = new Date(Math.max(...dates.map((d) => d.getTime())));
  const totalDays = differenceInCalendarDays(axisEnd, axisStart) || 1;

  const pct = (d: string) => (differenceInCalendarDays(parseISO(d), axisStart) / totalDays) * 100;
  const fmtShort = (d: string) => format(parseISO(d), 'd MMM');

  const rows = [
    { label: sellLabel, start: sellStart, end: sellEnd, filled: true },
    { label: buyLabel, start: buyStart, end: buyEnd, filled: false },
  ];

  return (
    <div className="space-y-5 rounded border border-rule p-4 dark:border-white/10">
      {rows.map((row) => {
        const startPct = pct(row.start);
        const endPct = pct(row.end);
        return (
          <div key={row.label}>
            <div className="micro-label text-ink/50 dark:text-dark-ink/50">{row.label}</div>
            <div className="relative mt-2 h-1.5 rounded-full bg-rule dark:bg-white/10">
              <div
                className={
                  row.filled
                    ? 'absolute inset-y-0 rounded-full bg-ink dark:bg-dark-ink'
                    : 'absolute inset-y-0 rounded-full border border-ink bg-bg dark:border-dark-ink dark:bg-dark-bg'
                }
                style={{ left: `${startPct}%`, width: `${Math.max(endPct - startPct, 2)}%` }}
              />
            </div>
            <div className="relative mt-1 h-4 text-[11px]">
              <span className="figure absolute text-ink/50 dark:text-dark-ink/50" style={{ left: `${startPct}%` }}>
                {fmtShort(row.start)}
              </span>
              <span
                className="figure absolute -translate-x-full text-ink/50 dark:text-dark-ink/50"
                style={{ left: `${endPct}%` }}
              >
                {fmtShort(row.end)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HdbSellAndBuyResults({
  input,
  onEdit,
}: {
  input: HdbSellAndBuyInput;
  onEdit: () => void;
}) {
  // Which side (left/right) each leg renders on in the two-column layout at sm: and up — purely
  // a presentation choice for whoever's narrating this to a client, so it's local UI state, not
  // part of the scenario input.
  const [sidesReversed, setSidesReversed] = useState(false);

  const result = useMemo(() => runHdbSellAndBuy(input), [input]);
  const {
    sell,
    grants,
    bsd,
    absd,
    loan,
    cpf,
    fees,
    cashflow,
    totalCashRequired,
    estimatedSellCompletionDate,
    estimatedBuyCompletionDate,
    warnings,
  } = result;

  const sellsFirst = estimatedSellCompletionDate <= estimatedBuyCompletionDate;

  // A private buy has no flatSource/flatType (resale-only, see hdbTimelines.ts) — everything
  // display-facing that used to read those HDB-only fields branches on flatDestination first.
  const buyKindLabel =
    input.flatDestination === 'PRIVATE' ? 'private resale' : input.flatSource === 'BTO' ? 'BTO' : 'resale';
  const buyHeadingLabel = input.flatDestination === 'PRIVATE' ? 'private resale property' : `${input.flatType} ${buyKindLabel}`;

  const summary = [
    `sell ${input.sellFlatType} at ${formatSgd(input.sellPrice)}`,
    `buy ${buyHeadingLabel} at ${formatSgd(input.price)}`,
    `grants ${formatSgd(grants.total)}`,
    `loan ${formatSgd(loan.loanGranted)} (${loan.bindingConstraint}-bound)`,
    `cash required ${formatSgd(totalCashRequired)}`,
  ].join(' · ');

  // One chronologically-interleaved timeline rather than two separate lists — the point of a
  // sell + buy scenario is seeing how the two processes actually overlap in calendar time.
  const combinedStages = mergeTimelines([
    { tag: `selling your ${input.sellFlatType}`, stages: getResaleSellTimelineFromOtp(input.sellOtpGrantedDate) },
    { tag: `buying your ${buyKindLabel}`, stages: getBuyTimeline(input.flatDestination, input.flatSource, input.buyAnchorDate) },
  ]);

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-10">
      <div>
        <MicroLabel>hdb sell &amp; buy — results</MicroLabel>
        <h1 className="font-display text-2xl mt-1">
          {input.sellFlatType} → {input.flatDestination === 'PRIVATE' ? 'Private resale' : `${input.flatSource === 'BTO' ? 'BTO' : 'Resale'} ${input.flatType}`}
        </h1>
      </div>

      {grants.ineligibilityReasons.length > 0 && (
        <div className="border border-warn/40 bg-warn/5 p-4 rounded text-sm space-y-1">
          {grants.ineligibilityReasons.map((r) => (
            <div key={r}>{r}</div>
          ))}
        </div>
      )}

      <section>
        <Figure label="net cash proceeds from sale" value={sell.netCashProceeds} />
        <div className="mt-4">
          <RuledRow label="sale price" value={sell.salePrice} />
          <RuledRow label="outstanding loan redeemed" value={sell.outstandingLoanRedeemed} />
          <RuledRow label="CPF refund (principal + accrued interest)" value={sell.cpfRefund.totalRefund} />
          <RuledRow label="resale levy" value={sell.resaleLevy.levy} />
          <RuledRow label="selling fees (conveyancing + commission)" value={sell.sellFees.conveyancing + sell.sellFees.commission} />
        </div>
      </section>

      {input.flatDestination === 'HDB' && (
        <section>
          <Figure label="grants total — credited to CPF OA" value={grants.total} />
          <div className="mt-4">
            <RuledRow label="CHG (CPF Housing Grant)" value={grants.chg} />
            <RuledRow label="EHG (Enhanced Housing Grant)" value={grants.ehg} />
            <RuledRow label="PHG (Proximity Housing Grant)" value={grants.phg} />
          </div>
        </section>
      )}

      <section>
        <MicroLabel>stamp duties</MicroLabel>
        <div className="mt-2">
          <RuledRow label="BSD (Buyer's Stamp Duty)" value={bsd} />
          <RuledRow label="ABSD (Additional Buyer's Stamp Duty)" value={absd.absd} />
        </div>
      </section>

      <section>
        <Figure label={`loan granted — ${loan.bindingConstraint}-bound`} value={loan.loanGranted} />
        <div className="mt-4">
          <RuledRow label="max loan — LTV" value={loan.maxLoanLtv} />
          {loan.maxLoanMsr !== undefined && <RuledRow label="max loan — MSR" value={loan.maxLoanMsr} />}
          {loan.maxLoanTdsr !== undefined && <RuledRow label="max loan — TDSR" value={loan.maxLoanTdsr} />}
          {loan.actualMonthlyPayment !== undefined && (
            <RuledRow label="actual monthly payment" value={loan.actualMonthlyPayment} />
          )}
        </div>
      </section>

      <section>
        <MicroLabel>cash &amp; cpf required</MicroLabel>
        <div className="mt-2">
          <RuledRow label="downpayment" value={loan.downpayment} />
          <RuledRow label="cpf needed (down + duties)" value={cpf.cpfNeeded} />
          <RuledRow label="cpf available (balance + refund + grants)" value={cpf.cpfAvailable} />
          <RuledRow label="upfront fees (option, legal, valuation, commission)" value={fees.totalUpfrontCash} />
        </div>
        {cashflow.bridgingNeeded && (
          <p className="mt-2 text-sm text-accent">
            bridging needed: {formatSgd(cashflow.bridgingAmount)} for ~{cashflow.bridgingWeeks} weeks
            {input.flatSource === 'BTO' ? ' — the HDB Contra Facility may reduce or remove this.' : '.'}
          </p>
        )}
        <div className="mt-4">
          <Figure label="est. cash required" value={totalCashRequired} size="md" />
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <MicroLabel>process timeline — selling &amp; buying</MicroLabel>
          <button
            type="button"
            onClick={() => setSidesReversed((r) => !r)}
            className="hidden text-xs underline text-ink/50 hover:text-ink dark:text-dark-ink/50 dark:hover:text-dark-ink sm:inline"
          >
            swap sides
          </button>
        </div>
        <p className="mt-1 text-xs text-ink/50 dark:text-dark-ink/50">
          {sellsFirst
            ? 'your sale is on track to complete before your purchase.'
            : 'your purchase is on track to complete before your sale — see the warnings below.'}
          {' '}
          <span className="hidden sm:inline">
            {sidesReversed ? '○ selling · ● buying' : '● selling · ○ buying'}
          </span>
        </p>

        <div className="mt-4">
          <OverviewBars
            sellLabel={`selling your ${input.sellFlatType}`}
            sellStart={input.sellOtpGrantedDate}
            sellEnd={estimatedSellCompletionDate}
            buyLabel={`buying your ${buyKindLabel}`}
            buyStart={input.buyAnchorDate}
            buyEnd={estimatedBuyCompletionDate}
          />
        </div>

        <div className="mt-6">
          <Timeline stages={combinedStages} reversed={sidesReversed} />
        </div>
      </section>

      <WarningsPanel warnings={warnings} />

      <footer className="space-y-4 border-t border-rule pt-6 text-sm text-ink/60 dark:border-white/10 dark:text-dark-ink/60">
        <div className="flex flex-wrap gap-3">
          <InkButton onClick={onEdit} variant="secondary">
            edit inputs
          </InkButton>
          <a href={buildAnonymousDiscussUrl(summary)} target="_blank" rel="noopener noreferrer">
            <InkButton>discuss this with smylo</InkButton>
          </a>
        </div>
        <p className="text-xs">sign in to save this scenario.</p>
      </footer>
    </div>
  );
}
