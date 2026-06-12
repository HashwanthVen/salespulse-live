/* SalesPulse Live — Mock/synthetic B2B SaaS sales pipeline data
   All values are illustrative. No real customers/accounts. */
window.SALESPULSE_DATA = {
  meta: {
    period: "Q2 FY26",
    asOf:   "Jun 12, 2026",
    quotaQ: 60.0,   // $60M quarterly quota
    quotaY: 230.0,
    weeksTotal: 13, // weeks in the quarter — used to compute the pace line
    weekNow:    8   // current week index (matches trend.weeks.length)
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

  /* Top-line KPIs */
  kpis: [
    { label: "Pipeline Value",      value: "$184.2M", delta: "+12.4%",    direction: "up",   tone: "good", note: "Total weighted + unweighted." },
    { label: "Weighted Pipeline",   value: "$58.7M",  delta: "+8.1%",     direction: "up",   tone: "good", note: "Probability-adjusted." },
    { label: "Win Rate (TTM)",      value: "28.4%",   delta: "+1.6 pts",  direction: "up",   tone: "good", note: "Trailing twelve months." },
    { label: "Avg Deal Size",       value: "$142K",   delta: "-3.2%",     direction: "down", tone: "warn", note: "Down vs prior quarter." },
    { label: "Sales Cycle",         value: "68 days", delta: "-4 days",   direction: "up",   tone: "good", note: "Shortening — healthy." },
    { label: "Pipeline Coverage",   value: "3.1x",    delta: "vs 3.0x target", direction: "flat", tone: "good", note: "Above 3x rule of thumb." }
  ],

  /* Funnel stages — value at each stage + count + conversion to next.
     aging buckets show how long deals have been sitting in each stage; sums = count.
     Closed Won is terminal so has no time-in-stage aging. */
  funnel: [
    { stage: "Prospects",    value: 312.4, count: 1842, convPct: 38,   aging: { d0_14: 1100, d15_30: 540, d30_plus: 202 } },
    { stage: "Qualified",    value: 184.6, count:  712, convPct: 52,   aging: { d0_14:  420, d15_30: 220, d30_plus:  72 } },
    { stage: "Discovery",    value:  96.8, count:  402, convPct: 65,   aging: { d0_14:  210, d15_30: 130, d30_plus:  62 } },
    { stage: "Proposal",     value:  62.4, count:  221, convPct: 58,   aging: { d0_14:  120, d15_30:  65, d30_plus:  36 } },
    { stage: "Negotiation",  value:  35.8, count:  108, convPct: 71,   aging: { d0_14:   55, d15_30:  35, d30_plus:  18 } },
    { stage: "Closed Won",   value:  25.4, count:   78, convPct: null, aging: null }
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

  /* Top deals — biggest open opportunities */
  topDeals: [
    { account: "Northwind Industries",   stage: "Negotiation",  amount: 2400000, prob: 75, close: "2026-06-28", owner: "S. Rivera",   forecast: "commit",   region: "NA",   segment: "Enterprise" },
    { account: "Contoso Manufacturing",  stage: "Proposal",     amount: 1850000, prob: 60, close: "2026-07-15", owner: "L. Patel",    forecast: "bestcase", region: "EMEA", segment: "Enterprise" },
    { account: "Fabrikam Logistics",     stage: "Discovery",    amount: 1200000, prob: 35, close: "2026-08-10", owner: "M. Chen",     forecast: "upside",   region: "APAC", segment: "Mid-Market" },
    { account: "Adventure Works",        stage: "Negotiation",  amount: 1100000, prob: 80, close: "2026-06-25", owner: "S. Rivera",   forecast: "commit",   region: "NA",   segment: "Enterprise" },
    { account: "Tailwind Traders",       stage: "Proposal",     amount:  980000, prob: 55, close: "2026-07-08", owner: "J. Okafor",   forecast: "bestcase", region: "NA",   segment: "Enterprise" },
    { account: "Wide World Importers",   stage: "Qualified",    amount:  860000, prob: 25, close: "2026-08-22", owner: "L. Patel",    forecast: "upside",   region: "EMEA", segment: "Mid-Market" },
    { account: "Lucerne Publishing",     stage: "Negotiation",  amount:  720000, prob: 70, close: "2026-06-30", owner: "M. Chen",     forecast: "commit",   region: "EMEA", segment: "Mid-Market" },
    { account: "Litware Inc.",           stage: "Proposal",     amount:  680000, prob: 50, close: "2026-07-20", owner: "K. Yamada",   forecast: "bestcase", region: "APAC", segment: "Enterprise" },
    { account: "Proseware Systems",      stage: "Discovery",    amount:  540000, prob: 30, close: "2026-08-30", owner: "J. Okafor",   forecast: "upside",   region: "NA",   segment: "Mid-Market" },
    { account: "Margie's Travel",        stage: "Negotiation",  amount:  480000, prob: 65, close: "2026-07-05", owner: "S. Rivera",   forecast: "commit",   region: "NA",   segment: "SMB" },
    { account: "Trey Research",          stage: "Proposal",     amount:  420000, prob: 55, close: "2026-07-18", owner: "L. Patel",    forecast: "bestcase", region: "EMEA", segment: "Mid-Market" },
    { account: "Graphic Design Inst.",   stage: "Negotiation",  amount:  380000, prob: 85, close: "2026-06-20", owner: "M. Chen",     forecast: "commit",   region: "APAC", segment: "SMB" }
  ],

  /* Rep leaderboard */
  reps: [
    { name: "S. Rivera",   region: "NA",   quota: 4200000, attain: 102, pipeline: 8400000, won: 12, activity: 94 },
    { name: "L. Patel",    region: "EMEA", quota: 3800000, attain:  88, pipeline: 7100000, won:  9, activity: 87 },
    { name: "M. Chen",     region: "APAC", quota: 3600000, attain:  76, pipeline: 6400000, won:  8, activity: 81 },
    { name: "J. Okafor",   region: "NA",   quota: 3400000, attain:  64, pipeline: 5800000, won:  7, activity: 72 },
    { name: "K. Yamada",   region: "APAC", quota: 3200000, attain:  58, pipeline: 4900000, won:  6, activity: 68 },
    { name: "E. Sokolova", region: "EMEA", quota: 3000000, attain:  41, pipeline: 3700000, won:  4, activity: 55 }
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
    { text: "Litware Inc. — competitor mentioned in last call notes",       severity: "Medium" },
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

  /* AI insights — 3 rotating sets */
  insights: [
    [
      "Pipeline coverage is healthy at 3.1x, but Q2 commit-only stands at $55.9M vs $60M quota — best case is needed to hit number.",
      "Commit recovered +$3.6M WoW ($52.3M → $55.9M) — almost entirely from S. Rivera jumping 92% → 102% attainment after closing 2 large deals; concentration risk if she misses next week.",
      "S. Rivera is the clear top performer at 102% attainment with the highest activity score.",
      "Negotiation→Closed Won conversion is strong at 71%; focus on accelerating Proposal→Negotiation (currently 58%).",
      "Recommended action: have managers run pipeline reviews on the 4 deals with >$1M and slipped close dates."
    ],
    [
      "APAC has the highest growth rate (+16.5%) but lowest absolute pipeline — investment opportunity.",
      "Enterprise segment is 52% of pipeline but only 24% of deal count — deal quality is high.",
      "Activity score for E. Sokolova (55) is below threshold — coaching candidate.",
      "Recommended action: re-balance territory coverage in EMEA Mid-Market."
    ],
    [
      "Avg deal size dropped 3.2% QoQ — investigate whether discounting policies are being applied consistently.",
      "Sales cycle shortened by 4 days; mostly driven by faster Discovery→Proposal transitions.",
      "Win rate of 28.4% (TTM) trends above industry SaaS benchmark of 22%.",
      "Recommended action: document and propagate the playbook from the Negotiation stage where conversion is best-in-class."
    ]
  ],

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
