'use client';

import { MicroLabel } from '@/components/MicroLabel';

export function NumberField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <MicroLabel>{label}</MicroLabel>
      <input
        type="number"
        inputMode="decimal"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className="figure mt-1 w-full border-0 border-b border-rule bg-transparent py-2 text-xl outline-none focus:border-accent dark:border-white/10"
      />
    </label>
  );
}

export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <label className="block">
      <MicroLabel>{label}</MicroLabel>
      <input
        type="date"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
        className="figure mt-1 w-full border-0 border-b border-rule bg-transparent py-2 text-xl outline-none focus:border-accent dark:border-white/10"
      />
    </label>
  );
}

export function ChoiceField<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <MicroLabel>{label}</MicroLabel>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded border px-3 py-2 text-sm transition-colors ${
              value === opt.value
                ? 'border-ink bg-ink text-bg dark:border-dark-ink dark:bg-dark-ink dark:text-dark-bg'
                : 'border-rule text-ink/70 hover:border-ink dark:border-white/10 dark:text-dark-ink/70'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BoolField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | undefined;
  onChange: (value: boolean) => void;
}) {
  return (
    <ChoiceField
      label={label}
      value={value === undefined ? undefined : value ? 'yes' : 'no'}
      onChange={(v) => onChange(v === 'yes')}
      options={[
        { value: 'yes', label: 'yes' },
        { value: 'no', label: 'no' },
      ]}
    />
  );
}
