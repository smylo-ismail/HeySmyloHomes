/** Two stacked bars answering "how is this actually being paid for": loan vs. downpayment (as a
 *  share of price), then — since CPF OA covers the downpayment shortfall AND stamp duties
 *  together, never just one or the other — how much of that combined amount comes from CPF vs.
 *  cash. Sits above the existing exact-dollar rows as a glanceable summary, not a replacement. */
export function FundingBreakdown({
  price,
  loanGranted,
  cpfNeeded,
  cashTopUp,
}: {
  price: number;
  loanGranted: number;
  cpfNeeded: number;
  cashTopUp: number;
}) {
  const loanPct = price > 0 ? (loanGranted / price) * 100 : 0;
  const downpaymentPct = 100 - loanPct;
  const cashPct = cpfNeeded > 0 ? Math.min((cashTopUp / cpfNeeded) * 100, 100) : 0;
  const cpfPct = cpfNeeded > 0 ? 100 - cashPct : 0;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between text-xs text-ink/50 dark:text-dark-ink/50">
          <span>loan {loanPct.toFixed(0)}%</span>
          <span>downpayment {downpaymentPct.toFixed(0)}%</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-rule dark:bg-white/10">
          <div className="h-full rounded-full bg-ink dark:bg-dark-ink" style={{ width: `${loanPct}%` }} />
        </div>
      </div>
      {cpfNeeded > 0 && (
        <div>
          <div className="flex items-baseline justify-between text-xs text-ink/50 dark:text-dark-ink/50">
            <span>downpayment + duties via CPF {cpfPct.toFixed(0)}%</span>
            <span>via cash {cashPct.toFixed(0)}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-rule dark:bg-white/10">
            <div className="h-full rounded-full bg-ink dark:bg-dark-ink" style={{ width: `${cpfPct}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
