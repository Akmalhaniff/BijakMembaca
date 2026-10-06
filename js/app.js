import { loadData, programStats, classesOf, attendanceStats, levelIndex, checkLevelUp, esc, fmtDate, onAuthChange, logoutUser } from './data.js';
import { ICONS, avatar, levelPill, levelHue, levelColor, miniRing, meterClass, greeting, hydrateIcons } from './ui.js';

// Global logout delegation for dynamically created nav button
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-logout]");
  if (!btn) return;
  e.preventDefault();
  if (!confirm("Log keluar dari akaun ini?")) return;
  try { await logoutUser(); } catch (err) { console.error(err); }
  window.location.href = "index.html";
});

let DATA = null;
let USER = null;
let filterClass = "";
let filterText = "";

/* ---------------- hero + stats ---------------- */

function renderHero() {
  const st = programStats(DATA);
  const total = DATA.meta.levels.length || 1;
  const name = USER ? (USER.displayName || "").trim().split(/\s+/)[0] : "";
  document.getElementById("heroEyebrow").textContent = greeting() + (name ? ", " + name : "");
  document.getElementById("heroTitle").textContent = USER ? "Kemajuan murid anda" : "Laporan Kemajuan Murid";
  document.getElementById("heroLead").textContent = st.total
    ? `${st.total} murid sedang membina kemahiran membaca dengan purata kehadiran ${st.avgAtt}%.`
    : "Pantau perkembangan kemahiran membaca setiap murid dalam satu paparan.";
  document.getElementById("ringNum").textContent = st.avgLevel || 0;
  const c = 2 * Math.PI * 42;
  requestAnimationFrame(() => {
    document.getElementById("ringVal").style.strokeDashoffset = c * (1 - Math.min((st.avgLevel || 0) / total, 1));
  });
  document.getElementById("metaTotal").textContent = "👩‍🎓 " + DATA.students.length + " murid";
  document.getElementById("metaLevels").textContent = "📚 " + DATA.meta.levels.length + " tahap";
  document.getElementById("metaYear").textContent = "🗓️ Tahun " + DATA.meta.year;
}

function renderStats() {
  const st = programStats(DATA);
  document.getElementById("stTotal").textContent = st.total;
  document.getElementById("stAvgLevel").textContent = st.avgLevel;
  document.getElementById("stAvgAtt").textContent = st.avgAtt + "%";
  document.getElementById("stReady").textContent = DATA.students.filter(s => checkLevelUp(DATA, s)).length;
}

/* ---------------- class chips + list ---------------- */

function renderChips() {
  const box = document.getElementById("classChips");
  const classes = classesOf(DATA);
  if (!classes.length) { box.innerHTML = ""; return; }
  const count = c => DATA.students.filter(s => s.class === c).length;
  box.innerHTML = [
    `<button class="chip ${!filterClass ? "on" : ""}" data-cls="">Semua<span class="n">${DATA.students.length}</span></button>`,
    ...classes.map(c => `<button class="chip ${filterClass === c ? "on" : ""}" data-cls="${esc(c)}">${esc(c)}<span class="n">${count(c)}</span></button>`)
  ].join("");
}

function studentCard(s) {
  const att = attendanceStats(s);
  const lv = levelIndex(DATA, s);
  const total = DATA.meta.levels.length;
  const levelUp = checkLevelUp(DATA, s);
  return `
    <button class="scard" data-id="${esc(s.id)}">
      ${avatar(s)}
      <div class="body">
        <div class="nm">${esc(s.name)}</div>
        <div class="sub">
          ${levelPill(DATA, lv)}
          ${levelUp ? `<span class="badge good" title="${esc(levelUp.reason)}">🎓 Sedia naik</span>` : ""}
        </div>
        <div class="meta">
          <span>Hadir ${att.pct}%</span>
          <div class="meter ${meterClass(att.pct)}"><i style="width:${att.pct}%"></i></div>
          <span>${(s.vocabulary || []).length} kata</span>
        </div>
      </div>
      <div class="side">${miniRing(lv, total)}</div>
    </button>`;
}

function renderClasses() {
  const container = document.getElementById("classBlocks");
  const empty = document.getElementById("emptyState");
  const classes = classesOf(DATA);
  const q = filterText.trim().toLowerCase();
  let matched = 0;
  let html = "";

  classes.forEach(cls => {
    if (filterClass && cls !== filterClass) return;
    const list = DATA.students.filter(s => s.class === cls && (!q || s.name.toLowerCase().includes(q)));
    if (!list.length) return;
    matched += list.length;
    const atts = list.map(s => attendanceStats(s).pct);
    const clsAvg = Math.round(atts.reduce((a, b) => a + b, 0) / atts.length);
    html += `
      <section class="class-group">
        <div class="class-group-head">
          <h3>${esc(cls)}</h3>
          <small>${list.length} murid · hadir ${clsAvg}%</small>
        </div>
        <div class="students">${list.map(studentCard).join("")}</div>
      </section>`;
  });

  container.innerHTML = html;
  document.getElementById("listCount").textContent = matched ? matched + " dipaparkan" : "";
  if (matched) {
    empty.style.display = "none";
  } else {
    empty.style.display = "block";
    empty.innerHTML = DATA.students.length
      ? `<div class="big">🔍</div>Tiada murid ditemui. Cuba carian lain.`
      : USER
        ? `<div class="big">🌱</div>Belum ada murid.<br><a class="btn soft sm" style="margin-top:14px" href="admin.html">Tambah murid pertama</a>`
        : `<div class="big">📖</div>Log masuk sebagai guru untuk melihat murid anda.<br><a class="btn sm" style="margin-top:14px" href="login.html">Log Masuk</a>`;
  }
}

/* ---------------- charts ---------------- */

function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

function renderCharts() {
  if (typeof Chart === "undefined" || !DATA) return;
  const ink = cssVar("--muted") || "#8b88a0";
  const grid = cssVar("--line") || "rgba(0,0,0,.08)";
  Chart.defaults.color = ink;
  Chart.defaults.borderColor = grid;
  Chart.defaults.font.family = "'Plus Jakarta Sans', system-ui, sans-serif";
  Chart.defaults.font.weight = 600;

  const total = DATA.meta.levels.length;
  const levelCounts = DATA.meta.levels.map(() => 0);
  DATA.students.forEach(s => { levelCounts[levelIndex(DATA, s)]++; });
  const lc = document.getElementById("levelChart");
  if (lc) {
    if (lc._chart) lc._chart.destroy();
    lc._chart = new Chart(lc, {
      type: "bar",
      data: {
        labels: DATA.meta.levels.map(l => l.short),
        datasets: [{
          label: "Murid", data: levelCounts,
          backgroundColor: DATA.meta.levels.map((_, i) => levelColor(i, total, 64, 80)),
          borderRadius: 10, borderSkipped: false, maxBarThickness: 34
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { title: items => DATA.meta.levels[items[0].dataIndex].name } } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 }, grid: { color: grid }, border: { display: false } }, x: { grid: { display: false }, border: { display: false } } }
      }
    });
  }

  const buckets = ["Bawah 50%", "50–69%", "70–89%", "90–100%"];
  const attCounts = [0, 0, 0, 0];
  DATA.students.forEach(s => {
    const p = attendanceStats(s).pct;
    if (p < 50) attCounts[0]++; else if (p < 70) attCounts[1]++; else if (p < 90) attCounts[2]++; else attCounts[3]++;
  });
  const ac = document.getElementById("attChart");
  if (ac) {
    if (ac._chart) ac._chart.destroy();
    ac._chart = new Chart(ac, {
      type: "doughnut",
      data: { labels: buckets, datasets: [{ data: attCounts, backgroundColor: ["#fb7185", "#fbbf24", "#5eead4", "#8b7cf6"], borderWidth: 0, hoverOffset: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: "68%", plugins: { legend: { position: "right", labels: { usePointStyle: true, pointStyle: "circle", boxWidth: 8, padding: 12 } } } }
    });
  }
}

/* ---------------- level journey ---------------- */

function renderLevelsDesc() {
  const lv = DATA.meta.levels;
  document.getElementById("levelsDesc").innerHTML = `
    <div class="journey">
      ${lv.map((l, i) => {
        const n = DATA.students.filter(s => levelIndex(DATA, s) === i).length;
        return `
        <div class="jstep done" style="--h:${levelHue(i, lv.length)}">
          <div class="dot">${i + 1}</div>
          <div class="txt">
            <b>${esc(l.name)}</b>
            <small>${n} murid di tahap ini${l.material ? ` · <a href="${esc(l.material)}" target="_blank" rel="noopener">📎 Bahan</a>` : ""}</small>
          </div>
        </div>`;
      }).join("")}
    </div>`;
}

/* ---------------- detail sheet ---------------- */

function openModal(s) {
  const att = attendanceStats(s);
  const lv = levelIndex(DATA, s);
  const totalLevels = DATA.meta.levels.length;
  const lastAtt = (s.attendance || []).slice().sort((a, b) => (a.d < b.d ? 1 : -1)).slice(0, 14);
  const levelUp = checkLevelUp(DATA, s);
  const vocab = s.vocabulary || [];

  document.getElementById("modalTitle").textContent = "Kemajuan Murid";
  document.getElementById("modalBody").innerHTML = `
    <div class="profile-head">
      ${avatar(s, "xl")}
      <div style="min-width:0">
        <h3>${esc(s.name)}</h3>
        <p>${esc(s.class)} · Sesi ${esc(DATA.meta.year)}</p>
        <div style="margin-top:8px">${levelPill(DATA, lv, true)}</div>
      </div>
    </div>

    ${levelUp ? `<div class="banner"><span class="emo">🎓</span><div><b>Sedia naik ke Tahap ${levelUp.nextLevel}: ${esc(levelUp.nextLevelName)}</b><small>${esc(levelUp.reason)}</small></div></div>` : ""}

    <div class="kpis">
      <div class="kpi"><b>${lv + 1}<span style="font-size:14px;color:var(--muted)">/${totalLevels}</span></b><small>Tahap</small></div>
      <div class="kpi"><b style="color:var(--good)">${att.pct}%</b><small>Kehadiran</small></div>
      <div class="kpi"><b style="color:var(--primary-ink)">${vocab.length}</b><small>Kosa kata</small></div>
    </div>

    <div class="dsec">
      <h4>📖 Perjalanan tahap</h4>
      <div class="journey">
        ${DATA.meta.levels.map((l, i) => `
          <div class="jstep ${i < lv ? "done" : i === lv ? "cur" : "todo"}" style="--h:${levelHue(i, totalLevels)}">
            <div class="dot">${i < lv ? "✓" : i + 1}</div>
            <div class="txt"><b>${esc(l.name)}</b>${i === lv ? "<small>Tahap semasa</small>" : ""}</div>
          </div>`).join("")}
      </div>
    </div>

    <div class="dsec">
      <h4>🗓️ Kehadiran · ${att.hadir}/${att.total} sesi</h4>
      ${lastAtt.length ? `<div class="att-dots">${lastAtt.map(a => {
        const p = a.d.split("-");
        return `<span class="${a.s === "h" ? "h" : "a"}" title="${esc(fmtDate(a.d))}: ${a.s === "h" ? "Hadir" : "Tiada"}">${esc(p[2] || "")}</span>`;
      }).join("")}</div><p class="muted" style="font-size:12px;margin-top:8px;font-weight:600">Hijau = hadir · Merah = tiada (tarikh terkini dahulu)</p>`
      : '<p class="muted" style="font-size:13px">Tiada rekod sesi.</p>'}
    </div>


    <div class="dsec">
      <h4>🔤 Kosa kata · ${vocab.length} perkataan</h4>
      <div class="tags">${vocab.length ? vocab.map(w => `<span class="tag">${esc(w)}</span>`).join("") : '<span class="muted" style="font-size:13px">Tiada perkataan dicatat.</span>'}</div>
    </div>`;

  document.getElementById("modalBg").classList.add("open");
}

function closeModal() {
  document.getElementById("modalBg").classList.remove("open");
}

/* ---------------- auth-aware nav ---------------- */

function updateAuthNav(user) {
  document.querySelectorAll("[data-auth='user']").forEach(el => el.style.display = user ? "" : "none");
  document.querySelectorAll("[data-auth='guest']").forEach(el => el.style.display = user ? "none" : "");
  const right = document.getElementById("navRight");
  if (!right) return;
  if (user) {
    const name = user.displayName || user.email || "Guru";
    right.innerHTML = `<button class="me-chip" data-logout title="Log keluar">${avatar({ name })}<span>${esc(name.split(/\s+/)[0])}</span></button>`;
  } else {
    right.innerHTML = `<a href="login.html" class="btn sm">Log Masuk</a>`;
  }
}

/* ---------------- init ---------------- */

function firstAuthState() {
  return new Promise(resolve => {
    let done = false;
    onAuthChange(user => {
      updateAuthNav(user);
      USER = user;
      if (!done) { done = true; resolve(user); }
    });
  });
}

async function init() {
  document.getElementById("footYear").textContent = new Date().getFullYear();
  // Wait for Firebase to restore the session first, otherwise a logged-in
  // teacher briefly (or permanently) sees empty sample data.
  await firstAuthState();
  DATA = await loadData();
  document.getElementById("schoolName").textContent = DATA.meta.schoolName;
  document.getElementById("programName").textContent = DATA.meta.programName;

  const sel = document.getElementById("classFilter");
  classesOf(DATA).forEach(c => {
    const o = document.createElement("option");
    o.value = c; o.textContent = c;
    sel.appendChild(o);
  });

  renderHero();
  renderStats();
  renderChips();
  renderClasses();
  renderLevelsDesc();
  renderCharts();
  hydrateIcons();

  document.getElementById("searchBox").addEventListener("input", e => { filterText = e.target.value; renderClasses(); });
  document.getElementById("classChips").addEventListener("click", e => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    filterClass = chip.dataset.cls;
    sel.value = filterClass;
    renderChips();
    renderClasses();
  });
  document.getElementById("classBlocks").addEventListener("click", e => {
    const card = e.target.closest(".scard");
    if (!card) return;
    const s = DATA.students.find(x => x.id === card.dataset.id);
    if (s) openModal(s);
  });
  document.getElementById("printBtn").addEventListener("click", () => window.print());
  document.getElementById("closeModal").addEventListener("click", closeModal);
  document.getElementById("closeModal2").addEventListener("click", closeModal);
  document.getElementById("modalBg").addEventListener("click", e => { if (e.target === e.currentTarget) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
  document.addEventListener("themechange", renderCharts);
}

init();
