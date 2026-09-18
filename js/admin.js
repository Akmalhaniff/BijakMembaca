import { loadData, saveData, sbmToast, downloadJSON, classesOf, attendanceStats, levelIndex, quizAvg, checkLevelUp, esc, fmtDate, uid, defaultData, getCurrentUser, onAuthChange, isSuperAdmin, getAllTeachers, deleteTeacherData, sendTeacherPasswordReset, logoutUser, db } from './data.js';
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let DATA = null;
let filterClass = "";
let filterText = "";
let sortBy = "name";
let selectedIds = new Set();
let editing = null;

// Global logout - works even before wireAdmin / even if init fails
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-logout]");
  if (!btn) return;
  e.preventDefault();
  try { await logoutUser(); } catch (err) { console.error(err); }
  window.location.href = "index.html";
});

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
  let list = DATA.students.filter(s => !filterClass || s.class === filterClass);
  const q = filterText.trim().toLowerCase();
  if (q) list = list.filter(s => s.name.toLowerCase().includes(q) || s.class.toLowerCase().includes(q));
  if (sortBy === "name") list.sort((a,b) => a.name.localeCompare(b.name));
  else if (sortBy === "level") list.sort((a,b) => (b.currentLevel||1) - (a.currentLevel||1));
  else if (sortBy === "att") list.sort((a,b) => attendanceStats(b).pct - attendanceStats(a).pct);
  if (!list.length) {
    wrap.innerHTML = `<div class="card empty"><div class="big">📚</div>Tiada murid lagi. Klik "Tambah Murid" untuk bermula.</div>`;
    document.getElementById("bulkPromoteBtn").disabled = true;
    return;
  }
  wrap.innerHTML = `
    <div class="card" style="padding:0;overflow-x:auto">
      <table class="tbl">
        <thead>
          <tr><th class="no-print"><input type="checkbox" id="selectAll"></th><th>Murid</th><th>Kelas</th><th>Tahap</th><th>Kehadiran</th><th class="no-print"></th></tr>
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
            const checked = selectedIds.has(s.id) ? "checked" : "";
            const linusBadge = isLinus(s) ? `<span class="levelpill" style="background:#fee2e2;color:#b91c1c;margin-left:6px;font-size:10px">⚠️ Intervensi</span>` : "";
            return `
            <tr>
              <td class="no-print"><input type="checkbox" class="rowCheck" data-id="${esc(s.id)}" ${checked}></td>
              <td style="font-weight:700">${esc(s.name)}${linusBadge}</td>
              <td>${esc(s.class)}</td>
              <td><span class="levelpill">${esc(DATA.meta.levels[lv].short)} · ${esc(DATA.meta.levels[lv].name)}</span>${linusBadge ? "" : ""}</td>
              <td>${att.pct}% <span class="smallmeta" style="display:inline">(${att.hadir}/${att.total})</span></td>
              <td class="actions no-print">
                <button class="btn sm ghost editBtn" data-id="${esc(s.id)}">Edit</button>
                <button class="btn sm ghost shareBtn" data-url="${esc(shareUrl)}" title="Salin pautan">🔗</button>
                <button class="btn sm ghost qrBtn" data-url="${esc(shareUrl)}" data-name="${esc(s.name)}" title="QR Code">QR</button>
                <button class="btn sm ghost waBtn" data-url="https://wa.me/?text=${waText}" title="WhatsApp">📱</button>
              </td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>`;
  const bulkBtn = document.getElementById("bulkPromoteBtn");
  if (bulkBtn) bulkBtn.disabled = selectedIds.size === 0;
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
  wrap.querySelectorAll(".qrBtn").forEach(b => b.addEventListener("click", () => openQrModal(b.dataset.url, b.dataset.name)));
  const selectAll = wrap.querySelector("#selectAll");
  if (selectAll) selectAll.addEventListener("change", e => {
    if (e.target.checked) list.forEach(s => selectedIds.add(s.id));
    else list.forEach(s => selectedIds.delete(s.id));
    renderTable();
  });
  wrap.querySelectorAll(".rowCheck").forEach(cb => cb.addEventListener("change", e => {
    if (e.target.checked) selectedIds.add(e.target.dataset.id);
    else selectedIds.delete(e.target.dataset.id);
    document.getElementById("bulkPromoteBtn").disabled = selectedIds.size === 0;
  }));
}

function openQrModal(url, name) {
  const modal = document.getElementById("qrModalBg");
  const qrEl = document.getElementById("qrCode");
  const urlEl = document.getElementById("qrUrl");
  qrEl.innerHTML = "";
  // eslint-disable-next-line no-undef
  if (typeof QRCode !== 'undefined') {
    new QRCode(qrEl, { text: url, width: 180, height: 180, correctLevel: QRCode.CorrectLevel.M });
  } else {
    qrEl.textContent = url;
  }
  urlEl.textContent = url + (name ? " — " + name : "");
  const waBtn = document.getElementById("qrWaBtn");
  const copyBtn = document.getElementById("qrCopyBtn");
  if (waBtn) waBtn.onclick = () => window.open("https://wa.me/?text=" + encodeURIComponent("Laporan " + (name || "murid") + ": " + url), "_blank");
  if (copyBtn) copyBtn.onclick = () => navigator.clipboard.writeText(url).then(() => sbmToast("Pautan disalin")).catch(() => prompt("Salin pautan:", url));
  modal.classList.add("open");
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
    <div class="editor-row" style="margin-bottom:8px;flex-wrap:wrap">
      <span style="min-width:28px;font-weight:700;color:var(--muted)">L${i+1}</span>
      <input type="text" value="${esc(l.name)}" data-level="${i}" placeholder="Nama tahap" style="flex:2;min-width:140px">
      <input type="url" value="${esc(l.material||'')}" data-material="${i}" placeholder="Link bahan (https://)" style="flex:2;min-width:140px">
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
  document.querySelectorAll("#levelInputs input[data-level]").forEach(inp => {
    const i = parseInt(inp.getAttribute("data-level"), 10);
    const v = inp.value.trim();
    if (v) DATA.meta.levels[i].name = v;
  });
  document.querySelectorAll("#levelInputs input[data-material]").forEach(inp => {
    const i = parseInt(inp.getAttribute("data-material"), 10);
    DATA.meta.levels[i].material = inp.value.trim();
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
  const searchEl = document.getElementById("adminSearch");
  let searchTimer;
  if (searchEl) searchEl.addEventListener("input", e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { filterText = e.target.value; renderTable(); }, 250);
  });
  const sortEl = document.getElementById("sortBy");
  if (sortEl) sortEl.addEventListener("change", e => { sortBy = e.target.value; renderTable(); });
  document.getElementById("bulkPromoteBtn")?.addEventListener("click", bulkPromote);
  document.getElementById("promoteClassBtn")?.addEventListener("click", promoteClass);
  document.getElementById("archiveYearBtn")?.addEventListener("click", archiveYear);
  document.getElementById("posterBtn")?.addEventListener("click", posterKelasA3);
  document.getElementById("transferBtn")?.addEventListener("click", openTransferModal);
  document.getElementById("confirmTransferBtn")?.addEventListener("click", confirmTransfer);
  document.getElementById("importApdmBtn")?.addEventListener("click", () => document.getElementById("importApdmFile")?.click());
  document.getElementById("importApdmFile")?.addEventListener("change", async e => {
    const f = e.target.files[0]; if (!f) return;
    await importApdmFile(f);
    e.target.value = "";
  });
  document.getElementById("exportKpmBtn")?.addEventListener("click", exportKpm);
  document.getElementById("exportPbdBtn")?.addEventListener("click", exportPbd);
  document.getElementById("addStudentBtn").addEventListener("click", newStudent);
  document.getElementById("saveStudentBtn").addEventListener("click", saveEditing);
  document.getElementById("deleteStudentBtn").addEventListener("click", deleteEditing);
  document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => {
    const target = b.getAttribute("data-close");
    if (target === "qr") document.getElementById("qrModalBg").classList.remove("open");
    else if (target === "transfer") document.getElementById("transferModalBg").classList.remove("open");
    else { document.getElementById("editModalBg").classList.remove("open"); editing = null; }
  }));
  document.getElementById("transferModalBg")?.addEventListener("click", e => { if (e.target===e.currentTarget) e.currentTarget.classList.remove("open"); });
  document.getElementById("editModalBg").addEventListener("click", e => {
    if (e.target === e.currentTarget) {
      document.getElementById("editModalBg").classList.remove("open");
      editing = null;
    }
  });
  document.getElementById("qrModalBg").addEventListener("click", e => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove("open");
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

function bulkPromote() {
  if (selectedIds.size === 0) return;
  const maxLevel = DATA.meta.levels.length;
  let count = 0;
  DATA.students.forEach(s => {
    if (selectedIds.has(s.id) && (s.currentLevel||1) < maxLevel) { s.currentLevel++; count++; }
  });
  if (!count) { sbmToast("Semua murid terpilih sudah di tahap maksimum"); return; }
  saveData(DATA);
  selectedIds.clear();
  renderTable();
  sbmToast(count + " murid dinaikkan tahap");
}

function promoteClass() {
  const cls = filterClass || prompt("Masukkan nama kelas untuk dinaikkan (cth: 1 Arif -> 2 Arif):", classesOf(DATA)[0] || "");
  if (!cls) return;
  const newCls = prompt("Nama kelas baru:", cls.replace(/^(\d+)/, (m,n)=> String(parseInt(n)+1)));
  if (!newCls || newCls === cls) return;
  let count = 0;
  DATA.students.forEach(s => { if (s.class === cls) { s.class = newCls; count++; } });
  if (!count) { sbmToast("Tiada murid dalam kelas " + cls); return; }
  saveData(DATA);
  fillClassFilter();
  filterClass = newCls;
  document.getElementById("classFilter").value = newCls;
  renderTable();
  sbmToast(count + " murid dipindah " + cls + " → " + newCls);
}

async function archiveYear() {
  const year = DATA.meta.year || new Date().getFullYear();
  const newYear = prompt("Arkib tahun " + year + " dan mula tahun baru. Masukkan tahun baru:", String(parseInt(year)+1));
  if (!newYear) return;
  if (!confirm("Arkib " + DATA.students.length + " murid tahun " + year + " dan kosongkan senarai?")) return;
  try {
    const teacherId = getCurrentUser().uid;
    const snapshot = JSON.parse(JSON.stringify(DATA));
    await setDoc(doc(db, "archives", teacherId + "_" + year), { ...snapshot, archivedAt: new Date().toISOString(), ownerEmail: getCurrentUser().email });
    DATA.students = [];
    DATA.meta.year = newYear;
    await saveData(DATA);
    fillClassFilter();
    renderTable();
    renderSettings();
    sbmToast("Tahun " + year + " diarkib. Tahun semasa: " + newYear);
  } catch (err) {
    console.error(err);
    alert("Gagal arkib: " + err.message);
  }
}

function isLinus(s) {
  // Flag if stuck at L1-L2 > 8 weeks (56 days) with low attendance/quiz
  const lvl = s.currentLevel || 1;
  if (lvl > 2) return false;
  const firstAtt = (s.attendance||[]).slice().sort((a,b)=>a.d.localeCompare(b.d))[0];
  if (!firstAtt) return false;
  const days = Math.floor((Date.now() - new Date(firstAtt.d).getTime())/86400000);
  if (days < 56) return false;
  return attendanceStats(s).pct < 70 || quizAvg(s) < 60;
}

async function importApdmFile(file) {
  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    if (!rows.length) throw new Error("Fail kosong");
    const header = rows[0].map(h => String(h).trim().toLowerCase());
    const idxNama = header.findIndex(h => h.includes("nama") || h.includes("name"));
    const idxKelas = header.findIndex(h => h.includes("kelas") || h.includes("class") || h.includes("tingkatan"));
    const idxJantina = header.findIndex(h => h.includes("jantina") || h.includes("gender") || h.includes("jantina"));
    const idxKp = header.findIndex(h => h.includes("kp") || h.includes("ic") || h.includes("no kad"));
    if (idxNama === -1 || idxKelas === -1) throw new Error("Header mesti ada NAMA dan KELAS");
    const teacherId = getCurrentUser().uid;
    let count = 0, skip = 0;
    for (let i=1;i<rows.length;i++) {
      const r = rows[i];
      const nama = String(r[idxNama]||"").trim();
      const kelas = String(r[idxKelas]||"").trim();
      if (!nama || !kelas) continue;
      const ic = idxKp!==-1 ? String(r[idxKp]||"").trim() : "";
      if (ic && DATA.students.some(s => s.ic === ic)) { skip++; continue; }
      if (DATA.students.some(s => s.name.toLowerCase()===nama.toLowerCase() && s.class===kelas)) { skip++; continue; }
      const jantinaRaw = idxJantina!==-1 ? String(r[idxJantina]||"").trim().toUpperCase() : "";
      const gender = jantinaRaw.startsWith("L") || jantinaRaw==="LELAKI" ? "L" : "P";
      DATA.students.push({ id: uid("s"), name: nama, class: kelas, gender, currentLevel: 1, attendance: [], quizzes: [], vocabulary: [], teacherId, ic });
      count++;
    }
    await saveData(DATA);
    fillClassFilter();
    renderTable();
    sbmToast(count + " murid APDM diimport" + (skip? ", " + skip + " duplikat dilangkau":""));
  } catch (err) {
    console.error(err);
    alert("Gagal import APDM: " + err.message);
  }
}

function exportKpm() {
  const rows = [["Bil","Nama Murid","Kelas","Tahap","Tahap Nama","% Hadir","Purata Kuiz","Status","IC"]];
  DATA.students.forEach((s,i) => {
    const att = attendanceStats(s);
    const lv = levelIndex(DATA, s);
    const status = isLinus(s) ? "Perlu Intervensi" : (checkLevelUp(DATA,s) ? "Sedia Naik" : "OK");
    rows.push([i+1, s.name, s.class, s.currentLevel||1, DATA.meta.levels[lv].name, att.pct, quizAvg(s), status, s.ic||""]);
  });
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{wch:4},{wch:28},{wch:12},{wch:7},{wch:18},{wch:8},{wch:10},{wch:16},{wch:14}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "KPM");
  XLSX.writeFile(wb, `KPM_BijakMembaca_${DATA.meta.year||""}.xlsx`);
}

function exportPbd() {
  // DELIMa IDME PBD format: Nama, Kelas, Mata Pelajaran, TP
  const tpMap = lvl => "TP" + Math.min(lvl, 6);
  const rows = [["Nama Murid","Kelas","Mata Pelajaran","TP","Tahap Bacaan","Tarikh"]];
  const today = new Date().toISOString().slice(0,10);
  DATA.students.forEach(s => {
    const lv = s.currentLevel||1;
    rows.push([s.name, s.class, "Bahasa Melayu - Membaca", tpMap(lv), DATA.meta.levels[levelIndex(DATA,s)].name, today]);
  });
  // Use PapaParse for CSV or XLSX for xlsx
  if (typeof Papa !== "undefined") {
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `PBD_BijakMembaca_${DATA.meta.year||""}.csv`;
    document.body.appendChild(a); a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),500);
  } else {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PBD");
    XLSX.writeFile(wb, `PBD_BijakMembaca_${DATA.meta.year||""}.xlsx`);
  }
}

function posterKelasA3() {
  const cls = filterClass || "Semua Kelas";
  const list = filterClass ? DATA.students.filter(s=>s.class===filterClass) : DATA.students;
  if (!list.length) { sbmToast("Tiada murid untuk poster"); return; }
  const html = `<!DOCTYPE html><html lang="ms"><head><meta charset="UTF-8"><title>Poster ${esc(cls)}</title><style>
    @page{size:A3 landscape;margin:12mm} *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:"Plus Jakarta Sans",Arial,sans-serif;padding:10mm}
    h1{font-size:22px;text-align:center;margin-bottom:4px}
    .sub{text-align:center;color:#64748b;font-size:12px;margin-bottom:12px}
    .grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
    .card{border:1px solid #e2e8f0;border-radius:10px;padding:10px;text-align:center;break-inside:avoid}
    .avatar{width:48px;height:48px;border-radius:50%;background:#0e7490;color:#fff;display:inline-grid;place-items:center;font-weight:800;margin-bottom:6px}
    .name{font-weight:700;font-size:11px;line-height:1.2;min-height:26px}
    .cls{font-size:10px;color:#64748b}
    .pill{font-size:10px;background:#ecfeff;color:#155e75;padding:3px 7px;border-radius:99px;display:inline-block;margin:4px 0}
    .bar{height:6px;background:#e2e8f0;border-radius:99px;overflow:hidden;margin-top:4px}
    .bar i{display:block;height:100%;background:linear-gradient(90deg,#0e7490,#22d3ee)}
    @media print{body{padding:0}}
  </style></head><body>
    <h1>${esc(DATA.meta.schoolName)} — ${esc(DATA.meta.programName)}</h1>
    <div class="sub">Kelas: ${esc(cls)} | Tahun ${esc(DATA.meta.year)} | ${list.length} murid | ${new Date().toLocaleDateString("ms-MY")}</div>
    <div class="grid">${list.map(s=>{ const lv=levelIndex(DATA,s); const att=attendanceStats(s); const initials=s.name.replace(/binti|bin/gi,"").trim().split(/\s+/).slice(0,2).map(w=>w[0]).join(""); return `<div class="card"><div class="avatar">${esc(initials.toUpperCase())}</div><div class="name">${esc(s.name)}</div><div class="cls">${esc(s.class)}</div><div class="pill">${esc(DATA.meta.levels[lv].short)} · ${esc(DATA.meta.levels[lv].name)}</div><div class="bar"><i style="width:${att.pct}%"></i></div><div style="font-size:9px;color:#64748b;margin-top:2px">${att.pct}% hadir</div></div>`;}).join("")}</div>
    <script>window.onload=()=>window.print()<\/script></body></html>`;
  const win=window.open("","_blank"); win.document.write(html); win.document.close();
}

async function openTransferModal() {
  if (selectedIds.size===0) { sbmToast("Pilih murid dahulu (tanda ✓)"); return; }
  if (!isSuperAdmin()) { sbmToast("Hanya superadmin boleh pindah guru"); return; }
  const teachers = await getAllTeachers();
  const sel=document.getElementById("transferTeacher");
  sel.innerHTML = teachers.map(t=>`<option value="${esc(t.id)}">${esc(t.email||t.id.slice(0,8))} — ${t.students} murid</option>`).join("");
  document.getElementById("transferCount").textContent = selectedIds.size;
  document.getElementById("transferModalBg").classList.add("open");
}

async function confirmTransfer() {
  const tid=document.getElementById("transferTeacher").value;
  if (!tid) return;
  if (!confirm("Pindah " + selectedIds.size + " murid ke guru terpilih?")) return;
  let moved=0;
  DATA.students.forEach(s=>{ if(selectedIds.has(s.id)){ s.teacherId=tid; moved++; }});
  selectedIds.clear();
  await saveData(DATA);
  // Also need to ensure destination teacher doc exists, saveData as superadmin already writes to each teacher doc via saveAllTeachersData, so moved students will be written to correct doc
  document.getElementById("transferModalBg").classList.remove("open");
  renderTable();
  sbmToast(moved + " murid dipindah");
}

function renderOnboarding() {
  const card=document.getElementById("onboardingCard");
  if (!card || !DATA) return;
  const doneImport = DATA.students.length>0;
  const doneLevel = DATA.meta.levels.some(l=>l.material);
  const doneShare = DATA.students.some(s=>s.attendance && s.attendance.length>0);
  const allDone = doneImport && doneLevel && doneShare;
  if (allDone && localStorage.getItem("sbm_onboard_done")==="1") { card.style.display="none"; return; }
  card.style.display="block";
  card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
    <div>
      <h3 style="font-size:15px;margin-bottom:4px">👋 Selamat datang, Cikgu!</h3>
      <p style="font-size:13px;color:var(--muted)">3 langkah mula:</p>
      <ol style="font-size:13px;margin:8px 0 0 18px;line-height:1.7">
        <li>${doneImport ? "✅" : "⬜"} Import murid (APDM/CSV) — ${DATA.students.length} murid</li>
        <li>${doneLevel ? "✅" : "⬜"} Isi link bahan per tahap di Tetapan Program</li>
        <li>${doneShare ? "✅" : "⬜"} Kongsi QR/WhatsApp ke ibu bapa</li>
      </ol>
    </div>
    <div style="display:flex;gap:8px;align-items:center">
      <button class="btn ghost sm" id="onboardClose">Tutup</button>
      ${!allDone ? `<span style="font-size:12px;color:var(--muted)">${[doneImport,doneLevel,doneShare].filter(Boolean).length}/3 siap</span>` : `<span style="font-size:12px;color:var(--good);font-weight:700">Sedia!</span>`}
    </div>
  </div>`;
  card.querySelector("#onboardClose")?.addEventListener("click", ()=>{ localStorage.setItem("sbm_onboard_done","1"); card.style.display="none"; });
}

async function init(user) {
  DATA = await loadData();
  document.getElementById("adminMain").style.display = "block";
  const nameEl = document.getElementById("userName");
  if (nameEl && user) {
    const name = user.displayName || user.email || "Guru";
    const initial = name.trim().charAt(0).toUpperCase();
    nameEl.innerHTML = `<span style="width:22px;height:22px;border-radius:50%;background:#fff;color:var(--primary-dark);display:grid;place-items:center;font-size:11px;font-weight:800;flex:0 0 auto">${esc(initial)}</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:110px">${esc(name)}</span>`;
  }
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
  const tBtn=document.getElementById("transferBtn");
  if (tBtn) tBtn.style.display = isSuperAdmin(user) ? "" : "none";
  renderOnboarding();
  if (isSuperAdmin(user)) renderTeacherPanel();
}

async function renderTeacherPanel() {
  let wrap = document.getElementById("teacherPanel");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "teacherPanel";
    const anchor = document.getElementById("tableWrap");
    anchor.after(wrap);
  }
  wrap.innerHTML = `<div class="card"><p style="color:var(--muted)">Memuatkan senarai guru…</p></div>`;
  try {
    const teachers = await getAllTeachers();
    wrap.innerHTML = `
      <h2 class="sec">👑 Urus Guru (${teachers.length})</h2>
      <div class="card" style="padding:0;overflow-x:auto">
        <table class="tbl">
          <thead>
            <tr><th>Guru</th><th>Sekolah</th><th>Murid</th><th class="no-print"></th></tr>
          </thead>
          <tbody>
            ${teachers.length ? teachers.map(t => `
              <tr>
                <td style="font-weight:700">${esc(t.email || ("ID: " + t.id.slice(0, 8) + "…"))}<br><small style="color:var(--muted);font-weight:500">${esc(t.id)}</small></td>
                <td>${esc(t.schoolName)}</td>
                <td>${t.students}</td>
                <td class="actions no-print">
                  ${t.email ? `<button class="btn sm ghost resetPwBtn" data-email="${esc(t.email)}" title="Hantar emel reset kata laluan">✉️ Reset</button>` : ""}
                  <button class="btn sm danger delTeacherBtn" data-id="${esc(t.id)}" title="Padam SEMUA data murid guru ini">Padam data</button>
                </td>
              </tr>`).join("") : `<tr><td colspan="4" style="text-align:center;color:var(--muted)">Tiada guru lagi.</td></tr>`}
          </tbody>
        </table>
      </div>
      <p style="font-size:12px;color:var(--muted);margin-top:8px">Reset menghantar emel reset kata laluan Firebase ke guru. Akaun log masuk guru diurus dalam Firebase Console → Authentication.</p>`;

    wrap.querySelectorAll(".resetPwBtn").forEach(b => b.addEventListener("click", async () => {
      const email = b.dataset.email;
      if (!confirm("Hantar emel reset kata laluan ke " + email + "?")) return;
      try {
        await sendTeacherPasswordReset(email);
        sbmToast("Emel reset dihantar ke " + email);
      } catch (err) {
        console.error(err);
        alert("Gagal hantar emel reset: " + err.message);
      }
    }));

    wrap.querySelectorAll(".delTeacherBtn").forEach(b => b.addEventListener("click", async () => {
      const tid = b.dataset.id;
      if (!confirm("PADAM semua data murid guru ini? Tindakan tidak boleh dibatalkan.")) return;
      if (!confirm("Sahkan sekali lagi: padam data guru " + tid + "? Termasuk akaun log masuk jika Cloud Function aktif.")) return;
      const useFunction = confirm("Padam juga akaun log masuk guru? OK = ya (perlukan Cloud Function), Cancel = data sahaja.");
      try {
        if (useFunction) {
          try {
            const { getFunctions, httpsCallable } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js");
            const functions = getFunctions((await import('./data.js')).db.app || undefined);
            // Fallback to default app
            const callable = httpsCallable(getFunctions(), "deleteTeacher");
            await callable({ teacherId: tid });
            sbmToast("Akaun & data guru dipadam (Cloud Function).");
          } catch (err) {
            console.warn("Cloud Function deleteTeacher tidak tersedia, padam data sahaja:", err);
            await deleteTeacherData(tid);
            sbmToast("Data dipadam. Padam akaun di Firebase Console → Authentication.");
          }
        } else {
          await deleteTeacherData(tid);
          sbmToast("Data guru dipadam.");
        }
        DATA = await loadData();
        fillClassFilter();
        renderTable();
        renderTeacherPanel();
      } catch (err) {
        console.error(err);
        alert("Gagal padam: " + err.message);
      }
    }));
  } catch (err) {
    console.error(err);
    wrap.innerHTML = `<div class="card"><p style="color:var(--bad)">Gagal muat senarai guru: ${esc(err.message)}</p></div>`;
  }
}

onAuthChange((user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  init(user);
});