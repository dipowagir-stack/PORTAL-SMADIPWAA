export interface ChecklistItem {
  code: string;
  category: 'PERENCANAAN' | 'PELAKSANAAN' | 'ASESMEN' | 'DOKUMENTASI' | 'REFLEKSI' | 'TINDAK_LANJUT';
  label: string;
  description: string;
  expectedSourceTypes: ('DOCUMENT' | 'SYSTEM_RECORD' | 'MANUAL_ENTRY')[];
  required: boolean;
  weight: number;
  scoreRange: { min: number; max: number };
}

export const SUPERVISION_ADMINISTRATION_CHECKLIST: ChecklistItem[] = [
  // PERENCANAAN
  {
    code: 'PER-01',
    category: 'PERENCANAAN',
    label: 'Program Tahunan (Prota)',
    description: 'Dokumen Program Tahunan yang telah disahkan.',
    expectedSourceTypes: ['DOCUMENT'],
    required: true,
    weight: 10,
    scoreRange: { min: 1, max: 4 }
  },
  {
    code: 'PER-02',
    category: 'PERENCANAAN',
    label: 'Program Semester (Promes)',
    description: 'Dokumen Program Semester.',
    expectedSourceTypes: ['DOCUMENT'],
    required: true,
    weight: 10,
    scoreRange: { min: 1, max: 4 }
  },
  {
    code: 'PER-03',
    category: 'PERENCANAAN',
    label: 'Modul Ajar / RPP',
    description: 'Modul Ajar atau RPP minimal 1 bab terakhir.',
    expectedSourceTypes: ['DOCUMENT'],
    required: true,
    weight: 20,
    scoreRange: { min: 1, max: 4 }
  },
  {
    code: 'PER-04',
    category: 'PERENCANAAN',
    label: 'Bahan Ajar',
    description: 'Materi presentasi, handout, atau buku referensi.',
    expectedSourceTypes: ['DOCUMENT'],
    required: false,
    weight: 5,
    scoreRange: { min: 1, max: 4 }
  },
  
  // PELAKSANAAN
  {
    code: 'PEL-01',
    category: 'PELAKSANAAN',
    label: 'Jurnal Mengajar',
    description: 'Rekap jurnal mengajar di kelas (log aktivitas).',
    expectedSourceTypes: ['SYSTEM_RECORD', 'DOCUMENT'],
    required: true,
    weight: 10,
    scoreRange: { min: 1, max: 4 }
  },
  {
    code: 'PEL-02',
    category: 'PELAKSANAAN',
    label: 'Daftar Hadir Siswa',
    description: 'Rekap kehadiran siswa dari sistem.',
    expectedSourceTypes: ['SYSTEM_RECORD', 'DOCUMENT'],
    required: true,
    weight: 5,
    scoreRange: { min: 1, max: 4 }
  },

  // ASESMEN
  {
    code: 'ASE-01',
    category: 'ASESMEN',
    label: 'Lembar Kerja Peserta Didik (LKPD)',
    description: 'Contoh LKPD yang diberikan ke siswa.',
    expectedSourceTypes: ['DOCUMENT'],
    required: true,
    weight: 10,
    scoreRange: { min: 1, max: 4 }
  },
  {
    code: 'ASE-02',
    category: 'ASESMEN',
    label: 'Rubrik Penilaian',
    description: 'Kriteria dan rubrik penilaian yang digunakan.',
    expectedSourceTypes: ['DOCUMENT'],
    required: false,
    weight: 5,
    scoreRange: { min: 1, max: 4 }
  },
  {
    code: 'ASE-03',
    category: 'ASESMEN',
    label: 'Daftar Nilai Siswa',
    description: 'Rekap nilai formatif/sumatif.',
    expectedSourceTypes: ['SYSTEM_RECORD', 'DOCUMENT'],
    required: true,
    weight: 15,
    scoreRange: { min: 1, max: 4 }
  },

  // DOKUMENTASI & REFLEKSI
  {
    code: 'REF-01',
    category: 'REFLEKSI',
    label: 'Catatan Refleksi Guru',
    description: 'Catatan hasil refleksi pembelajaran yang telah dilakukan.',
    expectedSourceTypes: ['MANUAL_ENTRY', 'DOCUMENT'],
    required: false,
    weight: 5,
    scoreRange: { min: 1, max: 4 }
  },
  {
    code: 'TNL-01',
    category: 'TINDAK_LANJUT',
    label: 'Rencana Tindak Lanjut',
    description: 'Program perbaikan atau pengayaan.',
    expectedSourceTypes: ['MANUAL_ENTRY', 'DOCUMENT'],
    required: false,
    weight: 5,
    scoreRange: { min: 1, max: 4 }
  },
];

export const calculateSupervisionScore = (scores: Record<string, number>): { totalScore: number, maxScore: number, percentage: number, category: string } => {
  let totalScore = 0;
  let maxScore = 0;

  for (const item of SUPERVISION_ADMINISTRATION_CHECKLIST) {
    // Only include items that have been scored or are required
    if (scores[item.code] !== undefined) {
      totalScore += scores[item.code] * item.weight;
      maxScore += item.scoreRange.max * item.weight;
    } else if (item.required) {
       // if a required item is not scored, it still contributes to maxScore
       maxScore += item.scoreRange.max * item.weight;
    }
  }

  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  let category = 'Perlu Perbaikan';

  if (percentage >= 91) {
    category = 'Sangat Baik';
  } else if (percentage >= 76) {
    category = 'Baik';
  } else if (percentage >= 61) {
    category = 'Cukup';
  }

  return {
    totalScore,
    maxScore,
    percentage,
    category
  };
};
