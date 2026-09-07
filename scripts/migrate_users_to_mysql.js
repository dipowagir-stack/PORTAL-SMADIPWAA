/**
 * Script: migrate_users_to_mysql.js
 * Deskripsi: Mengekspor data pengguna dari Firebase Firestore/Auth dan mengimpornya
 *            langsung ke tabel `users` MySQL / MariaDB (cPanel/VPS) dengan Zero Data Loss.
 *
 * Penggunaan:
 *   node scripts/migrate_users_to_mysql.js
 *   node scripts/migrate_users_to_mysql.js --dry-run
 *   node scripts/migrate_users_to_mysql.js --export-sql=scripts/users_migration.sql
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// 1. Konfigurasi Firebase (Client SDK / Web App)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyDKH_FKeXFAGCGq5Zzk5ZiPaAQZVvOpISc",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "decisive-aleph-j7k72.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "decisive-aleph-j7k72",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "decisive-aleph-j7k72.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "131715485727",
  appId: process.env.FIREBASE_APP_ID || "1:131715485727:web:c3127a1b8d17b6591f852a"
};

const DATABASE_ID = process.env.FIREBASE_DATABASE_ID || "ai-studio-ace49a47-40ec-4c50-9cf0-e0bbd7ea490e";

// 2. Konfigurasi Target MySQL Database (cPanel / Localhost)
const mysqlConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'schoolsaas',
  waitForConnections: true,
  connectionLimit: 5,
};

// Argumen baris perintah
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const exportSqlArg = args.find(a => a.startsWith('--export-sql='));
const outputSqlFile = exportSqlArg ? exportSqlArg.split('=')[1] : null;

// Helper untuk escape SQL jika menulis ke berkas .sql
function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val.toString();
  if (typeof val === 'boolean') return val ? '1' : '0';
  return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`;
}

async function runMigration() {
  console.log('===============================================================');
  console.log('🚀 SchoolSaaS - Ekspor Data Pengguna Firebase ke MySQL Users');
  console.log('===============================================================');
  console.log(`[Config] Target MySQL Database : ${mysqlConfig.user}@${mysqlConfig.host}:${mysqlConfig.port}/${mysqlConfig.database}`);
  console.log(`[Config] Mode Dry Run           : ${isDryRun ? 'AKTIF (Tidak mengubah database)' : 'NON-AKTIF (Menulis langsung)'}`);
  if (outputSqlFile) {
    console.log(`[Config] Export File SQL        : ${outputSqlFile}`);
  }
  console.log('---------------------------------------------------------------');

  // Inisialisasi Firebase
  console.log('📡 Menghubungkan ke Firebase Firestore...');
  const app = initializeApp(firebaseConfig, 'migration_runner_' + Date.now());
  const db = getFirestore(app, DATABASE_ID);

  // Buat default password hash (Bcrypt $2a$10)
  const defaultPassword = process.env.DEFAULT_USER_PASSWORD || 'Sekolah123!';
  console.log(`🔐 Menyiapkan hash kata sandi bawaan (Default: "${defaultPassword}")...`);
  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash(defaultPassword, salt);

  // Ambil data users dari Firestore
  console.log('📥 Mengunduh dokumen dari collection "users"...');
  let userDocs = [];
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    userDocs = usersSnapshot.docs;
    console.log(`✅ Berhasil mengambil ${userDocs.length} data pengguna dari Firestore.`);
  } catch (err) {
    console.error('❌ Gagal mengambil data pengguna dari Firebase:', err.message);
    process.exit(1);
  }

  if (userDocs.length === 0) {
    console.warn('⚠️ Tidak ada data pengguna yang ditemukan di Firestore users collection.');
    return;
  }

  // Siapkan data & query
  const records = [];
  const sqlStatements = [];

  for (const docSnap of userDocs) {
    const u = docSnap.data();
    const id = docSnap.id;
    const authUid = u.authUid || id;
    const email = u.email || `${id}@schoolsaas.local`;
    const name = u.name || u.displayName || 'Pengguna Sekolah';
    const tenantId = u.tenantId || null;
    const primaryRole = u.role || 'teacher';
    const additionalRoles = u.additionalRoles ? JSON.stringify(u.additionalRoles) : null;
    const waNumber = u.waNumber || null;
    const waParentNumber = u.waParentNumber || null;
    const nisn = u.nisn || null;
    const photoUrl = u.photoUrl || u.photoURL || null;
    const className = u.className || null;
    const points = typeof u.points === 'number' ? u.points : 0;
    const status = u.status || 'ACTIVE';
    const rawProfile = JSON.stringify(u);

    records.push({
      id,
      tenantId,
      authUid,
      email,
      name,
      primaryRole,
      additionalRoles,
      waNumber,
      waParentNumber,
      nisn,
      photoUrl,
      className,
      points,
      status,
      rawProfile,
      passwordHash: defaultPasswordHash
    });

    // Format SQL statement untuk output file
    const sql = `INSERT INTO users (id, tenant_id, auth_uid, email, password_hash, name, primary_role, additional_roles, wa_number, wa_parent_number, nisn, photo_url, class_name, points, status, raw_profile)
VALUES (${escapeSql(id)}, ${escapeSql(tenantId)}, ${escapeSql(authUid)}, ${escapeSql(email)}, ${escapeSql(defaultPasswordHash)}, ${escapeSql(name)}, ${escapeSql(primaryRole)}, ${escapeSql(additionalRoles)}, ${escapeSql(waNumber)}, ${escapeSql(waParentNumber)}, ${escapeSql(nisn)}, ${escapeSql(photoUrl)}, ${escapeSql(className)}, ${points}, ${escapeSql(status)}, ${escapeSql(rawProfile)})
ON DUPLICATE KEY UPDATE 
  name = VALUES(name),
  primary_role = VALUES(primary_role),
  additional_roles = VALUES(additional_roles),
  wa_number = VALUES(wa_number),
  wa_parent_number = VALUES(wa_parent_number),
  nisn = VALUES(nisn),
  photo_url = VALUES(photo_url),
  class_name = VALUES(class_name),
  points = VALUES(points),
  raw_profile = VALUES(raw_profile);`;
    sqlStatements.push(sql);
  }

  // Tampilkan contoh sampel data yang diimpor
  console.log('\n📋 Sampel data akun pengguna yang diproses:');
  console.table(
    records.slice(0, 5).map(r => ({
      ID: r.id,
      Nama: r.name,
      Email: r.email,
      Role: r.primaryRole,
      TenantID: r.tenantId || '(Global)',
      Status: r.status
    }))
  );

  // Jika diminta export ke file SQL
  if (outputSqlFile) {
    const fullContent = `-- ============================================================
-- SchoolSaaS - Dump Pengguna Firebase ke MySQL 'users'
-- Dibuat pada: ${new Date().toISOString()}
-- Total Akun: ${sqlStatements.length}
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

${sqlStatements.join('\n\n')}

SET FOREIGN_KEY_CHECKS = 1;
`;
    fs.writeFileSync(outputSqlFile, fullContent, 'utf-8');
    console.log(`\n💾 Berkas SQL berhasil disimpan ke: ${path.resolve(outputSqlFile)}`);
  }

  // Jika dry run, berhenti di sini
  if (isDryRun) {
    console.log('\n[Dry Run] Selesai. Database MySQL tidak dimodifikasi.');
    process.exit(0);
  }

  // Eksekusi insert langsung ke MySQL
  console.log('\n🔌 Membuka koneksi ke MySQL...');
  let connection = null;
  try {
    connection = await mysql.createConnection(mysqlConfig);
    console.log('✅ Terhubung ke MySQL server!');
    
    // Nonaktifkan pemeriksaan FK sementara agar jika tenant_id belum ada, insert tetap aman
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    let successCount = 0;
    let errorCount = 0;

    console.log('⏳ Mengimpor data ke tabel `users`...');
    for (const record of records) {
      const query = `
        INSERT INTO users (
          id, tenant_id, auth_uid, email, password_hash, name, primary_role, 
          additional_roles, wa_number, wa_parent_number, nisn, photo_url, 
          class_name, points, status, raw_profile
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          primary_role = VALUES(primary_role),
          additional_roles = VALUES(additional_roles),
          wa_number = VALUES(wa_number),
          wa_parent_number = VALUES(wa_parent_number),
          nisn = VALUES(nisn),
          photo_url = VALUES(photo_url),
          class_name = VALUES(class_name),
          points = VALUES(points),
          raw_profile = VALUES(raw_profile)
      `;

      const values = [
        record.id,
        record.tenantId,
        record.authUid,
        record.email,
        record.passwordHash,
        record.name,
        record.primaryRole,
        record.additionalRoles,
        record.waNumber,
        record.waParentNumber,
        record.nisn,
        record.photoUrl,
        record.className,
        record.points,
        record.status,
        record.rawProfile
      ];

      try {
        await connection.execute(query, values);
        successCount++;
      } catch (insertErr) {
        console.error(`❌ Gagal mengimpor user ${record.email} (${record.id}):`, insertErr.message);
        errorCount++;
      }
    }

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('---------------------------------------------------------------');
    console.log(`🎉 Migrasi Selesai!`);
    console.log(`✅ Berhasil diimpor/diupdate: ${successCount} akun`);
    if (errorCount > 0) {
      console.log(`⚠️ Terjadi kesalahan: ${errorCount} akun`);
    }
    console.log(`🔑 Seluruh pengguna dapat langsung login menggunakan:`);
    console.log(`   - Email masing-masing`);
    console.log(`   - Password: "${defaultPassword}"`);
    console.log('===============================================================');

  } catch (dbErr) {
    console.error('❌ Terjadi kesalahan koneksi MySQL:', dbErr.message);
    console.log('💡 Tips: Jika MySQL cPanel Anda belum diatur untuk koneksi jarak jauh (Remote MySQL),');
    console.log('   Anda dapat menggunakan flag --export-sql=scripts/users_migration.sql lalu mengimpornya via phpMyAdmin cPanel.');
  } finally {
    if (connection) {
      await connection.end();
    }
    process.exit(0);
  }
}

// Jalankan skrip
runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
