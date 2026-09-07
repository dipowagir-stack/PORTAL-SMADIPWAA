import { collection, doc, getDocs, getDoc, query, where, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { ISupervisionEvidenceRepository } from './ISupervisionEvidenceRepository';
import { SupervisionEvidence } from '../models/SupervisionEvidence';
import { virtualDatabase } from '../../../foundation/sandbox/VirtualDatabase';

export class SupervisionEvidenceRepositoryImpl implements ISupervisionEvidenceRepository {
  private collectionName = 'supervision_evidences';

  private toDomain(data: any, id: string): SupervisionEvidence {
    return SupervisionEvidence.create({
      id,
      tenantId: data.tenantId,
      supervisionId: data.supervisionId,
      teacherId: data.teacherId,
      academicYearId: data.academicYearId,
      semesterId: data.semesterId,
      category: data.category,
      itemCode: data.itemCode,
      sourceType: data.sourceType,
      sourceId: data.sourceId,
      status: data.status,
      reviewerId: data.reviewerId,
      reviewerNotes: data.reviewerNotes,
      submittedAt: data.submittedAt,
    });
  }

  private toPersistence(evidence: SupervisionEvidence): any {
    return {
      tenantId: evidence.props.tenantId,
      supervisionId: evidence.props.supervisionId,
      teacherId: evidence.props.teacherId,
      academicYearId: evidence.props.academicYearId,
      semesterId: evidence.props.semesterId,
      category: evidence.props.category,
      itemCode: evidence.props.itemCode,
      sourceType: evidence.props.sourceType,
      sourceId: evidence.props.sourceId,
      status: evidence.props.status,
      reviewerId: evidence.props.reviewerId || null,
      reviewerNotes: evidence.props.reviewerNotes || null,
      submittedAt: evidence.props.submittedAt || null,
      createdAt: evidence.props.createdAt,
      updatedAt: evidence.props.updatedAt,
    };
  }

  async exists(id: string): Promise<boolean> {
    if (virtualDatabase.isActive()) {
      const data = await virtualDatabase.getDoc(this.collectionName, id);
      return !!data;
    }
    const snap = await getDoc(doc(db, this.collectionName, id));
    return snap.exists();
  }

  async save(evidence: SupervisionEvidence): Promise<SupervisionEvidence> {
    const data = this.toPersistence(evidence);
    
    if (virtualDatabase.isActive()) {
      if (evidence.props.id) {
        await virtualDatabase.updateDoc(this.collectionName, evidence.props.id, data);
        return evidence;
      } else {
        const id = await virtualDatabase.addDoc(this.collectionName, data);
        evidence.props.id = id;
        return evidence;
      }
    }

    if (evidence.props.id) {
      const ref = doc(db, this.collectionName, evidence.props.id);
      await updateDoc(ref, data);
      return evidence;
    } else {
      const docRef = await addDoc(collection(db, this.collectionName), data);
      evidence.props.id = docRef.id;
      return evidence;
    }
  }

  async delete(id: string): Promise<void> {
    if (virtualDatabase.isActive()) {
      await virtualDatabase.deleteDoc(this.collectionName, id);
      return;
    }
    await deleteDoc(doc(db, this.collectionName, id));
  }

  async findById(id: string): Promise<SupervisionEvidence | null> {
    if (virtualDatabase.isActive()) {
      const data = await virtualDatabase.getDoc(this.collectionName, id);
      if (!data) return null;
      return this.toDomain(data, id);
    }
    const snap = await getDoc(doc(db, this.collectionName, id));
    if (!snap.exists()) return null;
    return this.toDomain(snap.data(), snap.id);
  }

  async findAll(): Promise<SupervisionEvidence[]> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs(this.collectionName);
      return items.map(d => this.toDomain(d, d.id));
    }
    const snap = await getDocs(collection(db, this.collectionName));
    return snap.docs.map(d => this.toDomain(d.data(), d.id));
  }

  async findBySupervisionId(tenantId: string, supervisionId: string): Promise<SupervisionEvidence[]> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs(this.collectionName, item => 
        item.tenantId === tenantId && item.supervisionId === supervisionId
      );
      return items.map(d => this.toDomain(d, d.id));
    }
    const q = query(
      collection(db, this.collectionName),
      where('tenantId', '==', tenantId),
      where('supervisionId', '==', supervisionId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => this.toDomain(d.data(), d.id));
  }

  async findByTeacherId(tenantId: string, teacherId: string): Promise<SupervisionEvidence[]> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs(this.collectionName, item => 
        item.tenantId === tenantId && item.teacherId === teacherId
      );
      return items.map(d => this.toDomain(d, d.id));
    }
    const q = query(
      collection(db, this.collectionName),
      where('tenantId', '==', tenantId),
      where('teacherId', '==', teacherId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => this.toDomain(d.data(), d.id));
  }

  async findByPeriod(tenantId: string, academicYearId: string, semesterId: string): Promise<SupervisionEvidence[]> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs(this.collectionName, item => 
        item.tenantId === tenantId && item.academicYearId === academicYearId && item.semesterId === semesterId
      );
      return items.map(d => this.toDomain(d, d.id));
    }
    const q = query(
      collection(db, this.collectionName),
      where('tenantId', '==', tenantId),
      where('academicYearId', '==', academicYearId),
      where('semesterId', '==', semesterId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => this.toDomain(d.data(), d.id));
  }
}
