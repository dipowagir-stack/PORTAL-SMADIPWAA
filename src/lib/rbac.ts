import { collection, query, where, getDocs, addDoc, getDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { UserRole } from '../contexts/AuthContext';

export async function getRolePermissions(roleId: UserRole): Promise<string[]> {
  if (!roleId) return [];
  
  try {
    const rolePermsQuery = query(collection(db, 'role_permissions'), where('roleId', '==', roleId));
    const rolePermsSnap = await getDocs(rolePermsQuery);
    
    const permissions = rolePermsSnap.docs.map(doc => doc.data().permissionId);
    
    // Fallback for parent role in case migration hasn't run
    if (!permissions.includes('dashboard:access')) {
      permissions.push('dashboard:access');
    }
    
    return permissions;
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    return ['dashboard:access'];
  }
}

export async function assignUserRole(userId: string, roleId: string): Promise<void> {
  try {
    const roleQuery = query(collection(db, 'user_roles'), where('userId', '==', userId), where('roleId', '==', roleId));
    const roleSnap = await getDocs(roleQuery);
    if (roleSnap.empty) {
      await addDoc(collection(db, 'user_roles'), {
        userId,
        roleId,
        createdAt: Date.now()
      });
    }
  } catch (error) {
    console.error('Error assigning user role:', error);
  }
}

export async function getAllUserPermissions(userId: string): Promise<string[]> {
  try {
    const roleIds = new Set<string>();
    
    // 1. Get from user_roles collection
    const userRolesQuery = query(collection(db, 'user_roles'), where('userId', '==', userId));
    const userRolesSnap = await getDocs(userRolesQuery);
    if (!userRolesSnap.empty) {
      userRolesSnap.docs.forEach(d => roleIds.add(d.data().roleId));
    }

    // 2. Get from users document
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (data.role) roleIds.add(data.role);
      if (data.additionalRoles && Array.isArray(data.additionalRoles)) {
        data.additionalRoles.forEach((r: string) => roleIds.add(r));
      }
    }

    if (roleIds.size === 0) return [];
    
    const roleIdsArray = Array.from(roleIds);
    const permissions = new Set<string>();
    
    const chunkArray = (arr: any[], size: number) => {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    };
    
    const roleIdChunks = chunkArray(roleIdsArray, 30);
    
    // Fallback for admission_staff if not configured in DB yet
    if (roleIdsArray.includes('admission_staff')) {
       permissions.add('admission:read');
       permissions.add('admission:verify');
       permissions.add('admission:select');
       permissions.add('admission:result:publish');
       permissions.add('admission:enroll');
    }
    if (roleIdsArray.includes('super_admin')) {
       permissions.add('admin:role:manage');
       permissions.add('admin:permission:manage');
    }

    permissions.add('dashboard:access');
    
    for (const chunk of roleIdChunks) {
        const rolePermsQuery = query(collection(db, 'role_permissions'), where('roleId', 'in', chunk));
        const rolePermsSnap = await getDocs(rolePermsQuery);
        rolePermsSnap.docs.forEach(docSnap => {
            permissions.add(docSnap.data().permissionId);
        });
    }
    return Array.from(permissions);
  } catch (error) {
    console.error('Error fetching all user permissions:', error);
    return [];
  }
}

import { deleteDoc } from 'firebase/firestore';

export async function revokeUserRole(userId: string, roleId: string): Promise<void> {
  try {
    const roleQuery = query(collection(db, 'user_roles'), where('userId', '==', userId), where('roleId', '==', roleId));
    const roleSnap = await getDocs(roleQuery);
    
    const deletePromises = roleSnap.docs.map(docSnap => deleteDoc(doc(db, 'user_roles', docSnap.id)));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error revoking user role:', error);
  }
}
