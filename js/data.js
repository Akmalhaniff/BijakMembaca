const DATA_KEY = "sbm_data";
const PIN_KEY = "sbm_pin";
const DEFAULT_PIN = "1122";

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
  const local = loadLocal();
  if (local && Array.isArray(local.students)) return local;
  try {
    const res = await fetch("data/students.json");
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.students)) return data;
    }
  } catch (e) {}
  return defaultData();
}

function saveData(data) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
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
