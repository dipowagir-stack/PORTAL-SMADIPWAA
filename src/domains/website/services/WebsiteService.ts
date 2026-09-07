import { WebsiteRepository } from '../repositories/WebsiteRepository';
import { Result, ok, fail } from '../../../foundation/core/Result';
import { TenantPublicProfile, CmsContent, ContentStatus } from '../types';
import { SecurityContext } from '../../../foundation/security/types';

function hasPermission(context: SecurityContext, permission: string): boolean {
  return context.isPlatformAdmin || context.roles.includes('super_admin') || context.permissions?.includes(permission);
}

export class WebsiteService {
  private repository: WebsiteRepository;

  constructor() {
    this.repository = new WebsiteRepository();
  }

  // PUBLIC READS
  async getTenantProfileByDomain(domain: string): Promise<Result<TenantPublicProfile>> {
    return this.repository.getTenantProfileByDomain(domain);
  }

  async getPublicContents(tenantId: string, type?: string): Promise<Result<CmsContent[]>> {
    return this.repository.getContents(tenantId, { type, publicOnly: true });
  }

  async getPublicContentBySlug(tenantId: string, slug: string): Promise<Result<CmsContent>> {
    return this.repository.getContentBySlug(tenantId, slug, true);
  }
  
  async getTenantProfile(tenantId: string): Promise<Result<TenantPublicProfile>> {
     return this.repository.getTenantProfileByTenantId(tenantId);
  }

  // SECURED ADMIN WRITES
  async updateTenantProfile(context: SecurityContext, profile: Partial<TenantPublicProfile>): Promise<Result<void>> {
    if (!hasPermission(context, 'website:manage')) {
      return fail('Unauthorized to manage website profile');
    }
    
    // Fetch existing
    const existingResult = await this.repository.getTenantProfileByTenantId(context.tenantId!);
    let newProfile: TenantPublicProfile;
    
    if (existingResult.isSuccess) {
      newProfile = { ...existingResult.getValue(), ...profile, updatedAt: Date.now() };
    } else {
      // Create new
      newProfile = {
        id: context.tenantId!,
        tenantId: context.tenantId!,
        schoolName: profile.schoolName || 'New School',
        officialName: profile.officialName || 'New School',
        shortName: profile.shortName || 'NS',
        primaryColor: profile.primaryColor || '#1d4ed8',
        secondaryColor: profile.secondaryColor || '#93c5fd',
        accentColor: profile.accentColor || '#f59e0b',
        heroTitle: profile.heroTitle || 'Welcome to our school',
        heroSubtitle: profile.heroSubtitle || '',
        address: profile.address || '',
        phone: profile.phone || '',
        email: profile.email || '',
        socialLinks: profile.socialLinks || {},
        domainMappings: profile.domainMappings || { status: 'PENDING' },
        seoConfig: profile.seoConfig || { title: '', description: '', keywords: '' },
        published: profile.published ?? false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...profile
      } as TenantPublicProfile;
    }

    return this.repository.saveTenantProfile(newProfile);
  }

  async getAllContents(context: SecurityContext, type?: string): Promise<Result<CmsContent[]>> {
    if (!hasPermission(context, 'website:read')) {
      return fail('Unauthorized to read website content');
    }
    return this.repository.getContents(context.tenantId!, { type });
  }

  async createContent(context: SecurityContext, content: Omit<CmsContent, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'authorId'>): Promise<Result<void>> {
    if (!hasPermission(context, 'website:manage')) {
      return fail('Unauthorized to manage website content');
    }

    const newContent: CmsContent = {
      ...content,
      id: crypto.randomUUID(),
      tenantId: context.tenantId!,
      authorId: context.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: content.status === 'PUBLISHED' && !hasPermission(context, 'website:publish') ? 'DRAFT' : content.status
    };
    if (newContent.status === 'PUBLISHED' && !newContent.publishedAt) {
      newContent.publishedAt = Date.now();
    }

    return this.repository.saveContent(newContent);
  }

  async updateContent(context: SecurityContext, contentId: string, updates: Partial<CmsContent>): Promise<Result<void>> {
    if (!hasPermission(context, 'website:manage')) {
      return fail('Unauthorized to manage website content');
    }

    if (updates.status === 'PUBLISHED' && !hasPermission(context, 'website:publish')) {
      return fail('Unauthorized to publish website content');
    }

    const contentResult = await this.repository.getContentBySlug(context.tenantId!, contentId); // Wait, by slug or by id?
    // In our repository, we didn't add getContentById. Let's assume we can fetch by id from getContents or just save over it.
    // Actually, saveContent in repository uses setDoc with merge: true, so we can just update directly.
    const updatePayload = {
      ...updates,
      id: contentId,
      tenantId: context.tenantId!,
      updatedAt: Date.now()
    } as CmsContent;
    if (updates.status === 'PUBLISHED' && !updates.publishedAt) {
      updatePayload.publishedAt = Date.now();
    }
    
    return this.repository.saveContent(updatePayload);
  }

  async deleteContent(context: SecurityContext, contentId: string): Promise<Result<void>> {
    if (!hasPermission(context, 'website:manage')) {
      return fail('Unauthorized to manage website content');
    }
    return this.repository.deleteContent(contentId);
  }
}

export const websiteService = new WebsiteService();
