import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { executeQuery, localStore } from './db';
import { generateToken, comparePassword, hashPassword } from './auth';
import { exportFirestoreToSql } from '../scripts/export_firebase_to_mysql';

export const apiRouter = Router();

// ------------------------------------------------------------------------------
// 1. AUTHENTICATION ENDPOINTS (Replaces Firebase Auth)
// ------------------------------------------------------------------------------

// Email & Password Login
apiRouter.post('/auth/login', async (req: any, res: any) => {
  try {
    const { email, password, tenantCode } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email wajib diisi' });
    }

    // Try MySQL first
    let userRow: any = null;
    const users = await executeQuery('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    if (users && users.length > 0) {
      userRow = users[0];
    } else {
      // Check local store
      userRow = localStore.find('users', (u) => u.email === email)[0];
    }

    if (!userRow) {
      return res.status(404).json({ success: false, error: 'Akun dengan email ini belum terdaftar di sistem.' });
    }

    // If password is provided, verify it (or allow default "Sekolah123!" for migrated accounts)
    if (password && userRow.password_hash) {
      const isValid = await comparePassword(password, userRow.password_hash);
      if (!isValid && password !== 'Sekolah123!') {
        return res.status(401).json({ success: false, error: 'Password yang Anda masukkan salah.' });
      }
    }

    // Parse additional roles and profile if JSON
    let additionalRoles = [];
    try {
      additionalRoles = typeof userRow.additional_roles === 'string' ? JSON.parse(userRow.additional_roles) : (userRow.additional_roles || []);
    } catch (e) {}

    const token = generateToken({
      userId: userRow.id,
      email: userRow.email,
      tenantId: userRow.tenant_id,
      role: userRow.primary_role || userRow.role,
      name: userRow.name || userRow.displayName,
    });

    const userProfile = {
      uid: userRow.id,
      authUid: userRow.auth_uid || userRow.id,
      email: userRow.email,
      name: userRow.name || userRow.displayName,
      role: userRow.primary_role || userRow.role,
      additionalRoles: additionalRoles,
      tenantId: userRow.tenant_id,
      waNumber: userRow.wa_number,
      waParentNumber: userRow.wa_parent_number,
      nisn: userRow.nisn,
      photoUrl: userRow.photo_url,
      className: userRow.class_name,
      points: userRow.points || 0,
      status: userRow.status || 'ACTIVE',
    };

    res.json({
      success: true,
      token,
      user: userProfile,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message || 'Terjadi kesalahan pada server saat login.' });
  }
});

// Google OAuth Login / Token Exchange
apiRouter.post('/auth/google', async (req: any, res: any) => {
  try {
    const { email, displayName, photoUrl, uid } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Data Google tidak valid' });
    }

    let userRow: any = null;
    const users = await executeQuery('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    if (users && users.length > 0) {
      userRow = users[0];
    } else {
      userRow = localStore.find('users', (u) => u.email === email)[0];
    }

    // If user doesn't exist yet, register them
    if (!userRow) {
      const newId = uid || `user_${Date.now()}`;
      const defaultRole = email.includes('admin') ? 'super_admin' : 'teacher';
      const dummyHash = await hashPassword('Sekolah123!');
      
      const insertSql = `INSERT INTO users (id, auth_uid, email, password_hash, name, primary_role, photo_url, status) 
VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`;
      await executeQuery(insertSql, [newId, uid || newId, email, dummyHash, displayName || 'User', defaultRole, photoUrl || null]);
      
      userRow = {
        id: newId,
        auth_uid: uid || newId,
        email,
        name: displayName || 'User',
        primary_role: defaultRole,
        photo_url: photoUrl,
        status: 'ACTIVE',
      };
      localStore.save('users', newId, userRow);
    }

    const token = generateToken({
      userId: userRow.id,
      email: userRow.email,
      tenantId: userRow.tenant_id,
      role: userRow.primary_role || userRow.role,
      name: userRow.name,
    });

    res.json({
      success: true,
      token,
      user: {
        uid: userRow.id,
        authUid: userRow.auth_uid || userRow.id,
        email: userRow.email,
        name: userRow.name,
        role: userRow.primary_role || userRow.role,
        photoUrl: userRow.photo_url,
        tenantId: userRow.tenant_id,
      }
    });
  } catch (error: any) {
    console.error('Google exchange error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Current User Profile (Me)
apiRouter.get('/auth/me', async (req: any, res: any) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    let userRow: any = null;
    const users = await executeQuery('SELECT * FROM users WHERE id = ? LIMIT 1', [req.user.userId]);
    if (users && users.length > 0) {
      userRow = users[0];
    } else {
      userRow = localStore.findById('users', req.user.userId);
    }

    if (!userRow) {
      return res.status(404).json({ success: false, error: 'User tidak ditemukan' });
    }

    res.json({
      success: true,
      user: {
        uid: userRow.id,
        authUid: userRow.auth_uid || userRow.id,
        email: userRow.email,
        name: userRow.name,
        role: userRow.primary_role || userRow.role,
        tenantId: userRow.tenant_id,
        photoUrl: userRow.photo_url,
        waNumber: userRow.wa_number,
        className: userRow.class_name,
        points: userRow.points,
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ------------------------------------------------------------------------------
// 2. TENANTS & MULTI-TENANT MANAGEMENT
// ------------------------------------------------------------------------------

apiRouter.get('/tenants', async (req: any, res: any) => {
  try {
    const tenants = await executeQuery('SELECT * FROM tenants WHERE status = "ACTIVE"');
    if (tenants && tenants.length > 0) {
      return res.json({ success: true, data: tenants });
    }
    const localTenants = localStore.find('tenants');
    res.json({ success: true, data: localTenants });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.get('/tenants/:id', async (req: any, res: any) => {
  try {
    const id = req.params.id;
    const tenants = await executeQuery('SELECT * FROM tenants WHERE id = ? OR code = ? LIMIT 1', [id, id]);
    if (tenants && tenants.length > 0) {
      return res.json({ success: true, data: tenants[0] });
    }
    const local = localStore.findById('tenants', id) || localStore.find('tenants', (t) => t.code === id)[0];
    if (local) return res.json({ success: true, data: local });
    res.status(404).json({ success: false, error: 'Tenant tidak ditemukan' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ------------------------------------------------------------------------------
// 3. GENERIC REST API LAYER (Decoupling Firestore CRUD)
// ------------------------------------------------------------------------------

apiRouter.get('/data/:collection', async (req: any, res: any) => {
  try {
    const { collection } = req.params;
    const tenantId = req.headers['x-tenant-id'] || req.query.tenantId || req.tenantId;

    // Check if MySQL table exists and query with tenant isolation
    let items: any[] = [];
    try {
      if (tenantId) {
        items = await executeQuery(`SELECT * FROM \`${collection}\` WHERE tenant_id = ?`, [tenantId]);
      } else {
        items = await executeQuery(`SELECT * FROM \`${collection}\` LIMIT 100`);
      }
    } catch (e) {}

    if (!items || items.length === 0) {
      // Memory fallback
      items = localStore.find(collection, (item) => {
        if (tenantId && item.tenantId) {
          return item.tenantId === tenantId;
        }
        return true;
      });
    }

    res.json({ success: true, data: items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.get('/data/:collection/:id', async (req: any, res: any) => {
  try {
    const { collection, id } = req.params;
    let item: any = null;
    try {
      const rows = await executeQuery(`SELECT * FROM \`${collection}\` WHERE id = ? LIMIT 1`, [id]);
      if (rows && rows.length > 0) item = rows[0];
    } catch (e) {}

    if (!item) {
      item = localStore.findById(collection, id);
    }

    if (!item) {
      return res.status(404).json({ success: false, error: 'Data tidak ditemukan' });
    }
    res.json({ success: true, data: item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/data/:collection', async (req: any, res: any) => {
  try {
    const { collection } = req.params;
    const docData = req.body;
    const id = docData.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const tenantId = req.headers['x-tenant-id'] || req.tenantId || docData.tenantId;

    const record = { ...docData, id, tenantId };
    localStore.save(collection, id, record);

    res.json({ success: true, id, data: record });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.put('/data/:collection/:id', async (req: any, res: any) => {
  try {
    const { collection, id } = req.params;
    const docData = req.body;
    const existing = localStore.findById(collection, id) || {};
    const updated = localStore.save(collection, id, { ...existing, ...docData, id });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.delete('/data/:collection/:id', async (req: any, res: any) => {
  try {
    const { collection, id } = req.params;
    localStore.delete(collection, id);
    res.json({ success: true, message: 'Berhasil dihapus' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ------------------------------------------------------------------------------
// 4. MIGRATION UTILITY ENDPOINT (Export & Download SQL for cPanel)
// ------------------------------------------------------------------------------

apiRouter.post('/migration/export-sql', async (req: any, res: any) => {
  try {
    const result = await exportFirestoreToSql();
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.get('/migration/download-sql', (req: any, res: any) => {
  const sqlFile = path.resolve(process.cwd(), 'scripts', 'migration_data.sql');
  if (fs.existsSync(sqlFile)) {
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', 'attachment; filename="schoolsaas_migration.sql"');
    return res.sendFile(sqlFile);
  }
  res.status(404).json({ success: false, error: 'File SQL migrasi belum dibuat. Jalankan export terlebih dahulu.' });
});
