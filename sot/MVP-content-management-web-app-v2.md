# SOT (Source of Truth) — Web App Manajemen Konten ContentFlow v2

## 1. Ringkasan & Tujuan Sistem

**ContentFlow v2** adalah aplikasi web manajemen dan publishing konten video/produk yang dibangun menggunakan **Next.js 14 (App Router)** di frontend dan terhubung dengan backend **FastAPI (port :8008)** yang menyimpan data utama di **Database SQLite (`contentflow.db`)**.

Aplikasi ini di-deploy di server yang sama dan diakses secara aman melalui **Cloudflare Tunnel** (`contentflow.ast402.my.id`) serta **Tailscale Network**.

Aplikasi ini membantu publisher dan admin:
1. Mengambil konten video yang siap dipublikasikan (*Completed*).
2. Memublikasikan konten ke **TikTok, Facebook, dan Instagram**.
3. Memperbarui status tayang (*Not Published*, *Scheduled*, *Published*), *Publish Date*, dan *Permalink URL* per platform.
4. Mengunduh asset video, menyalin caption, dan menyalin link affiliate secara cepat.
5. Menerima otomatisasi pengiriman konten langsung dari n8n / AI Video Generator melalui **Direct Ingestion API Webhook**.

---

## 2. Arsitektur Komponen & Teknologi

```text
[ Cloudflare Tunnel / Tailscale ]
             │
             ▼
[ Next.js v2 Frontend (:3000) ]  <--- (Rewrites /api/* to FastAPI)
             │
             ▼
 [ FastAPI Backend (:8008) ]
             │
             ▼
[ SQLite Database (contentflow.db) ]
```

| Komponen | Teknologi & Spesifikasi |
| :--- | :--- |
| **Frontend UI** | Next.js 14 (App Router), React 18, TypeScript, TailwindCSS, Shadcn UI, Lucide Icons |
| **Backend API** | Python FastAPI (`:8008`), Uvicorn, SQLAlchemy ORM |
| **Database Utama** | **SQLite (`contentflow.db`)** (Tabel: `users`, `user_account_assignments`, `accounts`, `content_items`, `api_keys`) |
| **Networking & Proxy** | Cloudflare Tunnel (`contentflow.ast402.my.id`), Tailscale (`100.78.186.123`), Next.js Rewrite Proxy |

---

## 3. Struktur Data Utama (SQLite Models)

### 3.1 Konten (`content_items`)

| Nama Field | Tipe Data | Pengelola | Aturan Validasi |
| :--- | :--- | :--- | :--- |
| `id` | Integer | Backend | Primary Key, Autoincrement |
| `account_id` | Integer | Backend | Foreign Key -> `accounts.id` |
| `video_id` | String | Backend / Ingest API | Unique per Account, Wajib |
| `hook` | String | Backend / Ingest API | Ringkasan hook/headline video |
| `nama_produk` | String | Backend / Ingest API | Nama produk yang dipromosikan |
| `link_affiliate` | String | Backend / Ingest API | URL affiliate Shopee/Tokopedia |
| `link_produk` | String | Backend / Ingest API | URL landing page produk |
| `url_asset` | String | Backend / Ingest API | URL download video asset (CDN/S3/Drive) |
| `caption` | Text | Backend / Ingest API | Teks caption + hashtag lengkap |
| `pipeline_status` | String | Backend / Ingest API | `Completed` (tampil di UI user) atau `In Production` |
| `production_date` | String | Backend / Ingest API | Format `YYYY-MM-DD` |
| `tiktok_status` | String | User | `Not Published`, `Scheduled`, `Published` |
| `tiktok_publish_date` | String | User | Wajib jika status `Scheduled` / `Published` |
| `permalink_tiktok` | String | User | Wajib diawali `http://` atau `https://` jika `Published` |
| `facebook_status` | String | User | `Not Published`, `Scheduled`, `Published` |
| `facebook_publish_date` | String | User | Wajib jika status `Scheduled` / `Published` |
| `permalink_fb` | String | User | Wajib diawali `http://` atau `https://` jika `Published` |
| `instagram_status` | String | User | `Not Published`, `Scheduled`, `Published` |
| `instagram_publish_date` | String | User | Wajib jika status `Scheduled` / `Published` |
| `permalink_ig` | String | User | Wajib diawali `http://` atau `https://` jika `Published` |

---

## 4. Fitur & Aturan Operasional Sistem

### 4.1 Mode Tampilan Utama (Feed Scroll Mode)
- Tampilan konten utama secara eksklusif menggunakan **Mode Feed Scroll (Infinite Scroll)**.
- Menggunakan `IntersectionObserver` untuk memuat **20 konten berikutnya** secara otomatis saat pengguna melakukan scroll ke bawah.

### 4.2 Pencarian & Filter Konten
- **Universal Search**: Mencari ID Video, Hook, Nama Produk, dan Caption secara bersamaan.
- **Filter Produk**: Filtering khusus produk tertentu yang tersedia di akun terpilih.
- **Filter Pipeline Status**: Memilih `Completed` atau `In Production`.
- **Filter Status Platform**: Filter status terpisah untuk TikTok, Facebook, dan Instagram.

### 4.3 Quick Action & Detail Modal
- **Copy Caption**: Menyalin caption + hashtag ke clipboard dalam 1 klik.
- **Copy Affiliate Link**: Menyalin link affiliate Shopee/Tokopedia/TikTok Shop.
- **Download Asset Video**: Mengunduh atau mengklik file media langsung dari CDN.
- **Buka Link Produk**: Membuka link landing page produk resmi di tab baru.
- **Form Edit Status**: Mengubah status, tanggal publish, dan permalink URL per platform.

### 4.4 Management Panel (Admin Only)
- **User Management**:
  - Menambah user baru (Username, Email, Password, Role).
  - Mengaktifkan atau menonaktifkan status user.
  - Mengubah role user (`admin` vs `user`).
- **Account Assignment**:
  - Menugaskan satu atau beberapa akun brand (`Account Tab`) kepada user.
  - User biasa hanya dapat mengakses akun yang ditugaskan admin.
- **Brand Account Management**:
  - Membuat, memperbarui, dan menghapus nama akun brand di database SQLite.
- **Manajemen API Key Ingestion Webhook**:
  - Membuat API Key baru (`POST /api/admin/api-keys`) yang menghasilkan token unik bertipe `cf_live_...`.
  - Menampilkan daftar API Key aktif.
  - Menyalin token API Key ke clipboard.
  - Mencabut/menghapus API Key (`DELETE /api/admin/api-keys/{id}`).

### 4.5 Direct Ingestion API Webhook (`/api/v1/content/ingest`)
- **Endpoint**: `POST /api/v1/content/ingest`
- **Authentication**: Mandatory Header `X-API-Key: cf_live_...`
- **Fungsi**: Menerima payload JSON (single item atau array batch items) dari n8n / AI Video Generator untuk melakukan *upsert* data langsung ke database SQLite ContentFlow.

### 4.6 Analytics & Statistics Dashboard (`/api/stats/summary`)
- Menampilkan Ringkasan Kartu Statistik (Total Content, Total Published, Total Scheduled, Total Not Published).
- Breakdown Progress Bars per platform (TikTok, Facebook, Instagram).
- Filter Rentang Waktu: `7d` (7 hari), `30d` (30 hari), `90d` (90 hari), dan `all` (semua waktu).

---

## 5. Lokasi File Proyek

* **Next.js v2 Workspace**: `/Users/sabeqmmursyid/contentflow_v2`
* **Dokumen SOT**: `/Users/sabeqmmursyid/contentflow_v2/sot/MVP-content-management-web-app-v2.md`
* **FastAPI Backend Server**: `/Users/sabeqmmursyid/_contentflow/app` (Port `:8008`)
