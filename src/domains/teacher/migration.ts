import { collection, getDocs, query, where, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { TeacherProfile, TeacherEmployment } from './types';

export async function migrateTeacherDomain() {
  console.log("Starting Teacher Domain migration...");
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('role', '==', 'teacher'));
  const snap = await getDocs(q);

  let batch = writeBatch(db);
  let count = 0;

  for (const userDoc of snap.docs) {
    const userData = userDoc.data();
    const userId = userDoc.id;

    // 1. Migrate Teacher Profile
    const profileRef = doc(collection(db, 'teacher_profiles'));
    const profileData: TeacherProfile = {
      userId,
      nuptk: userData.nuptk || '',
      nip: userData.nip || '',
      nik: userData.nik || '',
      phone: userData.phone || '',
      updatedAt: Date.now()
    };
    batch.set(profileRef, profileData);

    // 2. Migrate Employment
    const empRef = doc(collection(db, 'teacher_employments'));
    const empData: TeacherEmployment = {
      userId,
      status: 'gty',
      joinDate: new Date().toISOString().split('T')[0],
      institution: 'SMAS ISLAM DIPONEGORO WAGIR',
      updatedAt: Date.now()
    };
    batch.set(empRef, empData);

    // 3. (Optional) We could also copy over 'teacher_documents' to 'teacher_documents_v2' 
    // or 'schedules' to 'teacher_schedules', but for this migration we'll focus on the core profiles
    // to ensure backwards compatibility with the existing TeacherDashboard which relies on the old collections.
    
    count++;
    if (count % 100 === 0) {
      await batch.commit();
      batch = writeBatch(db);
    }
  }

  if (count % 100 !== 0) {
    await batch.commit();
  }

  console.log(`Migration complete. Migrated ${count} teachers to new domain schema.`);
}

export async function rollbackTeacherDomain() {
  console.log("Starting rollback for Teacher domain...");
  const cols = [
    'teacher_profiles', 'teacher_employments', 'teacher_certifications',
    'teacher_teaching_loads', 'teacher_schedules', 'teacher_attendances',
    'teacher_performances', 'teacher_researches', 'teacher_trainings', 'teacher_documents_v2'
  ];

  for (const col of cols) {
    const snap = await getDocs(collection(db, col));
    let batch = writeBatch(db);
    let count = 0;
    for (const d of snap.docs) {
      batch.delete(d.ref);
      count++;
      if (count % 100 === 0) {
        await batch.commit();
        batch = writeBatch(db);
      }
    }
    if (count % 100 !== 0) {
      await batch.commit();
    }
    console.log(`Rolled back ${count} documents from ${col}`);
  }
  console.log("Teacher Domain Rollback complete.");
}
