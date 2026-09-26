'use client';

import { useMemo } from 'react';
import type { HdbSellOnlyInput } from '@/lib/schema/hdbSellOnly';
import { runHdbSellOnly } from '@/lib/calc/hdbSellOnly';
import { Figure } from '@/components/Figure';
import { RuledRow } from '@/components/RuledRow';
import { MicroLabel } from '@/components/MicroLabel';
import { WarningsPanel } from '@/components/WarningsPanel';
import { InkButton } from '@/components/InkButton';
import { Timeline } from '@/components/Timeline';
import { FeeBreakdown } from '@/components/FeeBreakdown';
import { DateField, NumberField } from '@/components/wizard/fields';
import { formatSgd } from '@/lib/format';
import { buildAnonymousDiscussUrl } from '@/lib/whatsapp';
import { getResaleSellTimelineFromOtp, type ResaleTiming } from '@/lib/timeline/hdbTimelines';

export function HdbSellOnlyResults({
  input,
  onEdit,
  onChangeSellOtpDate,
  onChangeOptionPeriodDays,
  onChangeApplicationDays,
  onChangeAcceptanceWeeks,
  onChangeCompletionWeeksAfterAcceptance,
}: {
  input: HdbSellOnlyInput;
  onEdit: () => void;
  onChangeSellOtpDate: (date: string | undefined) => void;
  onChangeOptionPeriodDays: (days: number | undefined) => void;
  onChangeApplicationDays: (days: number | undefined) => void;
  onChangeAcceptanceWeeks: (weeks: number | undefined) => void;
  onChangeCompletionWeeksAfterAcceptance: (weeks: number | undefined) => void;
}) {
  const result = useMemo(() => runHdbSellOnly(input), [input]);
  const { sell, cashMandatorilyAppliedToLoan, minCashSellerKeeps, warnings } = result;

  const timing: ResaleTiming = {
    otpDays: input.optionPeriodDays,
    applicationDays: input.applicationDays,
    acceptanceWeeks: input.acceptanceWeeks,
    completionWeeksAfterAcceptance: input.completionWeeksAfterAcceptance,
  };
  const stages = getResaleSellTimelineFromOtp(input.sellOtpGrantedDate, timing);

  const summary = [
    `sell ${input.sellFlatType} at ${formatSgd(input.sellPrice)}`,
    `net cash proceeds ${formatSgd(sell.netCashProceeds)}`,
  ].join(' · ');

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-10">
      <div>
        <MicroLabel>hdb sell only — results</MicroLabel>
        <h1 className="font-display text-2xl mt-1">selling your {input.sellFlatType}</h1>
      </div>

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
      </section>

      {input.planningNextPurchase && input.nextFlatDestination === 'HDB' && input.nextLoanType === 'HDB' && (
        <section className="border-t border-rule pt-8 dark:border-white/10">
          <MicroLabel>next purchase — minimum cash proceeds (preview)</MicroLabel>
          <p className="mt-2 text-sm text-ink/70 dark:text-dark-ink/70">
            No loan is sized here — for that, use the HDB sell &amp; buy scenario instead. This previews HDB&apos;s
            own rule: buying another HDB flat with a second HDB loan requires applying part of your cash sale
            proceeds to reduce that new loan.
          </p>
          <div className="mt-4">
            <RuledRow label="you can keep (greater of $25,000 or 50%)" value={minCashSellerKeeps} />
            <RuledRow label="mandatorily applied to your next loan" value={cashMandatorilyAppliedToLoan} />
          </div>
        </section>
      )}

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <MicroLabel>process timeline — selling</MicroLabel>
        </div>

        <div className="mt-4 flex flex-wrap gap-6">
          <div className="w-36">
            <DateField label="OTP granted to buyer" value={input.sellOtpGrantedDate} onChange={onChangeSellOtpDate} />
          </div>
        </div>
        <p className="mt-1 text-xs text-ink/50 dark:text-dark-ink/50">
          adjust this to re-estimate the timeline below.
        </p>

        <details className="mt-3">
          <summary className="cursor-pointer list-none text-xs underline text-ink/50 hover:text-ink dark:text-dark-ink/50 dark:hover:text-dark-ink [&::-webkit-details-marker]:hidden">
            edit process timing
          </summary>
          <p className="mt-2 text-xs text-ink/50 dark:text-dark-ink/50">
            In reality a buyer may exercise well before the full option period runs out, or
            submit earlier/later than the typical week after exercise — override any of these to
            match what&apos;s actually happening (or expected) instead of the textbook durations.
          </p>
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

        <div className="mt-6">
          <Timeline stages={stages} />
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
