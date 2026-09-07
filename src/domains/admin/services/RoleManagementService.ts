import { doc, getDoc, updateDoc, collection, addDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Result, ok, fail } from '../../../foundation/core/Result';
import { getAllUserPermissions } from '../../../lib/rbac';
import { UserRole } from '../../../contexts/AuthContext';
import { admissionAuditService } from '../../admission/services/AdmissionAuditService';
import { virtualDatabase } from '../../../foundation/sandbox/VirtualDatabase';

export class RoleManagementService {
  
  async assignRole(actorId: string, targetUserId: string, role: UserRole): Promise<Result<void>> {
    const actorPerms = await getAllUserPermissions(actorId);
    
    if (!actorPerms.includes('admin:role:manage')) {
      let isSuperAdmin = false;
      if (virtualDatabase.isActive()) {
        const actorDoc = await virtualDatabase.getDoc('users', actorId);
        isSuperAdmin = actorDoc?.role === 'super_admin';
      } else {
        const actorDoc = await getDoc(doc(db, 'users', actorId));
        isSuperAdmin = actorDoc.exists() && actorDoc.data().role === 'super_admin';
      }
      if (!isSuperAdmin) {
        return fail('Akses ditolak: Hanya super_admin yang dapat mengelola peran pengguna.');
      }
    }

    let userData: any = null;
    if (virtualDatabase.isActive()) {
      userData = await virtualDatabase.getDoc('users', targetUserId);
    } else {
      const targetUserDoc = await getDoc(doc(db, 'users', targetUserId));
      if (targetUserDoc.exists()) {
        userData = targetUserDoc.data();
      }
    }

    if (!userData) {
      return fail('Pengguna tidak ditemukan.');
    }

    let additionalRoles = userData.additionalRoles || [];
    if (userData.role === role || additionalRoles.includes(role)) {
      return ok(undefined);
    }

    additionalRoles = [...additionalRoles, role];
    if (virtualDatabase.isActive()) {
      await virtualDatabase.updateDoc('users', targetUserId, { additionalRoles });
    } else {
      await updateDoc(doc(db, 'users', targetUserId), { additionalRoles });
    }

    if (role === 'admission_staff') {
      await admissionAuditService.log(targetUserId, 'ROLE_ASSIGNED', actorId, 'Assigned admission_staff role');
    }

    return ok(undefined);
  }

  async revokeRole(actorId: string, targetUserId: string, role: UserRole): Promise<Result<void>> {
    const actorPerms = await getAllUserPermissions(actorId);
    
    if (!actorPerms.includes('admin:role:manage')) {
      let isSuperAdmin = false;
      if (virtualDatabase.isActive()) {
        const actorDoc = await virtualDatabase.getDoc('users', actorId);
        isSuperAdmin = actorDoc?.role === 'super_admin';
      } else {
        const actorDoc = await getDoc(doc(db, 'users', actorId));
        isSuperAdmin = actorDoc.exists() && actorDoc.data().role === 'super_admin';
      }
      if (!isSuperAdmin) {
        return fail('Akses ditolak: Hanya super_admin yang dapat mengelola peran pengguna.');
      }
    }

    if (actorId === targetUserId && role === 'super_admin') {
      return fail('Akses ditolak: Anda tidak dapat mencabut peran super_admin Anda sendiri.');
    }

    let userData: any = null;
    if (virtualDatabase.isActive()) {
      userData = await virtualDatabase.getDoc('users', targetUserId);
    } else {
      const targetUserDoc = await getDoc(doc(db, 'users', targetUserId));
      if (targetUserDoc.exists()) {
        userData = targetUserDoc.data();
      }
    }

    if (!userData) {
      return fail('Pengguna tidak ditemukan.');
    }
    
    if (userData.role === role) {
      return fail('Akses ditolak: Tidak dapat mencabut peran utama pengguna melalui menu ini.');
    }

    let additionalRoles = userData.additionalRoles || [];
    additionalRoles = additionalRoles.filter((r: string) => r !== role);
    
    if (virtualDatabase.isActive()) {
      await virtualDatabase.updateDoc('users', targetUserId, { additionalRoles });
    } else {
      await updateDoc(doc(db, 'users', targetUserId), { additionalRoles });
    }

    if (role === 'admission_staff') {
      await admissionAuditService.log(targetUserId, 'ROLE_REVOKED', actorId, 'Revoked admission_staff role');
    }

    return ok(undefined);
  }

  async updatePrimaryRole(actorId: string, targetUserId: string, newRole: UserRole): Promise<Result<void>> {
    const actorPerms = await getAllUserPermissions(actorId);
    
    if (!actorPerms.includes('admin:role:manage')) {
      let isSuperAdmin = false;
      if (virtualDatabase.isActive()) {
        const actorDoc = await virtualDatabase.getDoc('users', actorId);
        isSuperAdmin = actorDoc?.role === 'super_admin';
      } else {
        const actorDoc = await getDoc(doc(db, 'users', actorId));
        isSuperAdmin = actorDoc.exists() && actorDoc.data().role === 'super_admin';
      }
      if (!isSuperAdmin) {
        return fail('Akses ditolak: Hanya super_admin yang dapat mengelola peran pengguna.');
      }
    }

    if (actorId === targetUserId && newRole !== 'super_admin') {
      let isSelfSuperAdmin = false;
      if (virtualDatabase.isActive()) {
        const actorDoc = await virtualDatabase.getDoc('users', actorId);
        isSelfSuperAdmin = actorDoc?.role === 'super_admin';
      } else {
        const actorDoc = await getDoc(doc(db, 'users', actorId));
        isSelfSuperAdmin = actorDoc.data()?.role === 'super_admin';
      }
      if (isSelfSuperAdmin) {
        return fail('Akses ditolak: Anda tidak dapat menghapus peran super_admin utama Anda sendiri.');
      }
    }

    if (virtualDatabase.isActive()) {
      const exists = await virtualDatabase.getDoc('users', targetUserId);
      if (!exists) return fail('Pengguna tidak ditemukan.');
      await virtualDatabase.updateDoc('users', targetUserId, { role: newRole });
    } else {
      const targetUserRef = doc(db, 'users', targetUserId);
      const targetUserDoc = await getDoc(targetUserRef);
      if (!targetUserDoc.exists()) {
        return fail('Pengguna tidak ditemukan.');
      }
      await updateDoc(targetUserRef, { role: newRole });
    }

    return ok(undefined);
  }

  async getRolePermissions(roleId: string): Promise<string[]> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs('role_permissions', item => item.roleId === roleId);
      return items.map(doc => doc.permissionId);
    }
    const rolePermsQuery = query(collection(db, 'role_permissions'), where('roleId', '==', roleId));
    const rolePermsSnap = await getDocs(rolePermsQuery);
    return rolePermsSnap.docs.map(doc => doc.data().permissionId);
  }

  async assignPermissionToRole(actorId: string, roleId: string, permissionId: string): Promise<Result<void>> {
    const actorPerms = await getAllUserPermissions(actorId);
    if (!actorPerms.includes('admin:permission:manage')) {
      let isSuperAdmin = false;
      if (virtualDatabase.isActive()) {
        const actorDoc = await virtualDatabase.getDoc('users', actorId);
        isSuperAdmin = actorDoc?.role === 'super_admin';
      } else {
        const actorDoc = await getDoc(doc(db, 'users', actorId));
        isSuperAdmin = actorDoc.exists() && actorDoc.data().role === 'super_admin';
      }
      if (!isSuperAdmin) {
        return fail('Akses ditolak: Hanya super_admin yang dapat mengelola permission.');
      }
    }

    if (virtualDatabase.isActive()) {
      const existing = await virtualDatabase.getDocs('role_permissions', item => item.roleId === roleId && item.permissionId === permissionId);
      if (existing.length === 0) {
        await virtualDatabase.addDoc('role_permissions', {
          roleId,
          permissionId,
          createdAt: Date.now()
        });
        await admissionAuditService.log(roleId, 'PERMISSION_CHANGED', actorId, `Granted ${permissionId} to ${roleId}`);
      }
      return ok(undefined);
    }

    const rolePermsQuery = query(collection(db, 'role_permissions'), where('roleId', '==', roleId), where('permissionId', '==', permissionId));
    const rolePermsSnap = await getDocs(rolePermsQuery);
    
    if (rolePermsSnap.empty) {
      await addDoc(collection(db, 'role_permissions'), {
        roleId,
        permissionId,
        createdAt: Date.now()
      });
      await admissionAuditService.log(roleId, 'PERMISSION_CHANGED', actorId, `Granted ${permissionId} to ${roleId}`);
    }

    return ok(undefined);
  }

  async revokePermissionFromRole(actorId: string, roleId: string, permissionId: string): Promise<Result<void>> {
    const actorPerms = await getAllUserPermissions(actorId);
    if (!actorPerms.includes('admin:permission:manage')) {
      let isSuperAdmin = false;
      if (virtualDatabase.isActive()) {
        const actorDoc = await virtualDatabase.getDoc('users', actorId);
        isSuperAdmin = actorDoc?.role === 'super_admin';
      } else {
        const actorDoc = await getDoc(doc(db, 'users', actorId));
        isSuperAdmin = actorDoc.exists() && actorDoc.data().role === 'super_admin';
      }
      if (!isSuperAdmin) {
        return fail('Akses ditolak: Hanya super_admin yang dapat mengelola permission.');
      }
    }

    if (roleId === 'super_admin') {
      return fail('Akses ditolak: Tidak dapat mencabut permission dari super_admin.');
    }

    if (virtualDatabase.isActive()) {
      const rolePermsSnap = await virtualDatabase.getDocs('role_permissions', item => item.roleId === roleId && item.permissionId === permissionId);
      if (rolePermsSnap.length > 0) {
        for (const item of rolePermsSnap) {
          await virtualDatabase.deleteDoc('role_permissions', item.id);
        }
        await admissionAuditService.log(roleId, 'PERMISSION_CHANGED', actorId, `Revoked ${permissionId} from ${roleId}`);
      }
      return ok(undefined);
    }

    const rolePermsQuery = query(collection(db, 'role_permissions'), where('roleId', '==', roleId), where('permissionId', '==', permissionId));
    const rolePermsSnap = await getDocs(rolePermsQuery);
    
    if (!rolePermsSnap.empty) {
      const deletePromises = rolePermsSnap.docs.map(d => deleteDoc(doc(db, 'role_permissions', d.id)));
      await Promise.all(deletePromises);
      await admissionAuditService.log(roleId, 'PERMISSION_CHANGED', actorId, `Revoked ${permissionId} from ${roleId}`);
    }

    return ok(undefined);
  }
}

export const roleManagementService = new RoleManagementService();
