/* SalesPulse Live — dashboard behavior (vanilla JS) */
(function () {
  "use strict";
  const D = window.SALESPULSE_DATA;
  if (!D) { console.error("SalesPulse: data not loaded"); return; }

  const GH_OWNER = "HashwanthVen";
  const GH_REPO  = "salespulse-live";

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
  function renderKpis() {
    const grid = $("kpi-grid");
    if (!grid) return;
    grid.innerHTML = D.kpis.map((k) => {
      const arrow = k.direction === "up" ? "▲" : k.direction === "down" ? "▼" : "▬";
      return `
        <div class="kpi ${k.tone}">
          <div class="k-label"><span>${esc(k.label)}</span><span class="badge">LIVE</span></div>
          <div class="k-value">${esc(k.value)}</div>
          <div class="k-delta ${k.direction}">${arrow} ${esc(k.delta)}</div>
          <div class="k-note">${esc(k.note)}</div>
        </div>`;
    }).join("");
    setText("kpi-stamp", "LAST UPD " + new Date().toISOString().slice(11, 19) + "Z");
  }

  /* ---------- FUNNEL ---------- */
  function renderFunnel() {
    const wrap = $("funnel");
    if (!wrap) return;
    const max = D.funnel[0].value;
    wrap.innerHTML = D.funnel.map((f, i) => {
      const pct = Math.max((f.value / max) * 100, 6);
      const conv = f.convPct;
      let convCls = "";
      if (conv != null) {
        convCls = conv >= 60 ? "good" : conv >= 40 ? "warn" : "bad";
      }
      const a = f.aging;
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
              <div class="funnel-bar" style="width:${pct.toFixed(1)}%;">${f.count} DEALS</div>
            </div>${buckets}
          </div>
          <div class="funnel-amount">$${f.value.toFixed(1)}M</div>
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
    const values = D.trend[series];
    const quota = D.trend.quota;
    const weeks = D.trend.weeks;
    const acc = D.trend.forecastAccuracy || 0;
    const commitVals = D.trend.commit;
    const showBand = series === "commit" && acc > 0;
    const all = values.concat(quota);
    if (showBand) {
      for (const v of commitVals) all.push(v * (1 + acc));
    }
    const max = Math.max(...all);
    const min = 0;
    const range = Math.max(max - min, 1);
    function toY(v) { return PADT + innerH - ((v - min) / range) * innerH; }
    function toX(i) { return PADL + (i / (values.length - 1)) * innerW; }

    const grid = [];
    for (let i = 0; i <= 4; i++) {
      const y = PADT + (i / 4) * innerH;
      const v = max - (i / 4) * range;
      grid.push(`<line x1="${PADL}" y1="${y}" x2="${W - PADR}" y2="${y}"/>`);
      grid.push(`<text x="${PADL - 6}" y="${y + 3}" text-anchor="end">${v.toFixed(0)}</text>`);
    }
    const xLabels = weeks.map((m, i) => `<text x="${toX(i)}" y="${H - 8}" text-anchor="middle">${esc(m)}</text>`).join("");

    let bandSvg = "";
    if (showBand) {
      const upper = commitVals.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v * (1 + acc)).toFixed(1)}`).join(" ");
      let lower = "";
      for (let i = commitVals.length - 1; i >= 0; i--) {
        lower += ` L${toX(i).toFixed(1)},${toY(commitVals[i] * (1 - acc)).toFixed(1)}`;
      }
      bandSvg = `<path class="chart-band" d="${upper}${lower} Z"/>`;
    }

    const linePath = values.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
    const areaPath = linePath + ` L${toX(values.length-1).toFixed(1)},${PADT+innerH} L${toX(0).toFixed(1)},${PADT+innerH} Z`;
    const quotaPath = quota.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");

    const dots = values.map((v, i) => `<circle class="chart-dot" cx="${toX(i).toFixed(1)}" cy="${toY(v).toFixed(1)}" r="3"/>`).join("");

    svg.innerHTML = `
      <g class="chart-grid">${grid.join("")}</g>
      <g class="chart-axis">${xLabels}</g>
      ${bandSvg}
      <path class="chart-area" d="${areaPath}"/>
      <path class="chart-line" d="${linePath}"/>
      <path class="chart-quota" d="${quotaPath}"/>
      <g>${dots}</g>
    `;

    const last = values[values.length - 1];
    const target = quota[quota.length - 1];
    const gap = (last - target).toFixed(1);
    const gapCls = gap >= 0 ? "green" : "red";
    if (stat) {
      stat.innerHTML = `
        <div><span>SERIES</span><b>${series === "commit" ? "COMMIT" : "BEST CASE"}</b></div>
        <div><span>CURRENT</span><b>$${last.toFixed(1)}M</b></div>
        <div><span>QUOTA</span><b>$${target.toFixed(1)}M</b></div>
        <div><span>GAP</span><b class="${gapCls}">${gap >= 0 ? "+" : ""}$${gap}M</b></div>
      `;
    }
    if (cap) {
      cap.textContent = showBand
        ? `Confidence band: ±${(acc * 100).toFixed(0)}% based on TTM forecast accuracy`
        : "";
    }
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

  function renderDeals(rows) {
    const tbody = $("deals-tbody");
    if (!tbody) return;
    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--dim);padding:18px;">NO MATCHING DEALS</td></tr>`;
      setText("deals-count", "0 OPEN · $0.0M");
      return;
    }
    const total = rows.reduce((a, r) => a + r.amount, 0);
    setText("deals-count", `${rows.length} OPEN · $${(total/1e6).toFixed(1)}M`);
    tbody.innerHTML = rows.map((d) => {
      const probCls = d.prob >= 70 ? "green" : d.prob >= 40 ? "amber" : "red";
      const fcst = (d.forecast || "upside").toLowerCase();
      return `
        <tr>
          <td><b class="green">${esc(d.account)}</b></td>
          <td>${esc(d.stage)}</td>
          <td class="num">$${formatK(d.amount)}</td>
          <td class="num ${probCls}">${d.prob}%</td>
          <td>${esc(d.close)}</td>
          <td>${esc(d.owner)}</td>
          <td>${esc(d.region)}</td>
          <td>${esc(d.segment)}</td>
          <td><span class="status-pill ${fcst}">${esc(d.forecast)}</span></td>
        </tr>`;
    }).join("");
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
      .sort((a, b) => b.amount - a.amount);
    renderDeals(rows);
  }
  function bindDealFilters() {
    ["deal-search","deal-region","deal-forecast"].forEach((id) => {
      const el = $(id); if (el) el.addEventListener("input", applyDealFilters);
      if (el) el.addEventListener("change", applyDealFilters);
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
    grid.innerHTML = D.segments.map((s) => `
      <div class="seg">
        <div class="seg-name">${esc(s.name)}</div>
        <div class="seg-value">$${s.value.toFixed(1)}M</div>
        <div class="seg-bar"><span style="width:${s.share}%;"></span></div>
        <div class="seg-meta"><span>${s.share}%</span><span>${s.deals} deals</span></div>
      </div>
    `).join("");
  }

  /* ---------- REGIONS ---------- */
  function renderRegions() {
    const tbody = $("region-tbody");
    if (!tbody) return;
    tbody.innerHTML = D.regions.map((r) => {
      const cls = r.status.toLowerCase().replace(/\s+/g, "-");
      const growthGreen = r.growth.startsWith("+");
      const statusCls = r.status === "On Track" ? "commit" : r.status === "Watch" ? "open" : "risk";
      return `
        <tr>
          <td><b class="green">${esc(r.name)}</b></td>
          <td class="num">$${r.value.toFixed(1)}M</td>
          <td class="num">${r.deals}</td>
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
      flash("CMDS: GO DASH | GO FUNNEL | GO FORECAST | GO DEALS | GO REPS | GO RISKS | GO AUD | FILTER NA/EMEA/APAC | FCST COMMIT/BEST | ROTATE");
      return;
    }
    const goMap = {
      "GO DASH": "dashboard", "GO KPIS": "dashboard", "GO FUNNEL": "funnel",
      "GO FORECAST": "forecast", "GO FCST": "forecast", "GO DEALS": "deals",
      "GO REPS": "reps", "GO SEG": "segments", "GO SEGMENTS": "segments",
      "GO RISKS": "risks", "GO AUD": "audience", "GO AUDIENCE": "audience",
      "GO NOTES": "release"
    };
    if (goMap[cmd]) { const el = document.getElementById(goMap[cmd]); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    if (cmd === "FCST COMMIT" || cmd === "FORECAST COMMIT") { setSeries("commit"); return; }
    if (cmd === "FCST BEST" || cmd === "FORECAST BEST")     { setSeries("bestcase"); return; }
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
    renderFunnel();
    renderChart(currentSeries);
    bindToggle();
    renderDeals(D.topDeals.slice().sort((a,b) => b.amount - a.amount));
    bindDealFilters();
    bindMyDeals();
    renderReps();
    renderSegments();
    renderRegions();
    renderRisks();
    renderInsight();
    bindRegen();
    bindCommand();
    loadAudience();
    const r = $("aud-refresh"); if (r) r.addEventListener("click", loadAudience);
    setInterval(loadAudience, 30000);
  });
})();
