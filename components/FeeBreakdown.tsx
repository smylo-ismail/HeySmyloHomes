import { RuledRow } from './RuledRow';

/** A single line item stays the headline figure (e.g. "upfront fees: $X") — this is the optional
 *  detail behind it, collapsed by default so it doesn't repeat the noise the "how this was
 *  computed" breakdowns added before (see CLAUDE.md) for every figure on the page, just this one
 *  on request. Rows with nothing in them (e.g. BTO has no OTP-style option money) are omitted. */
export function FeeBreakdown({ rows }: { rows: { label: string; value: number }[] }) {
  const nonZero = rows.filter((r) => r.value > 0);
  if (nonZero.length === 0) return null;

  return (
    <details className="mt-1">
      <summary className="cursor-pointer list-none text-xs underline text-ink/50 hover:text-ink dark:text-dark-ink/50 dark:hover:text-dark-ink [&::-webkit-details-marker]:hidden">
        view breakdown
      </summary>
      <div className="mt-2">
        {nonZero.map((r) => (
          <RuledRow key={r.label} label={r.label} value={r.value} />
        ))}
      </div>
    </details>
  );
}
