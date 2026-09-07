import { Result, ok, fail } from '../core/Result';
import { PlatformRelease, IReleaseRepository, ReleaseChannel, ReleaseStatus } from './types';
import { virtualDatabase } from '../sandbox/VirtualDatabase';
import { db } from '../../lib/firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy, limit } from 'firebase/firestore';

export class PlatformReleaseRepositoryImpl implements IReleaseRepository {
  private collectionName = 'platform_releases';

  async getLatestRelease(channel: ReleaseChannel): Promise<Result<PlatformRelease>> {
    try {
      if (virtualDatabase.isActive()) {
        const releases = await virtualDatabase.getDocs(this.collectionName);
        const filtered = releases
          .filter((r: PlatformRelease) => r.releaseChannel === channel && r.status === ReleaseStatus.RELEASED)
          .sort((a, b) => b.createdAt - a.createdAt);
        
        if (filtered.length > 0) {
          return ok(filtered[0] as PlatformRelease);
        }
        return fail(`No release found for channel ${channel}`);
      }

      const q = query(
        collection(db, this.collectionName),
        where('releaseChannel', '==', channel),
        where('status', '==', ReleaseStatus.RELEASED),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      
      const snap = await getDocs(q);
      if (!snap.empty) {
        return ok(snap.docs[0].data() as PlatformRelease);
      }
      return fail(`No release found for channel ${channel}`);
    } catch (error: any) {
      return fail(`Failed to get latest release: ${error.message}`);
    }
  }

  async getReleaseByVersion(version: string): Promise<Result<PlatformRelease>> {
    try {
      if (virtualDatabase.isActive()) {
        const releases = await virtualDatabase.getDocs(this.collectionName);
        const release = releases.find((r: PlatformRelease) => r.version === version);
        
        if (release) {
          return ok(release as PlatformRelease);
        }
        return fail(`Release ${version} not found`);
      }

      const q = query(collection(db, this.collectionName), where('version', '==', version), limit(1));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        return ok(snap.docs[0].data() as PlatformRelease);
      }
      return fail(`Release ${version} not found`);
    } catch (error: any) {
      return fail(`Failed to get release by version: ${error.message}`);
    }
  }

  async createRelease(release: PlatformRelease): Promise<Result<PlatformRelease>> {
    try {
      if (virtualDatabase.isActive()) {
        await virtualDatabase.setDoc(this.collectionName, release.id, release);
        return ok(release);
      }

      await setDoc(doc(db, this.collectionName, release.id), release);
      return ok(release);
    } catch (error: any) {
      return fail(`Failed to create release: ${error.message}`);
    }
  }

  async updateReleaseStatus(id: string, status: ReleaseStatus, updatedBy: string): Promise<Result<PlatformRelease>> {
    try {
      const updatedAt = Date.now();
      
      if (virtualDatabase.isActive()) {
        await virtualDatabase.updateDoc(this.collectionName, id, { status, updatedBy, updatedAt });
        const updated = await virtualDatabase.getDoc(this.collectionName, id);
        return ok(updated as PlatformRelease);
      }

      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, { status, updatedBy, updatedAt });
      
      const snap = await getDoc(docRef);
      return ok(snap.data() as PlatformRelease);
    } catch (error: any) {
      return fail(`Failed to update release status: ${error.message}`);
    }
  }

  async getAllReleases(): Promise<Result<PlatformRelease[]>> {
    try {
      if (virtualDatabase.isActive()) {
        const releases = await virtualDatabase.getDocs(this.collectionName);
        return ok(releases as PlatformRelease[]);
      }

      const q = query(collection(db, this.collectionName), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      
      return ok(snap.docs.map(d => d.data() as PlatformRelease));
    } catch (error: any) {
      return fail(`Failed to get all releases: ${error.message}`);
    }
  }
}
