# smylo — property scenario simulator

A client-facing web app for a Singapore property agent (smylo). Buyers and sellers simulate
their transaction — buy, sell, or concurrent buy+sell — across HDB (BTO + resale), private
resale, and new launch condos. Each simulation outputs a full cost breakdown, grants, loan
affordability with binding constraint, combined cash flow timeline, and a process timeline.

Full product spec lives with the project owner; this README covers running and building the app.

## Stack

- Next.js 14 (App Router), TypeScript `strict`, Tailwind CSS
- Vitest for unit/integration tests — every file in `lib/calc/` has a sibling `.test.ts`
- Zod for scenario input schemas
- Static export (`output: 'export'`) — deployed to **Cloudflare Pages**, not Vercel

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Testing

```bash
npm test        # run the calc engine test suite once
npm run test:watch
```

All figures in `lib/calc/` are verified against hand-computed golden test cases (grants, stamp
duties, loan binding constraints) to the exact dollar.

## Building

```bash
npm run build
```

Produces a static export in `out/` (no server components with data fetching, no API routes,
images unoptimized) — this is a hard constraint for Cloudflare Pages deployment.

## Project structure

```
/app                    # routes: /, /simulate/[type]
/components             # UI primitives (Figure, RuledRow, MicroLabel, InkButton, WarningsPanel)
/lib/calc/               # pure calc engines: bsd, absd, ssd, loan, cpf, grants, resaleLevy, fees, cashflow, sellFlat, hdbSellAndBuy
/lib/schema/             # zod schemas for scenario inputs
/lib/timeline/           # HDB process timeline stage data (BTO, resale buy, resale sell)
/lib/hooks/              # client hooks (localStorage draft persistence)
/config/rates.ts         # single source of truth for all rates/amounts/ceilings/durations
/config/design.ts        # design tokens ("Editorial Utility" language)
/config/agent.ts         # agent name, WhatsApp number, whitelisted agent emails
```

## Status

- **Phase 1 (calc engines):** done — grants, BSD/ABSD/SSD, loan (LTV/MSR/TDSR binding
  constraint), CPF, resale levy, fees, cashflow. All verified against golden test cases.
- **Phase 2 (first-timer wizard):** done — `FIRST_TIMER_HDB_BUY` wizard + results screen,
  anonymous with localStorage draft persistence, expandable "how this was computed" breakdowns,
  HDB process timeline (BTO + resale).
- **Phase 3 (HDB sell & buy):** done — `HDB_SELL_AND_BUY` wizard + results screen. Pure
  second-timer buy leg only (CHG/EHG don't apply, PHG does); mixed first-timer/second-timer
  households are still an unsupported "worth a chat" stop, same as `FIRST_TIMER_HDB_BUY`'s
  second-timer gate — Step-Up grant rules aren't verified yet.
- **Phase 4+ (auth/persistence, share/compare/agent dashboard, private resale, V2):** not yet
  built.

Rates/amounts sourced from HDB, IRAS, and MAS as of the date in `config/rates.ts`'s `asOfDate`
— verify against official pages before relying on this for real transactions. Every result
screen carries an "estimates only" disclaimer for the same reason.
