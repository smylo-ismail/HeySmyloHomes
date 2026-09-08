import { FirstTimerHdbBuyWizard } from '@/components/wizard/FirstTimerHdbBuyWizard';
import { HdbSellAndBuyWizard } from '@/components/wizard/HdbSellAndBuyWizard';

// V1 ships FIRST_TIMER_HDB_BUY and HDB_SELL_AND_BUY; remaining V1 §4 roadmap items
// (HDB_SELL_ONLY) and V2 (NEW_LAUNCH_BUY, PRIVATE_SELL_AND_BUY) are still unsupported.
const SUPPORTED_TYPES = ['first-timer-hdb-buy', 'hdb-sell-and-buy'] as const;

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

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <p>This scenario type isn&apos;t available yet — worth a chat with smylo.</p>
    </div>
  );
}
