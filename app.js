/* SalesPulse Live — dashboard behavior (vanilla JS) */
(function () {
  "use strict";
  const D = window.SALESPULSE_DATA;
  if (!D) { console.error("SalesPulse: data not loaded"); return; }

  const GH_OWNER = "HashwanthVen";
  const GH_REPO  = "salespulse-live";

  /* ---------- NEW vs EXPANSION MOTION LENS (#9) ----------
     Global toggle in the hero strip. When non-"all", re-slices KPI DESK,
     PIPELINE FUNNEL, FORECAST vs QUOTA, TOP OPEN DEALS, PIPELINE BY
     SEGMENT, and PIPELINE BY REGION. WHAT CHANGED, SLIPPAGE, REPS,
     RISKS, INSIGHTS, AUDIENCE, RELEASE NOTES are unaffected. */
  const LS_MOTION_KEY = "salespulse.motion";
  const MOTION_VALUES = ["all", "new", "expansion"];
  const MOTION_LABEL  = { all: "ALL", new: "NEW LOGO", expansion: "EXPANSION" };
  const MOTION_CHIP_CLS = { new: "", expansion: "exp" };
  // Panels that should display a "MOTION: ..." chip when the lens is on.
  const MOTION_AFFECTED_PANELS = ["dashboard","funnel","forecast","deals","segments"];
  let currentMotion = (function () {
    try {
      const saved = localStorage.getItem(LS_MOTION_KEY);
      if (MOTION_VALUES.indexOf(saved) >= 0) return saved;
    } catch (e) { /* localStorage may be blocked */ }
    return "all";
  })();
  function motionShare(m) {
    const ms = D.motionSplit;
    if (!ms || m === "all" || !ms[m]) return 1;
    return Math.max(0, Math.min(1, (ms[m].share || 0) / 100));
  }

  /* ---------- TICKER ---------- */
  function renderTicker() {
    const track = $("ticker-track");
    if (!track) return;
    track.innerHTML = (D.ticker.concat(D.ticker)).map((t) => {
      const up = !t.chg.startsWith("-");
      return `<span class="ticker-item">
        <span class="sym">${esc(t.sym)}</span>
        <span class="val">${esc(t.val)}</span>
        <span class="chg ${up ? "up" : "down"}">${up ? "▲" : "▼"} ${esc(t.chg)}</span>
        <span class="sep">·</span>
      </span>`;
    }).join("");
  }

  /* ---------- CLOCK ---------- */
  function tickClock() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const t = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    setText("clock", t); setText("clock2", t);
  }

  /* ---------- KPI ---------- */
  // Whisper helper: maps a KPI label to the prior-snapshot key so each tile
  // can show "vs <date>: <old> → <new>" — the basis line that addresses §9.7
  // (trust & defensibility). Keeps the existing .k-note untouched.
  const KPI_PRIOR_KEY = {
    "Pipeline Value":    "pipelineValue",
    "Weighted Pipeline": "weightedPipeline",
    "Win Rate (TTM)":    "winRate",
    "Avg Deal Size":     "avgDealSize",
    "Sales Cycle":       "salesCycle",
    "Pipeline Coverage": "coverage"
  };
  function renderKpis() {
    const grid = $("kpi-grid");
    if (!grid) return;
    const ps     = D.priorSnapshot || null;
    const priorK = ps && ps.kpis || {};
    const list   = (currentMotion !== "all" && D.kpisByMotion && D.kpisByMotion[currentMotion])
      ? D.kpisByMotion[currentMotion]
      : D.kpis;
    // Whisper line uses prior snapshot only on the ALL view — per-motion
    // prior snapshots aren't tracked, and showing the global prior under
    // motion-filtered current values would be misleading.
    const showWhisper = currentMotion === "all";
    const baseTiles = list.map((k) => {
      const arrow = k.direction === "up" ? "▲" : k.direction === "down" ? "▼" : "▬";
      const pk    = KPI_PRIOR_KEY[k.label];
      const prior = pk ? priorK[pk] : null;
      const whisper = (showWhisper && prior && ps && ps.asOf)
        ? `<div class="k-whisper" title="Prior snapshot taken ${esc(ps.asOf)}">vs ${esc(ps.asOf)}: <b>${esc(prior)}</b> → <b>${esc(k.value)}</b></div>`
        : "";
      return `
        <div class="kpi ${k.tone}">
          <div class="k-label"><span>${esc(k.label)}</span><span class="badge">LIVE</span></div>
          <div class="k-value">${esc(k.value)}</div>
          <div class="k-delta ${k.direction}">${arrow} ${esc(k.delta)}</div>
          <div class="k-note">${esc(k.note)}</div>
          ${whisper}
        </div>`;
    }).join("");
    grid.innerHTML = baseTiles + renderConcentrationTile();
    bindConcentration();
    setText("kpi-stamp", "LAST UPD " + new Date().toISOString().slice(11, 19) + "Z");
  }

  /* ---------- TOP-3 CONCENTRATION (#11) ----------
     CRO/CFO "single point of failure" tile: top 3 deals (motion-filtered
     if the lens is on) and what happens to the commit gap if they slip.
     The tile is appended to #kpi-grid as a 7th tile. Clicking it scrolls
     to TOP OPEN DEALS and pulses the 3 starred rows.

     Tone bands (per acceptance):
       share < 25%  → good
       share 25-39% → warn
       share ≥ 40%  → bad
  */
  function getTop3Deals() {
    const pool = D.topDeals.filter((d) =>
      currentMotion === "all" || d.motion === currentMotion
    );
    return pool.slice().sort((a, b) => b.amount - a.amount).slice(0, 3);
  }
  function concentrationStats() {
    const top3 = getTop3Deals();
    const unweighted = top3.reduce((a, d) => a + d.amount, 0) / 1e6;
    const weighted   = top3.reduce((a, d) => a + d.amount * (d.prob / 100), 0) / 1e6;
    const meta = D.meta || {};
    // Use the motion's weighted pipeline when the lens is on, so the share
    // calculation stays internally consistent ("X of Y" with both numbers
    // in the same slice). Strip the leading "$" / trailing "M" from the
    // KPI string as the fallback for older data shapes.
    let weightedPipeM = meta.weightedPipelineM || 0;
    if (currentMotion !== "all" && D.kpisByMotion && D.kpisByMotion[currentMotion]) {
      const wp = D.kpisByMotion[currentMotion].find((k) => k.label === "Weighted Pipeline");
      if (wp) weightedPipeM = parseFloat(String(wp.value).replace(/[^0-9.]/g, "")) || weightedPipeM;
    }
    const share = weightedPipeM > 0 ? (weighted / weightedPipeM) * 100 : 0;
    const commitM = meta.commitM || 0;
    const quotaM  = meta.quotaQ  || 0;
    // "If top 3 slip": commit minus their weighted contribution, vs quota.
    // Positive = still covered, negative = miss by that amount.
    const gap = (commitM - weighted) - quotaM;
    let tone = "good";
    if (share >= 40)      tone = "bad";
    else if (share >= 25) tone = "warn";
    return { top3, unweighted, weighted, share, gap, tone };
  }
  function renderConcentrationTile() {
    const s = concentrationStats();
    if (!s.top3.length) return "";
    const sharePct = s.share.toFixed(0);
    const weightedFmt = s.weighted.toFixed(1);
    const gapAbs = Math.abs(s.gap).toFixed(1);
    const gapArrow = s.gap >= 0 ? "▲" : "▼";
    const gapWord  = s.gap >= 0 ? "STILL COVERED BY" : "MISS BY";
    const gapCls   = s.gap >= 0 ? "good" : "bad";
    const top3NoNs = s.top3.filter((d) => !d.nextStep).length;
    const nsLine   = top3NoNs > 0
      ? ` · ⚠ ${top3NoNs} of top-3 have NO NEXT STEP — pressure-test in pipe review.`
      : "";
    const tooltip = "If top 3 slip: " + s.top3.map((d) =>
      `${d.account} ($${(d.amount/1e6).toFixed(2)}M × ${d.prob}% = $${((d.amount*d.prob/100)/1e6).toFixed(2)}M weighted)`
    ).join(" · ") + nsLine;
    return `
      <div class="kpi ${s.tone} kpi-clickable" id="kpi-conc" role="button" tabindex="0"
           data-accounts="${esc(s.top3.map((d) => d.account).join("|"))}"
           title="${esc(tooltip)}"
           aria-label="Top 3 concentration: ${sharePct}% of weighted pipeline. Click to highlight top 3 in deals table.">
        <div class="k-label"><span>TOP-3 CONCENTRATION</span><span class="badge">LIVE</span></div>
        <div class="k-value">${sharePct}%</div>
        <div class="k-delta flat">OF WEIGHTED</div>
        <div class="k-note">$${weightedFmt}M IN 3 ACCOUNTS</div>
        <div class="kpi-foot ${gapCls}">IF SLIPPED: ${gapArrow} $${gapAbs}M ${gapWord} QUOTA</div>
      </div>`;
  }
  function bindConcentration() {
    const tile = $("kpi-conc");
    if (!tile) return;
    const go = () => {
      const accounts = (tile.dataset.accounts || "").split("|").filter(Boolean);
      // Clear filters so the top 3 are definitely visible, then pulse each.
      const search = $("deal-search");   if (search) search.value = "";
      const region = $("deal-region");   if (region) region.value = "all";
      const fcst   = $("deal-forecast"); if (fcst)   fcst.value   = "all";
      if (myDealsActive) { myDealsActive = false; updateMyDealsBtn(); }
      if (dealsRiskOnly) { dealsRiskOnly = false; try { localStorage.setItem(LS_RISK_KEY, "0"); } catch (e) {} }
      applyDealFilters();
      document.getElementById("deals").scrollIntoView({ behavior: "smooth", block: "start" });
      // Slight delay so the smooth-scroll lands before the pulse starts.
      setTimeout(() => accounts.forEach(highlightDealRow), 200);
    };
    tile.addEventListener("click", go);
    tile.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
    });
  }
  function topAccountSet() {
    const set = new Set();
    getTop3Deals().forEach((d) => set.add(d.account));
    return set;
  }

  /* ---------- WHAT CHANGED SINCE LAST FORECAST ---------- */
  // 4-card panel that answers the CRO's hardest Friday question: "what changed
  // since last week?" Renders commit movement, deal-probability moves, rep-
  // attainment moves, and risks added/resolved. Deal rows reuse highlightDealRow.
  function renderChanged() {
    const ps = D.priorSnapshot;
    if (!ps) return;
    setText("chg-basis", "vs SNAPSHOT FROM " + ps.asOf);

    const commit    = D.trend && D.trend.commit && D.trend.commit[D.trend.commit.length - 1];
    const prior     = ps.commit;
    const commitDiff = commit != null && prior != null ? +(commit - prior).toFixed(1) : 0;
    const commitCls = commitDiff >= 0 ? "green" : "red";
    const commitArr = commitDiff >= 0 ? "▲" : "▼";
    const bestNow   = D.trend && D.trend.bestcase && D.trend.bestcase[D.trend.bestcase.length - 1];
    const bestPrior = ps.bestcase;
    const bestDiff  = bestNow != null && bestPrior != null ? +(bestNow - bestPrior).toFixed(1) : 0;
    const bestCls   = bestDiff >= 0 ? "green" : "red";
    const bestArr   = bestDiff >= 0 ? "▲" : "▼";

    const commitEl = $("chg-commit");
    if (commitEl) {
      commitEl.innerHTML = `
        <div class="card-title">COMMIT MOVEMENT</div>
        <div class="card-big">
          <b class="green">$${commit.toFixed(1)}M</b>
          <span class="muted">←</span>
          <b>$${prior.toFixed(1)}M</b>
        </div>
        <div class="card-row">
          <span class="${commitCls}"><b>${commitArr} $${Math.abs(commitDiff).toFixed(1)}M</b></span>
          <span class="muted">commit WoW</span>
        </div>
        <div class="card-row">
          <span class="${bestCls}">${bestArr} $${Math.abs(bestDiff).toFixed(1)}M</span>
          <span class="muted">best case ($${bestPrior.toFixed(1)}M → $${bestNow.toFixed(1)}M)</span>
        </div>`;
    }

    const dealsEl = $("chg-deals");
    if (dealsEl && Array.isArray(ps.dealProbDeltas)) {
      const rows = ps.dealProbDeltas.slice(0, 4).map((d) => {
        const diff   = d.newProb - d.oldProb;
        const cls    = diff >= 0 ? "green" : "red";
        const arr    = diff >= 0 ? "▲" : "▼";
        return `
          <li class="chg-row" data-account="${esc(d.account)}" tabindex="0" role="button"
              title="Jump to ${esc(d.account)} in TOP OPEN DEALS">
            <span class="chg-acct">${esc(d.account)}</span>
            <span class="chg-mid"><b>${d.oldProb}%</b> → <b class="${cls}">${d.newProb}%</b> <span class="${cls}">${arr}${Math.abs(diff)}</span></span>
            <span class="chg-amt num">$${formatK(d.amount)}</span>
          </li>`;
      }).join("");
      dealsEl.innerHTML = `
        <div class="card-title">DEAL PROBABILITY MOVES <span class="muted" style="font-weight:400;">(${ps.dealProbDeltas.length})</span></div>
        <ul class="chg-list">${rows}</ul>`;
      const ul = dealsEl.querySelector(".chg-list");
      if (ul) {
        const handler = (e) => {
          const li = e.target.closest(".chg-row[data-account]");
          if (!li) return;
          if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          highlightDealRow(li.dataset.account);
        };
        ul.addEventListener("click", handler);
        ul.addEventListener("keydown", handler);
      }
    }

    const repsEl = $("chg-reps");
    if (repsEl && Array.isArray(ps.repAttainDeltas)) {
      const rows = ps.repAttainDeltas.slice(0, 3).map((r) => {
        const diff = r.newAttain - r.oldAttain;
        const cls  = diff >= 0 ? "green" : "red";
        const arr  = diff >= 0 ? "▲" : "▼";
        return `
          <li class="chg-row">
            <span class="chg-acct">${esc(r.name)}</span>
            <span class="chg-mid"><b>${r.oldAttain}%</b> → <b class="${cls}">${r.newAttain}%</b> <span class="${cls}">${arr}${Math.abs(diff)}</span></span>
          </li>`;
      }).join("");
      repsEl.innerHTML = `
        <div class="card-title">REP ATTAINMENT MOVES</div>
        <ul class="chg-list">${rows}</ul>`;
    }

    const risksEl = $("chg-risks");
    if (risksEl) {
      const nNew    = (ps.newRisks    || []).length;
      const nClosed = (ps.closedRisks || []).length;
      const newList = (ps.newRisks    || []).map((t) => `<li class="risk-new">✚ ${esc(t)}</li>`).join("");
      const cloList = (ps.closedRisks || []).map((t) => `<li class="risk-closed">✔ ${esc(t)}</li>`).join("");
      risksEl.innerHTML = `
        <div class="card-title">RISKS CHANGED</div>
        <div class="card-row card-row-spaced">
          <span class="red"><b>✚ ${nNew}</b> NEW</span>
          <span class="green"><b>✔ ${nClosed}</b> RESOLVED</span>
        </div>
        <button class="btn sm chg-risk-toggle" type="button" aria-expanded="false">SHOW LIST</button>
        <ul class="chg-risk-list" hidden>${newList}${cloList}</ul>`;
      const tog = risksEl.querySelector(".chg-risk-toggle");
      const lst = risksEl.querySelector(".chg-risk-list");
      if (tog && lst) {
        tog.addEventListener("click", () => {
          const open = lst.hasAttribute("hidden");
          if (open) { lst.removeAttribute("hidden"); tog.textContent = "HIDE LIST"; tog.setAttribute("aria-expanded","true"); }
          else      { lst.setAttribute("hidden",""); tog.textContent = "SHOW LIST"; tog.setAttribute("aria-expanded","false"); }
        });
      }
    }
  }

  /* ---------- FUNNEL ---------- */
  function renderFunnel() {
    const wrap = $("funnel");
    if (!wrap) return;
    // motion-scaled values: when the lens is set, apply each stage's
    // motionMix share so the bars and dollar totals reflect the slice.
    // counts/aging are also scaled (rounded) because mocked exact counts
    // per motion aren't tracked — proportional split is the honest read.
    const m = currentMotion;
    function scaled(f) {
      if (m === "all" || !f.motionMix || f.motionMix[m] == null) {
        return { value: f.value, count: f.count, aging: f.aging };
      }
      const k = f.motionMix[m];
      const aging = f.aging ? {
        d0_14:    Math.round(f.aging.d0_14    * k),
        d15_30:   Math.round(f.aging.d15_30   * k),
        d30_plus: Math.round(f.aging.d30_plus * k)
      } : null;
      return { value: +(f.value * k).toFixed(1), count: Math.round(f.count * k), aging };
    }
    const stages = D.funnel.map(scaled);
    const max = stages[0].value;
    wrap.innerHTML = D.funnel.map((f, i) => {
      const s = stages[i];
      const pct = Math.max((s.value / max) * 100, 6);
      const conv = f.convPct;
      let convCls = "";
      if (conv != null) {
        convCls = conv >= 60 ? "good" : conv >= 40 ? "warn" : "bad";
      }
      const a = s.aging;
      const buckets = a ? `
            <div class="funnel-buckets" aria-label="Deals by time in stage">
              <span class="bucket"      title="Deals 0-14 days in stage"><span class="b-lbl">0-14d</span><b>${a.d0_14}</b></span>
              <span class="bucket"      title="Deals 15-30 days in stage"><span class="b-lbl">15-30d</span><b>${a.d15_30}</b></span>
              <span class="bucket old"  title="Stalled: 30+ days in stage"><span class="b-lbl">30d+</span><b>${a.d30_plus}</b></span>
            </div>` : "";
      return `
        <div class="funnel-stage">
          <div class="funnel-name">${esc(f.stage)}</div>
          <div class="funnel-bar-col">
            <div class="funnel-bar-wrap">
              <div class="funnel-bar" style="width:${pct.toFixed(1)}%;">${s.count} DEALS</div>
            </div>${buckets}
          </div>
          <div class="funnel-amount">$${s.value.toFixed(1)}M</div>
          <div class="funnel-conv ${convCls}">${conv != null ? "↘ " + conv + "%" : "— win —"}</div>
        </div>`;
    }).join("");
  }

  /* ---------- CHART: Forecast vs Quota ---------- */
  let currentSeries = "commit";
  function renderChart(series) {
    const svg = $("chart-svg");
    const stat = $("chart-stat");
    const cap  = $("chart-caption");
    if (!svg) return;
    const W = 600, H = 240;
    const PADL = 40, PADR = 14, PADT = 18, PADB = 26;
    const innerW = W - PADL - PADR;
    const innerH = H - PADT - PADB;
    // Motion lens: scale commit/bestcase/pace contribution by the motion's
    // share of pipeline. Quota stays whole — the chart is "this motion's
    // contribution against the unchanged company quota", which is the same
    // way sales leaders read NEW vs EXPANSION attainment.
    const share      = motionShare(currentMotion);
    const motionOn   = currentMotion !== "all";
    const values     = motionOn ? D.trend[series].map((v) => +(v * share).toFixed(2)) : D.trend[series];
    const quota      = D.trend.quota;
    const weeks      = D.trend.weeks;
    const acc        = D.trend.forecastAccuracy || 0;
    const commitVals = motionOn ? D.trend.commit.map((v) => +(v * share).toFixed(2)) : D.trend.commit;
    const bestVals   = motionOn ? D.trend.bestcase.map((v) => +(v * share).toFixed(2)) : D.trend.bestcase;
    const showBand   = series === "commit" && acc > 0;

    // Pace line: linear $0 → quotaQ across meta.weeksTotal weeks, sampled
    // at the same week indices the chart shows. Prefer the precomputed
    // trend.pace array for transparency; fall back to a live compute if
    // weeksTotal exists. Either way, this is the "where commit should be
    // today to stay on a flat linear pace to quota" reference. On the
    // motion lens, pace is scaled by share too — the question becomes
    // "is this motion on pace to deliver its share of quota?".
    const weeksTotal = (D.meta && D.meta.weeksTotal) || values.length;
    const weekNow    = (D.meta && D.meta.weekNow) || values.length;
    const weeksRem   = Math.max(0, weeksTotal - weekNow);
    const quotaQ     = (D.meta && D.meta.quotaQ)     || quota[quota.length - 1];
    let pace = D.trend.pace;
    if (!Array.isArray(pace) || pace.length !== values.length) {
      pace = values.map((_, i) => +(quotaQ * ((i + 1) / weeksTotal)).toFixed(2));
    }
    if (motionOn) pace = pace.map((v) => +(v * share).toFixed(2));

    /* ---------- PROJECTED Q-END COMMIT (#17) — transparent formula, not "AI" ----------
       1. Start with running commit at W<weekNow>.
       2. Add (bestcase - commit) × bestToCommitRate. The empirical share of
          bestcase $$ that gets re-categorized to commit by Q-end is ~40%.
       3. Subtract slippageRecurrencePct × historical slippage as a drag.
       4. Band = ±TTM forecast accuracy on the midpoint.
       Projected best = projected commit + remaining headroom (bestLast - commitLast).
       All inputs are real fields on data.js → trend / slippage / meta. */
    const BEST_TO_COMMIT = 0.40;
    const SLIP_RECUR     = 0.30;
    const commitLast = commitVals[commitVals.length - 1];
    const bestLast   = bestVals[bestVals.length - 1];
    const valuesLast = values[values.length - 1];
    const slipTotal  = ((D.slippage && D.slippage.totalAmount) || 0) * (motionOn ? share : 1);
    const slipDrag   = slipTotal * SLIP_RECUR;
    const projCommitMid = +(commitLast + (bestLast - commitLast) * BEST_TO_COMMIT - slipDrag).toFixed(2);
    const projCommitLo  = +(projCommitMid * (1 - acc)).toFixed(2);
    const projCommitHi  = +(projCommitMid * (1 + acc)).toFixed(2);
    const projBestMid   = +(projCommitMid + (bestLast - commitLast)).toFixed(2);
    const projTargetMid = series === "commit" ? projCommitMid : projBestMid;
    const projTargetLo  = series === "commit" ? projCommitLo  : +(projBestMid * (1 - acc)).toFixed(2);
    const projTargetHi  = series === "commit" ? projCommitHi  : +(projBestMid * (1 + acc)).toFixed(2);

    // W9..W13 linear-interp series (selected series + best/commit + pace).
    const projSeries = [];
    for (let i = 1; i <= weeksRem; i++) {
      projSeries.push(+(valuesLast + (projTargetMid - valuesLast) * (i / Math.max(weeksRem,1))).toFixed(2));
    }
    const projCommitSeries = [];
    for (let i = 1; i <= weeksRem; i++) {
      projCommitSeries.push(+(commitLast + (projCommitMid - commitLast) * (i / Math.max(weeksRem,1))).toFixed(2));
    }
    const projPace = [];
    for (let i = weekNow + 1; i <= weeksTotal; i++) {
      projPace.push(+(quotaQ * (i / weeksTotal) * (motionOn ? share : 1)).toFixed(2));
    }
    const projQuota = [];
    for (let i = 0; i < weeksRem; i++) projQuota.push(quota[quota.length - 1]);

    // X-axis now spans the full quarter (weeksTotal positions). Existing
    // series sits at indices 0..weekNow-1; projection sits at weekNow..weeksTotal-1.
    const xCount = weeksTotal;
    const allWeeks = weeks.concat(Array.from({length: weeksRem}, (_, i) => "W" + (weekNow + 1 + i)));

    const all = values.concat(quota).concat(projSeries).concat(projPace);
    if (showBand) {
      for (const v of commitVals) all.push(v * (1 + acc));
      for (const v of projCommitSeries) all.push(v * (1 + acc));
    }
    for (const v of pace) all.push(v);
    const max = Math.max(...all);
    const min = 0;
    const range = Math.max(max - min, 1);
    function toY(v) { return PADT + innerH - ((v - min) / range) * innerH; }
    function toX(i) { return PADL + (i / Math.max(xCount - 1, 1)) * innerW; }

    const grid = [];
    for (let i = 0; i <= 4; i++) {
      const y = PADT + (i / 4) * innerH;
      const v = max - (i / 4) * range;
      grid.push(`<line x1="${PADL}" y1="${y}" x2="${W - PADR}" y2="${y}"/>`);
      grid.push(`<text x="${PADL - 6}" y="${y + 3}" text-anchor="end">${v.toFixed(0)}</text>`);
    }
    // Render every other week label when weeksTotal > 9 to keep axis legible.
    const labelStride = xCount > 9 ? 2 : 1;
    const xLabels = allWeeks.map((m, i) => (i % labelStride === 0 || i === xCount - 1)
      ? `<text x="${toX(i)}" y="${H - 8}" text-anchor="middle">${esc(m)}</text>`
      : ""
    ).join("");
    // Faint vertical "today" marker at weekNow boundary so the user sees
    // where actuals end and projection begins.
    const nowX = toX(weekNow - 1);
    const nowMarker = `<line class="chart-now" x1="${nowX}" y1="${PADT}" x2="${nowX}" y2="${PADT + innerH}"/>
      <text class="chart-now-lbl" x="${nowX + 4}" y="${PADT + 10}">NOW</text>`;

    let bandSvg = "";
    if (showBand) {
      const upper = commitVals.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v * (1 + acc)).toFixed(1)}`).join(" ");
      let lower = "";
      for (let i = commitVals.length - 1; i >= 0; i--) {
        lower += ` L${toX(i).toFixed(1)},${toY(commitVals[i] * (1 - acc)).toFixed(1)}`;
      }
      bandSvg = `<path class="chart-band" d="${upper}${lower} Z"/>`;
    }
    // Projection band (dashed-outlined translucent area for W9..W13).
    let projBandSvg = "";
    if (showBand && projCommitSeries.length) {
      // Anchor band at commitLast point so it visually continues from the actuals band.
      const upperPoints = [{x: toX(commitVals.length - 1), y: toY(commitLast * (1 + acc))}]
        .concat(projCommitSeries.map((v, i) => ({x: toX(commitVals.length + i), y: toY(v * (1 + acc))})));
      const lowerPoints = [{x: toX(commitVals.length - 1), y: toY(commitLast * (1 - acc))}]
        .concat(projCommitSeries.map((v, i) => ({x: toX(commitVals.length + i), y: toY(v * (1 - acc))})));
      const up = upperPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
      let dn = "";
      for (let i = lowerPoints.length - 1; i >= 0; i--) {
        dn += ` L${lowerPoints[i].x.toFixed(1)},${lowerPoints[i].y.toFixed(1)}`;
      }
      projBandSvg = `<path class="chart-band chart-band-proj" d="${up}${dn} Z"/>`;
    }

    const linePath  = values.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
    const areaPath  = linePath + ` L${toX(values.length-1).toFixed(1)},${PADT+innerH} L${toX(0).toFixed(1)},${PADT+innerH} Z`;
    const quotaAll  = quota.concat(projQuota);
    const quotaPath = quotaAll.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
    const fullPace  = pace.concat(projPace);
    const pacePath  = fullPace.map((v, i)  => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");

    // Dashed projection extension — anchor at values[last] so it visually connects.
    let projLineSvg = "";
    if (projSeries.length) {
      const anchorX = toX(values.length - 1);
      const anchorY = toY(valuesLast);
      const projPath = [`M${anchorX.toFixed(1)},${anchorY.toFixed(1)}`]
        .concat(projSeries.map((v, i) => `L${toX(values.length + i).toFixed(1)},${toY(v).toFixed(1)}`))
        .join(" ");
      const projDots = projSeries.map((v, i) =>
        `<circle class="chart-dot chart-dot-proj" cx="${toX(values.length + i).toFixed(1)}" cy="${toY(v).toFixed(1)}" r="2.5"/>`
      ).join("");
      // Endpoint marker showing projected Q-end value.
      const endX = toX(xCount - 1);
      const endY = toY(projTargetMid);
      const endMarker = `<circle class="chart-proj-end" cx="${endX.toFixed(1)}" cy="${endY.toFixed(1)}" r="4"/>` +
        `<text class="chart-proj-end-lbl" x="${(endX - 4).toFixed(1)}" y="${(endY - 8).toFixed(1)}" text-anchor="end">PROJ $${projTargetMid.toFixed(1)}M</text>`;
      projLineSvg = `<path class="chart-line chart-line-proj" d="${projPath}"/>${projDots}${endMarker}`;
    }

    const dots = values.map((v, i) => `<circle class="chart-dot" cx="${toX(i).toFixed(1)}" cy="${toY(v).toFixed(1)}" r="3"/>`).join("");

    svg.innerHTML = `
      <g class="chart-grid">${grid.join("")}</g>
      <g class="chart-axis">${xLabels}</g>
      ${bandSvg}
      ${projBandSvg}
      <path class="chart-area" d="${areaPath}"/>
      <path class="chart-pace" d="${pacePath}"/>
      <path class="chart-line" d="${linePath}"/>
      <path class="chart-quota" d="${quotaPath}"/>
      ${projLineSvg}
      ${nowMarker}
      <g>${dots}</g>
    `;

    const last       = values[values.length - 1];
    const target     = quota[quota.length - 1];
    const gap        = (last - target).toFixed(1);
    const gapCls     = gap >= 0 ? "green" : "red";
    const paceNow    = pace[pace.length - 1];
    const paceDiff   = +(last - paceNow).toFixed(1);
    const paceCls    = paceDiff >= 0 ? "green" : "red";
    const paceArrow  = paceDiff >= 0 ? "▲" : "▼";
    const paceLabel  = paceDiff >= 0 ? "AHEAD" : "BEHIND";
    const paceAmt    = "$" + Math.abs(paceDiff).toFixed(1) + "M";
    // Projection vs quota — tone bands per spec: green ≥ quota, amber ≥ 0.95×, red < 0.95×.
    const projGapVsQuota = +(projTargetMid - target).toFixed(2);
    const projTone = projTargetMid >= target ? "green"
                   : projTargetMid >= target * 0.95 ? "amber" : "red";
    const projGapArrow = projGapVsQuota >= 0 ? "▲" : "▼";
    const projGapAbs   = Math.abs(projGapVsQuota).toFixed(1);
    const projBandPct  = (acc * 100).toFixed(0);
    const projMethTip  = `Projection = current ${series === "commit" ? "commit" : "best case"} + (bestcase − commit) × ${(BEST_TO_COMMIT*100).toFixed(0)}% − slippage drag (${(SLIP_RECUR*100).toFixed(0)}% recurrence on $${slipTotal.toFixed(1)}M). Band = ±${projBandPct}% TTM forecast accuracy.`;

    if (stat) {
      stat.innerHTML = `
        <div><span>SERIES</span><b>${series === "commit" ? "COMMIT" : "BEST CASE"}</b></div>
        <div><span>CURRENT</span><b>$${last.toFixed(1)}M</b></div>
        <div><span>QUOTA</span><b>$${target.toFixed(1)}M</b></div>
        <div><span>GAP</span><b class="${gapCls}">${gap >= 0 ? "+" : ""}$${gap}M</b></div>
        <div><span>PACE W${weekNow}</span><b>$${paceNow.toFixed(1)}M</b></div>
        <div><span>vs PACE</span><b class="${paceCls}">${paceArrow} ${paceAmt} ${paceLabel}</b></div>
        <div class="proj-block" title="${esc(projMethTip)}" aria-label="${esc(projMethTip)}">
          <span class="proj-lbl">PROJ Q-END · ${series === "commit" ? "COMMIT" : "BEST"}</span>
          <b class="proj-big ${projTone}">$${projTargetMid.toFixed(1)}M</b>
          <span class="proj-range">RANGE $${projTargetLo.toFixed(1)}M – $${projTargetHi.toFixed(1)}M (±${projBandPct}%)</span>
          <span class="proj-gap ${projTone}">${projGapArrow} ${projGapVsQuota >= 0 ? "+" : "-"}$${projGapAbs}M VS QUOTA</span>
          ${series === "commit" ? `<span class="proj-best">BEST CASE → $${projBestMid.toFixed(1)}M</span>` : ""}
        </div>
      `;
    }
    if (cap) {
      const pacePart = `Pace line: linear $0 → quota across ${weeksTotal} weeks. Above pace = ahead of plan.`;
      const projPart = ` Dashed W${weekNow+1}-W${weeksTotal} = projected ${series === "commit" ? "commit" : "best case"} ($${projTargetMid.toFixed(1)}M Q-end midpoint).`;
      const motionPart = motionOn
        ? ` Showing ${MOTION_LABEL[currentMotion]} contribution to the unchanged company quota.`
        : "";
      cap.textContent = (showBand
        ? `Confidence band: ±${(acc * 100).toFixed(0)}% based on TTM forecast accuracy · ${pacePart}`
        : pacePart) + projPart + motionPart;
    }
    // Refresh hero strip to incorporate the projection.
    renderHeroSummary({ commit: commitLast, best: bestLast, quota: target, projCommit: projCommitMid, projBand: acc });
  }

  // Hero summary is re-rendered every time the chart renders so projection
  // numbers stay in sync with motion lens / series toggle changes.
  function renderHeroSummary(p) {
    const el = $("hero-summary");
    if (!el) return;
    const projGap = p.projCommit - p.quota;
    const projCls = projGap >= 0 ? "green" : projGap >= -1 ? "amber" : "red";
    const projAbs = Math.abs(projGap).toFixed(1);
    const bandAbs = (p.projCommit * p.projBand).toFixed(1);
    el.innerHTML =
      `Commit at <span class="green">$${p.commit.toFixed(1)}M</span> · ` +
      `projected Q-end <span class="${projCls}">$${p.projCommit.toFixed(1)}M</span> ` +
      `<span class="muted">±$${bandAbs}M</span> · ` +
      `best case <span class="green">$${p.best.toFixed(1)}M</span> · ` +
      `vs <span class="amber">$${p.quota.toFixed(0)}M quota</span>` +
      (projGap >= 0 ? "" : ` · <span class="${projCls}">$${projAbs}M to close gap</span>`) +
      ".";
  }
  function bindToggle() {
    document.querySelectorAll(".toggle").forEach((btn) => {
      btn.addEventListener("click", () => setSeries(btn.dataset.series));
    });
  }
  function setSeries(s) {
    if (!D.trend[s]) return;
    currentSeries = s;
    document.querySelectorAll(".toggle").forEach((b) => {
      const a = b.dataset.series === s;
      b.classList.toggle("active", a);
      b.setAttribute("aria-selected", a ? "true" : "false");
    });
    renderChart(s);
  }

  /* ---------- DEALS TABLE ---------- */
  const LS_REP_KEY = "salespulse.currentRep";
  let currentRep = (function () {
    try {
      const saved = localStorage.getItem(LS_REP_KEY);
      const valid = D.reps.some((r) => r.name === saved);
      if (valid) return saved;
    } catch (e) { /* localStorage may be blocked */ }
    return (D.reps[0] && D.reps[0].name) || "";
  })();
  let myDealsActive = false;

  /* ---------- NEXT STEP HEALTH (#15) ----------
     Per-deal hygiene surfacing. A deal with no next step is invisible to
     the manager; an overdue next step is the cheapest "is this real?"
     signal. Bucketing: missing > overdue > soon > on. Header stat is a
     rollup; clicking the red count filters to overdue+missing only. */
  const LS_RISK_KEY = "salespulse.dealsRiskOnly";
  let dealsRiskOnly = (function () {
    try { return localStorage.getItem(LS_RISK_KEY) === "1"; }
    catch (e) { return false; }
  })();
  let sortByNextStep = false;
  let sortByMomentum = false;
  function dealHealth(d) {
    if (!d.nextStep) return "missing";
    const n = d.nextStep.daysFromNow;
    if (n < 0) return "overdue";
    if (n <= 7) return "on";
    return "soon";
  }
  const HEALTH_RANK = { missing: 0, overdue: 1, soon: 2, on: 3 };
  /* ---------- MOMENTUM (#14) — per-deal engagement signal ----------
     Tone bands: hot ≥ 70, warm 40-69, cold < 40. Trend is vs prior week. */
  function momentumTone(score) {
    if (score == null) return "cold";
    if (score >= 70) return "hot";
    if (score >= 40) return "warm";
    return "cold";
  }
  function momentumCell(d) {
    const e = d.engagement;
    if (!e) return `<td class="num momentum"><span class="muted">—</span></td>`;
    const tone = momentumTone(e.score);
    const trendArr = e.trend === "up" ? "▲" : e.trend === "down" ? "▼" : "─";
    const trendCls = e.trend === "up" ? "up" : e.trend === "down" ? "down" : "flat";
    const tip = `${e.touchpoints14d} touchpoints / ${e.lastTouchDays}d since last touch / ${e.multiThreaded ? "multi-threaded" : "single-threaded"}`;
    return `<td class="num momentum" title="${esc(tip)}"><span class="mo-dot mo-${tone}">●</span> <span class="mo-score">${e.score}</span> <span class="mo-trend mo-${trendCls}">${trendArr}</span></td>`;
  }
  function nextStepCell(d) {
    if (!d.nextStep) {
      return `<td class="next-step"><span class="ns-missing" title="No next step logged — un-defensible in pipe review">MISSING</span></td>`;
    }
    const n = d.nextStep.daysFromNow;
    const action = esc(d.nextStep.action);
    if (n < 0) {
      return `<td class="next-step"><span class="ns-text">${action}</span> <span class="ns-chip red" title="Due ${esc(d.nextStep.dueDate)} — ${Math.abs(n)}d past due">◀ ${Math.abs(n)}D OVERDUE</span></td>`;
    }
    const chipCls = n <= 7 ? "green" : "amber";
    const chipTitle = n <= 7 ? `Due ${esc(d.nextStep.dueDate)}` : `Due in ${n}d — no near-term action, drift risk`;
    return `<td class="next-step"><span class="ns-text">${action}</span> <span class="ns-chip ${chipCls}" title="${chipTitle}">▸ ${n}D</span></td>`;
  }

  function renderDeals(rows) {
    const tbody = $("deals-tbody");
    if (!tbody) return;
    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;color:var(--dim);padding:18px;">NO MATCHING DEALS</td></tr>`;
      setText("deals-count", "0 OPEN · $0.0M");
      renderDealsHealth([]);
      return;
    }
    const total = rows.reduce((a, r) => a + r.amount, 0);
    setText("deals-count", `${rows.length} OPEN · $${(total/1e6).toFixed(1)}M`);
    // Pre-compute the top-3 set so each row knows whether to render the
    // TOP-3 CONCENTRATION (#11) star badge in the ACCOUNT column.
    const top3 = topAccountSet();
    if (sortByMomentum) {
      // Highest momentum first (descending). Stable secondary sort by amount.
      rows = rows.slice().sort((a, b) => ((b.engagement && b.engagement.score) || 0) - ((a.engagement && a.engagement.score) || 0) || b.amount - a.amount);
    } else if (sortByNextStep) {
      rows = rows.slice().sort((a, b) => HEALTH_RANK[dealHealth(a)] - HEALTH_RANK[dealHealth(b)] || b.amount - a.amount);
    }
    tbody.innerHTML = rows.map((d) => {
      const probCls = d.prob >= 70 ? "green" : d.prob >= 40 ? "amber" : "red";
      const fcst = (d.forecast || "upside").toLowerCase();
      const mot  = d.motion || "new";
      const motCls = mot === "expansion" ? "exp" : "new";
      const motLbl = mot === "expansion" ? "EXP" : "NEW";
      const star = top3.has(d.account)
        ? `<span class="deal-top3-star" title="Top-3 account — single-point-of-failure deal">★</span> `
        : "";
      return `
        <tr data-account="${esc(d.account)}" data-health="${dealHealth(d)}">
          <td>${star}<b class="green">${esc(d.account)}</b></td>
          <td>${esc(d.stage)}</td>
          <td class="num">$${formatK(d.amount)}</td>
          <td class="num ${probCls}">${d.prob}%</td>
          ${momentumCell(d)}
          <td>${esc(d.close)}</td>
          ${nextStepCell(d)}
          <td>${esc(d.owner)}</td>
          <td>${esc(d.region)}</td>
          <td>${esc(d.segment)}</td>
          <td><span class="mot-badge mot-${motCls}" title="${mot === "expansion" ? "Expansion / upsell / renewal" : "Net-new logo"}">${motLbl}</span></td>
          <td><span class="status-pill ${fcst}">${esc(d.forecast)}</span></td>
        </tr>`;
    }).join("");
    renderDealsHealth(rows);
  }

  function renderDealsHealth(rows) {
    const el = $("deals-health");
    if (!el) return;
    let onCt = 0, soonCt = 0, badCt = 0;
    rows.forEach((d) => {
      const h = dealHealth(d);
      if (h === "missing" || h === "overdue") badCt++;
      else if (h === "soon") soonCt++;
      else onCt++;
    });
    const badCls = badCt > 0 ? "bad clickable" : "muted";
    const activeCls = dealsRiskOnly ? " active" : "";
    el.innerHTML =
      `<span class="dh-label">NEXT-STEP HEALTH:</span> ` +
      `<span class="dh-good">${onCt}✓</span> · ` +
      `<span class="dh-warn">${soonCt}●</span> · ` +
      `<span class="dh-bad ${badCls}${activeCls}" id="dh-bad-toggle" title="${badCt > 0 ? (dealsRiskOnly ? "Click to clear filter" : "Click to filter table to OVERDUE + MISSING only") : "No overdue or missing deals"}" role="${badCt > 0 ? "button" : "img"}" tabindex="${badCt > 0 ? "0" : "-1"}">${badCt}✗</span>`;
    const tog = $("dh-bad-toggle");
    if (tog && badCt > 0) {
      const fire = () => {
        dealsRiskOnly = !dealsRiskOnly;
        try { localStorage.setItem(LS_RISK_KEY, dealsRiskOnly ? "1" : "0"); } catch (e) {}
        applyDealFilters();
      };
      tog.addEventListener("click", fire);
      tog.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fire(); }
      });
    }
  }

  function applyDealFilters() {
    const q  = ($("deal-search").value || "").toLowerCase().trim();
    const rg = $("deal-region").value;
    const fc = $("deal-forecast").value;
    const rows = D.topDeals
      .filter((d) => (!q || d.account.toLowerCase().includes(q)))
      .filter((d) => (rg === "all" || d.region === rg))
      .filter((d) => (fc === "all" || d.forecast === fc))
      .filter((d) => (!myDealsActive || d.owner === currentRep))
      .filter((d) => (currentMotion === "all" || d.motion === currentMotion))
      .filter((d) => (!dealsRiskOnly || dealHealth(d) === "overdue" || dealHealth(d) === "missing"))
      .sort((a, b) => b.amount - a.amount);
    renderDeals(rows);
  }
  function bindDealFilters() {
    ["deal-search","deal-region","deal-forecast"].forEach((id) => {
      const el = $(id); if (el) el.addEventListener("input", applyDealFilters);
      if (el) el.addEventListener("change", applyDealFilters);
    });
    const thNs = $("th-nextstep");
    if (thNs) {
      thNs.addEventListener("click", () => {
        sortByNextStep = !sortByNextStep;
        if (sortByNextStep) sortByMomentum = false;
        thNs.classList.toggle("sorted", sortByNextStep);
        const thMo = $("th-momentum"); if (thMo) thMo.classList.remove("sorted");
        applyDealFilters();
      });
    }
    const thMo = $("th-momentum");
    if (thMo) {
      thMo.addEventListener("click", () => {
        sortByMomentum = !sortByMomentum;
        if (sortByMomentum) sortByNextStep = false;
        thMo.classList.toggle("sorted", sortByMomentum);
        const thNs2 = $("th-nextstep"); if (thNs2) thNs2.classList.remove("sorted");
        applyDealFilters();
      });
    }
  }

  /* ---------- MOMENTUM HEATMAP RIBBON (#14) ----------
     12 small cells above the table, sorted by deal $$ desc, colored by score.
     Click a cell → reuses highlightDealRow() so the row scrolls + pulses. */
  function renderMomentumHeatmap() {
    const host = $("mo-heat");
    if (!host) return;
    const rows = D.topDeals.slice().sort((a, b) => b.amount - a.amount);
    host.innerHTML = rows.map((d) => {
      const e = d.engagement || { score: null };
      const tone = momentumTone(e.score);
      const trend = e.trend === "up" ? "▲" : e.trend === "down" ? "▼" : "─";
      const lbl = (d.account || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase();
      const tip = `${d.account} · $${(d.amount/1e6).toFixed(2)}M · ${e.score == null ? "—" : "MOMENTUM " + e.score} ${trend}`;
      return `<button type="button" class="mo-cell mo-${tone}" data-account="${esc(d.account)}" title="${esc(tip)}" aria-label="${esc(tip)}"><span class="mo-cell-lbl">${esc(lbl)}</span><span class="mo-cell-trend">${trend}</span></button>`;
    }).join("");
    host.querySelectorAll(".mo-cell").forEach((btn) => {
      btn.addEventListener("click", () => {
        const acct = btn.dataset.account;
        if (acct) highlightDealRow(acct);
      });
    });
  }
  function updateMyDealsBtn() {
    const btn = $("deal-mine");
    if (!btn) return;
    btn.classList.toggle("active", myDealsActive);
    btn.setAttribute("aria-pressed", myDealsActive ? "true" : "false");
    btn.textContent = myDealsActive ? `▣ MY DEALS · ${currentRep}` : "MY DEALS";
    btn.setAttribute("title", myDealsActive
      ? `Showing only deals owned by ${currentRep}. Click to clear.`
      : `Filter Top Open Deals to those owned by ${currentRep}.`);
  }
  function bindMyDeals() {
    const sel = $("deal-me");
    const btn = $("deal-mine");
    if (sel) {
      sel.innerHTML = D.reps.map((r) =>
        `<option value="${esc(r.name)}"${r.name === currentRep ? " selected" : ""}>${esc(r.name)} · ${esc(r.region)}</option>`
      ).join("");
      sel.value = currentRep;
      sel.addEventListener("change", () => {
        currentRep = sel.value;
        try { localStorage.setItem(LS_REP_KEY, currentRep); } catch (e) {}
        updateMyDealsBtn();
        if (myDealsActive) applyDealFilters();
      });
    }
    if (btn) {
      btn.addEventListener("click", () => {
        myDealsActive = !myDealsActive;
        updateMyDealsBtn();
        applyDealFilters();
      });
    }
    updateMyDealsBtn();
  }

  /* ---------- PIPELINE CREATED / Pipegen (#12) ----------
     Leading indicator panel: 8 paired vertical bars per week (NEW IN
     in green, OUT in amber), dashed horizontal target line, red flag
     tick above any week where NEW IN < target. Header stat row shows
     this-week NET, trailing-8w avg NET, and the target. Source-mix
     stacked horizontal bar shows where the trailing pipegen came from
     (outbound / inbound / partner / expansion). Pure SVG, no library. */
  function renderPipegen() {
    const p = D.pipegen;
    if (!p || !Array.isArray(p.newIn) || !Array.isArray(p.out)) return;
    const svg     = $("pipe-svg");
    const statEl  = $("pipe-stat");
    const mixEl   = $("pipe-mix");
    const capEl   = $("pipe-caption");
    if (!svg) return;

    const weeks   = p.weeks || [];
    const target  = p.weeklyTarget || 0;
    const n       = p.newIn.length;
    const net     = p.newIn.map((v, i) => +(v - p.out[i]).toFixed(2));
    const lastIn  = p.newIn[n - 1] || 0;
    const lastNet = net[n - 1] || 0;
    const ttwAvgNet = +(net.reduce((a, b) => a + b, 0) / Math.max(net.length, 1)).toFixed(1);
    const lastNetCls = lastNet >= 0 ? "green" : "red";
    const lastNetArr = lastNet >= 0 ? "▲" : "▼";
    const ttwCls     = ttwAvgNet >= target * 0.5 ? "green" : ttwAvgNet >= 0 ? "amber" : "red";
    const lastVsTarget = lastIn - target;
    const lastVsTargetCls = lastVsTarget >= 0 ? "green" : "red";

    if (statEl) {
      statEl.innerHTML = `
        <div><span>THIS WK NET</span><b class="${lastNetCls}">${lastNetArr} $${Math.abs(lastNet).toFixed(1)}M</b></div>
        <div><span>THIS WK NEW IN</span><b>$${lastIn.toFixed(1)}M</b> <span class="muted">(vs target ${lastVsTarget >= 0 ? "+" : ""}<span class="${lastVsTargetCls}">$${Math.abs(lastVsTarget).toFixed(1)}M</span>)</span></div>
        <div><span>TTW AVG NET</span><b class="${ttwCls}">$${ttwAvgNet.toFixed(1)}M</b></div>
        <div><span>TARGET</span><b>$${target.toFixed(1)}M/wk</b></div>
        <div><span>WEEKS &lt; TARGET</span><b>${p.newIn.filter((v) => v < target).length} of ${n}</b></div>
      `;
    }

    // SVG layout
    const W = 600, H = 200;
    const PADL = 36, PADR = 14, PADT = 22, PADB = 26;
    const innerW = W - PADL - PADR;
    const innerH = H - PADT - PADB;
    const maxV = Math.max(target, ...p.newIn, ...p.out);
    const yMax = maxV * 1.15;
    const toY  = (v) => PADT + innerH - (v / yMax) * innerH;
    const slot = innerW / n;
    const barW = Math.max(6, slot * 0.32);
    const gap  = Math.max(2, slot * 0.06);

    const grid = [];
    for (let i = 0; i <= 4; i++) {
      const y = PADT + (i / 4) * innerH;
      const v = yMax - (i / 4) * yMax;
      grid.push(`<line x1="${PADL}" y1="${y}" x2="${W - PADR}" y2="${y}"/>`);
      grid.push(`<text x="${PADL - 4}" y="${y + 3}" text-anchor="end">${v.toFixed(0)}</text>`);
    }

    const bars = [];
    const ticks = [];
    const labels = [];
    for (let i = 0; i < n; i++) {
      const cx = PADL + slot * i + slot / 2;
      const xIn  = cx - barW - gap / 2;
      const xOut = cx + gap / 2;
      const yIn  = toY(p.newIn[i]);
      const yOut = toY(p.out[i]);
      const baseY = toY(0);
      bars.push(`<rect class="pipe-bar-in"  x="${xIn.toFixed(1)}"  y="${yIn.toFixed(1)}"  width="${barW.toFixed(1)}" height="${(baseY - yIn).toFixed(1)}"><title>${esc(weeks[i] || ("W"+(i+1)))} NEW IN: $${p.newIn[i].toFixed(1)}M</title></rect>`);
      bars.push(`<rect class="pipe-bar-out" x="${xOut.toFixed(1)}" y="${yOut.toFixed(1)}" width="${barW.toFixed(1)}" height="${(baseY - yOut).toFixed(1)}"><title>${esc(weeks[i] || ("W"+(i+1)))} OUT: $${p.out[i].toFixed(1)}M</title></rect>`);
      labels.push(`<text x="${cx.toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(weeks[i] || ("W"+(i+1)))}</text>`);
      // Red flag dot above the NEW IN bar when it missed target.
      if (p.newIn[i] < target) {
        ticks.push(`<circle class="pipe-miss-dot" cx="${cx.toFixed(1)}" cy="${(yIn - 8).toFixed(1)}" r="3.5"><title>${esc(weeks[i] || ("W"+(i+1)))}: $${p.newIn[i].toFixed(1)}M below $${target.toFixed(1)}M target</title></circle>`);
      }
    }
    // Dashed target line + label.
    const yT = toY(target);
    const targetLine = `<line class="pipe-target" x1="${PADL}" y1="${yT.toFixed(1)}" x2="${W - PADR}" y2="${yT.toFixed(1)}"/>`;
    const targetLabel = `<text class="pipe-target-lbl" x="${(W - PADR - 4).toFixed(1)}" y="${(yT - 4).toFixed(1)}" text-anchor="end">TARGET $${target.toFixed(1)}M</text>`;

    svg.innerHTML = `
      <g class="chart-grid">${grid.join("")}</g>
      <g class="chart-axis">${labels.join("")}</g>
      <g>${bars.join("")}</g>
      ${targetLine}
      ${targetLabel}
      <g>${ticks.join("")}</g>
    `;

    // Source mix stacked horizontal bar.
    if (mixEl) {
      const m = p.sourceMix || {};
      const segs = [
        { k: "outbound",  lbl: "OUTBOUND",  cls: "pipe-mix-out", v: m.outbound  || 0 },
        { k: "inbound",   lbl: "INBOUND",   cls: "pipe-mix-in",  v: m.inbound   || 0 },
        { k: "partner",   lbl: "PARTNER",   cls: "pipe-mix-pa",  v: m.partner   || 0 },
        { k: "expansion", lbl: "EXP",       cls: "pipe-mix-ex",  v: m.expansion || 0 }
      ];
      const total = segs.reduce((a, s) => a + s.v, 0) || 100;
      mixEl.innerHTML = `
        <div class="pipe-mix-bar" role="img" aria-label="${segs.map((s) => s.lbl + " " + s.v + "%").join(", ")}">
          ${segs.map((s) => `<span class="${s.cls}" style="width:${(s.v / total * 100).toFixed(2)}%;" title="${s.lbl} · ${s.v}%">${s.v >= 10 ? s.lbl + " " + s.v + "%" : ""}</span>`).join("")}
        </div>
        <div class="pipe-mix-legend">
          ${segs.map((s) => `<span><i class="pipe-mix-dot ${s.cls}"></i>${s.lbl} <b>${s.v}%</b></span>`).join("")}
        </div>`;
    }
    if (capEl) {
      capEl.textContent = "Weekly target = quota ($60M) × 3x coverage ÷ 13 weeks ≈ $13.85M (rounded to $13.5M). Red dots flag weeks where NEW IN missed the target.";
    }
  }

  /* ---------- SLIPPAGE THIS QUARTER ---------- */
  // Computes the panel from D.slippage: header stat (deal count, $$ out,
  // QoQ delta), the per-deal table with severity-tinted amounts, and a
  // concentration footer (top owner / region / reason — all derived from
  // the data, not hardcoded). Clicking a row jumps to that account in the
  // TOP OPEN DEALS table and pulses the row briefly. If the deal is hidden
  // by the current filters, filters are cleared so the row can be located.
  function renderSlippage() {
    const s = D.slippage;
    if (!s || !Array.isArray(s.items)) return;
    const head = $("slip-stat");
    const body = $("slip-tbody");
    const foot = $("slip-foot");
    if (!head && !body && !foot) return;

    const qoq = s.priorQuarterAmount > 0
      ? ((s.totalAmount - s.priorQuarterAmount) / s.priorQuarterAmount) * 100
      : 0;
    const qoqUp  = qoq >= 0;
    const qoqCls = qoqUp ? "red" : "green"; // more slippage = bad (red), less = good
    if (head) {
      head.innerHTML = `
        <span><span class="muted">SLIPPED</span> <b class="red">${s.dealCount}</b> deals</span>
        <span class="sep">·</span>
        <span><b class="red">$${s.totalAmount.toFixed(2)}M</b> out of ${esc(D.meta && D.meta.period || "this Q")}</span>
        <span class="sep">·</span>
        <span class="${qoqCls}">${qoqUp ? "▲" : "▼"} ${Math.abs(qoq).toFixed(0)}%</span>
        <span class="muted"> vs prior Q ($${s.priorQuarterAmount.toFixed(2)}M)</span>`;
    }

    if (body) {
      body.innerHTML = s.items.slice().sort((a, b) => b.amount - a.amount).map((it) => {
        const amtCls = it.amount >= 1_000_000 ? "red" : it.amount >= 500_000 ? "amber" : "";
        return `
          <tr data-slip-account="${esc(it.account)}" tabindex="0" role="button"
              title="Jump to ${esc(it.account)} in TOP OPEN DEALS">
            <td><b class="green">${esc(it.account)}</b></td>
            <td>${esc(it.owner)}</td>
            <td>${esc(it.region)}</td>
            <td class="num ${amtCls}">$${formatK(it.amount)}</td>
            <td><span class="muted">${esc(it.fromClose)}</span> → <b>${esc(it.toClose)}</b></td>
            <td>${esc(it.reason)}</td>
          </tr>`;
      }).join("");

      const handler = (e) => {
        const tr = e.target.closest("tr[data-slip-account]");
        if (!tr) return;
        if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        highlightDealRow(tr.dataset.slipAccount);
      };
      body.addEventListener("click", handler);
      body.addEventListener("keydown", handler);
    }

    if (foot) {
      const byOwner  = bucketSum(s.items, "owner",  "amount");
      const byRegion = bucketSum(s.items, "region", "amount");
      const byReason = bucketCount(s.items, "reason");
      const topOwner  = topOf(byOwner);
      const topRegion = topOf(byRegion);
      const topReason = topOf(byReason);
      foot.innerHTML = `
        <span><span class="muted">TOP OWNER</span> <b>${esc(topOwner.key)}</b> ($${(topOwner.val/1e6).toFixed(2)}M)</span>
        <span class="sep">·</span>
        <span><span class="muted">TOP REGION</span> <b>${esc(topRegion.key)}</b> ($${(topRegion.val/1e6).toFixed(2)}M)</span>
        <span class="sep">·</span>
        <span><span class="muted">TOP REASON</span> <b>${esc(topReason.key)}</b> (${topReason.val})</span>`;
    }
  }
  function bucketSum(items, key, sumKey) {
    const out = {};
    for (const it of items) out[it[key]] = (out[it[key]] || 0) + it[sumKey];
    return out;
  }
  function bucketCount(items, key) {
    const out = {};
    for (const it of items) out[it[key]] = (out[it[key]] || 0) + 1;
    return out;
  }
  function topOf(map) {
    let bestK = "—", bestV = -Infinity;
    for (const k in map) { if (map[k] > bestV) { bestV = map[k]; bestK = k; } }
    return { key: bestK, val: bestV === -Infinity ? 0 : bestV };
  }

  /* Jump-to-deal + 1.5s green pulse highlight. Called by SLIPPAGE row clicks. */
  function highlightDealRow(account) {
    const tbody = $("deals-tbody");
    if (!tbody) return;
    const find = () => {
      for (const tr of tbody.querySelectorAll("tr[data-account]")) {
        if (tr.dataset.account === account) return tr;
      }
      return null;
    };
    let row = find();
    if (!row) {
      // Deal is hidden by current filters — clear them and re-render so we can find it.
      const search = $("deal-search");   if (search) search.value = "";
      const region = $("deal-region");   if (region) region.value = "all";
      const fcst   = $("deal-forecast"); if (fcst)   fcst.value   = "all";
      if (myDealsActive) { myDealsActive = false; updateMyDealsBtn(); }
      if (dealsRiskOnly) { dealsRiskOnly = false; try { localStorage.setItem(LS_RISK_KEY, "0"); } catch (e) {} }
      if (currentMotion !== "all") setMotion("all");
      applyDealFilters();
      row = find();
    }
    if (!row) { flash(`Could not locate ${account} in TOP OPEN DEALS`, "err"); return; }
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    row.classList.remove("highlight-pulse");
    // Force reflow so re-adding the class restarts the animation.
    void row.offsetWidth;
    row.classList.add("highlight-pulse");
    setTimeout(() => row.classList.remove("highlight-pulse"), 1600);
  }

  /* ---------- REPS ---------- */
  function renderReps() {
    const tbody = $("reps-tbody");
    if (!tbody) return;
    tbody.innerHTML = D.reps.map((r) => {
      const attainCls = r.attain >= 90 ? "" : r.attain >= 70 ? "warn" : "bad";
      const actCls    = r.activity >= 80 ? "green" : r.activity >= 65 ? "amber" : "red";
      return `
        <tr>
          <td><b class="green">${esc(r.name)}</b></td>
          <td>${esc(r.region)}</td>
          <td class="num">$${formatK(r.quota)}</td>
          <td>
            <span class="attainment-bar"><span class="${attainCls}" style="width:${Math.min(r.attain,100)}%;"></span></span>
            ${r.attain}%
          </td>
          <td class="num">$${formatK(r.pipeline)}</td>
          <td class="num">${r.won}</td>
          <td class="num ${actCls}">${r.activity}</td>
        </tr>`;
    }).join("");
  }

  /* ---------- SEGMENTS ---------- */
  function renderSegments() {
    const grid = $("seg-grid");
    if (!grid) return;
    // Motion-split stacked-bar above the grid (always visible, even on
    // ALL view — it's the headline number for the lens). When the lens
    // is filtered, also scales the per-segment $$ and deal counts by
    // the global motion share so the four tiles tell the same story.
    const ms = D.motionSplit;
    const wrap = $("motion-split");
    if (wrap) {
      if (ms && ms.new && ms.expansion) {
        const newShare = Math.max(0, Math.min(100, ms.new.share || 0));
        const expShare = Math.max(0, 100 - newShare);
        wrap.innerHTML = `
          <div class="ms-head">
            <span class="ms-title">NEW vs EXPANSION SPLIT</span>
            <span class="ms-sub">$M PIPELINE · TTM WIN RATE</span>
          </div>
          <div class="ms-bar" role="img" aria-label="New logo ${newShare}%, Expansion ${expShare}%">
            <span class="ms-new" style="width:${newShare}%;" title="NEW LOGO · ${newShare}%">NEW · ${newShare}%</span>
            <span class="ms-exp" style="width:${expShare}%;" title="EXPANSION · ${expShare}%">EXP · ${expShare}%</span>
          </div>
          <div class="ms-legend">
            <span><i class="ms-dot ms-d-new"></i>NEW LOGO · <b>$${ms.new.value.toFixed(1)}M</b> · win <b>${ms.new.winRate}%</b></span>
            <span><i class="ms-dot ms-d-exp"></i>EXPANSION · <b>$${ms.expansion.value.toFixed(1)}M</b> · win <b>${ms.expansion.winRate}%</b></span>
          </div>`;
      } else {
        wrap.innerHTML = "";
      }
    }
    const share = motionShare(currentMotion);
    grid.innerHTML = D.segments.map((s) => {
      const v = +(s.value * share).toFixed(1);
      const d = Math.round(s.deals * share);
      return `
        <div class="seg">
          <div class="seg-name">${esc(s.name)}</div>
          <div class="seg-value">$${v.toFixed(1)}M</div>
          <div class="seg-bar"><span style="width:${s.share}%;"></span></div>
          <div class="seg-meta"><span>${s.share}%</span><span>${d} deals</span></div>
        </div>`;
    }).join("");
  }

  /* ---------- REGIONS ---------- */
  function renderRegions() {
    const tbody = $("region-tbody");
    if (!tbody) return;
    const share = motionShare(currentMotion);
    tbody.innerHTML = D.regions.map((r) => {
      const v = +(r.value * share).toFixed(1);
      const d = Math.round(r.deals * share);
      const growthGreen = r.growth.startsWith("+");
      const statusCls = r.status === "On Track" ? "commit" : r.status === "Watch" ? "open" : "risk";
      return `
        <tr>
          <td><b class="green">${esc(r.name)}</b></td>
          <td class="num">$${v.toFixed(1)}M</td>
          <td class="num">${d}</td>
          <td class="num ${growthGreen ? "green" : "red"}">${esc(r.growth)}</td>
          <td><span class="status-pill ${statusCls}">${esc(r.status)}</span></td>
        </tr>`;
    }).join("");
  }

  /* ---------- RISKS ---------- */
  function renderRisks() {
    const list = $("risk-list");
    if (!list) return;
    setText("risk-count", D.risks.length + " ACTIVE");
    list.innerHTML = D.risks.map((r, i) => `
      <li class="risk-item" data-idx="${i}">
        <span class="sev ${r.severity.toLowerCase()}">${r.severity}</span>
        <span class="risk-text">${esc(r.text)}</span>
        <button class="btn sm review-btn">MARK REVIEWED</button>
      </li>
    `).join("");
    list.querySelectorAll(".review-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const li = e.target.closest(".risk-item");
        if (!li) return;
        const reviewed = li.classList.toggle("reviewed");
        btn.textContent = reviewed ? "REOPEN" : "MARK REVIEWED";
      });
    });
  }

  /* ---------- INSIGHTS ---------- */
  let insightIdx = 0;
  function renderInsight() {
    const list = $("insight-list");
    if (!list) return;
    const items = D.insights[insightIdx % D.insights.length];
    list.innerHTML = items.map((s) => `<li>${esc(s)}</li>`).join("");
  }
  function bindRegen() {
    const btn = $("regen-insight"); if (!btn) return;
    btn.addEventListener("click", () => {
      insightIdx = (insightIdx + 1) % D.insights.length;
      renderInsight();
    });
  }

  /* ---------- AUDIENCE FEEDBACK (GitHub Issues API) ---------- */
  async function loadAudience() {
    const tbody = $("aud-tbody");
    const stamp = $("aud-stamp");
    if (!tbody) return;
    try {
      const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/issues?state=all&per_page=30&sort=created&direction=desc&_=${Date.now()}`;
      const res = await fetch(url, { headers: { "Accept": "application/vnd.github+json" } });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const issues = data.filter((i) => !i.pull_request);
      if (issues.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--dim);padding:18px;">NO FEEDBACK YET — TAP "+ NEW"</td></tr>`;
        return;
      }
      tbody.innerHTML = issues.slice(0, 25).map((i) => {
        const when = formatWhen(i.created_at);
        const type = extractType(i.title);
        const cleanTitle = i.title.replace(/^\[[^\]]+\]\s*/, "");
        const stateCls = i.state === "closed" ? "closed" : "open";
        return `
          <tr>
            <td>${esc(when)}</td>
            <td><span class="status-pill open">${esc(type)}</span></td>
            <td><a href="${esc(i.html_url)}" target="_blank" rel="noopener"><b class="green">${esc(cleanTitle)}</b></a></td>
            <td>${esc(i.user && i.user.login ? "@" + i.user.login : "anon")}</td>
            <td><span class="status-pill ${stateCls}">${esc(i.state)}</span> <span class="muted">#${i.number}</span></td>
          </tr>`;
      }).join("");
      if (stamp) stamp.textContent = "UPDATED " + new Date().toTimeString().slice(0, 8);
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--dim);padding:18px;">FEED UNAVAILABLE (${esc(e.message)})</td></tr>`;
    }
  }
  function extractType(t) { const m = t.match(/^\[([^\]]+)\]/); return m ? m[1].toUpperCase() : "REQ"; }
  function formatWhen(iso) {
    try {
      const d = new Date(iso);
      const m = Math.round((Date.now() - d.getTime()) / 60000);
      if (m < 1) return "just now";
      if (m < 60) return m + "m ago";
      const h = Math.round(m / 60);
      if (h < 24) return h + "h ago";
      return d.toLocaleDateString();
    } catch (e) { return iso; }
  }

  /* ---------- COMMAND BAR ---------- */
  /* ---------- MOTION LENS WIRING (#9) ----------
     setMotion(): central re-render path — updates state, persists,
     re-renders every panel that's motion-aware, updates the toggle UI
     and the per-panel chips, and applyDealFilters so the table reflects
     the new motion immediately. */
  function setMotion(m) {
    if (MOTION_VALUES.indexOf(m) < 0) return;
    if (m === currentMotion) { updateMotionPillUI(); updateMotionChips(); return; }
    currentMotion = m;
    try { localStorage.setItem(LS_MOTION_KEY, m); } catch (e) {}
    updateMotionPillUI();
    renderKpis();
    renderFunnel();
    renderChart(currentSeries);
    applyDealFilters();
    renderSegments();
    renderRegions();
    updateMotionChips();
  }
  function updateMotionPillUI() {
    document.querySelectorAll(".motion-seg").forEach((b) => {
      const a = b.dataset.motion === currentMotion;
      b.classList.toggle("active", a);
      b.setAttribute("aria-selected", a ? "true" : "false");
    });
  }
  // Inject a "MOTION: NEW LOGO" chip into the .panel-head .sub of every
  // panel the lens affects. Chips are removed when the lens is back to
  // ALL so panels go back to their normal subhead.
  function updateMotionChips() {
    const showChip = currentMotion !== "all";
    const lbl = MOTION_LABEL[currentMotion] || "";
    const cls = MOTION_CHIP_CLS[currentMotion] || "";
    MOTION_AFFECTED_PANELS.forEach((id) => {
      const panel = document.getElementById(id);
      if (!panel) return;
      const sub = panel.querySelector(".panel-head .sub");
      if (!sub) return;
      let chip = sub.querySelector(".motion-chip");
      if (showChip) {
        if (!chip) {
          chip = document.createElement("span");
          chip.className = "motion-chip";
          sub.appendChild(chip);
        }
        chip.className = "motion-chip" + (cls ? " " + cls : "");
        chip.textContent = "MOTION: " + lbl;
        chip.setAttribute("title", "NEW vs EXPANSION lens — click ALL in the hero strip to clear.");
      } else if (chip) {
        chip.remove();
      }
    });
  }
  function bindMotion() {
    document.querySelectorAll(".motion-seg").forEach((b) => {
      b.addEventListener("click", () => setMotion(b.dataset.motion));
    });
    updateMotionPillUI();
  }

  function bindCommand() {
    const inp = $("cmd"); if (!inp) return;
    inp.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const cmd = inp.value.trim().toUpperCase();
      e.preventDefault();
      runCommand(cmd);
      inp.value = "";
    });
  }
  function runCommand(cmd) {
    if (cmd === "HELP") {
      flash("CMDS: GO DASH | GO CHG | GO FUNNEL | GO FORECAST | GO DEALS | GO REPS | GO SLIP | GO PIPE | GO RISKS | GO AUD | FILTER NA/EMEA/APAC | FCST COMMIT/BEST | MOTION ALL/NEW/EXP | ROTATE");
      return;
    }
    const goMap = {
      "GO DASH": "dashboard", "GO KPIS": "dashboard", "GO FUNNEL": "funnel",
      "GO FORECAST": "forecast", "GO FCST": "forecast", "GO DEALS": "deals",
      "GO REPS": "reps", "GO SEG": "segments", "GO SEGMENTS": "segments",
      "GO RISKS": "risks", "GO SLIP": "slippage", "GO SLIPPAGE": "slippage",
      "GO CHG": "changed", "GO CHANGED": "changed",
      "GO PIPE": "pipegen", "GO PIPEGEN": "pipegen",
      "GO AUD": "audience", "GO AUDIENCE": "audience",
      "GO NOTES": "release"
    };
    if (goMap[cmd]) { const el = document.getElementById(goMap[cmd]); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    if (cmd === "FCST COMMIT" || cmd === "FORECAST COMMIT") { setSeries("commit"); return; }
    if (cmd === "FCST BEST" || cmd === "FORECAST BEST")     { setSeries("bestcase"); return; }
    if (cmd === "MOTION ALL")                                { setMotion("all"); flash("MOTION LENS: ALL"); return; }
    if (cmd === "MOTION NEW" || cmd === "MOTION NEWLOGO" || cmd === "MOTION NEW LOGO") { setMotion("new"); flash("MOTION LENS: NEW LOGO"); return; }
    if (cmd === "MOTION EXP" || cmd === "MOTION EXPANSION") { setMotion("expansion"); flash("MOTION LENS: EXPANSION"); return; }
    if (cmd.startsWith("FILTER ")) {
      const r = cmd.slice(7).trim();
      if (["NA","EMEA","APAC"].includes(r)) {
        $("deal-region").value = r; applyDealFilters();
        document.getElementById("deals").scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    if (cmd === "ROTATE") { insightIdx = (insightIdx + 1) % D.insights.length; renderInsight(); return; }
    flash(`UNKNOWN CMD: ${cmd} · type HELP`, "err");
  }

  /* ---------- TOAST ---------- */
  function flash(msg, kind) {
    const t = document.createElement("div");
    t.style.cssText = "position:fixed;bottom:30px;right:14px;z-index:80;background:var(--bg-1);color:var(--white);border:1px solid var(--green);padding:10px 14px;font-size:12px;font-family:var(--mono);max-width:360px;";
    if (kind === "err") t.style.borderColor = "var(--red)";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2400);
  }

  /* ---------- UTILS ---------- */
  function $(id) { return document.getElementById(id); }
  function setText(id, t) { const el = $(id); if (el) el.textContent = t; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  }
  function formatK(n) {
    if (n >= 1e6) return (n/1e6).toFixed(2) + "M";
    if (n >= 1e3) return (n/1e3).toFixed(0) + "K";
    return n.toString();
  }

  /* ---------- INIT ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    renderTicker();
    tickClock(); setInterval(tickClock, 1000);
    renderKpis();
    renderChanged();
    renderFunnel();
    renderChart(currentSeries);
    bindToggle();
    renderDeals(D.topDeals.slice().sort((a,b) => b.amount - a.amount));
    bindDealFilters();
    bindMyDeals();
    renderMomentumHeatmap();
    renderReps();
    renderSegments();
    renderRegions();
    renderRisks();
    renderSlippage();
    renderPipegen();
    renderInsight();
    bindRegen();
    bindCommand();
    bindMotion();
    updateMotionChips();
    loadAudience();
    const r = $("aud-refresh"); if (r) r.addEventListener("click", loadAudience);
    setInterval(loadAudience, 30000);
  });
})();
