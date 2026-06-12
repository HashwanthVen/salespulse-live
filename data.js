/* SalesPulse Live — Mock/synthetic B2B SaaS sales pipeline data
   All values are illustrative. No real customers/accounts. */
window.SALESPULSE_DATA = {
  meta: {
    period: "Q2 FY26",
    asOf:   "Jun 12, 2026",
    quotaQ: 60.0,   // $60M quarterly quota
    quotaY: 230.0,
    weeksTotal: 13, // weeks in the quarter — used to compute the pace line
    weekNow:    8,  // current week index (matches trend.weeks.length)
    // Numeric snapshot of the headline forecast numbers also rendered in
    // the hero (commit $55.9M vs $60M quota, best case $69.8M, weighted
    // pipeline $58.7M). Exposed numerically here so renderers (e.g.
    // TOP-3 CONCENTRATION tile #11) don't have to parse "$X.XM" strings.
    commitM:            55.9,
    bestcaseM:          69.8,
    weightedPipelineM:  58.7
  },

  /* Prior-week snapshot — powers WHAT CHANGED SINCE LAST FORECAST panel.
     Story (intentional): commit recovered +$3.6M WoW driven entirely by
     S. Rivera jumping 92→102 (closed 2 big deals); Northwind slipped -10
     prob (now in slippage) and Litware -15 (new competitor risk), partially
     offsetting. EMEA coverage closed, Litware competitor risk opened. */
  priorSnapshot: {
    asOf: "Jun 5, 2026",
    kpis: {
      pipelineValue:    "$181.4M",
      weightedPipeline: "$56.2M",
      winRate:          "27.8%",
      avgDealSize:      "$146K",
      salesCycle:       "70 days",
      coverage:         "3.0x"
    },
    commit:   52.3,
    bestcase: 66.1,
    dealProbDeltas: [
      { account: "Northwind Industries", oldProb: 85, newProb: 75, amount: 2400000 },
      { account: "Adventure Works",      oldProb: 65, newProb: 80, amount: 1100000 },
      { account: "Lucerne Publishing",   oldProb: 55, newProb: 70, amount:  720000 },
      { account: "Litware Inc.",         oldProb: 65, newProb: 50, amount:  680000 },
      { account: "Margie's Travel",      oldProb: 50, newProb: 65, amount:  480000 }
    ],
    repAttainDeltas: [
      { name: "S. Rivera",   oldAttain:  92, newAttain: 102 },
      { name: "M. Chen",     oldAttain:  82, newAttain:  76 },
      { name: "E. Sokolova", oldAttain:  38, newAttain:  41 }
    ],
    newRisks:    ["Litware Inc. — competitor mentioned in last call notes"],
    closedRisks: ["EMEA pipeline coverage below 2x"]
  },

  /* Top-line KPIs (default = ALL motions). When the NEW vs EXPANSION lens
     toggle is non-ALL, renderKpis() uses kpisByMotion[currentMotion] instead. */
  kpis: [
    { label: "Pipeline Value",      value: "$184.2M", delta: "+12.4%",    direction: "up",   tone: "good", note: "Total weighted + unweighted." },
    { label: "Weighted Pipeline",   value: "$58.7M",  delta: "+8.1%",     direction: "up",   tone: "good", note: "Probability-adjusted." },
    { label: "Win Rate (TTM)",      value: "28.4%",   delta: "+1.6 pts",  direction: "up",   tone: "good", note: "Trailing twelve months." },
    { label: "Avg Deal Size",       value: "$142K",   delta: "-3.2%",     direction: "down", tone: "warn", note: "Down vs prior quarter." },
    { label: "Sales Cycle",         value: "68 days", delta: "-4 days",   direction: "up",   tone: "good", note: "Shortening — healthy." },
    { label: "Pipeline Coverage",   value: "3.1x",    delta: "vs 3.0x target", direction: "flat", tone: "good", note: "Above 3x rule of thumb." }
  ],

  /* NEW vs EXPANSION lens — when the motion toggle is set, renderKpis()
     swaps the entire 6-tile snapshot for the matching motion. The two
     snapshots intentionally diverge on win rate and sales cycle so the
     strategic story (expansion is a higher-ROI, shorter-cycle motion) is
     visible at a glance. */
  kpisByMotion: {
    new: [
      { label: "Pipeline Value",      value: "$110.5M", delta: "+10.8%",   direction: "up",   tone: "good", note: "New logo (60% of overall pipeline)." },
      { label: "Weighted Pipeline",   value: "$24.3M",  delta: "+6.2%",    direction: "up",   tone: "warn", note: "Low win rate drags weighted value down." },
      { label: "Win Rate (TTM)",      value: "22.0%",   delta: "+0.8 pts", direction: "up",   tone: "warn", note: "New logo wins less; investment-heavy." },
      { label: "Avg Deal Size",       value: "$118K",   delta: "-2.1%",    direction: "down", tone: "warn", note: "Smaller new-logo land deals." },
      { label: "Sales Cycle",         value: "88 days", delta: "-2 days",  direction: "up",   tone: "warn", note: "Longer cycle for net-new buyers." },
      { label: "Pipeline Coverage",   value: "3.6x",    delta: "vs 3.5x target", direction: "flat", tone: "good", note: "Need higher coverage for lower-win motion." }
    ],
    expansion: [
      { label: "Pipeline Value",      value: "$73.7M",  delta: "+15.1%",   direction: "up",   tone: "good", note: "Expansion / upsell / renewal (40% of pipeline)." },
      { label: "Weighted Pipeline",   value: "$34.4M",  delta: "+12.5%",   direction: "up",   tone: "good", note: "High win rate pulls weighted value up." },
      { label: "Win Rate (TTM)",      value: "40.0%",   delta: "+2.4 pts", direction: "up",   tone: "good", note: "Existing customers convert ~2x new logo." },
      { label: "Avg Deal Size",       value: "$185K",   delta: "-4.1%",    direction: "down", tone: "warn", note: "Larger ASP but discounting on renewals." },
      { label: "Sales Cycle",         value: "42 days", delta: "-6 days",  direction: "up",   tone: "good", note: "Half the new-logo cycle — fast motion." },
      { label: "Pipeline Coverage",   value: "2.5x",    delta: "vs 2.5x target", direction: "flat", tone: "good", note: "Less coverage needed at 40% win rate." }
    ]
  },

  /* Headline NEW vs EXPANSION split used by the mini stacked-bar in the
     PIPELINE BY SEGMENT panel. Shares sum to 100. */
  motionSplit: {
    new:       { value: 110.5, share: 60, winRate: 22 },
    expansion: { value:  73.7, share: 40, winRate: 40 }
  },

  /* Funnel stages — value at each stage + count + conversion to next.
     aging buckets show how long deals have been sitting in each stage; sums = count.
     Closed Won is terminal so has no time-in-stage aging.
     motionMix breaks each stage's value into New Logo / Expansion shares —
     expansion's share grows down the funnel because it converts better. */
  funnel: [
    { stage: "Prospects",    value: 312.4, count: 1842, convPct: 38,   aging: { d0_14: 1100, d15_30: 540, d30_plus: 202 }, motionMix: { new: 0.70, expansion: 0.30 }, medianDaysInStage: 12 },
    { stage: "Qualified",    value: 184.6, count:  712, convPct: 52,   aging: { d0_14:  420, d15_30: 220, d30_plus:  72 }, motionMix: { new: 0.65, expansion: 0.35 }, medianDaysInStage:  9 },
    { stage: "Discovery",    value:  96.8, count:  402, convPct: 65,   aging: { d0_14:  210, d15_30: 130, d30_plus:  62 }, motionMix: { new: 0.60, expansion: 0.40 }, medianDaysInStage: 14 },
    { stage: "Proposal",     value:  62.4, count:  221, convPct: 58,   aging: { d0_14:  120, d15_30:  65, d30_plus:  36 }, motionMix: { new: 0.55, expansion: 0.45 }, medianDaysInStage: 22 },
    { stage: "Negotiation",  value:  35.8, count:  108, convPct: 71,   aging: { d0_14:   55, d15_30:  35, d30_plus:  18 }, motionMix: { new: 0.50, expansion: 0.50 }, medianDaysInStage: 11 },
    { stage: "Closed Won",   value:  25.4, count:   78, convPct: null, aging: null,                                          motionMix: { new: 0.45, expansion: 0.55 }, medianDaysInStage: null }
  ],

  /* Forecast vs Quota trend (last 8 weeks, weighted commit).
     forecastAccuracy = TTM (trailing twelve months) avg miss vs commit, used
     to draw the confidence band around the commit series.
     pace = linear $0 → quotaQ across 13 weeks, sampled at W1..W8 — the
     "are we ahead or behind pace?" reference line. */
  trend: {
    weeks: ["W1","W2","W3","W4","W5","W6","W7","W8"],
    commit:   [12.4, 18.7, 24.8, 30.2, 36.5, 42.8, 49.6, 55.9],   // running attainment
    bestcase: [14.8, 22.5, 30.1, 37.8, 45.6, 53.2, 61.4, 69.8],
    quota:    [60.0, 60.0, 60.0, 60.0, 60.0, 60.0, 60.0, 60.0],
    pace:     [4.62, 9.23, 13.85, 18.46, 23.08, 27.69, 32.31, 36.92],
    forecastAccuracy: 0.07
  },

  /* External BENCHMARKS (#30) — every internal KPI placed vs an industry
     P25 / P50 / P75 quartile so the CFO / Board / CMO conversation can move
     from "is it changing?" (#10 WoW, #22 YoY) to "are we good?". MOCK DATA:
     Pavilion publishes real Operator Benchmarks but specific values here are
     illustrative for the demo. Replace with actual Pavilion subscriber data
     in production. The `hib` flag is "higher-is-better" — false for
     forecastAccuracy and salesCycleDays where lower = top-quartile, so the
     ★ glyph + percentile must invert in the renderer. `pct` is the
     pre-computed percentile placement (0-100) used by the chip + INDEX.  */
  benchmarks: {
    source:    "Pavilion SaaS Operator Benchmarks (Mid-Market $50-100M ARR cohort)",
    sourceUrl: "https://www.joinpavilion.com/benchmarks",
    asOf:      "2024-Q4",
    sampleN:   312,
    kpis: {
      winRate:           { label: "WIN RATE",    p25: 0.21, p50: 0.27, p75: 0.34,  ours: 0.27,  ourLabel: "27%",   fmt: "pct",  hib: true,  pct: 50, kpiKey: "Win Rate (TTM)" },
      salesCycleDays:    { label: "SALES CYCLE", p25: 102,  p50: 84,   p75: 64,    ours: 68,    ourLabel: "68d",   fmt: "days", hib: false, pct: 72, kpiKey: "Sales Cycle" },
      asp:               { label: "ASP",         p25: 142,  p50: 178,  p75: 235,   ours: 198,   ourLabel: "$198K", fmt: "k",    hib: true,  pct: 58, kpiKey: "Avg Deal Size" },
      coverageRatio:     { label: "COVERAGE",    p25: 2.4,  p50: 3.1,  p75: 4.0,   ours: 3.0,   ourLabel: "3.0x",  fmt: "x",    hib: true,  pct: 48, kpiKey: "Pipeline Coverage" },
      forecastAccuracy:  { label: "FCST ACC",    p25: 0.12, p50: 0.08, p75: 0.05,  ours: 0.051, ourLabel: "±5.1%", fmt: "pct",  hib: false, pct: 74, kpiKey: null },
      pipegenToQuota:    { label: "PIPEGEN",     p25: 0.18, p50: 0.24, p75: 0.32,  ours: 0.21,  ourLabel: "21%",   fmt: "pct",  hib: true,  pct: 34, kpiKey: null },
      mktSourceShare:    { label: "MKT SOURCE",  p25: 0.25, p50: 0.32, p75: 0.41,  ours: 0.38,  ourLabel: "38%",   fmt: "pct",  hib: true,  pct: 65, kpiKey: null },
      qualifiedNewLogos: { label: "NEW LOGOS",   p25: 4,    p50: 7,    p75: 12,    ours: 6,     ourLabel: "6",     fmt: "int",  hib: true,  pct: 40, kpiKey: null },
      earnedCommitRatio: { label: "EARNED %",    p25: 0.55, p50: 0.70, p75: 0.82,  ours: 0.65,  ourLabel: "65%",   fmt: "pct",  hib: true,  pct: 40, kpiKey: null },
      pipelineSurvival:  { label: "PIPE SURVIVAL", p25: 0.32, p50: 0.41, p75: 0.52, ours: 0.462, ourLabel: "46.2%", fmt: "pct",  hib: true,  pct: 58, kpiKey: null }
    }
  },

  /* SCENARIO MODELER (#31) — lever-driven what-if. Each lever has options
     with deterministic delta values that get summed against the baseline.
     Baseline is recomputed at render time from the live forecast/trend so a
     reconciliation guard fires if values drift. Designed to make the dashboard
     prescriptive — the CRO's weekly "if Northwind closes, where do we land?"
     question is now answerable in one click. */
  scenario: {
    levers: [
      { id: "northwind", label: "NORTHWIND $2.4M outcome", crossRef: null, options: [
        { value: "closes",       label: "Closes this Q",         deltaCommit: +2.4, deltaUpside:  0,   deltaQ3Coverage:  0,    note: "Best case — clears the single-thread risk" },
        { value: "on-track",     label: "On-track (current)",    deltaCommit:  0,   deltaUpside:  0,   deltaQ3Coverage:  0,    note: "Status quo (default)" },
        { value: "slips-next-q", label: "Slips to Q3",           deltaCommit: -2.4, deltaUpside: +2.4, deltaQ3Coverage: +0.1,  note: "Pushes to next quarter" },
        { value: "lost",         label: "Lost to competitor",    deltaCommit: -2.4, deltaUpside: -2.4, deltaQ3Coverage:  0,    note: "Worst case" }
      ], defaultValue: "on-track" },
      { id: "yamada-bias", label: "K.YAMADA bias unwind", crossRef: null, options: [
        { value: "fully-unwinds", label: "Fully unwinds",  deltaCommit: -1.6, deltaUpside:  0,   deltaQ3Coverage: 0, note: "All over-committed deals slip" },
        { value: "half-unwinds",  label: "Half unwinds",   deltaCommit: -0.8, deltaUpside:  0,   deltaQ3Coverage: 0, note: "Half of over-committed deals slip" },
        { value: "status-quo",    label: "Status quo",     deltaCommit:  0,   deltaUpside:  0,   deltaQ3Coverage: 0, note: "Current (default)" },
        { value: "holds-firm",    label: "Holds firm",     deltaCommit: +0.4, deltaUpside:  0,   deltaQ3Coverage: 0, note: "All over-committed deals close" }
      ], defaultValue: "status-quo" },
      { id: "exec-sponsor", label: "EXEC SPONSOR coverage push", crossRef: "#29 BIG BETS", options: [
        { value: "assign-all-big-bets", label: "Assign all big bets", deltaCommit: +0.9, deltaUpside: +0.6, deltaQ3Coverage: 0, note: "Pavilion data: +12% win-rate lift on deals ≥ $1M" },
        { value: "none",                label: "None (current)",      deltaCommit:  0,   deltaUpside:  0,   deltaQ3Coverage: 0, note: "Status quo (1 of 4 big bets unassigned)" }
      ], defaultValue: "none" },
      { id: "win-rate-bump", label: "Win-rate → Pavilion P50", crossRef: "#30 BENCHMARKS", options: [
        { value: "normalize",  label: "Normalize to P50", deltaCommit: +1.4, deltaUpside: +0.4, deltaQ3Coverage: 0, note: "+4pp win-rate on late-stage deals" },
        { value: "status-quo", label: "Status quo",        deltaCommit:  0,   deltaUpside:  0,   deltaQ3Coverage: 0, note: "Current 27% (at P50 already)" }
      ], defaultValue: "status-quo" },
      { id: "pipegen-bump", label: "Pipegen → Pavilion P50", crossRef: "#30 BENCHMARKS", options: [
        { value: "normalize-next-q", label: "Normalize next Q",  deltaCommit: 0, deltaUpside: 0, deltaQ3Coverage: +0.5, note: "+$15.2M Q3 pipeline if pipegen normalizes" },
        { value: "status-quo",       label: "Status quo",        deltaCommit: 0, deltaUpside: 0, deltaQ3Coverage:  0,   note: "Current 21% (below P50)" }
      ], defaultValue: "status-quo" }
    ],
    presets: {
      baseline: { northwind: "on-track", "yamada-bias": "status-quo", "exec-sponsor": "none",                "win-rate-bump": "status-quo", "pipegen-bump": "status-quo" },
      best:     { northwind: "closes",   "yamada-bias": "holds-firm", "exec-sponsor": "assign-all-big-bets", "win-rate-bump": "normalize",  "pipegen-bump": "normalize-next-q" },
      worst:    { northwind: "lost",     "yamada-bias": "fully-unwinds","exec-sponsor": "none",              "win-rate-bump": "status-quo", "pipegen-bump": "status-quo" },
      stress:   { northwind: "slips-next-q","yamada-bias":"half-unwinds","exec-sponsor": "none",             "win-rate-bump": "status-quo", "pipegen-bump": "status-quo" }
    },
    baseline: { commit: 52.3, upside: 66.1, quota: 60.0, q3Coverage: 2.0 }
  },

  /* Top deals — biggest open opportunities.
     motion = "new" (net-new logo) or "expansion" (upsell / renewal).
     Distribution: ~58% new / 42% expansion; every region and segment is
     represented in BOTH motions so the lens filter never empties a slice. */
  topDeals: [
    { account: "Northwind Industries",   stage: "Negotiation",  amount: 2400000, prob: 75, close: "2026-06-28", owner: "S. Rivera",   forecast: "commit",   region: "NA",   segment: "Enterprise",  motion: "new",       nextStep: null,                                                                                                  engagement: { score: 78, lastTouchDays:  3, touchpoints14d:  8, multiThreaded: true,  trend: "down" }, meddic: { M: true,  E: true,  D1: false, D2: false, I: true,  C: false, P: false, Cm: true  }, reach: { champion: 2, economicBuyer: 0, decisionMaker: 0, influencer: 1, techEvaluator: 1 } },
    { account: "Contoso Manufacturing",  stage: "Proposal",     amount: 1850000, prob: 60, close: "2026-07-15", owner: "L. Patel",    forecast: "bestcase", region: "EMEA", segment: "Enterprise",  motion: "expansion", nextStep: { action: "Pricing approval",      dueDate: "2026-06-15", daysFromNow:  3 }, engagement: { score: 82, lastTouchDays:  2, touchpoints14d: 10, multiThreaded: true,  trend: "up"   }, meddic: { M: true,  E: true,  D1: true,  D2: false, I: true,  C: true,  P: false, Cm: true  }, reach: { champion: 2, economicBuyer: 2, decisionMaker: 2, influencer: 1, techEvaluator: 2 } },
    { account: "Fabrikam Logistics",     stage: "Discovery",    amount: 1200000, prob: 35, close: "2026-08-10", owner: "M. Chen",     forecast: "upside",   region: "APAC", segment: "Mid-Market",  motion: "new",       nextStep: null,                                                                                                  engagement: { score: 28, lastTouchDays: 21, touchpoints14d:  1, multiThreaded: false, trend: "down" }, meddic: { M: true,  E: false, D1: false, D2: false, I: true,  C: false, P: false, Cm: false }, reach: { champion: 1, economicBuyer: 0, decisionMaker: 0, influencer: 0, techEvaluator: 1 } },
    { account: "Adventure Works",        stage: "Negotiation",  amount: 1100000, prob: 80, close: "2026-06-25", owner: "S. Rivera",   forecast: "commit",   region: "NA",   segment: "Enterprise",  motion: "expansion", nextStep: { action: "Mutual close plan",     dueDate: "2026-06-18", daysFromNow:  6 }, engagement: { score: 88, lastTouchDays:  1, touchpoints14d: 12, multiThreaded: true,  trend: "up"   }, meddic: { M: true,  E: true,  D1: true,  D2: true,  I: true,  C: true,  P: false, Cm: true  }, reach: { champion: 2, economicBuyer: 2, decisionMaker: 1, influencer: 2, techEvaluator: 2 } },
    { account: "Tailwind Traders",       stage: "Proposal",     amount:  980000, prob: 55, close: "2026-07-08", owner: "J. Okafor",   forecast: "bestcase", region: "NA",   segment: "Enterprise",  motion: "new",       nextStep: { action: "Demo with CTO",         dueDate: "2026-06-17", daysFromNow:  5 }, engagement: { score: 72, lastTouchDays:  4, touchpoints14d:  6, multiThreaded: true,  trend: "flat" }, meddic: { M: true,  E: true,  D1: false, D2: false, I: true,  C: true,  P: false, Cm: true  }, reach: { champion: 2, economicBuyer: 1, decisionMaker: 0, influencer: 1, techEvaluator: 2 } },
    { account: "Wide World Importers",   stage: "Qualified",    amount:  860000, prob: 25, close: "2026-08-22", owner: "L. Patel",    forecast: "upside",   region: "EMEA", segment: "Mid-Market",  motion: "new",       nextStep: { action: "Champion meeting",      dueDate: "2026-06-14", daysFromNow:  2 }, engagement: { score: 58, lastTouchDays:  8, touchpoints14d:  4, multiThreaded: false, trend: "flat" }, meddic: { M: true,  E: false, D1: false, D2: false, I: true,  C: false, P: false, Cm: true  }, reach: { champion: 2, economicBuyer: 1, decisionMaker: 0, influencer: 2, techEvaluator: 1 } },
    { account: "Lucerne Publishing",     stage: "Negotiation",  amount:  720000, prob: 70, close: "2026-06-30", owner: "M. Chen",     forecast: "commit",   region: "EMEA", segment: "Mid-Market",  motion: "new",       nextStep: { action: "Legal redline",         dueDate: "2026-06-05", daysFromNow: -7 }, engagement: { score: 42, lastTouchDays: 11, touchpoints14d:  2, multiThreaded: false, trend: "down" }, meddic: { M: true,  E: true,  D1: true,  D2: false, I: true,  C: false, P: false, Cm: true  }, reach: { champion: 2, economicBuyer: 2, decisionMaker: 1, influencer: 1, techEvaluator: 0 } },
    { account: "Litware Inc.",           stage: "Proposal",     amount:  680000, prob: 50, close: "2026-07-20", owner: "K. Yamada",   forecast: "bestcase", region: "APAC", segment: "Enterprise",  motion: "expansion", nextStep: { action: "Security questionnaire", dueDate: "2026-06-16", daysFromNow:  4 }, engagement: { score: 51, lastTouchDays:  9, touchpoints14d:  3, multiThreaded: true,  trend: "down" }, meddic: { M: true,  E: false, D1: false, D2: false, I: true,  C: false, P: false, Cm: true  }, reach: { champion: 2, economicBuyer: 1, decisionMaker: 0, influencer: 2, techEvaluator: 1 } },
    { account: "Proseware Systems",      stage: "Discovery",    amount:  540000, prob: 30, close: "2026-08-30", owner: "J. Okafor",   forecast: "upside",   region: "NA",   segment: "Mid-Market",  motion: "new",       nextStep: { action: "Procurement review",    dueDate: "2026-06-19", daysFromNow:  7 }, engagement: { score: 68, lastTouchDays:  5, touchpoints14d:  5, multiThreaded: true,  trend: "flat" }, meddic: { M: true,  E: true,  D1: false, D2: false, I: true,  C: true,  P: false, Cm: false }, reach: { champion: 2, economicBuyer: 2, decisionMaker: 0, influencer: 1, techEvaluator: 1 } },
    { account: "Margie's Travel",        stage: "Negotiation",  amount:  480000, prob: 65, close: "2026-07-05", owner: "S. Rivera",   forecast: "commit",   region: "NA",   segment: "SMB",         motion: "expansion", nextStep: { action: "Renewal terms",         dueDate: "2026-06-09", daysFromNow: -3 }, engagement: { score: 64, lastTouchDays:  6, touchpoints14d:  4, multiThreaded: true,  trend: "flat" }, meddic: { M: true,  E: true,  D1: true,  D2: false, I: true,  C: true,  P: false, Cm: true  }, reach: { champion: 2, economicBuyer: 2, decisionMaker: 1, influencer: 1, techEvaluator: 1 } },
    { account: "Trey Research",          stage: "Proposal",     amount:  420000, prob: 55, close: "2026-07-18", owner: "L. Patel",    forecast: "bestcase", region: "EMEA", segment: "Mid-Market",  motion: "expansion", nextStep: { action: "Pricing approval",      dueDate: "2026-06-13", daysFromNow:  1 }, engagement: { score: 76, lastTouchDays:  3, touchpoints14d:  7, multiThreaded: true,  trend: "up"   }, meddic: { M: true,  E: true,  D1: true,  D2: false, I: true,  C: false, P: false, Cm: true  }, reach: { champion: 2, economicBuyer: 2, decisionMaker: 1, influencer: 2, techEvaluator: 2 } },
    { account: "Graphic Design Inst.",   stage: "Negotiation",  amount:  380000, prob: 85, close: "2026-06-20", owner: "M. Chen",     forecast: "commit",   region: "APAC", segment: "SMB",         motion: "new",       nextStep: { action: "Demo with CTO",         dueDate: "2026-06-15", daysFromNow:  3 }, engagement: { score: 85, lastTouchDays:  2, touchpoints14d:  9, multiThreaded: true,  trend: "up"   }, meddic: { M: true,  E: true,  D1: true,  D2: true,  I: true,  C: true,  P: false, Cm: true  }, reach: { champion: 2, economicBuyer: 2, decisionMaker: 2, influencer: 2, techEvaluator: 2 } }
  ],

  /* Per-deal EXEC SPONSOR coverage (#33 DEAL HEALTH SCORE + #34 EARNED vs
     SOFT COMMIT). Mapped by account so the deal rows stay one-liner-readable.
     Only deals ≥ $1M materially need an exec sponsor (Pavilion data: +12%
     win-rate lift on big bets) — smaller deals default to "n/a". Story:
     Northwind + Fabrikam are unassigned (the big-bet coverage gap that
     SCENARIO MODELER lever exposes); Contoso + Adventure Works are covered. */
  dealExecSponsors: {
    "Northwind Industries":  false,
    "Contoso Manufacturing": true,
    "Fabrikam Logistics":    false,
    "Adventure Works":       true
  },

  /* nextStep meta — daysFromNow is computed against meta.asOf (Jun 12, 2026) at
     data-author time so render is trivial; in a real system this would be live.
     engagement (#14) — per-deal momentum signal. score is a 0-100 composite
     roughly = clamp(100 - min(lastTouchDays*5,60) + min(touchpoints14d*3,30) + (multiThreaded?10:0), 0, 100).
     trend is relative to the prior week snapshot. Story: 4 of 12 are DOWN
     (Northwind cooling toward slip · Fabrikam ghosting · Lucerne legal stall ·
     Litware security stall) — combined $3.1M weighted in commit/bestcase. */

  /* Per-deal DETAIL EXTRAS (#32 DEAL DETAIL EXPANDER).
     Only the "human-readable" pieces are stored here per deal: free-text
     notes + named stakeholders + a per-letter MEDDIC note. The activity
     timeline and the rest of the expander are synthesized by app.js from
     d.engagement / d.meddic / d.reach / d.owner — keeps data.js compact
     while still letting each expanded row read story-coherent.
     Keyed by account name. Stakeholder names use plausible mock data.
     `roleNames` keys mirror REACH role keys exactly. */
  dealDetailExtras: {
    "Northwind Industries":   { notes: "Champion strong but EB never identified after 2 attempts. Legal redlines back 03/08. Risk: single-thread on champion (#27). Recommended exec-sponsor: C. Park.",                   roleNames: { champion: { name: "J. Patel",       title: "VP Sales Ops" },         economicBuyer: null, decisionMaker: null, influencer: { name: "M. Hernandez", title: "Director RevOps" },  techEvaluator: { name: "A. Wong",      title: "IT Security" } },              meddicNotes: { M: "ROI quantified at $4.2M", E: "⚠ NOT identified",       D1: "Documented",                D2: "⚠ Steps unknown",            I: "Quantified",       C: "J.Patel strong",                       P: "⚠ Not engaged",         Cm: "Champion confirmed" } },
    "Contoso Manufacturing":  { notes: "Pricing approval at finance committee. Champion has internal alignment with EB. Demo for finance team scheduled this week.",                                                       roleNames: { champion: { name: "S. Lindqvist",   title: "VP Engineering" },       economicBuyer: { name: "R. Volkov", title: "CFO" }, decisionMaker: { name: "P. Adeyemi", title: "COO" }, influencer: { name: "K. Tanaka",   title: "Director IT" },                  techEvaluator: { name: "B. Costa",     title: "Sr Security Eng" } },         meddicNotes: { M: "TCO doc accepted",         E: "R.Volkov verbally yes",  D1: "RFI complete",              D2: "Mapped through procurement", I: "Doc'd by champion", C: "Strong",                              P: "⚠ Not yet engaged",      Cm: "Compelling event: budget cycle" } },
    "Fabrikam Logistics":     { notes: "Ghosting — no contact in 21 days. Champion ill / out per his LinkedIn. Needs revival via outbound from new owner this week or recommend close-lost.",                              roleNames: { champion: { name: "H. Mueller",     title: "Director Logistics" },   economicBuyer: null, decisionMaker: null, influencer: null,                                                            techEvaluator: { name: "Y. Nakamura",  title: "Network Eng" } },             meddicNotes: { M: "⚠ Not quantified",         E: "⚠ NOT identified",       D1: "⚠ Unknown",                 D2: "⚠ Unknown",                  I: "Pain noted",       C: "⚠ Single thread, ghosting",            P: "⚠ Unknown",             Cm: "⚠ No urgency event identified" } },
    "Adventure Works":        { notes: "Mutual close plan agreed. EB + DM both engaged. Procurement = primary blocker but in motion. Expansion (renewal + module add) — high-confidence.",                                  roleNames: { champion: { name: "E. Brennan",     title: "VP Revenue" },           economicBuyer: { name: "T. Okonkwo", title: "CRO" }, decisionMaker: { name: "L. Andersen", title: "VP Finance" }, influencer: { name: "M. Petrov", title: "Director Ops" },                techEvaluator: { name: "C. Davis",     title: "Director Security" } },       meddicNotes: { M: "$2.1M cost-takeout",       E: "T.Okonkwo signed off",   D1: "Documented",                D2: "Mapped",                     I: "Quantified",       C: "E.Brennan strong",                    P: "⚠ Not engaged",         Cm: "Renewal date 06/30" } },
    "Tailwind Traders":       { notes: "Demo with CTO scheduled. Discovery quality is high but no executive sponsor identified on our side — assign one.",                                                                  roleNames: { champion: { name: "I. Ferreira",    title: "VP Customer Ops" },      economicBuyer: { name: "G. Singh",  title: "CFO" }, decisionMaker: null, influencer: { name: "Q. Liu",      title: "Director RevOps" },               techEvaluator: { name: "F. Hassan",    title: "Sr DevOps Eng" } },           meddicNotes: { M: "Modeled, not signed",      E: "Aware, not committed",   D1: "⚠ Partial",                 D2: "⚠ Unknown",                  I: "Quantified",       C: "Strong but new",                      P: "⚠ Not engaged",         Cm: "Soft urgency" } },
    "Wide World Importers":   { notes: "Champion meeting set for this week. EB touched once via email; needs upgrade to a call. Mid-market deal, fast cycle expected if EB engages.",                                       roleNames: { champion: { name: "J. Park",        title: "VP Ops" },               economicBuyer: { name: "D. Cooper", title: "Finance Dir" }, decisionMaker: null, influencer: { name: "V. Khan",     title: "IT Ops Mgr" },                    techEvaluator: { name: "S. Larsen",    title: "Sec Engineer" } },            meddicNotes: { M: "⚠ Not quantified",         E: "⚠ Touched, not engaged", D1: "⚠ Unknown",                 D2: "⚠ Unknown",                  I: "Pain noted",       C: "J.Park engaged",                      P: "⚠ Not engaged",         Cm: "Soft" } },
    "Lucerne Publishing":     { notes: "Legal redline returned 7d late. Champion knows but has not escalated. Risk: legal is the stall — recommend assigning customer-counsel intro.",                                      roleNames: { champion: { name: "A. Rossi",       title: "Head of Editorial" },    economicBuyer: { name: "N. Williams", title: "CFO" }, decisionMaker: { name: "T. Schmidt", title: "COO" }, influencer: { name: "P. Garcia",   title: "Director Marketing" },          techEvaluator: null },                                                       meddicNotes: { M: "$0.8M efficiency case",    E: "N.Williams approved",    D1: "Documented",                D2: "Mapped",                     I: "Pain quantified",  C: "A.Rossi strong",                      P: "⚠ Not engaged",         Cm: "Legal redline blocker" } },
    "Litware Inc.":           { notes: "Security questionnaire in progress with our SecEng team. Acme RevPro mentioned in last call notes. Need to refresh battlecard + earlier exec involvement.",                          roleNames: { champion: { name: "K. Ito",         title: "Head of Eng Productivity" }, economicBuyer: { name: "M. Otieno", title: "VP Eng" }, decisionMaker: null, influencer: { name: "X. Lopez",   title: "Director Sec Eng" },          techEvaluator: { name: "Z. Kapoor",    title: "IT Sec Lead" } },             meddicNotes: { M: "⚠ Partial",                E: "M.Otieno touched only",  D1: "⚠ Competitor-driven",       D2: "⚠ Unclear",                  I: "Pain noted",       C: "Strong but cooling",                  P: "⚠ Not engaged",         Cm: "Competitive evaluation" } },
    "Proseware Systems":      { notes: "Procurement review next week. Multi-stakeholder discovery completed. Pricing pre-agreed at $540K range; champion confident.",                                                       roleNames: { champion: { name: "U. Nakamura",    title: "VP Customer Success" },  economicBuyer: { name: "O. Diallo", title: "CFO" }, decisionMaker: null, influencer: { name: "R. Ahmed",    title: "Dir Sales Ops" },                 techEvaluator: { name: "B. Murray",    title: "Sr Eng" } },                  meddicNotes: { M: "Aligned",                  E: "O.Diallo aligned",       D1: "⚠ Partial",                 D2: "⚠ Procurement-driven",       I: "Quantified",       C: "U.Nakamura strong",                   P: "⚠ Not engaged",         Cm: "End of FY pricing" } },
    "Margie's Travel":        { notes: "Renewal terms 3d overdue but on tracker — renewal is structural, only price negotiation outstanding. Low risk.",                                                                    roleNames: { champion: { name: "D. Yusuf",       title: "VP Ops" },               economicBuyer: { name: "S. Cohen",  title: "CFO" }, decisionMaker: { name: "L. Wei", title: "COO" }, influencer: { name: "G. Andersen", title: "IT Mgr" },                       techEvaluator: { name: "T. Owens",     title: "Sec Lead" } },                meddicNotes: { M: "Doc'd in renewal package", E: "S.Cohen signed off",     D1: "Documented",                D2: "Mapped",                     I: "Renewal driver",   C: "D.Yusuf strong",                      P: "⚠ Not engaged",         Cm: "Renewal date 07/05" } },
    "Trey Research":          { notes: "Pricing approval due tomorrow. Expansion — bigger module add to existing footprint. Multi-stakeholder discovery is strong.",                                                        roleNames: { champion: { name: "F. Bernard",     title: "VP R&D" },               economicBuyer: { name: "H. Olsen",  title: "CFO" }, decisionMaker: { name: "P. Reyes", title: "COO" }, influencer: { name: "K. Brooks",   title: "Dir DevOps" },                  techEvaluator: { name: "N. Hayes",     title: "Architect" } },               meddicNotes: { M: "$0.5M expansion case",     E: "H.Olsen approved",       D1: "Documented",                D2: "Mapped",                     I: "Pain quantified",  C: "F.Bernard strong",                    P: "⚠ Not engaged",         Cm: "Q-end timing" } },
    "Graphic Design Inst.":   { notes: "Demo with CTO last touch — strong signal. All MEDDIC checks except Paper-Process complete. Smallest deal, highest probability — clean close.",                                       roleNames: { champion: { name: "W. Schmidt",     title: "Head of Curriculum" },   economicBuyer: { name: "C. Park",   title: "CFO" }, decisionMaker: { name: "Y. Adams", title: "Dean of Design" }, influencer: { name: "Z. Patel",   title: "IT Director" },                  techEvaluator: { name: "Q. Bryant",    title: "Sec Lead" } },                meddicNotes: { M: "$0.4M ROI case",           E: "C.Park signed off",      D1: "Documented",                D2: "Mapped",                     I: "Quantified",       C: "W.Schmidt strong",                    P: "⚠ Not engaged",         Cm: "Academic year" } }
  },

  /* Rep leaderboard */
  reps: [
    { name: "S. Rivera",   region: "NA",   quota: 4200000, attain: 102, pipeline: 8400000, won: 12, activity: 94,
      forecastHistory: { accuracy: 88, bias: "reliable",   last4Q: [ +2,  -3,  +4,  -1] } },
    { name: "L. Patel",    region: "EMEA", quota: 3800000, attain:  88, pipeline: 7100000, won:  9, activity: 87,
      forecastHistory: { accuracy: 84, bias: "reliable",   last4Q: [ -2,  +5,  -1,  +3] } },
    { name: "M. Chen",     region: "APAC", quota: 3600000, attain:  76, pipeline: 6400000, won:  8, activity: 81,
      forecastHistory: { accuracy: 72, bias: "over-commit",last4Q: [ -8, -12,  -9,  -7] } },
    { name: "J. Okafor",   region: "NA",   quota: 3400000, attain:  64, pipeline: 5800000, won:  7, activity: 72,
      forecastHistory: { accuracy: 76, bias: "reliable",   last4Q: [ +4,  -3,  +6,  -2] } },
    { name: "K. Yamada",   region: "APAC", quota: 3200000, attain:  58, pipeline: 4900000, won:  6, activity: 68,
      forecastHistory: { accuracy: 64, bias: "over-commit",last4Q: [-15, -18, -11, -14] } },
    { name: "E. Sokolova", region: "EMEA", quota: 3000000, attain:  41, pipeline: 3700000, won:  4, activity: 55,
      forecastHistory: { accuracy: 68, bias: "sandbag",    last4Q: [+22, +18, +25, +19] } }
  ],

  /* MANAGER ROLLUP (#36 TEAM ATTAIN). 3 RVPs each owning 2 reps from D.reps.
     Sales Manager persona was the largest remaining persona gap — every
     shipped feature scaffolds rep-level (#19/21) or deal-level (#14/20/27/33)
     or org-level (KPIs). This adds the missing middle layer so the CRO can
     answer "which manager is strongest/weakest?" in one glance.
     Manager metrics (quotaSum, attainSum, attainPct, accuracyAvg, biasAvg,
     atRiskCount, healthScore) are COMPUTED at render time from D.reps so
     they stay reconciled — DO NOT hardcode aggregates. Reconciliation guard
     fires if Σ(manager.quotaSum) drifts from total D.reps quota by > $0.1M.
     Story: Park's West team strongest (Rivera 102% + Patel 88% = ~95%);
     Liu's East team weakest (Okafor 64% + Sokolova 41% = ~53% with 2 at-risk);
     Tan's Mid-Market team mid (Chen 76% + Yamada 58% = ~67% with 1 at-risk). */
  managers: [
    { id: "mgr-park", name: "C. Park",  title: "RVP, Enterprise West", reportNames: ["S. Rivera", "L. Patel"] },
    { id: "mgr-liu",  name: "M. Liu",   title: "RVP, Enterprise East", reportNames: ["J. Okafor", "E. Sokolova"] },
    { id: "mgr-tan",  name: "D. Tan",   title: "RVP, Mid-Market",      reportNames: ["M. Chen", "K. Yamada"] }
  ],

  /* Pipeline by Segment */
  segments: [
    { name: "Enterprise",  value: 96.4, deals: 38, share: 52 },
    { name: "Mid-Market",  value: 58.7, deals: 64, share: 32 },
    { name: "SMB",         value: 29.1, deals: 89, share: 16 }
  ],

  /* Pipeline by Region */
  regions: [
    { name: "North America",        value: 84.6, deals: 71, growth: "+14.2%", status: "On Track" },
    { name: "Europe",               value: 52.8, deals: 58, growth: "+8.1%",  status: "Watch" },
    { name: "Asia Pacific",         value: 38.4, deals: 49, growth: "+16.5%", status: "On Track" },
    { name: "Latin America",        value: 14.6, deals: 22, growth: "+5.6%",  status: "At Risk" },
    { name: "Middle East & Africa", value:  8.2, deals: 14, growth: "+10.8%", status: "Watch" }
  ],

  /* Stalled / at-risk deals.
     Note: the standalone "Q2 deals slipped into Q3" line was removed in v0.5 —
     the new SLIPPAGE THIS QUARTER panel owns that story end-to-end. */
  risks: [
    { text: "Northwind Industries — pushed close date 2x in last 30 days", severity: "High" },
    { text: "Fabrikam Logistics — no activity in 21 days at Discovery stage", severity: "High" },
    { text: "Wide World Importers — single-threaded (no champion identified)", severity: "Medium" },
    { text: "Litware Inc. — Acme RevPro mentioned in last call notes (top competitor: $9.5M won against us TTM)",       severity: "Medium" },
    { text: "Avg discovery-to-proposal velocity slowing in EMEA",            severity: "Low" }
  ],

  /* Slipped deals — moved from Q2 → later quarter. The single most-watched
     leading indicator of a forecast miss for CROs on Friday calls.
     totalAmount/dealCount are the in-period summary; priorQuarterAmount lets
     us show QoQ delta (this Q is worse than last Q). All accounts/owners/regions
     reuse existing pools so the panel cross-links cleanly to TOP OPEN DEALS. */
  slippage: {
    totalAmount:        7.43,   // $M slipped out of Q2
    dealCount:          6,
    priorQuarterAmount: 5.80,   // $M slipped out of Q1 (for QoQ ▲/▼)
    items: [
      { account: "Northwind Industries",  owner: "S. Rivera", region: "NA",   segment: "Enterprise",  amount: 2400000, fromClose: "2026-06-15", toClose: "2026-07-22", reason: "Procurement delay" },
      { account: "Contoso Manufacturing", owner: "L. Patel",  region: "EMEA", segment: "Enterprise",  amount: 1850000, fromClose: "2026-06-28", toClose: "2026-08-12", reason: "Legal/security review" },
      { account: "Adventure Works",       owner: "S. Rivera", region: "NA",   segment: "Enterprise",  amount: 1100000, fromClose: "2026-06-20", toClose: "2026-07-25", reason: "Budget pushed" },
      { account: "Wide World Importers",  owner: "L. Patel",  region: "EMEA", segment: "Mid-Market",  amount:  860000, fromClose: "2026-06-28", toClose: "2026-08-22", reason: "Champion left" },
      { account: "Litware Inc.",          owner: "K. Yamada", region: "APAC", segment: "Enterprise",  amount:  680000, fromClose: "2026-06-22", toClose: "2026-07-20", reason: "Pricing pushback" },
      { account: "Proseware Systems",     owner: "J. Okafor", region: "NA",   segment: "Mid-Market",  amount:  540000, fromClose: "2026-06-30", toClose: "2026-08-30", reason: "Procurement delay" }
    ]
  },

  /* WIN / LOSS REASONS (#18) — TTM trailing twelve-month win/loss intelligence.
     The playbook for next quarter is hidden in this quarter's losses. All competitor
     names are fictitious per dashboard-context.md §7. winRate (28.4%) reconciles
     with the existing Win Rate KPI tile so the dashboard tells a consistent story. */
  winLoss: {
    period: "TTM",
    asOf:   "Jun 12, 2026",
    closedWonCount:  312,
    closedLostCount: 786,
    closedWonAmount:  44.6,  // $M
    closedLostAmount: 58.2,  // $M
    winReasons: [
      { reason: "Product fit / capabilities",   pct: 32, amount: 14.3 },
      { reason: "Champion / executive sponsor", pct: 24, amount: 10.7 },
      { reason: "Price / ROI case",             pct: 18, amount:  8.0 },
      { reason: "Implementation speed",         pct: 14, amount:  6.2 },
      { reason: "Integration / ecosystem fit",  pct: 12, amount:  5.4 }
    ],
    lossReasons: [
      { reason: "Lost to competitor",          pct: 34, amount: 19.8, primaryCompetitor: "Acme RevPro" },
      { reason: "No decision / status quo",    pct: 26, amount: 15.1 },
      { reason: "Budget cut / deprioritized",  pct: 18, amount: 10.5 },
      { reason: "Price too high",              pct: 14, amount:  8.1 },
      { reason: "Missing capability",          pct:  8, amount:  4.7 }
    ],
    lossByStage: [
      { stage: "Qualified",   amount: 14.2, count: 312 },
      { stage: "Discovery",   amount: 18.6, count: 248 },
      { stage: "Proposal",    amount: 16.4, count: 146 },
      { stage: "Negotiation", amount:  9.0, count:  80 }
    ],
    competitiveSplit: [
      { competitor: "Acme RevPro",     pct: 48, amount: 9.5 },
      { competitor: "Pulsar Insights", pct: 27, amount: 5.3 },
      { competitor: "Build in-house",  pct: 15, amount: 3.0 },
      { competitor: "Other",           pct: 10, amount: 2.0 }
    ],
    trendVsPrior: {
      currentWinRate: 28.4,
      priorWinRate:   26.8,
      delta:           1.6
    }
  },

  /* NEXT-QUARTER COVERAGE (#16) — forward-looking pipeline by close-date quarter.
     Story (intentional): Q2 reconciles with existing KPIs (3.1x healthy). Q3 is
     UNDER-COVERED at 2.0x — alarm bell for board/CFO conversation. Q4 is very
     thin (1.0x) — too early but flags SDR pipeline build now.
     pipelineGenNeeded = (quotaQ × coverageTarget − unweighted) — the leveraged
     number a CRO uses to brief the CMO/SDR org. Q2 numbers reconcile exactly
     with the existing Weighted Pipeline KPI (58.7) and Coverage KPI (3.1x). */
  forwardCoverage: {
    quotas: { Q2: 60.0, Q3: 62.0, Q4: 65.0 },
    quarters: [
      { label: "Q2 FY26",   short: "Q2", isCurrent: true,  weighted: 58.7, unweighted: 184.2, dealCount: 138, weeksRemaining:  5, coverage: 3.1 },
      { label: "Q3 FY26",   short: "Q3", isCurrent: false, weighted: 41.2, unweighted: 124.4, dealCount:  92, weeksRemaining: 18, coverage: 2.0 },
      { label: "Q4 FY26",   short: "Q4", isCurrent: false, weighted: 18.6, unweighted:  62.8, dealCount:  41, weeksRemaining: 31, coverage: 1.0 }
    ],
    coverageTarget: 3.0,
    pipelineGenNeeded: { Q3: 61.6, Q4: 132.2 }   // (quotaQ × 3) − unweighted
  },

  /* YoY SAME-QUARTER COMPARE (#22) — completes the temporal matrix
     (WoW via priorSnapshot · YoY via yoyComparison · forward via
     projection #17 + forwardCoverage #16). `thisQ` values MUST reconcile
     with the existing `kpis` snapshot — renderYoyPanel() shows a
     ⚠ MISMATCH chip if drift is detected. Story: 7 of 8 KPIs are UP YoY
     (textbook growth quarter), but slippage is +45% — the lone regression
     that explains why commit feels tight despite a strong top line. */
  yoyComparison: {
    period:       "Q2 FY26",
    sameQLastYr:  "Q2 FY25",
    asOf:         "Jun 12, 2026",
    asOfLastYr:   "Jun 13, 2025",
    kpis: [
      // unit examples: "$M", "%", "pts", "days", "x"
      { key: "pipelineValue",    label: "Pipeline Value",     unit: "$M",   thisQ: 184.2, lastYr: 156.4, deltaPct: 17.8,  direction: "up",   tone: "good" },
      { key: "weightedPipeline", label: "Weighted Pipeline",  unit: "$M",   thisQ:  58.7, lastYr:  48.2, deltaPct: 21.8,  direction: "up",   tone: "good" },
      { key: "winRate",          label: "Win Rate (TTM)",     unit: "pts",  thisQ:  28.4, lastYr:  26.1, deltaPct:  2.3,  direction: "up",   tone: "good" },
      { key: "avgDealSize",      label: "Avg Deal Size",      unit: "$K",   thisQ:   142, lastYr:   128, deltaPct: 10.9,  direction: "up",   tone: "good" },
      { key: "salesCycle",       label: "Sales Cycle",        unit: "days", thisQ:    68, lastYr:    75, deltaPct: -9.3,  direction: "up",   tone: "good" },
      { key: "coverage",         label: "Pipeline Coverage",  unit: "x",    thisQ:   3.1, lastYr:   2.8, deltaPct: 10.7,  direction: "up",   tone: "good" },
      { key: "commitAtW8",       label: "Commit @ W8 / 13",   unit: "$M",   thisQ:  55.9, lastYr:  46.2, deltaPct: 21.0,  direction: "up",   tone: "good" },
      { key: "slippage",         label: "Slippage",           unit: "$M",   thisQ:   8.4, lastYr:   5.8, deltaPct: 45.1,  direction: "down", tone: "warn" }
    ],
    insightHook: "7 of 8 KPIs up YoY — the textbook growth-quarter footprint. The single regression: slippage is +45% YoY ($5.8M → $8.4M). That's the dollar amount of 'looked-good-on-paper' commit that didn't actually land in-period — and it's the friction tax behind why the strong top-line numbers don't feel like a strong quarter at the Friday call."
  },
  insights: [
    [
      "Pipeline coverage is healthy at 3.1x, but Q2 commit-only stands at $55.9M vs $60M quota — best case is needed to hit number.",
      "Projection model puts Q-end commit at $59.2M ±$4.1M — narrowly misses the $60M quota at the midpoint, with a $63.4M ceiling. Convert ~$2M of bestcase to commit by Wednesday to ride above the line. Action: pressure-test Contoso ($1.85M bestcase) and Tailwind ($0.98M bestcase) — they're the largest unconverted dollars.",
      "Commit recovered +$3.6M WoW ($52.3M → $55.9M) — almost entirely from S. Rivera jumping 92% → 102% attainment after closing 2 large deals; concentration risk if she misses next week.",
      "S. Rivera is the clear top performer at 102% attainment with the highest activity score.",
      "Negotiation→Closed Won conversion is strong at 71%; focus on accelerating Proposal→Negotiation (currently 58%).",
      "Recommended action: have managers run pipeline reviews on the 4 deals with >$1M and slipped close dates."
    ],
    [
      "APAC has the highest growth rate (+16.5%) but lowest absolute pipeline — investment opportunity.",
      "Enterprise segment is 52% of pipeline but only 24% of deal count — deal quality is high.",
      "Expansion is 40% of pipeline but ~50% of weighted pipeline (40% win rate vs 22% for new logo) — under-invested high-ROI motion.",
      "Top-3 accounts (Northwind, Contoso, Fabrikam) = ~30% of weighted pipe ($3.3M of $58.7M). If any slips, commit gap to quota widens by that amount — pressure-test these in pipe review.",
      "Pipegen ran below the $13.5M/wk target in 3 of 8 weeks (W1, W3, W7) — outbound is 42% of mix but the misses lined up with inbound-light weeks. Action: review SDR ramp + inbound campaign cadence.",
      "Q3 coverage is 2.0x vs the 3.0x target — $61.6M of unweighted pipe short with 18 weeks to Q3 start. At the current $13.5M/wk pipegen run-rate from #12 that's a 4.5-week sprint of perfect pipegen — feasible but unforgiving. Action: brief CMO + SDR leadership this week on outbound + inbound campaign acceleration; cross-reference PIPELINE CREATED panel.",
      "4 of the top-12 deals are un-defensible heading into Friday call: Northwind + Fabrikam have NO next step logged, Lucerne is 7d overdue on Legal redline, Margie's is 3d overdue on renewal terms — $4.8M weighted in commit. Manager-led pipe review on these before EOD.",
      "Momentum is DOWN on 4 of the top-12 deals (Northwind, Fabrikam, Lucerne, Litware) — combined $3.1M weighted. Prob and close date haven't moved yet, but engagement has — these are the deals most likely to slip next. Assign manager-led pipe reviews this week.",
      "Forecast reliability: 74% of committed $$ is from RELIABLE forecasters (Rivera/Patel/Okafor). K. Yamada has missed commit by 11–18% for 4 quarters straight — currently calling ~$2.4M; historical bias suggests true landing is closer to $2.0M. E. Sokolova consistently SANDBAGS by 18–25% — $1.2M of upside hidden in her best-case. Net read: discount Yamada's commit, treat Sokolova's best as commit-eligible.",
      "AT-RISK REPS coaching list: 5 of 6 reps trigger at least one watchlist rule this week. Sokolova (41% + activity 55), Yamada (58% + chronic over-commit), Chen (76% + cold Fabrikam deal + WoW −6pts), Okafor (64%), Rivera (top deal Northwind has no next step). Top-3 concentration deals are owned by 3 of these 5 reps — concentration risk compounds with rep risk. Action: open AT-RISK REPS panel before today's 1:1 prep — 30 minutes of pre-work already done.",
      "QUAL gap: Northwind ($2.4M @ 75% commit) scores 4/8 on MEDDIC — missing Decision Criteria, Decision Process, Champion, and Paper Process. It's the single largest un-defensible commit deal in the book and the lone WEAK-COMMIT alarm. Historical land rate on qual < 5/8 is ~35% below qual ≥ 6/8 — so projection's $59.2M midpoint is generous if Northwind doesn't tighten. Action: assign manager pipe-review to identify EB + champion + close-plan by Friday or move to bestcase.",
      "YoY same-quarter: 7 of 8 KPIs are UP vs Q2 FY25 — pipeline +17.8%, weighted +21.8%, commit @ W8 +21%, avg deal +10.9%, cycle −7 days. The lone regression is slippage at +45% YoY ($5.8M → $8.4M). The growth-quarter footprint is real, but slippage is the friction tax behind why a +21% commit feels tight at Friday call. Action: cross-reference SLIPPAGE THIS QUARTER panel for the 6 deals that drove $8.4M of out-of-period push — fix the playbook, not the forecast.",
      "Activity score for E. Sokolova (55) is below threshold — coaching candidate.",
      "WIN/LOSS TTM: $44.6M won vs $58.2M lost — 28.4% win rate (▲+1.6 pts QoQ). 34% of lost $$ went to competitor (Acme RevPro = 48% of that = $9.5M direct), and 26% to 'no decision / status quo' — combined ~60% of losses are NOT product gaps but URGENCY + COMPETITIVE gaps. Discovery + Proposal are the leaking stages ($35M of $58.2M lost). Action: refresh Acme RevPro battlecard + tighten Discovery qualification (urgency framing + champion test).",
      "Recommended action: re-balance territory coverage in EMEA Mid-Market."
    ],
    [
      "Avg deal size dropped 3.2% QoQ — investigate whether discounting policies are being applied consistently.",
      "Sales cycle shortened by 4 days; mostly driven by faster Discovery→Proposal transitions.",
      "Proposal stage takes 22 median days — 1.6× the 14-day benchmark — and drives most of the 68d total cycle (Prospects 12d · Qualified 9d · Discovery 14d · Proposal 22d · Negotiation 11d). The 4-day cycle improvement happened before Proposal; the friction now lives in pricing/legal templating. Action: assign Sales Ops to review pricing approval SLAs + Legal redline turnaround for in-quarter close acceleration.",
      "Win rate of 28.4% (TTM) trends above industry SaaS benchmark of 22%.",
      "Recommended action: document and propagate the playbook from the Negotiation stage where conversion is best-in-class."
    ]
  ],

  /* PIPELINE CREATED / Pipegen (#12) — weekly NEW IN / OUT / NET pipeline,
     vs the weekly target derived from quota × 3x coverage / 13 weeks.
     Story (intentional): NET is positive every week (NEW IN > OUT) but
     3 of 8 weeks were below the $13.5M target — a realistic "trending
     well but not great" pipegen narrative for the AI insight bullet.
     Marketing-source mix shows outbound dominant; inbound-light weeks
     map to the target misses. */
  pipegen: {
    weeks:        ["W1","W2","W3","W4","W5","W6","W7","W8"],
    newIn:        [12.2, 14.8, 11.6, 16.4, 13.9, 15.2, 12.8, 17.1],
    out:          [ 6.4,  7.1,  5.8,  8.2,  6.9,  7.6,  6.4,  8.5],
    weeklyTarget: 13.5,
    sourceMix: {
      outbound:  42,
      inbound:   31,
      partner:   18,
      expansion:  9
    }
  },

  /* Synthetic ticker symbols — deals, reps, segments */
  ticker: [
    { sym: "PIPE",     val: "184.2M",  chg: "+12.4%" },
    { sym: "WPIPE",    val: "58.7M",   chg: "+8.1%" },
    { sym: "WIN",      val: "28.4%",   chg: "+1.6" },
    { sym: "AVGDEAL",  val: "$142K",   chg: "-3.2%" },
    { sym: "CYCLE",    val: "68d",     chg: "-4d" },
    { sym: "COV",      val: "3.1x",    chg: "+0.1" },
    { sym: "Q2COMMIT", val: "55.9M",   chg: "-4.1M" },
    { sym: "Q2BEST",   val: "69.8M",   chg: "+9.8M" },
    { sym: "PROJ",     val: "59.2M",   chg: "±$4.1M Q-END" },
    { sym: "PIPEGEN",  val: "17.1M",   chg: "+8.6M NET" },
    { sym: "Q3COV",    val: "2.0x",    chg: "▼ under-covered" },
    { sym: "Q4COV",    val: "1.0x",    chg: "▼ thin" },
    { sym: "RELY",     val: "74%",     chg: "COMMIT $ FROM RELIABLE" },
    { sym: "RISKREP",  val: "5/6",     chg: "▼ ON COACHING LIST" },
    { sym: "QUAL",     val: "4.8/8",   chg: "▼ 1 WEAK COMMIT" },
    { sym: "YOY",      val: "+17.8%",  chg: "PIPE vs Q2 FY25" },
    { sym: "BENCH",    val: "P55",     chg: "INDEX 55 · PAVILION SaaS" },
    { sym: "INBOX",    val: "—",       chg: "ACTION QUEUE" },
    { sym: "REACH",    val: "0.67",    chg: "▼ 2 SINGLE-THREADED" },
    { sym: "SCN",      val: "STATUS-QUO", chg: "5 LEVERS · WHAT-IF" },
    { sym: "USR",      val: "FULL",    chg: "LENS PERSONA" },
    { sym: "RIVERA",   val: "102%",    chg: "+2%" },
    { sym: "PATEL",    val: "88%",     chg: "+5%" },
    { sym: "CHEN",     val: "76%",     chg: "+3%" },
    { sym: "ENT",      val: "96.4M",   chg: "+14%" },
    { sym: "MID",      val: "58.7M",   chg: "+9%" },
    { sym: "SMB",      val: "29.1M",   chg: "+6%" },
    { sym: "NA",       val: "84.6M",   chg: "+14.2%" },
    { sym: "EMEA",     val: "52.8M",   chg: "+8.1%" },
    { sym: "APAC",     val: "38.4M",   chg: "+16.5%" },
    { sym: "LATAM",    val: "14.6M",   chg: "+5.6%" }
  ]
};
