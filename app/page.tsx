import Link from 'next/link';
import { InkButton } from '@/components/InkButton';
import { MicroLabel } from '@/components/MicroLabel';

const SCENARIOS = [
  {
    href: '/simulate/first-timer-hdb-buy',
    label: 'first-timer HDB buy',
    description: 'buying your first flat — BTO or resale',
  },
  {
    href: '/simulate/hdb-sell-and-buy',
    label: 'HDB sell & buy',
    description: 'selling your flat to buy your next one',
  },
];

const STEPS = [
  {
    title: 'answer a few questions',
    body: 'household, income, the flat, the loan — takes a few minutes, nothing to sign.',
  },
  {
    title: 'see your numbers',
    body: 'grants, stamp duties, loan affordability, and the cash you’ll actually need.',
  },
  {
    title: 'talk to smylo if it’s useful',
    body: 'no pressure, no sign-up — the results are yours whether or not you reach out.',
  },
];

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-between px-4 py-12">
      <div className="space-y-10">
        <div className="space-y-8">
          <MicroLabel>smylo · property scenario simulator</MicroLabel>
          <h1 className="font-display text-3xl leading-tight text-balance">
            Run the numbers on your next move before you talk to an agent.
          </h1>
          <p className="text-ink/70 dark:text-dark-ink/70">
            Grants, stamp duties, loan affordability, and cash required — worked out the way HDB
            and the banks actually calculate it.
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

        <div>
          <MicroLabel>how it works</MicroLabel>
          <div className="mt-2">
            {STEPS.map((step, i) => (
              <div key={step.title} className="flex gap-4 border-b border-rule py-3 last:border-b-0 dark:border-white/10">
                <span className="figure w-5 shrink-0 text-sm text-ink/40 dark:text-dark-ink/40">{i + 1}</span>
                <div>
                  <span className="text-sm">{step.title}</span>
                  <p className="mt-1 text-xs text-ink/60 dark:text-dark-ink/60">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-ink/50 dark:text-dark-ink/50">
          anonymous, no sign-up required — figures are estimates verified against HDB, IRAS, and
          MAS rates.
        </p>
      </div>
      <footer className="mt-16 border-t border-rule pt-4 text-xs text-ink/50 dark:border-white/10 dark:text-dark-ink/50">
        prepared with smylo · whatsapp ↗
      </footer>
    </div>
  );
}
