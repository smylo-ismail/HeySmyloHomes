'use client';

import { useState } from 'react';
import { useLocalDraft } from '@/lib/hooks/useLocalDraft';
import { EMPTY_SELL_AND_BUY_DRAFT, type HdbSellAndBuyDraft } from '@/lib/schema/hdbSellAndBuyDraft';
import { hdbSellAndBuySchema } from '@/lib/schema/hdbSellAndBuy';
import { NumberField, ChoiceField, BoolField, DateField } from './fields';
import { ReviewSummary, type ReviewSection } from './ReviewSummary';
import { InkButton } from '@/components/InkButton';
import { MicroLabel } from '@/components/MicroLabel';
import { HdbSellAndBuyResults } from '@/components/results/HdbSellAndBuyResults';
import { formatSgd, formatYesNo, formatDateReadable } from '@/lib/format';

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
const APPLICATION_TYPE_OPTIONS = [
  { value: 'FAMILY' as const, label: 'family' },
  { value: 'SINGLE' as const, label: 'single' },
  { value: 'JOINT_SINGLES' as const, label: 'joint singles' },
  { value: 'NON_RESIDENT_SPOUSE' as const, label: 'non-resident spouse' },
];
const CITIZENSHIP_OPTIONS = [
  { value: 'SC_SC' as const, label: 'SC + SC' },
  { value: 'SC_SPR' as const, label: 'SC + SPR' },
  { value: 'SC_ONLY' as const, label: 'SC (single)' },
];
const FLAT_SOURCE_OPTIONS = [
  { value: 'BTO' as const, label: 'BTO' },
  { value: 'RESALE' as const, label: 'resale' },
];
const PROXIMITY_OPTIONS = [
  { value: 'WITH_PARENTS_OR_CHILD' as const, label: 'living with' },
  { value: 'WITHIN_4KM' as const, label: 'within 4km' },
  { value: 'NONE' as const, label: 'none' },
];
const LOAN_TYPE_OPTIONS = [
  { value: 'HDB' as const, label: 'HDB loan' },
  { value: 'BANK' as const, label: 'bank loan' },
];

function optionLabel<T extends string>(options: { value: T; label: string }[], value: T | undefined): string {
  return options.find((o) => o.value === value)?.label ?? '—';
}

export function HdbSellAndBuyWizard() {
  const [draft, setDraft] = useLocalDraft<HdbSellAndBuyDraft>(STORAGE_KEY, EMPTY_SELL_AND_BUY_DRAFT);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const patch = (fields: HdbSellAndBuyDraft) => setDraft({ ...draft, ...fields });

  // "valuation" defaults to price when left blank — the field's own placeholder promises
  // this ("same as price if unsure"), so honor it here rather than failing validation.
  const withDefaults = (): HdbSellAndBuyDraft => ({
    ...draft,
    valuation: draft.valuation ?? draft.price,
  });

  const reviewParsed = hdbSellAndBuySchema.safeParse(withDefaults());

  if (submitted && reviewParsed.success) {
    return <HdbSellAndBuyResults input={reviewParsed.data} onEdit={() => setSubmitted(false)} />;
  }

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const trySubmit = () => {
    if (reviewParsed.success) setSubmitted(true);
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
        {
          fieldKey: 'cpfPrincipalUsed',
          label: 'CPF principal used',
          value: draft.cpfPrincipalUsed !== undefined ? formatSgd(draft.cpfPrincipalUsed) : '—',
        },
        { fieldKey: 'cpfUsageYears', label: 'years since CPF used', value: draft.cpfUsageYears !== undefined ? `${draft.cpfUsageYears}` : '0' },
        {
          fieldKey: 'expectedSellCompletionDate',
          label: 'expected sale completion',
          value: formatDateReadable(draft.expectedSellCompletionDate),
        },
      ],
    },
    {
      stepIndex: 1,
      title: "who's buying",
      fields: [
        { fieldKey: 'applicationType', label: 'application type', value: optionLabel(APPLICATION_TYPE_OPTIONS, draft.applicationType) },
        { fieldKey: 'citizenshipMix', label: 'citizenship', value: optionLabel(CITIZENSHIP_OPTIONS, draft.citizenshipMix) },
        { fieldKey: 'buyerAges', label: 'buyer ages', value: draft.buyerAges?.length ? draft.buyerAges.join(', ') : '—' },
      ],
    },
    {
      stepIndex: 2,
      title: 'household income',
      fields: [
        {
          fieldKey: 'avgMonthlyHouseholdIncome',
          label: 'avg. monthly household income',
          value: draft.avgMonthlyHouseholdIncome !== undefined ? formatSgd(draft.avgMonthlyHouseholdIncome) : '—',
        },
        { fieldKey: 'employedContinuously12Months', label: 'continuously employed 12mo?', value: formatYesNo(draft.employedContinuously12Months) },
      ],
    },
    {
      stepIndex: 3,
      title: "the flat you're buying",
      fields: [
        { fieldKey: 'flatSource', label: 'source', value: optionLabel(FLAT_SOURCE_OPTIONS, draft.flatSource) },
        { fieldKey: 'flatType', label: 'flat type', value: optionLabel(FLAT_TYPE_OPTIONS, draft.flatType) },
        { fieldKey: 'price', label: 'price', value: draft.price !== undefined ? formatSgd(draft.price) : '—' },
        { fieldKey: 'valuation', label: 'valuation', value: draft.valuation !== undefined ? formatSgd(draft.valuation) : 'same as price' },
        ...(draft.flatSource === 'RESALE'
          ? [
              {
                fieldKey: 'remainingLeaseYears',
                label: 'remaining lease',
                value: draft.remainingLeaseYears !== undefined ? `${draft.remainingLeaseYears} years` : '—',
              },
              { fieldKey: 'proximity', label: 'proximity', value: optionLabel(PROXIMITY_OPTIONS, draft.proximity) },
            ]
          : []),
        {
          fieldKey: 'expectedBuyCompletionDate',
          label: 'expected purchase completion',
          value: formatDateReadable(draft.expectedBuyCompletionDate),
        },
      ],
    },
    {
      stepIndex: 4,
      title: 'property history',
      fields: [
        {
          fieldKey: 'ownsOrDisposedPrivateWithin30Months',
          label: 'owned/disposed private property within 30mo?',
          value: formatYesNo(draft.ownsOrDisposedPrivateWithin30Months),
        },
      ],
    },
    {
      stepIndex: 5,
      title: 'the loan',
      fields: [
        { fieldKey: 'loanType', label: 'loan type', value: optionLabel(LOAN_TYPE_OPTIONS, draft.loanType) },
        { fieldKey: 'tenureYears', label: 'tenure', value: draft.tenureYears !== undefined ? `${draft.tenureYears} years` : '—' },
        {
          fieldKey: 'additionalCpfOaBalance',
          label: 'additional CPF OA balance',
          value: draft.additionalCpfOaBalance !== undefined ? formatSgd(draft.additionalCpfOaBalance) : '0',
        },
        ...(draft.loanType === 'BANK'
          ? [
              {
                fieldKey: 'existingMonthlyDebt',
                label: 'existing monthly debt',
                value: draft.existingMonthlyDebt !== undefined ? formatSgd(draft.existingMonthlyDebt) : 'none',
              },
            ]
          : []),
      ],
    },
  ];

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
              options={APPLICATION_TYPE_OPTIONS}
            />
            <ChoiceField
              label="citizenship"
              value={draft.citizenshipMix}
              onChange={(v) => patch({ citizenshipMix: v })}
              options={CITIZENSHIP_OPTIONS}
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
            <ChoiceField label="source" value={draft.flatSource} onChange={(v) => patch({ flatSource: v })} options={FLAT_SOURCE_OPTIONS} />
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
                  options={PROXIMITY_OPTIONS}
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
            <ChoiceField label="loan type" value={draft.loanType} onChange={(v) => patch({ loanType: v })} options={LOAN_TYPE_OPTIONS} />
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
              Check everything below — click &quot;edit&quot; on any section to change it.
            </p>
            <ReviewSummary sections={sections} invalidFields={invalidFields} onJump={setStep} />
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
          <InkButton onClick={trySubmit} disabled={!reviewParsed.success}>
            see results
          </InkButton>
        )}
      </div>
    </div>
  );
}
