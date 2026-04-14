# Toko Kalimantan - Web App Manajemen Stok & Penjualan

Aplikasi web berbasis Next.js untuk pengelolaan stok barang, transaksi penjualan, dan pengeluaran usaha, dengan Google Sheets sebagai database utama.

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
- Histori penjualan per transaksi
- Dashboard owner (stok aktif, omzet, laba, transaksi terbaru)
- Pencatatan pengeluaran usaha
- Audit log (siapa input/edit, kapan)
- Sinkronisasi otomatis ke Google Sheets
- Tampilan mobile-friendly, dioptimalkan untuk tablet

---

## Struktur Akses

| Halaman | Owner | Gudang | Kasir |
|---|:---:|:---:|:---:|
| Dashboard | Ya | Tidak | Tidak |
| Stok Barang | Ya | Ya | Tidak |
| Pengeluaran | Ya | Tidak | Tidak |
| Kasir | Ya | Tidak | Ya |
| Histori | Ya | Ya | Tidak |

---

## Prasyarat

- Node.js v18 atau lebih baru
- Akun Google
- Akun Vercel
- Google Sheets yang sudah disiapkan

---

## Setup Google Sheets

### 1. Buka Google Sheets yang sudah ada

Link: `https://docs.google.com/spreadsheets/d/1EhTwhI6dZId6jd6JZawe1QjatEAuGujFOj-Rr5XnNPQ/edit`

### 2. Buat 5 sheet berikut

#### Sheet 1: `users`

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| user_id | nama_user | role | login_id | password | created_at | updated_at | status_aktif |

#### Sheet 2: `stock_barang`

| A | B | C | D | E | F | G | H | I | J | K | L |
|---|---|---|---|---|---|---|---|---|---|---|---|
| id_barang | nama_barang | tanggal_masuk | jumlah_stok | status_barang | notes | harga_jual | harga_modal | created_at | updated_at | created_by | updated_by |

#### Sheet 3: `transaksi_penjualan`

| A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| id_transaksi | tanggal_transaksi | id_barang | nama_barang | qty | harga_jual | harga_modal | total_item | total_transaksi | metode_pembayaran | nama_pembeli | no_hp_pembeli | created_at | updated_at | created_by | updated_by |

#### Sheet 4: `expense`

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| id_expense | tanggal | kategori | kategori_lainnya | nominal | penerima_uang | notes | created_at | updated_at | created_by | updated_by |

#### Sheet 5: `dashboard_source`

Sheet ini opsional dan boleh dibiarkan kosong. Dashboard dihitung langsung dari data transaksi dan stok.

### 3. Tambahkan baris header di baris pertama

Pastikan setiap sheet memakai header persis seperti tabel di atas.

---

## Setup Google Cloud & Service Account

### 1. Buka Google Cloud Console

Buka [https://console.cloud.google.com](https://console.cloud.google.com)

### 2. Buat project baru

- Klik dropdown project di kiri atas
- Klik **New Project**
- Beri nama, misalnya `toko-kalimantan`
- Klik **Create**

### 3. Aktifkan Google Sheets API

- Pastikan project yang baru sudah aktif
- Buka **APIs & Services > Library**
- Cari `Google Sheets API`
- Klik **Enable**

### 4. Buat service account

- Buka **APIs & Services > Credentials**
- Klik **Create Credentials > Service Account**
- Isi nama, misalnya `toko-sheets-service`
- Klik **Create and Continue**
- Role bisa pilih **Editor** atau dilewati
- Klik **Done**

### 5. Buat key JSON

- Klik service account yang baru dibuat
- Buka tab **Keys**
- Klik **Add Key > Create New Key**
- Pilih format **JSON**
- Klik **Create**

### 6. Ambil data dari file JSON

Catat nilai berikut:

- `client_email` untuk `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` untuk `GOOGLE_PRIVATE_KEY`

Contoh:

```json
{
  "type": "service_account",
  "client_email": "toko-sheets-service@toko-kalimantan.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
}
```

### 7. Share Google Sheets ke service account

- Buka spreadsheet
- Klik **Share**
- Masukkan email service account
- Beri akses **Editor**
- Klik **Send**

---

## Konfigurasi Environment Variables

### Untuk development lokal

1. Copy `.env.local.example` menjadi `.env.local`

```bash
cp .env.local.example .env.local
```

2. Isi nilainya:

```env
GOOGLE_SPREADSHEET_ID=1EhTwhI6dZId6jd6JZawe1QjatEAuGujFOj-Rr5XnNPQ
GOOGLE_SERVICE_ACCOUNT_EMAIL=toko-sheets-service@toko-kalimantan.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
JWT_SECRET=buat-string-random-panjang-minimal-32-karakter
```

Catatan:

- Salin `private_key` lengkap dari file JSON
- Biarkan pemisah baris tetap dalam bentuk `\n`
- Bungkus `GOOGLE_PRIVATE_KEY` dengan tanda kutip ganda

3. Generate `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Menjalankan Lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

---

## Deploy ke Vercel

### 1. Push ke GitHub

Pastikan `.env.local` tidak ikut ter-push.

### 2. Import ke Vercel

- Buka [https://vercel.com/new](https://vercel.com/new)
- Import repository ini

### 3. Tambahkan environment variables

Tambahkan:

- `GOOGLE_SPREADSHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `JWT_SECRET`

Untuk `GOOGLE_PRIVATE_KEY` di Vercel, tempel langsung nilainya dari file JSON.

### 4. Deploy

Setelah deploy selesai, Anda akan mendapat URL aplikasi, misalnya `https://toko-kalimantan.vercel.app`.

### 5. Verifikasi

- Coba login
- Coba tambah stok
- Coba simpan transaksi
- Coba tambah pengeluaran

---

## Menambah Akun User

Karena tidak ada fitur registrasi, akun ditambahkan langsung di sheet `users`.

| Kolom | Contoh | Keterangan |
|---|---|---|
| A (user_id) | `USR-001` | ID unik |
| B (nama_user) | `Admin Kalimantan` | Nama lengkap |
| C (role) | `owner` | `owner`, `kasir`, atau `gudang` |
| D (login_id) | `admin` | ID login |
| E (password) | `admin123` | Password plain text |
| F (created_at) | `2024-01-01T00:00:00.000Z` | Boleh kosong |
| G (updated_at) | `2024-01-01T00:00:00.000Z` | Boleh kosong |
| H (status_aktif) | `aktif` | Wajib `aktif` |

Contoh:

```text
USR-001 | Admin Kalimantan | owner  | admin | admin123 | 2024-01-01 | 2024-01-01 | aktif
USR-002 | Budi Kasir       | kasir  | budi  | budi456  | 2024-01-01 | 2024-01-01 | aktif
USR-003 | Siti Gudang      | gudang | siti  | siti789  | 2024-01-01 | 2024-01-01 | aktif
```

---

## Troubleshooting

### Login gagal

- Pastikan `status_aktif` berisi `aktif`
- Pastikan `login_id` cocok persis
- Pastikan service account sudah diberi akses ke spreadsheet

### Data tidak tersimpan

- Cek log Vercel
- Pastikan nama sheet persis: `users`, `stock_barang`, `transaksi_penjualan`, `expense`, `dashboard_source`
- Pastikan service account punya akses editor

### Private key error

Gunakan format:

```env
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nLINE1\nLINE2\n-----END PRIVATE KEY-----\n"
```

### Build atau deploy error

- Pastikan semua environment variables sudah terisi
- Pastikan `GOOGLE_PRIVATE_KEY` tidak terpotong

---

## Teknologi

- Next.js 14
- Tailwind CSS
- Google Sheets API v4
- JWT (`jose`) di HTTP-only cookie
- Lucide React
- Vercel
