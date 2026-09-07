import { collection, doc, getDocs, getDoc, query, where, setDoc, addDoc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { IApprovalRepository } from './IApprovalRepository';
import { ParentApproval } from '../types';
import { virtualDatabase } from '../../../../foundation/sandbox/VirtualDatabase';

export class ApprovalRepositoryImpl implements IApprovalRepository {
  private collectionName = 'parent_approvals';

  async exists(id: string): Promise<boolean> {
    if (virtualDatabase.isActive()) {
      const data = await virtualDatabase.getDoc(this.collectionName, id);
      return !!data;
    }
    const snap = await getDoc(doc(db, this.collectionName, id));
    return snap.exists();
  }

  async save(item: ParentApproval): Promise<ParentApproval> {
    if (virtualDatabase.isActive()) {
      if (item.id) {
        await virtualDatabase.updateDoc(this.collectionName, item.id, item);
        return item;
      } else {
        const id = await virtualDatabase.addDoc(this.collectionName, item);
        return { ...item, id };
      }
    }

    if (item.id) {
      const ref = doc(db, this.collectionName, item.id);
      await updateDoc(ref, item as any);
      return item;
    } else {
      const docRef = await addDoc(collection(db, this.collectionName), item as any);
      return { ...item, id: docRef.id };
    }
  }

  async delete(id: string): Promise<void> {
    if (virtualDatabase.isActive()) {
      await virtualDatabase.deleteDoc(this.collectionName, id);
      return;
    }
    await deleteDoc(doc(db, this.collectionName, id));
  }

  async findById(id: string): Promise<ParentApproval | null> {
    if (virtualDatabase.isActive()) {
      const data = await virtualDatabase.getDoc(this.collectionName, id);
      if (!data) return null;
      return { id: data.id, ...data } as ParentApproval;
    }
    const snap = await getDoc(doc(db, this.collectionName, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as ParentApproval;
  }

  async findAll(): Promise<ParentApproval[]> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs(this.collectionName);
      return items.map(d => ({ id: d.id, ...d } as ParentApproval));
    }
    const snap = await getDocs(collection(db, this.collectionName));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ParentApproval));
  }

  async findByParentId(parentId: string): Promise<ParentApproval[]> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs(this.collectionName, item => item.parentId === parentId);
      return items.map(d => ({ id: d.id, ...d } as ParentApproval));
    }
    const q = query(
      collection(db, this.collectionName),
      where('parentId', '==', parentId),
      orderBy('updatedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ParentApproval));
  }

  async findByStudentId(studentId: string): Promise<ParentApproval[]> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs(this.collectionName, item => item.studentId === studentId);
      return items.map(d => ({ id: d.id, ...d } as ParentApproval));
    }
    const q = query(
      collection(db, this.collectionName),
      where('studentId', '==', studentId),
      orderBy('updatedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ParentApproval));
  }

  async findByApproverId(approverId: string): Promise<ParentApproval[]> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs(this.collectionName, item => item.approverId === approverId);
      return items.map(d => ({ id: d.id, ...d } as ParentApproval));
    }
    const q = query(
      collection(db, this.collectionName),
      where('approverId', '==', approverId),
      orderBy('updatedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ParentApproval));
  }
}
