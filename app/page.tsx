import Link from 'next/link';
import { InkButton } from '@/components/InkButton';
import { MicroLabel } from '@/components/MicroLabel';

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-between px-4 py-12">
      <div className="space-y-8">
        <MicroLabel>smylo · property scenario simulator</MicroLabel>
        <h1 className="font-display text-3xl leading-tight text-balance">
          Run the numbers on your next move before you talk to an agent.
        </h1>
        <p className="text-ink/70 dark:text-dark-ink/70">
          Grants, stamp duties, loan affordability, and cash required — worked out the way HDB
          and the banks actually calculate it.
        </p>
        <Link href="/simulate/first-timer-hdb-buy">
          <InkButton>start: first-timer HDB buy</InkButton>
        </Link>
      </div>
      <footer className="mt-16 border-t border-rule pt-4 text-xs text-ink/50 dark:border-white/10 dark:text-dark-ink/50">
        prepared with smylo · whatsapp ↗
      </footer>
    </div>
  );
}
