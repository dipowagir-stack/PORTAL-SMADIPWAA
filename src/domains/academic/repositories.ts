import { collection, doc, getDocs, getDoc, query, where, setDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { BaseRepository } from '../../foundation/core/BaseRepository';
import { virtualDatabase } from '../../foundation/sandbox/VirtualDatabase';

export class FirestoreRepository<T> implements BaseRepository<T> {
  constructor(protected collectionName: string) {}

  async exists(id: string): Promise<boolean> {
    if (virtualDatabase.isActive()) {
      const data = await virtualDatabase.getDoc(this.collectionName, id);
      return !!data;
    }
    const snap = await getDoc(doc(db, this.collectionName, id));
    return snap.exists();
  }

  async save(item: T & { id?: string }): Promise<T> {
    if (virtualDatabase.isActive()) {
      if (item.id) {
        await virtualDatabase.setDoc(this.collectionName, item.id, item, { merge: true });
        return item;
      } else {
        const id = await virtualDatabase.addDoc(this.collectionName, item);
        return { ...item, id };
      }
    }

    if (item.id) {
      const ref = doc(db, this.collectionName, item.id);
      await setDoc(ref, item as any, { merge: true });
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

  async findById(id: string): Promise<T | null> {
    if (virtualDatabase.isActive()) {
      const data = await virtualDatabase.getDoc(this.collectionName, id);
      if (!data) return null;
      return { ...data, id } as T;
    }
    const snap = await getDoc(doc(db, this.collectionName, id));
    if (!snap.exists()) return null;
    return { ...snap.data(), id: snap.id } as T;
  }

  async findAll(): Promise<T[]> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs(this.collectionName);
      return items.map(d => ({ ...d, id: d.id } as T));
    }
    const snap = await getDocs(collection(db, this.collectionName));
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as T));
  }

  async findByQuery(field: string, operator: any, value: any): Promise<T[]> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs(this.collectionName, (item) => {
        if (operator === '==' || operator === '===') return item[field] === value;
        if (operator === '!=') return item[field] !== value;
        if (operator === 'in') return Array.isArray(value) && value.includes(item[field]);
        if (operator === 'array-contains') return Array.isArray(item[field]) && item[field].includes(value);
        if (operator === '>') return item[field] > value;
        if (operator === '>=') return item[field] >= value;
        if (operator === '<') return item[field] < value;
        if (operator === '<=') return item[field] <= value;
        return true;
      });
      return items.map(d => ({ ...d, id: d.id } as T));
    }
    const q = query(collection(db, this.collectionName), where(field, operator, value));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as T));
  }
}
