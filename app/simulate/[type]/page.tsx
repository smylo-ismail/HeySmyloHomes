import Link from 'next/link';
import { FirstTimerHdbBuyWizard } from '@/components/wizard/FirstTimerHdbBuyWizard';
import { HdbSellAndBuyWizard } from '@/components/wizard/HdbSellAndBuyWizard';
import { HdbSellOnlyWizard } from '@/components/wizard/HdbSellOnlyWizard';

// V1 ships FIRST_TIMER_HDB_BUY, HDB_SELL_AND_BUY (whose buy leg can target HDB or private
// resale), and HDB_SELL_ONLY (no buy leg — sale proceeds only); V2 (a new-launch/BUC buy leg) is
// still unsupported.
const SUPPORTED_TYPES = ['first-timer-hdb-buy', 'hdb-sell-and-buy', 'hdb-sell-only'] as const;

export function generateStaticParams() {
  return SUPPORTED_TYPES.map((type) => ({ type }));
}

// A single wrapper here covers every scenario's wizard steps AND its results screen (each
// wizard component internally swaps between the two, but both are still rendered as this same
// child) — one home link instead of duplicating it across three wizards and three results pages.
function HomeLink() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <Link
        href="/"
        className="text-xs underline text-ink/50 hover:text-ink dark:text-dark-ink/50 dark:hover:text-dark-ink"
      >
        ← home
      </Link>
    </div>
  );
}

export default function SimulatePage({ params }: { params: { type: string } }) {
  if (params.type === 'first-timer-hdb-buy') {
    return (
      <>
        <HomeLink />
        <FirstTimerHdbBuyWizard />
      </>
    );
  }
  if (params.type === 'hdb-sell-and-buy') {
    return (
      <>
        <HomeLink />
        <HdbSellAndBuyWizard />
      </>
    );
  }
  if (params.type === 'hdb-sell-only') {
    return (
      <>
        <HomeLink />
        <HdbSellOnlyWizard />
      </>
    );
  }

  return (
    <>
      <HomeLink />
      <div className="mx-auto max-w-lg px-4 py-12">
        <p>This scenario type isn&apos;t available yet — worth a chat with smylo.</p>
      </div>
    </>
  );
}
