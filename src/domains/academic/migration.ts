import { collection, getDocs, doc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AcademicClass, AcademicSemester, AcademicSubject } from './types';

export async function migrateAcademicDomain() {
  console.log("Starting Academic Domain migration...");
  let batch = writeBatch(db);
  let count = 0;

  // 1. Migrate Semesters (Create a default active semester if none exists)
  const semesterRef = doc(collection(db, 'academic_semesters'));
  batch.set(semesterRef, {
    year: '2023/2024',
    type: 'ganjil',
    isActive: true
  });
  count++;

  // 2. Fetch classes from curriculum_data/master and ensure they exist in 'classes' collection
  const masterRef = doc(db, 'curriculum_data', 'master');
  const masterSnap = await getDoc(masterRef);
  
  if (masterSnap.exists()) {
    const data = masterSnap.data();
    
    // Extract unique subjects from teaching loads if they exist
    if (data.teachingLoads && Array.isArray(data.teachingLoads)) {
      const subjects = new Set<string>();
      data.teachingLoads.forEach((load: any) => {
        if (load.subject) subjects.add(load.subject);
      });
      
      for (const subj of subjects) {
        const subjRef = doc(collection(db, 'academic_subjects'));
        batch.set(subjRef, {
          name: subj,
          code: subj.toUpperCase().substring(0, 3),
          createdAt: Date.now()
        });
        count++;
      }
    }
  }

  await batch.commit();
  console.log(`Migration complete. Generated ${count} academic foundation records.`);
}

export async function rollbackAcademicDomain() {
  console.log("Starting Academic Domain rollback...");
  const cols = [
    'academic_semesters', 'academic_subjects', 'academic_assessments',
    'academic_grades', 'academic_report_cards'
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
  console.log("Academic Domain Rollback complete.");
}
