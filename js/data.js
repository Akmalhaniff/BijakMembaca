const DATA_KEY = "sbm_data";
const PIN_KEY = "sbm_pin";
const DEFAULT_PIN = "1122";

const API_URL = "https://sheetdb.io/api/v1/kfmmn2ga7vbv6azoxf4ondi1ph3c0ak6qu9amvxw";
const API_TOKEN = "5fzbpnbsld7plgkd3x3um2jt6fgn9hzloqvk8nd9";

function getCurrentTeacherId() {
  const user = getCurrentUser ? getCurrentUser() : null;
  return user ? user.id : null;
}

function filterStudentsByTeacher(data, teacherId) {
  if (!teacherId) return data;
  const filtered = {
    ...data,
    students: (data.students || []).filter(s => s.teacherId === teacherId)
  };
  return filtered;
}

function addTeacherIdToStudents(data, teacherId) {
  if (!teacherId) return data;
  return {
    ...data,
    students: (data.students || []).map(s => ({
      ...s,
      teacherId: s.teacherId || teacherId
    }))
  };
}

function apiHeaders() {
  const h = { "Content-Type": "application/json" };
  if (API_TOKEN) h["Authorization"] = "Bearer " + API_TOKEN;
  return h;
}

function defaultData() {
  if (typeof STUDENT_DATA !== "undefined") {
    return JSON.parse(JSON.stringify(STUDENT_DATA));
  }
  return {
    meta: {
      schoolName: "SMK Puncak Alam 3",
      programName: "Program Bijak Membaca",
      year: "2026",
      levels: [
        { name: "Mengenal Huruf", short: "L1" },
        { name: "Suku Kata", short: "L2" },
        { name: "Perkataan", short: "L3" },
        { name: "Ayat Mudah", short: "L4" },
        { name: "Perenggan", short: "L5" },
        { name: "Buku & Petikan", short: "L6" }
      ]
    },
    students: []
  };
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

async function loadData() {
  if (API_URL) {
    try {
      const res = await fetch(API_URL, { headers: apiHeaders() });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length && rows[0].payload) {
          const data = JSON.parse(rows[0].payload);
          if (data && Array.isArray(data.students)) {
            const teacherId = getCurrentTeacherId();
            const filtered = filterStudentsByTeacher(data, teacherId);
            const withTeacherId = addTeacherIdToStudents(filtered, teacherId);
            localStorage.setItem(DATA_KEY, JSON.stringify(withTeacherId));
            return withTeacherId;
          }
        }
      }
    } catch (e) {}
  }
  const local = loadLocal();
  if (local && Array.isArray(local.students)) {
    const teacherId = getCurrentTeacherId();
    return addTeacherIdToStudents(filterStudentsByTeacher(local, teacherId), teacherId);
  }
  try {
    const res = await fetch("data/students.json");
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.students)) {
        const teacherId = getCurrentTeacherId();
        return addTeacherIdToStudents(filterStudentsByTeacher(data, teacherId), teacherId);
      }
    }
  } catch (e) {}
  const teacherId = getCurrentTeacherId();
  return addTeacherIdToStudents(defaultData(), teacherId);
}

function sbmToast(msg) {
  let el = document.getElementById("sbmToast");
  if (!el) {
    el = document.createElement("div");
    el.id = "sbmToast";
    el.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#b42318;color:#fff;padding:10px 16px;border-radius:10px;font:600 14px sans-serif;z-index:9999;box-shadow:0 6px 20px rgba(0,0,0,.25);max-width:90vw";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = "block";
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.display = "none"; }, 6000);
}

async function saveData(data) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
  if (!API_URL) return;
  
  const teacherId = getCurrentTeacherId();
  if (!teacherId) {
    sbmToast("Tiada guru aktif. Sila log masuk semula.");
    return;
  }

  let globalData = data;
  try {
    const res = await fetch(API_URL, { headers: apiHeaders() });
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length && rows[0].payload) {
        globalData = JSON.parse(rows[0].payload);
      }
    }
  } catch (e) {}

  const otherStudents = (globalData.students || []).filter(s => s.teacherId !== teacherId);
  const mergedData = {
    ...globalData,
    students: [...otherStudents, ...(data.students || [])]
  };

  const row = JSON.stringify({ payload: JSON.stringify(mergedData) });
  fetch(API_URL + "/all", { method: "DELETE", headers: apiHeaders() })
    .then(() => fetch(API_URL, {
      method: "POST",
      headers: apiHeaders(),
      body: row
    }))
    .then(async r => {
      if (!r.ok) {
        const txt = await r.text();
        console.error("Bijak save gagal:", r.status, txt);
        sbmToast("Simpan gagal (" + r.status + "). Semak API_URL SheetDB.");
      } else {
        console.log("Bijak: data disimpan ke SheetDB.");
      }
    })
    .catch(err => {
      console.error("Bijak save error:", err);
      sbmToast("Simpan gagal: " + err.message);
    });
}

function uid(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function classesOf(data) {
  const set = new Set((data.students || []).map(s => s.class).filter(Boolean));
  return Array.from(set).sort();
}

function pct(n, d) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

function attendanceStats(s) {
  const total = s.attendance ? s.attendance.length : 0;
  const hadir = s.attendance ? s.attendance.filter(a => a.s === "h").length : 0;
  return { total, hadir, absent: total - hadir, pct: pct(hadir, total) };
}

function quizAvg(s) {
  const qs = s.quizzes || [];
  if (!qs.length) return 0;
  return Math.round(qs.reduce((a, q) => a + q.s, 0) / qs.length);
}

function levelIndex(data, s) {
  const idx = (s.currentLevel || 1) - 1;
  return Math.max(0, Math.min(idx, data.meta.levels.length - 1));
}

function levelName(data, s) {
  return data.meta.levels[levelIndex(data, s)].name;
}

function checkLevelUp(data, s) {
  const currentLevel = s.currentLevel || 1;
  const totalLevels = data.meta.levels.length;
  if (currentLevel >= totalLevels) return null;
  
  const avgQuiz = quizAvg(s);
  const att = attendanceStats(s);
  const attendancePct = att.pct;
  const recentQuizzes = (s.quizzes || []).slice().sort((a, b) => (a.d < b.d ? 1 : -1)).slice(0, 3);
  const recentAvg = recentQuizzes.length ? Math.round(recentQuizzes.reduce((a, q) => a + q.s, 0) / recentQuizzes.length) : 0;
  
  const ready = avgQuiz >= 75 && attendancePct >= 80 && recentAvg >= 75;
  if (!ready) return null;
  
  return {
    nextLevel: currentLevel + 1,
    nextLevelName: data.meta.levels[currentLevel].name,
    reason: `Purata kuiz ${avgQuiz}%, Kehadiran ${attendancePct}%, 3 kuiz terkini ${recentAvg}%`
  };
}

function programStats(data) {
  const students = data.students || [];
  const total = students.length;
  const totalLevels = data.meta.levels.length;
  const sumLevel = students.reduce((a, s) => a + (levelIndex(data, s) + 1), 0);
  const avgLevel = total ? Math.round((sumLevel / total) * 10) / 10 : 0;
  const sumAtt = students.reduce((a, s) => a + attendanceStats(s).pct, 0);
  const avgAtt = total ? Math.round(sumAtt / total) : 0;
  const sumQuiz = students.reduce((a, s) => a + quizAvg(s), 0);
  const avgQuiz = total ? Math.round(sumQuiz / total) : 0;
  return { total, totalLevels, avgLevel, avgAtt, avgQuiz };
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename || "students.json";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
}

function fmtDate(d) {
  if (!d) return "";
  const parts = d.split("-");
  if (parts.length !== 3) return d;
  const months = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogos", "Sep", "Okt", "Nov", "Dis"];
  return parts[2] + " " + months[parseInt(parts[1], 10) - 1] + " " + parts[0];
}

function esc(t) {
  const div = document.createElement("div");
  div.textContent = t == null ? "" : String(t);
  return div.innerHTML;
}
