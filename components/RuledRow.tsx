'use client';

import { useState } from 'react';
import { formatSgd } from '@/lib/format';

export function RuledRow({
  label,
  value,
  breakdown,
}: {
  label: string;
  value: number;
  breakdown?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const canExpand = !!breakdown;

  return (
    <div className="border-b border-rule dark:border-white/10">
      <button
        type="button"
        onClick={() => canExpand && setOpen((o) => !o)}
        className={`flex w-full items-baseline justify-between gap-4 py-3 text-left ${canExpand ? 'cursor-pointer' : 'cursor-default'}`}
        aria-expanded={open}
        disabled={!canExpand}
      >
        <span className="text-sm">
          {label}
          {canExpand && <span className="ml-2 text-xs text-ink/40 dark:text-dark-ink/40">{open ? '−' : '+'} how this was computed</span>}
        </span>
        <span className="figure text-lg shrink-0">{formatSgd(value)}</span>
      </button>
      {open && breakdown && (
        <div className="pb-3 pl-1 text-sm text-ink/70 dark:text-dark-ink/70">{breakdown}</div>
      )}
    </div>
  );
}
