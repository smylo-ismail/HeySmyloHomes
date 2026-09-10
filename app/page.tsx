import Link from 'next/link';
import { InkButton } from '@/components/InkButton';
import { MicroLabel } from '@/components/MicroLabel';

const SCENARIOS = [
  {
    href: '/simulate/first-timer-hdb-buy',
    label: 'first-timer HDB buy',
    description: 'your first flat — BTO or resale',
  },
  {
    href: '/simulate/hdb-sell-and-buy',
    label: 'HDB sell & buy',
    description: 'sell your flat, buy your next one',
  },
];

export default function Home() {
  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-12">
      <div className="space-y-10">
        <div className="space-y-5">
          <MicroLabel>smylo · property scenario simulator</MicroLabel>
          <h1 className="font-display text-4xl leading-[1.05] text-balance">
            Know your numbers before you talk to an agent.
          </h1>
          <p className="text-ink/70 dark:text-dark-ink/70">
            Grants, duties, loan limits, cash required — calculated the way HDB and the banks
            actually do it.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {SCENARIOS.map((s) => (
            <Link key={s.href} href={s.href} className="block">
              <InkButton variant="secondary" className="w-full text-left normal-case tracking-normal">
                <span className="block text-sm uppercase tracking-wide">{s.label}</span>
                <span className="mt-0.5 block text-xs font-normal text-ink/60 dark:text-dark-ink/60">
                  {s.description}
                </span>
              </InkButton>
            </Link>
          ))}
        </div>

        <p className="border-t border-rule pt-4 text-xs text-ink/50 dark:border-white/10 dark:text-dark-ink/50">
          anonymous · no sign-up · estimates verified against HDB, IRAS &amp; MAS rates
        </p>
      </div>
      <footer className="mt-16 border-t border-rule pt-4 text-xs text-ink/50 dark:border-white/10 dark:text-dark-ink/50">
        prepared with smylo · whatsapp ↗
      </footer>
    </div>
  );
}
