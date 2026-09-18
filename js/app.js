import { loadData, programStats, classesOf, attendanceStats, levelIndex, quizAvg, checkLevelUp, esc, fmtDate, onAuthChange, logoutUser } from './data.js';

// Global logout delegation for dynamically created nav button
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-logout]");
  if (!btn) return;
  e.preventDefault();
  try { await logoutUser(); } catch (err) { console.error(err); }
  window.location.href = "index.html";
});

let DATA = null;
let filterClass = "";
let filterText = "";

function levelColor(i, total) {
  const h = Math.round((i / Math.max(total, 1)) * 160);
  return "hsl(" + h + " 70% 45%)";
}

function renderStats() {
  const st = programStats(DATA);
  document.getElementById("stTotal").textContent = st.total;
  document.getElementById("stAvgLevel").textContent = st.avgLevel;
  document.getElementById("stAvgAtt").textContent = st.avgAtt + "%";
  document.getElementById("stAvgQuiz").textContent = st.avgQuiz;
}

function studentCard(s) {
  const att = attendanceStats(s);
  const lv = levelIndex(DATA, s);
  const initials = s.name.replace(/binti|bin/gi, "").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("");
  const levelUp = checkLevelUp(DATA, s);
  const levelUpBadge = levelUp ? `<span class="levelpill" style="background:#e8f8f5;color:var(--good);font-size:11px;margin-top:4px;display:inline-block" title="${esc(levelUp.reason)}">🎓 Sedia naik Tahap ${levelUp.nextLevel}</span>` : '';
  return `
    <div class="card student" data-id="${esc(s.id)}">
      <div class="row">
        <div class="avatar ${esc(s.gender || "M")}">${esc(initials.toUpperCase())}</div>
        <div>
          <div class="nm">${esc(s.name)}</div>
          <div class="cls">${esc(s.class)}</div>
        </div>
      </div>
      <div class="levelpill big">${esc(DATA.meta.levels[lv].short)} · ${esc(DATA.meta.levels[lv].name)}</div>
      ${levelUpBadge}
      <div class="attbar" title="Kehadiran ${att.pct}%"><i style="width:${att.pct}%"></i></div>
      <div class="smallmeta">
        <span>Kehadiran ${att.pct}%</span>
        <span>Kuiz ${quizAvg(s)}</span>
      </div>
    </div>`;
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
    const list = DATA.students.filter(s =>
      s.class === cls &&
      (!q || s.name.toLowerCase().includes(q))
    );
    if (!list.length) return;
    matched += list.length;
    const atts = list.map(s => attendanceStats(s).pct);
    const clsAvg = Math.round(atts.reduce((a, b) => a + b, 0) / atts.length);
    html += `
      <div class="classblock">
        <div class="classhead">
          <h3>Kelas ${esc(cls)}</h3>
          <small>${list.length} murid · Purata kehadiran ${clsAvg}%</small>
        </div>
        <div class="grid students">${list.map(studentCard).join("")}</div>
      </div>`;
  });

  container.innerHTML = html;
  empty.style.display = matched ? "none" : "block";

  container.querySelectorAll(".student").forEach(el => {
    el.addEventListener("click", () => {
      const s = DATA.students.find(x => x.id === el.dataset.id);
      if (s) openModal(s);
    });
  });
}

function renderCharts() {
  if (typeof Chart === 'undefined' || !DATA) return;
  const isDark = document.documentElement.classList.contains('dark');
  const grid = isDark ? '#334155' : '#e2e8f0';
  const ink = isDark ? '#f1f5f9' : '#0f172a';
  Chart.defaults.color = ink;
  Chart.defaults.borderColor = grid;
  // Level distribution
  const levelCounts = DATA.meta.levels.map(() => 0);
  DATA.students.forEach(s => { levelCounts[levelIndex(DATA, s)]++; });
  const lc = document.getElementById('levelChart');
  if (lc) {
    if (lc._chart) lc._chart.destroy();
    lc._chart = new Chart(lc, {
      type: 'bar',
      data: {
        labels: DATA.meta.levels.map(l => l.short),
        datasets: [{ label: 'Murid', data: levelCounts, backgroundColor: '#0e7490', borderRadius: 6 }]
      },
      options: { responsive: true, plugins: { legend: { display: false }, title: { display: true, text: 'Taburan Tahap Bacaan' } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
  }
  // Attendance buckets
  const buckets = ['0-49%', '50-69%', '70-89%', '90-100%'];
  const attCounts = [0,0,0,0];
  DATA.students.forEach(s => {
    const p = attendanceStats(s).pct;
    if (p < 50) attCounts[0]++; else if (p < 70) attCounts[1]++; else if (p < 90) attCounts[2]++; else attCounts[3]++;
  });
  const ac = document.getElementById('attChart');
  if (ac) {
    if (ac._chart) ac._chart.destroy();
    ac._chart = new Chart(ac, {
      type: 'doughnut',
      data: { labels: buckets, datasets: [{ data: attCounts, backgroundColor: ['#dc2626','#d97706','#16a34a','#0e7490'] }] },
      options: { responsive: true, plugins: { title: { display: true, text: 'Taburan Kehadiran' }, legend: { position: 'bottom' } } }
    });
  }
}

function renderLevelsDesc() {
  const lv = DATA.meta.levels;
  document.getElementById("levelsDesc").innerHTML = `
    <div class="stagelist">
      ${lv.map((l, i) => `
        <div class="stage">
          <div class="dot">${i + 1}</div>
          <div class="lname">${esc(l.name)}${l.material ? ` <a href="${esc(l.material)}" target="_blank" style="font-size:11px;color:var(--primary);margin-left:6px">📎 Bahan</a>` : ''}</div>
        </div>`).join("")}
    </div>`;
}

function openModal(s) {
  const att = attendanceStats(s);
  const lv = levelIndex(DATA, s);
  const totalLevels = DATA.meta.levels.length;
  const pct = totalLevels ? Math.round(((lv + 1) / totalLevels) * 100) : 0;
  const lastAtt = (s.attendance || []).slice().sort((a, b) => (a.d < b.d ? 1 : -1)).slice(0, 6);
  const quizes = (s.quizzes || []).slice().sort((a, b) => (a.d < b.d ? 1 : -1)).slice(0, 6);

  const body = document.getElementById("modalBody");
  body.innerHTML = `
    <div class="phead">
      <div class="avatar big ${esc(s.gender || "M")}">${esc(s.name.split(" ")[0][0])}</div>
      <div class="info">
        <h3>${esc(s.name)}</h3>
        <p>Kelas ${esc(s.class)} · Sesi ${DATA.meta.year}</p>
      </div>
      <div class="levelpill big">Tahap ${lv + 1} dari ${totalLevels}</div>
    </div>

    <div class="sections">
      <div class="card secbox">
        <h4>📖 Tahap Bacaan</h4>
        <div class="progress">
          <div class="pbar"><i style="width:${pct}%"></i></div>
          <div class="pnum">${lv + 1}/${totalLevels}</div>
        </div>
        <div class="stagelist">
          ${DATA.meta.levels.map((l, i) => `
            <div class="stage ${i < lv ? "done" : i === lv ? "cur" : "todo"}">
              <div class="dot">${i < lv ? "✓" : i + 1}</div>
              <div class="lname">${esc(l.name)}${i === lv ? "<small>● Tahap semasa</small>" : ""}</div>
            </div>`).join("")}
        </div>
      </div>

      <div class="card secbox">
        <h4>🏫 Kehadiran Sesi</h4>
        <div class="attstats">
          <div><div class="n" style="color:var(--good)">${att.hadir}</div><div class="l">Hadir</div></div>
          <div><div class="n" style="color:var(--bad)">${att.absent}</div><div class="l">Tiada</div></div>
          <div><div class="n" style="color:var(--primary-dark)">${att.pct}%</div><div class="l">Kehadiran</div></div>
        </div>
        <div class="attrows">
          ${lastAtt.length ? lastAtt.map(a => `
            <div class="attrow">
              <span>${esc(fmtDate(a.d))}</span>
              <span class="st ${a.s === "h" ? "hadir" : "tiada"}">${a.s === "h" ? "Hadir" : "Tiada"}</span>
            </div>`).join("") : '<span style="color:var(--muted);font-size:12.5px">Tiada rekod sesi.</span>'}
        </div>
      </div>

      <div class="card secbox">
        <h4>📝 Keputusan Kuiz</h4>
        ${quizes.length ? `
          <div class="bars">
            ${quizes.map(q => `
              <div class="bar-row">
                <span class="bt" title="${esc(q.t)}">${esc(q.t)}</span>
                <div class="track"><i style="width:${Math.min(q.s, 100)}%;background:${q.s >= 75 ? "var(--good)" : q.s >= 50 ? "var(--accent)" : "var(--bad)"}"></i></div>
                <span class="bv">${q.s}</span>
              </div>`).join("")}
          </div>
          <p style="font-size:12px;color:var(--muted);margin-top:10px;font-weight:600">Purata: ${quizAvg(s)} / 100</p>`
        : '<span style="color:var(--muted);font-size:12.5px">Tiada rekod kuiz.</span>'}
      </div>

      <div class="card secbox">
        <h4>🔤 Kosa Kata Dikuasai</h4>
        <p style="font-size:12.5px;color:var(--muted);font-weight:600;margin-bottom:8px">${(s.vocabulary || []).length} perkataan</p>
        <div class="tags">
          ${(s.vocabulary || []).length ? s.vocabulary.map(w => `<span class="tag">${esc(w)}</span>`).join("") : '<span style="color:var(--muted);font-size:12.5px">Tiada perkataan dicatat.</span>'}
        </div>
      </div>
    </div>`;

  document.getElementById("modalBg").classList.add("open");
}

function closeModal() {
  document.getElementById("modalBg").classList.remove("open");
}

function updateAuthNav(user) {
  document.querySelectorAll("[data-auth='user']").forEach(el => el.style.display = user ? "" : "none");
  document.querySelectorAll("[data-auth='guest']").forEach(el => el.style.display = user ? "none" : "");
  const right = document.getElementById("navRight");
  if (!right) return;
  let navUser = document.getElementById("navUser");
  if (user && !navUser) {
    navUser = document.createElement("span");
    navUser.id = "navUser";
    navUser.style.cssText = "font-size:13px;color:#e0f2fe;display:flex;align-items:center;gap:8px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
    navUser.innerHTML = '<span style="overflow:hidden;text-overflow:ellipsis">' + esc(user.displayName || user.email) + '</span> <button class="btn ghost sm" style="padding:4px 8px;font-size:12px;background:rgba(255,255,255,.15);color:#fff;border-color:rgba(255,255,255,.25);flex:0 0 auto" data-logout>Keluar</button>';
    right.prepend(navUser);
  }
  if (!user && navUser) navUser.remove();
  if (user && navUser) {
    const nameSpan = navUser.querySelector("span");
    if (nameSpan) nameSpan.textContent = user.displayName || user.email;
  }
}

async function init() {
  onAuthChange(updateAuthNav);
  DATA = await loadData();
  document.getElementById("schoolName").textContent = DATA.meta.schoolName;
  document.getElementById("programName").textContent = DATA.meta.programName;
  document.getElementById("metaTotal").textContent = DATA.students.length + " murid";
  document.getElementById("metaLevels").textContent = DATA.meta.levels.length + " tahap";
  document.getElementById("metaYear").textContent = "Tahun " + DATA.meta.year;
  document.getElementById("footYear").textContent = new Date().getFullYear();

  const sel = document.getElementById("classFilter");
  classesOf(DATA).forEach(c => {
    const o = document.createElement("option");
    o.value = c;
    o.textContent = c;
    sel.appendChild(o);
  });

  renderStats();
  renderClasses();
  renderLevelsDesc();
  renderCharts();

  document.getElementById("searchBox").addEventListener("input", e => {
    filterText = e.target.value;
    renderClasses();
  });
  sel.addEventListener("change", e => {
    filterClass = e.target.value;
    renderClasses();
  });
  document.getElementById("printBtn").addEventListener("click", () => window.print());
  document.getElementById("closeModal").addEventListener("click", closeModal);
  document.getElementById("closeModal2").addEventListener("click", closeModal);
  document.getElementById("modalBg").addEventListener("click", e => {
    if (e.target === e.currentTarget) closeModal();
  });
}

init();