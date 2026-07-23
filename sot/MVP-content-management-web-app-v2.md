# SOT (Source of Truth) — Web App Manajemen Konten ContentFlow v2

**Dokumen ID:** SOT-CFV2-001  
**Tanggal Pembaruan Terakhir:** 23 Juli 2026  
**Status:** Released / Production Ready  
**Repository GitHub:** `https://github.com/sabeq83/contentflow.git` (Branch: `main`)  
**Server Produksi Target:** `sabeqmursyid@100.78.186.123` (Port `:3001`, PM2: `contentflow_v2`)  

---

## 1. Ringkasan & Tujuan Sistem

**ContentFlow v2** adalah aplikasi web manajemen dan publishing konten video/produk yang dibangun secara **100% Native Full-Stack menggunakan Next.js 14 (App Router)**. Sistem ini menggabungkan antarmuka pengguna (Frontend Studio UI) dan logika server (*Backend Route Handlers*) dalam satu bundel terpadu dengan koneksi langsung ke **Database SQLite (`data/app.db`)** melalui driver performa tinggi `better-sqlite3`.

Aplikasi ini di-deploy di server produksi (`100.78.186.123:3001`) dan diakses secara aman melalui jaringan **Tailscale** & **Cloudflare Tunnel** (`contentflow.ast402.my.id`).

### Peran Utama Aplikasi:
1. **Studio Publisher Feed**: Menyajikan antarmuka feed 1-kolom modern dengan pengurutan konten siap rilis (*Completed*).
2. **Multi-Platform Publishing**: Memungkinkan publisher mencatat status publikasi, tanggal tayang, dan permalink URL untuk **TikTok, Facebook, dan Instagram**.
3. **Interactive Calendar Picker**: Memudahkan pemilihan tanggal publikasi dengan calendar date picker dark mode dan tombol cepat *"Hari Ini"*.
4. **Lightweight Static Media Cards**: Menggunakan thumbnail statis yang ringan (tanpa heavy video player) untuk performa scroll yang responsif dan bebas flicker (*anti-blink*).
5. **Quick Asset & Link Actions**: Menyediakan tombol cepat berdesain Indigo solid untuk mengunduh video asset, menyalin caption, dan menyalin link affiliate tanpa *overflow clipping*.
6. **Direct Ingestion API Webhook**: Menerima otomatisasi pengiriman konten langsung dari n8n / AI Video Generator melalui endpoint `POST /api/v1/content/ingest` yang dilindungi API Key `cf_live_...`.
7. **Complete Admin Management**: Kelola user (tambah, ubah password, hapus, nonaktifkan), hak akses akun brand per user, akun brand, dan API Key Webhook.

---

## 2. Arsitektur Komponen & Teknologi

```text
[ Client Browser / Mobile / Publisher ]
                 │
                 ▼
[ Cloudflare Tunnel / Tailscale / Nginx ]
                 │
                 ▼
 [ Full-Stack Next.js 14 App Server (:3001) ]
 ├── Frontend Pages & Studio Feed UI (React 18 / TailwindCSS)
 └── Backend Route Handlers (/api/*)
                 │
                 ▼
     [ Native SQLite Engine (data/app.db) ]
```

### Stack Teknologi Terpasang:

| Komponen | Teknologi & Spesifikasi |
| :--- | :--- |
| **Framework Utama** | **Full-Stack Next.js 14.2.35 (App Router)** |
| **Bahasa Pemrograman** | TypeScript, React 18, Node.js v22.x |
| **Styling & UI** | Vanilla CSS, TailwindCSS, Glassmorphism Dark Mode, Lucide Icons |
| **Database Engine** | **SQLite 3 (`data/app.db`)** via `better-sqlite3` (WAL Mode & Busy Timeout `10000ms`) |
| **Autentikasi** | JWT (JSON Web Token) Bearer & Bcrypt Password Hashing |
| **Process Manager** | PM2 (`contentflow_v2` di port `3001`) |
| **Otomatisasi Deploy** | Script Silent Update SOP (`/home/sabeqmursyid/apps/contentflow_v2/update_silent.sh`) |

---

## 3. Struktur Data Utama (SQLite Database Schema)

Database tersimpan di lokasi `/home/sabeqmursyid/apps/contentflow_v2/data/app.db`.

### 3.1 Tabel Users (`users`)
- `id` (INTEGER PRIMARY KEY)
- `username` (VARCHAR, UNIQUE)
- `email` (VARCHAR, UNIQUE)
- `hashed_password` (TEXT, Bcrypt)
- `role` (VARCHAR: `'admin'` | `'user'`)
- `is_active` (BOOLEAN: `1` | `0`)
- `created_at` (DATETIME)

### 3.2 Tabel User Account Assignments (`user_account_assignments`)
- `id` (INTEGER PRIMARY KEY)
- `user_id` (INTEGER, Foreign Key -> `users.id`)
- `account_tab_name` (VARCHAR)

### 3.3 Tabel Akun Brand (`accounts`)
- `id` (INTEGER PRIMARY KEY)
- `name` (VARCHAR, UNIQUE)
- `created_at` (DATETIME)

### 3.4 Tabel Item Konten (`content_items`)
- `id` (INTEGER PRIMARY KEY)
- `account_id` (INTEGER, Foreign Key -> `accounts.id`)
- `video_id` (VARCHAR, UNIQUE per account)
- `hook` (TEXT)
- `nama_produk` (VARCHAR)
- `link_affiliate` (TEXT)
- `link_produk` (TEXT)
- `url_asset` (TEXT)
- `caption` (TEXT)
- `pipeline_status` (VARCHAR: `'Completed'` | `'In Production'`)
- `production_date` (VARCHAR: `YYYY-MM-DD`)
- `tiktok_status` (VARCHAR: `'Not Published'` | `'Scheduled'` | `'Published'`)
- `tiktok_publish_date` (VARCHAR)
- `permalink_tiktok` (TEXT)
- `facebook_status` (VARCHAR: `'Not Published'` | `'Scheduled'` | `'Published'`)
- `facebook_publish_date` (VARCHAR)
- `permalink_fb` (TEXT)
- `instagram_status` (VARCHAR: `'Not Published'` | `'Scheduled'` | `'Published'`)
- `instagram_publish_date` (VARCHAR)
- `permalink_ig` (TEXT)
- `created_at`, `updated_at` (DATETIME)

### 3.5 Tabel API Keys (`api_keys`)
- `id` (INTEGER PRIMARY KEY)
- `name` (VARCHAR)
- `key` (VARCHAR, UNIQUE: format `cf_live_...`)
- `is_active` (BOOLEAN)
- `created_at` (DATETIME)

---

## 4. Fitur Utama & Aturan Operasional

### 4.1 Feed Scroll Studio Dashboard (`/dashboard`)
- Layout **Option 1**: Top Quick Metrics Cards + Feed Utama (kiri) + Sidebar Publishing Schedule (kanan).
- **Anti-Flicker Scroll**: Menggunakan `React.memo(ContentCard)` dan ref pagination (`pageRef`, `hasMoreRef`, `isLoadingMoreRef`) sehingga elemen kartu feed yang sudah ada tidak memicu re-render saat muat data baru.
- **Kartu Thumbnail Statis**: Tampilan kartu ringan berlatar gradien profesional lengkap dengan ID Video dan indikator ketersediaan media asset.
- **Tipografi Proporsional**: Judul Hook disesuaikan ke `text-sm font-bold`, dan Target Brand Account selector ke `text-sm font-semibold`.

### 4.2 Interactive Calendar Picker di Modal Detail
- Input `Publish Date` pada modal detail konten menggunakan HTML5 Calendar Picker (`input[type="date"]`) dengan penyesuaian CSS dark mode.
- Tombol shortcut **"Hari Ini"** otomatis mengisi tanggal hari ini dalam format `YYYY-MM-DD`.

### 4.3 Modal Quick Actions & Inline Copy Feedback
- Tombol modal berdesain **Solid Vivid Indigo** (`bg-indigo-600 text-white font-bold`).
- Teks notifikasi salin langsung ditampilkan di dalam tombol (`✓ Caption Tersalin!`, `✓ Link Tersalin!`) selama 2 detik tanpa *overflow clipping*.

### 4.4 Management Panel Admin (`/admin`)
- **Manajemen User**:
  - Tambah User Baru (Otomatis berpindah ke tab Account Assignment untuk penugasan instan).
  - Ubah Password User/Admin langsung dari Web UI (Modal Reset Password).
  - Hapus User permanen (dengan konfirmasi & *Self-Deletion Guard*).
  - Toggle Aktif/Nonaktifkan akun.
- **Account Assignment**:
  - Penugasan centang hak akses akun brand per user.
- **Brand Accounts**:
  - Daftar akun brand dan jumlah item konten aktif per brand.
- **API Keys Webhook**:
  - Generate, salin, dan cabut token API Key `cf_live_...`.

### 4.5 Direct Ingestion API Webhook (`POST /api/v1/content/ingest`)
- **Endpoint**: `POST /api/v1/content/ingest`
- **Header Required**: `X-API-Key: cf_live_...`
- **Fungsi**: Menerima single item atau batch array item untuk di-*upsert* langsung ke database SQLite.

---

## 5. Lokasi File Proyek & Perintah Penting

- **Lokal Repository**: `/Users/sabeqmmursyid/contentflow_v2`
- **Remote Production**: `/home/sabeqmursyid/apps/contentflow_v2`
- **File Dokumen SOT**: `sot/MVP-content-management-web-app-v2.md`
- **Script Password CLI**: `node scripts/change-password.js <username> <new_password>`
- **Script Silent Update**: `ssh sabeqmursyid@100.78.186.123 "bash ~/apps/contentflow_v2/update_silent.sh"`
