export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED' | 'ARCHIVED';

export type BillingCycle = 'MONTHLY' | 'YEARLY' | 'CUSTOM';

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  billingCycle: BillingCycle;
  includedModules: string[];
  limits?: {
    maxStudents?: number;
    maxTeachers?: number;
    storageMb?: number;
  };
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
}

export interface TenantSubscription {
  id: string;
  tenantId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: number;
  endDate: number;
  gracePeriodEndDate: number;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  updatedBy?: string;
}

export interface TenantEntitlement {
  tenantId: string;
  isSubscriptionActive: boolean;
  isReadOnly: boolean;
  activeModules: string[];
  plan?: SubscriptionPlan;
  subscription?: TenantSubscription;
  isLegacy: boolean;
}
