import { formatSgd } from '@/lib/format';

export interface MilestoneRow {
  label: string;
  cpf?: number;
  cash?: number;
  loan?: number;
  total: number;
}

export interface MilestoneGroup {
  heading: string;
  rows: MilestoneRow[];
}

function cell(value: number | undefined) {
  return <span className="figure">{value ? formatSgd(value) : '—'}</span>;
}

/** Mirrors the shape of HDB's own "Payment Milestones" table — grouped by when payment falls
 *  due, split across CPF/cash/loan — but built entirely from figures this app has already
 *  computed and verified elsewhere (fees, cpf, loan), not a separate allocation methodology. */
export function PaymentMilestones({ groups }: { groups: MilestoneGroup[] }) {
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.heading}>
          <div className="micro-label text-ink/60 dark:text-dark-ink/60">{group.heading}</div>
          <div className="mt-2">
            <div className="grid grid-cols-[1fr_repeat(4,minmax(0,auto))] gap-x-4 gap-y-1 text-xs text-ink/50 dark:text-dark-ink/50">
              <span />
              <span className="text-right">cpf</span>
              <span className="text-right">cash</span>
              <span className="text-right">loan</span>
              <span className="text-right">total</span>
            </div>
            {group.rows.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[1fr_repeat(4,minmax(0,auto))] gap-x-4 items-baseline border-b border-rule py-3 text-sm dark:border-white/10"
              >
                <span>{row.label}</span>
                <span className="text-right">{cell(row.cpf)}</span>
                <span className="text-right">{cell(row.cash)}</span>
                <span className="text-right">{cell(row.loan)}</span>
                <span className="text-right font-medium">{cell(row.total)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
