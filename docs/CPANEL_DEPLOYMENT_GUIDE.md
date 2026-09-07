# Panduan Lengkap Deploy & Migrasi Mandiri SchoolSaaS ke cPanel (MySQL/MariaDB)

Dokumen ini adalah panduan teknis langkah-demi-langkah bagi Administrator Sistem untuk menjalankan **SchoolSaaS** secara mandiri (self-hosted) di cPanel tanpa ketergantungan pada Google Firebase.

---

## 1. Arsitektur Multi-Tenant ("Hotel & Kamar")

Aplikasi menggunakan arsitektur multi-tenant berbasis diskriminator `tenant_id`:
- **Master Platform ("Hotel")**: Tabel `tenants` menyimpan profil setiap sekolah, kuota, masa aktif lisensi, dan sub-domain.
- **Kamar Terisolasi ("Kamar")**: Setiap data siswa, guru, kelas, transaksi keuangan, modul, dan penilaian wajib memiliki `tenant_id` yang terisolasi.
- **Keamanan Lapis Ganda**: API server secara otomatis memvalidasi `tenant_id` dari header `X-Tenant-Id` dan token otentikasi JWT.

---

## 2. Persiapan Database di cPanel

1. **Buka cPanel** dan masuk ke menu **MySQL® Databases** atau **MySQL® Database Wizard**.
2. Buat database baru, misalnya: `namacpanel_schoolsaas`.
3. Buat pengguna database (misal: `namacpanel_dbuser`) beserta kata sandi yang aman.
4. Hubungkan pengguna tersebut ke database dengan memberikan centang pada **ALL PRIVILEGES**.
5. Buka **phpMyAdmin** dari dashboard cPanel:
   - Pilih database `namacpanel_schoolsaas`.
   - Klik tab **Import**.
   - Pilih file `scripts/schema.sql` terlebih dahulu untuk membuat seluruh tabel relasional.
   - Klik **Go/Kirim** hingga proses import berhasil.
   - Ulangi proses import untuk file `scripts/migration_data.sql` (berisi seluruh 293+ data akun terdaftar, profil sekolah, dan data akademik).

---

## 3. Konfigurasi Lingkungan (`.env`)

Pada root folder aplikasi di cPanel (atau via File Manager), buat atau edit file `.env`:

```env
# Server
PORT=3000
NODE_ENV=production

# Database MySQL / MariaDB cPanel
DB_HOST=localhost
DB_PORT=3306
DB_USER=namacpanel_dbuser
DB_PASSWORD=PasswordDatabaseAnda!
DB_NAME=namacpanel_schoolsaas

# Autentikasi JWT
JWT_SECRET=rahasia_jwt_schoolsaas_enterprise_kunci_keamanan_2026

# AI Fitur (Opsional - jika menggunakan analisa kalender)
GEMINI_API_KEY=
```

---

## 4. Setup Node.js App di cPanel

1. Di cPanel, cari dan buka fitur **Setup Node.js App** (CloudLinux / Phusion Passenger).
2. Klik tombol **Create Application**.
3. Isi formulir konfigurasi:
   - **Node.js version**: Pilih versi **18.x** atau **20.x** (LTS direkomendasikan).
   - **Application mode**: `Production`
   - **Application root**: folder tempat Anda mengunggah source code (misal: `schoolsaas` atau `public_html/saas`).
   - **Application URL**: domain atau subdomain Anda (misal: `app.sekolahanda.sch.id`).
   - **Application startup file**: `server.ts` atau `dist/server.cjs`.
4. Klik **Create**.
5. Masuk ke terminal SSH atau klik **Run NPM Install** pada panel cPanel untuk menginstal dependensi.
6. Jalankan build:
   ```bash
   npm run build
   ```
7. Klik **Restart** pada aplikasi Node.js Anda di cPanel.

---

## 5. Login & Akun Terdaftar (Zero Data Loss)

Seluruh akun pengguna dari Firebase telah dimigrasikan ke MySQL:
- **Metode Login**:
  1. **Email & Password**: Pengguna dapat langsung memasukkan email terdaftar mereka.
  2. **Password Bawaan Migrasi**: Untuk akun yang dimigrasikan dari Firebase, password awal disetel ke:
     ```
     Sekolah123!
     ```
     *(Pengguna dapat mengganti password ini setelah berhasil login).*
  3. **Google Sign-In**: Tetap didukung secara opsional jika sekolah mengaktifkan Google OAuth.

---

## 6. Verifikasi & Pengujian
- Buka URL aplikasi di peramban.
- Coba login menggunakan akun Administrator atau Guru.
- Periksa bahwa dashboard sekolah dan data murid tampil dengan lengkap.
