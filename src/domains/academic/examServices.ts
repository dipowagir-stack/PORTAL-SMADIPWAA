import { collection, doc, getDocs, getDoc, setDoc, query, where, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ExamRoom, ExamSchedule, ExamReport } from './types';
import { virtualDatabase } from '../../foundation/sandbox/VirtualDatabase';

const sanitizeObject = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj, (k, v) => (v === undefined ? null : v)));
};

export const getExamRooms = async (): Promise<ExamRoom[]> => {
  if (virtualDatabase.isActive()) {
    const items = await virtualDatabase.getDocs('exam_rooms');
    return items.map(d => {
      let layout = d.layout;
      if ((!layout || !Array.isArray(layout)) && d.layoutJson) {
        try {
          layout = JSON.parse(d.layoutJson);
        } catch {
          layout = null;
        }
      }
      return { id: d.id, ...d, layout } as ExamRoom;
    });
  }
  const q = query(collection(db, 'exam_rooms'));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    let layout = data.layout;
    if ((!layout || !Array.isArray(layout)) && data.layoutJson) {
      try {
        layout = JSON.parse(data.layoutJson);
      } catch {
        layout = null;
      }
    }
    return { id: d.id, ...data, layout } as ExamRoom;
  });
};

export const saveExamRoom = async (room: Partial<ExamRoom>): Promise<void> => {
  const cleanRoom: any = sanitizeObject(room);
  
  // Firestore does not allow 2D nested arrays; serialize layout into layoutJson
  if (cleanRoom.layout && Array.isArray(cleanRoom.layout)) {
    cleanRoom.layoutJson = JSON.stringify(cleanRoom.layout);
    delete cleanRoom.layout;
  }

  if (virtualDatabase.isActive()) {
    if (cleanRoom.id) {
      await virtualDatabase.updateDoc('exam_rooms', cleanRoom.id, cleanRoom);
    } else {
      const id = await virtualDatabase.addDoc('exam_rooms', cleanRoom);
      cleanRoom.id = id;
    }
    return;
  }
  if (cleanRoom.id) {
    await updateDoc(doc(db, 'exam_rooms', cleanRoom.id), cleanRoom);
  } else {
    const dRef = doc(collection(db, 'exam_rooms'));
    await setDoc(dRef, { ...cleanRoom, id: dRef.id });
  }
};

export const deleteExamRoom = async (id: string): Promise<void> => {
  if (virtualDatabase.isActive()) {
    await virtualDatabase.deleteDoc('exam_rooms', id);
    return;
  }
  await deleteDoc(doc(db, 'exam_rooms', id));
};

export const getExamSchedules = async (): Promise<ExamSchedule[]> => {
  if (virtualDatabase.isActive()) {
    const items = await virtualDatabase.getDocs('exam_schedules');
    return items.map(d => ({ id: d.id, ...d } as ExamSchedule));
  }
  const q = query(collection(db, 'exam_schedules'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ExamSchedule));
};

export const saveExamSchedule = async (schedule: Partial<ExamSchedule>): Promise<void> => {
  const cleanSchedule = sanitizeObject(schedule);
  if (virtualDatabase.isActive()) {
    if (cleanSchedule.id) {
      await virtualDatabase.updateDoc('exam_schedules', cleanSchedule.id, cleanSchedule);
    } else {
      const id = await virtualDatabase.addDoc('exam_schedules', cleanSchedule);
      cleanSchedule.id = id;
    }
    return;
  }
  if (cleanSchedule.id) {
    await updateDoc(doc(db, 'exam_schedules', cleanSchedule.id), cleanSchedule as any);
  } else {
    const dRef = doc(collection(db, 'exam_schedules'));
    await setDoc(dRef, { ...cleanSchedule, id: dRef.id });
  }
};

export const deleteExamSchedule = async (id: string): Promise<void> => {
  if (virtualDatabase.isActive()) {
    await virtualDatabase.deleteDoc('exam_schedules', id);
    return;
  }
  await deleteDoc(doc(db, 'exam_schedules', id));
};

export const publishExamSchedule = async (id: string): Promise<void> => {
  if (virtualDatabase.isActive()) {
    await virtualDatabase.updateDoc('exam_schedules', id, { status: 'published' });
    return;
  }
  await updateDoc(doc(db, 'exam_schedules', id), { status: 'published' });
};

export const getExamReports = async (): Promise<ExamReport[]> => {
  if (virtualDatabase.isActive()) {
    const items = await virtualDatabase.getDocs('exam_reports');
    return items.map(d => ({ id: d.id, ...d } as ExamReport));
  }
  const q = query(collection(db, 'exam_reports'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ExamReport));
};

export const saveExamReport = async (report: Partial<ExamReport>): Promise<void> => {
  const cleanReport = sanitizeObject(report);
  if (virtualDatabase.isActive()) {
    if (cleanReport.id) {
      await virtualDatabase.updateDoc('exam_reports', cleanReport.id, cleanReport);
    } else {
      const id = await virtualDatabase.addDoc('exam_reports', cleanReport);
      cleanReport.id = id;
    }
    return;
  }
  if (cleanReport.id) {
    await updateDoc(doc(db, 'exam_reports', cleanReport.id), cleanReport as any);
  } else {
    const dRef = doc(collection(db, 'exam_reports'));
    await setDoc(dRef, { ...cleanReport, id: dRef.id });
  }
};

