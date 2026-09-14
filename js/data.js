import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, setDoc, query, where, getDocs, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDXrS3hDm-DUoh6Lg1ARJ0gGXc1kgb44Ok",
  authDomain: "bijak-membaca.firebaseapp.com",
  projectId: "bijak-membaca",
  storageBucket: "bijak-membaca.firebasestorage.app",
  messagingSenderId: "867240112493",
  appId: "1:867240112493:web:3dc02db164fc896959ea64"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const DATA_KEY = "sbm_data";
const PIN_KEY = "sbm_pin";
const DEFAULT_PIN = "1122";

// Superadmin emails — can view/edit ALL teachers' data.
// Passwords are managed by Firebase Auth, never stored here.
const SUPERADMIN_EMAILS = ["akmalhanif1997@gmail.com"];

export function isSuperAdmin(user) {
  const u = user || auth.currentUser;
  return !!u && !!u.email && SUPERADMIN_EMAILS.includes(u.email.toLowerCase());
}

export function getCurrentTeacherId() {
  const user = auth.currentUser;
  return user ? user.uid : null;
}

function filterStudentsByTeacher(data, teacherId) {
  if (!teacherId) return data;
  return { ...data, students: (data.students || []).filter(s => s.teacherId === teacherId) };
}

function addTeacherIdToStudents(data, teacherId) {
  if (!teacherId) return data;
  return { ...data, students: (data.students || []).map(s => ({ ...s, teacherId: s.teacherId || teacherId })) };
}

export function defaultData() {
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

export async function loadData() {
  const teacherId = getCurrentTeacherId();
  if (!teacherId) return addTeacherIdToStudents(defaultData(), null);

  // Superadmin sees every teacher's students
  if (isSuperAdmin()) {
    try {
      return await loadAllData();
    } catch (e) {
      console.error("loadData (superadmin) error:", e);
    }
  }

  try {
    const snap = await getDoc(doc(db, "teachers", teacherId));
    if (snap.exists()) {
      const data = snap.data();
      return addTeacherIdToStudents(filterStudentsByTeacher(data, teacherId), teacherId);
    }
  } catch (e) {
    console.error("loadData error:", e);
  }
  return addTeacherIdToStudents(defaultData(), teacherId);
}

// Load all data (for parent view - no teacher filter)
export async function loadAllData() {
  try {
    const teachersSnap = await getDocs(collection(db, "teachers"));
    const allStudents = [];
    let meta = null;
    
    for (const docSnap of teachersSnap.docs) {
      const data = docSnap.data();
      if (data && data.students) {
        data.students.forEach(s => {
          allStudents.push({ ...s, teacherId: docSnap.id });
        });
      }
      if (!meta && data && data.meta) {
        meta = data.meta;
      }
    }
    
    if (allStudents.length === 0) return defaultData();
    return { meta: meta || defaultData().meta, students: allStudents };
  } catch (e) {
    console.error("loadAllData error:", e);
    return defaultData();
  }
}

export function sbmToast(msg) {
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

export async function saveData(data) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
  const teacherId = getCurrentTeacherId();
  if (!teacherId) {
    sbmToast("Tiada guru aktif. Sila log masuk semula.");
    return;
  }

  // Superadmin: write each teacher's students back to their own doc,
  // so editing another teacher's student doesn't move it to your doc.
  // Each teacher's own settings (meta) are preserved.
  if (isSuperAdmin()) {
    try {
      await saveAllTeachersData(data, teacherId);
      console.log("Bijak: data semua guru disimpan ke Firestore.");
    } catch (err) {
      console.error("Bijak save error:", err);
      sbmToast("Simpan gagal: " + err.message);
    }
    return;
  }

  try {
    await setDoc(doc(db, "teachers", teacherId), {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log("Bijak: data disimpan ke Firestore.");
  } catch (err) {
    console.error("Bijak save error:", err);
    sbmToast("Simpan gagal: " + err.message);
  }
}

async function saveAllTeachersData(data, superadminId) {
  const byTeacher = {};
  (data.students || []).forEach(s => {
    const tid = s.teacherId || superadminId;
    if (!byTeacher[tid]) byTeacher[tid] = [];
    byTeacher[tid].push({ ...s, teacherId: tid });
  });

  const teachersSnap = await getDocs(collection(db, "teachers"));
  const allIds = new Set(teachersSnap.docs.map(d => d.id));
  Object.keys(byTeacher).forEach(tid => allIds.add(tid));

  for (const tid of allIds) {
    const ref = doc(db, "teachers", tid);
    const snap = await getDoc(ref);
    const base = snap.exists() ? snap.data() : {};
    await setDoc(ref, {
      meta: base.meta || data.meta,
      students: byTeacher[tid] || [],
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
}

export async function registerUser(email, password, name) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    return { id: cred.user.uid, email: cred.user.email, name };
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') throw new Error("Email sudah didaftarkan");
    if (err.code === 'auth/weak-password') throw new Error("Kata laluan terlalu lemah");
    throw err;
  }
}

export async function loginUser(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { id: cred.user.uid, email: cred.user.email, name: cred.user.displayName || 'Guru' };
  } catch (err) {
    if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-email') throw new Error("Email atau kata laluan salah");
    throw err;
  }
}

export async function loginWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    return { id: cred.user.uid, email: cred.user.email, name: cred.user.displayName || 'Guru' };
  } catch (err) {
    if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') throw new Error("Log masuk dibatalkan");
    if (err.code === 'auth/operation-not-allowed') throw new Error("Log masuk Google belum diaktifkan dalam Firebase");
    if (err.code === 'auth/unauthorized-domain') throw new Error("Domain ini belum dibenarkan dalam Firebase Auth");
    throw err;
  }
}

export function logoutUser() {
  return signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth.currentUser;
}

export function uid(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function classesOf(data) {
  const set = new Set((data.students || []).map(s => s.class).filter(Boolean));
  return Array.from(set).sort();
}

export function pct(n, d) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

export function attendanceStats(s) {
  const total = s.attendance ? s.attendance.length : 0;
  const hadir = s.attendance ? s.attendance.filter(a => a.s === "h").length : 0;
  return { total, hadir, absent: total - hadir, pct: pct(hadir, total) };
}

export function quizAvg(s) {
  const qs = s.quizzes || [];
  if (!qs.length) return 0;
  return Math.round(qs.reduce((a, q) => a + q.s, 0) / qs.length);
}

export function levelIndex(data, s) {
  const idx = (s.currentLevel || 1) - 1;
  return Math.max(0, Math.min(idx, data.meta.levels.length - 1));
}

export function levelName(data, s) {
  return data.meta.levels[levelIndex(data, s)].name;
}

export function programStats(data) {
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

export function checkLevelUp(data, s) {
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

export function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename || "students.json";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
}

export function fmtDate(d) {
  if (!d) return "";
  const parts = d.split("-");
  if (parts.length !== 3) return d;
  const months = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogos", "Sep", "Okt", "Nov", "Dis"];
  return parts[2] + " " + months[parseInt(parts[1], 10) - 1] + " " + parts[0];
}

export function esc(t) {
  const div = document.createElement("div");
  div.textContent = t == null ? "" : String(t);
  return div.innerHTML;
}