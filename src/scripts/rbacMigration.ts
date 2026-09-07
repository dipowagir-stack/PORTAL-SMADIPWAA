import { collection, doc, writeBatch, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Role, Permission, RolePermission, UserRole } from '../types/rbac';

const SEED_ROLES: Role[] = [
  { id: 'super_admin', name: 'Super Administrator', description: 'Full access to all modules', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'admin', name: 'Administrator', description: 'System administrator', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'teacher', name: 'Teacher', description: 'Teaching staff', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'student', name: 'Student', description: 'Enrolled student', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'parent', name: 'Parent', description: 'Parent/Guardian', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'curriculum', name: 'Curriculum', description: 'Curriculum management', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'bendahara', name: 'Finance', description: 'Finance management', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'tu', name: 'Tata Usaha', description: 'Administration', createdAt: Date.now(), updatedAt: Date.now() }
];

const SEED_PERMISSIONS: Permission[] = [
  // Student
  { id: 'student:read', name: 'View Students', module: 'Student', description: 'View student data', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'student:write', name: 'Manage Students', module: 'Student', description: 'Create and update student data', createdAt: Date.now(), updatedAt: Date.now() },
  // Teacher
  { id: 'teacher:read', name: 'View Teachers', module: 'Teacher', description: 'View teacher data', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'teacher:write', name: 'Manage Teachers', module: 'Teacher', description: 'Create and update teacher data', createdAt: Date.now(), updatedAt: Date.now() },
  // Academic
  { id: 'academic:read', name: 'View Academic Data', module: 'Academic', description: 'View academic data', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'academic:write', name: 'Manage Academic Data', module: 'Academic', description: 'Create and update academic data', createdAt: Date.now(), updatedAt: Date.now() },
  // Finance
  { id: 'finance:read', name: 'View Finance Data', module: 'Finance', description: 'View finance records', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'finance:write', name: 'Manage Finance', module: 'Finance', description: 'Manage finance records', createdAt: Date.now(), updatedAt: Date.now() },
  // Settings
  { id: 'settings:read', name: 'View Settings', module: 'Settings', description: 'View system settings', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'settings:write', name: 'Manage Settings', module: 'Settings', description: 'Manage system settings', createdAt: Date.now(), updatedAt: Date.now() },
  // Dashboard
  { id: 'dashboard:access', name: 'Access Dashboard', module: 'System', description: 'Access main dashboard', createdAt: Date.now(), updatedAt: Date.now() }
];

const SEED_ROLE_PERMISSIONS: Partial<RolePermission>[] = [
  // Super Admin gets everything
  ...SEED_PERMISSIONS.map(p => ({ roleId: 'super_admin', permissionId: p.id })),
  
  // Teacher
  { roleId: 'teacher', permissionId: 'dashboard:access' },
  { roleId: 'teacher', permissionId: 'student:read' },
  
  // Student
  { roleId: 'student', permissionId: 'dashboard:access' },
  
  // Parent
  { roleId: 'parent', permissionId: 'dashboard:access' },
  
  // Curriculum
  { roleId: 'curriculum', permissionId: 'dashboard:access' },
  { roleId: 'curriculum', permissionId: 'academic:read' },
  { roleId: 'curriculum', permissionId: 'academic:write' },
  { roleId: 'curriculum', permissionId: 'teacher:read' },
  
  // Bendahara
  { roleId: 'bendahara', permissionId: 'dashboard:access' },
  { roleId: 'bendahara', permissionId: 'finance:read' },
  { roleId: 'bendahara', permissionId: 'finance:write' },
  
  // TU
  { roleId: 'tu', permissionId: 'dashboard:access' },
  { roleId: 'tu', permissionId: 'student:read' },
  { roleId: 'tu', permissionId: 'teacher:read' }
];

export async function migrateRBAC() {
  console.log("Starting RBAC Migration...");
  let batch = writeBatch(db);
  let opCount = 0;
  
  const commitBatch = async () => {
    if (opCount > 0) {
      await batch.commit();
      batch = writeBatch(db);
      opCount = 0;
    }
  };

  const checkBatch = async () => {
    if (opCount >= 450) {
      await commitBatch();
    }
  };

  try {
    // 1. Seed Roles
    for (const role of SEED_ROLES) {
      const ref = doc(db, 'roles', role.id);
      batch.set(ref, role, { merge: true });
      opCount++;
      await checkBatch();
    }
    console.log("Seeded Roles.");

    // 2. Seed Permissions
    for (const perm of SEED_PERMISSIONS) {
      const ref = doc(db, 'permissions', perm.id);
      batch.set(ref, perm, { merge: true });
      opCount++;
      await checkBatch();
    }
    console.log("Seeded Permissions.");

    // 3. Seed RolePermissions
    for (const rp of SEED_ROLE_PERMISSIONS) {
      const id = `${rp.roleId}_${rp.permissionId}`;
      const ref = doc(db, 'role_permissions', id);
      batch.set(ref, {
        id,
        roleId: rp.roleId,
        permissionId: rp.permissionId,
        createdAt: Date.now()
      }, { merge: true });
      opCount++;
      await checkBatch();
    }
    console.log("Seeded RolePermissions.");

    // 4. Migrate Users
    const usersSnap = await getDocs(collection(db, 'users'));
    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      
      // Primary Role
      if (userData.role) {
        const urId = `${userDoc.id}_${userData.role}`;
        const urRef = doc(db, 'user_roles', urId);
        batch.set(urRef, {
          id: urId,
          userId: userDoc.id,
          roleId: userData.role,
          createdAt: Date.now()
        }, { merge: true });
        opCount++;
        await checkBatch();
      }

      // Additional Roles
      if (userData.additionalRoles && Array.isArray(userData.additionalRoles)) {
        for (const role of userData.additionalRoles) {
          const urId = `${userDoc.id}_${role}`;
          const urRef = doc(db, 'user_roles', urId);
          batch.set(urRef, {
            id: urId,
            userId: userDoc.id,
            roleId: role,
            createdAt: Date.now()
          }, { merge: true });
          opCount++;
          await checkBatch();
        }
      }
    }
    console.log("Migrated Users to user_roles.");

    await commitBatch();
    console.log("RBAC Migration completed successfully.");
    return { success: true, message: "Migration completed successfully." };
  } catch (error: any) {
    console.error("Migration failed:", error);
    return { success: false, error: error.message };
  }
}

export async function rollbackRBAC() {
  console.log("Starting RBAC Rollback...");
  const collectionsToClear = ['roles', 'permissions', 'role_permissions', 'user_roles'];
  
  try {
    for (const collName of collectionsToClear) {
      const snap = await getDocs(collection(db, collName));
      let batch = writeBatch(db);
      let opCount = 0;
      
      for (const d of snap.docs) {
        batch.delete(d.ref);
        opCount++;
        if (opCount >= 450) {
          await batch.commit();
          batch = writeBatch(db);
          opCount = 0;
        }
      }
      
      if (opCount > 0) {
        await batch.commit();
      }
      console.log(`Cleared collection: ${collName}`);
    }
    
    console.log("RBAC Rollback completed.");
    return { success: true, message: "Rollback completed successfully." };
  } catch (error: any) {
    console.error("Rollback failed:", error);
    return { success: false, error: error.message };
  }
}
