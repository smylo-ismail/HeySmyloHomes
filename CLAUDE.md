# smylo — property scenario simulator

## Design ethos

**Clean, minimalist, calm.** This is the standing design directive for every screen —
"Editorial Utility": serif display headlines, mono `MicroLabel`s, ruled dividers, generous
whitespace, no decorative chrome. When in doubt, remove rather than add.

- **CTA buttons stay symmetric/uniform**, not differentiated cards with descriptions. More
  scenario-type buttons are coming (private property buy, private sell+buy, etc.) — the button
  list has to scale visually as a plain, evenly-weighted list, not a set of bespoke cards that
  gets awkward past 2-3 items. Put explanatory content in prose sections (e.g. "how it works"),
  not on the buttons themselves.
- Prefer one clear small action (a text link, a single button) over a large ambiguous click
  target. E.g. a review-step section gets one explicit "edit" link, not a whole clickable block.

## Wizard convention: consolidated review step

Every multi-step wizard's final step must be a **read-only, consolidated summary** of every
field entered so far, grouped by the step it came from, with a small "edit" link per group that
jumps back to that step. This is the primary validation surface — not per-step gating on
"next". Any missing/invalid field is flagged inline (in the accent/warning color, with the
specific reason) directly in its row within the summary, so the user sees exactly what's wrong
and where, before ever clicking submit. Full-schema validation still runs on submit as a safety
net (e.g. a stale localStorage draft from an older schema version), but should rarely fire in
practice given the summary already surfaces problems.

See `components/wizard/ReviewSummary.tsx` (shared by both wizards) for the implementation
pattern — reuse it for any new wizard rather than writing a bespoke review step.

## Other established conventions

- `config/rates.ts` is the single source of truth for every rate/amount/ceiling/duration —
  never inline one in a calc file. Every number has a comment citing its source.
- Every file in `lib/calc/` and `lib/timeline/` has a sibling `.test.ts`.
- Rate/data changes that aren't independently verifiable get a "not verified yet, worth a chat
  with smylo" warning rather than a guessed number — never fabricate a financial figure.
- Static export only (`output: 'export'` in `next.config.mjs`) — no server components with data
  fetching, no API routes, deployed to Cloudflare Workers (static assets) via `wrangler.toml`.
