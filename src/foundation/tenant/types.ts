export type TenantStatus = 'PROVISIONING' | 'READY' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'ARCHIVED';

export interface Tenant {
  id: string;
  code: string;
  name: string;
  status: TenantStatus;
  timezone: string;
  locale: string;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  // Configuration
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
  };
  features?: string[];
}

export interface SchoolProfile {
  id?: string;
  tenantId: string;
  schoolName: string;
  officialCode?: string;
  address?: string;
  contact?: {
    email?: string;
    phone?: string;
  };
  createdAt: number;
  updatedAt: number;
}

export interface TenantMembership {
  id: string;
  userId: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
  status: 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  createdAt: number;
  updatedAt: number;
}
export * from './subscriptionTypes';
