import { loadData, saveData, sbmToast, downloadJSON, classesOf, attendanceStats, levelIndex, quizAvg, checkLevelUp, esc, fmtDate, uid, defaultData, getCurrentUser, onAuthChange, isSuperAdmin } from './data.js';

let DATA = null;
let filterClass = "";
let editing = null;

/* ---------------- helpers ---------------- */

function renderEditForm() {
  const s = editing;
  const body = document.getElementById("editBody");
  const photoPreview = s.photo ? `<img src="${esc(s.photo)}" alt="${esc(s.name)}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin-top:8px;border:2px solid var(--primary)">` : '';
  const levelUp = checkLevelUp(DATA, s);
  const levelUpBadge = levelUp ? `<span class="levelpill" style="background:#e8f8f5;color:var(--good);margin-left:8px;cursor:help" title="${esc(levelUp.reason)}">🎓 Sedia naik ke Tahap ${levelUp.nextLevel}</span>` : '';
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
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <select id="inLevel" style="flex:1">
            ${DATA.meta.levels.map((l, i) => `<option value="${i + 1}" ${(s.currentLevel || 1) === i + 1 ? "selected" : ""}>Tahap ${i + 1} — ${esc(l.name)}</option>`).join("")}
          </select>
          ${levelUpBadge}
        </div>
      </div>

      <div class="field full">
        <label>Gambar Murid</label>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <div id="photoPreview">${photoPreview}</div>
          <input type="file" id="inPhoto" accept="image/*" style="flex:1">
          <small style="color:var(--muted)">Maks 500KB. Akan disimpan sebagai base64.</small>
        </div>
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
  const today = new Date().toISOString().slice(0, 10);
  const hasToday = list.some(a => a.d === today);
  el.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
      <input type="date" id="attDate" value="${today}">
      <select id="attStatus">
        <option value="h">Hadir</option>
        <option value="a">Tiada</option>
      </select>
      <button class="btn sm" id="addAttBtn">Tambah</button>
      <button class="btn ghost sm" id="markAllPresentBtn" ${hasToday ? "disabled" : ""}>✓ Semua Hadir Hari Ini</button>
    </div>
    ${list.length ? list.map((a, i) => `
    <div class="attrow">
      <span>${esc(fmtDate(a.d))}</span>
      <span style="display:flex;gap:8px;align-items:center">
        <select class="att-sel" data-i="${i}">
          <option value="h" ${a.s === "h" ? "selected" : ""}>Hadir</option>
          <option value="a" ${a.s === "a" ? "selected" : ""}>Tiada</option>
        </select>
        <button class="btn danger sm att-del" data-i="${i}">Padam</button>
      </span>
    </div>`).join("") : '<span style="color:var(--muted);font-size:13px">Tiada sesi dicatat.</span>'}
  `;
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
  document.getElementById("markAllPresentBtn").addEventListener("click", () => {
    const d = document.getElementById("attDate").value;
    if (!d) return;
    editing.attendance = editing.attendance || [];
    if (editing.attendance.some(a => a.d === d)) return;
    const studentsInClass = DATA.students.filter(s => s.class === editing.class);
    studentsInClass.forEach(s => {
      s.attendance = s.attendance || [];
      if (!s.attendance.some(a => a.d === d)) {
        s.attendance.push({ d: d, s: "h" });
      }
    });
    editing.attendance.push({ d: d, s: "h" });
    saveData(DATA);
    renderAttList();
    renderTable();
    sbmToast("Kehadiran dikemaskini untuk semua murid kelas " + editing.class);
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
            const shareUrl = `${location.origin}${location.pathname.replace("admin.html", "")}parent.html?student=${s.id}`;
            const waText = encodeURIComponent(
              `📚 *Laporan Kemajuan ${s.name}*\n` +
              `Kelas: ${s.class}\n` +
              `Tahap: ${DATA.meta.levels[lv].name}\n` +
              `Kehadiran: ${att.pct}%\n` +
              `Purata Kuiz: ${quizAvg(s)}/100\n\n` +
              `Lihat penuh: ${shareUrl}\n` +
              `_Program Bijak Membaca - ${DATA.meta.schoolName}_`
            );
            return `
            <tr>
              <td style="font-weight:700">${esc(s.name)}</td>
              <td>${esc(s.class)}</td>
              <td><span class="levelpill">${esc(DATA.meta.levels[lv].short)} · ${esc(DATA.meta.levels[lv].name)}</span></td>
              <td>${att.pct}% <span class="smallmeta" style="display:inline">(${att.hadir}/${att.total})</span></td>
              <td class="actions no-print">
                <button class="btn sm ghost editBtn" data-id="${esc(s.id)}">Edit</button>
                <button class="btn sm ghost shareBtn" data-url="${esc(shareUrl)}" title="Kongsi pautan ke ibu bapa">🔗</button>
                <button class="btn sm ghost waBtn" data-url="https://wa.me/?text=${waText}" title="Kongsi via WhatsApp">📱</button>
              </td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>`;
  wrap.querySelectorAll(".editBtn").forEach(b => b.addEventListener("click", () => openEditor(b.dataset.id)));
  wrap.querySelectorAll(".shareBtn").forEach(b => b.addEventListener("click", () => {
    const url = b.dataset.url;
    navigator.clipboard.writeText(url).then(() => {
      const original = b.textContent;
      b.textContent = "✓";
      setTimeout(() => b.textContent = original, 1500);
    }).catch(() => {
      prompt("Salin pautan ini:", url);
    });
  }));
  wrap.querySelectorAll(".waBtn").forEach(b => b.addEventListener("click", () => {
    window.open(b.dataset.url, "_blank");
  }));
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
  const teacherId = getCurrentUser ? getCurrentUser().uid : null;
  editing = {
    id: uid("s"),
    name: "",
    class: filterClass || (classesOf(DATA)[0] || ""),
    gender: "P",
    currentLevel: 1,
    attendance: [],
    quizzes: [],
    vocabulary: [],
    teacherId: teacherId
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
  
  // Handle photo upload
  const photoInput = document.getElementById("inPhoto");
  if (photoInput && photoInput.files[0]) {
    const file = photoInput.files[0];
    if (file.size > 500 * 1024) {
      alert("Gambar terlalu besar. Maksimum 500KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      editing.photo = e.target.result;
      doSave();
    };
    reader.readAsDataURL(file);
    return;
  }
  
  doSave();
  
  function doSave() {
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
      const teacherId = getCurrentUser ? getCurrentUser().uid : null;
      if (teacherId) {
        data.students = data.students.map(s => ({ ...s, teacherId }));
      }
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
  document.getElementById("importCsvBtn").addEventListener("click", () => document.getElementById("importCsvFile").click());
  document.getElementById("importCsvFile").addEventListener("change", async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const text = await f.text();
      const result = Papa.parse(text, { header: true, skipEmptyLines: true });
      if (result.errors.length) {
        alert("Ralat CSV: " + result.errors.map(e => e.message).join(", "));
        return;
      }
      const teacherId = getCurrentUser ? getCurrentUser().uid : null;
      const imported = result.data.map((row, i) => ({
        id: uid("s"),
        name: (row.nama || row.name || "").trim(),
        class: (row.kelas || row.class || "").trim(),
        gender: (row.jantina || row.gender || "P").trim().toUpperCase().charAt(0),
        currentLevel: parseInt(row.tahap || row.level || "1", 10) || 1,
        attendance: [],
        quizzes: [],
        vocabulary: [],
        teacherId: teacherId
      })).filter(s => s.name && s.class);
      if (!imported.length) {
        alert("Tiada data murid sah dalam CSV. Pastikan lajur 'nama' dan 'kelas' wujud.");
        return;
      }
      DATA.students.push(...imported);
      saveData(DATA);
      fillClassFilter();
      renderTable();
      alert(`${imported.length} murid berjaya diimport dari CSV.`);
    } catch (err) {
      alert("Gagal import CSV: " + err.message);
    }
    e.target.value = "";
  });
  document.getElementById("previewBtn").addEventListener("click", () => {
    saveData(DATA);
    window.open("index.html", "_blank");
  });
  document.getElementById("saveSettingsBtn").addEventListener("click", saveSettings);
  document.getElementById("resetBtn").addEventListener("click", () => {
    if (!confirm("Ini akan mengosongkan SEMUA data murid anda. Teruskan?")) return;
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
    alert("Data telah dikosongkan.");
  });
  document.getElementById("printReportBtn").addEventListener("click", () => {
    if (!editing) return;
    printStudentReport(editing);
  });
}

function printStudentReport(s) {
  const att = attendanceStats(s);
  const lv = levelIndex(DATA, s);
  const totalLevels = DATA.meta.levels.length;
  const pct = totalLevels ? Math.round(((lv + 1) / totalLevels) * 100) : 0;
  const lastAtt = (s.attendance || []).slice().sort((a, b) => (a.d < b.d ? 1 : -1));
  const quizes = (s.quizzes || []).slice().sort((a, b) => (a.d < b.d ? 1 : -1));
  const initials = s.name.replace(/binti|bin/gi, "").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("");

  const html = `
    <!DOCTYPE html>
    <html lang="ms">
    <head>
      <meta charset="UTF-8">
      <title>Laporan ${esc(s.name)}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .header h1 { margin: 0; color: #2c3e50; }
        .header p { margin: 5px 0; color: #666; }
        .student-info { display: flex; align-items: center; gap: 15px; margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; }
        .avatar { width: 60px; height: 60px; border-radius: 50%; background: #3498db; color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; }
        .student-details h2 { margin: 0 0 5px; }
        .student-details p { margin: 2px 0; color: #666; }
        .level-badge { display: inline-block; padding: 5px 12px; background: #3498db; color: white; border-radius: 20px; font-weight: bold; margin-top: 10px; }
        .section { margin-bottom: 20px; }
        .section h3 { border-bottom: 1px solid #eee; padding-bottom: 5px; color: #2c3e50; }
        .progress-bar { width: 100%; height: 20px; background: #ecf0f1; border-radius: 10px; overflow: hidden; margin: 10px 0; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #3498db, #2ecc71); }
        .stage { display: flex; align-items: center; gap: 10px; padding: 8px; margin: 5px 0; border-radius: 5px; }
        .stage.done { background: #e8f8f5; }
        .stage.current { background: #fef9e7; }
        .stage.todo { background: #f8f9fa; }
        .stage .dot { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; }
        .stage.done .dot { background: #27ae60; color: white; }
        .stage.current .dot { background: #f39c12; color: white; }
        .stage.todo .dot { background: #bdc3c7; color: white; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #eee; }
        th { background: #f8f9fa; font-weight: 600; }
        .present { color: #27ae60; font-weight: 600; }
        .absent { color: #e74c3c; font-weight: 600; }
        .quiz-row { display: flex; align-items: center; gap: 10px; margin: 8px 0; }
        .quiz-title { flex: 1; }
        .quiz-bar { flex: 2; height: 10px; background: #ecf0f1; border-radius: 5px; overflow: hidden; }
        .quiz-fill { height: 100%; border-radius: 5px; }
        .quiz-score { width: 50px; text-align: right; font-weight: bold; }
        .vocab { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }
        .vocab span { background: #3498db; color: white; padding: 3px 10px; border-radius: 15px; font-size: 12px; }
        .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; }
        @media print { .no-print { display: none !important; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${esc(DATA.meta.schoolName)}</h1>
        <p>${esc(DATA.meta.programName)} — ${esc(DATA.meta.year)}</p>
      </div>

      <div class="student-info">
        <div class="avatar">${esc(initials.toUpperCase())}</div>
        <div class="student-details">
          <h2>${esc(s.name)}</h2>
          <p>Kelas: ${esc(s.class)} | Jantina: ${s.gender === "P" ? "Perempuan" : "Lelaki"}</p>
          <span class="level-badge">Tahap ${lv + 1} dari ${totalLevels}: ${esc(DATA.meta.levels[lv].name)}</span>
        </div>
      </div>

      <div class="section">
        <h3>📖 Tahap Bacaan</h3>
        <div class="progress-bar"><div class="progress-fill" style="width: ${pct}%"></div></div>
        <div>${lv + 1} / ${totalLevels} tahap selesai</div>
        <div style="margin-top: 10px;">
          ${DATA.meta.levels.map((l, i) => `
            <div class="stage ${i < lv ? "done" : i === lv ? "current" : "todo"}">
              <div class="dot">${i < lv ? "✓" : i + 1}</div>
              <div>${esc(l.name)}${i === lv ? " <em>(tahap semasa)</em>" : ""}</div>
            </div>`).join("")}
        </div>
      </div>

      <div class="section">
        <h3>🏫 Kehadiran (${att.hadir}/${att.total} = ${att.pct}%)</h3>
        <table>
          <thead><tr><th>Tarikh</th><th>Status</th></tr></thead>
          <tbody>
            ${lastAtt.length ? lastAtt.map(a => `
              <tr><td>${esc(fmtDate(a.d))}</td><td class="${a.s === "h" ? "present" : "absent"}">${a.s === "h" ? "Hadir" : "Tiada"}</td></tr>`).join("") : '<tr><td colspan="2">Tiada rekod</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h3>📝 Keputusan Kuiz (Purata: ${quizAvg(s)} / 100)</h3>
        ${quizes.length ? quizes.map(q => `
          <div class="quiz-row">
            <span class="quiz-title">${esc(q.t)}</span>
            <div class="quiz-bar"><div class="quiz-fill" style="width: ${Math.min(q.s, 100)}%; background: ${q.s >= 75 ? "#27ae60" : q.s >= 50 ? "#f39c12" : "#e74c3c"}"></div></div>
            <span class="quiz-score">${q.s}</span>
          </div>`).join("") : '<p>Tiada rekod kuiz.</p>'}
      </div>

      <div class="section">
        <h3>🔤 Kosa Kata Dikuasai (${(s.vocabulary || []).length} perkataan)</h3>
        <div class="vocab">
          ${(s.vocabulary || []).length ? s.vocabulary.map(w => `<span>${esc(w)}</span>`).join("") : '<span style="color:#999">Tiada perkataan dicatat</span>'}
        </div>
      </div>

      <div class="footer">
        Dihasilkan pada ${new Date().toLocaleDateString("ms-MY")} | ${esc(DATA.meta.schoolName)} — Program Bijak Membaca
      </div>

      <script>window.onload = () => window.print();<\/script>
    </body>
    </html>
  `;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
}

async function init(user) {
  DATA = await loadData();
  document.getElementById("adminMain").style.display = "block";
  const nameEl = document.getElementById("userName");
  if (nameEl && user) nameEl.textContent = user.displayName || user.email;
  if (isSuperAdmin(user)) {
    const bar = document.querySelector("#adminMain .adminbar");
    if (bar && !document.getElementById("superBanner")) {
      const div = document.createElement("div");
      div.id = "superBanner";
      div.className = "card";
      div.style.cssText = "margin-bottom:12px;border:2px solid var(--accent);background:#fffbeb;color:#78350d;font-weight:600";
      div.textContent = "👑 Mod Superadmin — anda melihat murid SEMUA guru. Edit disimpan ke dokumen guru masing-masing.";
      bar.before(div);
    }
  }
  renderSettings();
  fillClassFilter();
  renderTable();
  wireAdmin();
}

onAuthChange((user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  init(user);
});