'use client';

import { useState } from 'react';
import { useLocalDraft } from '@/lib/hooks/useLocalDraft';
import { EMPTY_SELL_AND_BUY_DRAFT, type HdbSellAndBuyDraft } from '@/lib/schema/hdbSellAndBuyDraft';
import { hdbSellAndBuySchema } from '@/lib/schema/hdbSellAndBuy';
import { NumberField, ChoiceField, BoolField, DateField } from './fields';
import { InkButton } from '@/components/InkButton';
import { MicroLabel } from '@/components/MicroLabel';
import { HdbSellAndBuyResults } from '@/components/results/HdbSellAndBuyResults';

const STORAGE_KEY = 'smylo:draft:hdb-sell-and-buy';

const TOTAL_STEPS = 7;

const FLAT_TYPE_OPTIONS = [
  { value: '2R' as const, label: '2-room' },
  { value: '3R' as const, label: '3-room' },
  { value: '4R' as const, label: '4-room' },
  { value: '5R' as const, label: '5-room' },
  { value: 'EXEC' as const, label: 'executive' },
  { value: '3GEN' as const, label: '3gen' },
];

export function HdbSellAndBuyWizard() {
  const [draft, setDraft] = useLocalDraft<HdbSellAndBuyDraft>(STORAGE_KEY, EMPTY_SELL_AND_BUY_DRAFT);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = (fields: HdbSellAndBuyDraft) => setDraft({ ...draft, ...fields });

  if (submitted) {
    const parsed = hdbSellAndBuySchema.safeParse(draft);
    if (parsed.success) {
      return <HdbSellAndBuyResults input={parsed.data} onEdit={() => setSubmitted(false)} />;
    }
    setSubmitted(false);
  }

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const trySubmit = () => {
    const parsed = hdbSellAndBuySchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check your inputs.');
      return;
    }
    setError(null);
    setSubmitted(true);
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <MicroLabel>
        step {step + 1} of {TOTAL_STEPS}
      </MicroLabel>

      <div className="mt-6 space-y-6">
        {step === 0 && (
          <>
            <h2 className="font-display text-xl">the flat you&apos;re selling</h2>
            <ChoiceField
              label="flat type"
              value={draft.sellFlatType}
              onChange={(v) => patch({ sellFlatType: v })}
              options={FLAT_TYPE_OPTIONS}
            />
            <NumberField
              label="expected sale price"
              value={draft.sellPrice}
              onChange={(v) => patch({ sellPrice: v })}
              placeholder="550000"
            />
            <NumberField
              label="outstanding loan balance"
              value={draft.outstandingLoanBalance}
              onChange={(v) => patch({ outstandingLoanBalance: v })}
              placeholder="100000"
            />
            <NumberField
              label="CPF principal used on this flat"
              value={draft.cpfPrincipalUsed}
              onChange={(v) => patch({ cpfPrincipalUsed: v })}
              placeholder="150000"
            />
            <NumberField
              label="years since that CPF was used"
              value={draft.cpfUsageYears}
              onChange={(v) => patch({ cpfUsageYears: v })}
              placeholder="5"
            />
            <DateField
              label="expected sale completion date"
              value={draft.expectedSellCompletionDate}
              onChange={(v) => patch({ expectedSellCompletionDate: v })}
            />
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="font-display text-xl">who&apos;s buying</h2>
            <ChoiceField
              label="application type"
              value={draft.applicationType}
              onChange={(v) => patch({ applicationType: v })}
              options={[
                { value: 'FAMILY', label: 'family' },
                { value: 'SINGLE', label: 'single' },
                { value: 'JOINT_SINGLES', label: 'joint singles' },
                { value: 'NON_RESIDENT_SPOUSE', label: 'non-resident spouse' },
              ]}
            />
            <ChoiceField
              label="citizenship"
              value={draft.citizenshipMix}
              onChange={(v) => patch({ citizenshipMix: v })}
              options={[
                { value: 'SC_SC', label: 'SC + SC' },
                { value: 'SC_SPR', label: 'SC + SPR' },
                { value: 'SC_ONLY', label: 'SC (single)' },
              ]}
            />
            <NumberField
              label="buyer 1 age"
              value={draft.buyerAges?.[0]}
              onChange={(v) =>
                patch({ buyerAges: [v ?? 0, draft.buyerAges?.[1] ?? undefined].filter((x): x is number => x !== undefined) })
              }
            />
            <NumberField
              label="buyer 2 age (optional)"
              value={draft.buyerAges?.[1]}
              onChange={(v) =>
                patch({ buyerAges: [draft.buyerAges?.[0] ?? 0, v].filter((x): x is number => x !== undefined) })
              }
            />
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-display text-xl">household income</h2>
            <NumberField
              label="avg. monthly household income"
              value={draft.avgMonthlyHouseholdIncome}
              onChange={(v) => patch({ avgMonthlyHouseholdIncome: v })}
              placeholder="9000"
            />
            <BoolField
              label="continuously employed the last 12 months?"
              value={draft.employedContinuously12Months}
              onChange={(v) => patch({ employedContinuously12Months: v })}
            />
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="font-display text-xl">the flat you&apos;re buying</h2>
            <ChoiceField
              label="source"
              value={draft.flatSource}
              onChange={(v) => patch({ flatSource: v })}
              options={[
                { value: 'BTO', label: 'BTO' },
                { value: 'RESALE', label: 'resale' },
              ]}
            />
            <ChoiceField label="flat type" value={draft.flatType} onChange={(v) => patch({ flatType: v })} options={FLAT_TYPE_OPTIONS} />
            <NumberField label="price" value={draft.price} onChange={(v) => patch({ price: v })} placeholder="600000" />
            <NumberField
              label="valuation"
              value={draft.valuation}
              onChange={(v) => patch({ valuation: v })}
              placeholder="same as price if unsure"
            />
            {draft.flatSource === 'RESALE' && (
              <>
                <NumberField
                  label="remaining lease (years)"
                  value={draft.remainingLeaseYears}
                  onChange={(v) => patch({ remainingLeaseYears: v })}
                  placeholder="70"
                />
                <ChoiceField
                  label="proximity to parents/children"
                  value={draft.proximity}
                  onChange={(v) => patch({ proximity: v })}
                  options={[
                    { value: 'WITH_PARENTS_OR_CHILD', label: 'living with' },
                    { value: 'WITHIN_4KM', label: 'within 4km' },
                    { value: 'NONE', label: 'none' },
                  ]}
                />
              </>
            )}
            <DateField
              label="expected purchase completion date"
              value={draft.expectedBuyCompletionDate}
              onChange={(v) => patch({ expectedBuyCompletionDate: v })}
            />
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="font-display text-xl">property history</h2>
            <BoolField
              label="owned or disposed of a private property within the last 30 months?"
              value={draft.ownsOrDisposedPrivateWithin30Months}
              onChange={(v) => patch({ ownsOrDisposedPrivateWithin30Months: v })}
            />
          </>
        )}

        {step === 5 && (
          <>
            <h2 className="font-display text-xl">the loan</h2>
            <ChoiceField
              label="loan type"
              value={draft.loanType}
              onChange={(v) => patch({ loanType: v })}
              options={[
                { value: 'HDB', label: 'HDB loan' },
                { value: 'BANK', label: 'bank loan' },
              ]}
            />
            <NumberField label="tenure (years)" value={draft.tenureYears} onChange={(v) => patch({ tenureYears: v })} placeholder="20" />
            <NumberField
              label="additional CPF OA balance (beyond the flat you're selling)"
              value={draft.additionalCpfOaBalance}
              onChange={(v) => patch({ additionalCpfOaBalance: v })}
              placeholder="0"
            />
            {draft.loanType === 'BANK' && (
              <NumberField
                label="existing monthly debt (optional)"
                value={draft.existingMonthlyDebt}
                onChange={(v) => patch({ existingMonthlyDebt: v })}
                placeholder="700"
              />
            )}
          </>
        )}

        {step === 6 && (
          <>
            <h2 className="font-display text-xl">review</h2>
            <p className="text-sm text-ink/70 dark:text-dark-ink/70">
              Ready to see combined proceeds, grants, duties, loan affordability, and cash
              required — or go back to change anything.
            </p>
            {error && <p className="text-sm text-accent">{error}</p>}
          </>
        )}
      </div>

      <div className="mt-10 flex justify-between">
        <InkButton variant="secondary" onClick={back} disabled={step === 0}>
          back
        </InkButton>
        {step < TOTAL_STEPS - 1 ? (
          <InkButton onClick={next}>next</InkButton>
        ) : (
          <InkButton onClick={trySubmit}>see results</InkButton>
        )}
      </div>
    </div>
  );
}
