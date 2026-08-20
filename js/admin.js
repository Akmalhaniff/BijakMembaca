let DATA = null;
let unlocked = false;
let filterClass = "";
let editing = null;

/* ---------------- helpers ---------------- */

function getPin() {
  return localStorage.getItem(PIN_KEY) || DEFAULT_PIN;
}

function renderEditForm() {
  const s = editing;
  const body = document.getElementById("editBody");
  body.innerHTML = `
    <div class="form-grid">
      <div class="field">
        <label>Nama Penuh</label>
        <input type="text" id="inName" value="${esc(s.name)}">
      </div>
      <div class="field">
        <label>Kelas</label>
        <input type="text" id="inClass" value="${esc(s.class)}">
      </div>
      <div class="field">
        <label>Jantina</label>
        <select id="inGender">
          <option value="P" ${s.gender === "P" ? "selected" : ""}>Perempuan</option>
          <option value="L" ${s.gender === "L" ? "selected" : ""}>Lelaki</option>
        </select>
      </div>
      <div class="field">
        <label>Tahap Semasa</label>
        <select id="inLevel">
          ${DATA.meta.levels.map((l, i) => `<option value="${i + 1}" ${(s.currentLevel || 1) === i + 1 ? "selected" : ""}>Tahap ${i + 1} — ${esc(l.name)}</option>`).join("")}
        </select>
      </div>

      <div class="full">
        <div class="mini">
          <h5>Kehadiran Sesi</h5>
          <div id="attList"></div>
          <div class="editor-row" style="margin-top:10px">
            <input type="date" id="attDate" value="${new Date().toISOString().slice(0, 10)}">
            <select id="attStatus">
              <option value="h">Hadir</option>
              <option value="a">Tiada</option>
            </select>
            <button class="btn sm" id="addAttBtn">Tambah</button>
          </div>
        </div>
      </div>

      <div class="full">
        <div class="mini">
          <h5>Keputusan Kuiz</h5>
          <div id="quizList"></div>
          <div class="editor-row" style="margin-top:10px">
            <input type="date" id="qzDate" value="${new Date().toISOString().slice(0, 10)}">
            <input type="text" id="qzTitle" placeholder="Tajuk kuiz">
            <input type="number" id="qzScore" min="0" max="100" placeholder="Markah">
            <button class="btn sm" id="addQzBtn">Tambah</button>
          </div>
        </div>
      </div>

      <div class="full">
        <div class="mini">
          <h5>Kosa Kata Dikuasai</h5>
          <div id="vocabTags" class="words"></div>
          <div class="editor-row" style="margin-top:10px">
            <input type="text" id="vocabWord" placeholder="Perkataan baru">
            <button class="btn sm" id="addVocabBtn">Tambah</button>
          </div>
        </div>
      </div>
    </div>`;

  renderAttList();
  renderQuizList();
  renderVocabTags();
  bindEditorEvents();
}

function renderAttList() {
  const el = document.getElementById("attList");
  const list = (editing.attendance || []).slice().sort((a, b) => (a.d < b.d ? 1 : -1));
  el.innerHTML = list.length ? list.map((a, i) => `
    <div class="attrow">
      <span>${esc(fmtDate(a.d))}</span>
      <span style="display:flex;gap:8px;align-items:center">
        <select class="att-sel" data-i="${i}">
          <option value="h" ${a.s === "h" ? "selected" : ""}>Hadir</option>
          <option value="a" ${a.s === "a" ? "selected" : ""}>Tiada</option>
        </select>
        <button class="btn danger sm att-del" data-i="${i}">Padam</button>
      </span>
    </div>`).join("") : '<span style="color:var(--muted);font-size:13px">Tiada sesi dicatat.</span>';
}

function renderQuizList() {
  const el = document.getElementById("quizList");
  const list = (editing.quizzes || []).slice().sort((a, b) => (a.d < b.d ? 1 : -1));
  el.innerHTML = list.length ? list.map((q, i) => `
    <div class="attrow">
      <span>${esc(fmtDate(q.d))}</span>
      <span style="font-weight:600">${esc(q.t)}</span>
      <span class="levelpill">${q.s} / 100</span>
      <button class="btn danger sm qz-del" data-i="${i}">Padam</button>
    </div>`).join("") : '<span style="color:var(--muted);font-size:13px">Tiada kuiz dicatat.</span>';
}

function renderVocabTags() {
  const el = document.getElementById("vocabTags");
  const list = editing.vocabulary || [];
  el.innerHTML = list.length ? list.map((w, i) => `
    <span class="word">${esc(w)}<button class="vocab-del" data-i="${i}">×</button></span>`).join("") : '<span style="color:var(--muted);font-size:13px">Tiada perkataan dicatat.</span>';
}

function bindEditorEvents() {
  document.getElementById("addAttBtn").addEventListener("click", () => {
    const d = document.getElementById("attDate").value;
    const st = document.getElementById("attStatus").value;
    if (!d) return;
    editing.attendance = editing.attendance || [];
    if (editing.attendance.some(a => a.d === d)) return;
    editing.attendance.push({ d: d, s: st });
    renderAttList();
  });
  document.addEventListener("click", e => {
    if (e.target.classList.contains("att-del")) {
      editing.attendance.splice(+e.target.dataset.i, 1);
      renderAttList();
    }
    if (e.target.classList.contains("att-sel")) {
      const i = +e.target.dataset.i;
      const sorted = (editing.attendance || []).slice().sort((a, b) => (a.d < b.d ? 1 : -1));
      sorted[i].s = e.target.value;
      renderAttList();
    }
    if (e.target.classList.contains("qz-del")) {
      editing.quizzes.splice(+e.target.dataset.i, 1);
      renderQuizList();
    }
    if (e.target.classList.contains("vocab-del")) {
      editing.vocabulary.splice(+e.target.dataset.i, 1);
      renderVocabTags();
    }
  });
  document.getElementById("addQzBtn").addEventListener("click", () => {
    const d = document.getElementById("qzDate").value;
    const t = document.getElementById("qzTitle").value.trim();
    const sc = parseInt(document.getElementById("qzScore").value, 10);
    if (!d || !t || isNaN(sc)) return;
    editing.quizzes = editing.quizzes || [];
    editing.quizzes.push({ d: d, t: t, s: Math.max(0, Math.min(100, sc)) });
    renderQuizList();
    document.getElementById("qzTitle").value = "";
    document.getElementById("qzScore").value = "";
  });
  document.getElementById("addVocabBtn").addEventListener("click", () => {
    const w = document.getElementById("vocabWord").value.trim().toLowerCase();
    if (!w) return;
    editing.vocabulary = editing.vocabulary || [];
    if (!editing.vocabulary.includes(w)) editing.vocabulary.push(w);
    renderVocabTags();
    document.getElementById("vocabWord").value = "";
  });
}

/* ---------------- list table ---------------- */

function renderTable() {
  const wrap = document.getElementById("tableWrap");
  const list = DATA.students.filter(s => !filterClass || s.class === filterClass);
  if (!list.length) {
    wrap.innerHTML = `<div class="card empty"><div class="big">📚</div>Tiada murid lagi. Klik "Tambah Murid" untuk bermula.</div>`;
    return;
  }
  wrap.innerHTML = `
    <div class="card" style="padding:0;overflow-x:auto">
      <table class="tbl">
        <thead>
          <tr><th>Murid</th><th>Kelas</th><th>Tahap</th><th>Kehadiran</th><th class="no-print"></th></tr>
        </thead>
        <tbody>
          ${list.map(s => {
            const att = attendanceStats(s);
            const lv = levelIndex(DATA, s);
            return `
            <tr>
              <td style="font-weight:700">${esc(s.name)}</td>
              <td>${esc(s.class)}</td>
              <td><span class="levelpill">${esc(DATA.meta.levels[lv].short)} · ${esc(DATA.meta.levels[lv].name)}</span></td>
              <td>${att.pct}% <span class="smallmeta" style="display:inline">(${att.hadir}/${att.total})</span></td>
              <td class="actions no-print">
                <button class="btn sm ghost editBtn" data-id="${esc(s.id)}">Edit</button>
              </td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>`;
  wrap.querySelectorAll(".editBtn").forEach(b => b.addEventListener("click", () => openEditor(b.dataset.id)));
}

/* ---------------- editor modal ---------------- */

function openEditor(id) {
  editing = DATA.students.find(s => s.id === id);
  if (!editing) return;
  document.getElementById("editTitle").textContent = "Edit — " + editing.name;
  renderEditForm();
  document.getElementById("editModalBg").classList.add("open");
}

function newStudent() {
  editing = {
    id: uid("s"),
    name: "",
    class: filterClass || (classesOf(DATA)[0] || ""),
    gender: "P",
    currentLevel: 1,
    attendance: [],
    quizzes: [],
    vocabulary: []
  };
  document.getElementById("editTitle").textContent = "Tambah Murid Baru";
  renderEditForm();
  document.getElementById("editModalBg").classList.add("open");
}

function saveEditing() {
  const name = document.getElementById("inName").value.trim();
  const cls = document.getElementById("inClass").value.trim();
  const gender = document.getElementById("inGender").value;
  const level = parseInt(document.getElementById("inLevel").value, 10);
  if (!name || !cls) return;
  editing.name = name;
  editing.class = cls;
  editing.gender = gender;
  editing.currentLevel = level;
  const existing = DATA.students.find(s => s.id === editing.id);
  if (existing) {
    Object.assign(existing, editing);
  } else {
    DATA.students.push(editing);
  }
  saveData(DATA);
  closeEditor();
  fillClassFilter();
  renderTable();
}

function closeEditor() {
  document.getElementById("editModalBg").classList.remove("open");
  editing = null;
}

function deleteEditing() {
  if (!editing) return;
  if (!confirm("Pastikan anda mahu memadam murid ini?")) return;
  DATA.students = DATA.students.filter(s => s.id !== editing.id);
  saveData(DATA);
  closeEditor();
  fillClassFilter();
  renderTable();
}

/* ---------------- settings ---------------- */

function renderSettings() {
  document.getElementById("setSchool").value = DATA.meta.schoolName;
  document.getElementById("setProgram").value = DATA.meta.programName;
  document.getElementById("setYear").value = DATA.meta.year;
  const box = document.getElementById("levelInputs");
  box.innerHTML = DATA.meta.levels.map((l, i) => `
    <div class="editor-row" style="margin-bottom:8px">
      <input type="text" value="${esc(l.name)}" data-level="${i}">
    </div>`).join("");
}

function saveSettings() {
  DOMLevelNames();
  syncLevelNames();
  DATA.meta.schoolName = document.getElementById("setSchool").value.trim() || DATA.meta.schoolName;
  DATA.meta.programName = document.getElementById("setProgram").value.trim() || DATA.meta.programName;
  DATA.meta.year = document.getElementById("setYear").value.trim() || DATA.meta.year;
  const newPin = document.getElementById("setPin").value.trim();
  if (newPin) {
    localStorage.setItem(PIN_KEY, newPin);
    document.getElementById("setPin").value = "";
  }
  saveData(DATA);
  document.getElementById("programName").textContent = DATA.meta.programName;
  renderTable();
}

function DOMLevelNames() {
  document.querySelectorAll("#levelInputs input").forEach((inp, i) => {
    const v = inp.value.trim();
    if (v) DATA.meta.levels[i].name = v;
  });
}

function syncLevelNames() {
  const short = n => "L" + (Math.min(n.length, 2));
  DATA.meta.levels.forEach((l, i) => {
    l.short = "L" + (i + 1);
  });
}

function fillClassFilter() {
  const sel = document.getElementById("classFilter");
  const cur = sel.value;
  sel.innerHTML = `<option value="">Semua Kelas</option>`;
  classesOf(DATA).forEach(c => {
    const o = document.createElement("option");
    o.value = c;
    o.textContent = c;
    sel.appendChild(o);
  });
  sel.value = cur;
}

/* ---------------- rest ---------------- */

function wireAdmin() {
  document.getElementById("classFilter").addEventListener("change", e => {
    filterClass = e.target.value;
    renderTable();
  });
  document.getElementById("addStudentBtn").addEventListener("click", newStudent);
  document.getElementById("saveStudentBtn").addEventListener("click", saveEditing);
  document.getElementById("deleteStudentBtn").addEventListener("click", deleteEditing);
  document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => {
    document.getElementById("editModalBg").classList.remove("open");
    editing = null;
  }));
  document.getElementById("editModalBg").addEventListener("click", e => {
    if (e.target === e.currentTarget) {
      document.getElementById("editModalBg").classList.remove("open");
      editing = null;
    }
  });

  document.getElementById("exportBtn").addEventListener("click", () => {
    saveData(DATA);
    downloadJSON(DATA, "students.json");
  });
  document.getElementById("importBtn").addEventListener("click", () => document.getElementById("importFile").click());
  document.getElementById("importFile").addEventListener("change", async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const text = await f.text();
      const data = JSON.parse(text);
      if (!data || !Array.isArray(data.students)) throw new Error("format");
      DATA = data;
      saveData(DATA);
      fillClassFilter();
      renderSettings();
      renderTable();
      alert("Data berjaya dimuat naik.");
    } catch (err) {
      alert("Fail JSON tidak sah. Pastikan ia mengandungi data murid yang betul.");
    }
    e.target.value = "";
  });
  document.getElementById("previewBtn").addEventListener("click", () => {
    saveData(DATA);
    window.open("index.html", "_blank");
  });
  document.getElementById("saveSettingsBtn").addEventListener("click", saveSettings);
  document.getElementById("resetBtn").addEventListener("click", () => {
    if (!confirm("Ini akan mengosongkan SEMUA data murid pada penyemak imbas ini. Teruskan?")) return;
    const d = defaultData();
    DATA.meta.schoolName = d.meta.schoolName;
    DATA.meta.programName = d.meta.programName;
    DATA.meta.year = d.meta.year;
    DATA.meta.levels = d.meta.levels.map(l => ({ ...l }));
    DATA.students = [];
    saveData(DATA);
    fillClassFilter();
    renderSettings();
    renderTable();
    alert("Data telah dikosongkan. Gunakan import JSON untuk memuatkan semula data sedia ada.");
  });

  document.getElementById("pinBtn").addEventListener("click", tryUnlock);
  document.getElementById("pinInput").addEventListener("keydown", e => {
    if (e.key === "Enter") tryUnlock();
  });
}

function tryUnlock() {
  const v = document.getElementById("pinInput").value.trim();
  if (v === getPin()) {
    unlocked = true;
    document.getElementById("gate").style.display = "none";
    document.getElementById("adminMain").style.display = "block";
  } else {
    document.getElementById("pinErr").textContent = "PIN salah. Cuba lagi.";
    document.getElementById("pinInput").value = "";
  }
}

async function init() {
  const local = loadLocal();
  DATA = local || await loadData();
  if (!local) saveData(DATA);
  renderSettings();
  fillClassFilter();
  renderTable();
  wireAdmin();
}

init();