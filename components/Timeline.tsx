import type { TimelineStage } from '@/lib/timeline/hdbBuyTimeline';

export function Timeline({ stages }: { stages: TimelineStage[] }) {
  return (
    <div>
      {stages.map((stage, i) => (
        <div
          key={stage.name}
          className="flex gap-4 border-b border-rule py-3 last:border-b-0 dark:border-white/10"
        >
          <span className="figure w-6 shrink-0 text-sm text-ink/40 dark:text-dark-ink/40">
            {i + 1}
          </span>
          <div className="flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-sm">{stage.name}</span>
              <span className="figure text-xs shrink-0 text-ink/60 dark:text-dark-ink/60">
                {stage.duration}
              </span>
            </div>
            <p className="mt-1 text-xs text-ink/60 dark:text-dark-ink/60">{stage.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
