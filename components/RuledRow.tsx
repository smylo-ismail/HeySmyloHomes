import { formatSgd } from '@/lib/format';

export function RuledRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-rule py-3 dark:border-white/10">
      <span className="text-sm">{label}</span>
      <span className="figure text-lg shrink-0">{formatSgd(value)}</span>
    </div>
  );
}
