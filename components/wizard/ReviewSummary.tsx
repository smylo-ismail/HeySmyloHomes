import { MicroLabel } from '@/components/MicroLabel';

export interface ReviewField {
  fieldKey: string;
  label: string;
  /** Formatted for display — the wizard decides how (currency, date, option label, etc). */
  value: string;
}

export interface ReviewSection {
  stepIndex: number;
  title: string;
  fields: ReviewField[];
}

export function ReviewSummary({
  sections,
  invalidFields,
  onJump,
}: {
  sections: ReviewSection[];
  /** fieldKey -> the specific reason it's invalid/missing, shown in place of its value. */
  invalidFields: Record<string, string>;
  onJump: (stepIndex: number) => void;
}) {
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.title} className="border-b border-rule pb-4 dark:border-white/10 last:border-b-0">
          <div className="flex items-center justify-between">
            <MicroLabel>{section.title}</MicroLabel>
            <button
              type="button"
              onClick={() => onJump(section.stepIndex)}
              className="text-xs underline text-ink/60 hover:text-ink dark:text-dark-ink/60 dark:hover:text-dark-ink"
            >
              edit
            </button>
          </div>
          <div className="mt-2 space-y-1.5">
            {section.fields.map((f) => {
              const problem = invalidFields[f.fieldKey];
              return (
                <div key={f.fieldKey} className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="text-ink/70 dark:text-dark-ink/70">{f.label}</span>
                  <span className={`figure text-right ${problem ? 'text-accent' : ''}`}>
                    {problem ?? f.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
