import { doc, setDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { WaveStatus } from './domains/admission/entities/AdmissionWave';

export async function seedAdmissionWave() {
  await setDoc(doc(db, 'admission_waves', 'WAVE-1'), {
    name: 'Gelombang 1 Reguler',
    academicYear: '2026/2027',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    quota: 100,
    status: WaveStatus.OPEN,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  console.log('Seeded WAVE-1');

  await setDoc(doc(db, 'admission_document_requirements', 'REQ-KK'), {
    waveId: 'WAVE-1',
    academicYear: '2026/2027',
    documentName: 'Kartu Keluarga',
    documentCode: 'kk',
    isRequired: true,
    maxSizeBytes: 5242880,
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  await setDoc(doc(db, 'admission_document_requirements', 'REQ-IJAZAH'), {
    waveId: 'WAVE-1',
    academicYear: '2026/2027',
    documentName: 'Ijazah / SKL',
    documentCode: 'ijazah',
    isRequired: true,
    maxSizeBytes: 5242880,
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  console.log('Seeded Requirements');
}
