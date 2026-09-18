const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const SUPERADMIN_EMAILS = ["akmalhanif1997@gmail.com"];

function isSuperAdmin(decodedToken) {
  return decodedToken && decodedToken.email && SUPERADMIN_EMAILS.includes(decodedToken.email.toLowerCase());
}

// Callable: delete a teacher's Auth account + Firestore data
exports.deleteTeacher = functions.https.onCall(async (data, context) => {
  if (!context.auth || !isSuperAdmin(context.auth.token)) {
    throw new functions.https.HttpsError("permission-denied", "Hanya superadmin dibenarkan");
  }
  const teacherId = data.teacherId;
  if (!teacherId) throw new functions.https.HttpsError("invalid-argument", "teacherId diperlukan");
  if (teacherId === context.auth.uid) throw new functions.https.HttpsError("failed-precondition", "Tidak boleh padam diri sendiri");

  try { await admin.auth().deleteUser(teacherId); } catch (e) { if (e.code !== "auth/user-not-found") throw e; }
  await admin.firestore().doc(`teachers/${teacherId}`).delete().catch(() => {});
  // Also delete archives for this teacher
  const archives = await admin.firestore().collection("archives").where("__name__", ">=", teacherId + "_").where("__name__", "<", teacherId + "_\uf8ff").get();
  const batch = admin.firestore().batch();
  archives.forEach(d => batch.delete(d.ref));
  await batch.commit().catch(() => {});
  return { ok: true };
});

// Callable: list teachers (alternative to client-side read, bypasses per-doc rules for superadmin)
exports.listTeachers = functions.https.onCall(async (_data, context) => {
  if (!context.auth || !isSuperAdmin(context.auth.token)) {
    throw new functions.https.HttpsError("permission-denied", "Hanya superadmin dibenarkan");
  }
  const snap = await admin.firestore().collection("teachers").get();
  return snap.docs.map(d => {
    const data = d.data() || {};
    return { id: d.id, email: data.ownerEmail || null, students: Array.isArray(data.students) ? data.students.length : 0, schoolName: (data.meta && data.meta.schoolName) || "-", updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null };
  });
});
