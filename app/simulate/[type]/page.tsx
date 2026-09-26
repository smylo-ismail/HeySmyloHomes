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

export default function SimulatePage({ params }: { params: { type: string } }) {
  if (params.type === 'first-timer-hdb-buy') {
    return <FirstTimerHdbBuyWizard />;
  }
  if (params.type === 'hdb-sell-and-buy') {
    return <HdbSellAndBuyWizard />;
  }
  if (params.type === 'hdb-sell-only') {
    return <HdbSellOnlyWizard />;
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <p>This scenario type isn&apos;t available yet — worth a chat with smylo.</p>
    </div>
  );
}
