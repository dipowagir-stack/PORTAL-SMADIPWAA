import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { apiClient, DecoupledUser } from '../lib/apiClient';
import { getRolePermissions, getAllUserPermissions } from '../lib/rbac';

export type UserRole = 'admin' | 'teacher' | 'curriculum' | 'student' | 'tu' | 'bendahara' | 'parent' | 'super_admin' | 'applicant' | 'admission_staff' | 'platform_admin' | 'platform_support' | null;

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  additionalRoles?: UserRole[];
  waNumber?: string;
  waParentNumber?: string;
  nisn?: string;
  photoUrl?: string;
  className?: string; // assigned class for students
  points?: number;
  createdAt: number;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  activeRole: UserRole;
  permissions: string[];
  switchRole: (role: UserRole) => void;
  refreshProfile: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  activeRole: null,
  permissions: [],
  switchRole: () => {},
  refreshProfile: async () => {},
  hasPermission: () => false,
});

export const useAuth = () => useContext(AuthContext);


export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState<UserRole>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  const switchRole = async (role: UserRole) => {
    const isSuperAdmin = profile?.role === 'super_admin';
    const isAllowedRole = role === profile?.role || (profile?.additionalRoles && profile?.additionalRoles.includes(role));
    if (!isAllowedRole && !isSuperAdmin) {
      console.error("Unauthorized role switch attempt");
      return;
    }
    setActiveRole(role);
    localStorage.setItem(`activeRole_${user?.uid}`, role || '');
    if (role) {
      const rolePerms = await getRolePermissions(role);
      const allUserPerms = await getAllUserPermissions(user?.uid || '');
      const perms = Array.from(new Set([...rolePerms, ...allUserPerms]));
      
      setPermissions(perms);
    } else {
      setPermissions([]);
    }
  };

  const hasPermission = (permission: string) => {
    if (profile?.role === 'super_admin' || profile?.role === 'platform_admin') return true;
    return permissions.includes(permission);
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
      let data: UserProfile | null = null;
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        data = { ...docSnap.data(), uid: docSnap.id } as UserProfile;
      } else {
        const q = query(collection(db, 'users'), where('authUid', '==', user.uid));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          data = { ...qSnap.docs[0].data(), uid: qSnap.docs[0].id } as UserProfile;
        }
      }

      if (data) {
        setProfile(data);
        
        // Restore active role if valid
        const savedRole = localStorage.getItem(`activeRole_${user.uid}`) as UserRole;
        let finalRole = data.role;
        if (savedRole && (data.role === 'super_admin' || data.role === savedRole || data.additionalRoles?.includes(savedRole))) { 
           finalRole = savedRole;
        }
        
        setActiveRole(finalRole);
        if (finalRole) {
          const rolePerms = await getRolePermissions(finalRole);
          const allUserPerms = await getAllUserPermissions(user.uid);
          const perms = Array.from(new Set([...rolePerms, ...allUserPerms]));
          setPermissions(perms);
        } else {
          setPermissions([]);
        }
      } else {
        setProfile(null);
        setActiveRole(null);
        setPermissions([]);
      }
    } catch (error) {
      console.error("Error fetching user profile", error);
    }
  };

  useEffect(() => {
    // 1. First check if decoupled token/session exists
    const checkDecoupledSession = async () => {
      const savedUser = apiClient.getSavedUser();
      if (savedUser && !user) {
        const dummyUser = {
          uid: savedUser.uid,
          email: savedUser.email,
          displayName: savedUser.name,
          photoURL: savedUser.photoUrl || '',
        } as unknown as User;
        setUser(dummyUser);

        const prof: UserProfile = {
          uid: savedUser.uid,
          email: savedUser.email,
          name: savedUser.name,
          role: (savedUser.role as UserRole) || 'teacher',
          additionalRoles: (savedUser.additionalRoles as UserRole[]) || [],
          waNumber: savedUser.waNumber,
          waParentNumber: savedUser.waParentNumber,
          nisn: savedUser.nisn,
          photoUrl: savedUser.photoUrl,
          className: savedUser.className,
          points: savedUser.points || 0,
          createdAt: Date.now(),
        };
        setProfile(prof);
        setActiveRole(prof.role);
        if (prof.role) {
          const perms = await getRolePermissions(prof.role);
          setPermissions(perms);
        }
        setLoading(false);
      }
    };
    checkDecoupledSession();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setLoading(true); // Ensure loading is true while fetching profile to prevent race conditions
      }
      setUser(currentUser);
      if (currentUser) {
        try {
          let data: UserProfile | null = null;
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            data = { ...docSnap.data(), uid: docSnap.id } as UserProfile;
          } else {
            // Coba cari apakah ada undangan platform (pre-register)
            if (currentUser.email) {
               const invRef = doc(db, 'platform_invitations', currentUser.email.toLowerCase().trim());
               const invSnap = await getDoc(invRef);
               
               if (invSnap.exists()) {
                  const invData = invSnap.data();
                  data = {
                    uid: currentUser.uid,
                    authUid: currentUser.uid,
                    name: currentUser.displayName || 'Platform User',
                    email: currentUser.email,
                    photoUrl: currentUser.photoURL || '',
                    role: invData.role || 'platform_engineer',
                    waNumber: '',
                    createdAt: Date.now()
                  } as UserProfile;
                  
                  // Create the user profile
                  const { setDoc, deleteDoc } = await import('firebase/firestore');
                  await setDoc(docRef, data);
                  // Remove invitation
                  await deleteDoc(invRef);
               }
            }

            if (!data) {
              // Coba cari apakah ada akun offline yang sudah diklaim menggunakan authUid ini
              const q = query(collection(db, 'users'), where('authUid', '==', currentUser.uid));
              const qSnap = await getDocs(q);
              if (!qSnap.empty) {
                data = { ...qSnap.docs[0].data(), uid: qSnap.docs[0].id } as UserProfile;
              }
            }
          }

          if (data) {
            setProfile(data);
            
            // Restore active role if valid
            const savedRole = localStorage.getItem(`activeRole_${currentUser.uid}`) as UserRole;
            let finalRole = data.role;
            if (savedRole && (data.role === 'super_admin' || data.role === savedRole || data.additionalRoles?.includes(savedRole))) { 
               finalRole = savedRole;
            }
            
            setActiveRole(finalRole);
            if (finalRole) {
              const perms = await getRolePermissions(finalRole);
              setPermissions(perms);
            } else {
              setPermissions([]);
            }
          } else {
            setProfile(null);
            setActiveRole(null);
            setPermissions([]);
          }
        } catch (error) {
          console.error("Error fetching profile", error);
          setProfile(null);
          setActiveRole(null);
          setPermissions([]);
        }
      } else {
        setProfile(null);
        setActiveRole(null);
        setPermissions([]);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, activeRole, permissions, switchRole, refreshProfile, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};
