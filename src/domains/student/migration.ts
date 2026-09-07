import { collection, getDocs, query, where, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { StudentAcademicProfile, StudentGuardian, StudentHealth } from './types';

export async function migrateStudentDomain() {
  console.log("Starting Student Domain migration...");
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('role', '==', 'student'));
  const snap = await getDocs(q);

  let batch = writeBatch(db);
  let count = 0;

  for (const userDoc of snap.docs) {
    const userData = userDoc.data();
    const userId = userDoc.id;

    // 1. Migrate Academic Profile
    const academicRef = doc(collection(db, 'student_academic_profiles'));
    const academicData: StudentAcademicProfile = {
      userId,
      nis: userData.nis || '',
      nisn: userData.nisn || '',
      status: 'active',
      entryYear: String(new Date().getFullYear()),
      updatedAt: Date.now()
    };
    batch.set(academicRef, academicData);

    // 2. Migrate Guardian Profile
    const guardianRef = doc(collection(db, 'student_guardians'));
    const guardianData: StudentGuardian = {
      userId,
      fatherName: userData.fatherName || '',
      motherName: userData.motherName || '',
      guardianName: userData.guardianName || '',
      guardianPhone: userData.waParentNumber || '', // Use WA Parent Number as phone
      updatedAt: Date.now()
    };
    batch.set(guardianRef, guardianData);

    // 3. Migrate Health Profile (Empty template)
    const healthRef = doc(collection(db, 'student_health'));
    const healthData: StudentHealth = {
      userId,
      updatedAt: Date.now()
    };
    batch.set(healthRef, healthData);

    // 4. Migrate Enrollment (if classId exists in user)
    if (userData.classId) {
      const enrollmentRef = doc(collection(db, 'student_enrollments'));
      batch.set(enrollmentRef, {
        userId,
        classId: userData.classId,
        academicYear: '2023/2024',
        semester: 1,
        enrolledAt: Date.now()
      });
    }

    count++;
    // Firestore batch limit is 500, we do chunking if needed.
    // For this simple seed we assume < 100 users.
    if (count % 100 === 0) {
      await batch.commit();
      batch = writeBatch(db);
    }
  }

  if (count % 100 !== 0) {
    await batch.commit();
  }

  console.log(`Migration complete. Migrated ${count} students to new domain schema.`);
}

export async function rollbackStudentDomain() {
  console.log("Starting rollback...");
  const cols = [
    'student_academic_profiles', 'student_guardians', 'student_health',
    'student_enrollments', 'student_achievements', 'student_violations',
    'student_documents', 'student_extracurriculars', 'student_portfolios'
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
  console.log("Rollback complete.");
}
