'use client';

import { useEffect, useRef } from 'react';
import type { TimelineStage } from '@/lib/timeline/hdbTimelines';

/** Drives the fill line's transform directly every animation frame — no React state, no CSS
 *  transition. A transitioned/state-driven fill visibly lags scroll (each update restarts its
 *  own easing curve, so it perpetually "chases" fast scrolling instead of tracking it); a
 *  continuous rAF loop writing straight to the DOM tracks scroll position 1:1, every frame,
 *  including during momentum scrolling where the browser can batch/skip 'scroll' events. */
function useScrollFill(containerRef: React.RefObject<HTMLDivElement>, fillRef: React.RefObject<HTMLDivElement>) {
  useEffect(() => {
    let rafId: number;

    const loop = () => {
      const container = containerRef.current;
      const fill = fillRef.current;
      if (container && fill) {
        const rect = container.getBoundingClientRect();
        const scrollY = window.scrollY;
        const containerTopAbs = rect.top + scrollY;
        const containerBottomAbs = containerTopAbs + rect.height;
        const maxScrollY = document.documentElement.scrollHeight - window.innerHeight;
        // 0 as the element enters from the bottom of the viewport, 1 once it has fully
        // scrolled past the top. The "1" target is capped at the page's actual max scroll —
        // if there isn't enough content below the timeline to scroll it fully past, reaching
        // the bottom of the page still counts as complete rather than stalling short of 1.
        const start = containerTopAbs - window.innerHeight;
        const end = Math.min(containerBottomAbs, maxScrollY);
        const p = end > start ? (scrollY - start) / (end - start) : 1;
        fill.style.transform = `scaleY(${Math.min(1, Math.max(0, p))})`;
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [containerRef, fillRef]);
}

export function Timeline({ stages, reversed = false }: { stages: TimelineStage[]; reversed?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  useScrollFill(containerRef, fillRef);

  // A merged (sell + buy) timeline carries legIndex on every stage — that's the signal to run
  // the responsive two-sided layout (single spine on a phone, left/right of a centered spine
  // from `sm:` up, where there's room). A plain single-leg timeline (e.g. FIRST_TIMER_HDB_BUY)
  // has no legIndex at all and keeps the original single-column look untouched.
  const isDual = stages.some((s) => s.legIndex !== undefined);

  return (
    <div ref={containerRef} className={`relative pl-6 ${isDual ? 'sm:pl-0' : ''}`}>
      <div
        className={`absolute top-1 bottom-1 w-px bg-rule dark:bg-white/10 ${
          isDual ? 'left-[3px] sm:left-1/2 sm:-translate-x-1/2' : 'left-[3px]'
        }`}
      />
      <div
        ref={fillRef}
        className={`absolute top-1 bottom-1 w-px origin-top bg-ink dark:bg-dark-ink ${
          isDual ? 'left-[3px] sm:left-1/2 sm:-translate-x-1/2' : 'left-[3px]'
        }`}
        style={{ transform: 'scaleY(0)' }}
      />
      {stages.map((stage, i) => {
        // side 0 = left of the spine at sm: and up, filled dot. side 1 = right, hollow dot.
        // Distinct dot shapes hold on every width (not just the two-column layout) since they're
        // a faster, glanceable way to tell the two legs apart than reading the tag text alone.
        const side = isDual ? (reversed ? 1 - (stage.legIndex ?? 0) : (stage.legIndex ?? 0)) : undefined;
        return (
          <div
            key={`${stage.tag ?? ''}-${stage.name}-${i}`}
            className={
              side === undefined
                ? 'relative pb-6 last:pb-0'
                : `relative pb-6 last:pb-0 sm:w-[calc(50%-1.5rem)] ${side === 1 ? 'sm:ml-auto' : 'sm:mr-auto'}`
            }
          >
            <div
              className={
                side === undefined
                  ? 'absolute -left-6 top-1 h-[7px] w-[7px] rounded-full bg-ink dark:bg-dark-ink'
                  : side === 1
                    ? 'absolute -left-6 top-1 h-[7px] w-[7px] rounded-full border border-ink bg-bg dark:border-dark-ink dark:bg-dark-bg'
                    : 'absolute -left-6 top-1 h-[7px] w-[7px] rounded-full bg-ink dark:bg-dark-ink sm:left-auto sm:-right-6'
              }
            />
            {stage.tag && <div className="micro-label text-ink/40 dark:text-dark-ink/40">{stage.tag}</div>}
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-sm">{stage.name}</span>
              <span className="figure text-xs shrink-0 text-ink/60 dark:text-dark-ink/60">
                {stage.date ?? stage.duration}
              </span>
            </div>
            <p className="mt-1 text-xs text-ink/60 dark:text-dark-ink/60">{stage.description}</p>
          </div>
        );
      })}
    </div>
  );
}
