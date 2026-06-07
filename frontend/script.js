/* ===========================================================
   RoadWatch — Frontend Application (vanilla JS)
   All data flows through RW_API (simulated backend layer).
   =========================================================== */

/* ─────────────────────────────────────────────────
   0.  Bootstrap — init DB, restore theme & session
───────────────────────────────────────────────── */
RW_Database.init();

/* ─── Theme ─── */
function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem("rw_theme", t);
  document.querySelectorAll("#theme-toggle-landing i, #theme-toggle-app i").forEach(i => {
    i.className = t === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
  });
  const ds = document.getElementById("dark-switch");
  if (ds) ds.checked = t === "dark";
  // keep leaflet map tiles correct
  if (leafMap) leafMap.invalidateSize();
}
applyTheme(localStorage.getItem("rw_theme") || "light");

document.querySelectorAll("#theme-toggle-landing,#theme-toggle-app").forEach(b =>
  b.addEventListener("click", () =>
    applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark")
  )
);

/* ─────────────────────────────────────────────────
   1.  Navigation helpers
───────────────────────────────────────────────── */
function showApp() {
  document.getElementById("view-landing").classList.remove("active");
  document.getElementById("view-app").classList.add("active");
  renderAll();
}
function showLanding() {
  document.getElementById("view-app").classList.remove("active");
  document.getElementById("view-landing").classList.add("active");
}

let adminUnlocked = false;

function goto(screen) {
  document.querySelectorAll(".nav-item").forEach(n =>
    n.classList.toggle("active", n.dataset.screen === screen)
  );
  document.querySelectorAll(".screen").forEach(s =>
    s.classList.toggle("active", s.dataset.screen === screen)
  );
  if (screen === "analytics")       setTimeout(renderAnalyticsCharts, 80);
  if (screen === "dashboard")       setTimeout(renderAll, 80);
  if (screen === "admin" && adminUnlocked) setTimeout(renderAdminPanel, 80);
  document.querySelector(".sidebar")?.classList.remove("open");
}
document.querySelectorAll(".nav-item").forEach(n =>
  n.addEventListener("click", () => goto(n.dataset.screen))
);
document.body.addEventListener("click", e => {
  const g = e.target.closest("[data-goto]");
  if (g) goto(g.dataset.goto);
});
document.getElementById("toggle-sidebar")?.addEventListener("click", () =>
  document.querySelector(".sidebar").classList.toggle("open")
);

/* ─────────────────────────────────────────────────
   2.  Modals
───────────────────────────────────────────────── */
const back = document.getElementById("modal-back");
function openModal(name) {
  back.classList.add("open");
  document.getElementById("modal-" + name).classList.add("open");
}
function closeModals() {
  back.classList.remove("open");
  document.querySelectorAll(".modal").forEach(m => m.classList.remove("open"));
}
document.querySelectorAll("[data-open]").forEach(el =>
  el.addEventListener("click", () => openModal(el.dataset.open))
);
document.querySelectorAll("[data-close]").forEach(el =>
  el.addEventListener("click", closeModals)
);
back.addEventListener("click", closeModals);

/* ─────────────────────────────────────────────────
   3.  Toast notifications
───────────────────────────────────────────────── */
function toast(msg, type = "info") {
  const w  = document.getElementById("toast-wrap");
  const el = document.createElement("div");
  el.className = "toast " + type;
  const icon =
    type === "error"   ? "fa-circle-exclamation" :
    type === "success" ? "fa-circle-check"        : "fa-circle-info";
  el.innerHTML = `<i class="fa-solid ${icon}"></i>${msg}`;
  w.appendChild(el);
  setTimeout(() => {
    el.style.opacity   = "0";
    el.style.transform = "translateX(30px)";
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

/* ─────────────────────────────────────────────────
   4.  Auth — OTP Login
───────────────────────────────────────────────── */
let demoOtp = "";

document.getElementById("send-otp").addEventListener("click", async () => {
  const phone = document.getElementById("login-phone").value.trim();
  const res   = await RW_API.requestOTP(phone);
  if (res.ok) {
    demoOtp = res.data.demoCode;
    document.getElementById("otp-hint").innerHTML =
      `Demo OTP: <code>${demoOtp}</code> (auto-filled)`;
    document.getElementById("login-otp").value = demoOtp;
    toast("OTP sent (demo)", "success");
  } else {
    toast(res.error, "error");
  }
});

document.getElementById("do-login").addEventListener("click", async () => {
  const phone = document.getElementById("login-phone").value.trim();
  const otp   = document.getElementById("login-otp").value.trim();
  const res   = await RW_API.verifyOTP(phone, otp);
  if (res.ok) {
    closeModals();
    showApp();
    toast("Welcome back, " + res.data.name + "!", "success");
    refreshTopbar();
  } else {
    toast(res.error, "error");
  }
});

document.getElementById("do-register").addEventListener("click", async () => {
  const name  = document.getElementById("reg-name").value.trim()  || "New User";
  const phone = document.getElementById("reg-phone").value.trim() || "+91 9XXXXXXXXX";
  const area  = document.getElementById("reg-area").value.trim()  || "Indiranagar";
  const res   = await RW_API.register(name, phone, area);
  if (res.ok) {
    closeModals();
    showApp();
    toast("Account created — welcome, " + res.data.name + "!", "success");
    refreshTopbar();
  } else {
    toast(res.error, "error");
  }
});

document.getElementById("signout").addEventListener("click", async () => {
  await RW_API.logout();
  showLanding();
  toast("Signed out successfully.");
});

/* ─────────────────────────────────────────────────
   5.  Topbar user display
───────────────────────────────────────────────── */
function refreshTopbar() {
  const user = RW_API.getCurrentUser();
  if (!user) return;
  const initials = user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  document.querySelectorAll(".avatar").forEach(el => {
    el.textContent = initials;
    el.title       = user.name;
  });
  // update welcome text
  const h1 = document.querySelector('[data-screen="dashboard"] .page-head h1');
  if (h1) h1.textContent = `Welcome back, ${user.name.split(" ")[0]}`;
}

/* ─────────────────────────────────────────────────
   6.  Utility renderers
───────────────────────────────────────────────── */
function sevPill(s) {
  const cls = s === "Low" ? "low" : s === "Medium" ? "med" : "high";
  return `<span class="sev-pill ${cls}">${s}</span>`;
}
function statusPill(s) {
  return `<span class="status-pill">${s}</span>`;
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ─────────────────────────────────────────────────
   7.  KPI cards
───────────────────────────────────────────────── */
function renderKPIs() {
  const kpis = RW_Admin.getKPIs();

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("kpi-total",    kpis.total);
  set("kpi-pending",  kpis.pending);
  set("kpi-verified", kpis.verified);
  set("kpi-resolved", kpis.resolved);

  set("adm-total",    kpis.total);
  set("adm-pending",  kpis.pending);
  set("adm-resolved", kpis.resolved);
  set("adm-high",     kpis.high);
  set("a-active",     kpis.active);
}

/* ─────────────────────────────────────────────────
   8.  Report History table
───────────────────────────────────────────────── */
window.viewReportFromTable = function (id, event) {
  if (event && (event.target.closest("button") || event.target.closest("select"))) return;
  const r = RW_Reports.getById(id);
  if (r) { showAIResult(r); goto("ai"); }
};

window.viewReportFromMap = function (id) {
  const r = RW_Reports.getById(id);
  if (r) { showAIResult(r); goto("ai"); }
};

function renderTable() {
  const tbody  = document.getElementById("reports-table");
  const status = document.getElementById("filter-status").value;
  const sev    = document.getElementById("filter-severity").value;
  const q      = (document.getElementById("global-search")?.value || "").toLowerCase();

  const list = RW_Reports.search(q, { status, severity: sev }).slice(0, 10);

  tbody.innerHTML = list.map(r => `
    <tr onclick="viewReportFromTable('${r.id}', event)" title="Click to view AI analysis">
      <td><code>${r.id}</code></td>
      <td><strong>${r.road}</strong><div class="muted small">${r.area}</div></td>
      <td>${sevPill(r.severity)}</td>
      <td>${Math.round((r.confidence || 0) * 100)}%</td>
      <td>${statusPill(r.status)}</td>
      <td class="muted">${fmtDate(r.reportedAt)}</td>
    </tr>`).join("") ||
    `<tr><td colspan="6" class="muted" style="text-align:center;padding:30px">No reports match.</td></tr>`;
}

/* ─────────────────────────────────────────────────
   9.  Admin table
───────────────────────────────────────────────── */
function renderAdminPanel() {
  renderAdminTable();
  renderKPIs();
}

function renderAdminTable() {
  const tbody  = document.getElementById("adm-table");
  if (!tbody) return;
  const status = document.getElementById("adm-status")?.value || "";
  const q      = (document.getElementById("adm-search")?.value || "").toLowerCase();

  const list = RW_Admin.getAllReports({ status, query: q });

  tbody.innerHTML = list.map(r => `
    <tr onclick="viewReportFromTable('${r.id}', event)" title="Click to view AI analysis">
      <td><code>${r.id}</code></td>
      <td><strong>${r.road}</strong><div class="muted small">${r.area}</div></td>
      <td>${sevPill(r.severity)}</td>
      <td>${r.reporter}</td>
      <td>
        <select data-id="${r.id}" class="adm-status-sel" style="margin:0;padding:6px 8px">
          ${["Submitted","Pending","Verified","Assigned","In Progress","Resolved"]
            .map(s => `<option ${s === r.status ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </td>
      <td>
        <button class="btn btn-ghost" data-assign="${r.id}" style="padding:6px 10px" title="Assign crew">
          <i class="fa-solid fa-user-plus"></i>
        </button>
      </td>
    </tr>`).join("") || `<tr><td colspan="6" class="muted" style="text-align:center;padding:30px">No reports.</td></tr>`;

  // Status change handler
  tbody.querySelectorAll(".adm-status-sel").forEach(sel => {
    sel.addEventListener("change", async () => {
      const res = await RW_API.updateReportStatus(sel.dataset.id, sel.value);
      if (res.ok) {
        renderAll();
        toast(`${sel.dataset.id} → ${sel.value}`, "success");
        refreshNotifBadge();
      } else {
        toast(res.error, "error");
      }
    });
  });

  // Assign crew handler
  tbody.querySelectorAll("[data-assign]").forEach(b => {
    b.addEventListener("click", async () => {
      const res = await RW_API.assignCrew(b.dataset.assign);
      if (res.ok) {
        toast(`${b.dataset.assign} assigned to ${res.data.crew}`, "success");
        renderAdminPanel();
        refreshNotifBadge();
      } else {
        toast(res.error, "error");
      }
    });
  });
}

/* ─────────────────────────────────────────────────
   10.  Leaflet Map
───────────────────────────────────────────────── */
let leafMap     = null;
let markerLayer = null;

function renderMap() {
  const mapEl = document.getElementById("mini-map");
  if (!mapEl) return;

  if (typeof L === "undefined") {
    // Fallback dots
    mapEl.innerHTML = "";
    RW_Database.getAll(RW_Database.KEYS.REPORTS).slice(0, 18).forEach(r => {
      const m = document.createElement("div");
      m.className = "marker";
      const color = r.severity === "High" ? "var(--sev-high)"
                  : r.severity === "Medium" ? "var(--sev-med)" : "var(--sev-low)";
      m.style.background = color;
      m.style.left       = ((r.lng - 77.5) / 0.2 * 100) + "%";
      m.style.top        = ((1 - (r.lat - 12.9) / 0.2) * 100) + "%";
      m.title            = `${r.id} · ${r.road}`;
      mapEl.appendChild(m);
    });
    return;
  }

  if (!leafMap) {
    leafMap     = L.map("mini-map", { center: [13.0, 77.6], zoom: 11 });
    markerLayer = L.layerGroup().addTo(leafMap);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: "© OpenStreetMap"
    }).addTo(leafMap);
  } else {
    markerLayer.clearLayers();
  }

  RW_Database.getAll(RW_Database.KEYS.REPORTS).forEach(r => {
    if (!r.lat || !r.lng) return;
    const sc = r.severity === "High" ? "high" : r.severity === "Medium" ? "med" : "low";
    const icon = L.divIcon({ className: `map-marker ${sc}`, iconSize: [12, 12], iconAnchor: [6, 6], popupAnchor: [0, -8] });
    const popup = `
      <div style="min-width:140px">
        <h4 style="margin:0;font-size:13px">${r.id}</h4>
        <strong>${r.road}</strong>
        <div style="font-size:11px;color:var(--text-muted);margin:3px 0">${r.area}</div>
        <div>Severity: <strong style="color:var(--sev-${sc})">${r.severity}</strong></div>
        <div>Status: <strong>${r.status}</strong></div>
        <a href="#" onclick="viewReportFromMap('${r.id}');return false;" class="popup-btn">View AI Analysis</a>
      </div>`;
    L.marker([r.lat, r.lng], { icon }).bindPopup(popup).addTo(markerLayer);
  });
}

/* ─────────────────────────────────────────────────
   11.  Charts
───────────────────────────────────────────────── */
let charts = {};
function destroyChart(k) { if (charts[k]) { charts[k].destroy(); delete charts[k]; } }

function renderTrendChart() {
  const ctx = document.getElementById("chart-trend");
  if (!ctx) return;
  destroyChart("trend");
  const { months, counts, resolved } = RW_Analytics.getMonthlyTrend();
  charts.trend = new Chart(ctx, {
    type: "line",
    data: {
      labels: months,
      datasets: [
        { label: "Reports",  data: counts,   borderColor: "#1f3a8a", backgroundColor: "rgba(31,58,138,.15)", tension: .4, fill: true, borderWidth: 2.5, pointRadius: 0 },
        { label: "Resolved", data: resolved, borderColor: "#16a36a", backgroundColor: "rgba(22,163,106,.10)", tension: .4, fill: true, borderWidth: 2.5, pointRadius: 0 }
      ]
    },
    options: { responsive: true, plugins: { legend: { labels: { boxWidth: 10 } } }, scales: { y: { beginAtZero: true } } }
  });
}

function renderAnalyticsCharts() {
  const sev    = RW_Analytics.getSeverityDistribution();
  const status = RW_Analytics.getStatusDistribution();

  // Severity doughnut
  const sevCtx = document.getElementById("chart-sev");
  if (sevCtx) {
    destroyChart("sev");
    charts.sev = new Chart(sevCtx, {
      type: "doughnut",
      data: {
        labels: ["Low","Medium","High"],
        datasets: [{ data: [sev.Low, sev.Medium, sev.High], backgroundColor: ["#16a36a","#f5a524","#dc2626"], borderWidth: 0 }]
      },
      options: { cutout: "60%", plugins: { legend: { position: "bottom" } } }
    });
  }

  // Status bar
  const stCtx = document.getElementById("chart-status");
  if (stCtx) {
    destroyChart("status");
    const keys  = ["Submitted","Pending","Verified","Assigned","In Progress","Resolved"];
    const vals  = keys.map(k => status[k] || 0);
    const colors = ["#94a3b8","#64748b","#3554b8","#f5a524","#ec6b1f","#16a36a"];
    charts.status = new Chart(stCtx, {
      type: "bar",
      data: { labels: keys, datasets: [{ data: vals, backgroundColor: colors, borderRadius: 6 }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
  }

  // Monthly bar
  const mCtx = document.getElementById("chart-monthly");
  if (mCtx) {
    destroyChart("monthly");
    const { months, counts } = RW_Analytics.getMonthlyTrend();
    charts.monthly = new Chart(mCtx, {
      type: "bar",
      data: {
        labels: months,
        datasets: [{ label: "Reports", data: counts, backgroundColor: "rgba(245,165,36,.85)", borderRadius: 6 }]
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
  }

  // Update analytics KPIs
  const summary = RW_Analytics.getSummary();
  const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setEl("a-active", summary.active);
}

/* ─────────────────────────────────────────────────
   12.  Report Submission
───────────────────────────────────────────────── */
const dz      = document.getElementById("dropzone");
const fi      = document.getElementById("file-input");
const preview = document.getElementById("preview");
let pendingImage = null;

dz.addEventListener("click", () => fi.click());
fi.addEventListener("change", e => handleFile(e.target.files[0]));
["dragenter","dragover"].forEach(ev =>
  dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add("drag"); })
);
["dragleave","drop"].forEach(ev =>
  dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove("drag"); })
);
dz.addEventListener("drop", e => handleFile(e.dataTransfer.files[0]));

function handleFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    toast("Please choose an image file.", "error");
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    preview.src    = e.target.result;
    pendingImage   = e.target.result;
    dz.classList.add("has-image");
    toast("Image loaded — ready for analysis.", "success");
  };
  reader.readAsDataURL(file);
}

document.getElementById("btn-gps").addEventListener("click", () => {
  const lat = (12.9 + Math.random() * 0.2).toFixed(5);
  const lng = (77.5 + Math.random() * 0.2).toFixed(5);
  document.getElementById("in-gps").value = `${lat}, ${lng}`;
  toast("GPS location captured.", "success");
});

document.getElementById("btn-submit").addEventListener("click", async () => {
  const road = document.getElementById("in-road").value.trim();
  const area = document.getElementById("in-area").value.trim();
  const desc = document.getElementById("in-desc").value.trim();
  const gps  = document.getElementById("in-gps").value.trim();

  if (!pendingImage) { toast("Please add a photo first.", "error"); return; }
  if (!road)         { toast("Road name is required.", "error");     return; }
  if (!gps)          { toast("GPS location is required.", "error");  return; }

  const btn = document.getElementById("btn-submit");
  btn.disabled   = true;
  btn.innerHTML  = `<i class="fa-solid fa-spinner fa-spin"></i> Running AI Analysis…`;

  toast("Submitting report and running AI analysis…", "info");

  const res = await RW_API.createReport(road, area, desc, gps, pendingImage);

  btn.disabled  = false;
  btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Submit &amp; Analyze`;

  if (res.ok) {
    const report = RW_Reports.getById(res.data.id);
    toast(`Report ${res.data.id} submitted — AI severity: ${res.data.severity}`, "success");
    showAIResult(report);
    goto("ai");
    renderAll();
    refreshNotifBadge();
    // Reset form
    pendingImage = null;
    preview.src  = "";
    dz.classList.remove("has-image");
    ["in-road","in-area","in-desc","in-gps"].forEach(id => {
      document.getElementById(id).value = "";
    });
  } else {
    toast(res.error, "error");
  }
});

/* ─────────────────────────────────────────────────
   13.  AI Analysis screen
───────────────────────────────────────────────── */
function showAIResult(r) {
  document.getElementById("ai-empty").style.display  = "none";
  document.getElementById("ai-result").style.display = "grid";
  document.getElementById("ai-sub").textContent =
    `Report ${r.id} · ${r.road}${r.area ? ", " + r.area : ""}`;

  document.getElementById("ai-photo").src = r.image || fallbackImage();

  const sc = r.severity === "High" ? "var(--sev-high)" : r.severity === "Medium" ? "var(--sev-med)" : "var(--sev-low)";
  const mSev = document.getElementById("m-sev");
  mSev.textContent   = (r.severity || "—").toUpperCase();
  mSev.style.color   = sc;
  document.getElementById("m-size").textContent = (r.sizeCm || 0) + " cm";
  document.getElementById("m-conf").textContent = Math.round((r.confidence || 0) * 100) + "%";

  document.getElementById("ai-box").style.borderColor = sc;
  document.getElementById("ai-box-label").style.background = sc;

  // Feature bars — use stored AI analysis if available, else generate
  const ai    = r.aiAnalysis || {};
  const feats = ai.features || {};
  const featList = [
    { label: "Depth estimate",      v: feats.depth           || 60 + Math.random() * 35 },
    { label: "Edge degradation",    v: feats.edgeDegradation || 50 + Math.random() * 40 },
    { label: "Water pooling risk",  v: feats.waterPoolingRisk|| 55 + Math.random() * 40 },
    { label: "Traffic exposure",    v: feats.trafficExposure || 65 + Math.random() * 30 },
    { label: "Repair urgency",      v: feats.repairUrgency   ||
        (r.severity === "High" ? 85 + Math.random() * 12 :
         r.severity === "Medium" ? 60 + Math.random() * 20 : 30 + Math.random() * 30) }
  ];
  document.getElementById("ai-features").innerHTML = featList.map(f => `
    <div class="feat-bar">
      <div class="lbl"><span>${f.label}</span><strong>${Math.round(f.v)}%</strong></div>
      <div class="track"><div class="fill" style="width:${f.v}%"></div></div>
    </div>`).join("");

  // Recommendation panel
  const reco = ai.recommendations || {};
  const action  = reco.action  || (r.severity === "High" ? "Patch within 48 hours" : r.severity === "Medium" ? "Schedule within 1 week" : "Add to monthly maintenance");
  const crew    = reco.crewSuggestion || "Team B-12";
  const hours   = reco.repairTimeHours || 2.5;
  const cost    = reco.costEstimateINR  || 3800;
  const mats    = reco.materialsNeeded  || "0.30 m³ asphalt mix";
  const nearby  = 3;

  document.getElementById("ai-reco").innerHTML =
    `<div class="tag">Action: ${action}</div>
     <div style="margin-top:6px">Dispatch resurfacing crew. Estimated material: ${mats}.</div>`;

  const dl = document.querySelector(".dl");
  if (dl) dl.innerHTML = `
    <div><dt>Crew suggestion</dt><dd>${crew}</dd></div>
    <div><dt>Predicted repair time</dt><dd>${hours} hours</dd></div>
    <div><dt>Cost estimate</dt><dd>₹ ${cost.toLocaleString("en-IN")}</dd></div>
    <div><dt>Similar nearby</dt><dd>${nearby} within 500m</dd></div>`;
}

function fallbackImage() {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 120'>
    <rect width='200' height='120' fill='%23333'/>
    <circle cx='100' cy='70' r='28' fill='%23111'/>
    <circle cx='85' cy='60' r='10' fill='%23111'/>
  </svg>`;
  return "data:image/svg+xml;utf8," + svg;
}

/* ─────────────────────────────────────────────────
   14.  Admin Portal
───────────────────────────────────────────────── */
document.getElementById("adm-login").addEventListener("click", async () => {
  const u = document.getElementById("adm-u").value.trim();
  const p = document.getElementById("adm-p").value.trim();
  const res = await RW_API.adminLogin(u, p);
  if (res.ok) {
    adminUnlocked = true;
    document.getElementById("admin-login").style.display = "none";
    document.getElementById("admin-body").style.display  = "block";
    renderAdminPanel();
    toast("Admin signed in — welcome, " + res.data.name, "success");
  } else {
    toast(res.error, "error");
  }
});
document.getElementById("adm-search")?.addEventListener("input",  renderAdminTable);
document.getElementById("adm-status")?.addEventListener("change", renderAdminTable);

/* ─────────────────────────────────────────────────
   15.  CSV / PDF Export
───────────────────────────────────────────────── */
function exportCSV() {
  const all  = RW_Database.getAll(RW_Database.KEYS.REPORTS);
  const rows = [
    ["ID","Road","Area","Severity","Status","Confidence","Reporter","Reported"],
    ...all.map(r => [r.id, r.road, r.area, r.severity, r.status,
      Math.round((r.confidence || 0) * 100) + "%", r.reporter,
      new Date(r.reportedAt).toLocaleDateString()])
  ];
  const csv  = rows.map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = "roadwatch_reports.csv";
  a.click();
  toast("Exported roadwatch_reports.csv", "success");
}

function exportPDF() {
  const all = RW_Database.getAll(RW_Database.KEYS.REPORTS);
  const kpis = RW_Admin.getKPIs();
  const win  = window.open("", "_blank");
  if (!win) { toast("Pop-up blocked — please allow pop-ups.", "error"); return; }

  win.document.write(`<!DOCTYPE html><html><head>
    <title>RoadWatch — Citywide Report Summary</title>
    <style>
      body{font-family:'Segoe UI',Arial,sans-serif;padding:28px;color:#1a1a2e}
      header{border-bottom:3px solid #1f3a8a;padding-bottom:14px;margin-bottom:22px}
      h1{margin:0;font-size:26px;color:#1f3a8a}
      .sub{color:#555;margin-top:4px;font-size:13px}
      .kpis{display:flex;gap:14px;margin-bottom:22px;flex-wrap:wrap}
      .kpi{flex:1;min-width:120px;border:1px solid #cdd;border-radius:8px;padding:12px;text-align:center;background:#f5f8ff}
      .kpi-v{font-size:22px;font-weight:800;color:#1f3a8a;margin-top:6px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{background:#e8edf8;text-align:left;padding:9px 10px;border-bottom:2px solid #1f3a8a;font-size:11px;letter-spacing:.05em;text-transform:uppercase}
      td{padding:8px 10px;border-bottom:1px solid #eee}
      tr:nth-child(even) td{background:#fafbff}
      .high{color:#dc2626;font-weight:700}
      .medium{color:#f5a524;font-weight:700}
      .low{color:#16a36a;font-weight:700}
      footer{margin-top:40px;text-align:center;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:12px}
    </style>
  </head><body>
    <header>
      <h1>⚠ RoadWatch Civic AI Platform</h1>
      <div class="sub">Citywide Pothole Report Summary &mdash; ${new Date().toLocaleString()}</div>
    </header>
    <div class="kpis">
      <div class="kpi">Total Reports<div class="kpi-v">${kpis.total}</div></div>
      <div class="kpi">Pending<div class="kpi-v">${kpis.pending}</div></div>
      <div class="kpi">Verified<div class="kpi-v">${kpis.verified}</div></div>
      <div class="kpi">Resolved<div class="kpi-v">${kpis.resolved}</div></div>
      <div class="kpi">High Severity<div class="kpi-v" style="color:#dc2626">${kpis.high}</div></div>
    </div>
    <table>
      <thead><tr><th>ID</th><th>Location</th><th>Severity</th><th>Status</th><th>Reporter</th><th>Date</th></tr></thead>
      <tbody>
        ${all.map(r => `<tr>
          <td style="font-family:monospace">${r.id}</td>
          <td><strong>${r.road}</strong><br><small style="color:#666">${r.area}</small></td>
          <td class="${r.severity.toLowerCase()}">${r.severity}</td>
          <td>${r.status}</td>
          <td>${r.reporter}</td>
          <td>${new Date(r.reportedAt).toLocaleDateString()}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    <footer>RoadWatch Civic Tech Initiative &middot; Prototype Build &middot; All data simulated</footer>
    <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),400)}<\/script>
  </body></html>`);
  win.document.close();
  toast("PDF summary opened — use browser Print to save.", "success");
}

document.getElementById("exp-pdf")?.addEventListener("click", exportPDF);
document.getElementById("exp-csv")?.addEventListener("click", exportCSV);

/* ─────────────────────────────────────────────────
   16.  Filters
───────────────────────────────────────────────── */
["filter-status","filter-severity"].forEach(id =>
  document.getElementById(id)?.addEventListener("change", renderTable)
);
document.getElementById("global-search")?.addEventListener("input", renderTable);

/* ─────────────────────────────────────────────────
   17.  Notifications panel
───────────────────────────────────────────────── */
function refreshNotifBadge() {
  const user  = RW_API.getCurrentUser();
  const phone = user ? (user.phone || user.name) : null;
  const count = phone ? RW_Notifications.unreadCount(phone) : 0;
  const dot   = document.querySelector(".notif-btn .dot");
  if (dot) dot.style.display = count > 0 ? "block" : "none";
}

function renderNotifications() {
  const user  = RW_API.getCurrentUser();
  const phone = user ? (user.phone || user.name) : null;
  const notifs = RW_Notifications.getForUser(phone);

  const list = document.querySelector(".np-list");
  if (!list) return;
  list.innerHTML = notifs.slice(0, 8).map(n => `
    <li>
      <i class="${RW_Notifications.getIcon(n.type)} ${n.type}"></i>
      <div>
        <strong>${n.title}</strong>
        <div class="muted">${n.text}</div>
        <div class="muted small">${fmtDate(n.timestamp)}</div>
      </div>
    </li>`).join("") || `<li class="muted" style="padding:20px;text-align:center">No notifications yet.</li>`;

  // Mark as read on open
  if (phone) RW_Notifications.markAllRead(phone);
  refreshNotifBadge();
}

const np = document.getElementById("notif-panel");
document.getElementById("open-notif").addEventListener("click", () => {
  np.classList.toggle("open");
  if (np.classList.contains("open")) renderNotifications();
});
document.getElementById("close-notif").addEventListener("click", () => {
  np.classList.remove("open");
});

/* ─────────────────────────────────────────────────
   18.  Profile
───────────────────────────────────────────────── */
function loadProfileFromSession() {
  const user = RW_API.getCurrentUser();
  if (!user) return;
  const setVal = (id, v) => { const el = document.getElementById(id); if (el && v) el.value = v; };
  setVal("prof-name",  user.name);
  setVal("prof-phone", user.phone);
  setVal("prof-area",  user.area);
}

document.getElementById("prof-save")?.addEventListener("click", async () => {
  const name  = document.getElementById("prof-name").value.trim();
  const phone = document.getElementById("prof-phone").value.trim();
  const area  = document.getElementById("prof-area").value.trim();
  const res   = await RW_API.saveProfile(name, phone, area);
  if (res.ok) {
    toast("Profile updated successfully.", "success");
    refreshTopbar();
  } else {
    toast(res.error, "error");
  }
});

document.getElementById("dark-switch")?.addEventListener("change", e =>
  applyTheme(e.target.checked ? "dark" : "light")
);

/* ─────────────────────────────────────────────────
   19.  AI Chatbot
───────────────────────────────────────────────── */
const chatPanel = document.getElementById("chat-panel");
const chatBody  = document.getElementById("chat-body");

document.getElementById("chat-fab").addEventListener("click", () => {
  chatPanel.classList.toggle("open");
  if (chatPanel.classList.contains("open") && !chatBody.dataset.seeded) {
    botSay("👋 Hi! I'm the RoadWatch AI assistant. Ask me about any report (try <code>PH-1002</code>), reporting steps, severity, or road safety.");
    chatBody.dataset.seeded = "1";
  }
});
document.getElementById("chat-close").addEventListener("click", () =>
  chatPanel.classList.remove("open")
);

function userSay(m) {
  const d = document.createElement("div");
  d.className   = "bubble user";
  d.textContent = m;
  chatBody.appendChild(d);
  chatBody.scrollTop = chatBody.scrollHeight;
}
function botSay(m) {
  const d = document.createElement("div");
  d.className = "bubble bot";
  d.innerHTML = m;
  chatBody.appendChild(d);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function botReply(raw) {
  const q = raw.toLowerCase();
  setTimeout(() => {
    // Report ID lookup
    const idMatch  = raw.match(/PH-(\d{4})/i);
    const numMatch = raw.match(/\b(1\d{3})\b/);
    const reportId = idMatch ? idMatch[0].toUpperCase()
                   : numMatch ? "PH-" + numMatch[1] : null;

    if (reportId) {
      const r = RW_Reports.getById(reportId);
      if (r) {
        const sc = r.severity.toLowerCase();
        botSay(`📋 <strong>Report Found:</strong><br>
          • ID: <code>${r.id}</code><br>
          • Road: <strong>${r.road}</strong> (${r.area})<br>
          • Severity: <strong style="color:var(--sev-${sc})">${r.severity}</strong><br>
          • Status: <strong>${r.status}</strong><br>
          • Confidence: ${Math.round((r.confidence || 0) * 100)}%<br><br>
          👉 <a href="#" onclick="viewReportFromMap('${r.id}');return false;"
              style="color:var(--primary);font-weight:600;text-decoration:underline">
            View full AI analysis for ${r.id}
          </a>`);
      } else {
        botSay(`🔍 No report found with ID <strong>${reportId}</strong>. Try another (e.g. <code>PH-1003</code>).`);
      }
      return;
    }

    if (q.includes("report") && (q.includes("how") || q.includes("pothole"))) {
      botSay("📸 Open <strong>Report Pothole</strong>, drag a photo, capture GPS, fill in the road, and hit Submit. The AI rates severity automatically.");
    } else if (q.includes("severity") || q.includes("level")) {
      botSay("🚦 Severity is <strong>Low / Medium / High</strong> based on pothole size, depth, edge wear, and traffic. High = patch within 48h.");
    } else if (q.includes("safety") || q.includes("tip")) {
      botSay("🛡️ <strong>Road safety tips:</strong><br>• Slow down on wet roads.<br>• Keep distance from heavy vehicles.<br>• Don't swerve suddenly for potholes.<br>• Report hazards early!");
    } else if (q.includes("status") || q.includes("track")) {
      const user   = RW_API.getCurrentUser();
      const phone  = user ? (user.phone || user.name) : null;
      const latest = phone ? RW_Reports.getByUser(phone)[0] : null;
      const r      = latest || RW_Database.getAll(RW_Database.KEYS.REPORTS)[0];
      if (r) {
        botSay(`📋 Latest report <code>${r.id}</code> (<strong>${r.road}</strong>) is <strong>${r.status}</strong>.<br><br>
          <a href="#" onclick="viewReportFromMap('${r.id}');return false;"
             style="color:var(--primary);font-weight:600;text-decoration:underline">
            View full AI analysis
          </a>`);
      } else {
        botSay("No reports found yet. Submit one from the Report Pothole screen!");
      }
    } else if (q.includes("hi") || q.includes("hello") || q.includes("hey")) {
      botSay("Hi there! 👋 Ask me about a report (type its ID), severity, status, or road safety tips.");
    } else if (q.includes("analytics") || q.includes("stats")) {
      const s = RW_Analytics.getSummary();
      botSay(`📊 <strong>City Stats:</strong><br>
        • Total Reports: <strong>${s.total}</strong><br>
        • Active: <strong>${s.active}</strong><br>
        • Resolved: <strong>${s.resolved}</strong><br>
        • Resolution Rate: <strong>${s.resolutionRate}%</strong><br>
        • Citizen Satisfaction: <strong>${s.satisfaction}%</strong>`);
    } else {
      botSay("I can help with: <em>report lookup (PH-XXXX)</em>, <em>severity</em>, <em>safety tips</em>, <em>status</em>, or <em>analytics</em>. Try a quick button below!");
    }
  }, 500);
}

document.getElementById("chat-form").addEventListener("submit", e => {
  e.preventDefault();
  const v = document.getElementById("chat-text").value.trim();
  if (!v) return;
  userSay(v);
  document.getElementById("chat-text").value = "";
  botReply(v);
});
document.getElementById("chat-quick").addEventListener("click", e => {
  if (e.target.tagName === "BUTTON") { userSay(e.target.textContent); botReply(e.target.textContent); }
});

/* ─────────────────────────────────────────────────
   20.  Master render function
───────────────────────────────────────────────── */
function renderAll() {
  renderKPIs();
  renderTable();
  renderMap();
  renderTrendChart();
  renderAdminTable();
  refreshTopbar();
  refreshNotifBadge();
  loadProfileFromSession();
}

/* ─────────────────────────────────────────────────
   21.  Auto-boot
───────────────────────────────────────────────── */
(function boot() {
  const user = RW_API.getCurrentUser();
  if (user) {
    showApp();
  }
  // always set correct theme icon state
  applyTheme(localStorage.getItem("rw_theme") || "light");
})();
