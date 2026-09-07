export type PlatformRole = 'platform_admin' | 'platform_support' | 'platform_engineer' | 'super_admin'; // super_admin kept for legacy compatibility
export type TenantRole = 'school_admin' | 'teacher' | 'student' | 'parent' | 'finance' | 'curriculum' | 'tu' | 'supervision' | 'admin'; // admin kept for legacy

export interface SecurityContext {
  userId: string;
  tenantId: string | null;
  roles: string[];
  permissions: string[];
  activeAcademicYearId?: string;
  activeSemesterId?: string;
  isPlatformAdmin: boolean;
  isReadOnly?: boolean;
}
