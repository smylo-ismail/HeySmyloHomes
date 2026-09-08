'use client';

import { useEffect, useRef, useState } from 'react';
import type { TimelineStage } from '@/lib/timeline/hdbTimelines';

/** Vertical rule that fills in as the timeline scrolls through the viewport — 0% as it enters
 *  from the bottom, 100% once it has fully scrolled past the top. Self-contained per element
 *  (doesn't need extra page content below to "complete"), unlike anchoring to a fixed line. */
function useScrollFill(containerRef: React.RefObject<HTMLDivElement>) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;

    const update = () => {
      raf = 0;
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const p = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      setProgress(Math.min(1, Math.max(0, p)));
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [containerRef]);

  return progress;
}

export function Timeline({ stages }: { stages: TimelineStage[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progress = useScrollFill(containerRef);

  return (
    <div ref={containerRef} className="relative pl-6">
      <div className="absolute left-[3px] top-1 bottom-1 w-px bg-rule dark:bg-white/10" />
      <div
        className="absolute left-[3px] top-1 w-px bg-ink transition-[height] duration-150 ease-out dark:bg-dark-ink"
        style={{ height: `calc((100% - 0.5rem) * ${progress})` }}
      />
      {stages.map((stage) => (
        <div key={stage.name} className="relative pb-6 last:pb-0">
          <div className="absolute -left-6 top-1 h-[7px] w-[7px] rounded-full bg-ink dark:bg-dark-ink" />
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="text-sm">{stage.name}</span>
            <span className="figure text-xs shrink-0 text-ink/60 dark:text-dark-ink/60">
              {stage.date ?? stage.duration}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink/60 dark:text-dark-ink/60">{stage.description}</p>
        </div>
      ))}
    </div>
  );
}
