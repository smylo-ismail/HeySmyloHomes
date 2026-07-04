import { FirstTimerHdbBuyWizard } from '@/components/wizard/FirstTimerHdbBuyWizard';

// V1 only ships FIRST_TIMER_HDB_BUY; other scenario types are V1 §4 roadmap items
// (HDB_SELL_ONLY, HDB_SELL_AND_BUY) and V2 (NEW_LAUNCH_BUY, PRIVATE_SELL_AND_BUY).
const SUPPORTED_TYPES = ['first-timer-hdb-buy'] as const;

export function generateStaticParams() {
  return SUPPORTED_TYPES.map((type) => ({ type }));
}

export default function SimulatePage({ params }: { params: { type: string } }) {
  if (params.type === 'first-timer-hdb-buy') {
    return <FirstTimerHdbBuyWizard />;
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <p>This scenario type isn&apos;t available yet — worth a chat with smylo.</p>
    </div>
  );
}
