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
      // YoY second whisper line (#22): one tile per matching yoy key.
      const yoy = (showWhisper && D.yoyComparison) ? yoyForKpi(k.label) : null;
      const yoyWhisper = yoy
        ? (function () {
            const arrow = yoy.direction === "up" ? "▲" : "▼";
            const cls   = yoy.direction === "up" ? "green" : "red";
            const sign  = yoy.deltaPct >= 0 ? "+" : "";
            const ptsUnit = yoy.unit === "pts" ? " pts" : "%";
            const lyr   = fmtYoyVal(yoy.lastYr, yoy.unit);
            return `<div class="k-whisper k-whisper-yoy" title="Same week-of-quarter comparison vs ${esc(D.yoyComparison.asOfLastYr)}">vs ${esc(D.yoyComparison.sameQLastYr)}: <b>${esc(lyr)}</b> <span class="${cls}">${arrow} ${sign}${yoy.deltaPct.toFixed(1)}${ptsUnit}</span></div>`;
          })()
        : "";
      return `
        <div class="kpi ${k.tone}">
          <div class="k-label"><span>${esc(k.label)}</span><span class="badge">LIVE</span></div>
          <div class="k-value">${esc(k.value)}</div>
          <div class="k-delta ${k.direction}">${arrow} ${esc(k.delta)}</div>
          <div class="k-note">${esc(k.note)}</div>
          ${whisper}
          ${yoyWhisper}
          ${kpiBenchmarkWhisper(k.label)}
        </div>`;
    }).join("");
    grid.innerHTML = baseTiles + renderConcentrationTile();
    bindConcentration();
    decorateSalesCycleTile();
    setText("kpi-stamp", "LAST UPD " + new Date().toISOString().slice(11, 19) + "Z");
  }
  // Adds the "LONGEST: <stage> (<X>D)" whisper + click-to-funnel handler to
  // the Sales Cycle KPI tile (#13). Decoration is post-render so the generic
  // tile template stays untouched — same pattern used by bindConcentration().
  function decorateSalesCycleTile() {
    const grid = $("kpi-grid");
    if (!grid) return;
    const tile = [...grid.querySelectorAll(".kpi")].find((el) => {
      const lbl = el.querySelector(".k-label span");
      return lbl && lbl.textContent.trim() === "Sales Cycle";
    });
    if (!tile) return;
    const withMed = (D.funnel || []).filter((f) => f.medianDaysInStage != null);
    if (!withMed.length) return;
    const longest = withMed.slice().sort((a, b) =>
      (b.medianDaysInStage / (STAGE_DAY_BENCHMARKS[b.stage] || 1)) -
      (a.medianDaysInStage / (STAGE_DAY_BENCHMARKS[a.stage] || 1))
    )[0];
    if (!longest) return;
    // Append the longest-stage whisper line. Reuses the existing .k-whisper
    // visual treatment shipped in #10 for consistency.
    if (!tile.querySelector(".k-whisper-cycle")) {
      const w = document.createElement("div");
      w.className = "k-whisper k-whisper-cycle";
      w.title = "Click for stage-by-stage cycle breakdown";
      w.innerHTML = `LONGEST: <b>${esc(longest.stage.toUpperCase())} (${longest.medianDaysInStage}D)</b>`;
      tile.appendChild(w);
    }
    if (!tile.dataset.cycleBound) {
      tile.dataset.cycleBound = "1";
      tile.style.cursor = "pointer";
      tile.setAttribute("tabindex", "0");
      tile.setAttribute("role", "button");
      tile.title = "Jump to PIPELINE FUNNEL — longest stage highlighted";
      const jump = () => {
        const panel = $("funnel");
        if (!panel) return;
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
        const row = panel.querySelector(`.funnel-stage[data-stage="${cssEscape(longest.stage)}"]`);
        if (row) {
          row.classList.add("highlight-pulse");
          setTimeout(() => row.classList.remove("highlight-pulse"), 1600);
        }
      };
      tile.addEventListener("click", jump);
      tile.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); jump(); }
      });
    }
  }
  function cssEscape(s) {
    // CSS.escape polyfill — stage names in this codebase are simple
    // ASCII strings ("Proposal" etc) so a passthrough is safe.
    return String(s);
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
    ).join(" · ") + nsLine + (function () {
      // Top-3 owners + watchlist cross-flag (#21): if any of the top-3 owners
      // is currently on the AT-RISK REPS coaching list, concentration risk
      // visibly compounds with rep risk.
      try {
        const owners = [...new Set(s.top3.map((d) => d.owner).filter(Boolean))];
        if (!owners.length) return "";
        const wl = (typeof computeAtRiskReps === "function") ? computeAtRiskReps() : [];
        const wlNames = new Set(wl.map((w) => w.rep && w.rep.name).filter(Boolean));
        const flaggedOwners = owners.filter((o) => wlNames.has(o));
        let line = " · Top-3 deals owned by: " + owners.join(", ");
        if (flaggedOwners.length) {
          line += ` (${flaggedOwners.length} on coaching list: ${flaggedOwners.join(", ")})`;
        }
        return line;
      } catch (e) { return ""; }
    })() + (function () {
      // Top-3 average MEDDIC qual (#20): exposes whether the concentration
      // risk is also a defensibility risk.
      try {
        const scored = s.top3.filter((d) => d && d.meddic);
        if (!scored.length) return "";
        const avg = scored.reduce((a, d) => a + qualScore(d), 0) / scored.length;
        return ` · Top-3 avg qual: ${avg.toFixed(1)}/8`;
      } catch (e) { return ""; }
    })();
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
      const repByName = {};
      (D.reps || []).forEach((rp) => { repByName[rp.name] = rp; });
      const rows = ps.repAttainDeltas.slice(0, 3).map((r) => {
        const diff = r.newAttain - r.oldAttain;
        const cls  = diff >= 0 ? "green" : "red";
        const arr  = diff >= 0 ? "▲" : "▼";
        const rp   = repByName[r.name];
        const bm   = rp && rp.forecastHistory ? biasMeta(rp.forecastHistory.bias) : null;
        const biasChip = bm
          ? ` <span class="bias-chip bias-mini ${bm.cls}" title="Forecast bias from REPS · ${bm.label}">${bm.short}</span>`
          : "";
        return `
          <li class="chg-row">
            <span class="chg-acct">${esc(r.name)}${biasChip}</span>
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

  /* ---------- YoY SAME-QUARTER COMPARE (#22) ----------
     Compact 4-col panel that completes the temporal matrix
     (WoW · YoY · forward projection). Reconciles THIS Q with the live
     KPI snapshot; flags ⚠ MISMATCH if drift. Each KPI tile also gets a
     second whisper line driven by the same dataset. */
  function fmtYoyVal(v, unit) {
    if (v == null) return "—";
    switch (unit) {
      case "$M":   return "$" + v.toFixed(1) + "M";
      case "$K":   return "$" + Math.round(v) + "K";
      case "%":
      case "pts":  return v.toFixed(1) + "%";
      case "days": return Math.round(v) + " days";
      case "x":    return v.toFixed(1) + "x";
      default:     return String(v);
    }
  }
  // Map YoY entries to live KPI labels so we can reconcile / render the
  // second whisper line. Mirrors KPI_PRIOR_KEY but yoy-side.
  const YOY_TO_KPI_LABEL = {
    pipelineValue:    "Pipeline Value",
    weightedPipeline: "Weighted Pipeline",
    winRate:          "Win Rate (TTM)",
    avgDealSize:      "Avg Deal Size",
    salesCycle:       "Sales Cycle",
    coverage:         "Pipeline Coverage"
  };
  // Parse a KPI's displayed string back into the numeric basis used by yoy.
  function parseKpiValue(label, raw) {
    if (raw == null) return null;
    const s = String(raw);
    const num = parseFloat(s.replace(/[^\d.\-]/g, ""));
    if (!isFinite(num)) return null;
    if (label === "Avg Deal Size") return num; // displays $142K → 142
    return num;
  }
  function yoyMatchesLive(y) {
    const lbl = YOY_TO_KPI_LABEL[y.key];
    if (!lbl) return true; // commit / slippage have no direct KPI tile
    const live = (D.kpis || []).find((k) => k.label === lbl);
    if (!live) return true;
    const liveN = parseKpiValue(lbl, live.value);
    if (liveN == null) return true;
    return Math.abs(liveN - y.thisQ) < (Math.max(1, Math.abs(y.thisQ)) * 0.02 + 0.05);
  }
  function renderYoyPanel() {
    const y = D.yoyComparison;
    const tbody = $("yoy-tbody");
    const sub   = $("yoy-sub");
    const stat  = $("yoy-stat");
    if (!y || !tbody) return;
    if (sub) sub.textContent = y.period + " vs " + y.sameQLastYr;

    // For slippage, "down" actually means "less slippage = good". For all
    // others, "up" means "better". yoy entries already carry direction +
    // tone so we just render them honestly.
    let upCt = 0, downCt = 0, best = null, worst = null;
    tbody.innerHTML = (y.kpis || []).map((k) => {
      const goodDir = k.direction === "up";
      if (goodDir) upCt++; else downCt++;
      if (!best  || Math.abs(k.deltaPct) > Math.abs(best.deltaPct))  best  = goodDir ? k : best;
      if (!worst || Math.abs(k.deltaPct) > Math.abs(worst.deltaPct)) worst = goodDir ? worst : k;
      const arrow = goodDir ? "▲" : "▼";
      const cls   = goodDir ? "green" : "red";
      const mismatch = !yoyMatchesLive(k)
        ? ` <span class="yoy-mismatch" title="THIS Q value drifted from live KPI snapshot — investigate data freshness">⚠ MISMATCH</span>`
        : "";
      return `
        <tr>
          <td><b>${esc(k.label)}</b></td>
          <td class="num">${fmtYoyVal(k.thisQ, k.unit)}${mismatch}</td>
          <td class="num muted">${fmtYoyVal(k.lastYr, k.unit)}</td>
          <td class="num ${cls}"><b>${arrow} ${(k.deltaPct >= 0 ? "+" : "")}${k.deltaPct.toFixed(1)}${k.unit === "pts" ? " pts" : "%"}</b></td>
        </tr>`;
    }).join("");

    // Recompute the "best" pick honestly: best = largest positive % among
    // direction:up; worst = largest absolute % among direction:down.
    const ups   = (y.kpis || []).filter((k) => k.direction === "up");
    const downs = (y.kpis || []).filter((k) => k.direction !== "up");
    const bestPick  = ups.sort((a, b)   => b.deltaPct - a.deltaPct)[0];
    const worstPick = downs.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct))[0];

    if (stat) {
      stat.innerHTML =
        `<span class="dh-label">YoY:</span> ` +
        `<span class="dh-good">${upCt} UP</span> · ` +
        `<span class="dh-bad">${downCt} DOWN</span>` +
        (bestPick  ? ` · <span class="muted">BEST</span> <b class="green">${esc(bestPick.label)}</b> <span class="green">+${bestPick.deltaPct.toFixed(1)}%</span>` : "") +
        (worstPick ? ` · <span class="muted">WORST</span> <b class="red">${esc(worstPick.label)}</b> <span class="red">${worstPick.deltaPct >= 0 ? "+" : ""}${worstPick.deltaPct.toFixed(1)}%</span>` : "");
    }
  }
  // Look up the YoY entry whose key maps to a given KPI tile label.
  function yoyForKpi(label) {
    const y = D.yoyComparison;
    if (!y || !y.kpis) return null;
    const key = Object.keys(YOY_TO_KPI_LABEL).find((k) => YOY_TO_KPI_LABEL[k] === label);
    if (!key) return null;
    return y.kpis.find((k) => k.key === key) || null;
  }

  /* ---------- WHAT CHANGED basis toggle (#22) ----------
     wow (default) shows the week-over-week priorSnapshot diff.
     yoy switches just the commit-movement card to use yoyComparison's
     commitAtW8 entry — deal / rep / risk lists don't have YoY series,
     so we keep them as-is and label the basis. */
  const LS_BASIS_KEY = "salespulse.changedBasis";
  let changedBasis = (function () {
    try { const v = localStorage.getItem(LS_BASIS_KEY); return v === "yoy" ? "yoy" : "wow"; }
    catch (e) { return "wow"; }
  })();
  function renderChangedYoyCommit() {
    const y = D.yoyComparison;
    if (!y) return;
    const commitEntry = (y.kpis || []).find((k) => k.key === "commitAtW8");
    if (!commitEntry) return;
    const commitEl = $("chg-commit");
    if (!commitEl) return;
    const diff = +(commitEntry.thisQ - commitEntry.lastYr).toFixed(1);
    const cls  = diff >= 0 ? "green" : "red";
    const arr  = diff >= 0 ? "▲" : "▼";
    commitEl.innerHTML = `
      <div class="card-title">COMMIT MOVEMENT <span class="muted" style="font-weight:400;">· YoY</span></div>
      <div class="card-big">
        <b class="green">$${commitEntry.thisQ.toFixed(1)}M</b>
        <span class="muted">←</span>
        <b>$${commitEntry.lastYr.toFixed(1)}M</b>
      </div>
      <div class="card-row">
        <span class="${cls}"><b>${arr} $${Math.abs(diff).toFixed(1)}M</b></span>
        <span class="muted">commit @ W8 vs ${esc(y.sameQLastYr)}</span>
      </div>
      <div class="card-row">
        <span class="muted">basis</span>
        <span>${esc(y.asOf)} vs ${esc(y.asOfLastYr)}</span>
      </div>`;
  }
  function applyChangedBasis() {
    const basisEl = $("chg-basis");
    if (changedBasis === "yoy") {
      const y = D.yoyComparison;
      if (basisEl && y) basisEl.textContent = "vs " + y.sameQLastYr + " (YoY)";
      renderChangedYoyCommit();
    } else {
      renderChanged(); // restores WoW snapshot rendering for all 4 cards
    }
    document.querySelectorAll("#changed .chg-toggle .seg").forEach((b) => {
      const a = b.dataset.basis === changedBasis;
      b.classList.toggle("active", a);
      b.setAttribute("aria-pressed", a ? "true" : "false");
    });
  }
  function bindChangedToggle() {
    document.querySelectorAll("#changed .chg-toggle .seg").forEach((btn) => {
      btn.addEventListener("click", () => {
        const b = btn.dataset.basis;
        if (b !== "wow" && b !== "yoy") return;
        if (b === changedBasis) return;
        changedBasis = b;
        try { localStorage.setItem(LS_BASIS_KEY, changedBasis); } catch (e) {}
        applyChangedBasis();
      });
    });
  }

  /* ---------- FUNNEL ---------- */
  function renderFunnel() {
    const wrap = $("funnel");
    if (!wrap) return;
    // motion-scaled values: when the lens is set, apply each stage's
    // motionMix share so the bars and dollar totals reflect the slice.
    // counts/aging are also scaled (rounded) because mocked exact counts
    // per motion aren't tracked — proportional split is the honest read.
    // medianDaysInStage (#13) is intentionally NOT scaled — stage cycle
    // time is the same physics whether you slice by motion or not.
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
      // Median days-in-stage chip (#13) — tone is per-stage benchmark.
      const med = f.medianDaysInStage;
      const bench = STAGE_DAY_BENCHMARKS[f.stage];
      let medChip = "";
      if (med != null && bench) {
        const ratio = med / bench;
        const medTone = ratio <= 1.0 ? "good" : ratio <= 1.5 ? "warn" : "bad";
        medChip = `<span class="funnel-med ${medTone}" title="Median days in ${esc(f.stage)} stage · benchmark ${bench}d · ${ratio.toFixed(2)}× benchmark">MED ${med}D</span>`;
      }
      return `
        <div class="funnel-stage" data-stage="${esc(f.stage)}">
          <div class="funnel-name">${esc(f.stage)}</div>
          <div class="funnel-bar-col">
            <div class="funnel-bar-wrap">
              <div class="funnel-bar" style="width:${pct.toFixed(1)}%;">${s.count} DEALS</div>
            </div>${buckets}
          </div>
          <div class="funnel-amount">$${s.value.toFixed(1)}M</div>
          <div class="funnel-conv ${convCls}">${conv != null ? "↘ " + conv + "%" : "— win —"}</div>
          ${medChip}
        </div>`;
    }).join("");

    // Caption: TOTAL CYCLE: XD · LONGEST STAGE: <stage> (<X>D, <ratio>× BENCHMARK)
    const cap = $("funnel-cycle");
    if (cap) {
      const withMed = D.funnel.filter((f) => f.medianDaysInStage != null);
      const total = withMed.reduce((a, f) => a + f.medianDaysInStage, 0);
      const longest = withMed.slice().sort((a, b) =>
        (b.medianDaysInStage / (STAGE_DAY_BENCHMARKS[b.stage] || 1)) -
        (a.medianDaysInStage / (STAGE_DAY_BENCHMARKS[a.stage] || 1))
      )[0];
      if (longest) {
        const bench = STAGE_DAY_BENCHMARKS[longest.stage];
        const ratio = bench ? (longest.medianDaysInStage / bench).toFixed(1) : null;
        const ratioStr = ratio ? `, ${ratio}× BENCHMARK` : "";
        cap.innerHTML =
          `<span class="muted">TOTAL CYCLE:</span> <b>${total}D</b> ` +
          `<span class="muted">·</span> ` +
          `<span class="muted">LONGEST STAGE:</span> ` +
          `<b class="bad">${esc(longest.stage.toUpperCase())} (${longest.medianDaysInStage}D${ratioStr})</b>`;
      }
    }
  }
  // Per-stage benchmark median-days targets (#13). Document inline so the
  // heuristic is explainable and easy to tune. Sourced from Clari/Gong public
  // industry medians for B2B SaaS sales-cycle decomposition.
  const STAGE_DAY_BENCHMARKS = {
    "Prospects":   14,
    "Qualified":   12,
    "Discovery":   14,
    "Proposal":    14,
    "Negotiation": 12
  };

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
    // TODO: weight projection by D.reps[].forecastHistory once #19 reliability
    // is established as stable (#17 + #19 cross-issue). Today the projection
    // treats every rep's commit identically; weighting by rep reliability
    // (sandbag → keep best-case in projection, over-commit → discount commit)
    // would materially sharpen the Q-end midpoint.
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
    const projMethTip  = `Projection = current ${series === "commit" ? "commit" : "best case"} + (bestcase − commit) × ${(BEST_TO_COMMIT*100).toFixed(0)}% − slippage drag (${(SLIP_RECUR*100).toFixed(0)}% recurrence on $${slipTotal.toFixed(1)}M). Band = ±${projBandPct}% TTM forecast accuracy. Note: projection treats all commit deals identically; deals with qual < 5/8 historically land ~35% less often than qual ≥ 6/8 — interpret the projection range accordingly.`;

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
      // Reliability whisper (#19): share of commit from reliable forecasters,
      // and a $$ over-commit / sandbag estimate from historical bias.
      let relyPart = "";
      const reps = D.reps || [];
      if (reps.length && reps.some((r) => r.forecastHistory)) {
        const totalP = reps.reduce((s, r) => s + (r.pipeline || 0), 0);
        const relyP  = reps.filter((r) => r.forecastHistory && r.forecastHistory.bias === "reliable").reduce((s, r) => s + (r.pipeline || 0), 0);
        const relyPct = totalP > 0 ? Math.round((relyP / totalP) * 100) : 0;
        // historical mean miss (negative) and mean sandbag (positive) per bias
        const meanMiss = (bias) => {
          const xs = reps.filter((r) => r.forecastHistory && r.forecastHistory.bias === bias)
            .flatMap((r) => r.forecastHistory.last4Q || []);
          if (!xs.length) return 0;
          return xs.reduce((s, x) => s + x, 0) / xs.length;
        };
        const overShare = reps.filter((r) => r.forecastHistory && r.forecastHistory.bias === "over-commit").reduce((s, r) => s + (r.pipeline || 0), 0);
        const sandShare = reps.filter((r) => r.forecastHistory && r.forecastHistory.bias === "sandbag").reduce((s, r) => s + (r.pipeline || 0), 0);
        const overRisk  = Math.abs(meanMiss("over-commit") / 100) * commitLast * (overShare / Math.max(totalP, 1));
        const sandUp    = (meanMiss("sandbag") / 100) * commitLast * (sandShare / Math.max(totalP, 1));
        relyPart = ` Reliability: ${relyPct}% of commit from RELIABLE forecasters; over-committer risk ≈ $${overRisk.toFixed(1)}M may not land, sandbag upside ≈ $${sandUp.toFixed(1)}M may exceed commit.`;
      }
      cap.textContent = (showBand
        ? `Confidence band: ±${(acc * 100).toFixed(0)}% based on TTM forecast accuracy · ${pacePart}`
        : pacePart) + projPart + motionPart + relyPart;
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
      (function () {
        // YoY suffix (#22) — surface the year-ago commit @ same week in
        // the hero strip so the temporal context is visible without
        // scrolling to the YoY panel.
        const y = D.yoyComparison;
        if (!y || !y.kpis) return "";
        const ce = y.kpis.find((k) => k.key === "commitAtW8");
        if (!ce || ce.deltaPct == null) return "";
        const sign = ce.deltaPct >= 0 ? "+" : "";
        const cls  = ce.deltaPct >= 0 ? "green" : "red";
        return ` · <span class="${cls}">commit ${sign}${ce.deltaPct.toFixed(0)}% YoY</span>`;
      })() +
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
  let sortByQual    = false;
  let sortByReach   = false;
  const LS_QUAL_KEY = "salespulse.qualWeakOnly";
  let dealsWeakOnly = (function () {
    try { return localStorage.getItem(LS_QUAL_KEY) === "1"; }
    catch (e) { return false; }
  })();
  const LS_REACH_KEY = "salespulse.reachSingleOnly";
  let dealsSingleOnly = (function () {
    try { return localStorage.getItem(LS_REACH_KEY) === "1"; }
    catch (e) { return false; }
  })();
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

  /* ---------- QUAL — MEDDIC 0-8 score (#20) ----------
     Score = count of trues across M·E·D·D·I·C·P·C (MEDDPICC). Render shows
     <X>/8 tone-colored + 8-cell segmented bar in MEDDPICC order so an AE can
     see WHICH letters are missing at a glance. Weak commit = prob ≥ 70 AND
     score < 5 — a deal that's forecast to land but isn't defensible. */
  const MEDDIC_ORDER = ["M","E","D1","D2","I","C","P","Cm"];
  const MEDDIC_LABEL = {
    M:  "Metrics",
    E:  "Economic Buyer",
    D1: "Decision Criteria",
    D2: "Decision Process",
    I:  "Identify Pain",
    C:  "Champion",
    P:  "Paper Process",
    Cm: "Competition"
  };
  function qualScore(d) {
    if (!d || !d.meddic) return 0;
    return MEDDIC_ORDER.reduce((n, k) => n + (d.meddic[k] ? 1 : 0), 0);
  }
  function qualTone(s) {
    if (s >= 6) return "green";
    if (s >= 4) return "amber";
    return "red";
  }
  function isWeakCommit(d) {
    return d && d.prob >= 70 && qualScore(d) < 5;
  }
  function qualCell(d) {
    if (!d.meddic) return `<td class="num qual-cell"><span class="muted">—</span></td>`;
    const s = qualScore(d);
    const tone = qualTone(s);
    const cells = MEDDIC_ORDER.map((k) => {
      const on = !!d.meddic[k];
      return `<span class="qual-bar-cell ${on ? "on" : "off"}" title="${MEDDIC_LABEL[k]}: ${on ? "✓" : "✗"}">${k.charAt(0)}</span>`;
    }).join("");
    const missed = MEDDIC_ORDER.filter((k) => !d.meddic[k]).map((k) => MEDDIC_LABEL[k]);
    const tipBase = `MEDDPICC ${s}/8 — ` + (missed.length ? `missing: ${missed.join(", ")}` : `all checks complete`);
    const weakChip = isWeakCommit(d)
      ? ` <span class="qual-weak" title="Weak commit: ≥70% prob but qual &lt; 5/8 — high slip risk">!</span>`
      : "";
    return `<td class="num qual-cell" title="${esc(tipBase)}">`
         + `<span class="qual-num ${tone}">${s}/8</span>${weakChip}`
         + `<span class="qual-bar" aria-label="MEDDPICC checks">${cells}</span></td>`;
  }

  /* ---------- STAKEHOLDER REACH (#27) ----------
     Multi-threading / buying-group coverage on every top deal.
     5 standard roles (champion / economic-buyer / decision-maker /
     influencer / tech-evaluator) each scored 0 (none) / 1 (touched) /
     2 (engaged). reachScore = sum/10. Status bands per spec; thresholds
     relax under EXPANSION motion since renewals naturally narrow.
     "Single-threaded" is computed independently as engaged-count ≤ 1
     so a deal can be OK on raw score yet still flagged as a single
     point of failure on people. */
  const REACH_ROLES = [
    { key: "champion",      letter: "C",  label: "Champion" },
    { key: "economicBuyer", letter: "EB", label: "Economic Buyer" },
    { key: "decisionMaker", letter: "DM", label: "Decision Maker" },
    { key: "influencer",    letter: "I",  label: "Influencer" },
    { key: "techEvaluator", letter: "T",  label: "Tech Evaluator" }
  ];
  const REACH_STATE = { 0: "none", 1: "touched", 2: "engaged" };
  const REACH_GLYPH = { 0: "░░",   1: "▒▒",     2: "▓▓" };
  function reachScore(d) {
    if (!d || !d.reach) return 0;
    let sum = 0;
    REACH_ROLES.forEach((r) => { sum += (+d.reach[r.key] || 0); });
    return sum / 10;
  }
  function reachEngagedCount(d) {
    if (!d || !d.reach) return 0;
    return REACH_ROLES.reduce((n, r) => n + ((+d.reach[r.key] || 0) >= 2 ? 1 : 0), 0);
  }
  function isSingleThreaded(d) { return reachEngagedCount(d) <= 1; }
  function reachStatus(score, motion) {
    // Motion-aware: EXPANSION renewals are naturally narrower so floors relax.
    const exp = motion === "expansion";
    const T_STRONG = exp ? 0.5  : 0.7;
    const T_OK     = exp ? 0.3  : 0.4;
    const T_THIN   = exp ? 0.15 : 0.2;
    if (score >= T_STRONG) return "STRONG";
    if (score >= T_OK)     return "OK";
    if (score >= T_THIN)   return "THIN";
    return "SINGLE-THREADED";
  }
  function reachStatusCls(status) {
    if (status === "STRONG")          return "strong";
    if (status === "OK")              return "ok";
    if (status === "THIN")            return "thin";
    return "single";
  }
  function reachCell(d) {
    if (!d.reach) return `<td class="reach-cell"><span class="muted">—</span></td>`;
    const score   = reachScore(d);
    const engaged = reachEngagedCount(d);
    const status  = reachStatus(score, d.motion);
    const cls     = reachStatusCls(status);
    const cells = REACH_ROLES.map((r) => {
      const v = +d.reach[r.key] || 0;
      return `<span class="reach-bar-cell s${v}" title="${r.label}: ${REACH_STATE[v]}">${REACH_GLYPH[v]}</span>`;
    }).join("");
    const singleChip = (engaged <= 1)
      ? ` <span class="reach-single-chip" title="Single point of failure — only ${engaged} stakeholder${engaged === 1 ? "" : "s"} engaged">1-thread</span>`
      : "";
    // MEDDIC reconciliation guard — strong MEDDIC but weak reach is a red flag.
    const q = qualScore(d);
    const mismatchChip = (q >= 7 && score < 0.4)
      ? ` <span class="reach-mismatch" title="MEDDIC ${q}/8 but REACH ${(score*100).toFixed(0)}% — re-score C / EB">⚠ MISMATCH</span>`
      : "";
    const tip = `STAKEHOLDER REACH ${(score*100).toFixed(0)}% — ${status}\n` + REACH_ROLES.map((r) => `  ${r.label}: ${REACH_STATE[+d.reach[r.key] || 0]}`).join("\n");
    return `<td class="reach-cell" title="${esc(tip)}">`
         + `<span class="reach-status ${cls}">${status}</span>${singleChip}${mismatchChip}`
         + `<span class="reach-bar" aria-label="Buying-group coverage">${cells}</span>`
         + `<span class="reach-mobile ${cls}" aria-hidden="true">● ${status}</span>`
         + `</td>`;
  }
  function renderReachAggregate() {
    const el = $("reach-aggregate");
    if (!el) return;
    const deals = D.topDeals || [];
    if (!deals.length) { el.innerHTML = ""; return; }
    const scored = deals.filter((d) => !!d.reach);
    if (!scored.length) { el.innerHTML = ""; return; }
    const avg     = scored.reduce((s, d) => s + reachScore(d), 0) / scored.length;
    const singles = scored.filter(isSingleThreaded);
    const missEB  = scored.filter((d) => (+d.reach.economicBuyer || 0) === 0);
    const missDM  = scored.filter((d) => (+d.reach.decisionMaker || 0) === 0);
    const strongs = scored.filter((d) => reachStatus(reachScore(d), d.motion) === "STRONG");
    const avgStatus = reachStatus(avg, "all");
    const avgCls    = reachStatusCls(avgStatus);
    const singleAmt = singles.reduce((s, d) => s + (d.amount || 0), 0);
    const singleChip = singles.length
      ? `<button class="reach-agg-chip clickable ${dealsSingleOnly ? "active" : ""}" id="reach-single-chip" title="Filter TOP OPEN DEALS to single-threaded only">${singles.length} SINGLE-THREADED · $${formatK(singleAmt)} ⚠</button>`
      : `<span class="reach-agg-chip strong">0 SINGLE-THREADED ✓</span>`;
    const clearChip = dealsSingleOnly
      ? ` <button class="reach-agg-chip clear" id="reach-clear-chip" title="Clear single-threaded filter">✕ CLEAR</button>`
      : "";
    el.innerHTML = `
      <div class="reach-agg-head">
        <span class="reach-agg-title">STAKEHOLDER REACH</span>
        <span class="reach-agg-avg ${avgCls}" title="Portfolio average across top ${scored.length} open deals">PORTFOLIO ${(avg*100).toFixed(0)}% · ${avgStatus}</span>
      </div>
      <div class="reach-agg-row">
        ${singleChip}${clearChip}
        <span class="reach-agg-chip ${missEB.length > 3 ? "amber" : ""}" title="Deals with no economic-buyer contact">${missEB.length} NO EB</span>
        <span class="reach-agg-chip ${missDM.length > 3 ? "amber" : ""}" title="Deals with no decision-maker contact">${missDM.length} NO DM</span>
        <span class="reach-agg-chip strong" title="Deals at STRONG reach (≥0.7)">${strongs.length} STRONG ★</span>
      </div>
    `;
    const sc = $("reach-single-chip");
    if (sc) sc.addEventListener("click", () => {
      dealsSingleOnly = !dealsSingleOnly;
      try { localStorage.setItem(LS_REACH_KEY, dealsSingleOnly ? "1" : "0"); } catch (e) {}
      renderReachAggregate();
      applyDealFilters();
    });
    const cc = $("reach-clear-chip");
    if (cc) cc.addEventListener("click", () => {
      dealsSingleOnly = false;
      try { localStorage.setItem(LS_REACH_KEY, "0"); } catch (e) {}
      renderReachAggregate();
      applyDealFilters();
    });
  }
  function bindReachCellClicks() {
    const tbody = $("deals-tbody");
    if (!tbody) return;
    tbody.querySelectorAll(".reach-cell").forEach((td) => {
      td.addEventListener("click", () => {
        const tr = td.closest("tr");
        const acc = tr && tr.getAttribute("data-account");
        if (acc) highlightDealRow(acc);
      });
    });
  }
  function reachInsightBullet() {
    const deals = (D.topDeals || []).filter((d) => !!d.reach);
    if (!deals.length) return null;
    const singles = deals.filter(isSingleThreaded).sort((a, b) => b.amount - a.amount);
    if (!singles.length) return null;
    const top = singles[0];
    const amt = (top.amount / 1e6).toFixed(1);
    return `REACH risk: ${top.account} ($${amt}M) is single-threaded — only ${reachEngagedCount(top)} stakeholder${reachEngagedCount(top) === 1 ? "" : "s"} engaged. Single-threaded deals win ~18% vs ~47% for ≥5 stakeholders (Gartner 2024). Action: schedule an exec-sponsor intro this week.`;
  }

  /* ---------- DEAL DETAIL EXPANDER (#32) ----------
     Bloomberg DES-style inline expander on TOP OPEN DEALS. Click any row
     to inline-expand a 3-column detail box (activity timeline + MEDDIC
     breakdown + stakeholders) plus a notes line. Arrow keys navigate
     between deals while one is expanded. State persisted in localStorage.
     Mobile drops the inline expander in favor of a modal overlay. */
  const LS_EXPAND_KEY = "salespulse.expandedDealId";
  let expandedDealIds = (function () {
    try {
      const v = localStorage.getItem(LS_EXPAND_KEY);
      if (!v) return new Set();
      return new Set(v.split("||").filter(Boolean));
    } catch (e) { return new Set(); }
  })();
  function persistExpanded() {
    try { localStorage.setItem(LS_EXPAND_KEY, [...expandedDealIds].join("||")); } catch (e) {}
  }
  const ACTIVITY_GLYPH = { email: "✉", call: "☎", meeting: "⌘", note: "✎" };
  function relDay(daysAgo) {
    // Mock as-of June 12, 2026 (matches data.js meta).
    const today = new Date(2026, 5, 12);
    const d = new Date(today.getTime() - daysAgo * 86400000);
    return String(d.getMonth() + 1).padStart(2, "0") + "/" + String(d.getDate()).padStart(2, "0");
  }
  function buildActivityTimeline(d) {
    // 8 synthesized events going back from `lastTouchDays`. Mix of
    // email/call/meeting based on touchpoints14d intensity + stage.
    const lt = (d.engagement && d.engagement.lastTouchDays) || 7;
    const tp = (d.engagement && d.engagement.touchpoints14d) || 3;
    const owner = d.owner || "Owner";
    const stage = (d.stage || "").toLowerCase();
    const next  = (d.nextStep && d.nextStep.action) || null;
    const pool = [];
    if (next) pool.push({ daysAgo: 0,      kind: "note",    actor: owner, summary: "Next step queued: " + next });
    pool.push({ daysAgo: lt,                kind: "email",   actor: owner, summary: stage === "negotiation" ? "Legal redlines / pricing follow-up" : (stage === "proposal" ? "Sent proposal" : "Follow-up touch") });
    pool.push({ daysAgo: lt + 3,            kind: "call",    actor: owner, summary: stage === "negotiation" ? "45min — pricing concerns; champion bought-in" : "Discovery / qualification call" });
    pool.push({ daysAgo: lt + 7,            kind: "meeting", actor: owner + " + champion", summary: stage === "negotiation" ? "Demo for finance team" : "Stakeholder workshop" });
    pool.push({ daysAgo: lt + 11,           kind: "email",   actor: owner, summary: "Proposal sent" });
    pool.push({ daysAgo: lt + 14,           kind: "call",    actor: owner, summary: "Champion sync" });
    pool.push({ daysAgo: lt + 17,           kind: "meeting", actor: owner, summary: "Scoping workshop" });
    pool.push({ daysAgo: lt + 21,           kind: "email",   actor: owner, summary: "Intro deck sent" });
    pool.push({ daysAgo: lt + 25,           kind: "call",    actor: owner, summary: "Discovery call" });
    return pool.slice(0, 8);
  }
  function dealExtras(d) {
    return (D.dealDetailExtras && D.dealDetailExtras[d.account]) || null;
  }
  function meddicBreakdownTable(d) {
    // Renders 8 MEDDPICC letters as a stacked list with note from extras.
    const extras = dealExtras(d);
    const notes  = (extras && extras.meddicNotes) || {};
    return MEDDIC_ORDER.map((k) => {
      const on  = !!(d.meddic && d.meddic[k]);
      const lbl = MEDDIC_LABEL[k] || k;
      const glyph = on ? "★" : "⚠";
      const cls   = on ? "on"  : "off";
      const tone  = on ? "green" : "amber";
      const note  = notes[k] || (on ? "complete" : "missing");
      // Use the first letter of the MEDDIC key as the compact letter
      const letter = (k === "D1" ? "D"  : k === "D2" ? "Dp" : k === "Cm" ? "Cp" : k);
      return `<div class="expander-meddic-row ${cls}"><span class="exp-meddic-letter ${tone}">${letter}</span> <span class="exp-meddic-glyph ${tone}">${glyph}</span> <span class="exp-meddic-note">${esc(note)}</span></div>`;
    }).join("");
  }
  function stakeholderTable(d) {
    if (!d.reach) return `<div class="expander-empty">no reach data</div>`;
    const extras = dealExtras(d);
    const names = (extras && extras.roleNames) || {};
    return REACH_ROLES.map((r) => {
      const score = +(d.reach[r.key] || 0);
      const stateCls = score === 2 ? "engaged" : score === 1 ? "touched" : "missing";
      const glyph    = score === 2 ? "★" : score === 1 ? "●" : "⚠";
      const tone     = score === 2 ? "green" : score === 1 ? "amber" : "red";
      const entry    = names[r.key];
      let label = "— MISSING —";
      if (entry && entry.name) {
        label = `${esc(entry.name)} <span class="exp-stake-title">(${esc(entry.title || "")})</span>`;
      } else if (score > 0) {
        label = "— UNNAMED —";
      }
      return `<div class="expander-stake-row ${stateCls}"><span class="exp-stake-role">${esc(r.letter)}</span> <span class="exp-stake-glyph ${tone}">${glyph}</span> <span class="exp-stake-name">${label}</span></div>`;
    }).join("");
  }
  function activityTable(d) {
    const events = buildActivityTimeline(d);
    return events.map((e) => {
      const dateLbl = e.daysAgo === 0 ? "TODAY" : relDay(e.daysAgo);
      return `<div class="expander-act-row"><span class="exp-act-date">${esc(dateLbl)}</span> <span class="exp-act-icon">${ACTIVITY_GLYPH[e.kind] || "·"}</span> <span class="exp-act-summary">${esc(e.summary)}</span></div>`;
    }).join("");
  }
  function meddicReconChip(d) {
    // Cross-check sum-of-extras-notes-having-strong-status against the
    // shipped #20 aggregate.
    const aggregate = qualScore(d);
    const extras = dealExtras(d);
    if (!extras || !extras.meddicNotes) return "";
    const strongs = MEDDIC_ORDER.filter((k) => {
      const note = extras.meddicNotes[k] || "";
      return !!d.meddic[k] && !/^⚠/.test(note);
    }).length;
    if (Math.abs(strongs - aggregate) > 1) {
      return `<span class="expander-mismatch" title="Detail sum ${strongs}/8 vs row aggregate ${aggregate}/8">⚠ MISMATCH (detail ${strongs}/8 vs row ${aggregate}/8)</span>`;
    }
    return "";
  }
  function buildExpanderHTML(d) {
    const q     = qualScore(d);
    const score = reachScore(d);
    const status= reachStatus(score, d.motion);
    const extras = dealExtras(d);
    const notes = (extras && extras.notes) || "No notes recorded.";
    const recon = meddicReconChip(d);
    const stage = (d.stage || "").toUpperCase();
    const owner = d.owner || "—";
    const days  = (d.engagement && d.engagement.lastTouchDays) || 0;
    const headTone = (d.forecast || "").toLowerCase() === "commit" ? "green" : (d.forecast || "").toLowerCase() === "bestcase" ? "amber" : "red";
    return `
      <div class="expander-inner" role="region" aria-label="Deal detail for ${esc(d.account)}">
        <div class="expander-head">
          <span class="exp-head-chev">▼</span>
          <b class="${headTone}">${esc(d.account)}</b>
          <span class="exp-head-sep">·</span>
          <span class="exp-head-amt">$${formatK(d.amount)}</span>
          <span class="exp-head-sep">·</span>
          <span>${esc(owner)}</span>
          <span class="exp-head-sep">·</span>
          <span>${esc(stage)} (${days}d last touch)</span>
          ${recon}
          <button type="button" class="exp-collapse-btn" data-expander-close="${esc(d.account)}" aria-label="Collapse">▲ COLLAPSE</button>
        </div>
        <div class="expander-grid">
          <div class="expander-col">
            <div class="expander-col-title">ACTIVITY (last 8)</div>
            ${activityTable(d)}
          </div>
          <div class="expander-col">
            <div class="expander-col-title">MEDDIC ${q}/8 ${q < 5 ? "⚠" : "★"}</div>
            ${meddicBreakdownTable(d)}
          </div>
          <div class="expander-col">
            <div class="expander-col-title">STAKEHOLDERS · REACH ${(score*100).toFixed(0)}% ${status}</div>
            ${stakeholderTable(d)}
          </div>
        </div>
        <div class="expander-notes">
          <b>NOTES:</b> ${esc(notes)}
        </div>
        <div class="expander-actions">
          <button type="button" class="exp-action-btn" data-expander-jump-rep="${esc(d.owner)}">JUMP TO REPS →</button>
          <button type="button" class="exp-action-btn" data-expander-jump-scn="${esc(d.account)}">SCENARIO →</button>
        </div>
      </div>
    `;
  }
  function isMobileExpand() {
    try { return window.matchMedia && window.matchMedia("(max-width: 480px)").matches; }
    catch (e) { return false; }
  }
  function closeMobileExpander() {
    const modal = document.getElementById("deal-expand-modal");
    if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
  }
  function openMobileExpander(d) {
    closeMobileExpander();
    const wrap = document.createElement("div");
    wrap.id = "deal-expand-modal";
    wrap.className = "deal-expand-modal";
    wrap.innerHTML = `<div class="deal-expand-modal-backdrop" data-close="1"></div><div class="deal-expand-modal-body">${buildExpanderHTML(d)}</div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener("click", (ev) => {
      if (ev.target && ev.target.dataset && ev.target.dataset.close) closeMobileExpander();
    });
    bindExpanderInner(wrap, d);
  }
  function bindExpanderInner(scope, d) {
    scope.querySelectorAll("[data-expander-close]").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const acc = b.getAttribute("data-expander-close");
        if (isMobileExpand()) { closeMobileExpander(); return; }
        collapseRow(acc);
      });
    });
    scope.querySelectorAll("[data-expander-jump-rep]").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const owner = b.getAttribute("data-expander-jump-rep");
        const repsRow = document.querySelector(`#reps-tbody tr[data-rep="${owner}"]`);
        const repsPanel = document.getElementById("reps");
        if (repsPanel && repsPanel.scrollIntoView) repsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        if (repsRow) {
          repsRow.classList.remove("highlight-pulse");
          void repsRow.offsetWidth;
          repsRow.classList.add("highlight-pulse");
        }
      });
    });
    scope.querySelectorAll("[data-expander-jump-scn]").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const scn = document.getElementById("scenario");
        if (scn && scn.scrollIntoView) scn.scrollIntoView({ behavior: "smooth", block: "start" });
        if (scn) {
          scn.classList.remove("highlight-pulse");
          void scn.offsetWidth;
          scn.classList.add("highlight-pulse");
        }
      });
    });
  }
  function expanderColspan() { return 14; }
  function expandRow(account, multi) {
    const tbody = $("deals-tbody"); if (!tbody) return;
    const tr = tbody.querySelector(`tr[data-account="${cssEsc(account)}"]`);
    if (!tr) return;
    const d = (D.topDeals || []).find((x) => x.account === account);
    if (!d) return;
    if (isMobileExpand()) { openMobileExpander(d); return; }
    if (!multi) {
      // Collapse all others first.
      [...expandedDealIds].forEach((id) => { if (id !== account) collapseRow(id, true); });
      expandedDealIds.clear();
    }
    expandedDealIds.add(account);
    persistExpanded();
    // Inject the expander row right after the target row.
    if (tr.nextSibling && tr.nextSibling.classList && tr.nextSibling.classList.contains("expander-row")) {
      tr.nextSibling.parentNode.removeChild(tr.nextSibling);
    }
    const expRow = document.createElement("tr");
    expRow.className = "expander-row";
    expRow.dataset.expanderFor = account;
    expRow.innerHTML = `<td colspan="${expanderColspan()}">${buildExpanderHTML(d)}</td>`;
    tr.parentNode.insertBefore(expRow, tr.nextSibling);
    tr.classList.add("row-expanded");
    bindExpanderInner(expRow, d);
    // Update AI INSIGHTS to a deal-specific bullet.
    currentExpandedDealForInsight = account;
    try { renderInsight(); } catch (e) {}
  }
  function collapseRow(account, suppressInsight) {
    const tbody = $("deals-tbody"); if (!tbody) return;
    expandedDealIds.delete(account);
    persistExpanded();
    const expRow = tbody.querySelector(`tr.expander-row[data-expander-for="${cssEsc(account)}"]`);
    if (expRow && expRow.parentNode) expRow.parentNode.removeChild(expRow);
    const tr = tbody.querySelector(`tr[data-account="${cssEsc(account)}"]`);
    if (tr) tr.classList.remove("row-expanded");
    if (!suppressInsight) {
      if (currentExpandedDealForInsight === account) currentExpandedDealForInsight = null;
      try { renderInsight(); } catch (e) {}
    }
  }
  function cssEsc(s) {
    // Simple selector-safe escape (account names only — quotes / backslashes).
    return String(s).replace(/(["\\])/g, "\\$1");
  }
  let currentExpandedDealForInsight = null;
  function expandedDealInsightBullet() {
    if (!currentExpandedDealForInsight) return null;
    const d = (D.topDeals || []).find((x) => x.account === currentExpandedDealForInsight);
    if (!d) return null;
    const ex = dealExtras(d);
    const score = reachScore(d);
    const reachWord = score < 0.4 ? "single-thread risk" : (score < 0.7 ? "OK reach" : "STRONG reach");
    const q = qualScore(d);
    const action = (ex && ex.notes && ex.notes.split(/Recommended|Risk:/)[1])
      ? ((ex.notes.split(/Recommended/)[1] || "").trim().slice(0, 200))
      : "review next-step queue";
    return `${d.account} expanded: MEDDIC ${q}/8, REACH ${(score*100).toFixed(0)}% (${reachWord}). ${ex && ex.notes ? ex.notes : ""}`.trim();
  }
  function bindDealRowExpand() {
    const tbody = $("deals-tbody"); if (!tbody) return;
    // Click handler for ACCOUNT cell (first td) — clicking other cells
    // doesn't expand (so REACH-cell jump etc still work).
    tbody.addEventListener("click", (ev) => {
      // Don't hijack clicks on form controls inside expander.
      if (ev.target.closest(".expander-row")) return;
      const tr = ev.target.closest("tr[data-account]");
      if (!tr) return;
      // Only expand when the click is on the account cell (first td).
      const td = ev.target.closest("td");
      if (!td) return;
      const isFirstTd = tr.querySelector("td") === td;
      const isReach = td.classList.contains("reach-cell");
      if (!isFirstTd && !isReach) return;
      if (isReach) return; // reach-cell handler already manages its own click
      const acc = tr.dataset.account;
      if (expandedDealIds.has(acc)) collapseRow(acc);
      else expandRow(acc, !!ev.shiftKey);
    });
    // Keyboard nav.
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && expandedDealIds.size) {
        [...expandedDealIds].forEach((id) => collapseRow(id));
        return;
      }
      if (!expandedDealIds.size) return;
      if (ev.key !== "ArrowDown" && ev.key !== "ArrowUp") return;
      // Don't hijack when typing in an input.
      const tag = (ev.target && ev.target.tagName) || "";
      if (/^(INPUT|TEXTAREA|SELECT)$/i.test(tag)) return;
      ev.preventDefault();
      const last = [...expandedDealIds][expandedDealIds.size - 1];
      const rows = [...tbody.querySelectorAll("tr[data-account]")];
      const idx = rows.findIndex((r) => r.dataset.account === last);
      if (idx === -1) return;
      const next = ev.key === "ArrowDown" ? rows[idx + 1] : rows[idx - 1];
      if (!next) return;
      collapseRow(last);
      expandRow(next.dataset.account, false);
      // Scroll into view.
      next.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }
  function restoreExpandedAfterRender() {
    // After renderDeals() rebuilds tbody, re-inject any persisted expansions.
    if (!expandedDealIds.size) return;
    if (isMobileExpand()) return;
    const ids = [...expandedDealIds];
    expandedDealIds.clear();
    ids.forEach((id) => expandRow(id, true));
  }

  /* ---------- BENCHMARKS (#30) ----------
     External Pavilion-style quartile placement for every KPI: turns the
     internal-only "is it changing?" dashboard into an external-context
     "are we good?" dashboard. Renders an 8-chip strip + BENCHMARK INDEX
     under KPI DESK, and a third-line whisper under each KPI tile that
     has a benchmark mapping. */
  function benchStatusBand(pct) {
    if (pct >= 75) return { cls: "strong", glyph: "★", word: "top-quartile" };
    if (pct >= 50) return { cls: "ok",     glyph: "●", word: "above median" };
    if (pct >= 40) return { cls: "ok",     glyph: "●", word: "at median" };
    if (pct >= 25) return { cls: "amber",  glyph: "⚠", word: "below median" };
    return                  { cls: "red",   glyph: "⛔", word: "bottom-quartile" };
  }
  function benchFormatQuartile(v, fmt) {
    if (fmt === "pct")  return (v * 100).toFixed(0) + "%";
    if (fmt === "days") return v + "d";
    if (fmt === "k")    return "$" + v + "K";
    if (fmt === "x")    return v.toFixed(1) + "x";
    return String(v);
  }
  function benchKpiOursMismatch(b) {
    // Looks up the live KPI value matching this benchmark's kpiKey and
    // reports drift > 0.5% so the user knows the benchmark chip is in
    // sync with what's rendered in the KPI tile.
    if (!b.kpiKey) return null;
    const k = (D.kpis || []).find((x) => x.label === b.kpiKey);
    if (!k) return null;
    const num = parseFloat(String(k.value).replace(/[^0-9.\-]/g, ""));
    if (isNaN(num)) return null;
    let oursAsKpi = b.ours;
    if (b.fmt === "pct") oursAsKpi = b.ours * 100;
    else if (b.fmt === "k") oursAsKpi = b.ours;
    const drift = Math.abs(num - oursAsKpi) / Math.max(0.0001, Math.abs(oursAsKpi));
    return drift > 0.005 ? { live: k.value, benchOurs: b.ourLabel } : null;
  }
  function renderBenchmarks() {
    const strip = $("bench-strip");
    if (!strip || !D.benchmarks || !D.benchmarks.kpis) return;
    const kpis = D.benchmarks.kpis;
    const keys = Object.keys(kpis);
    const chips = keys.map((k) => {
      const b   = kpis[k];
      const band = benchStatusBand(b.pct);
      const q25  = benchFormatQuartile(b.p25, b.fmt);
      const q50  = benchFormatQuartile(b.p50, b.fmt);
      const q75  = benchFormatQuartile(b.p75, b.fmt);
      const arrow = b.hib ? "↑" : "↓";
      const mm    = benchKpiOursMismatch(b);
      const mmChip = mm
        ? ` <span class="bench-mismatch" title="Benchmark chip ours=${esc(b.ourLabel)} but live KPI=${esc(mm.live)}">⚠</span>`
        : "";
      const tip = `${b.label} — Pavilion P25=${q25} · P50=${q50} · P75=${q75} (${b.hib ? "higher is better" : "lower is better"})\nOur ${b.ourLabel} → P${b.pct} ${band.word}`;
      return `<button type="button" class="bench-chip ${band.cls}" data-bench-key="${esc(k)}" title="${esc(tip)}">`
           + `<span class="bench-chip-label">${esc(b.label)}</span>`
           + `<span class="bench-chip-our">${esc(b.ourLabel)}</span>`
           + `<span class="bench-chip-pct">P${b.pct} ${band.glyph}</span>${mmChip}`
           + `</button>`;
    }).join("");
    strip.innerHTML = chips;
    // BENCHMARK INDEX
    const indexEl = $("bench-index");
    if (indexEl) {
      const avg = keys.reduce((s, k) => s + kpis[k].pct, 0) / keys.length;
      const band = benchStatusBand(avg);
      indexEl.innerHTML = `<span class="bench-index-pill ${band.cls}" title="Average percentile placement across ${keys.length} KPIs">INDEX <b>${avg.toFixed(0)}/100</b> · P${avg.toFixed(0)} ${band.glyph}</span>`;
    }
    // Source caption: clickable to reveal "About this benchmark" drawer.
    const sub = $("bench-sub");
    const src = $("bench-source");
    if (sub && src) {
      sub.style.cursor = "pointer";
      sub.title = "Click for benchmark methodology";
      sub.onclick = () => {
        if (src.hasAttribute("hidden")) {
          src.removeAttribute("hidden");
          src.innerHTML = `<b>About this benchmark.</b> Source: ${esc(D.benchmarks.source)} · As-of ${esc(D.benchmarks.asOf)} · Sample N=${D.benchmarks.sampleN} mid-market SaaS companies. Quartile values (P25/P50/P75) are <i>mocked for demo</i> — Pavilion publishes real benchmarks for subscribers; this dashboard replaces them at deploy time. <span class="bench-source-url">${esc(D.benchmarks.sourceUrl || "")}</span>`;
        } else {
          src.setAttribute("hidden", "");
        }
      };
    }
    // Chip clicks: highlight-pulse the chip + scroll into view.
    strip.querySelectorAll(".bench-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        btn.classList.remove("bench-pulse");
        void btn.offsetWidth; // restart animation
        btn.classList.add("bench-pulse");
        const panel = $("benchmarks");
        if (panel && panel.scrollIntoView) panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    });
  }
  function kpiBenchmarkWhisper(label) {
    // Returns a third-line whisper HTML string for the KPI tile whose
    // label matches a benchmark.kpiKey. Returns "" when no match.
    if (!D.benchmarks || !D.benchmarks.kpis) return "";
    const entry = Object.values(D.benchmarks.kpis).find((b) => b.kpiKey === label);
    if (!entry) return "";
    const band = benchStatusBand(entry.pct);
    return `<div class="k-whisper k-whisper-bench ${band.cls}" title="Pavilion SaaS ${entry.label} — P25=${benchFormatQuartile(entry.p25, entry.fmt)} · P50=${benchFormatQuartile(entry.p50, entry.fmt)} · P75=${benchFormatQuartile(entry.p75, entry.fmt)}">BENCH: <b>P${entry.pct}</b> · ${esc(band.word)} ${band.glyph}</div>`;
  }
  function benchmarkInsightBullet() {
    if (!D.benchmarks || !D.benchmarks.kpis) return null;
    const kpis  = D.benchmarks.kpis;
    const list  = Object.values(kpis);
    const top   = list.slice().sort((a, b) => b.pct - a.pct)[0];
    const worst = list.slice().sort((a, b) => a.pct - b.pct)[0];
    if (!top || !worst) return null;
    return `BENCH: top-quartile on ${top.label.toLowerCase()} (${top.ourLabel} vs P75=${benchFormatQuartile(top.p75, top.fmt)}). Below-median on ${worst.label.toLowerCase()} (${worst.ourLabel} vs P50=${benchFormatQuartile(worst.p50, worst.fmt)}) — the single highest-leverage gap. Source: Pavilion SaaS Operator Benchmarks, mid-mkt $50-100M ARR, N=${D.benchmarks.sampleN}.`;
  }

  function renderDeals(rows) {
    const tbody = $("deals-tbody");
    if (!tbody) return;
    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="14" style="text-align:center;color:var(--dim);padding:18px;">NO MATCHING DEALS</td></tr>`;
      setText("deals-count", "0 OPEN · $0.0M");
      renderDealsHealth([]);
      renderQualHealth([]);
      return;
    }
    const total = rows.reduce((a, r) => a + r.amount, 0);
    setText("deals-count", `${rows.length} OPEN · $${(total/1e6).toFixed(1)}M`);
    // Pre-compute the top-3 set so each row knows whether to render the
    // TOP-3 CONCENTRATION (#11) star badge in the ACCOUNT column.
    const top3 = topAccountSet();
    if (sortByQual) {
      rows = rows.slice().sort((a, b) => qualScore(b) - qualScore(a) || b.amount - a.amount);
    } else if (sortByReach) {
      rows = rows.slice().sort((a, b) => reachScore(b) - reachScore(a) || b.amount - a.amount);
    } else if (sortByMomentum) {
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
          ${qualCell(d)}
          ${reachCell(d)}
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
    renderQualHealth(rows);
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

  /* renderQualHealth — panel-head micro-stat for #20.
     Shows average MEDDIC score across the rendered rows + count of
     WEAK-COMMIT deals (prob ≥ 70 AND qual < 5). The weak count is
     clickable and persists a filter (dealsWeakOnly) in localStorage. */
  function renderQualHealth(rows) {
    const el = $("deals-qual");
    if (!el) return;
    const scored = rows.filter((d) => d && d.meddic);
    const avg = scored.length
      ? scored.reduce((a, d) => a + qualScore(d), 0) / scored.length
      : 0;
    const weakCt = rows.filter(isWeakCommit).length;
    const weakCls   = weakCt > 0 ? "bad clickable" : "muted";
    const activeCls = dealsWeakOnly ? " active" : "";
    el.innerHTML =
      `<span class="dh-label">QUAL HEALTH:</span> ` +
      `<span class="dh-good">${avg.toFixed(1)}/8 AVG</span> · ` +
      `<span class="dh-bad ${weakCls}${activeCls}" id="qh-weak-toggle" title="${weakCt > 0 ? (dealsWeakOnly ? "Click to clear filter" : "Click to filter table to WEAK-COMMIT deals (≥70% prob, qual < 5/8)") : "No weak-commit deals"}" role="${weakCt > 0 ? "button" : "img"}" tabindex="${weakCt > 0 ? "0" : "-1"}">${weakCt} WEAK-COMMIT</span>`;
    const tog = $("qh-weak-toggle");
    if (tog && weakCt > 0) {
      const fire = () => {
        dealsWeakOnly = !dealsWeakOnly;
        try { localStorage.setItem(LS_QUAL_KEY, dealsWeakOnly ? "1" : "0"); } catch (e) {}
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
      .filter((d) => (!dealsWeakOnly || isWeakCommit(d)))
      .filter((d) => (!dealsSingleOnly || isSingleThreaded(d)))
      .sort((a, b) => b.amount - a.amount);
    renderDeals(rows);
    bindReachCellClicks();
    restoreExpandedAfterRender();
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
        if (sortByNextStep) { sortByMomentum = false; sortByQual = false; sortByReach = false; }
        thNs.classList.toggle("sorted", sortByNextStep);
        const thMo = $("th-momentum"); if (thMo) thMo.classList.remove("sorted");
        const thQ  = $("th-qual");     if (thQ)  thQ.classList.remove("sorted");
        const thR  = $("th-reach");    if (thR)  thR.classList.remove("sorted");
        applyDealFilters();
      });
    }
    const thMo = $("th-momentum");
    if (thMo) {
      thMo.addEventListener("click", () => {
        sortByMomentum = !sortByMomentum;
        if (sortByMomentum) { sortByNextStep = false; sortByQual = false; sortByReach = false; }
        thMo.classList.toggle("sorted", sortByMomentum);
        const thNs2 = $("th-nextstep"); if (thNs2) thNs2.classList.remove("sorted");
        const thQ2  = $("th-qual");     if (thQ2)  thQ2.classList.remove("sorted");
        const thR2  = $("th-reach");    if (thR2)  thR2.classList.remove("sorted");
        applyDealFilters();
      });
    }
    const thQu = $("th-qual");
    if (thQu) {
      thQu.addEventListener("click", () => {
        sortByQual = !sortByQual;
        if (sortByQual) { sortByMomentum = false; sortByNextStep = false; sortByReach = false; }
        thQu.classList.toggle("sorted", sortByQual);
        const thMo2 = $("th-momentum"); if (thMo2) thMo2.classList.remove("sorted");
        const thNs3 = $("th-nextstep"); if (thNs3) thNs3.classList.remove("sorted");
        const thRe2 = $("th-reach");    if (thRe2) thRe2.classList.remove("sorted");
        applyDealFilters();
      });
    }
    const thRe = $("th-reach");
    if (thRe) {
      thRe.addEventListener("click", () => {
        sortByReach = !sortByReach;
        if (sortByReach) { sortByMomentum = false; sortByNextStep = false; sortByQual = false; }
        thRe.classList.toggle("sorted", sortByReach);
        const thMo3 = $("th-momentum"); if (thMo3) thMo3.classList.remove("sorted");
        const thNs4 = $("th-nextstep"); if (thNs4) thNs4.classList.remove("sorted");
        const thQ3  = $("th-qual");     if (thQ3)  thQ3.classList.remove("sorted");
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

  /* ---------- NEXT-QUARTER COVERAGE (#16) ----------
     Renders open pipe by close-date quarter for Q2/Q3/Q4. Each column
     shows the coverage ratio (tone-colored vs 3.0x target), weighted +
     unweighted + deal count, weeks remaining in/to the quarter, and a
     pipegen-needed action row when coverage < target. A shared horizontal
     bar viz below the columns visualizes unweighted pipe vs the 3.0x
     target ($M scale shared across the 3 quarters). Q2 reconciles with
     the existing Weighted Pipeline KPI (58.7) and Coverage KPI (3.1x) —
     renders ⚠ MISMATCH if they drift. */
  function renderForwardCoverage() {
    const fc = D.forwardCoverage;
    const grid = $("fc-grid");
    const svg  = $("fc-svg");
    const cap  = $("fc-caption");
    if (!fc || !grid || !svg) return;

    const target = fc.coverageTarget || 3.0;

    // Reconciliation guard for Q2 vs existing KPIs (#16 acceptance criterion).
    let mismatch = "";
    try {
      const q2 = fc.quarters.find(q => q.isCurrent);
      const wpipeKpi = (D.kpis || []).find(k => /weighted/i.test(k.label || ""));
      const covKpi   = (D.kpis || []).find(k => /coverage/i.test(k.label || ""));
      const wpipeVal = wpipeKpi ? parseFloat(String(wpipeKpi.value).replace(/[^0-9.]/g, "")) : null;
      const covVal   = covKpi   ? parseFloat(String(covKpi.value).replace(/[^0-9.]/g, ""))   : null;
      if (q2 && wpipeVal != null && Math.abs(q2.weighted - wpipeVal) > 0.2) mismatch = "weighted";
      if (q2 && covVal   != null && Math.abs(q2.coverage - covVal)  > 0.2)  mismatch = mismatch ? "both" : "coverage";
    } catch (e) { /* ignore */ }

    function toneFor(cov) {
      if (cov >= target) return "green";
      if (cov >= target * 0.7) return "amber";
      return "red";
    }
    function gapFor(q) {
      // unweighted dollars needed to hit 3.0x for this quarter's quota
      const quota = fc.quotas[q.short] || 0;
      const need  = quota * target - q.unweighted;
      return need;
    }

    grid.innerHTML = fc.quarters.map(q => {
      const tone = toneFor(q.coverage);
      const quota = fc.quotas[q.short] || 0;
      const wkLabel = q.isCurrent
        ? `WK ${(D.meta && D.meta.weekNow) || "?"} OF ${(D.meta && D.meta.weeksTotal) || "?"}`
        : `${q.weeksRemaining} WK TO START`;
      const need = gapFor(q);
      const showAction = !q.isCurrent && q.coverage < target;
      const actionTone = need > quota * target * 0.5 ? "red" : "amber";
      const mmFlag = q.isCurrent && mismatch
        ? `<div class="fc-mismatch" title="Q2 row does not reconcile with existing ${mismatch === "both" ? "Weighted Pipeline + Coverage" : (mismatch === "weighted" ? "Weighted Pipeline" : "Coverage")} KPI — data drift">⚠ MISMATCH vs KPI</div>`
        : "";
      return `
        <div class="fc-col ${q.isCurrent ? "is-current" : ""}">
          <div class="fc-col-head">
            <span class="fc-label">${esc(q.label)}${q.isCurrent ? " <span class='fc-cur'>(CURRENT)</span>" : ""}</span>
            <span class="fc-wk muted">${wkLabel}</span>
          </div>
          <div class="fc-big ${tone}">${q.coverage.toFixed(1)}x</div>
          <div class="fc-tgt muted">vs ${target.toFixed(1)}x target · quota $${quota.toFixed(0)}M</div>
          <div class="fc-sec">
            <span><b>$${q.weighted.toFixed(1)}M</b> <span class="muted">weighted</span></span>
            <span class="sep">·</span>
            <span><b>$${q.unweighted.toFixed(1)}M</b> <span class="muted">unweighted</span></span>
            <span class="sep">·</span>
            <span><b>${q.dealCount}</b> <span class="muted">deals</span></span>
          </div>
          ${showAction
            ? `<div class="fc-action ${actionTone}">NEED <b>$${Math.max(0, need).toFixed(1)}M</b> MORE PIPE TO HIT ${target.toFixed(1)}x</div>`
            : (q.isCurrent
              ? `<div class="fc-action green">ON TRACK · ${(q.coverage / target * 100).toFixed(0)}% of ${target.toFixed(1)}x target</div>`
              : `<div class="fc-action green">AT OR ABOVE TARGET</div>`)
          }
          ${mmFlag}
        </div>`;
    }).join("");

    // Shared horizontal bar viz under the columns. Common scale = max(unweighted, quota×target) across all 3 quarters.
    const PADL = 70, PADR = 18, PADT = 14, PADB = 30, WIDTH = 600, HEIGHT = 110;
    const innerW = WIDTH - PADL - PADR;
    const rowH   = (HEIGHT - PADT - PADB) / fc.quarters.length;
    let scaleMax = 0;
    fc.quarters.forEach(q => {
      scaleMax = Math.max(scaleMax, q.unweighted, (fc.quotas[q.short] || 0) * target);
    });
    scaleMax = Math.ceil(scaleMax / 50) * 50; // round up to nice 50s

    let bars = "";
    fc.quarters.forEach((q, i) => {
      const y = PADT + i * rowH + 4;
      const h = rowH - 10;
      const wU = (q.unweighted / scaleMax) * innerW;
      const wW = (q.weighted   / scaleMax) * innerW;
      const quota = fc.quotas[q.short] || 0;
      const tgtX = PADL + (quota * target / scaleMax) * innerW;
      const tone = toneFor(q.coverage);
      const fillU = tone === "green" ? "var(--green)" : (tone === "amber" ? "var(--amber)" : "var(--red)");
      bars += `
        <text class="fc-row-lbl" x="${PADL - 10}" y="${y + h/2 + 4}" text-anchor="end">${esc(q.short)}</text>
        <rect class="fc-bar-u" x="${PADL}" y="${y}" width="${wU}" height="${h}" fill="${fillU}" fill-opacity="0.25" stroke="${fillU}" stroke-width="1"></rect>
        <rect class="fc-bar-w" x="${PADL}" y="${y + h*0.25}" width="${wW}" height="${h*0.5}" fill="${fillU}" fill-opacity="0.7"></rect>
        <line class="fc-target-marker" x1="${tgtX}" y1="${y - 1}" x2="${tgtX}" y2="${y + h + 1}" stroke="var(--white)" stroke-width="1.5" stroke-dasharray="3 2"></line>
        <text class="fc-row-val" x="${PADL + wU + 4}" y="${y + h/2 + 4}" fill="${fillU}">$${q.unweighted.toFixed(0)}M</text>`;
    });
    // X axis tick at scaleMax
    const xMid = PADL + innerW * 0.5;
    bars += `
      <line x1="${PADL}" y1="${HEIGHT - PADB + 4}" x2="${PADL + innerW}" y2="${HEIGHT - PADB + 4}" stroke="var(--border-2)" stroke-width="1"></line>
      <text class="fc-axis" x="${PADL}" y="${HEIGHT - 8}" text-anchor="start">$0</text>
      <text class="fc-axis" x="${xMid}" y="${HEIGHT - 8}" text-anchor="middle">$${(scaleMax/2).toFixed(0)}M</text>
      <text class="fc-axis" x="${PADL + innerW}" y="${HEIGHT - 8}" text-anchor="end">$${scaleMax.toFixed(0)}M</text>`;
    svg.innerHTML = bars;

    if (cap) {
      const q3 = fc.quarters.find(q => q.short === "Q3");
      const q4 = fc.quarters.find(q => q.short === "Q4");
      const q3Need = q3 ? gapFor(q3) : 0;
      const wkRunRate = (D.pipegen && D.pipegen.weeklyTarget) || 0;
      const wksToFill = wkRunRate > 0 ? (q3Need / wkRunRate).toFixed(1) : "?";
      cap.innerHTML = `Coverage target = <b>${target.toFixed(1)}x</b> unweighted pipe ÷ quota. Tone: <span class="green">green</span> ≥ ${target.toFixed(1)}x · <span class="amber">amber</span> ${(target*0.7).toFixed(1)}–${target.toFixed(1)}x · <span class="red">red</span> &lt; ${(target*0.7).toFixed(1)}x. At the current $${wkRunRate.toFixed(1)}M/wk pipegen run-rate, closing the Q3 gap is a <b>${wksToFill}-week</b> sprint of perfect pipegen — see PIPELINE CREATED panel.`;
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
  // FORECAST RELIABILITY (#19): per-rep forecast accuracy + bias chip + 4Q sparkline.
  // Bias values: "reliable" | "sandbag" | "over-commit". last4Q values are
  // (actual − commit) / commit × 100 per quarter (neg = over-committed; pos = sandbagged).
  function biasMeta(b) {
    if (b === "reliable")    return { label: "RELIABLE", cls: "green", short: "RELY" };
    if (b === "sandbag")     return { label: "SANDBAG",  cls: "amber", short: "SAND" };
    if (b === "over-commit") return { label: "OVER",     cls: "red",   short: "OVER" };
    return { label: "—", cls: "muted", short: "—" };
  }
  function fcstAccCls(a) {
    if (a >= 80) return "green";
    if (a >= 65) return "amber";
    return "red";
  }
  function renderReps() {
    const tbody = $("reps-tbody");
    if (!tbody) return;
    tbody.innerHTML = D.reps.map((r) => {
      const attainCls = r.attain >= 90 ? "" : r.attain >= 70 ? "warn" : "bad";
      const actCls    = r.activity >= 80 ? "green" : r.activity >= 65 ? "amber" : "red";
      const fh        = r.forecastHistory || null;
      const accCell   = fh
        ? `<td class="num ${fcstAccCls(fh.accuracy)}" title="Last 4Q forecast accuracy">${fh.accuracy}%</td>`
        : `<td class="num muted">—</td>`;
      let biasCell = `<td class="muted">—</td>`;
      if (fh) {
        const bm  = biasMeta(fh.bias);
        const tip = "Last 4Q (actual − commit) / commit: " + (fh.last4Q || []).map((q) => (q >= 0 ? "+" : "") + q).join("  ");
        const dots = (fh.last4Q || []).map((q) => {
          const dc = q >= 5 ? "amber" : q <= -5 ? "red" : "green";
          return `<i class="fcst-dot ${dc}" title="${(q >= 0 ? "+" : "")}${q}%"></i>`;
        }).join("");
        biasCell = `<td><span class="bias-chip ${bm.cls}" title="${esc(tip)}">${bm.label}</span><span class="fcst-spark" aria-hidden="true">${dots}</span></td>`;
      }
      return `
        <tr data-rep="${esc(r.name)}">
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
          ${accCell}
          ${biasCell}
        </tr>`;
    }).join("");

    // Reliability rollup: share of pipeline-weighted commit from RELIABLE reps.
    const relyEl = $("reps-rely");
    if (relyEl) {
      const totalPipe = D.reps.reduce((s, r) => s + (r.pipeline || 0), 0);
      const relyPipe  = D.reps.filter((r) => r.forecastHistory && r.forecastHistory.bias === "reliable").reduce((s, r) => s + (r.pipeline || 0), 0);
      const nSand     = D.reps.filter((r) => r.forecastHistory && r.forecastHistory.bias === "sandbag").length;
      const nOver     = D.reps.filter((r) => r.forecastHistory && r.forecastHistory.bias === "over-commit").length;
      const pct       = totalPipe > 0 ? Math.round((relyPipe / totalPipe) * 100) : 0;
      relyEl.innerHTML = `RELIABILITY: <b>${pct}%</b> of commit from RELIABLE forecasters · <b class="amber">${nSand}</b> sandbag · <b class="red">${nOver}</b> over-commit`;
    }
  }

  /* ---------- AT-RISK REPS — coaching list (#21) ----------
     Auto-derived watchlist from existing rep + topDeals + priorSnapshot data.
     A rep enters the watchlist if ANY of:
       1) attain < 70
       2) activity < 65
       3) forecastHistory.bias == "over-commit" AND attain < 90
       4) >=1 of their top-12 deals has nextStep == null (missing)
       5) >=1 of their top-12 deals has engagement.score < 40 (cold)
       6) WoW attainment delta from priorSnapshot.repAttainDeltas <= -3
     Primary reason picked by severity ordering:
       missing next step > over-commit+behind > below 70% > cold deals > low activity > WoW drop.
     Action chip: PIPE REVIEW / 1:1 COACH / RAMP CHECK / DEAL INSPECT — picked by primary reason. */
  function computeAtRiskReps() {
    if (!Array.isArray(D.reps) || !Array.isArray(D.topDeals)) return [];
    const wowByName = {};
    ((D.priorSnapshot && D.priorSnapshot.repAttainDeltas) || []).forEach((r) => {
      wowByName[r.name] = (r.newAttain || 0) - (r.oldAttain || 0);
    });
    const dealsByOwner = {};
    D.topDeals.forEach((d) => {
      (dealsByOwner[d.owner] = dealsByOwner[d.owner] || []).push(d);
    });
    const out = [];
    D.reps.forEach((r) => {
      const triggered = [];
      const deals = dealsByOwner[r.name] || [];
      const missingNs = deals.filter((d) => !d.nextStep);
      const coldDeals = deals.filter((d) => d.engagement && d.engagement.score < 40);
      const bias      = r.forecastHistory && r.forecastHistory.bias;
      const wow       = wowByName[r.name];

      if (missingNs.length > 0)
        triggered.push({ kind: "missingNs", sev: 6, text: `${missingNs.length} top deal${missingNs.length>1?"s":""} missing next step`, action: "PIPE REVIEW" });
      if (bias === "over-commit" && r.attain < 90)
        triggered.push({ kind: "overBehind", sev: 5, text: `chronic over-commit · attain ${r.attain}%`, action: "DEAL INSPECT" });
      if (r.attain < 70)
        triggered.push({ kind: "lowAttain", sev: 4, text: `attain ${r.attain}%`, action: "1:1 COACH" });
      if (coldDeals.length > 0)
        triggered.push({ kind: "cold", sev: 3, text: `${coldDeals.length} cold top deal${coldDeals.length>1?"s":""}`, action: "PIPE REVIEW" });
      if (r.activity < 65)
        triggered.push({ kind: "lowAct", sev: 2, text: `activity ${r.activity}`, action: "RAMP CHECK" });
      if (typeof wow === "number" && wow <= -3)
        triggered.push({ kind: "wowDrop", sev: 1, text: `WoW ${wow}pts`, action: "1:1 COACH" });

      if (!triggered.length) return;
      triggered.sort((a, b) => b.sev - a.sev);
      const primary = triggered[0];
      const tone = triggered.length >= 2 ? "red" : "amber";
      // Rationale: primary reason + the most-actionable extras, capped ~80 chars.
      const extras = triggered.slice(1).map((t) => t.text);
      let rationale = `${primary.text}${extras.length ? " · " + extras.join(" · ") : ""}`;
      if (rationale.length > 90) rationale = rationale.slice(0, 87) + "…";
      out.push({
        rep: r,
        triggered,
        primary,
        tone,
        action: primary.action,
        rationale,
        // 1:1 = behind on quota or wow drop, not just deal-hygiene
        needs11: triggered.some((t) => t.kind === "lowAttain" || t.kind === "wowDrop" || t.kind === "overBehind")
      });
    });
    // Sort: red before amber, then by severity of primary reason desc.
    out.sort((a, b) => (a.tone === b.tone ? b.primary.sev - a.primary.sev : (a.tone === "red" ? -1 : 1)));
    return out;
  }
  function renderAtRiskReps() {
    const list = $("ar-list");
    const stat = $("ar-stat");
    const cap  = $("ar-caption");
    if (!list) return;
    const wl = computeAtRiskReps();
    if (!wl.length) {
      if (stat) stat.innerHTML = `<b class="green">ALL REPS ON TRACK — TEAM HEALTHY</b>`;
      list.innerHTML = `<div class="ar-empty">No reps on the watchlist this week. ✓</div>`;
      if (cap) cap.textContent = "Watchlist criteria: attain < 70 · activity < 65 · over-commit bias + attain < 90 · top deal missing next step · cold top deal (engagement < 40) · WoW attain ≤ −3pts.";
      return;
    }
    const n11 = wl.filter((w) => w.needs11).length;
    if (stat) stat.innerHTML = `<b class="red">${wl.length}</b> reps at risk · <b class="amber">${n11}</b> need 1:1 this week`;
    list.innerHTML = wl.map((w) => {
      const region = esc(w.rep.region);
      const name   = esc(w.rep.name);
      // Bias chip if available — reuses #19 styling
      const fh = w.rep.forecastHistory;
      const bm = fh ? biasMeta(fh.bias) : null;
      const biasChip = bm
        ? `<span class="bias-chip bias-mini ${bm.cls}">${bm.short}</span>`
        : "";
      const primaryChip = `<span class="ar-primary ${w.tone}">${esc(w.primary.text.toUpperCase())}</span>`;
      const actionChip  = `<span class="ar-action ${w.tone}">${esc(w.action)}</span>`;
      return `
        <button class="ar-row" type="button" data-rep="${esc(w.rep.name)}"
          aria-label="Coach ${name}: ${esc(w.rationale)}. Suggested: ${esc(w.action)}.">
          <span class="ar-rep">
            <span class="ar-name"><b class="${w.tone}">●</b> ${name}</span>
            <span class="ar-region muted">${region}</span>
            ${biasChip}
          </span>
          <span class="ar-reason">
            ${primaryChip}
            <span class="ar-rationale">${esc(w.rationale)}</span>
          </span>
          <span class="ar-act-wrap">${actionChip}</span>
        </button>`;
    }).join("");
    if (cap) {
      cap.innerHTML = `Criteria: <b>attain &lt; 70</b> · activity &lt; 65 · over-commit bias + attain &lt; 90 · top deal missing next step · cold top deal (engagement &lt; 40) · WoW attain ≤ −3pts. <b class="red">RED</b> = 2+ triggers, <b class="amber">AMBER</b> = 1. Click a row to jump to that rep in the leaderboard.`;
    }
    bindAtRiskRows();
  }
  function bindAtRiskRows() {
    document.querySelectorAll(".ar-row").forEach((btn) => {
      btn.addEventListener("click", () => {
        const repName = btn.dataset.rep;
        if (!repName) return;
        // Scroll to REP LEADERBOARD and pulse the row.
        const reps = document.getElementById("reps");
        if (reps) reps.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => {
          const tbody = $("reps-tbody");
          if (!tbody) return;
          [...tbody.querySelectorAll("tr")].forEach((tr) => {
            if (tr.textContent.includes(repName)) {
              tr.classList.add("highlight-pulse");
              setTimeout(() => tr.classList.remove("highlight-pulse"), 1600);
            }
          });
        }, 250);
      });
    });
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
    const items = D.insights[insightIdx % D.insights.length].slice();
    try {
      const li = lensInsightIntro();
      if (li) items.unshift(li);
    } catch (e) {}
    try {
      const ib = inboxAiBullet();
      if (ib) items.unshift(ib);
    } catch (e) {}
    try {
      const rb = reachInsightBullet();
      if (rb) items.unshift(rb);
    } catch (e) {}
    try {
      const bb = benchmarkInsightBullet();
      if (bb) items.unshift(bb);
    } catch (e) {}
    try {
      const eb = expandedDealInsightBullet();
      if (eb) items.unshift(eb);
    } catch (e) {}
    list.innerHTML = items.map((s) => `<li>${esc(s)}</li>`).join("");
  }
  function bindRegen() {
    const btn = $("regen-insight"); if (!btn) return;
    btn.addEventListener("click", () => {
      insightIdx = (insightIdx + 1) % D.insights.length;
      renderInsight();
    });
  }

  /* ---------- ACTION INBOX (#23) ----------
     Consolidated, deduped, ranked queue of every red/amber across the
     dashboard with one-click jump-to-context. Aggregation only — never
     introduces new mock data, just reads existing panels' source data.

     Sources (9): slippage (#8) · missing/overdue next-step (#15) ·
     cold momentum (#14) · weak-commit MEDDIC (#20) · at-risk reps (#21) ·
     WoW negative prob moves ≥ $1M impact (#10) · forward coverage gap (#16) ·
     top-3 concentration (#11) · over-committer in commit (#19).

     Dedup: items sharing an account merge into one row. severity = max,
     amount = max deal amount (NOT summed — that double-counts the same $$),
     title concatenates the underlying issue bullets, category = "multi". */
  const LS_INBOX_VIEW = "salespulse.inboxView";
  let inboxView = (function () {
    try { const v = localStorage.getItem(LS_INBOX_VIEW); return ["all","high","account","rep"].includes(v) ? v : "all"; }
    catch (e) { return "all"; }
  })();
  const INBOX_SEV_RANK = { high: 3, medium: 2, low: 1 };
  const INBOX_SEV_DOT  = { high: "red", medium: "amber", low: "green" };
  const INBOX_MAX_VISIBLE = 12;

  function inboxSeverityFromAmount(amt, hi, mid) {
    if (amt >= hi)  return "high";
    if (amt >= mid) return "medium";
    return "low";
  }
  function missedMeddicNames(d) {
    if (!d.meddic || typeof MEDDIC_ORDER === "undefined") return "";
    return MEDDIC_ORDER.filter((k) => !d.meddic[k]).map((k) => MEDDIC_LABEL[k]).join(", ");
  }
  function buildInboxItems() {
    const items = [];

    // 1) Slippage (#8) — every slipped deal ≥ $500K.
    ((D.slippage && D.slippage.items) || []).forEach((s) => {
      if (s.amount < 500000) return;
      items.push({
        severity: inboxSeverityFromAmount(s.amount, 1500000, 500000),
        category: "slippage",
        account:  s.account,
        owner:    s.owner,
        title:    `${s.account} — slipped to ${s.toClose} (${s.reason})`,
        rationale:`$${(s.amount/1e6).toFixed(2)}M slipped out of Q2`,
        amount:   s.amount,
        jumpAccount: s.account,
        suggestedAction: "PIPE REVIEW"
      });
    });

    // 2) Missing / overdue next-step (#15) — every top deal in bad health.
    (D.topDeals || []).forEach((d) => {
      const h = dealHealth(d);
      if (h !== "missing" && h !== "overdue") return;
      const sev = (d.amount >= 1000000 && d.forecast === "commit")
        ? "high" : inboxSeverityFromAmount(d.amount, 1500000, 500000);
      const reason = h === "missing"
        ? "no next step logged"
        : `${Math.abs(d.nextStep.daysFromNow)}d overdue — ${d.nextStep.action}`;
      items.push({
        severity: sev, category: "next-step",
        account:  d.account, owner: d.owner,
        title:    `${d.account} — ${reason}`,
        rationale:`${(d.forecast||"").toUpperCase()} · $${(d.amount/1e6).toFixed(2)}M · ${d.prob}%`,
        amount:   d.amount,
        jumpAccount: d.account,
        suggestedAction: "DEAL INSPECT"
      });
    });

    // 3) Cold momentum (#14) — engagement score < 40.
    (D.topDeals || []).forEach((d) => {
      if (!d.engagement || d.engagement.score >= 40) return;
      items.push({
        severity: inboxSeverityFromAmount(d.amount, 1500000, 500000),
        category: "momentum",
        account:  d.account, owner: d.owner,
        title:    `${d.account} — cold momentum (score ${d.engagement.score}, last touch ${d.engagement.lastTouchDays}d ago)`,
        rationale:`${(d.forecast||"").toUpperCase()} · $${(d.amount/1e6).toFixed(2)}M · engagement trending ${d.engagement.trend||"flat"}`,
        amount:   d.amount,
        jumpAccount: d.account,
        suggestedAction: "DEAL INSPECT"
      });
    });

    // 4) Weak commit MEDDIC (#20) — prob ≥ 70 AND qual < 5/8.
    if (typeof qualScore === "function") {
      (D.topDeals || []).forEach((d) => {
        if (!d.meddic) return;
        const s = qualScore(d);
        if (!(d.prob >= 70 && s < 5)) return;
        const gaps = missedMeddicNames(d);
        items.push({
          severity: "high", category: "qual",
          account:  d.account, owner: d.owner,
          title:    `${d.account} — weak commit (qual ${s}/8, prob ${d.prob}%)`,
          rationale:`Un-defensible at ${(d.forecast||"").toUpperCase()} band · gaps: ${gaps}`,
          amount:   d.amount,
          jumpAccount: d.account,
          suggestedAction: "PIPE REVIEW"
        });
      });
    }

    // 5) At-risk reps (#21) — reuse the existing computeAtRiskReps() output.
    if (typeof computeAtRiskReps === "function") {
      computeAtRiskReps().forEach((w) => {
        if (!w.rep) return;
        const sev = w.tone === "red" ? "high" : "medium";
        items.push({
          severity: sev, category: "rep-risk",
          owner: w.rep.name,
          title:    `${w.rep.name} — ${w.primary.text}`,
          rationale:w.rationale || `attain ${w.rep.attain}% · ${w.rep.region}`,
          amount:   0,
          jumpSelector: "#at-risk-reps",
          suggestedAction: w.action || "1:1 COACH"
        });
      });
    }

    // 6) Negative WoW prob moves (#10) — only if implied $$ ≥ $1M.
    const ps = D.priorSnapshot;
    if (ps && Array.isArray(ps.dealProbDeltas)) {
      ps.dealProbDeltas.forEach((d) => {
        const diff = (d.newProb || 0) - (d.oldProb || 0);
        if (diff >= 0) return;
        const impact = (d.amount || 0) * (Math.abs(diff) / 100);
        if (impact < 1000000) return;
        const sev = impact >= 2000000 ? "high" : "medium";
        items.push({
          severity: sev, category: "wow-move",
          account:  d.account,
          title:    `${d.account} — prob dropped ${d.oldProb}% → ${d.newProb}% (${diff}pts)`,
          rationale:`Implied $$ impact $${(impact/1e6).toFixed(2)}M (amount × prob delta)`,
          amount:   d.amount || 0,
          jumpAccount: d.account,
          suggestedAction: "DEAL INSPECT"
        });
      });
    }

    // 7) Forward coverage gap (#16) — any non-current quarter under 2.5x.
    if (D.forwardCoverage && Array.isArray(D.forwardCoverage.quarters)) {
      D.forwardCoverage.quarters.forEach((q) => {
        if (q.isCurrent) return;
        if (q.coverage >= 2.5) return;
        const need = (D.forwardCoverage.pipelineGenNeeded || {})[q.short];
        items.push({
          severity: "high", category: "coverage",
          title:    `${q.label} — coverage ${q.coverage.toFixed(1)}x vs 3.0x target`,
          rationale:`Need $${(need != null ? need : 0).toFixed(1)}M more unweighted in ${q.weeksRemaining} weeks`,
          amount:   0,
          jumpSelector: "#forward-cov",
          suggestedAction: "PIPE GEN"
        });
      });
    }

    // 8) Top-3 concentration alarm (#11) — if top-3 ≥ 40% of weighted pipe.
    (function () {
      const all = (D.topDeals || []).slice();
      const totalW = all.reduce((a, d) => a + (d.amount * d.prob / 100), 0);
      if (totalW <= 0) return;
      const sorted = all.sort((a, b) => (b.amount*b.prob/100) - (a.amount*a.prob/100));
      const top3 = sorted.slice(0, 3);
      const top3W = top3.reduce((a, d) => a + (d.amount*d.prob/100), 0);
      const sharePct = (top3W / totalW) * 100;
      if (sharePct < 40) return;
      items.push({
        severity: "high", category: "concentration",
        title:    `Top-3 concentration alarm — ${sharePct.toFixed(0)}% of weighted pipe in 3 accounts`,
        rationale:`${top3.map((d) => d.account).join(", ")} · single point of failure if any slips`,
        amount:   top3W * 1e6 / 1e6, // already in $, keep as $
        jumpSelector: "#kpi-conc",
        suggestedAction: "PIPE REVIEW"
      });
    })();

    // 9) Over-committer in commit (#19) — chronic over-commit reps with ≥ $1M in commit.
    (D.reps || []).forEach((rp) => {
      if (!rp.forecastHistory || rp.forecastHistory.bias !== "over-commit") return;
      const inCommit = (D.topDeals || [])
        .filter((d) => d.owner === rp.name && d.forecast === "commit")
        .reduce((a, d) => a + d.amount, 0);
      if (inCommit < 1000000) return;
      items.push({
        severity: "medium", category: "rep-risk",
        owner:    rp.name,
        title:    `${rp.name} — over-committer carrying $${(inCommit/1e6).toFixed(2)}M in commit`,
        rationale:`Last 4Q (actual−commit)/commit: ${rp.forecastHistory.last4Q.join(", ")} — discount commit at recal`,
        amount:   inCommit,
        jumpSelector: "#reps",
        suggestedAction: "FORECAST RECAL"
      });
    });

    return items;
  }
  function dedupeInboxItems(items) {
    const out = new Map();
    items.forEach((it) => {
      const key = it.account || ("__noacct:" + it.category + ":" + (it.owner || it.title));
      const prev = out.get(key);
      if (!prev) {
        out.set(key, Object.assign({}, it, {
          _titles: [it.title],
          _cats:   [it.category],
          _actions:[it.suggestedAction]
        }));
        return;
      }
      if (INBOX_SEV_RANK[it.severity] > INBOX_SEV_RANK[prev.severity]) prev.severity = it.severity;
      if (!prev._titles.includes(it.title))  prev._titles.push(it.title);
      if (!prev._cats.includes(it.category)) prev._cats.push(it.category);
      if (!prev._actions.includes(it.suggestedAction)) prev._actions.push(it.suggestedAction);
      // amount: take the max — DO NOT sum (same deal in multiple sources).
      if ((it.amount || 0) > (prev.amount || 0)) prev.amount = it.amount;
    });
    return [...out.values()].map((it) => {
      if (it._titles.length > 1) {
        it.category = "multi";
        it.title    = `${it.account || it.owner || ""} — ${it._titles.length} alerts (${it._cats.join(" + ")})`;
        it.rationale= it._titles.map((t) => "• " + t).join("  ");
      }
      delete it._titles; delete it._cats; delete it._actions;
      return it;
    });
  }
  function sortInbox(items) {
    return items.slice().sort((a, b) => {
      const s = (INBOX_SEV_RANK[b.severity] || 0) - (INBOX_SEV_RANK[a.severity] || 0);
      if (s !== 0) return s;
      const a$ = b.amount - a.amount;
      if (a$ !== 0) return a$;
      return (a.category || "").localeCompare(b.category || "");
    });
  }
  function truncate(s, n) {
    s = String(s || "");
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
  }
  function inboxItemRow(it) {
    const sevTone = INBOX_SEV_DOT[it.severity] || "amber";
    const acts = {
      "PIPE REVIEW":   "red",
      "DEAL INSPECT":  "amber",
      "1:1 COACH":     "amber",
      "PIPE GEN":      "red",
      "FORECAST RECAL":"amber",
      "COMPETE PLAY":  "amber",
      "RAMP CHECK":    "amber"
    };
    const actCls = acts[it.suggestedAction] || "muted";
    const amt = it.amount > 0
      ? `<span class="inbox-amt num">$${(it.amount/1e6).toFixed(2)}M</span>`
      : `<span class="inbox-amt num muted">—</span>`;
    const target = it.jumpAccount
      ? ` data-account="${esc(it.jumpAccount)}"`
      : (it.jumpSelector ? ` data-jump="${esc(it.jumpSelector)}"` : "");
    return `
      <li class="inbox-row" tabindex="0" role="button" title="${esc(it.title + (it.rationale ? " · " + it.rationale : ""))}"${target}>
        <span class="inbox-sev sev-${sevTone}" aria-label="${esc(it.severity)} severity">●</span>
        <span class="inbox-cat cat-${esc(it.category)}">${esc(truncate(String(it.category||"").toUpperCase(), 8))}</span>
        <span class="inbox-title">${esc(truncate(it.title, 80))}</span>
        ${amt}
        <span class="inbox-act act-${actCls}">${esc(it.suggestedAction)}</span>
      </li>`;
  }
  function inboxBucketed(items, bucketKey) {
    const buckets = new Map();
    items.forEach((it) => {
      const k = (it[bucketKey] || "(unassigned)");
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(it);
    });
    // Sort buckets by total $$ at risk desc.
    const ord = [...buckets.entries()].map(([k, list]) => ({
      key: k,
      list,
      tot: list.reduce((a, x) => a + (x.amount || 0), 0)
    })).sort((a, b) => b.tot - a.tot);
    return ord.map((g) => {
      const lbl = bucketKey === "account" ? "ACCOUNT" : "REP";
      const totLbl = g.tot > 0 ? `$${(g.tot/1e6).toFixed(2)}M` : "—";
      return `<li class="inbox-bucket-head">${esc(lbl)}: <b>${esc(g.key)}</b> <span class="muted">· ${g.list.length} item${g.list.length>1?"s":""} · ${totLbl}</span></li>` +
        sortInbox(g.list).map(inboxItemRow).join("");
    }).join("");
  }
  let inboxLastItems = [];
  function renderInbox() {
    const ul   = $("inbox-list");
    const stat = $("inbox-stat");
    const more = $("inbox-more");
    const segH = $("status-inbox");
    const segV = $("status-inbox-val");
    if (!ul) return;

    const raw   = buildInboxItems();
    const items = sortInbox(dedupeInboxItems(raw));
    inboxLastItems = items;
    const hi = items.filter((i) => i.severity === "high").length;
    const md = items.filter((i) => i.severity === "medium").length;
    const lo = items.filter((i) => i.severity === "low").length;
    const totalAtRisk = items.reduce((a, i) => a + (i.amount || 0), 0);

    // Filter chips: ALL, HIGH ONLY, BY ACCOUNT, BY REP.
    let view = items;
    if (inboxView === "high") view = items.filter((i) => i.severity === "high");

    // Empty / All-clear.
    if (items.length === 0) {
      ul.innerHTML = `<li class="inbox-empty"><b class="green">ALL CLEAR — NO ACTIONS PENDING</b><br><span class="muted">Friday looks easy. Go close something.</span></li>`;
      if (stat) stat.innerHTML = `<span class="dh-label">INBOX:</span> <span class="dh-good">0 ACTIONS</span>`;
      if (more) more.hidden = true;
      if (segV) segV.innerHTML = `<span class="green">0●</span>`;
      if (segH) segH.classList.remove("bad","warn");
    } else {
      if (inboxView === "account") {
        ul.innerHTML = inboxBucketed(view, "account");
      } else if (inboxView === "rep") {
        ul.innerHTML = inboxBucketed(view, "owner");
      } else {
        const visible = view.slice(0, INBOX_MAX_VISIBLE);
        const hidden  = view.slice(INBOX_MAX_VISIBLE);
        ul.innerHTML = visible.map(inboxItemRow).join("");
        if (more) {
          if (hidden.length > 0) {
            more.hidden = false;
            more.innerHTML = `<button type="button" class="btn sm" id="inbox-expand">+ ${hidden.length} MORE</button>`;
            const btn = $("inbox-expand");
            if (btn) btn.addEventListener("click", () => {
              ul.insertAdjacentHTML("beforeend", hidden.map(inboxItemRow).join(""));
              more.hidden = true;
              bindInboxRows();
            });
          } else {
            more.hidden = true; more.innerHTML = "";
          }
        }
      }

      if (stat) {
        stat.innerHTML =
          `<span class="dh-label">INBOX:</span> ` +
          `<b>${items.length} ACTIONS</b> · ` +
          `<span class="muted">$${(totalAtRisk/1e6).toFixed(1)}M AT RISK</span> · ` +
          `<span class="dh-bad">${hi}● HIGH</span> · ` +
          `<span class="dh-warn">${md}● MED</span> · ` +
          `<span class="dh-good">${lo}● LOW</span>`;
      }
      // Status bar segment color-toned by highest queue severity.
      if (segV && segH) {
        const tone = hi > 0 ? "red" : md > 0 ? "amber" : "green";
        segV.innerHTML = `<span class="${tone}">${items.length}●</span>`;
        segH.classList.remove("bad","warn");
        if (tone === "red") segH.classList.add("bad");
        else if (tone === "amber") segH.classList.add("warn");
      }
    }

    // Toggle states.
    document.querySelectorAll("#inbox .inbox-filters .seg").forEach((b) => {
      const a = b.dataset.inboxView === inboxView;
      b.classList.toggle("active", a);
      b.setAttribute("aria-pressed", a ? "true" : "false");
    });

    bindInboxRows();

    // Live INBOX ticker — count + total $$ at risk.
    if (D.ticker && Array.isArray(D.ticker)) {
      const t = D.ticker.find((x) => x.sym === "INBOX");
      if (t) {
        if (items.length === 0) {
          t.val = "CLEAR";
          t.chg = "+0 ACTIONS";
        } else {
          const totalAtRisk = items.reduce((a, i) => a + (i.amount || 0), 0);
          t.val = `${items.length}●`;
          t.chg = `-$${(totalAtRisk/1e6).toFixed(1)}M AT RISK`;
        }
        try { renderTicker(); } catch (e) {}
      }
    }
  }
  function bindInboxRows() {
    document.querySelectorAll("#inbox-list .inbox-row").forEach((row) => {
      if (row.dataset.bound) return;
      row.dataset.bound = "1";
      const fire = (e) => {
        if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        const acct = row.dataset.account;
        const sel  = row.dataset.jump;
        if (acct) { highlightDealRow(acct); return; }
        if (sel) {
          const el = document.querySelector(sel);
          if (!el) return;
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("highlight-pulse");
          setTimeout(() => el.classList.remove("highlight-pulse"), 1600);
        }
      };
      row.addEventListener("click",   fire);
      row.addEventListener("keydown", fire);
    });
  }
  function bindInboxFilters() {
    document.querySelectorAll("#inbox .inbox-filters .seg").forEach((btn) => {
      btn.addEventListener("click", () => {
        const v = btn.dataset.inboxView;
        if (v === inboxView) return;
        inboxView = v;
        try { localStorage.setItem(LS_INBOX_VIEW, inboxView); } catch (e) {}
        renderInbox();
      });
    });
    const segH = $("status-inbox");
    if (segH) {
      const jump = () => {
        const el = $("inbox");
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.add("highlight-pulse");
        setTimeout(() => el.classList.remove("highlight-pulse"), 1600);
      };
      segH.addEventListener("click", jump);
      segH.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); jump(); }
      });
    }
  }
  // Render-time AI insight bullet derived from current inbox contents.
  function inboxAiBullet() {
    const items = inboxLastItems.length ? inboxLastItems : sortInbox(dedupeInboxItems(buildInboxItems()));
    if (!items.length) return null;
    const hi = items.filter((i) => i.severity === "high");
    const totalAtRisk = items.reduce((a, i) => a + (i.amount || 0), 0);
    // Find account that appears in most underlying sources (multi-category dedup).
    const rawCounts = {};
    buildInboxItems().forEach((it) => {
      const k = it.account; if (!k) return;
      rawCounts[k] = (rawCounts[k] || 0) + 1;
    });
    let topAcct = null, topCt = 0;
    Object.keys(rawCounts).forEach((k) => { if (rawCounts[k] > topCt) { topCt = rawCounts[k]; topAcct = k; } });
    let bullet = `ACTION INBOX: ${items.length} actions tonight — $${(totalAtRisk/1e6).toFixed(1)}M at risk across ${hi.length} high-severity item${hi.length===1?"":"s"}.`;
    if (topAcct && topCt >= 2) {
      const acctItem = items.find((i) => i.account === topAcct);
      const acctAmt  = acctItem ? acctItem.amount : 0;
      const pctOfRisk = totalAtRisk > 0 ? (acctAmt / totalAtRisk) * 100 : 0;
      bullet += ` Top action: ${topAcct} surfaces in ${topCt} alerts. One pipe-review fixes ~${pctOfRisk.toFixed(0)}% of total $$ at risk.`;
    }
    return bullet;
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
      flash("CMDS: GO DASH | GO CHG | GO FUNNEL | GO FORECAST | GO DEALS | GO REPS | GO COACH | GO SLIP | GO PIPE | GO COV | GO RISKS | GO AUD | FILTER NA/EMEA/APAC | FCST COMMIT/BEST | MOTION ALL/NEW/EXP | LENS CRO/MGR/AE/CFO/CMO/BOARD/FULL | ROTATE");
      return;
    }
    const goMap = {
      "GO DASH": "dashboard", "GO KPIS": "dashboard", "GO FUNNEL": "funnel",
      "GO FORECAST": "forecast", "GO FCST": "forecast", "GO DEALS": "deals",
      "GO REPS": "reps", "GO SEG": "segments", "GO SEGMENTS": "segments",
      "GO RISKS": "risks", "GO SLIP": "slippage", "GO SLIPPAGE": "slippage",
      "GO CHG": "changed", "GO CHANGED": "changed",
      "GO PIPE": "pipegen", "GO PIPEGEN": "pipegen",
      "GO COV": "forward-cov", "GO COVERAGE": "forward-cov", "GO FCOV": "forward-cov",
      "GO RISK": "at-risk-reps", "GO ATRISK": "at-risk-reps", "GO COACH": "at-risk-reps",
      "GO AUD": "audience", "GO AUDIENCE": "audience",
      "GO NOTES": "release",
      "GO WL": "winloss", "GO WINLOSS": "winloss", "GO WIN": "winloss",
      "GO BENCH": "benchmarks", "GO BENCHMARKS": "benchmarks"
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
    if (cmd.startsWith("LENS ")) {
      const p = cmd.slice(5).trim().toLowerCase();
      if (LENS_MAP[p]) { setLens(p); flash("LENS: " + LENS_LABEL[p].toUpperCase()); return; }
      flash("UNKNOWN LENS: " + p.toUpperCase() + " — try CRO/MGR/AE/CFO/CMO/BOARD/FULL", "err");
      return;
    }
    flash(`UNKNOWN CMD: ${cmd} · type HELP`, "err");
  }

  /* ---------- WIN / LOSS REASONS (#18) ----------
     The playbook for next quarter is hidden in this quarter's losses.
     Renders two compact halves (WIN / LOSS) with horizontal stacked bars +
     mini-lists, a LOSS BY STAGE sub-section (where in the funnel we leak),
     and a COMPETITIVE SPLIT mini-bar (among "Lost to competitor" losses).
     All competitor names are fictitious per dashboard-context.md §7. */
  const WIN_TONES  = ["good","good","good","good","good"];          // green shades
  const LOSS_TONES = ["bad","bad","warn","warn","warn"];             // red→amber gradient
  const STAGE_TONES = ["warn","bad","bad","warn"];                   // emphasize discovery+proposal
  const COMP_TONES = ["bad","warn","muted","muted"];                 // top competitor stands out

  function renderWinLossBar(items, tones, hostId) {
    const host = $(hostId);
    if (!host) return;
    host.innerHTML = items.map((it, i) => {
      const t = tones[i] || "muted";
      const label = String(it.pct) + "%";
      return `<span class="winloss-seg seg-${t}" style="width:${it.pct}%;" title="${esc(it.reason || it.stage || it.competitor)} · ${it.pct}%">${it.pct >= 10 ? esc(label) : ""}</span>`;
    }).join("");
  }
  function renderWinLossList(items, tones, hostId, kind) {
    const host = $(hostId);
    if (!host) return;
    host.innerHTML = items.map((it, i) => {
      const t = tones[i] || "muted";
      const label = it.reason || it.stage || it.competitor;
      const compChip = (kind === "loss" && it.primaryCompetitor)
        ? ` <span class="winloss-comp-chip" data-competitor="${esc(it.primaryCompetitor)}" title="Top competitor for this loss reason">▸ ${esc(it.primaryCompetitor)}</span>`
        : "";
      const dataAttr = kind === "comp"
        ? ` data-competitor="${esc(it.competitor)}"`
        : ` data-reason="${esc(label)}"`;
      return `
        <li class="winloss-row tone-${t}"${dataAttr}>
          <span class="winloss-dot">●</span>
          <span class="winloss-label">${esc(label)}${compChip}</span>
          <span class="winloss-pct num">${it.pct}%</span>
          <span class="winloss-amt num">$${it.amount.toFixed(1)}M</span>
        </li>`;
    }).join("");
  }
  function renderWinLoss() {
    const wl = D.winLoss;
    if (!wl || !$("winloss")) return;

    // Header micro-stat: reconciles with existing Win Rate KPI; if it drifts
    // we render the same ⚠ MISMATCH warning pattern used by next-Q-cov (#16).
    const stat = $("winloss-stat");
    if (stat) {
      const tone = wl.trendVsPrior.delta >= 0 ? "dh-good" : "dh-bad";
      const arrow = wl.trendVsPrior.delta >= 0 ? "▲" : "▼";
      const sign  = wl.trendVsPrior.delta >= 0 ? "+" : "";
      // Reconcile against Win Rate KPI if present.
      const kpiWR = (D.kpis || []).find((k) => k.label === "Win Rate (TTM)");
      const kpiPct = kpiWR ? parseFloat(String(kpiWR.value).replace(/[^0-9.]/g,"")) : null;
      const mismatch = (kpiPct != null && Math.abs(kpiPct - wl.trendVsPrior.currentWinRate) > 0.1)
        ? ` · <span class="dh-bad" title="Win rate here (${wl.trendVsPrior.currentWinRate}%) does not match KPI tile (${kpiPct}%)">⚠ MISMATCH</span>`
        : "";
      stat.innerHTML =
        `<span class="dh-label">WIN RATE ${esc(wl.period)}:</span> ` +
        `<b>${wl.trendVsPrior.currentWinRate}%</b> ` +
        `<span class="${tone}">${arrow} ${sign}${wl.trendVsPrior.delta.toFixed(1)} pts</span> ` +
        `<span class="muted">vs prior</span> · ` +
        `<b class="dh-good">$${wl.closedWonAmount.toFixed(1)}M WON</b> / ` +
        `<b class="dh-bad">$${wl.closedLostAmount.toFixed(1)}M LOST</b>` +
        mismatch;
    }
    // Sub-heads
    setText("winloss-win-sub",  `${wl.closedWonCount} DEALS · $${wl.closedWonAmount.toFixed(1)}M`);
    setText("winloss-loss-sub", `${wl.closedLostCount} DEALS · $${wl.closedLostAmount.toFixed(1)}M`);

    renderWinLossBar(wl.winReasons,  WIN_TONES,  "winloss-win-bar");
    renderWinLossBar(wl.lossReasons, LOSS_TONES, "winloss-loss-bar");
    renderWinLossList(wl.winReasons,  WIN_TONES,  "winloss-win-list",  "win");
    renderWinLossList(wl.lossReasons, LOSS_TONES, "winloss-loss-list", "loss");

    // LOSS BY STAGE — where in the funnel we leak the most $$.
    const stageTotal = wl.lossByStage.reduce((a, s) => a + s.amount, 0);
    setText("winloss-stage-sub", `$${stageTotal.toFixed(1)}M ACROSS ${wl.lossByStage.length} STAGES`);
    const stageBar = $("winloss-stage-bar");
    if (stageBar) {
      stageBar.innerHTML = wl.lossByStage.map((s, i) => {
        const pct = (s.amount / stageTotal) * 100;
        const t = STAGE_TONES[i] || "warn";
        return `<span class="winloss-seg seg-${t}" style="width:${pct.toFixed(1)}%;" title="${esc(s.stage)} · $${s.amount.toFixed(1)}M (${s.count} deals)">${pct >= 12 ? esc(s.stage.toUpperCase()) : ""}</span>`;
      }).join("");
    }
    const stageList = $("winloss-stage-list");
    if (stageList) {
      stageList.innerHTML = wl.lossByStage.map((s, i) => {
        const pct = (s.amount / stageTotal) * 100;
        const t = STAGE_TONES[i] || "warn";
        return `
          <li class="winloss-row tone-${t}" data-stage="${esc(s.stage)}">
            <span class="winloss-dot">●</span>
            <span class="winloss-label">${esc(s.stage)}</span>
            <span class="winloss-pct num">${pct.toFixed(0)}%</span>
            <span class="winloss-amt num">$${s.amount.toFixed(1)}M</span>
            <span class="winloss-count num muted">${s.count} deals</span>
          </li>`;
      }).join("");
    }

    // COMPETITIVE SPLIT — among "Lost to competitor", who beat us.
    renderWinLossBar(wl.competitiveSplit,  COMP_TONES, "winloss-comp-bar");
    renderWinLossList(wl.competitiveSplit, COMP_TONES, "winloss-comp-list", "comp");

    // No-op click handlers — data-attributes already in place for future
    // drill-down. Just flash a hint so the affordance feels alive.
    document.querySelectorAll("#winloss .winloss-row").forEach((row) => {
      if (row.dataset.bound) return;
      row.dataset.bound = "1";
      row.addEventListener("click", () => {
        const r = row.dataset.reason || row.dataset.stage || row.dataset.competitor;
        if (r) flash(`DRILL-DOWN: ${r} (coming soon)`);
      });
    });
  }

  /* ---------- LENS PERSONA MODES (#24) ----------
     Closes §9.2 cognitive-overload heuristic by giving each persona a
     curated subset of the 17 panels. Implementation hides via CSS class on
     <main> — DOM stays intact so all computed totals/insights remain in
     sync; we only flip visibility. Persona-specific side-effects (MY DEALS
     for AE, YoY basis for BOARD, motion=ALL for CMO) fire only on the
     persona-CHANGE event so they don't override the user's later choices. */
  const LS_LENS_KEY = "salespulse.lens";
  const LENS_LABEL = {
    cro: "CRO", mgr: "Sales Mgr", ae: "AE", cfo: "CFO",
    cmo: "CMO", board: "Board", full: "Full"
  };
  const LENS_USR_SHORT = {
    cro: "CRO", mgr: "MGR", ae: "AE", cfo: "CFO",
    cmo: "CMO", board: "BOARD", full: "VP SALES"
  };
  // Each value = the set of panel IDs visible for that persona. "full" = null
  // means everything visible (no hide rules emitted).
  const LENS_MAP = {
    cro:   new Set(["inbox","dashboard","benchmarks","forecast","changed","yoy","forward-cov","at-risk-reps","slippage","winloss","insights","audience","release"]),
    mgr:   new Set(["inbox","dashboard","funnel","deals","reps","at-risk-reps","slippage","changed","winloss","insights","release"]),
    ae:    new Set(["inbox","dashboard","deals","insights","release"]),
    cfo:   new Set(["dashboard","benchmarks","forecast","yoy","slippage","winloss","release"]),
    cmo:   new Set(["dashboard","benchmarks","pipegen","funnel","segments","winloss","insights","release"]),
    board: new Set(["dashboard","benchmarks","forecast","yoy","winloss","insights","release"]),
    full:  null
  };
  const ALL_PANEL_IDS = [
    "inbox","changed","yoy","dashboard","benchmarks","funnel","forecast","deals","slippage",
    "pipegen","forward-cov","at-risk-reps","reps","segments","winloss","risks","insights","audience","release"
  ];
  const LENS_SHORTCUT_ORDER = ["cro","mgr","ae","cfo","cmo","board","full"];
  const LENS_INSIGHT_INTRO = {
    cro:   "EXECUTIVE LENS: focus is on Q-end commit, slippage, YoY narrative, and rep risk — pipeline-creation panels hidden.",
    mgr:   "MANAGER LENS: focus is on deal/rep ops — exec narrative & pipegen panels hidden.",
    ae:    "AE LENS: MY DEALS auto-enabled — your individual quota, deals, and momentum only. Rep leaderboard hidden.",
    cfo:   "CFO LENS: money-only view — KPIs, FORECAST, projection, YoY, slippage. Funnel/segments hidden.",
    cmo:   "CMO LENS: demand-gen view — PIPELINE CREATED expanded, motion lens reset to ALL. Forecast/deals hidden.",
    board: "BOARD LENS: quarterly narrative — WHAT CHANGED flipped to YoY basis. Rep-level detail hidden."
  };

  let currentLens = (function () {
    try {
      const v = localStorage.getItem(LS_LENS_KEY);
      return v && LENS_MAP.hasOwnProperty(v) ? v : "full";
    } catch (e) { return "full"; }
  })();

  function applyLens() {
    const main = $("main");
    if (!main) return;
    // Reset all lens classes, set the active one.
    Object.keys(LENS_MAP).forEach((k) => main.classList.remove("lens-" + k));
    main.classList.add("lens-" + currentLens);

    // Update pill states.
    document.querySelectorAll("#lens-pills .lens-pill").forEach((b) => {
      const a = b.dataset.lens === currentLens;
      b.classList.toggle("active", a);
      b.setAttribute("aria-pressed", a ? "true" : "false");
    });

    // Update preview chip.
    const chip = $("lens-chip");
    if (chip) {
      if (currentLens === "full") {
        chip.hidden = true; chip.innerHTML = "";
      } else {
        const visible = LENS_MAP[currentLens].size;
        chip.hidden = false;
        chip.innerHTML =
          `<span class="lens-chip-lbl">LENS:</span> ` +
          `<b>${esc(LENS_LABEL[currentLens].toUpperCase())}</b> ` +
          `<span class="muted">· ${visible}/${ALL_PANEL_IDS.length} PANELS VISIBLE ·</span> ` +
          `<button type="button" class="lens-clear" id="lens-clear" title="Clear lens (return to FULL)">✕ CLEAR</button>`;
        const cb = $("lens-clear");
        if (cb) cb.addEventListener("click", () => setLens("full"));
      }
    }

    // Update status-bar USR segment.
    setText("status-usr-val", LENS_USR_SHORT[currentLens] || "VP SALES");

    // Update USR ticker entry.
    if (D.ticker && Array.isArray(D.ticker)) {
      const t = D.ticker.find((x) => x.sym === "USR");
      if (t) {
        t.val = (LENS_LABEL[currentLens] || "FULL").toUpperCase();
        t.chg = currentLens === "full" ? "+FULL DASHBOARD" : "+SCOPED VIEW";
        try { renderTicker(); } catch (e) {}
      }
    }
  }
  // Persona-specific side-effects (fire only on lens CHANGE — not on initial
  // load, so we don't override the user's later choices within a persona).
  function applyLensSideEffects(prev, next) {
    if (prev === next) return;
    try {
      if (next === "ae") {
        try { localStorage.setItem("salespulse.dealsMine", "1"); } catch (e) {}
        const toggle = $("deal-mine");
        if (toggle && typeof bindMyDeals === "function" && !toggle.classList.contains("active")) {
          toggle.click();
        }
      }
      if (next === "board") {
        try { localStorage.setItem("salespulse.changedBasis", "yoy"); } catch (e) {}
        if (typeof applyChangedBasis === "function") applyChangedBasis();
      }
      if (next === "cmo") {
        if (typeof setMotion === "function") setMotion("all");
      }
    } catch (e) { /* non-fatal */ }
  }
  function setLens(p) {
    if (!LENS_MAP.hasOwnProperty(p)) return;
    const prev = currentLens;
    currentLens = p;
    try { localStorage.setItem(LS_LENS_KEY, p); } catch (e) {}
    applyLensSideEffects(prev, p);
    applyLens();
    // Re-render insight so the lens-specific intro bullet updates.
    try { renderInsight(); } catch (e) {}
  }
  function bindLensPills() {
    document.querySelectorAll("#lens-pills .lens-pill").forEach((btn) => {
      btn.addEventListener("click", () => setLens(btn.dataset.lens));
    });
  }
  function bindLensShortcuts() {
    document.addEventListener("keydown", (e) => {
      if (!e.shiftKey) return;
      const idx = ["F1","F2","F3","F4","F5","F6","F7"].indexOf(e.key);
      if (idx === -1) return;
      e.preventDefault();
      setLens(LENS_SHORTCUT_ORDER[idx]);
      flash("LENS: " + LENS_LABEL[LENS_SHORTCUT_ORDER[idx]].toUpperCase());
    });
  }
  function lensInsightIntro() {
    if (currentLens === "full") return null;
    return LENS_INSIGHT_INTRO[currentLens] || null;
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
    renderBenchmarks();
    renderChanged();
    renderYoyPanel();
    applyChangedBasis();
    bindChangedToggle();
    renderFunnel();
    renderChart(currentSeries);
    bindToggle();
    renderDeals(D.topDeals.slice().sort((a,b) => b.amount - a.amount));
    bindDealFilters();
    bindMyDeals();
    bindDealRowExpand();
    renderMomentumHeatmap();
    renderReps();
    renderAtRiskReps();
    renderSegments();
    renderRegions();
    renderRisks();
    renderReachAggregate();
    renderSlippage();
    renderPipegen();
    renderForwardCoverage();
    renderWinLoss();
    renderInbox();
    bindInboxFilters();
    applyLens();
    bindLensPills();
    bindLensShortcuts();
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
