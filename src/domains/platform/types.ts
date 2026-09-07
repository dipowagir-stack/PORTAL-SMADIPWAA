import { Result } from '../../foundation/core/Result';

export interface TenantSummary {
  id: string;
  name: string;
  code: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'ARCHIVED' | 'PROVISIONING';
  subscriptionPlan: string;
  subscriptionStatus: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIAL';
  expiryDate: number;
  activeModules: string[];
  currentVersion: string;
  releaseChannel: string;
  createdAt: number;
  lastActivity?: number;
}

export interface SaasHeroConfig {
  headline: string;
  subheadline: string;
  ctaText: string;
  ctaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
}

export interface SaasFeature {
  id: string;
  title: string;
  desc: string;
  icon: string;
}

export interface SaasPricingPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  popular: boolean;
}

export interface SaasWebsiteConfig {
  hero: SaasHeroConfig;
  features: SaasFeature[];
  pricing: SaasPricingPlan[];
  updatedAt: number;
}

export interface IPlatformHubService {
  getAllTenants(): Promise<Result<TenantSummary[]>>;
  getTenantDetails(tenantId: string): Promise<Result<TenantSummary>>;
  suspendTenant(tenantId: string, reason: string): Promise<Result<void>>;
  restoreTenant(tenantId: string): Promise<Result<void>>;
  createTenant(data: { name: string; domainPrefix: string; email: string; subscriptionPlan: string }): Promise<Result<string>>;
  updateTenantModules(tenantId: string, modules: string[]): Promise<Result<void>>;
  updateTenantSubscription(tenantId: string, planId: string): Promise<Result<void>>;
  getSaasWebsiteConfig(): Promise<Result<SaasWebsiteConfig>>;
  updateSaasWebsiteConfig(config: Partial<SaasWebsiteConfig>): Promise<Result<void>>;
}
