import Link from 'next/link';
import { InkButton } from '@/components/InkButton';
import { MicroLabel } from '@/components/MicroLabel';

// Grouped by property category so the list scales as more scenario types (private property
// buy, private sell+buy, etc.) are added — new groups get their own MicroLabel rather than
// growing one long undifferentiated list of buttons.
const SCENARIO_GROUPS = [
  {
    category: 'HDB',
    scenarios: [
      {
        href: '/simulate/first-timer-hdb-buy',
        label: 'first-timer HDB buy',
        description: 'your first home — BTO or resale',
      },
      {
        href: '/simulate/hdb-sell-and-buy',
        label: 'HDB sell & buy',
        description: 'sell your home, buy your next one',
      },
    ],
  },
];

export default function Home() {
  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-12">
      <div className="space-y-10">
        <div className="space-y-5">
          <MicroLabel>smylo · property scenario simulator</MicroLabel>
          <h1 className="font-display text-3xl leading-[1.15] text-balance">
            We&rsquo;re here to help you understand your numbers before you meet an agent.
          </h1>
          <p className="text-ink/70 dark:text-dark-ink/70">
            No pressure — just estimates for your grants, duties, loan limits and cash needed.
          </p>
        </div>

        <div className="space-y-6">
          {SCENARIO_GROUPS.map((group) => (
            <div key={group.category}>
              <MicroLabel>{group.category}</MicroLabel>
              <div className="mt-2 flex flex-col gap-3">
                {group.scenarios.map((s) => (
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
            </div>
          ))}
        </div>

        <p className="border-t border-rule pt-4 text-xs text-ink/50 dark:border-white/10 dark:text-dark-ink/50">
          anonymous · no sign-up · estimates verified against HDB & IRAS
        </p>
      </div>
      <footer className="mt-16 border-t border-rule pt-4 text-xs text-ink/50 dark:border-white/10 dark:text-dark-ink/50">
        prepared with smylo · whatsapp ↗
      </footer>
    </div>
  );
}
