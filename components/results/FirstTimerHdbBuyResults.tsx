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
import { getBuyTimeline } from '@/lib/timeline/hdbTimelines';

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
          <Timeline stages={getBuyTimeline(input.flatSource, input.timelineAnchorDate)} />
        </div>
        <p className="mt-2 text-xs text-ink/50 dark:text-dark-ink/50">
          {input.timelineAnchorDate
            ? 'dates are estimated from HDB’s typical processing ranges — actual timing depends on your application and the market.'
            : 'durations are HDB’s typical ranges, not fixed dates — add a date above to see estimated calendar dates.'}
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
