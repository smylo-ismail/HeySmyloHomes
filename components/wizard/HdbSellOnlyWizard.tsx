'use client';

import { useState } from 'react';
import { useLocalDraft } from '@/lib/hooks/useLocalDraft';
import { EMPTY_SELL_ONLY_DRAFT, type HdbSellOnlyDraft } from '@/lib/schema/hdbSellOnlyDraft';
import { hdbSellOnlySchema } from '@/lib/schema/hdbSellOnly';
import { NumberField, ChoiceField, BoolField, DateField } from './fields';
import { ReviewSummary, type ReviewSection } from './ReviewSummary';
import { InkButton } from '@/components/InkButton';
import { MicroLabel } from '@/components/MicroLabel';
import { HdbSellOnlyResults } from '@/components/results/HdbSellOnlyResults';
import { formatSgd, formatYesNo, formatDateReadable } from '@/lib/format';

const STORAGE_KEY = 'smylo:draft:hdb-sell-only';

const TOTAL_STEPS = 3;

const FLAT_TYPE_OPTIONS = [
  { value: '2R' as const, label: '2-room' },
  { value: '3R' as const, label: '3-room' },
  { value: '4R' as const, label: '4-room' },
  { value: '5R' as const, label: '5-room' },
  { value: 'EXEC' as const, label: 'executive' },
  { value: '3GEN' as const, label: '3gen' },
];
const MANNER_OF_HOLDING_OPTIONS = [
  { value: 'JOINT_TENANCY' as const, label: 'joint tenancy' },
  { value: 'TENANCY_IN_COMMON' as const, label: 'tenancy-in-common' },
];
const NEXT_FLAT_DESTINATION_OPTIONS = [
  { value: 'HDB' as const, label: 'another HDB flat' },
  { value: 'PRIVATE' as const, label: 'private property' },
];
const NEXT_LOAN_TYPE_OPTIONS = [
  { value: 'HDB' as const, label: 'HDB loan' },
  { value: 'BANK' as const, label: 'bank loan' },
];

function optionLabel<T extends string>(options: { value: T; label: string }[], value: T | undefined): string {
  return options.find((o) => o.value === value)?.label ?? '—';
}

export function HdbSellOnlyWizard() {
  const [draft, setDraft] = useLocalDraft<HdbSellOnlyDraft>(STORAGE_KEY, EMPTY_SELL_ONLY_DRAFT);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  // Same pattern as HdbSellAndBuyWizard — see its comment.
  const [returningToReview, setReturningToReview] = useState(false);

  const patch = (fields: HdbSellOnlyDraft) => setDraft({ ...draft, ...fields });

  const sellers = draft.sellers ?? [{ cpfPrincipalUsed: 0 }];
  const patchSeller = (index: number, fields: Partial<{ cpfPrincipalUsed: number; cpfUsageYears: number | undefined }>) => {
    const next = sellers.map((s, i) => (i === index ? { ...s, ...fields } : s));
    patch({ sellers: next });
  };
  const addSeller = () => patch({ sellers: [...sellers, { cpfPrincipalUsed: 0 }] });
  const removeSeller = (index: number) => {
    const next = sellers.filter((_, i) => i !== index);
    patch({ sellers: next, ownershipShares: undefined });
  };
  const patchSharePct = (index: number, pct: number | undefined) => {
    const current = draft.ownershipShares ?? sellers.map(() => 1 / sellers.length);
    const next = current.map((s, i) => (i === index ? (pct ?? 0) / 100 : s));
    patch({ ownershipShares: next });
  };

  const reviewParsed = hdbSellOnlySchema.safeParse(draft);

  if (submitted && reviewParsed.success) {
    return (
      <HdbSellOnlyResults
        input={reviewParsed.data}
        onEdit={() => setSubmitted(false)}
        onChangeSellOtpDate={(v) => v && patch({ sellOtpGrantedDate: v })}
      />
    );
  }

  const next = () => {
    if (returningToReview) {
      setReturningToReview(false);
      setStep(TOTAL_STEPS - 1);
    } else {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
    }
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const trySubmit = () => {
    if (reviewParsed.success) setSubmitted(true);
  };
  const jumpToStep = (target: number) => {
    setReturningToReview(true);
    setStep(target);
  };

  const invalidFields: Record<string, string> = {};
  if (!reviewParsed.success) {
    for (const issue of reviewParsed.error.issues) {
      const key = issue.path.join('.');
      if (!(key in invalidFields)) invalidFields[key] = issue.message;
    }
  }

  const sections: ReviewSection[] = [
    {
      stepIndex: 0,
      title: "the flat you're selling",
      fields: [
        { fieldKey: 'sellFlatType', label: 'flat type', value: optionLabel(FLAT_TYPE_OPTIONS, draft.sellFlatType) },
        { fieldKey: 'sellPrice', label: 'expected sale price', value: draft.sellPrice !== undefined ? formatSgd(draft.sellPrice) : '—' },
        {
          fieldKey: 'outstandingLoanBalance',
          label: 'outstanding loan balance',
          value: draft.outstandingLoanBalance !== undefined ? formatSgd(draft.outstandingLoanBalance) : '—',
        },
        ...sellers.map((seller, i) => ({
          fieldKey: `sellers.${i}.cpfPrincipalUsed`,
          label: sellers.length > 1 ? `seller ${i + 1} CPF used` : 'CPF principal used',
          value: seller.cpfPrincipalUsed !== undefined ? formatSgd(seller.cpfPrincipalUsed) : '—',
        })),
        ...(draft.upgradingLevy !== undefined
          ? [{ fieldKey: 'upgradingLevy', label: 'upgrading levy', value: formatSgd(draft.upgradingLevy) }]
          : []),
        ...(draft.outstandingUpgradingCost !== undefined
          ? [{ fieldKey: 'outstandingUpgradingCost', label: 'outstanding upgrading costs', value: formatSgd(draft.outstandingUpgradingCost) }]
          : []),
        ...(sellers.length > 1
          ? [{ fieldKey: 'mannerOfHolding', label: 'manner of holding', value: optionLabel(MANNER_OF_HOLDING_OPTIONS, draft.mannerOfHolding) }]
          : []),
        {
          fieldKey: 'sellOtpGrantedDate',
          label: 'OTP granted to buyer',
          value: formatDateReadable(draft.sellOtpGrantedDate),
        },
      ],
    },
    {
      stepIndex: 1,
      title: 'next housing plans',
      fields: [
        { fieldKey: 'planningNextPurchase', label: 'planning your next purchase?', value: formatYesNo(draft.planningNextPurchase) },
        ...(draft.planningNextPurchase
          ? [
              {
                fieldKey: 'nextFlatDestination',
                label: 'buying',
                value: optionLabel(NEXT_FLAT_DESTINATION_OPTIONS, draft.nextFlatDestination),
              },
              {
                fieldKey: 'nextFlatIsAnotherSubsidisedFlat',
                label: 'another subsidised flat (BTO, or resale with a grant)?',
                value: formatYesNo(draft.nextFlatIsAnotherSubsidisedFlat),
              },
              ...(draft.nextFlatDestination === 'HDB'
                ? [{ fieldKey: 'nextLoanType', label: 'loan type', value: optionLabel(NEXT_LOAN_TYPE_OPTIONS, draft.nextLoanType) }]
                : []),
            ]
          : []),
      ],
    },
  ];

  const startOver = () => {
    if (window.confirm('Clear everything you’ve entered and start over?')) {
      setDraft(EMPTY_SELL_ONLY_DRAFT);
      setStep(0);
      setSubmitted(false);
      setReturningToReview(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="flex items-center justify-between">
        <MicroLabel>
          step {step + 1} of {TOTAL_STEPS}
        </MicroLabel>
        <button
          type="button"
          onClick={startOver}
          className="text-xs underline text-ink/50 hover:text-ink dark:text-dark-ink/50 dark:hover:text-dark-ink"
        >
          start over
        </button>
      </div>

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

            <div className="space-y-4">
              <MicroLabel>CPF monies utilised (per seller)</MicroLabel>
              {sellers.map((seller, i) => (
                <div key={i} className="space-y-3 border-l-2 border-rule pl-4 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">seller {i + 1}</span>
                    {sellers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSeller(i)}
                        className="text-xs underline text-ink/50 hover:text-ink dark:text-dark-ink/50 dark:hover:text-dark-ink"
                      >
                        remove
                      </button>
                    )}
                  </div>
                  <NumberField
                    label="CPF principal used"
                    value={seller.cpfPrincipalUsed}
                    onChange={(v) => patchSeller(i, { cpfPrincipalUsed: v ?? 0 })}
                    placeholder="150000"
                  />
                  <NumberField
                    label="years since that CPF was used"
                    value={seller.cpfUsageYears}
                    onChange={(v) => patchSeller(i, { cpfUsageYears: v })}
                    placeholder="5"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={addSeller}
                className="text-xs underline text-ink/50 hover:text-ink dark:text-dark-ink/50 dark:hover:text-dark-ink"
              >
                + add seller
              </button>
            </div>

            {sellers.length > 1 && (
              <>
                <ChoiceField
                  label="manner of holding"
                  value={draft.mannerOfHolding}
                  onChange={(v) => patch({ mannerOfHolding: v })}
                  options={MANNER_OF_HOLDING_OPTIONS}
                />
                {draft.mannerOfHolding === 'TENANCY_IN_COMMON' && (
                  <div className="space-y-3">
                    <MicroLabel>ownership share per seller (%)</MicroLabel>
                    {sellers.map((_, i) => (
                      <NumberField
                        key={i}
                        label={`seller ${i + 1} share (%)`}
                        value={
                          draft.ownershipShares?.[i] !== undefined
                            ? Math.round(draft.ownershipShares[i] * 100)
                            : undefined
                        }
                        onChange={(v) => patchSharePct(i, v)}
                        placeholder={`${Math.round(100 / sellers.length)}`}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            <details className="mt-2">
              <summary className="cursor-pointer list-none text-xs underline text-ink/50 hover:text-ink dark:text-dark-ink/50 dark:hover:text-dark-ink [&::-webkit-details-marker]:hidden">
                advanced: outstanding upgrading levy / costs
              </summary>
              <div className="mt-3 space-y-4">
                <NumberField
                  label="upgrading levy — optional"
                  value={draft.upgradingLevy}
                  onChange={(v) => patch({ upgradingLevy: v })}
                  placeholder="not applicable? leave blank"
                />
                <NumberField
                  label="outstanding upgrading costs — optional"
                  value={draft.outstandingUpgradingCost}
                  onChange={(v) => patch({ outstandingUpgradingCost: v })}
                  placeholder="not applicable? leave blank"
                />
              </div>
            </details>

            <DateField
              label="OTP granted to buyer (or expected)"
              value={draft.sellOtpGrantedDate}
              onChange={(v) => patch({ sellOtpGrantedDate: v })}
            />
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="font-display text-xl">next housing plans</h2>
            <p className="text-sm text-ink/70 dark:text-dark-ink/70">
              Optional — this doesn&apos;t size a loan (see the HDB sell &amp; buy scenario for that). It only
              affects whether a resale levy applies, and previews HDB&apos;s mandatory minimum-cash-proceeds rule.
            </p>
            <BoolField
              label="do you have plans for your next home?"
              value={draft.planningNextPurchase}
              onChange={(v) =>
                patch(
                  v
                    ? { planningNextPurchase: true }
                    : {
                        planningNextPurchase: false,
                        nextFlatIsAnotherSubsidisedFlat: undefined,
                        nextFlatDestination: undefined,
                        nextLoanType: undefined,
                      }
                )
              }
            />
            {draft.planningNextPurchase && (
              <>
                <ChoiceField
                  label="buying"
                  value={draft.nextFlatDestination}
                  onChange={(v) =>
                    patch({
                      nextFlatDestination: v,
                      nextLoanType: v === 'PRIVATE' ? undefined : draft.nextLoanType,
                    })
                  }
                  options={NEXT_FLAT_DESTINATION_OPTIONS}
                />
                <BoolField
                  label="is it another subsidised flat (BTO, or a resale flat bought with a CPF housing grant)?"
                  value={draft.nextFlatIsAnotherSubsidisedFlat}
                  onChange={(v) => patch({ nextFlatIsAnotherSubsidisedFlat: v })}
                />
                {draft.nextFlatDestination === 'HDB' && (
                  <ChoiceField
                    label="loan type"
                    value={draft.nextLoanType}
                    onChange={(v) => patch({ nextLoanType: v })}
                    options={NEXT_LOAN_TYPE_OPTIONS}
                  />
                )}
              </>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-display text-xl">review</h2>
            <p className="text-sm text-ink/70 dark:text-dark-ink/70">
              Check everything below — click &quot;edit&quot; on any section to change it.
            </p>
            <ReviewSummary sections={sections} invalidFields={invalidFields} onJump={jumpToStep} />
          </>
        )}
      </div>

      <div className="mt-10 flex justify-between">
        <InkButton variant="secondary" onClick={back} disabled={step === 0}>
          back
        </InkButton>
        {step < TOTAL_STEPS - 1 ? (
          <InkButton onClick={next}>{returningToReview ? 'back to review' : 'next'}</InkButton>
        ) : (
          <InkButton onClick={trySubmit} disabled={!reviewParsed.success}>
            see results
          </InkButton>
        )}
      </div>
    </div>
  );
}
