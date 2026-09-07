import { collection, doc, getDocs, getDoc, query, where, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { IParentInvitationRepository } from './IParentRepository';
import { ParentInvitation } from '../dtos/ParentInvitationDTO';
import { virtualDatabase } from '../../../foundation/sandbox/VirtualDatabase';

export class ParentInvitationRepositoryImpl implements IParentInvitationRepository {
  private collectionName = 'parent_invitations';

  async exists(id: string): Promise<boolean> {
    if (virtualDatabase.isActive()) {
      const data = await virtualDatabase.getDoc(this.collectionName, id);
      return !!data;
    }
    const snap = await getDoc(doc(db, this.collectionName, id));
    return snap.exists();
  }

  async save(item: ParentInvitation): Promise<ParentInvitation> {
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

  async findByToken(token: string): Promise<ParentInvitation | null> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs(this.collectionName, item => item.token === token);
      if (items.length === 0) return null;
      return { ...items[0], id: items[0].id } as ParentInvitation;
    }
    const q = query(collection(db, this.collectionName), where('token', '==', token));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { ...snap.docs[0].data(), id: snap.docs[0].id } as ParentInvitation;
  }

  async findActiveByEmailAndStudent(email: string, studentId: string): Promise<ParentInvitation[]> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs(this.collectionName, item => 
        item.targetEmail === email && item.studentId === studentId && (item.status === 'Sent' || item.status === 'Pending')
      );
      return items.map(d => ({ ...d, id: d.id } as ParentInvitation));
    }
    const q = query(
      collection(db, this.collectionName),
      where('targetEmail', '==', email),
      where('studentId', '==', studentId)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as ParentInvitation));
    return list.filter(inv => inv.status === 'Sent' || inv.status === 'Pending');
  }

  async findByPhoneNumber(phoneNumber: string): Promise<ParentInvitation[]> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs(this.collectionName, item => item.phoneNumber === phoneNumber);
      return items.map(d => ({ ...d, id: d.id } as ParentInvitation));
    }
    const q = query(
      collection(db, this.collectionName), 
      where('phoneNumber', '==', phoneNumber),
      where('status', '==', 'pending')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as ParentInvitation));
  }

  async findByStudentId(studentId: string): Promise<ParentInvitation[]> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs(this.collectionName, item => item.studentId === studentId);
      return items.map(d => ({ ...d, id: d.id } as ParentInvitation));
    }
    const q = query(collection(db, this.collectionName), where('studentId', '==', studentId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as ParentInvitation));
  }

  async delete(id: string): Promise<void> {
    if (virtualDatabase.isActive()) {
      await virtualDatabase.deleteDoc(this.collectionName, id);
      return;
    }
    await deleteDoc(doc(db, this.collectionName, id));
  }

  async findById(id: string): Promise<ParentInvitation | null> {
    if (virtualDatabase.isActive()) {
      const data = await virtualDatabase.getDoc(this.collectionName, id);
      if (!data) return null;
      return { ...data, id } as ParentInvitation;
    }
    const snap = await getDoc(doc(db, this.collectionName, id));
    if (!snap.exists()) return null;
    return { ...snap.data(), id: snap.id } as ParentInvitation;
  }

  async findAll(): Promise<ParentInvitation[]> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs(this.collectionName);
      return items.map(d => ({ ...d, id: d.id } as ParentInvitation));
    }
    const snap = await getDocs(collection(db, this.collectionName));
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as ParentInvitation));
  }
}
