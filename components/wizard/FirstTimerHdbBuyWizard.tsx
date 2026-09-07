'use client';

import { useState } from 'react';
import { useLocalDraft } from '@/lib/hooks/useLocalDraft';
import { EMPTY_DRAFT, type FirstTimerHdbBuyDraft } from '@/lib/schema/draft';
import { firstTimerHdbBuySchema } from '@/lib/schema/firstTimerHdbBuy';
import { NumberField, ChoiceField, BoolField } from './fields';
import { firstIssueMessage } from '@/lib/formError';
import { InkButton } from '@/components/InkButton';
import { MicroLabel } from '@/components/MicroLabel';
import { FirstTimerHdbBuyResults } from '@/components/results/FirstTimerHdbBuyResults';
import { buildAnonymousDiscussUrl } from '@/lib/whatsapp';

const STORAGE_KEY = 'smylo:draft:first-timer-hdb-buy';

const TOTAL_STEPS = 6;

export function FirstTimerHdbBuyWizard() {
  const [draft, setDraft] = useLocalDraft<FirstTimerHdbBuyDraft>(STORAGE_KEY, EMPTY_DRAFT);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = (fields: FirstTimerHdbBuyDraft) => setDraft({ ...draft, ...fields });

  if (draft.allFirstTimers === false) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 space-y-4">
        <MicroLabel>second-timer / mixed household</MicroLabel>
        <p className="text-lg font-display">
          Step-Up &amp; half-grant paths are coming soon — worth a chat with smylo in the meantime.
        </p>
        <div className="flex gap-3">
          <InkButton variant="secondary" onClick={() => patch({ allFirstTimers: true })}>
            back
          </InkButton>
          <a
            href={buildAnonymousDiscussUrl("i'm a second-timer / mixed household buyer")}
            target="_blank"
            rel="noopener noreferrer"
          >
            <InkButton>discuss this with smylo</InkButton>
          </a>
        </div>
      </div>
    );
  }

  // "valuation" defaults to price when left blank — the field's own placeholder promises
  // this ("same as price if unsure"), so honor it here rather than failing validation.
  const withDefaults = (): FirstTimerHdbBuyDraft => ({
    ...draft,
    valuation: draft.valuation ?? draft.price,
  });

  if (submitted) {
    const parsed = firstTimerHdbBuySchema.safeParse(withDefaults());
    if (parsed.success) {
      return <FirstTimerHdbBuyResults input={parsed.data} onEdit={() => setSubmitted(false)} />;
    }
    setSubmitted(false);
  }

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const trySubmit = () => {
    const parsed = firstTimerHdbBuySchema.safeParse(withDefaults());
    if (!parsed.success) {
      setError(firstIssueMessage(parsed.error));
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
            <BoolField
              label="are all applicants first-timers?"
              value={draft.allFirstTimers}
              onChange={(v) => patch({ allFirstTimers: v })}
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

        {step === 1 && (
          <>
            <h2 className="font-display text-xl">household income</h2>
            <NumberField
              label="avg. monthly household income"
              value={draft.avgMonthlyHouseholdIncome}
              onChange={(v) => patch({ avgMonthlyHouseholdIncome: v })}
              placeholder="7000"
            />
            <BoolField
              label="continuously employed the last 12 months?"
              value={draft.employedContinuously12Months}
              onChange={(v) => patch({ employedContinuously12Months: v })}
            />
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-display text-xl">the flat</h2>
            <ChoiceField
              label="source"
              value={draft.flatSource}
              onChange={(v) => patch({ flatSource: v })}
              options={[
                { value: 'BTO', label: 'BTO' },
                { value: 'RESALE', label: 'resale' },
              ]}
            />
            <ChoiceField
              label="flat type"
              value={draft.flatType}
              onChange={(v) => patch({ flatType: v })}
              options={[
                { value: '2R', label: '2-room' },
                { value: '3R', label: '3-room' },
                { value: '4R', label: '4-room' },
                { value: '5R', label: '5-room' },
                { value: 'EXEC', label: 'executive' },
                { value: '3GEN', label: '3gen' },
              ]}
            />
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
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="font-display text-xl">property history</h2>
            <BoolField
              label="owned or disposed of a private property within the last 30 months?"
              value={draft.ownsOrDisposedPrivateWithin30Months}
              onChange={(v) => patch({ ownsOrDisposedPrivateWithin30Months: v })}
            />
          </>
        )}

        {step === 4 && (
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
            <NumberField label="tenure (years)" value={draft.tenureYears} onChange={(v) => patch({ tenureYears: v })} placeholder="25" />
            <NumberField label="CPF OA balance" value={draft.cpfOaBalance} onChange={(v) => patch({ cpfOaBalance: v })} placeholder="60000" />
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

        {step === 5 && (
          <>
            <h2 className="font-display text-xl">review</h2>
            <p className="text-sm text-ink/70 dark:text-dark-ink/70">
              Ready to see grants, duties, loan affordability, and cash required — or go back to
              change anything.
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
