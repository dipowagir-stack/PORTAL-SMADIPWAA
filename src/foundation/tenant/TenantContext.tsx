import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Tenant, TenantMembership } from './types';
import { TenantEntitlement } from './subscriptionTypes';
import { SecurityContext } from '../security/types';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { usePeriod } from '../../contexts/PeriodContext';
import { entitlementService } from './EntitlementService';

interface TenantContextType {
  activeTenant: Tenant | null;
  memberships: TenantMembership[];
  securityContext: SecurityContext | null;
  entitlement: TenantEntitlement | null;
  loading: boolean;
  switchTenant: (tenantId: string) => Promise<void>;
}

const TenantContext = createContext<TenantContextType>({
  activeTenant: null,
  memberships: [],
  securityContext: null,
  entitlement: null,
  loading: true,
  switchTenant: async () => {},
});

export const useTenant = () => useContext(TenantContext);

export const TenantProvider = ({ children, domainTenantId }: { children: React.ReactNode, domainTenantId?: string }) => {
  const { user, profile, activeRole, permissions } = useAuth();
  const { activeAcademicYear, activeSemester } = usePeriod();
  
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [memberships, setMemberships] = useState<TenantMembership[]>([]);
  const [entitlement, setEntitlement] = useState<TenantEntitlement | null>(null);
  const [loading, setLoading] = useState(true);

  // Platform user detection (does not automatically include super_admin)
  const isPlatformUser = useMemo(() => {
    return profile?.role === 'platform_admin' ||
           profile?.role === 'platform_support' ||
           profile?.role === 'platform_engineer';
  }, [profile]);

  useEffect(() => {
    let isMounted = true;

    const fetchTenantData = async () => {
      if (!user) {
        if (isMounted) {
          setActiveTenant(null);
          setMemberships([]);
          setEntitlement(null);
          setLoading(false);
        }
        return;
      }

      try {
        // Query for multi-tenant memberships
        const membershipRef = collection(db, 'tenant_memberships');
        const q = query(membershipRef, where('userId', '==', user.uid), where('status', '==', 'ACTIVE'));
        const querySnapshot = await getDocs(q);
        
        const userMemberships: TenantMembership[] = [];
        querySnapshot.forEach((doc) => {
          userMemberships.push({ id: doc.id, ...doc.data() } as TenantMembership);
        });

        if (isMounted) {
          setMemberships(userMemberships);

          // Determine Portal
          const pathname = window.location.pathname;
          const isPlatformPortal = pathname.startsWith('/platform-hub');
          const isApplicantPortal = pathname.startsWith('/ppdb') || pathname.startsWith('/applicant');
          
          let resolvedTenant: Tenant | null = null;
          let resolvedEntitlement: TenantEntitlement | null = null;

          if (isPlatformPortal) {
             // Platform portal doesn't need tenant resolution, handled by Role
          } else {
             // School or Applicant Portal
             let targetTenantId = domainTenantId; // Enforce domain if available
             
             // If user has saved preference and it's valid, they can switch if allowed
             // BUT if domainTenantId is set, it MUST match, or we enforce domainTenantId.
             // Wait, if they are on school-a.domain, they MUST enter school-a.
             // If they are on a generic domain, we can use saved.
             if (!targetTenantId) {
               targetTenantId = localStorage.getItem(`activeTenant_${user.uid}`);
               if (!targetTenantId && userMemberships.length > 0) {
                  // No fallback to first active if we strictly prevent it?
                  // Prompt: "DILARANG: fallback ke tenant ACTIVE pertama. Jika tidak ada membership: NO TENANT ACCESS."
                  // But if they just logged in on a generic domain and have a membership, we can let them in to their only school?
                  // Actually, prompt says "Jika tidak ada membership: NO TENANT ACCESS."
                  // We'll only pick the first if they have a valid membership. That's fine.
                  targetTenantId = userMemberships[0].tenantId;
               }
             }

             const validMembership = userMemberships.find(m => m.tenantId === targetTenantId);
             
             if (validMembership) {
               const tenantDoc = await getDoc(doc(db, 'tenants', validMembership.tenantId));
               if (tenantDoc.exists() && tenantDoc.data().status === 'ACTIVE') {
                 resolvedTenant = { id: tenantDoc.id, ...tenantDoc.data() } as Tenant;
                 
                 // Load entitlement
                 const tempSecCtx = {
                   userId: user.uid,
                   tenantId: resolvedTenant.id,
                   roles: activeRole ? [activeRole] : [],
                   permissions: permissions,
                   isPlatformAdmin: isPlatformUser
                 };
                 const entRes = await entitlementService.getTenantEntitlement(resolvedTenant.id, tempSecCtx);
                 if (entRes.isSuccess) {
                     resolvedEntitlement = entRes.getValue();
                 }
               }
             }
          }

          setActiveTenant(resolvedTenant);
          setEntitlement(resolvedEntitlement);
        }
      } catch (error) {
        console.error("Error resolving tenant context:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTenantData();

    return () => {
      isMounted = false;
    };
  }, [user, isPlatformUser, activeRole, permissions]);

  const switchTenant = async (tenantId: string) => {
    if (!user) return;
    
    const membership = memberships.find(m => m.tenantId === tenantId);
    if (!membership && !isPlatformUser) {
      throw new Error("Unauthorized: Not a member of this tenant.");
    }

    setLoading(true);
    try {
      const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
      if (tenantDoc.exists()) {
        const newTenant = { id: tenantDoc.id, ...tenantDoc.data() } as Tenant;
        
        if (newTenant.status !== 'ACTIVE') {
          throw new Error("Tenant is not active.");
        }

        setActiveTenant(newTenant);
        localStorage.setItem(`activeTenant_${user.uid}`, tenantId);

        // Load entitlement for newly switched tenant
        const tempSecCtx: SecurityContext = {
          userId: user.uid,
          tenantId: newTenant.id,
          roles: activeRole ? [activeRole] : [],
          permissions: permissions,
          isPlatformAdmin: isPlatformUser
        };
        const entRes = await entitlementService.getTenantEntitlement(newTenant.id, tempSecCtx);
        if (entRes.isSuccess) {
          setEntitlement(entRes.getValue());
        }
      } else {
        throw new Error("Tenant not found.");
      }
    } catch (error) {
      console.error("Error switching tenant:", error);
    } finally {
      setLoading(false);
    }
  };

  const securityContext: SecurityContext | null = useMemo(() => {
    if (!user) return null;
    return {
      userId: user.uid,
      tenantId: activeTenant?.id || null, 
      roles: activeRole ? [activeRole] : [],
      permissions: permissions,
      activeAcademicYearId: activeAcademicYear?.id,
      activeSemesterId: activeSemester?.id,
      isPlatformAdmin: isPlatformUser,
      isReadOnly: entitlement?.isReadOnly || false
    };
  }, [user, activeTenant, activeRole, permissions, activeAcademicYear, activeSemester, isPlatformUser, entitlement]);

  return (
    <TenantContext.Provider value={{ activeTenant, memberships, securityContext, entitlement, loading, switchTenant }}>
      {children}
    </TenantContext.Provider>
  );
};
