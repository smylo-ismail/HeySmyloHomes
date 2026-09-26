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
import { FundingBreakdown } from '@/components/FundingBreakdown';
import { FeeBreakdown } from '@/components/FeeBreakdown';
import { PaymentMilestones } from '@/components/PaymentMilestones';
import { DateField, NumberField } from '@/components/wizard/fields';
import { formatSgd, formatBindingConstraint } from '@/lib/format';
import { buildAnonymousDiscussUrl } from '@/lib/whatsapp';
import { getBuyTimeline, getResaleSellTimelineFromOtp, mergeTimelines, type ResaleTiming } from '@/lib/timeline/hdbTimelines';

/** A group-level heading — one notch heavier than the MicroLabels used for subsections within
 *  it, so "which numbers belong to selling vs. buying" reads as an unmissable visual grouping
 *  rather than something you have to infer from context. */
function GroupHeading({ children, divider = false }: { children: React.ReactNode; divider?: boolean }) {
  return (
    <h2
      className={
        divider
          ? 'font-display text-xl border-t border-rule pt-8 dark:border-white/10'
          : 'font-display text-xl'
      }
    >
      {children}
    </h2>
  );
}

/** Two bars scaled to a shared date axis so "which finishes first, and by how much" reads in
 *  one glance, without parsing the detailed stage list below (which stays, for anyone who wants
 *  the stage-by-stage specifics). */
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
  onChangeSellOtpDate,
  onChangeBuyAnchorDate,
  onChangeRenovationWeeks,
  onChangeOptionPeriodDays,
  onChangeApplicationDays,
  onChangeAcceptanceWeeks,
  onChangeCompletionWeeksAfterAcceptance,
  onChangeSellOptionPeriodDays,
  onChangeSellApplicationDays,
  onChangeSellAcceptanceWeeks,
  onChangeSellCompletionWeeksAfterAcceptance,
}: {
  input: HdbSellAndBuyInput;
  onEdit: () => void;
  onChangeSellOtpDate: (date: string | undefined) => void;
  onChangeBuyAnchorDate: (date: string | undefined) => void;
  onChangeRenovationWeeks: (weeks: number | undefined) => void;
  onChangeOptionPeriodDays: (days: number | undefined) => void;
  onChangeApplicationDays: (days: number | undefined) => void;
  onChangeAcceptanceWeeks: (weeks: number | undefined) => void;
  onChangeCompletionWeeksAfterAcceptance: (weeks: number | undefined) => void;
  onChangeSellOptionPeriodDays: (days: number | undefined) => void;
  onChangeSellApplicationDays: (days: number | undefined) => void;
  onChangeSellAcceptanceWeeks: (weeks: number | undefined) => void;
  onChangeSellCompletionWeeksAfterAcceptance: (weeks: number | undefined) => void;
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
    cashMandatorilyAppliedToLoan,
    minCashSellerKeeps,
    estimatedSellCompletionDate,
    estimatedBuyCompletionDate,
    warnings,
  } = result;

  const sellsFirst = estimatedSellCompletionDate <= estimatedBuyCompletionDate;

  // A mandatory minimum-cash floor (bank loans only, 0 for HDB) still applies even when CPF
  // fully covers the rest — see loan.ts's cpfEligibleUpfrontCosts comment for why this can't
  // just be cpf.cashTopUp on its own.
  const effectiveCashTopUp = Math.max(cpf.cashTopUp, loan.minCashRequired);

  const buyTiming: ResaleTiming = {
    otpDays: input.optionPeriodDays,
    applicationDays: input.applicationDays,
    acceptanceWeeks: input.acceptanceWeeks,
    completionWeeksAfterAcceptance: input.completionWeeksAfterAcceptance,
  };
  const sellTiming: ResaleTiming = {
    otpDays: input.sellOptionPeriodDays,
    applicationDays: input.sellApplicationDays,
    acceptanceWeeks: input.sellAcceptanceWeeks,
    completionWeeksAfterAcceptance: input.sellCompletionWeeksAfterAcceptance,
  };

  // A private buy has no flatSource/flatType (resale-only, see hdbTimelines.ts) — everything
  // display-facing that used to read those HDB-only fields branches on flatDestination first.
  const buyKindLabel =
    input.flatDestination === 'PRIVATE' ? 'private resale' : input.flatSource === 'BTO' ? 'BTO' : 'resale';
  const buyHeadingLabel = input.flatDestination === 'PRIVATE' ? 'private resale property' : `${input.flatType} ${buyKindLabel}`;

  const summary = [
    `sell ${input.sellFlatType} at ${formatSgd(input.sellPrice)}`,
    `buy ${buyHeadingLabel} at ${formatSgd(input.price)}`,
    `grants ${formatSgd(grants.total)}`,
    `loan ${formatSgd(loan.loanGranted)} (${formatBindingConstraint(loan.bindingConstraint)})`,
    `cash required ${formatSgd(totalCashRequired)}`,
  ].join(' · ');

  // One chronologically-interleaved timeline rather than two separate lists — the point of a
  // sell + buy scenario is seeing how the two processes actually overlap in calendar time.
  const combinedStages = mergeTimelines([
    { tag: `selling your ${input.sellFlatType}`, stages: getResaleSellTimelineFromOtp(input.sellOtpGrantedDate, sellTiming) },
    {
      tag: `buying your ${buyKindLabel}`,
      stages: getBuyTimeline(input.flatDestination, input.flatSource, input.buyAnchorDate, input.expectedRenovationWeeks, buyTiming),
    },
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

      <GroupHeading>selling your {input.sellFlatType}</GroupHeading>

      <section>
        <Figure label="net cash proceeds from sale" value={sell.netCashProceeds} />
        <div className="mt-4">
          <RuledRow label="sale price" value={sell.salePrice} />
          <RuledRow label="outstanding loan redeemed" value={sell.outstandingLoanRedeemed} />
          <RuledRow label="CPF refund (principal + accrued interest)" value={sell.cpfRefund.totalRefund} />
          {input.sellers.length > 1 && (
            <FeeBreakdown
              rows={sell.cpfRefundBySeller.map((r, i) => ({ label: `seller ${i + 1}`, value: r.totalRefund }))}
            />
          )}
          <RuledRow label="resale levy" value={sell.resaleLevy.levy} />
          {sell.upgradingLevy > 0 && <RuledRow label="upgrading levy" value={sell.upgradingLevy} />}
          {sell.outstandingUpgradingCost > 0 && (
            <RuledRow label="outstanding upgrading costs" value={sell.outstandingUpgradingCost} />
          )}
          <RuledRow label="selling fees (conveyancing + commission)" value={sell.sellFees.conveyancing + sell.sellFees.commission} />
          <FeeBreakdown
            rows={[
              { label: 'conveyancing', value: sell.sellFees.conveyancing },
              { label: 'agent commission', value: sell.sellFees.commission },
            ]}
          />
        </div>
        {input.sellers.length > 1 && (
          <div className="mt-4">
            <MicroLabel>net proceeds by seller ({input.mannerOfHolding === 'TENANCY_IN_COMMON' ? 'tenancy-in-common' : 'joint tenancy — equal split'})</MicroLabel>
            <div className="mt-2">
              {sell.proceedsBySeller.map((p, i) => (
                <RuledRow key={i} label={`seller ${i + 1} (${Math.round(p.share * 100)}%)`} value={p.amount} />
              ))}
            </div>
          </div>
        )}
        {cashMandatorilyAppliedToLoan > 0 && (
          <p className="mt-2 text-xs text-ink/50 dark:text-dark-ink/50">
            HDB requires applying part of these proceeds to your next loan (see below) — you can keep{' '}
            {formatSgd(minCashSellerKeeps)}, the greater of $25,000 or 50% of cash proceeds; the remaining{' '}
            {formatSgd(cashMandatorilyAppliedToLoan)} reduces the loan for your next purchase.
          </p>
        )}
      </section>

      <GroupHeading divider>buying your {buyHeadingLabel}</GroupHeading>

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
        <Figure label={`loan granted — ${formatBindingConstraint(loan.bindingConstraint)}`} value={loan.loanGranted} />
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
        <div className="mt-3">
          <FundingBreakdown
            price={input.price}
            loanGranted={loan.loanGranted}
            cpfNeeded={cpf.cpfNeeded}
            cashTopUp={effectiveCashTopUp}
          />
        </div>
        <div className="mt-4">
          <RuledRow label="downpayment" value={loan.downpayment} />
          <RuledRow label="min cash required" value={loan.minCashRequired} />
          <RuledRow label="cpf needed (down + duties + conveyancing)" value={cpf.cpfNeeded} />
          <RuledRow label="cpf available (balance + refund + grants)" value={cpf.cpfAvailable} />
          <RuledRow label="cash top-up" value={effectiveCashTopUp} />
          <RuledRow label="upfront fees (option, legal, valuation, commission)" value={fees.totalUpfrontCash} />
          <FeeBreakdown
            rows={[
              { label: 'conveyancing', value: fees.conveyancing },
              { label: 'valuation', value: fees.valuation },
              { label: 'agent commission', value: fees.commission },
              { label: 'option fee (initial)', value: fees.optionMoneyInitial },
              { label: 'option fee (exercise)', value: fees.optionMoneyExercise },
            ]}
          />
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

        <div className="mt-4 flex flex-wrap gap-6">
          <div className="w-36">
            <DateField label="OTP granted to buyer" value={input.sellOtpGrantedDate} onChange={onChangeSellOtpDate} />
          </div>
          <div className="w-36">
            <DateField
              label={input.flatDestination === 'HDB' && input.flatSource === 'BTO' ? 'application date' : 'OTP granted date'}
              value={input.buyAnchorDate}
              onChange={onChangeBuyAnchorDate}
            />
          </div>
          <div className="w-36">
            <NumberField
              label="renovation (weeks)"
              value={input.expectedRenovationWeeks}
              onChange={onChangeRenovationWeeks}
              placeholder="not renovating? leave blank"
            />
          </div>
        </div>
        <p className="mt-1 text-xs text-ink/50 dark:text-dark-ink/50">
          adjust any of these to re-estimate the timeline below.
        </p>

        {input.flatDestination === 'HDB' && input.flatSource === 'RESALE' && (
          <details className="mt-3">
            <summary className="cursor-pointer list-none text-xs underline text-ink/50 hover:text-ink dark:text-dark-ink/50 dark:hover:text-dark-ink [&::-webkit-details-marker]:hidden">
              edit process timing (buy leg)
            </summary>
            <div className="mt-3 flex flex-wrap gap-6">
              <div className="w-36">
                <NumberField label="option period (days)" value={input.optionPeriodDays} onChange={onChangeOptionPeriodDays} placeholder="21" />
              </div>
              <div className="w-36">
                <NumberField label="application (days after exercise)" value={input.applicationDays} onChange={onChangeApplicationDays} placeholder="7" />
              </div>
              <div className="w-36">
                <NumberField label="acceptance (weeks after application)" value={input.acceptanceWeeks} onChange={onChangeAcceptanceWeeks} placeholder="4" />
              </div>
              <div className="w-36">
                <NumberField label="completion (weeks after acceptance)" value={input.completionWeeksAfterAcceptance} onChange={onChangeCompletionWeeksAfterAcceptance} placeholder="8" />
              </div>
            </div>
          </details>
        )}

        <details className="mt-3">
          <summary className="cursor-pointer list-none text-xs underline text-ink/50 hover:text-ink dark:text-dark-ink/50 dark:hover:text-dark-ink [&::-webkit-details-marker]:hidden">
            edit process timing (sell leg)
          </summary>
          <div className="mt-3 flex flex-wrap gap-6">
            <div className="w-36">
              <NumberField label="option period (days)" value={input.sellOptionPeriodDays} onChange={onChangeSellOptionPeriodDays} placeholder="21" />
            </div>
            <div className="w-36">
              <NumberField label="application (days after exercise)" value={input.sellApplicationDays} onChange={onChangeSellApplicationDays} placeholder="7" />
            </div>
            <div className="w-36">
              <NumberField label="acceptance (weeks after application)" value={input.sellAcceptanceWeeks} onChange={onChangeSellAcceptanceWeeks} placeholder="4" />
            </div>
            <div className="w-36">
              <NumberField label="completion (weeks after acceptance)" value={input.sellCompletionWeeksAfterAcceptance} onChange={onChangeSellCompletionWeeksAfterAcceptance} placeholder="8" />
            </div>
          </div>
        </details>

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

      {(input.flatDestination === 'PRIVATE' || input.flatSource === 'RESALE') && (
        <section>
          <MicroLabel>payment milestones — buying your {buyKindLabel}</MicroLabel>
          <div className="mt-3">
            <PaymentMilestones
              groups={[
                {
                  heading: 'option & exercise fee',
                  rows: [
                    { label: 'paid to seller', cash: fees.optionMoneyInitial + fees.optionMoneyExercise, total: fees.optionMoneyInitial + fees.optionMoneyExercise },
                  ],
                },
                {
                  heading: 'upon completion',
                  rows: [
                    {
                      label: 'valuation & agent commission (cash only)',
                      cash: fees.valuation + fees.commission,
                      total: fees.valuation + fees.commission,
                    },
                    {
                      label: 'balance purchase price, stamp duty & conveyancing',
                      cpf: input.price + bsd + absd.absd + fees.conveyancing - loan.loanGranted - effectiveCashTopUp,
                      cash: effectiveCashTopUp,
                      loan: loan.loanGranted,
                      total: input.price + bsd + absd.absd + fees.conveyancing,
                    },
                  ],
                },
              ]}
            />
          </div>
        </section>
      )}

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
