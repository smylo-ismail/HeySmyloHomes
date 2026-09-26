'use client';

import { useMemo } from 'react';
import type { FirstTimerHdbBuyInput } from '@/lib/schema/firstTimerHdbBuy';
import { runFirstTimerHdbBuy } from '@/lib/calc/firstTimerHdbBuy';
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
import { getBuyTimeline, type ResaleTiming } from '@/lib/timeline/hdbTimelines';

export function FirstTimerHdbBuyResults({
  input,
  onEdit,
  onChangeAnchorDate,
  onChangeRenovationWeeks,
  onChangeOptionPeriodDays,
  onChangeApplicationDays,
  onChangeAcceptanceWeeks,
  onChangeCompletionWeeksAfterAcceptance,
}: {
  input: FirstTimerHdbBuyInput;
  onEdit: () => void;
  onChangeAnchorDate: (date: string | undefined) => void;
  onChangeRenovationWeeks: (weeks: number | undefined) => void;
  onChangeOptionPeriodDays: (days: number | undefined) => void;
  onChangeApplicationDays: (days: number | undefined) => void;
  onChangeAcceptanceWeeks: (weeks: number | undefined) => void;
  onChangeCompletionWeeksAfterAcceptance: (weeks: number | undefined) => void;
}) {
  const result = useMemo(() => runFirstTimerHdbBuy(input), [input]);
  const { grants, bsd, absd, loan, cpf, fees, totalCashRequired } = result;

  // A mandatory minimum-cash floor (bank loans only, 0 for HDB) still applies even when CPF
  // fully covers the rest — see loan.ts's cpfEligibleUpfrontCosts comment for why this can't
  // just be cpf.cashTopUp on its own.
  const effectiveCashTopUp = Math.max(cpf.cashTopUp, loan.minCashRequired);

  const timing: ResaleTiming = {
    otpDays: input.optionPeriodDays,
    applicationDays: input.applicationDays,
    acceptanceWeeks: input.acceptanceWeeks,
    completionWeeksAfterAcceptance: input.completionWeeksAfterAcceptance,
  };

  const allWarnings = [...grants.warnings, ...loan.warnings];

  if (grants.ineligibilityReasons.length > 0 && grants.total === 0) {
    // still show duty/loan figures below — grant ineligibility doesn't block the rest of the calc
  }

  const summary = [
    `${input.flatSource} ${input.flatType} at ${formatSgd(input.price)}`,
    `grants ${formatSgd(grants.total)}`,
    `loan ${formatSgd(loan.loanGranted)} (${loan.bindingConstraint}-bound)`,
    `cash required ${formatSgd(totalCashRequired)}`,
  ].join(' · ');

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-10">
      <div>
        <MicroLabel>first-timer hdb buy — results</MicroLabel>
        <h1 className="font-display text-2xl mt-1">
          {input.flatSource === 'BTO' ? 'BTO' : 'Resale'} {input.flatType} · {formatSgd(input.price)}
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
        <Figure label="grants total — credited to CPF OA" value={grants.total} />
        <div className="mt-4">
          <RuledRow label="CHG (CPF Housing Grant)" value={grants.chg} />
          <RuledRow label="EHG (Enhanced Housing Grant)" value={grants.ehg} />
          <RuledRow label="PHG (Proximity Housing Grant)" value={grants.phg} />
        </div>
      </section>

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
        <div className="mt-4">
          <Figure label="est. cash required" value={totalCashRequired} size="md" />
        </div>
      </section>

      <section>
        <MicroLabel>process timeline — {input.flatSource === 'BTO' ? 'bto' : 'resale'}</MicroLabel>
        <div className="mt-3 flex flex-wrap gap-6">
          <div className="w-36">
            <DateField
              label={input.flatSource === 'BTO' ? 'application date' : 'OTP granted date'}
              value={input.timelineAnchorDate}
              onChange={onChangeAnchorDate}
            />
          </div>
          <div className="w-36">
            <NumberField
              label="renovation (weeks) — optional"
              value={input.expectedRenovationWeeks}
              onChange={onChangeRenovationWeeks}
              placeholder="not renovating? leave blank"
            />
          </div>
        </div>
        {input.flatSource === 'RESALE' && (
          <details className="mt-3">
            <summary className="cursor-pointer list-none text-xs underline text-ink/50 hover:text-ink dark:text-dark-ink/50 dark:hover:text-dark-ink [&::-webkit-details-marker]:hidden">
              edit process timing
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
        <div className="mt-4">
          <Timeline
            stages={getBuyTimeline('HDB', input.flatSource, input.timelineAnchorDate, input.expectedRenovationWeeks, timing)}
          />
        </div>
        <p className="mt-2 text-xs text-ink/50 dark:text-dark-ink/50">
          {input.timelineAnchorDate
            ? 'dates are estimated from HDB’s typical processing ranges — actual timing depends on your application.'
            : 'durations are HDB’s typical ranges, not fixed dates — add a date above to see estimated calendar dates.'}
        </p>
      </section>

      {input.flatSource === 'RESALE' && (
        <section>
          <MicroLabel>payment milestones</MicroLabel>
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

      <WarningsPanel warnings={allWarnings} />

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
