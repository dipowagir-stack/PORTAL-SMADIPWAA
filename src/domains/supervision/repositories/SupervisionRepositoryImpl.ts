import { collection, doc, getDocs, getDoc, query, where, setDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { ISupervisionRepository } from './ISupervisionRepository';
import { SupervisionSession, SupervisionSessionProps } from '../models/SupervisionSession';
import { SupervisionStatus, SupervisionStatusType } from '../models/SupervisionStatus';
import { SupervisionType } from '../models/SupervisionType';
import { virtualDatabase } from '../../../foundation/sandbox/VirtualDatabase';

export class SupervisionRepositoryImpl implements ISupervisionRepository {
  private collectionName = 'supervisions';

  private toDomain(data: any, id: string): SupervisionSession {
    return SupervisionSession.create({
      id,
      tenantId: data.tenantId,
      academicYearId: data.academicYearId,
      semesterId: data.semesterId,
      principalId: data.principalId,
      teacherId: data.teacherId,
      scheduledDate: data.scheduledDate,
      status: SupervisionStatus.create(data.status as SupervisionStatusType),
      type: SupervisionType.create(data.type),
      observation: data.observation,
      feedback: data.feedback,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy
    });
  }

  private toPersistence(session: SupervisionSession): any {
    return {
      tenantId: session.props.tenantId,
      academicYearId: session.props.academicYearId,
      semesterId: session.props.semesterId,
      principalId: session.props.principalId,
      teacherId: session.props.teacherId,
      scheduledDate: session.props.scheduledDate,
      status: session.props.status.value,
      type: session.props.type.value,
      observation: session.props.observation || null,
      feedback: session.props.feedback || null,
      startedAt: session.props.startedAt || null,
      completedAt: session.props.completedAt || null,
      createdAt: session.props.createdAt,
      updatedAt: session.props.updatedAt,
      createdBy: session.props.createdBy,
      updatedBy: session.props.updatedBy
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

  async save(session: SupervisionSession): Promise<SupervisionSession> {
    const data = this.toPersistence(session);
    if (virtualDatabase.isActive()) {
      if (session.props.id) {
        await virtualDatabase.updateDoc(this.collectionName, session.props.id, data);
        return session;
      } else {
        const id = await virtualDatabase.addDoc(this.collectionName, data);
        session.props.id = id;
        return session;
      }
    }

    if (session.props.id) {
      const ref = doc(db, this.collectionName, session.props.id);
      await updateDoc(ref, data);
      return session;
    } else {
      const docRef = await addDoc(collection(db, this.collectionName), data);
      session.props.id = docRef.id;
      return session;
    }
  }

  async delete(id: string): Promise<void> {
    if (virtualDatabase.isActive()) {
      await virtualDatabase.deleteDoc(this.collectionName, id);
      return;
    }
    await deleteDoc(doc(db, this.collectionName, id));
  }

  async findById(id: string): Promise<SupervisionSession | null> {
    if (virtualDatabase.isActive()) {
      const data = await virtualDatabase.getDoc(this.collectionName, id);
      if (!data) return null;
      return this.toDomain(data, id);
    }
    const snap = await getDoc(doc(db, this.collectionName, id));
    if (!snap.exists()) return null;
    return this.toDomain(snap.data(), snap.id);
  }

  async findAll(): Promise<SupervisionSession[]> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs(this.collectionName);
      return items.map(d => this.toDomain(d, d.id));
    }
    const snap = await getDocs(collection(db, this.collectionName));
    return snap.docs.map(d => this.toDomain(d.data(), d.id));
  }

  async findByTeacherId(tenantId: string, teacherId: string): Promise<SupervisionSession[]> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs(this.collectionName, item => item.tenantId === tenantId && item.teacherId === teacherId);
      return items.map(d => this.toDomain(d, d.id));
    }
    const q = query(collection(db, this.collectionName), where('tenantId', '==', tenantId), where('teacherId', '==', teacherId));
    const snap = await getDocs(q);
    return snap.docs.map(d => this.toDomain(d.data(), d.id));
  }

  async findBySupervisorId(tenantId: string, supervisorId: string): Promise<SupervisionSession[]> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs(this.collectionName, item => item.tenantId === tenantId && item.principalId === supervisorId);
      return items.map(d => this.toDomain(d, d.id));
    }
    const q = query(collection(db, this.collectionName), where('tenantId', '==', tenantId), where('principalId', '==', supervisorId));
    const snap = await getDocs(q);
    return snap.docs.map(d => this.toDomain(d.data(), d.id));
  }

  async findByStatus(tenantId: string, status: string): Promise<SupervisionSession[]> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs(this.collectionName, item => item.tenantId === tenantId && item.status === status);
      return items.map(d => this.toDomain(d, d.id));
    }
    const q = query(collection(db, this.collectionName), where('tenantId', '==', tenantId), where('status', '==', status));
    const snap = await getDocs(q);
    return snap.docs.map(d => this.toDomain(d.data(), d.id));
  }

  async findByPeriod(tenantId: string, academicYearId: string, semesterId: string): Promise<SupervisionSession[]> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs(this.collectionName, item => 
        item.tenantId === tenantId && item.academicYearId === academicYearId && item.semesterId === semesterId
      );
      return items.map(d => this.toDomain(d, d.id));
    }
    const q = query(collection(db, this.collectionName), 
      where('tenantId', '==', tenantId), 
      where('academicYearId', '==', academicYearId),
      where('semesterId', '==', semesterId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => this.toDomain(d.data(), d.id));
  }

  async findByTenant(tenantId: string): Promise<SupervisionSession[]> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs(this.collectionName, item => item.tenantId === tenantId);
      return items.map(d => this.toDomain(d, d.id));
    }
    const q = query(collection(db, this.collectionName), where('tenantId', '==', tenantId));
    const snap = await getDocs(q);
    return snap.docs.map(d => this.toDomain(d.data(), d.id));
  }
}

