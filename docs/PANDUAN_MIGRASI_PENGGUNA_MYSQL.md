# Panduan Lengkap Migrasi Akun Pengguna dari Firebase ke MySQL (cPanel / VPS)

Panduan ini menjelaskan cara memindahkan (ekspor dan impor) seluruh data pengguna dan akun sekolah dari **Firebase (Firestore & Auth)** ke tabel relasional `users` di **MySQL / MariaDB** (cPanel / Server mandiri) secara aman tanpa kehilangan data (**Zero Data Loss**).

---

## 1. Arsitektur Akun & Pemetaan Data

Dalam sistem multi-tenant SchoolSaaS, setiap pengguna memiliki peran utama (*primary role*), profil kontak, dan asosiasi sekolah (*tenant*).

### Pemetaan Kolom Firebase ke Tabel MySQL `users`

| Field Firebase (Firestore) | Kolom MySQL `users` | Tipe Data | Keterangan |
| :--- | :--- | :--- | :--- |
| `doc.id` | `id` | `VARCHAR(64)` | ID unik dokumen / pengguna |
| `authUid` | `auth_uid` | `VARCHAR(128)` | UID autentikasi Firebase/OAuth |
| `email` | `email` | `VARCHAR(150)` | Alamat email (identitas login) |
| *(Digenerehash)* | `password_hash` | `VARCHAR(255)` | Hash Bcrypt untuk login langsung |
| `name` / `displayName` | `name` | `VARCHAR(150)` | Nama lengkap pengguna |
| `tenantId` | `tenant_id` | `VARCHAR(64)` | ID sekolah (NULL untuk Admin Global) |
| `role` | `primary_role` | `VARCHAR(50)` | Peran utama (`admin`, `teacher`, `student`, dll.) |
| `additionalRoles` | `additional_roles` | `JSON` | Peran tambahan/sekunder pengguna |
| `waNumber` | `wa_number` | `VARCHAR(30)` | Nomor WhatsApp pribadi |
| `waParentNumber` | `wa_parent_number` | `VARCHAR(30)` | Nomor WhatsApp orang tua |
| `nisn` | `nisn` | `VARCHAR(30)` | Nomor Induk Siswa Nasional |
| `photoUrl` / `photoURL` | `photo_url` | `TEXT` | URL foto profil |
| `className` | `class_name` | `VARCHAR(50)` | Nama kelas siswa (misal: "X-IPA-1") |
| `points` | `points` | `INT` | Poin reward / pelanggaran siswa |
| `status` | `status` | `ENUM` | Status akun (`ACTIVE`, `SUSPENDED`, dll.) |
| Seluruh objek dokumen | `raw_profile` | `JSON` | Cadangan data lengkap profil asli |

---

## 2. Struktur Tabel `users` di MySQL

Pastikan tabel `users` telah dibuat di database MySQL Anda. Jika belum, jalankan DDL berikut (tersedia juga di `scripts/schema.sql`):

```sql
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NULL,
    auth_uid VARCHAR(128) NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(150) NOT NULL,
    primary_role VARCHAR(50) NOT NULL,
    additional_roles JSON NULL,
    wa_number VARCHAR(30) NULL,
    wa_parent_number VARCHAR(30) NULL,
    nisn VARCHAR(30) NULL,
    photo_url TEXT NULL,
    class_name VARCHAR(50) NULL,
    points INT DEFAULT 0,
    status ENUM('INVITED', 'ACTIVE', 'SUSPENDED', 'REVOKED') DEFAULT 'ACTIVE',
    raw_profile JSON NULL,
    last_login_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_lookup (tenant_id, primary_role),
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 3. Konfigurasi Lingkungan (`.env`)

Sebelum menjalankan skrip, pastikan konfigurasi koneksi database Anda terisi di file `.env` di direktori proyek:

```env
# Konfigurasi Target MySQL (cPanel / Server Anda)
DB_HOST=localhost
DB_PORT=3306
DB_USER=namauser_cpanel
DB_PASSWORD=PasswordDatabaseAnda!
DB_NAME=namadb_cpanel

# Password Default untuk Akun yang Dimigrasi
DEFAULT_USER_PASSWORD=Sekolah123!
```

---

## 4. Menjalankan Skrip Migrasi (`migrate_users_to_mysql.js`)

Skrip terletak di `scripts/migrate_users_to_mysql.js`. Anda dapat menjalankannya dalam 3 mode berbeda:

### Mode 1: Pratinjau Data (Dry Run)
Mengecek berapa banyak akun yang terdeteksi di Firebase tanpa mengubah database MySQL:
```bash
node scripts/migrate_users_to_mysql.js --dry-run
```

### Mode 2: Ekspor ke File SQL (Sangat Disarankan untuk cPanel)
Jika MySQL di cPanel Anda tidak mengizinkan koneksi jarak jauh (*Remote MySQL*), gunakan mode ini untuk menghasilkan file `.sql` yang siap diimpor via **phpMyAdmin**:
```bash
node scripts/migrate_users_to_mysql.js --export-sql=scripts/users_migration.sql
```
*Hasilnya adalah file `scripts/users_migration.sql` yang berisi query `INSERT ... ON DUPLICATE KEY UPDATE` siap pakai.*

### Mode 3: Impor Langsung ke MySQL (Direct Execution)
Jika skrip dijalankan langsung di terminal cPanel atau server yang memiliki akses langsung ke MySQL:
```bash
node scripts/migrate_users_to_mysql.js
```

---

## 5. Cara Mengimpor File SQL via phpMyAdmin di cPanel

Jika Anda memilih mengekspor file SQL (Mode 2):

1. Buka dashboard **cPanel** hosting Anda.
2. Masuk ke menu **phpMyAdmin**.
3. Di bilah sisi kiri, klik nama database Anda (misal: `namacpanel_schoolsaas`).
4. Klik tab **Import** pada menu navigasi atas.
5. Klik tombol **Choose File / Telusuri** dan pilih file `scripts/users_migration.sql`.
6. Pastikan format terpilih adalah **SQL**.
7. Klik tombol **Go / Kirim** di bagian bawah halaman.
8. phpMyAdmin akan menampilkan pesan sukses berwarna hijau: *"Import has been successfully finished"*.

---

## 6. Bagaimana Pengguna Login Setelah Migrasi?

Akun pengguna yang dimigrasikan dari Firebase kini dapat login ke aplikasi secara mandiri dengan 2 cara:

1. **Email & Password**:
   - **Email**: Alamat email yang terdaftar sebelumnya (misal: `guru@sekolah.sch.id`).
   - **Password Awal**: `Sekolah123!` *(atau kata sandi kustom yang Anda atur di `.env`)*.
   - Pengguna disarankan memperbarui kata sandi mereka di menu profil setelah login pertama kali.
2. **Google OAuth (Opsional)**:
   - Jika pengguna sebelumnya terbiasa klik "Masuk dengan Google", mereka tetap dapat menggunakan tombol Google karena sistem telah mencocokkan `email` dan `auth_uid` yang sama persis di MySQL.

---

## 7. Penanganan Konflik & Duplikasi (Zero Data Loss)

Skrip menggunakan klausa:
```sql
ON DUPLICATE KEY UPDATE 
  name = VALUES(name),
  primary_role = VALUES(primary_role),
  additional_roles = VALUES(additional_roles), ...
```
Artinya, jika Anda menjalankan skrip ini berulang kali (misalnya ada penambahan murid baru di Firebase yang ingin disinkronkan ke MySQL), **data lama tidak akan rusak atau hilang**, melainkan hanya diperbarui (*upsert*).
