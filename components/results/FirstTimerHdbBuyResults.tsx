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
import { formatSgd } from '@/lib/format';
import { buildAnonymousDiscussUrl } from '@/lib/whatsapp';
import { getBuyTimeline } from '@/lib/timeline/hdbBuyTimeline';

export function FirstTimerHdbBuyResults({
  input,
  onEdit,
}: {
  input: FirstTimerHdbBuyInput;
  onEdit: () => void;
}) {
  const result = useMemo(() => runFirstTimerHdbBuy(input), [input]);
  const { grants, bsd, absd, loan, cpf, fees, totalCashRequired } = result;

  const allWarnings = [...grants.warnings, ...loan.warnings, ...cpf.warnings];

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
          <RuledRow
            label="CHG"
            value={grants.chg}
            breakdown={
              <p>
                Conservation/Citizen&apos;s Housing Grant, based on flat type, family/single
                tier, and household income against the CHG income ceiling and lease-length gate.
              </p>
            }
          />
          <RuledRow
            label="EHG"
            value={grants.ehg}
            breakdown={
              <p>
                Enhanced Housing Grant, looked up from the official HDB income-band table at
                ${input.avgMonthlyHouseholdIncome.toLocaleString()}/month household income.
              </p>
            }
          />
          <RuledRow
            label="PHG"
            value={grants.phg}
            breakdown={<p>Proximity Housing Grant, based on proximity to parents/children.</p>}
          />
        </div>
      </section>

      <section>
        <MicroLabel>stamp duties</MicroLabel>
        <div className="mt-2">
          <RuledRow
            label="BSD"
            value={bsd}
            breakdown={<p>Buyer&apos;s Stamp Duty, banded on the higher of price/valuation.</p>}
          />
          <RuledRow
            label="ABSD"
            value={absd.absd}
            breakdown={
              <p>
                {absd.remissionApplied
                  ? absd.note
                  : `Rated at ${(absd.rate * 100).toFixed(0)}% for this buyer profile.`}
              </p>
            }
          />
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
          <RuledRow label="min cash required" value={loan.minCashRequired} />
          <RuledRow label="cpf needed (down + duties)" value={cpf.cpfNeeded} />
          <RuledRow label="cash top-up" value={cpf.cashTopUp} />
          <RuledRow label="upfront fees (option, legal, valuation, commission)" value={fees.totalUpfrontCash} />
        </div>
        <div className="mt-4">
          <Figure label="est. cash required" value={totalCashRequired} size="md" />
        </div>
      </section>

      <section>
        <MicroLabel>process timeline — {input.flatSource === 'BTO' ? 'bto' : 'resale'}</MicroLabel>
        <div className="mt-2">
          <Timeline stages={getBuyTimeline(input.flatSource)} />
        </div>
        <p className="mt-2 text-xs text-ink/50 dark:text-dark-ink/50">
          durations are HDB&apos;s typical ranges, not fixed dates — actual timing depends on your
          application and the market.
        </p>
      </section>

      <WarningsPanel warnings={allWarnings} />

      <footer className="space-y-4 border-t border-rule pt-6 text-sm text-ink/60 dark:border-white/10 dark:text-dark-ink/60">
        <p>estimates only — your HFE letter is the confirmed answer.</p>
        <div className="flex flex-wrap gap-3">
          <InkButton onClick={onEdit} variant="secondary">
            edit inputs
          </InkButton>
          <a href={buildAnonymousDiscussUrl(summary)} target="_blank" rel="noopener noreferrer">
            <InkButton>discuss this with smylo</InkButton>
          </a>
        </div>
        <p className="text-xs">sign in to save this scenario so smylo can see the details.</p>
      </footer>
    </div>
  );
}
