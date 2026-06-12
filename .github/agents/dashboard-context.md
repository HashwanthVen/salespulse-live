# SalesPulse Live — Dashboard Context (the source of truth)

> **Read this file first.** It is the single source of truth on **what this
> dashboard is, who it is for, and what "good" looks like**. Both the
> Critique Agent and the Builder Agent use it as the grounding context for
> every decision they make.

---

## 1. What this dashboard is

**SalesPulse Live** is a Bloomberg-terminal-style **B2B SaaS sales pipeline
command center** delivered as a static GitHub Pages site. It renders one
quarter of synthetic pipeline data (Q2 FY26) across:

- 6 headline KPIs (Pipeline Value, Weighted Pipeline, Win Rate, Avg Deal
  Size, Sales Cycle, Pipeline Coverage)
- A 6-stage pipeline funnel with stage-to-stage conversion rates
- A weekly cumulative **Forecast vs Quota** chart (commit and best case
  lines vs a dashed quota target)
- A filterable **Top Open Deals** table (account, stage, amount, prob,
  close date, owner, region, segment, forecast category)
- A **Rep Leaderboard** with quota attainment bars + activity score
- **Pipeline by Segment** (Enterprise / Mid-Market / SMB) and by **Region**
- A **Deal Risk & Anomaly** list (stalled deals, single-threaded deals,
  pushed close dates) with severity badges
- A rotating **AI Insights** panel with executive-style narrative
- A **Live Audience Feedback** panel that reads GitHub Issues from this
  repo directly via the public REST API
- A ticker, a fkey nav row, a command bar (`HELP`, `GO DEALS`, `FILTER
  EMEA`, `FCST BEST`, etc.), and a status bar

The terminal aesthetic is **intentional**: green-on-black, monospace
(IBM Plex Mono fallback chain), dense panels, sharp borders, tabular
numerics. It mirrors what a real RevOps/CRO floor would have on a wall.

---

## 2. Who it's for (personas)

| Persona | What they want to see in 5 seconds |
|---|---|
| **VP Sales / CRO** | "Are we going to hit number?" — commit vs quota gap, coverage ratio, who's behind |
| **RevOps / Sales Ops** | Funnel conversion health, stalled deals, forecast hygiene, rep activity outliers |
| **Sales Manager** | Their team's leaderboard slice, their top deals, deal-level risks |
| **Account Executive (AE)** | Their own deals and where they stand on attainment |
| **CFO / Finance** | Forecast accuracy and confidence intervals around the commit number |
| **CMO / Marketing leader** | Top-of-funnel volume and qualification rate (lead → SQL → opportunity) |
| **Board member** | A glance: are we ahead/behind, by how much, and what's the trend |

**Primary persona for v0.1:** VP Sales / CRO. Secondary: RevOps.

---

## 3. Purpose

1. **One-glance situational awareness** of the quarter at any moment.
2. **Surface anomalies** before the Friday forecast call (stalled deals,
   conversion drops, rep coverage problems).
3. **Drive accountability** through the rep leaderboard.
4. **Tell a story** with the AI Insights panel — turn numbers into
   executive narrative.
5. **Be the canvas** for a live AI-assisted demo: audience submits feedback,
   coding agents implement it, dashboard rebuilds and redeploys live.

---

## 4. KPI definitions (so changes don't drift)

Use these exact definitions when adding, renaming, or modifying KPIs.

| KPI | Definition | Display format |
|---|---|---|
| **Pipeline Value** | Sum of `amount` across all open opportunities | `$<X>M`, deltavs prior week |
| **Weighted Pipeline** | Σ `amount × probability` across open opps | `$<X>M`, delta vs prior week |
| **Win Rate (TTM)** | Closed-Won count ÷ (Closed-Won + Closed-Lost) over trailing 12 months | `<X>%`, delta in points |
| **Avg Deal Size** | Mean of closed-won `amount` over trailing quarter | `$<X>K`, delta vs prior quarter |
| **Sales Cycle** | Median days from Qualified → Closed-Won, last 90 days | `<X> days`, delta |
| **Pipeline Coverage** | Open pipeline ÷ remaining quota in current quarter | `<X.X>x`, vs 3.0x target |
| **Quota Attainment** | Closed-Won ÷ assigned quota for the period | `<X>%` |
| **Forecast Accuracy** | 1 − |actual − forecast| ÷ forecast over last 4 quarters | `<X>%` |
| **Sales Velocity** | (# opps × win rate × avg deal size) ÷ sales cycle length | `$<X>/day` |
| **Activity Score** | Composite of calls, meetings, emails, opportunities created in last 30 days, normalized 0–100 | integer 0–100 |

---

## 5. Forecast categories (must stay consistent)

Industry-standard categories used in the **Top Deals** table and trend chart:

| Category | Meaning | Inclusion rule |
|---|---|---|
| **Commit** | Will close this period — high confidence | Owner commits; counted in commit number |
| **Best Case** | Should close this period — moderate confidence | Counted in best case number |
| **Upside** | Could close, longer odds | Visibility only |
| **Omitted** | Not in this period's forecast | Excluded |

---

## 6. Sales funnel stages (must stay consistent)

The order is meaningful. Don't reorder or rename without updating
`data.js → funnel`.

1. **Prospects** — top-of-funnel leads
2. **Qualified** — MQL or SQL passed qualification criteria (BANT/MEDDIC/etc.)
3. **Discovery** — needs analysis, pain confirmed
4. **Proposal** — solution presented, pricing on the table
5. **Negotiation** — terms/contract under negotiation
6. **Closed Won** — booked

`convPct` on each stage is **conversion rate to the next stage**.

---

## 7. Data model (read this before changing data.js)

`window.SALESPULSE_DATA` is the single source of synthetic data. Shape:

```ts
{
  meta:     { period, asOf, quotaQ, quotaY },
  kpis:     KPI[],            // 6 tiles
  funnel:   Stage[],          // 6 stages in order
  trend:    { weeks, commit, bestcase, quota },  // 8 weeks
  topDeals: Deal[],           // 12 open opportunities
  reps:     Rep[],            // 6 sellers
  segments: Segment[],        // Enterprise, Mid-Market, SMB
  regions:  Region[],         // 5 regions
  risks:    Risk[],           // stalled / anomaly items
  insights: string[][],       // 3 rotating sets of 4 bullets
  ticker:   { sym, val, chg }[]  // marquee
}
```

All numbers are illustrative. **No real customer/account names. Ever.**
Account names should sound corporate-fictitious (Northwind, Contoso,
Fabrikam, Adventure Works, Tailwind, Wide World, Lucerne, Litware,
Proseware, Margie's Travel, Trey Research, Graphic Design Institute).

---

## 8. What "good" looks like (acceptance bar for any change)

A change to this dashboard is **good** if it:

- Helps the primary persona (VP Sales / CRO) answer a question faster
- Preserves the dense, terminal aesthetic (no shadcn-style rounded white
  cards; no purple gradients; no playful illustrations)
- Uses **only** the CSS variables defined in `styles.css` (`--green`,
  `--amber`, etc.) — no new hardcoded colors
- Renders correctly on a 360px-wide mobile viewport AND a 1600px desktop
- Adds zero build steps and zero new runtime dependencies
- Does not depend on any backend, database, or paid service
- Uses only the mock data in `data.js` (or adds new mock fields if needed)
- Increments asset version query strings on touched HTML (`?v=…`)
- Updates the **Release Notes** panel with a one-line summary

A change is **NOT good** if it:

- Introduces real customer data or anything that looks like real CRM data
- Adds a build step (webpack, Vite, bundlers)
- Adds a backend, auth, login, or paid SaaS dependency
- Breaks the public GitHub Pages deployment workflow
- Hardcodes secrets or tokens

---

## 9. Critique heuristics (what the Critique Agent should look for)

When the Critique Agent reviews the live dashboard and suggests
improvements, it should weigh ideas by these heuristics in order:

1. **Decision-driving info missing.** Does the dashboard fail to surface a
   metric a VP Sales would ask about in a forecast call? (Examples:
   forecast accuracy %, deal slippage count, top-3-account concentration,
   pipeline aging buckets, new-vs-expansion split.)
2. **Cognitive overload.** Is any single panel cramming too much that
   could be split or filtered?
3. **Story gap.** Are the AI Insights bullets disconnected from what the
   panels show? (Insights should reference the actual numbers visible.)
4. **Mobile breakage.** Does anything overflow, truncate, or become
   unreadable below 480px width?
5. **Action affordances.** Can the viewer act on what they see (filter,
   drill, mark reviewed) — or is everything read-only?
6. **Visual hierarchy.** Is the most important number on screen also the
   biggest / brightest / first in reading order?
7. **Trust & defensibility.** Are KPI deltas labeled with their basis
   (vs plan, vs prior period, YoY)? Ambiguous deltas erode trust.
8. **Aesthetic consistency.** Any drift from the green-on-black terminal
   look (rogue colors, fonts, gradients, shadows)?

The Critique Agent should produce **at most 3 ranked suggestions per
review pass**, each filed as a GitHub Issue using the feature_request or
bug_report template, with a brief rationale linking back to one of these
heuristics.

---

## 10. Glossary

- **TTM** — trailing twelve months
- **MQL / SQL** — marketing- / sales-qualified lead
- **BANT** — Budget Authority Need Timeline
- **MEDDIC / MEDDPICC** — Metrics, Economic buyer, Decision criteria,
  Decision process, (Paper process,) Identify pain, Champion, (Competition)
- **ARR / ACV** — annual recurring revenue / annual contract value
- **NRR** — net revenue retention
- **Pipeline Coverage** — open pipeline divided by remaining quota; 3x is
  the common rule of thumb for healthy quota attainment
- **Forecast Category** — see §5

---

_This document is intentionally long so a coding agent has zero ambiguity.
Keep it updated as the dashboard evolves._
