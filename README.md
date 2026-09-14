# Program Bijak Membaca

Sistem pengurusan dan pemantauan kemajuan bacaan murid untuk SMK Puncak Alam 3.

## Ciri-ciri
- **Dashboard Awam** — Paparan kemajuan murid mengikut kelas dan tahap bacaan
- **Panel Guru (Multi-user)** — Setiap guru mempunyai akaun sendiri dan mengurus murid masing-masing
- **Autentikasi Guru** — Log masuk menggunakan emel dan kata laluan (Firebase Auth)
- **Penyimpanan Data** — Firebase Firestore (real-time, offline-first)
- **Import/Eksport JSON & CSV** — Backup dan pemulihan data mudah
- **Mod Gelap/Terang** — Pilihan tema visual
- **Cetak Laporan** — Laporan individu murid untuk ibu bapa
- **Kongsi WhatsApp** — Hantar link laporan ke ibu bapa

## Persediaan Firebase

### 1. Cipta Projek Firebase
1. Pergi ke [Firebase Console](https://console.firebase.google.com)
2. **Add project** → Nama: `bijak-membaca` → Continue → Disable Analytics → Create project
3. **Authentication** → Sign-in method → **Email/Password** → Enable
4. **Firestore Database** → Create database → Start in **test mode** → Pilih lokasi → Enable

### 2. Dapatkan Config
Project Settings (ikon gear) → General → Your apps → **Web app** (`</>`) → Register app → Salin config

Config sudah dikemas kini dalam `js/data.js`:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDXrS3hDm-DUoh6Lg1ARJ0gGXc1kgb44Ok",
  authDomain: "bijak-membaca.firebaseapp.com",
  projectId: "bijak-membaca",
  storageBucket: "bijak-membaca.firebasestorage.app",
  messagingSenderId: "867240112493",
  appId: "1:867240112493:web:3dc02db164fc896959ea64"
};
```

### 3. Tetapkan Firestore Rules
Pergi ke **Firestore Database** → **Rules** → Gantikan dengan:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSuperAdmin() {
      return request.auth != null && request.auth.token.email == 'akmalhanif1997@gmail.com';
    }
    // Guru hanya boleh baca/tulis data mereka sendiri (superadmin boleh semua)
    match /teachers/{teacherId} {
      allow read, write: if (request.auth != null && request.auth.uid == teacherId) || isSuperAdmin();
    }
    // Pengguna boleh baca profil mereka sendiri
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
Klik **Publish**.

### 4. Enable Firebase Auth Domain (GitHub Pages)
Authentication → Settings → Authorized domains → **Add domain** → `akmalhaniff.github.io`

## Jalankan
1. Commit & push ke GitHub
2. Enable GitHub Pages (Settings → Pages → Deploy from main branch)
3. Buka `https://akmalhaniff.github.io/BijakMembaca/`

## Aliran Kerja Guru

1. **Daftar Akaun** — Buka `login.html`, klik "Daftar", masukkan nama, emel, kata laluan
2. **Log Masuk** — Gunakan emel dan kata laluan yang didaftarkan
3. **Panel Guru** — Akses `admin.html` untuk:
   - Tambah/edit/padam murid (dengan gambar)
   - Rekod kehadiran (termasuk "Semua Hadir Hari Ini")
   - Rekod keputusan kuiz
   - Urus kosa kata murid
   - Tetapan program (nama sekolah, tahap bacaan, tahun)
   - Import/eksport data JSON & CSV
4. **Dashboard** — Lihat kemajuan murid di `index.html` (hanya murid guru tersebut)
5. **Kongsi ke Ibu Bapa** — Klik 🔗 atau 📱 dalam jadual murid → hantar link ke ibu bapa
6. **Ibu Bapa** — Buka link `parent.html?student=ID` → lihat kemajuan anak (tiada log masuk diperlukan)

## Struktur Fail
```
├── index.html          # Dashboard awam
├── admin.html          # Panel guru (perlukan log masuk)
├── login.html          # Log masuk / daftar guru
├── parent.html         # Paparan ibu bapa (tiada log masuk)
├── css/style.css       # Stil (termasuk mod gelap)
├── sw.js               # Service Worker (offline support)
├── js/
│   ├── data.js         # Firebase config, data logic, auth functions
│   ├── app.js          # Logik dashboard
│   ├── admin.js        # Logik panel guru
│   ├── darkmode.js     # Mod gelap/terang
│   ├── sample.js       # Data contoh murid
│   └── lib/papaparse.min.js  # CSV parsing
└── data/students.json  # Data fallback
```

## Nota Teknikal
- Data murid disimpan dalam koleksi `teachers/{uid}` di Firestore
- Setiap guru hanya melihat data mereka (security rules)
- Firebase Auth menangani sesi (persisten, auto-renew token)
- Service Worker untuk offline support (static assets)
- Mod gelap disimpan dalam localStorage
- Password tidak disimpan (Firebase Auth handle)
- CSV import menggunakan PapaParse
- Tiada backend/server diperlukan — sepenuhnya client-side