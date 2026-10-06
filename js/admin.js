import { loadData, saveData, sbmToast, downloadJSON, classesOf, attendanceStats, levelIndex, quizAvg, checkLevelUp, esc, fmtDate, uid, defaultData, getCurrentUser, onAuthChange, isSuperAdmin, getAllTeachers, deleteTeacherData, sendTeacherPasswordReset, logoutUser, db } from './data.js';
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ICONS, avatar, levelPill, levelHue, meterClass, greeting, todayISO, hydrateIcons } from './ui.js';

let DATA = null;
let filterClass = "";
let filterText = "";
let sortBy = "name";
let selectedIds = new Set();
let selectMode = false;
let editing = null;
let editTab = "profil";
let pendingPhoto = null;
let wired = false;

// Global logout - works even before wireAdmin / even if init fails
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-logout]");
  if (!btn) return;
  e.preventDefault();
  if (!confirm("Log keluar dari Panel Guru?")) return;
  try { await logoutUser(); } catch (err) { console.error(err); }
  window.location.href = "index.html";
});

function shareUrlFor(s) {
  return `${location.origin}${location.pathname.replace(/admin(\.html)?$/, "")}parent.html?student=${encodeURIComponent(s.id)}`;
}
function shareTextFor(s) {
  const lv = levelIndex(DATA, s);
  return `📚 *Laporan Kemajuan ${s.name}*\n` +
    `Kelas: ${s.class}\n` +
    `Tahap: ${DATA.meta.levels[lv].name}\n` +
    `Kehadiran: ${attendanceStats(s).pct}%\n` +
    `Purata Kuiz: ${quizAvg(s)}/100\n\n` +
    `Lihat penuh: ${shareUrlFor(s)}\n` +
    `_${DATA.meta.programName} - ${DATA.meta.schoolName}_`;
}

async function persist(msg) {
  await saveData(DATA);
  if (msg) sbmToast(msg);
}

/* ---------------- views (Murid / Tetapan) ---------------- */

function setView(v) {
  const isSet = v === "tetapan";
  document.getElementById("viewMurid").classList.toggle("hidden", isSet);
  document.getElementById("viewTetapan").classList.toggle("hidden", !isSet);
  document.getElementById("addStudentBtn").classList.toggle("hidden", isSet);
  document.querySelectorAll(".tabbar [data-view]").forEach(t => t.classList.toggle("on", t.dataset.view === v));
  if (isSet && selectMode) toggleSelectMode(false);
  history.replaceState(null, "", isSet ? "#tetapan" : location.pathname + location.search);
  window.scrollTo({ top: 0 });
}

/* ---------------- student editor (bottom sheet) ---------------- */

function renderEditForm() {
  const s = editing;
  const isNew = !DATA.students.some(x => x.id === s.id);
  const levelUp = checkLevelUp(DATA, s);
  const classes = classesOf(DATA);
  const photoSrc = pendingPhoto || s.photo;
  const tabs = [["profil", "Profil"], ["hadir", "Kehadiran"], ["kuiz", "Kuiz"], ["kata", "Kosa Kata"]];
  document.getElementById("deleteStudentBtn").classList.toggle("hidden", isNew);
  document.getElementById("printReportBtn").classList.toggle("hidden", isNew);

  document.getElementById("editBody").innerHTML = `
    <div class="seg" role="tablist">
      ${tabs.map(([k, l]) => `<button type="button" data-tab="${k}" class="${editTab === k ? "on" : ""}">${l}</button>`).join("")}
    </div>

    <div class="seg-pane ${editTab === "profil" ? "on" : ""}" data-pane="profil">
      <div class="photo-pick">
        <div id="photoPreview">${avatar({ name: s.name || "?", photo: photoSrc }, "xl")}</div>
        <div>
          <label class="btn soft sm" for="inPhoto">📷 ${photoSrc ? "Tukar gambar" : "Tambah gambar"}</label>
          <input type="file" id="inPhoto" accept="image/*" hidden>
          ${photoSrc ? `<button type="button" class="btn ghost sm" id="rmPhoto" style="margin-left:6px">Buang</button>` : ""}
          <p class="muted" style="font-size:12px;margin-top:6px;font-weight:600">Gambar dikecilkan secara automatik.</p>
        </div>
      </div>
      <div class="form-grid" style="margin-top:16px">
        <div class="field full">
          <label for="inName">Nama penuh</label>
          <input type="text" id="inName" value="${esc(s.name)}" autocomplete="off" autocapitalize="words" placeholder="cth: Aisyah binti Ahmad">
        </div>
        <div class="field">
          <label for="inClass">Kelas</label>
          <input type="text" id="inClass" value="${esc(s.class)}" list="classList" autocomplete="off" placeholder="cth: 1 Arif">
          <datalist id="classList">${classes.map(c => `<option value="${esc(c)}">`).join("")}</datalist>
        </div>
        <div class="field">
          <label for="inGender">Jantina</label>
          <select id="inGender">
            <option value="P" ${s.gender === "P" ? "selected" : ""}>Perempuan</option>
            <option value="L" ${s.gender === "L" ? "selected" : ""}>Lelaki</option>
          </select>
        </div>
        <div class="field full">
          <label for="inLevel">Tahap semasa</label>
          <select id="inLevel">
            ${DATA.meta.levels.map((l, i) => `<option value="${i + 1}" ${(s.currentLevel || 1) === i + 1 ? "selected" : ""}>Tahap ${i + 1} — ${esc(l.name)}</option>`).join("")}
          </select>
        </div>
      </div>
      ${levelUp ? `<div class="banner"><span class="emo">🎓</span><div><b>Sedia naik ke Tahap ${levelUp.nextLevel}</b><small>${esc(levelUp.reason)}</small></div></div>` : ""}
    </div>

    <div class="seg-pane ${editTab === "hadir" ? "on" : ""}" data-pane="hadir">
      <div class="stack">
        <div class="row-input">
          <input type="date" id="attDate" value="${todayISO()}" style="flex:1">
          <div class="toggle2" id="attStatus" data-val="h">
            <button type="button" data-v="h" class="on-h">Hadir</button>
            <button type="button" data-v="a">Tiada</button>
          </div>
        </div>
        <div class="row-input">
          <button type="button" class="btn" id="addAttBtn" style="flex:1">Tambah rekod</button>
          <button type="button" class="btn soft" id="markAllPresentBtn" style="flex:1">✓ Seluruh kelas hadir</button>
        </div>
      </div>
      <div id="attList" style="margin-top:12px"></div>
    </div>

    <div class="seg-pane ${editTab === "kuiz" ? "on" : ""}" data-pane="kuiz">
      <div class="stack">
        <input type="text" id="qzTitle" placeholder="Tajuk kuiz (cth: Kuiz Suku Kata)" autocomplete="off">
        <div class="row-input">
          <input type="date" id="qzDate" value="${todayISO()}" style="flex:1.4">
          <input type="number" id="qzScore" min="0" max="100" inputmode="numeric" placeholder="Markah" style="flex:1">
        </div>
        <button type="button" class="btn" id="addQzBtn">Tambah kuiz</button>
      </div>
      <div id="quizList" style="margin-top:12px"></div>
    </div>

    <div class="seg-pane ${editTab === "kata" ? "on" : ""}" data-pane="kata">
      <div class="row-input">
        <input type="text" id="vocabWord" placeholder="Perkataan baru" autocomplete="off" autocapitalize="none" enterkeyhint="done" style="flex:1">
        <button type="button" class="btn" id="addVocabBtn">Tambah</button>
      </div>
      <div id="vocabTags" class="tags" style="margin-top:14px"></div>
    </div>`;

  renderAttList();
  renderQuizList();
  renderVocabTags();
}

function sortedWithIndex(arr) {
  return (arr || []).map((x, i) => ({ x, i })).sort((a, b) => (a.x.d < b.x.d ? 1 : -1));
}

function renderAttList() {
  const el = document.getElementById("attList");
  if (!el) return;
  const list = sortedWithIndex(editing.attendance);
  const st = attendanceStats(editing);
  el.innerHTML = list.length ? `
    <p class="muted" style="font-size:12.5px;font-weight:700;margin-bottom:4px">${st.hadir} hadir · ${st.absent} tiada · ${st.pct}%</p>
    ${list.map(({ x, i }) => `
      <div class="list-row">
        <div class="grow"><b>${esc(fmtDate(x.d))}</b></div>
        <div class="toggle2 att-toggle" data-i="${i}">
          <button type="button" data-v="h" class="${x.s === "h" ? "on-h" : ""}">Hadir</button>
          <button type="button" data-v="a" class="${x.s === "a" ? "on-a" : ""}">Tiada</button>
        </div>
        <button type="button" class="del-btn att-del" data-i="${i}" aria-label="Padam">${ICONS.trash}</button>
      </div>`).join("")}`
    : '<p class="empty" style="padding:20px 0">Tiada sesi dicatat lagi.</p>';
}

function renderQuizList() {
  const el = document.getElementById("quizList");
  if (!el) return;
  const list = sortedWithIndex(editing.quizzes);
  el.innerHTML = list.length ? list.map(({ x, i }) => `
    <div class="list-row">
      <div class="grow"><b>${esc(x.t)}</b><small>${esc(fmtDate(x.d))}</small></div>
      <span class="badge ${x.s >= 75 ? "good" : x.s >= 50 ? "warn" : "bad"}" style="font-size:13px">${x.s}/100</span>
      <button type="button" class="del-btn qz-del" data-i="${i}" aria-label="Padam">${ICONS.trash}</button>
    </div>`).join("") : '<p class="empty" style="padding:20px 0">Tiada kuiz dicatat lagi.</p>';
}

function renderVocabTags() {
  const el = document.getElementById("vocabTags");
  if (!el) return;
  const list = editing.vocabulary || [];
  el.innerHTML = list.length ? list.map((w, i) => `
    <span class="word">${esc(w)}<button type="button" class="vocab-del" data-i="${i}" aria-label="Buang ${esc(w)}">×</button></span>`).join("")
    : '<p class="muted" style="font-size:13px">Tiada perkataan dicatat.</p>';
}

function addAttendance() {
  const d = document.getElementById("attDate").value;
  const st = document.getElementById("attStatus").dataset.val || "h";
  if (!d) return;
  editing.attendance = editing.attendance || [];
  const ex = editing.attendance.find(a => a.d === d);
  if (ex) ex.s = st; else editing.attendance.push({ d, s: st });
  renderAttList();
}

function markClassPresent() {
  const d = document.getElementById("attDate").value;
  const cls = (document.getElementById("inClass")?.value || editing.class || "").trim();
  if (!d || !cls) return;
  if (!confirm(`Tandakan semua murid kelas ${cls} hadir pada ${fmtDate(d)}?`)) return;
  DATA.students.filter(s => s.class === cls).forEach(s => {
    s.attendance = s.attendance || [];
    if (!s.attendance.some(a => a.d === d)) s.attendance.push({ d, s: "h" });
  });
  editing.attendance = editing.attendance || [];
  if (!editing.attendance.some(a => a.d === d)) editing.attendance.push({ d, s: "h" });
  persist("Kehadiran dikemaskini untuk kelas " + cls);
  renderAttList();
  renderTable();
}

function addQuiz() {
  const d = document.getElementById("qzDate").value;
  const t = document.getElementById("qzTitle").value.trim();
  const sc = parseInt(document.getElementById("qzScore").value, 10);
  if (!d || !t || isNaN(sc)) { sbmToast("Isi tajuk, tarikh dan markah kuiz"); return; }
  editing.quizzes = editing.quizzes || [];
  editing.quizzes.push({ d, t, s: Math.max(0, Math.min(100, sc)) });
  renderQuizList();
  document.getElementById("qzTitle").value = "";
  document.getElementById("qzScore").value = "";
}

function addVocab() {
  const inp = document.getElementById("vocabWord");
  const words = inp.value.split(/[,\n]/).map(w => w.trim().toLowerCase()).filter(Boolean);
  if (!words.length) return;
  editing.vocabulary = editing.vocabulary || [];
  words.forEach(w => { if (!editing.vocabulary.includes(w)) editing.vocabulary.push(w); });
  renderVocabTags();
  inp.value = "";
  inp.focus();
}

// Shrink phone photos (often 2–5 MB) to a small JPEG so they fit in Firestore.
function compressImage(file, max = 360, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Gambar tidak dapat dibaca")); };
    img.src = url;
  });
}

// Wired ONCE (event delegation) — avoids duplicate listeners each time the sheet opens
function bindEditorEvents() {
  const body = document.getElementById("editBody");
  body.addEventListener("click", e => {
    const t = e.target;
    const tab = t.closest(".seg button[data-tab]");
    if (tab) {
      editTab = tab.dataset.tab;
      body.querySelectorAll(".seg button").forEach(b => b.classList.toggle("on", b === tab));
      body.querySelectorAll(".seg-pane").forEach(p => p.classList.toggle("on", p.dataset.pane === editTab));
      return;
    }
    const stBtn = t.closest("#attStatus button");
    if (stBtn) {
      const box = stBtn.parentElement;
      box.dataset.val = stBtn.dataset.v;
      box.querySelectorAll("button").forEach(b => b.className = b === stBtn ? (b.dataset.v === "h" ? "on-h" : "on-a") : "");
      return;
    }
    const tg = t.closest(".att-toggle button");
    if (tg) {
      const i = +tg.parentElement.dataset.i;
      if (editing.attendance[i]) editing.attendance[i].s = tg.dataset.v;
      renderAttList();
      return;
    }
    const attDel = t.closest(".att-del");
    if (attDel) { editing.attendance.splice(+attDel.dataset.i, 1); renderAttList(); return; }
    const qzDel = t.closest(".qz-del");
    if (qzDel) { editing.quizzes.splice(+qzDel.dataset.i, 1); renderQuizList(); return; }
    const vDel = t.closest(".vocab-del");
    if (vDel) { editing.vocabulary.splice(+vDel.dataset.i, 1); renderVocabTags(); return; }
    if (t.closest("#addAttBtn")) return addAttendance();
    if (t.closest("#markAllPresentBtn")) return markClassPresent();
    if (t.closest("#addQzBtn")) return addQuiz();
    if (t.closest("#addVocabBtn")) return addVocab();
    if (t.closest("#rmPhoto")) {
      pendingPhoto = null; editing.photo = ""; editing._photoRemoved = true;
      captureProfileFields();
      renderEditForm();
    }
  });
  body.addEventListener("keydown", e => {
    if (e.key === "Enter" && e.target.id === "vocabWord") { e.preventDefault(); addVocab(); }
  });
  body.addEventListener("change", async e => {
    if (e.target.id !== "inPhoto") return;
    const f = e.target.files[0];
    if (!f) return;
    try {
      pendingPhoto = await compressImage(f);
      document.getElementById("photoPreview").innerHTML = avatar({ name: editing.name, photo: pendingPhoto }, "xl");
    } catch (err) {
      alert(err.message);
    }
  });
}

// Keep typed profile values when the form re-renders
function captureProfileFields() {
  const n = document.getElementById("inName");
  if (!n) return;
  editing.name = n.value;
  editing.class = document.getElementById("inClass").value;
  editing.gender = document.getElementById("inGender").value;
  editing.currentLevel = parseInt(document.getElementById("inLevel").value, 10) || 1;
}

/* ---------------- student list (cards) ---------------- */

function renderChips() {
  const box = document.getElementById("classChips");
  if (!box) return;
  const classes = classesOf(DATA);
  const count = c => DATA.students.filter(s => s.class === c).length;
  box.innerHTML = classes.length ? [
    `<button class="chip ${!filterClass ? "on" : ""}" data-cls="">Semua<span class="n">${DATA.students.length}</span></button>`,
    ...classes.map(c => `<button class="chip ${filterClass === c ? "on" : ""}" data-cls="${esc(c)}">${esc(c)}<span class="n">${count(c)}</span></button>`)
  ].join("") : "";
}

function renderHeroAdmin() {
  const el = document.getElementById("adminHero");
  if (!el) return;
  const u = getCurrentUser();
  const first = u ? ((u.displayName || "").trim().split(/\s+/)[0] || "Cikgu") : "Cikgu";
  const total = DATA.students.length;
  const today = todayISO();
  const markedToday = DATA.students.filter(s => (s.attendance || []).some(a => a.d === today)).length;
  const ready = DATA.students.filter(s => checkLevelUp(DATA, s)).length;
  const linus = DATA.students.filter(isLinus).length;
  el.innerHTML = `
    <div class="eyebrow">${greeting()}, ${esc(first)}</div>
    <h1>Murid anda</h1>
    <div class="chips-glass">
      <span>👩‍🎓 ${total} murid</span>
      <span>🗓️ ${markedToday}/${total} direkod hari ini</span>
      ${ready ? `<span>🎓 ${ready} sedia naik tahap</span>` : ""}
      ${linus ? `<span>⚠️ ${linus} perlu intervensi</span>` : ""}
    </div>`;
}

function renderTable() {
  renderChips();
  renderHeroAdmin();
  const wrap = document.getElementById("tableWrap");
  let list = DATA.students.filter(s => !filterClass || s.class === filterClass);
  const q = filterText.trim().toLowerCase();
  if (q) list = list.filter(s => s.name.toLowerCase().includes(q) || s.class.toLowerCase().includes(q));
  if (sortBy === "name") list.sort((a, b) => a.name.localeCompare(b.name));
  else if (sortBy === "level") list.sort((a, b) => (b.currentLevel || 1) - (a.currentLevel || 1));
  else if (sortBy === "att") list.sort((a, b) => attendanceStats(b).pct - attendanceStats(a).pct);
  wrap.classList.toggle("select-mode", selectMode);
  updateSelectBar();
  if (!list.length) {
    wrap.innerHTML = DATA.students.length
      ? `<div class="card empty"><div class="big">🔍</div>Tiada murid sepadan dengan carian.</div>`
      : `<div class="card empty"><div class="big">🌱</div>Belum ada murid.<br>Tekan butang <b>+</b> untuk menambah, atau import senarai APDM di <b>Tetapan</b>.</div>`;
    return;
  }
  wrap.innerHTML = `<div class="students">${list.map(s => {
    const att = attendanceStats(s);
    const lv = levelIndex(DATA, s);
    const sel = selectedIds.has(s.id);
    const lu = checkLevelUp(DATA, s);
    return `
      <div class="scard ${sel ? "selected" : ""}" data-id="${esc(s.id)}" role="button" tabindex="0">
        <input type="checkbox" class="check rowCheck" data-id="${esc(s.id)}" ${sel ? "checked" : ""} aria-label="Pilih ${esc(s.name)}">
        ${avatar(s)}
        <div class="body">
          <div class="nm">${esc(s.name)}</div>
          <div class="sub">
            ${levelPill(DATA, lv)}
            ${!filterClass ? `<span class="muted" style="font-size:12px;font-weight:700">${esc(s.class)}</span>` : ""}
            ${isLinus(s) ? `<span class="badge bad">⚠️ Intervensi</span>` : ""}
            ${lu ? `<span class="badge good" title="${esc(lu.reason)}">🎓 Sedia naik</span>` : ""}
          </div>
          <div class="meta">
            <span>Hadir ${att.pct}%</span>
            <div class="meter ${meterClass(att.pct)}"><i style="width:${att.pct}%"></i></div>
            <span>${att.hadir}/${att.total}</span>
          </div>
        </div>
        <button class="share-btn shareBtn" data-id="${esc(s.id)}" aria-label="Kongsi laporan ${esc(s.name)}">${ICONS.share}</button>
      </div>`;
  }).join("")}</div>`;
}

function updateSelectBar() {
  const bar = document.getElementById("selectBar");
  if (!bar) return;
  bar.classList.toggle("hidden", !selectMode);
  document.getElementById("selCount").textContent = selectedIds.size + " dipilih";
  const bulkBtn = document.getElementById("bulkPromoteBtn");
  if (bulkBtn) bulkBtn.disabled = selectedIds.size === 0;
  document.getElementById("selectModeBtn")?.classList.toggle("on", selectMode);
}

function toggleSelectMode(on) {
  selectMode = typeof on === "boolean" ? on : !selectMode;
  if (!selectMode) selectedIds.clear();
  document.getElementById("addStudentBtn").classList.toggle("hidden", selectMode);
  renderTable();
}

function openQrModal(s) {
  const url = shareUrlFor(s);
  const text = shareTextFor(s);
  const qrEl = document.getElementById("qrCode");
  qrEl.innerHTML = "";
  // eslint-disable-next-line no-undef
  if (typeof QRCode !== "undefined") {
    new QRCode(qrEl, { text: url, width: 190, height: 190, correctLevel: QRCode.CorrectLevel.M });
  } else {
    qrEl.textContent = url;
  }
  document.getElementById("qrName").innerHTML = `${avatar(s)}<div style="text-align:left;min-width:0"><b style="display:block">${esc(s.name)}</b><small class="muted" style="font-weight:600">${esc(s.class)}</small></div>`;
  document.getElementById("qrUrl").textContent = url;
  document.getElementById("qrWaBtn").onclick = () => window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
  document.getElementById("qrCopyBtn").onclick = () => navigator.clipboard.writeText(url).then(() => sbmToast("Pautan disalin ✓")).catch(() => prompt("Salin pautan:", url));
  const nat = document.getElementById("qrShareBtn");
  nat.classList.toggle("hidden", !navigator.share);
  nat.onclick = () => navigator.share({ title: "Laporan " + s.name, text: text.replace(/\*|_/g, ""), url }).catch(() => {});
  document.getElementById("qrModalBg").classList.add("open");
}

/* ---------------- quick attendance (whole class) ---------------- */

let qaClass = "";
let qaState = {};

function openAttendance() {
  const classes = classesOf(DATA);
  if (!classes.length) { sbmToast("Tambah murid dahulu"); return; }
  qaClass = filterClass || qaClass || classes[0];
  document.getElementById("qaDate").value = todayISO();
  loadQaState();
  renderAttendance();
  document.getElementById("attendModalBg").classList.add("open");
}

function loadQaState() {
  const d = document.getElementById("qaDate").value;
  qaState = {};
  DATA.students.filter(s => s.class === qaClass).forEach(s => {
    const rec = (s.attendance || []).find(a => a.d === d);
    qaState[s.id] = rec ? rec.s : "";
  });
}

function renderAttendance() {
  const classes = classesOf(DATA);
  document.getElementById("qaChips").innerHTML = classes.map(c =>
    `<button class="chip ${c === qaClass ? "on" : ""}" data-cls="${esc(c)}">${esc(c)}</button>`).join("");
  const list = DATA.students.filter(s => s.class === qaClass).sort((a, b) => a.name.localeCompare(b.name));
  const vals = Object.values(qaState);
  const h = vals.filter(v => v === "h").length, a = vals.filter(v => v === "a").length;
  document.getElementById("qaSummary").textContent = `${h} hadir · ${a} tiada · ${list.length - h - a} belum`;
  document.getElementById("qaList").innerHTML = list.map(s => `
    <div class="list-row">
      ${avatar(s)}
      <div class="grow"><b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.name)}</b></div>
      <div class="toggle2 qa-toggle" data-id="${esc(s.id)}">
        <button type="button" data-v="h" class="${qaState[s.id] === "h" ? "on-h" : ""}">Hadir</button>
        <button type="button" data-v="a" class="${qaState[s.id] === "a" ? "on-a" : ""}">Tiada</button>
      </div>
    </div>`).join("");
}

async function saveAttendance() {
  const d = document.getElementById("qaDate").value;
  if (!d) return;
  let n = 0;
  DATA.students.forEach(s => {
    const v = qaState[s.id];
    if (!v) return;
    s.attendance = s.attendance || [];
    const ex = s.attendance.find(a => a.d === d);
    if (ex) ex.s = v; else s.attendance.push({ d, s: v });
    n++;
  });
  if (!n) { sbmToast("Tiada rekod untuk disimpan"); return; }
  document.getElementById("attendModalBg").classList.remove("open");
  renderTable();
  await persist(`Kehadiran ${n} murid disimpan ✓`);
}

function wireAttendance() {
  document.getElementById("qaChips").addEventListener("click", e => {
    const c = e.target.closest(".chip"); if (!c) return;
    qaClass = c.dataset.cls; loadQaState(); renderAttendance();
  });
  document.getElementById("qaDate").addEventListener("change", () => { loadQaState(); renderAttendance(); });
  document.getElementById("qaList").addEventListener("click", e => {
    const b = e.target.closest(".qa-toggle button"); if (!b) return;
    const id = b.parentElement.dataset.id;
    qaState[id] = qaState[id] === b.dataset.v ? "" : b.dataset.v;
    renderAttendance();
  });
  document.getElementById("qaAllBtn").addEventListener("click", () => {
    Object.keys(qaState).forEach(k => qaState[k] = "h"); renderAttendance();
  });
  document.getElementById("qaSaveBtn").addEventListener("click", saveAttendance);
}

/* ---------------- editor open / save ---------------- */

function openEditor(id) {
  editing = DATA.students.find(s => s.id === id);
  if (!editing) return;
  editing = JSON.parse(JSON.stringify(editing)); // edit a copy; commit on Simpan
  pendingPhoto = null;
  editTab = "profil";
  document.getElementById("editTitle").textContent = editing.name;
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
  pendingPhoto = null;
  editTab = "profil";
  document.getElementById("editTitle").textContent = "Murid baru";
  renderEditForm();
  document.getElementById("editModalBg").classList.add("open");
  setTimeout(() => document.getElementById("inName")?.focus(), 350);
}

function saveEditing() {
  captureProfileFields();
  editing.name = editing.name.trim();
  editing.class = editing.class.trim();
  if (!editing.name || !editing.class) {
    editTab = "profil";
    renderEditForm();
    sbmToast("Sila isi nama dan kelas murid");
    return;
  }
  if (pendingPhoto) editing.photo = pendingPhoto;
  delete editing._photoRemoved;
  const existing = DATA.students.find(s => s.id === editing.id);
  if (existing) Object.assign(existing, editing);
  else DATA.students.push(editing);
  const name = editing.name;
  closeEditor();
  fillClassFilter();
  renderTable();
  persist((existing ? "Disimpan: " : "Murid ditambah: ") + name + " ✓");
}

function closeEditor() {
  document.getElementById("editModalBg").classList.remove("open");
  editing = null;
  pendingPhoto = null;
}

function deleteEditing() {
  if (!editing) return;
  if (!confirm(`Padam ${editing.name}? Semua rekod murid ini akan hilang.`)) return;
  DATA.students = DATA.students.filter(s => s.id !== editing.id);
  closeEditor();
  fillClassFilter();
  renderTable();
  persist("Murid dipadam");
}

/* ---------------- settings ---------------- */

function renderSettings() {
  document.getElementById("setSchool").value = DATA.meta.schoolName;
  document.getElementById("setProgram").value = DATA.meta.programName;
  document.getElementById("setYear").value = DATA.meta.year;
  const total = DATA.meta.levels.length;
  document.getElementById("levelInputs").innerHTML = DATA.meta.levels.map((l, i) => `
    <div class="level-edit">
      <div class="lh"><span class="lvpill" style="--h:${levelHue(i, total)}"><i></i>L${i + 1}</span> Tahap ${i + 1}</div>
      <input type="text" value="${esc(l.name)}" data-level="${i}" placeholder="Nama tahap">
      <input type="url" value="${esc(l.material || "")}" data-material="${i}" placeholder="Pautan bahan (https://…)" inputmode="url" autocapitalize="none">
    </div>`).join("");
}

function saveSettings() {
  DOMLevelNames();
  syncLevelNames();
  DATA.meta.schoolName = document.getElementById("setSchool").value.trim() || DATA.meta.schoolName;
  DATA.meta.programName = document.getElementById("setProgram").value.trim() || DATA.meta.programName;
  DATA.meta.year = document.getElementById("setYear").value.trim() || DATA.meta.year;
  document.getElementById("programName").textContent = DATA.meta.programName;
  renderTable();
  renderOnboarding();
  persist("Tetapan disimpan ✓");
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
  DATA.meta.levels.forEach((l, i) => { l.short = "L" + (i + 1); });
}

function fillClassFilter() {
  const sel = document.getElementById("classFilter");
  const cur = sel.value;
  sel.innerHTML = `<option value="">Semua Kelas</option>`;
  classesOf(DATA).forEach(c => {
    const o = document.createElement("option");
    o.value = c; o.textContent = c;
    sel.appendChild(o);
  });
  sel.value = cur;
  if (sel.value !== cur) filterClass = "";
  renderChips();
}

/* ---------------- wiring ---------------- */

function wireAdmin() {
  if (wired) return;
  wired = true;
  const $ = id => document.getElementById(id);
  const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };

  on("classFilter", "change", e => { filterClass = e.target.value; renderTable(); });
  on("classChips", "click", e => {
    const chip = e.target.closest(".chip"); if (!chip) return;
    filterClass = chip.dataset.cls;
    $("classFilter").value = filterClass;
    renderTable();
  });
  let searchTimer;
  on("adminSearch", "input", e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { filterText = e.target.value; renderTable(); }, 200);
  });
  on("sortBy", "change", e => { sortBy = e.target.value; renderTable(); });
  on("selectModeBtn", "click", () => toggleSelectMode());
  on("selCancelBtn", "click", () => toggleSelectMode(false));

  on("tableWrap", "click", e => {
    const share = e.target.closest(".shareBtn");
    const card = e.target.closest(".scard");
    if (!card) return;
    const s = DATA.students.find(x => x.id === card.dataset.id);
    if (!s) return;
    if (share) { e.stopPropagation(); openQrModal(s); return; }
    if (selectMode) {
      if (selectedIds.has(s.id)) selectedIds.delete(s.id); else selectedIds.add(s.id);
      card.classList.toggle("selected", selectedIds.has(s.id));
      const cb = card.querySelector(".rowCheck"); if (cb) cb.checked = selectedIds.has(s.id);
      updateSelectBar();
      return;
    }
    openEditor(s.id);
  });

  // tab bar
  document.querySelectorAll(".tabbar [data-view]").forEach(t => t.addEventListener("click", e => { e.preventDefault(); setView(t.dataset.view); }));
  on("tabHadir", "click", e => { e.preventDefault(); openAttendance(); });
  on("quickAttBtn", "click", openAttendance);

  on("bulkPromoteBtn", "click", bulkPromote);
  on("promoteClassBtn", "click", promoteClass);
  on("archiveYearBtn", "click", archiveYear);
  on("posterBtn", "click", posterKelasA3);
  on("transferBtn", "click", openTransferModal);
  on("confirmTransferBtn", "click", confirmTransfer);
  on("importApdmBtn", "click", () => $("importApdmFile")?.click());
  on("importApdmFile", "change", async e => {
    const f = e.target.files[0]; if (!f) return;
    await importApdmFile(f);
    e.target.value = "";
  });
  on("exportKpmBtn", "click", exportKpm);
  on("exportPbdBtn", "click", exportPbd);
  on("addStudentBtn", "click", newStudent);
  on("saveStudentBtn", "click", saveEditing);
  on("deleteStudentBtn", "click", deleteEditing);
  bindEditorEvents();
  wireAttendance();

  document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => {
    const target = b.getAttribute("data-close");
    if (target === "qr") $("qrModalBg").classList.remove("open");
    else if (target === "transfer") $("transferModalBg").classList.remove("open");
    else if (target === "attend") $("attendModalBg").classList.remove("open");
    else closeEditor();
  }));
  ["qrModalBg", "transferModalBg", "attendModalBg"].forEach(id => on(id, "click", e => { if (e.target === e.currentTarget) e.currentTarget.classList.remove("open"); }));
  on("editModalBg", "click", e => { if (e.target === e.currentTarget) closeEditor(); });
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    document.querySelectorAll(".modal-bg.open").forEach(m => m.classList.remove("open"));
    editing = null;
  });

  on("exportBtn", "click", () => {
    saveData(DATA);
    downloadJSON(DATA, "students.json");
  });
  on("importBtn", "click", () => $("importFile").click());
  on("importFile", "change", async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const text = await f.text();
      const data = JSON.parse(text);
      if (!data || !Array.isArray(data.students)) throw new Error("format");
      if (!confirm(`Gantikan data semasa dengan ${data.students.length} murid dari fail ini?`)) { e.target.value = ""; return; }
      const teacherId = getCurrentUser ? getCurrentUser().uid : null;
      if (teacherId) data.students = data.students.map(s => ({ ...s, teacherId }));
      DATA = data;
      fillClassFilter();
      renderSettings();
      renderTable();
      await persist("Data berjaya dimuat naik ✓");
    } catch (err) {
      alert("Fail JSON tidak sah. Pastikan ia mengandungi data murid yang betul.");
    }
    e.target.value = "";
  });
  on("importCsvBtn", "click", () => $("importCsvFile").click());
  on("importCsvFile", "change", async e => {
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
      const imported = result.data.map(row => ({
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
      fillClassFilter();
      renderTable();
      await persist(`${imported.length} murid diimport dari CSV ✓`);
    } catch (err) {
      alert("Gagal import CSV: " + err.message);
    }
    e.target.value = "";
  });
  on("previewBtn", "click", () => {
    saveData(DATA);
    window.location.href = "index.html";
  });
  on("saveSettingsBtn", "click", saveSettings);
  on("resetBtn", "click", () => {
    if (!confirm("Ini akan mengosongkan SEMUA data murid anda. Teruskan?")) return;
    if (!confirm("Pasti? Tindakan ini tidak boleh dibatalkan.")) return;
    const d = defaultData();
    DATA.meta.schoolName = d.meta.schoolName;
    DATA.meta.programName = d.meta.programName;
    DATA.meta.year = d.meta.year;
    DATA.meta.levels = d.meta.levels.map(l => ({ ...l }));
    DATA.students = [];
    fillClassFilter();
    renderSettings();
    renderTable();
    persist("Data telah dikosongkan");
  });
  on("printReportBtn", "click", () => {
    if (!editing) return;
    captureProfileFields();
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
  const card = document.getElementById("onboardingCard");
  if (!card || !DATA) return;
  const doneImport = DATA.students.length > 0;
  const doneLevel = DATA.meta.levels.some(l => l.material);
  const doneShare = DATA.students.some(s => s.attendance && s.attendance.length > 0);
  const allDone = doneImport && doneLevel && doneShare;
  let dismissed = false;
  try { dismissed = localStorage.getItem("sbm_onboard_done") === "1"; } catch (e) {}
  if (allDone || dismissed) { card.style.display = "none"; return; }
  const n = [doneImport, doneLevel, doneShare].filter(Boolean).length;
  const step = (done, txt) => `<div class="list-row" style="padding:9px 0"><span style="font-size:18px">${done ? "✅" : "○"}</span><div class="grow" style="${done ? "text-decoration:line-through;opacity:.6" : ""}">${txt}</div></div>`;
  card.style.display = "block";
  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
      <div>
        <div class="eyebrow">Mula di sini · ${n}/3</div>
        <h3 class="display" style="font-size:20px;margin-top:4px">👋 Selamat datang, Cikgu!</h3>
      </div>
      <button class="x" id="onboardClose" aria-label="Tutup">×</button>
    </div>
    <div class="meter" style="margin:12px 0 6px"><i style="width:${Math.round(n / 3 * 100)}%"></i></div>
    ${step(doneImport, `Tambah atau import murid <small>${DATA.students.length} murid setakat ini</small>`)}
    ${step(doneLevel, `Isi pautan bahan setiap tahap <small>Di Tetapan → Tahap Bacaan</small>`)}
    ${step(doneShare, `Rekod kehadiran pertama <small>Tekan "Kehadiran" di bawah</small>`)}`;
  card.querySelector("#onboardClose")?.addEventListener("click", () => {
    try { localStorage.setItem("sbm_onboard_done", "1"); } catch (e) {}
    card.style.display = "none";
  });
}

async function init(user) {
  DATA = await loadData();
  document.getElementById("loadingState")?.remove();
  document.getElementById("adminMain").style.display = "block";
  const nameEl = document.getElementById("userName");
  if (nameEl && user) {
    const name = user.displayName || user.email || "Guru";
    nameEl.innerHTML = `${avatar({ name })}<span>${esc(name.split(/\s+/)[0])}</span>`;
    nameEl.title = name + " — tekan untuk log keluar";
  }
  const acct = document.getElementById("acctInfo");
  if (acct && user) acct.innerHTML = `${avatar({ name: user.displayName || user.email || "G" }, "lg")}<div style="min-width:0"><b style="display:block">${esc(user.displayName || "Guru")}</b><small class="muted" style="font-weight:600;word-break:break-all">${esc(user.email || "")}</small></div>`;
  document.getElementById("programName").textContent = DATA.meta.programName;
  if (isSuperAdmin(user) && !document.getElementById("superBanner")) {
    const div = document.createElement("div");
    div.id = "superBanner";
    div.className = "banner warn";
    div.style.marginTop = "0";
    div.style.marginBottom = "12px";
    div.innerHTML = `<span class="emo">👑</span><div><b>Mod Superadmin</b><small>Anda melihat murid SEMUA guru. Edit disimpan ke dokumen guru masing-masing.</small></div>`;
    document.getElementById("viewMurid").prepend(div);
  }
  renderSettings();
  fillClassFilter();
  renderTable();
  wireAdmin();
  hydrateIcons();
  const tBtn = document.getElementById("transferBtn");
  if (tBtn) tBtn.style.display = isSuperAdmin(user) ? "" : "none";
  renderOnboarding();
  if (isSuperAdmin(user)) renderTeacherPanel();
  if (location.hash === "#tetapan") setView("tetapan");
  else if (location.hash === "#hadir") { setView("murid"); openAttendance(); }
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

let initStarted = false;
onAuthChange((user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  if (initStarted) return;
  initStarted = true;
  init(user).catch(err => {
    console.error(err);
    sbmToast("Gagal memuatkan data: " + err.message);
  });
});
