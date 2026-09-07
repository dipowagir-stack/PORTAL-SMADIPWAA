import { db } from '../../lib/firebase';
import { Result, ok, fail } from '../core/Result';
import { PlatformModule, ModuleStatus } from './types';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';

export class ModuleCatalogService {
  private collectionName = 'platform_modules';

  async getAvailableModules(): Promise<Result<PlatformModule[]>> {
    try {
      const q = query(collection(db, this.collectionName), where('status', 'in', ['ACTIVE', 'BETA', 'DEPRECATED']));
      const snap = await getDocs(q);
      const modules = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlatformModule));
      return ok(modules);
    } catch (error: any) {
      return fail(error.message || 'Failed to fetch available modules');
    }
  }

  async getAllModules(): Promise<Result<PlatformModule[]>> {
    try {
      const snap = await getDocs(collection(db, this.collectionName));
      const modules = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlatformModule));
      return ok(modules);
    } catch (error: any) {
      return fail(error.message || 'Failed to fetch all modules');
    }
  }

  async getModuleByCode(code: string): Promise<Result<PlatformModule | null>> {
    try {
      const q = query(collection(db, this.collectionName), where('code', '==', code));
      const snap = await getDocs(q);
      if (snap.empty) return ok(null);
      return ok({ id: snap.docs[0].id, ...snap.docs[0].data() } as PlatformModule);
    } catch (error: any) {
      return fail(error.message || 'Failed to fetch module');
    }
  }

  // Seeding initial modules if not exist
  async seedInitialModules(): Promise<void> {
    const defaultModules = [
      'academic', 'finance', 'parent', 'admission', 'supervision', 'document', 'reporting', 'ai', 'student', 'teacher', 'admin', 'tu', 'website'
    ];

    for (const code of defaultModules) {
      const res = await this.getModuleByCode(code);
      if (res.isSuccess && res.getValue() === null) {
        const modRef = doc(collection(db, this.collectionName));
        const data: PlatformModule = {
          id: modRef.id,
          code,
          name: code.charAt(0).toUpperCase() + code.slice(1),
          description: `Core ${code} module`,
          status: 'ACTIVE',
          version: '1.0.0',
          dependencies: [], // Can be filled later
          defaultEnabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        await setDoc(modRef, data);
      }
    }
  }
}

export const moduleCatalogService = new ModuleCatalogService();
