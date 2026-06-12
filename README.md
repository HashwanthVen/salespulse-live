# SalesPulse Live

A Bloomberg-terminal-style **B2B SaaS sales pipeline command center**
delivered as a static GitHub Pages site. It's the canvas for a live
AI-assisted **agent-vs-agent demo loop**: a **Critique Agent** files
feedback as GitHub Issues, a **Builder Agent** implements them, the site
auto-redeploys, the audience watches it evolve in real time.

> Synthetic data only. No backend, no database, no auth, no build step.

---

## 🔗 Live links

| Thing | URL |
|---|---|
| **Live dashboard** | https://hashwanthven.github.io/salespulse-live/ |
| **Feedback form** (share with audience) | https://hashwanthven.github.io/salespulse-live/requests.html |
| **GitHub repo** | https://github.com/HashwanthVen/salespulse-live |
| **Issues** (where critique lands) | https://github.com/HashwanthVen/salespulse-live/issues |
| **Actions / deployments** | https://github.com/HashwanthVen/salespulse-live/actions |
| **Dashboard context (source of truth for agents)** | [`.github/agents/dashboard-context.md`](.github/agents/dashboard-context.md) |
| **Critique Agent guide** | [`.github/agents/critique-agent.md`](.github/agents/critique-agent.md) |
| **Builder Agent guide** | [`.github/agents/builder-agent.md`](.github/agents/builder-agent.md) |

Cache-busting during demos: append `?v=demo-N` (e.g.
`https://hashwanthven.github.io/salespulse-live/?v=demo-2`).

---

## 🎯 What this dashboard is

A polished, dense, terminal-style view of one quarter of synthetic sales
pipeline data, including:

- **6 headline KPIs** — Pipeline Value, Weighted Pipeline, Win Rate (TTM),
  Avg Deal Size, Sales Cycle, Pipeline Coverage
- **Pipeline Funnel** — 6 stages with stage-to-stage conversion rates
- **Forecast vs Quota** — weekly cumulative commit and best-case lines vs
  a quota target
- **Top Open Deals** — 12 opportunities, filterable by region and forecast
  category
- **Rep Leaderboard** — quota attainment, pipeline, closed-won count,
  activity score
- **Pipeline by Segment** (Enterprise / Mid-Market / SMB)
  and by **Region** (NA / EMEA / APAC / LATAM / MEA)
- **Deal Risk & Anomaly** — stalled deals, single-threaded deals, pushed
  close dates
- **AI Insights** — rotating executive narrative
- **Live Audience Feedback** — reads GitHub Issues directly via the public
  REST API, auto-refresh every 30 seconds
- A scrolling **ticker**, **function-key nav**, **command line**
  (`HELP`, `GO DEALS`, `FILTER NA`, `FCST BEST`), and **status bar**

The aesthetic is intentional: green-on-black, monospace, sharp borders,
dense panels, tabular numerics. Mirrors what a real RevOps / CRO floor
would project on a wall.

---

## 👥 Who it's for

| Persona | What they want to see in 5 seconds |
|---|---|
| **VP Sales / CRO** | "Are we going to hit number?" — commit vs quota gap, coverage, who's behind |
| **RevOps / Sales Ops** | Funnel conversion, stalled deals, forecast hygiene, rep activity outliers |
| **Sales Manager** | Their team's leaderboard slice, their top deals, deal-level risks |
| **Account Executive (AE)** | Their own deals and where they stand on attainment |
| **CFO / Finance** | Forecast accuracy and confidence around the commit number |
| **Marketing leader** | Top-of-funnel volume and qualification rate |
| **Board member** | A glance: are we ahead/behind, by how much, and what's the trend |

**Primary persona for v0.1:** VP Sales / CRO. Secondary: RevOps.

---

## 🤖 The agent-vs-agent loop

```
┌────────────────────┐     files GH issues     ┌────────────────────────────┐
│  Critique Agent    │ ───────────────────────▶│  HashwanthVen/             │
│  (reads live URL,  │                         │  salespulse-live/issues    │
│   §9 heuristics,   │                         └────────────────────────────┘
│   max 3/pass)      │                                       │
└────────────────────┘                                       │ picks oldest
        ▲                                                    ▼ high-priority
        │ next critique pass                       ┌────────────────────┐
        │ reads new state                          │  Builder Agent     │
        │                                          │  (implements,      │
        │                                          │   commits, push)   │
        │                                          └────────────────────┘
        │                                                    │
        │            ┌───────────────────────────────────────┘
        │            ▼
        │    push to main
        │    .github/workflows/pages.yml deploys
        │    https://hashwanthven.github.io/salespulse-live/ updates
        │
        └─── loop forever (or until issue backlog ≥ 8) ───┘
```

Both agents read the **same source-of-truth** before acting:
[`.github/agents/dashboard-context.md`](.github/agents/dashboard-context.md).
That file pins down:
- KPI definitions (so changes don't drift)
- Forecast categories (commit / bestcase / upside / omitted)
- Funnel stages (prospects → qualified → discovery → proposal →
  negotiation → closed-won)
- Persona priorities
- "What good looks like" / "what's not good"
- 8 critique heuristics, ranked

---

## 🚀 Run locally

No build step. Just open the file:

```powershell
start index.html
```

Or serve it:

```powershell
python -m http.server 8080
# visit http://localhost:8080
```

---

## ☁️ Deploy to GitHub Pages

`.github/workflows/pages.yml` deploys the repo root to GitHub Pages on
every push to `main` and on manual dispatch. **Pages source is already
configured to "GitHub Actions"** for this repo.

To recreate the setup elsewhere:
1. Repository → **Settings** → **Pages**
2. **Source** → **GitHub Actions**
3. Push to `main`. Done.

---

## 📝 Submitting feedback

The audience-facing form at `requests.html` is intentionally tiny — 3
fields, mobile-first:

1. **What should we change or add?** (title — required)
2. **Tell us more** (description — optional)
3. **Type** (Feature / Bug / UI polish / Insight)

Tap **▶ SUBMIT** → new tab opens at GitHub with everything prefilled →
tap **"Submit new issue"** → it lands at
<https://github.com/HashwanthVen/salespulse-live/issues>.

Requires a free GitHub account. Once landed, the issue is fair game for
the Builder Agent to implement.

---

## 🎬 Suggested live demo flow

1. Open the live URL — let the ticker scroll and panels populate.
2. Walk the audience through the persona of the CRO at a Friday forecast
   call.
3. Open the **Feedback** form, capture an audience suggestion (or
   point them at the URL on their phones).
4. Watch the issue appear at /issues and in the **Live Audience
   Feedback** panel on the dashboard within 30 seconds.
5. Trigger the **Builder Agent** on that issue (point it at
   `.github/agents/builder-agent.md`).
6. Watch the commit land, the workflow deploy, and the dashboard update
   live.
7. Trigger the **Critique Agent** (point it at
   `.github/agents/critique-agent.md`) to file the next round of
   feedback.

---

## 📂 Repo layout

| File | Purpose |
|---|---|
| `index.html` | Main dashboard |
| `requests.html` | Mobile-first 3-field feedback form |
| `styles.css` | Green-on-black terminal theme |
| `app.js` | Dashboard behavior — ticker, clock, KPIs, funnel, chart, deals, reps, command bar, audience feed |
| `requests.js` | Form submit + live feedback feed |
| `data.js` | All synthetic sales data |
| `.nojekyll` | GitHub Pages serves files as-is |
| `.github/workflows/pages.yml` | Auto-deploy on push to main |
| `.github/ISSUE_TEMPLATE/feature_request.yml` | Structured feature form |
| `.github/ISSUE_TEMPLATE/bug_report.yml` | Structured bug form |
| `.github/agents/dashboard-context.md` | **Source of truth** for both agents (read this first) |
| `.github/agents/critique-agent.md` | Critique Agent operating guide |
| `.github/agents/builder-agent.md` | Builder Agent operating guide |

---

_Synthetic data only. Built for live AI-assisted development demos._
