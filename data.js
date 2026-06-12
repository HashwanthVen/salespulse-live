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
    { stage: "Prospects",    value: 312.4, count: 1842, convPct: 38,   aging: { d0_14: 1100, d15_30: 540, d30_plus: 202 }, motionMix: { new: 0.70, expansion: 0.30 } },
    { stage: "Qualified",    value: 184.6, count:  712, convPct: 52,   aging: { d0_14:  420, d15_30: 220, d30_plus:  72 }, motionMix: { new: 0.65, expansion: 0.35 } },
    { stage: "Discovery",    value:  96.8, count:  402, convPct: 65,   aging: { d0_14:  210, d15_30: 130, d30_plus:  62 }, motionMix: { new: 0.60, expansion: 0.40 } },
    { stage: "Proposal",     value:  62.4, count:  221, convPct: 58,   aging: { d0_14:  120, d15_30:  65, d30_plus:  36 }, motionMix: { new: 0.55, expansion: 0.45 } },
    { stage: "Negotiation",  value:  35.8, count:  108, convPct: 71,   aging: { d0_14:   55, d15_30:  35, d30_plus:  18 }, motionMix: { new: 0.50, expansion: 0.50 } },
    { stage: "Closed Won",   value:  25.4, count:   78, convPct: null, aging: null,                                          motionMix: { new: 0.45, expansion: 0.55 } }
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

  /* Top deals — biggest open opportunities.
     motion = "new" (net-new logo) or "expansion" (upsell / renewal).
     Distribution: ~58% new / 42% expansion; every region and segment is
     represented in BOTH motions so the lens filter never empties a slice. */
  topDeals: [
    { account: "Northwind Industries",   stage: "Negotiation",  amount: 2400000, prob: 75, close: "2026-06-28", owner: "S. Rivera",   forecast: "commit",   region: "NA",   segment: "Enterprise",  motion: "new",       nextStep: null,                                                                                                  engagement: { score: 78, lastTouchDays:  3, touchpoints14d:  8, multiThreaded: true,  trend: "down" } },
    { account: "Contoso Manufacturing",  stage: "Proposal",     amount: 1850000, prob: 60, close: "2026-07-15", owner: "L. Patel",    forecast: "bestcase", region: "EMEA", segment: "Enterprise",  motion: "expansion", nextStep: { action: "Pricing approval",      dueDate: "2026-06-15", daysFromNow:  3 }, engagement: { score: 82, lastTouchDays:  2, touchpoints14d: 10, multiThreaded: true,  trend: "up"   } },
    { account: "Fabrikam Logistics",     stage: "Discovery",    amount: 1200000, prob: 35, close: "2026-08-10", owner: "M. Chen",     forecast: "upside",   region: "APAC", segment: "Mid-Market",  motion: "new",       nextStep: null,                                                                                                  engagement: { score: 28, lastTouchDays: 21, touchpoints14d:  1, multiThreaded: false, trend: "down" } },
    { account: "Adventure Works",        stage: "Negotiation",  amount: 1100000, prob: 80, close: "2026-06-25", owner: "S. Rivera",   forecast: "commit",   region: "NA",   segment: "Enterprise",  motion: "expansion", nextStep: { action: "Mutual close plan",     dueDate: "2026-06-18", daysFromNow:  6 }, engagement: { score: 88, lastTouchDays:  1, touchpoints14d: 12, multiThreaded: true,  trend: "up"   } },
    { account: "Tailwind Traders",       stage: "Proposal",     amount:  980000, prob: 55, close: "2026-07-08", owner: "J. Okafor",   forecast: "bestcase", region: "NA",   segment: "Enterprise",  motion: "new",       nextStep: { action: "Demo with CTO",         dueDate: "2026-06-17", daysFromNow:  5 }, engagement: { score: 72, lastTouchDays:  4, touchpoints14d:  6, multiThreaded: true,  trend: "flat" } },
    { account: "Wide World Importers",   stage: "Qualified",    amount:  860000, prob: 25, close: "2026-08-22", owner: "L. Patel",    forecast: "upside",   region: "EMEA", segment: "Mid-Market",  motion: "new",       nextStep: { action: "Champion meeting",      dueDate: "2026-06-14", daysFromNow:  2 }, engagement: { score: 58, lastTouchDays:  8, touchpoints14d:  4, multiThreaded: false, trend: "flat" } },
    { account: "Lucerne Publishing",     stage: "Negotiation",  amount:  720000, prob: 70, close: "2026-06-30", owner: "M. Chen",     forecast: "commit",   region: "EMEA", segment: "Mid-Market",  motion: "new",       nextStep: { action: "Legal redline",         dueDate: "2026-06-05", daysFromNow: -7 }, engagement: { score: 42, lastTouchDays: 11, touchpoints14d:  2, multiThreaded: false, trend: "down" } },
    { account: "Litware Inc.",           stage: "Proposal",     amount:  680000, prob: 50, close: "2026-07-20", owner: "K. Yamada",   forecast: "bestcase", region: "APAC", segment: "Enterprise",  motion: "expansion", nextStep: { action: "Security questionnaire", dueDate: "2026-06-16", daysFromNow:  4 }, engagement: { score: 51, lastTouchDays:  9, touchpoints14d:  3, multiThreaded: true,  trend: "down" } },
    { account: "Proseware Systems",      stage: "Discovery",    amount:  540000, prob: 30, close: "2026-08-30", owner: "J. Okafor",   forecast: "upside",   region: "NA",   segment: "Mid-Market",  motion: "new",       nextStep: { action: "Procurement review",    dueDate: "2026-06-19", daysFromNow:  7 }, engagement: { score: 68, lastTouchDays:  5, touchpoints14d:  5, multiThreaded: true,  trend: "flat" } },
    { account: "Margie's Travel",        stage: "Negotiation",  amount:  480000, prob: 65, close: "2026-07-05", owner: "S. Rivera",   forecast: "commit",   region: "NA",   segment: "SMB",         motion: "expansion", nextStep: { action: "Renewal terms",         dueDate: "2026-06-09", daysFromNow: -3 }, engagement: { score: 64, lastTouchDays:  6, touchpoints14d:  4, multiThreaded: true,  trend: "flat" } },
    { account: "Trey Research",          stage: "Proposal",     amount:  420000, prob: 55, close: "2026-07-18", owner: "L. Patel",    forecast: "bestcase", region: "EMEA", segment: "Mid-Market",  motion: "expansion", nextStep: { action: "Pricing approval",      dueDate: "2026-06-13", daysFromNow:  1 }, engagement: { score: 76, lastTouchDays:  3, touchpoints14d:  7, multiThreaded: true,  trend: "up"   } },
    { account: "Graphic Design Inst.",   stage: "Negotiation",  amount:  380000, prob: 85, close: "2026-06-20", owner: "M. Chen",     forecast: "commit",   region: "APAC", segment: "SMB",         motion: "new",       nextStep: { action: "Demo with CTO",         dueDate: "2026-06-15", daysFromNow:  3 }, engagement: { score: 85, lastTouchDays:  2, touchpoints14d:  9, multiThreaded: true,  trend: "up"   } }
  ],

  /* nextStep meta — daysFromNow is computed against meta.asOf (Jun 12, 2026) at
     data-author time so render is trivial; in a real system this would be live.
     engagement (#14) — per-deal momentum signal. score is a 0-100 composite
     roughly = clamp(100 - min(lastTouchDays*5,60) + min(touchpoints14d*3,30) + (multiThreaded?10:0), 0, 100).
     trend is relative to the prior week snapshot. Story: 4 of 12 are DOWN
     (Northwind cooling toward slip · Fabrikam ghosting · Lucerne legal stall ·
     Litware security stall) — combined $3.1M weighted in commit/bestcase. */

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
      "Expansion is 40% of pipeline but ~50% of weighted pipeline (40% win rate vs 22% for new logo) — under-invested high-ROI motion.",
      "Top-3 accounts (Northwind, Contoso, Fabrikam) = ~30% of weighted pipe ($3.3M of $58.7M). If any slips, commit gap to quota widens by that amount — pressure-test these in pipe review.",
      "Pipegen ran below the $13.5M/wk target in 3 of 8 weeks (W1, W3, W7) — outbound is 42% of mix but the misses lined up with inbound-light weeks. Action: review SDR ramp + inbound campaign cadence.",
      "4 of the top-12 deals are un-defensible heading into Friday call: Northwind + Fabrikam have NO next step logged, Lucerne is 7d overdue on Legal redline, Margie's is 3d overdue on renewal terms — $4.8M weighted in commit. Manager-led pipe review on these before EOD.",
      "Momentum is DOWN on 4 of the top-12 deals (Northwind, Fabrikam, Lucerne, Litware) — combined $3.1M weighted. Prob and close date haven't moved yet, but engagement has — these are the deals most likely to slip next. Assign manager-led pipe reviews this week.",
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
    { sym: "PIPEGEN",  val: "17.1M",   chg: "+8.6M NET" },
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
