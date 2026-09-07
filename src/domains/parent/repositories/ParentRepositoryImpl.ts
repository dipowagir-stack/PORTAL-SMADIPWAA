import { collection, doc, getDocs, getDoc, query, where, setDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { IParentRepository, IParentStudentRelationRepository } from './IParentRepository';
import { Parent, ParentStudentRelation } from '../types';
import { virtualDatabase } from '../../../foundation/sandbox/VirtualDatabase';

export class ParentRepositoryImpl implements IParentRepository {
  private collectionName = 'parents';

  async exists(id: string): Promise<boolean> {
    if (virtualDatabase.isActive()) {
      const data = await virtualDatabase.getDoc(this.collectionName, id);
      return !!data;
    }
    const snap = await getDoc(doc(db, this.collectionName, id));
    return snap.exists();
  }

  async save(item: Parent): Promise<Parent> {
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

  async findById(id: string): Promise<Parent | null> {
    if (virtualDatabase.isActive()) {
      const data = await virtualDatabase.getDoc(this.collectionName, id);
      if (!data) return null;
      return { ...data, id } as Parent;
    }
    const snap = await getDoc(doc(db, this.collectionName, id));
    if (!snap.exists()) return null;
    return { ...snap.data(), id: snap.id } as Parent;
  }

  async findAll(): Promise<Parent[]> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs(this.collectionName);
      return items.map(d => ({ ...d, id: d.id } as Parent));
    }
    const snap = await getDocs(collection(db, this.collectionName));
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as Parent));
  }

  async findByUserId(userId: string): Promise<Parent | null> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs(this.collectionName, item => item.userId === userId);
      if (items.length === 0) return null;
      return { ...items[0], id: items[0].id } as Parent;
    }
    const q = query(collection(db, this.collectionName), where('userId', '==', userId));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { ...snap.docs[0].data(), id: snap.docs[0].id } as Parent;
  }

  async findByPhoneNumber(phoneNumber: string): Promise<Parent | null> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs(this.collectionName, item => item.phoneNumber === phoneNumber);
      if (items.length === 0) return null;
      return { ...items[0], id: items[0].id } as Parent;
    }
    const q = query(collection(db, this.collectionName), where('phoneNumber', '==', phoneNumber));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { ...snap.docs[0].data(), id: snap.docs[0].id } as Parent;
  }
}

export class ParentStudentRelationRepositoryImpl implements IParentStudentRelationRepository {
  private collectionName = 'parent_student_relations';

  async exists(id: string): Promise<boolean> {
    if (virtualDatabase.isActive()) {
      const data = await virtualDatabase.getDoc(this.collectionName, id);
      return !!data;
    }
    const snap = await getDoc(doc(db, this.collectionName, id));
    return snap.exists();
  }

  async save(item: ParentStudentRelation): Promise<ParentStudentRelation> {
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

  async findById(id: string): Promise<ParentStudentRelation | null> {
    if (virtualDatabase.isActive()) {
      const data = await virtualDatabase.getDoc(this.collectionName, id);
      if (!data) return null;
      return { ...data, id } as ParentStudentRelation;
    }
    const snap = await getDoc(doc(db, this.collectionName, id));
    if (!snap.exists()) return null;
    return { ...snap.data(), id: snap.id } as ParentStudentRelation;
  }

  async findAll(): Promise<ParentStudentRelation[]> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs(this.collectionName);
      return items.map(d => ({ ...d, id: d.id } as ParentStudentRelation));
    }
    const snap = await getDocs(collection(db, this.collectionName));
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as ParentStudentRelation));
  }

  async findRelationsByParentId(parentId: string): Promise<ParentStudentRelation[]> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs(this.collectionName, item => item.parentId === parentId);
      return items.map(d => ({ ...d, id: d.id } as ParentStudentRelation));
    }
    const q = query(collection(db, this.collectionName), where('parentId', '==', parentId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as ParentStudentRelation));
  }

  async findRelationsByStudentId(studentId: string): Promise<ParentStudentRelation[]> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs(this.collectionName, item => item.studentId === studentId);
      return items.map(d => ({ ...d, id: d.id } as ParentStudentRelation));
    }
    const q = query(collection(db, this.collectionName), where('studentId', '==', studentId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as ParentStudentRelation));
  }
}
