import { AGENT } from '@/config/agent';

/**
 * Anonymous "discuss this with smylo" — no scenario is saved, so the message carries a plain
 * results summary rather than a share link. The signed-in / saved-scenario variant (with a
 * shareToken link) is a Phase 4/5 concern once persistence exists.
 */
export function buildAnonymousDiscussUrl(summary: string): string {
  const text = `hi smylo, i'd like to discuss my scenario:\n\n${summary}`;
  return `https://wa.me/${AGENT.whatsappNumber}?text=${encodeURIComponent(text)}`;
}
