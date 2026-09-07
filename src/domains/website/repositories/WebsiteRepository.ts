import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Result, ok, fail } from '../../../foundation/core/Result';
import { TenantPublicProfile, CmsContent, ContentStatus } from '../types';

export class WebsiteRepository {
  private profileCollection = 'tenant_public_profiles';
  private contentCollection = 'tenant_cms_contents';

  async getTenantProfileByTenantId(tenantId: string): Promise<Result<TenantPublicProfile>> {
    try {
      const docRef = doc(db, this.profileCollection, tenantId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return ok(docSnap.data() as TenantPublicProfile);
      }
      return fail('Profile not found');
    } catch (error: any) {
      return fail(error.message);
    }
  }

  async getTenantProfileByDomain(domain: string): Promise<Result<TenantPublicProfile>> {
    try {
      // First try custom domain
      const qCustom = query(
        collection(db, this.profileCollection), 
        where('domainMappings.customDomain', '==', domain),
        where('domainMappings.status', '==', 'ACTIVE')
      );
      const snapCustom = await getDocs(qCustom);
      if (!snapCustom.empty) {
        return ok(snapCustom.docs[0].data() as TenantPublicProfile);
      }

      // Then try subdomain (assuming domain is something like 'tenant.eduos.com')
      // To simplify, we check the subdomain field
      const subdomain = domain.split('.')[0];
      const qSub = query(
        collection(db, this.profileCollection),
        where('domainMappings.subdomain', '==', subdomain)
      );
      const snapSub = await getDocs(qSub);
      if (!snapSub.empty) {
        return ok(snapSub.docs[0].data() as TenantPublicProfile);
      }
      
      // Fallback: try direct tenantId lookup if no domain mapping matched
      const docRef = doc(db, this.profileCollection, domain);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return ok(docSnap.data() as TenantPublicProfile);
      }

      return fail('Domain not mapped to any active tenant');
    } catch (error: any) {
      return fail(error.message);
    }
  }

  async saveTenantProfile(profile: TenantPublicProfile): Promise<Result<void>> {
    try {
      const docRef = doc(db, this.profileCollection, profile.tenantId);
      await setDoc(docRef, profile, { merge: true });
      return ok(undefined);
    } catch (error: any) {
      return fail(error.message);
    }
  }

  async getContents(tenantId: string, options?: { type?: string, status?: ContentStatus, publicOnly?: boolean }): Promise<Result<CmsContent[]>> {
    try {
      let conditions = [where('tenantId', '==', tenantId)];
      if (options?.type) {
        conditions.push(where('type', '==', options.type));
      }
      if (options?.publicOnly) {
        conditions.push(where('status', '==', 'PUBLISHED'));
      } else if (options?.status) {
        conditions.push(where('status', '==', options.status));
      }

      const q = query(collection(db, this.contentCollection), ...conditions);
      const snap = await getDocs(q);
      const contents = snap.docs.map(d => ({ id: d.id, ...d.data() } as CmsContent));
      return ok(contents);
    } catch (error: any) {
      return fail(error.message);
    }
  }

  async getContentBySlug(tenantId: string, slug: string, publicOnly: boolean = false): Promise<Result<CmsContent>> {
    try {
      const conditions = [
        where('tenantId', '==', tenantId),
        where('slug', '==', slug)
      ];
      if (publicOnly) {
        conditions.push(where('status', '==', 'PUBLISHED'));
      }
      const q = query(collection(db, this.contentCollection), ...conditions);
      const snap = await getDocs(q);
      if (snap.empty) return fail('Content not found');
      return ok({ id: snap.docs[0].id, ...snap.docs[0].data() } as CmsContent);
    } catch (error: any) {
      return fail(error.message);
    }
  }

  async saveContent(content: CmsContent): Promise<Result<void>> {
    try {
      const docRef = doc(db, this.contentCollection, content.id);
      await setDoc(docRef, content, { merge: true });
      return ok(undefined);
    } catch (error: any) {
      return fail(error.message);
    }
  }

  async deleteContent(id: string): Promise<Result<void>> {
    try {
      await deleteDoc(doc(db, this.contentCollection, id));
      return ok(undefined);
    } catch (error: any) {
      return fail(error.message);
    }
  }
}
