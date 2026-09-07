export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface TenantPublicProfile {
  id: string; // tenantId
  tenantId: string;
  schoolName: string;
  officialName: string;
  shortName: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage?: string;
  principalWelcome?: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  socialLinks: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
  domainMappings: {
    customDomain?: string;
    subdomain?: string; // fallback e.g., 'smas-diponegoro'
    status: 'PENDING' | 'VERIFIED' | 'ACTIVE' | 'DISABLED';
    verifiedAt?: number;
  };
  seoConfig: {
    title: string;
    description: string;
    keywords: string;
    ogImage?: string;
  };
  published: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CmsContent {
  id: string;
  tenantId: string;
  type: 'PAGE' | 'ARTICLE' | 'ANNOUNCEMENT' | 'EVENT' | 'PROGRAM' | 'FACILITY';
  slug: string;
  title: string;
  summary?: string;
  content: string; // HTML or Markdown
  featuredImage?: string;
  status: ContentStatus;
  authorId: string;
  authorName?: string;
  tags: string[];
  metadata?: Record<string, any>;
  publishedAt?: number;
  createdAt: number;
  updatedAt: number;
}
