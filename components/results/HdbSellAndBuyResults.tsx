'use client';

import { useMemo } from 'react';
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
import { getBuyTimeline, getResaleSellTimelineFromOtp } from '@/lib/timeline/hdbTimelines';

export function HdbSellAndBuyResults({
  input,
  onEdit,
}: {
  input: HdbSellAndBuyInput;
  onEdit: () => void;
}) {
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

  const summary = [
    `sell ${input.sellFlatType} at ${formatSgd(input.sellPrice)}`,
    `buy ${input.flatSource} ${input.flatType} at ${formatSgd(input.price)}`,
    `grants ${formatSgd(grants.total)}`,
    `loan ${formatSgd(loan.loanGranted)} (${loan.bindingConstraint}-bound)`,
    `cash required ${formatSgd(totalCashRequired)}`,
  ].join(' · ');

  const sellTimelineSection = (
    <section key="sell-timeline">
      <MicroLabel>process timeline — selling your {input.sellFlatType}</MicroLabel>
      <div className="mt-2">
        <Timeline stages={getResaleSellTimelineFromOtp(input.sellOtpGrantedDate)} />
      </div>
    </section>
  );

  const buyTimelineSection = (
    <section key="buy-timeline">
      <MicroLabel>process timeline — buying your {input.flatSource === 'BTO' ? 'BTO' : 'resale'}</MicroLabel>
      <div className="mt-2">
        <Timeline stages={getBuyTimeline(input.flatSource, input.buyAnchorDate)} />
      </div>
    </section>
  );

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-10">
      <div>
        <MicroLabel>hdb sell &amp; buy — results</MicroLabel>
        <h1 className="font-display text-2xl mt-1">
          {input.sellFlatType} → {input.flatSource === 'BTO' ? 'BTO' : 'Resale'} {input.flatType}
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

      {sellsFirst ? [sellTimelineSection, buyTimelineSection] : [buyTimelineSection, sellTimelineSection]}

      <WarningsPanel warnings={warnings} />

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
