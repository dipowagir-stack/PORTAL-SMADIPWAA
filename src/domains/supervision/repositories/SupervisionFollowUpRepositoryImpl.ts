import { db } from '../../../lib/firebase';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { SupervisionFollowUp, SupervisionFollowUpProps } from '../models/SupervisionFollowUp';
import { ISupervisionFollowUpRepository } from './ISupervisionFollowUpRepository';

export class SupervisionFollowUpRepositoryImpl implements ISupervisionFollowUpRepository {
  private collectionName = 'supervision_follow_ups';

  async save(followUp: SupervisionFollowUp): Promise<SupervisionFollowUp> {
    const isNew = !followUp.props.id;
    const docRef = isNew 
      ? doc(collection(db, this.collectionName))
      : doc(db, this.collectionName, followUp.props.id!);
      
    if (isNew) {
      followUp.props.id = docRef.id;
    }

    await setDoc(docRef, followUp.props, { merge: true });
    return followUp;
  }

  async findById(id: string): Promise<SupervisionFollowUp | null> {
    const docRef = doc(db, this.collectionName, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return SupervisionFollowUp.create({ ...snap.data(), id: snap.id } as any);
  }

  async findBySupervisionId(tenantId: string, supervisionId: string): Promise<SupervisionFollowUp[]> {
    const q = query(
      collection(db, this.collectionName), 
      where('tenantId', '==', tenantId),
      where('supervisionId', '==', supervisionId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => SupervisionFollowUp.create({ ...d.data(), id: d.id } as any));
  }

  async findByTeacherId(tenantId: string, teacherId: string): Promise<SupervisionFollowUp[]> {
    const q = query(
      collection(db, this.collectionName), 
      where('tenantId', '==', tenantId),
      where('teacherId', '==', teacherId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => SupervisionFollowUp.create({ ...d.data(), id: d.id } as any));
  }
}
