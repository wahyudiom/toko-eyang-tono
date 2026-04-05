# Toko Eyang Tono — Web App Manajemen Stok & Penjualan

Aplikasi web berbasis Next.js untuk pengelolaan stok barang dan transaksi penjualan, dengan Google Sheets sebagai database utama.

---

## Daftar Isi

1. [Fitur](#fitur)
2. [Struktur Akses](#struktur-akses)
3. [Prasyarat](#prasyarat)
4. [Setup Google Sheets](#setup-google-sheets)
5. [Setup Google Cloud & Service Account](#setup-google-cloud--service-account)
6. [Konfigurasi Environment Variables](#konfigurasi-environment-variables)
7. [Menjalankan Lokal](#menjalankan-lokal)
8. [Deploy ke Vercel](#deploy-ke-vercel)
9. [Menambah Akun User](#menambah-akun-user)
10. [Troubleshooting](#troubleshooting)

---

## Fitur

- Login berbasis role (Owner, Kasir, Gudang)
- Manajemen stok barang (tambah, edit, hapus)
- Transaksi penjualan dengan keranjang belanja
- Pengurangan stok otomatis saat transaksi
- Histori penjualan (expandable per transaksi)
- Dashboard owner (stok aktif, omzet, laba, transaksi terbaru)
- Audit log (siapa input/edit, kapan)
- Sinkronisasi otomatis ke Google Sheets
- Tampilan mobile-friendly, dioptimalkan untuk tablet

---

## Struktur Akses

| Halaman       | Owner | Gudang | Kasir |
|---------------|:-----:|:------:|:-----:|
| Dashboard     | ✅    | ❌     | ❌    |
| Stok Barang   | ✅    | ✅     | ❌    |
| Kasir         | ✅    | ❌     | ✅    |
| Histori       | ✅    | ✅     | ❌    |

---

## Prasyarat

- **Node.js** v18 atau lebih baru
- **Akun Google** (untuk Google Cloud & Google Sheets)
- **Akun Vercel** (untuk deployment)
- Google Sheets yang sudah disiapkan (lihat bagian berikut)

---

## Setup Google Sheets

### 1. Buka Google Sheets yang sudah ada
Link: `https://docs.google.com/spreadsheets/d/1EhTwhI6dZId6jd6JZawe1QjatEAuGujFOj-Rr5XnNPQ/edit`

### 2. Buat 4 Sheet (tab) berikut

Klik tanda `+` di pojok kiri bawah untuk menambah sheet baru.

#### Sheet 1: `users`
Nama sheet harus persis: **`users`**

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| user_id | nama_user | role | login_id | password | created_at | updated_at | status_aktif |

#### Sheet 2: `stock_barang`
Nama sheet harus persis: **`stock_barang`**

| A | B | C | D | E | F | G | H | I | J | K | L |
|---|---|---|---|---|---|---|---|---|---|---|---|
| id_barang | nama_barang | tanggal_masuk | jumlah_stok | status_barang | notes | harga_jual | harga_modal | created_at | updated_at | created_by | updated_by |

#### Sheet 3: `transaksi_penjualan`
Nama sheet harus persis: **`transaksi_penjualan`**

| A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| id_transaksi | tanggal_transaksi | id_barang | nama_barang | qty | harga_jual | harga_modal | total_item | total_transaksi | metode_pembayaran | nama_pembeli | no_hp_pembeli | created_at | updated_at | created_by | updated_by |

#### Sheet 4: `dashboard_source`
Nama sheet harus persis: **`dashboard_source`**

Biarkan kosong, sheet ini opsional (dashboard dihitung langsung dari data).

### 3. Tambahkan baris header (baris pertama)

Untuk setiap sheet, baris pertama diisi dengan nama kolom seperti tabel di atas. Contoh untuk sheet `users`, baris 1 berisi:
```
user_id | nama_user | role | login_id | password | created_at | updated_at | status_aktif
```

---

## Setup Google Cloud & Service Account

### 1. Buka Google Cloud Console
Buka: [https://console.cloud.google.com](https://console.cloud.google.com)

### 2. Buat Project Baru
- Klik dropdown project di pojok kiri atas
- Klik **New Project**
- Beri nama, misal: `toko-eyang-tono`
- Klik **Create**

### 3. Aktifkan Google Sheets API
- Pastikan project baru yang aktif sudah dipilih
- Buka menu: **APIs & Services → Library**
- Cari **"Google Sheets API"**
- Klik **Enable**

### 4. Buat Service Account
- Buka menu: **APIs & Services → Credentials**
- Klik **+ Create Credentials → Service Account**
- Isi nama, misal: `toko-sheets-service`
- Klik **Create and Continue**
- Di bagian Role, pilih **Basic → Editor** (atau skip, tidak wajib)
- Klik **Done**

### 5. Buat Key JSON untuk Service Account
- Klik nama service account yang baru dibuat
- Buka tab **Keys**
- Klik **Add Key → Create New Key**
- Pilih format **JSON**
- Klik **Create** → file `.json` akan terdownload otomatis

### 6. Simpan informasi dari file JSON
Buka file JSON yang terdownload. Catat nilai dari field berikut:
- `client_email` → ini adalah `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` → ini adalah `GOOGLE_PRIVATE_KEY`

Contoh file JSON:
```json
{
  "type": "service_account",
  "client_email": "toko-sheets-service@toko-eyang-tono.iam.gserviceaccount.com",
  "private_key": "-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----\n",
  ...
}
```

### 7. Share Google Sheets ke Service Account
- Buka Google Sheets: `https://docs.google.com/spreadsheets/d/1EhTwhI6dZId6jd6JZawe1QjatEAuGujFOj-Rr5XnNPQ/edit`
- Klik tombol **Share** (pojok kanan atas)
- Masukkan `client_email` dari file JSON tadi (contoh: `toko-sheets-service@toko-eyang-tono.iam.gserviceaccount.com`)
- Set permission ke **Editor**
- Klik **Send** (atau **Share**)

---

## Konfigurasi Environment Variables

### Untuk development lokal

1. Copy file `.env.local.example` menjadi `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` dan isi nilai yang benar:
   ```env
   GOOGLE_SPREADSHEET_ID=1EhTwhI6dZId6jd6JZawe1QjatEAuGujFOj-Rr5XnNPQ
   GOOGLE_SERVICE_ACCOUNT_EMAIL=toko-sheets-service@toko-eyang-tono.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----\n"
   JWT_SECRET=buat-string-random-panjang-minimal-32-karakter
   ```

   > **Penting untuk `GOOGLE_PRIVATE_KEY`:**
   > - Salin seluruh nilai `private_key` dari file JSON
   > - Pastikan `\n` dalam private key **tidak** diubah menjadi newline sungguhan
   > - Nilai harus dibungkus tanda kutip ganda `"..."`

3. Generate `JWT_SECRET` yang aman:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

---

## Menjalankan Lokal

```bash
# Install dependencies
npm install

# Jalankan development server
npm run dev
```

Buka `http://localhost:3000` di browser.

---

## Deploy ke Vercel

### 1. Push ke GitHub
Pastikan project ini sudah ada di repository GitHub Anda.

> **Jangan push** file `.env.local` ke GitHub! Pastikan `.env.local` ada di `.gitignore`.

### 2. Import ke Vercel
- Buka [https://vercel.com/new](https://vercel.com/new)
- Klik **Import Git Repository**
- Pilih repository ini
- Klik **Import**

### 3. Tambahkan Environment Variables di Vercel
Sebelum deploy, tambahkan environment variables di Vercel:
- Di halaman konfigurasi deployment, buka bagian **Environment Variables**
- Tambahkan satu per satu:

| Name | Value |
|------|-------|
| `GOOGLE_SPREADSHEET_ID` | `1EhTwhI6dZId6jd6JZawe1QjatEAuGujFOj-Rr5XnNPQ` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | email service account |
| `GOOGLE_PRIVATE_KEY` | private key lengkap (dengan `\n`) |
| `JWT_SECRET` | string random aman |

> **Penting untuk `GOOGLE_PRIVATE_KEY` di Vercel:**
> - Salin langsung dari file JSON
> - Vercel secara otomatis menangani newline, jadi tidak perlu mengubah `\n`
> - Jangan tambahkan tanda kutip manual di Vercel dashboard

### 4. Deploy
- Klik **Deploy**
- Tunggu proses build selesai (biasanya 2-3 menit)
- Setelah selesai, Vercel akan memberikan URL aplikasi (misal: `https://toko-eyang-tono.vercel.app`)

### 5. Verifikasi
- Buka URL yang diberikan Vercel
- Coba login dengan akun yang sudah ditambahkan di sheet `users`
- Pastikan semua fitur berjalan normal

---

## Menambah Akun User

Karena fitur registrasi tidak ada di aplikasi, akun harus ditambahkan **langsung di Google Sheets**, sheet `users`.

### Format baris user:

| Kolom | Contoh | Keterangan |
|-------|--------|------------|
| A (user_id) | `USR-001` | ID unik, bebas format |
| B (nama_user) | `Budi` | Nama lengkap |
| C (role) | `owner` | Harus salah satu: `owner`, `kasir`, `gudang` |
| D (login_id) | `budi01` | ID untuk login |
| E (password) | `pass123` | Password plain text |
| F (created_at) | `2024-01-01T00:00:00.000Z` | Boleh diisi manual atau dikosongkan |
| G (updated_at) | `2024-01-01T00:00:00.000Z` | Boleh diisi manual atau dikosongkan |
| H (status_aktif) | `aktif` | Harus `aktif` agar bisa login |

### Contoh isian:
```
USR-001 | Eyang Tono   | owner  | eyang   | tono123  | 2024-01-01 | 2024-01-01 | aktif
USR-002 | Budi Kasir   | kasir  | budi    | budi456  | 2024-01-01 | 2024-01-01 | aktif
USR-003 | Siti Gudang  | gudang | siti    | siti789  | 2024-01-01 | 2024-01-01 | aktif
```

> **Penting:** Kolom H harus berisi tepat `aktif` (huruf kecil) agar akun bisa digunakan untuk login.

---

## Troubleshooting

### Login gagal padahal data di sheet sudah benar
- Pastikan kolom H (status_aktif) berisi `aktif` (bukan `Aktif` atau `AKTIF`)
- Pastikan `login_id` di kolom D sesuai persis (case-sensitive)
- Cek apakah service account sudah di-share ke Google Sheets dengan role Editor

### Error "Cannot read properties of undefined" saat deploy
- Pastikan semua environment variables sudah diisi di Vercel dashboard
- Pastikan `GOOGLE_PRIVATE_KEY` tidak ada karakter yang terpotong

### Data tidak tersimpan ke Google Sheets
- Cek log di Vercel (tab **Logs** di project Vercel)
- Pastikan service account memiliki akses **Editor** ke spreadsheet
- Pastikan nama sheet persis sama: `users`, `stock_barang`, `transaksi_penjualan`, `dashboard_source`

### Stok tidak berkurang setelah transaksi
- Pastikan `id_barang` di sheet `stock_barang` konsisten (tidak ada spasi ekstra)
- Cek log error di Vercel

### Private key error
Jika muncul error terkait private key, coba format berikut di `.env.local`:
```env
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nLINE1\nLINE2\n-----END RSA PRIVATE KEY-----\n"
```
Pastikan setiap baris key dipisahkan dengan `\n` (bukan newline sungguhan).

---

## Teknologi

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Database:** Google Sheets via Google Sheets API v4
- **Auth:** JWT (jose) di HTTP-only cookie
- **Icons:** Lucide React
- **Deploy:** Vercel
