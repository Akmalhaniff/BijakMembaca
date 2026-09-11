# Program Bijak Membaca

Sistem pengurusan dan pemantauan kemajuan bacaan murid untuk SMK Puncak Alam 3.

## Ciri-ciri
- **Dashboard Awam** — Paparan kemajuan murid mengikut kelas dan tahap bacaan
- **Panel Guru (Multi-user)** — Setiap guru mempunyai akaun sendiri dan mengurus murid masing-masing
- **Autentikasi Guru** — Log masuk menggunakan emel dan kata laluan
- **Penyimpanan Data** — Google Sheets via SheetDB (senaraikan murid, kehadiran, kuiz, kosa kata)
- **Import/Eksport JSON** — Backup dan pemulihan data mudah

## Persediaan

### 1. Google Sheets + SheetDB
1. Cipta Google Sheet baru dengan lajur: `id`, `payload` (untuk data murid) dan sheet kedua `users` dengan lajur: `id`, `email`, `password`, `name`, `createdAt`
2. Daftar di [SheetDB](https://sheetdb.io/) dan cipta API dari Google Sheet tersebut
3. Salin URL API (contoh: `https://sheetdb.io/api/v1/xxxx`) ke `js/data.js`:
   ```js
   const API_URL = "https://sheetdb.io/api/v1/xxxx";
   ```
4. (Pilihan) Aktifkan token autentikasi di SheetDB dan masukkan ke `API_TOKEN`

### 2. Jalankan
Buka `index.html` di pelayar. Tiada proses build diperlukan.

## Aliran Kerja Guru

1. **Daftar Akaun** — Buka `login.html`, klik "Daftar", masukkan nama, emel, kata laluan
2. **Log Masuk** — Gunakan emel dan kata laluan yang didaftarkan
3. **Panel Guru** — Akses `admin.html` untuk:
   - Tambah/edit/padam murid
   - Rekod kehadiran dan keputusan kuiz
   - Urus kosa kata murid
   - Tetapan program (nama sekolah, tahap bacaan, tahun)
   - Import/eksport data JSON
4. **Dashboard** — Lihat kemajuan murid di `index.html` (hanya murid guru tersebut)

## Struktur Fail
```
├── index.html          # Dashboard awam
├── admin.html          # Panel guru (perlukan log masuk)
├── login.html          # Log masuk / daftar guru
├── css/style.css       # Stil
├── js/
│   ├── auth.js         # Autentikasi guru (register, login, logout, session)
│   ├── data.js         # Muat/simpan data ke SheetDB + filter mengikut guru
│   ├── app.js          # Logik dashboard
│   ├── admin.js        # Logik panel guru
│   └── sample.js       # Data contoh murid
└── data/students.json  # Data fallback
```

## Nota Teknikal
- Data murid disimpan sebagai satu baris JSON dalam lajur `payload` SheetDB
- Setiap murid mempunyai medan `teacherId` untuk pemisahan data guru
- Sesi guru disimpan dalam `localStorage` (tahan 7 hari)
- Kata laluan di-hash sebelum disimpan (sha1 sederhana untuk demo; guna bcrypt untuk pengeluaran)