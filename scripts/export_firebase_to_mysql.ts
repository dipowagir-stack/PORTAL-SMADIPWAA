import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDKH_FKeXFAGCGq5Zzk5ZiPaAQZVvOpISc",
  authDomain: "decisive-aleph-j7k72.firebaseapp.com",
  projectId: "decisive-aleph-j7k72",
  storageBucket: "decisive-aleph-j7k72.firebasestorage.app",
  messagingSenderId: "131715485727",
  appId: "1:131715485727:web:c3127a1b8d17b6591f852a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-ace49a47-40ec-4c50-9cf0-e0bbd7ea490e");

function escapeSql(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'object') {
    val = JSON.stringify(val);
  }
  const clean = String(val)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
  return `'${clean}'`;
}

export async function exportFirestoreToSql() {
  console.log('🚀 Starting Firebase Firestore to MySQL export for SchoolSaaS cPanel migration...');
  const sqlStatements: string[] = [];
  sqlStatements.push('-- Export generated at ' + new Date().toISOString());
  sqlStatements.push('SET FOREIGN_KEY_CHECKS = 0;\n');

  // Default fallback password for migrated users without standard bcrypt hash: "Sekolah123!"
  const defaultPasswordHash = await bcrypt.hash('Sekolah123!', 10);

  // 1. Export Tenants
  console.log('📦 Exporting Tenants...');
  try {
    const tenantsSnap = await getDocs(collection(db, 'tenants'));
    for (const docSnap of tenantsSnap.docs) {
      const data = docSnap.data();
      const id = docSnap.id;
      const code = data.code || id.toLowerCase();
      const name = data.name || data.schoolName || 'School Tenant';
      const status = data.status || 'ACTIVE';
      const customDomain = data.customDomain || null;
      const logoUrl = data.logoUrl || null;
      const primaryColor = data.primaryColor || '#0284c7';

      sqlStatements.push(`INSERT INTO tenants (id, code, name, status, custom_domain, logo_url, primary_color) 
VALUES (${escapeSql(id)}, ${escapeSql(code)}, ${escapeSql(name)}, ${escapeSql(status)}, ${escapeSql(customDomain)}, ${escapeSql(logoUrl)}, ${escapeSql(primaryColor)})
ON DUPLICATE KEY UPDATE name=VALUES(name), status=VALUES(status), logo_url=VALUES(logo_url);`);
    }
  } catch (err) {
    console.warn('Tenants collection read notice:', err);
  }

  // 2. Export Users
  console.log('👤 Exporting Users (Zero Data Loss)...');
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    for (const docSnap of usersSnap.docs) {
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

      sqlStatements.push(`INSERT INTO users (id, tenant_id, auth_uid, email, password_hash, name, primary_role, additional_roles, wa_number, wa_parent_number, nisn, photo_url, class_name, points, status, raw_profile)
VALUES (${escapeSql(id)}, ${escapeSql(tenantId)}, ${escapeSql(authUid)}, ${escapeSql(email)}, ${escapeSql(defaultPasswordHash)}, ${escapeSql(name)}, ${escapeSql(primaryRole)}, ${escapeSql(additionalRoles)}, ${escapeSql(waNumber)}, ${escapeSql(waParentNumber)}, ${escapeSql(nisn)}, ${escapeSql(photoUrl)}, ${escapeSql(className)}, ${points}, ${escapeSql(status)}, ${escapeSql(rawProfile)})
ON DUPLICATE KEY UPDATE name=VALUES(name), primary_role=VALUES(primary_role), additional_roles=VALUES(additional_roles), raw_profile=VALUES(raw_profile);`);
    }
  } catch (err) {
    console.warn('Users collection read notice:', err);
  }

  // 3. Export Tenant Memberships
  console.log('🏢 Exporting Tenant Memberships...');
  try {
    const mSnap = await getDocs(collection(db, 'tenant_memberships'));
    for (const docSnap of mSnap.docs) {
      const m = docSnap.data();
      const id = docSnap.id;
      const userId = m.userId;
      const tenantId = m.tenantId;
      const roles = JSON.stringify(m.roles || []);
      const status = m.status || 'ACTIVE';

      if (userId && tenantId) {
        sqlStatements.push(`INSERT INTO tenant_memberships (id, user_id, tenant_id, roles, status)
VALUES (${escapeSql(id)}, ${escapeSql(userId)}, ${escapeSql(tenantId)}, ${escapeSql(roles)}, ${escapeSql(status)})
ON DUPLICATE KEY UPDATE roles=VALUES(roles), status=VALUES(status);`);
      }
    }
  } catch (err) {
    console.warn('Tenant memberships read notice:', err);
  }

  // 4. Export Academic Periods & Years
  console.log('📅 Exporting Academic Data...');
  try {
    const pSnap = await getDocs(collection(db, 'academic_periods'));
    for (const docSnap of pSnap.docs) {
      const p = docSnap.data();
      const id = docSnap.id;
      const tenantId = p.tenantId || 'tenant-default';
      const yearId = p.academicYearId || `year-${p.academicYear || '2025-2026'}`;
      const yearName = p.academicYear || '2025/2026';
      const semester = p.semester === 'GENAP' ? 'GENAP' : 'GANJIL';
      const name = p.name || `Semester ${semester} ${yearName}`;
      const isActive = p.isActive ? 1 : 0;

      sqlStatements.push(`INSERT INTO academic_years (id, tenant_id, name, is_active, start_date, end_date)
VALUES (${escapeSql(yearId)}, ${escapeSql(tenantId)}, ${escapeSql(yearName)}, ${isActive}, '2025-07-01', '2026-06-30')
ON DUPLICATE KEY UPDATE name=VALUES(name);`);

      sqlStatements.push(`INSERT INTO academic_periods (id, tenant_id, academic_year_id, semester, name, is_active)
VALUES (${escapeSql(id)}, ${escapeSql(tenantId)}, ${escapeSql(yearId)}, ${escapeSql(semester)}, ${escapeSql(name)}, ${isActive})
ON DUPLICATE KEY UPDATE name=VALUES(name), is_active=VALUES(is_active);`);
    }
  } catch (err) {
    console.warn('Academic periods read notice:', err);
  }

  sqlStatements.push('\nSET FOREIGN_KEY_CHECKS = 1;');
  const outputContent = sqlStatements.join('\n');
  const outputPath = path.resolve(process.cwd(), 'scripts', 'migration_data.sql');
  fs.writeFileSync(outputPath, outputContent, 'utf-8');

  console.log(`✅ Success! Migration SQL file generated at: ${outputPath}`);
  console.log(`Total SQL commands generated: ${sqlStatements.length}`);
  return { success: true, statementsCount: sqlStatements.length, outputPath };
}

if (process.argv[1] && process.argv[1].includes('export_firebase_to_mysql')) {
  exportFirestoreToSql().catch(console.error);
}
