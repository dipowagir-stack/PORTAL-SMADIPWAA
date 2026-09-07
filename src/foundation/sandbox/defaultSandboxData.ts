/**
 * Default Realistic Fallback Data for SMAS Islam Diponegoro Wagir Sandbox Engine
 * Ensures 100% zero-crash operation even if Live Firestore Quota is exceeded.
 */

export const DEFAULT_FALLBACK_SANDBOX_DATA: Record<string, Record<string, any>> = {
  curriculum_data: {
    master: {
      id: 'master',
      daysPerWeek: 6,
      periodsPerDay: 8,
      classes: ['X', 'XI-IPA', 'XI-IPS', 'XII-IPA', 'XII-IPS'],
      startTime: '07:00',
      periodDuration: 45,
      breakCount: 2,
      breakDuration: 15,
      break1AfterPeriod: 4,
      break2AfterPeriod: 6,
      fridayStartTime: '07:00',
      fridayPeriodDuration: 35,
      fridayBreakCount: 2,
      fridayBreakDuration: 15,
      fridayBreak1AfterPeriod: 4,
      fridayBreak2AfterPeriod: 6,
      subjects: [
        'Pendidikan Agama Islam',
        'Pendidikan Pancasila & Kewarganegaraan',
        'Bahasa Indonesia',
        'Matematika Wajib',
        'Sejarah Indonesia',
        'Bahasa Inggris',
        'Seni Budaya',
        'Pendidikan Jasmani & Olahraga',
        'Prakarya & Kewirausahaan',
        'Matematika Peminatan',
        'Biologi',
        'Fisika',
        'Kimia',
        'Geografi',
        'Sosiologi',
        'Ekonomi',
        'Bahasa Arab'
      ],
      isTimeOffSubmissionOpen: false,
      updatedAt: new Date().toISOString()
    }
  },

  settings: {
    global: {
      id: 'global',
      schoolName: 'SMAS Islam Diponegoro Wagir',
      npsn: '20517743',
      address: 'Jl. Raya Wagir No. 12, Wagir, Kabupaten Malang, Jawa Timur',
      postalCode: '65158',
      phone: '(0341) 801234',
      email: 'smas.diponegoro.wagir@gmail.com',
      website: 'https://smasislamdiponegorowagir.sch.id',
      principalName: 'Drs. H. Ahmad Fauzi, M.Pd.',
      principalNip: '197005121998021001',
      academicYear: '2026/2027',
      currentSemester: 'Ganjil',
      updatedAt: new Date().toISOString()
    }
  },

  academic_periods: {
    'period_2026_2027_ganjil': {
      id: 'period_2026_2027_ganjil',
      name: 'Tahun Ajaran 2026/2027 - Semester Ganjil',
      academicYear: '2026/2027',
      semester: 'Ganjil',
      startDate: '2026-07-15',
      endDate: '2026-12-20',
      status: 'active',
      isCurrent: true,
      createdAt: new Date().toISOString()
    },
    'period_2025_2026_genap': {
      id: 'period_2025_2026_genap',
      name: 'Tahun Ajaran 2025/2026 - Semester Genap',
      academicYear: '2025/2026',
      semester: 'Genap',
      startDate: '2026-01-05',
      endDate: '2026-06-25',
      status: 'archived',
      isCurrent: false,
      createdAt: new Date().toISOString()
    }
  },

  users: {
    'user_superadmin_1': {
      id: 'user_superadmin_1',
      uid: 'user_superadmin_1',
      email: 'offcdipowagir@gmail.com',
      name: 'OFFC DIPOWAGIR (Super Admin)',
      role: 'super_admin',
      roles: ['super_admin', 'admin', 'curriculum', 'teacher', 'finance'],
      isActive: true,
      lastLogin: new Date().toISOString()
    },
    'user_principal_1': {
      id: 'user_principal_1',
      uid: 'user_principal_1',
      email: 'kepsek@diponegoro.sch.id',
      name: 'Drs. H. Ahmad Fauzi, M.Pd.',
      role: 'kepala_sekolah',
      roles: ['kepala_sekolah'],
      nip: '197005121998021001',
      isActive: true,
      lastLogin: new Date().toISOString()
    },
    'user_curriculum_1': {
      id: 'user_curriculum_1',
      uid: 'user_curriculum_1',
      email: 'kurikulum@diponegoro.sch.id',
      name: 'Dra. Hj. Siti Rahmawati, M.Pd.',
      role: 'curriculum',
      roles: ['curriculum', 'teacher'],
      nip: '197503142001122002',
      isActive: true
    },
    'user_teacher_1': {
      id: 'user_teacher_1',
      uid: 'user_teacher_1',
      email: 'guru.matematika@diponegoro.sch.id',
      name: 'M. Radit Candra Winata, S.Pd.',
      role: 'teacher',
      roles: ['teacher'],
      nip: '198804102015031003',
      teachingSubjects: ['Matematika Wajib', 'Matematika Peminatan'],
      maxHours: 28,
      timeOff: [],
      isActive: true
    },
    'user_teacher_2': {
      id: 'user_teacher_2',
      uid: 'user_teacher_2',
      email: 'guru.pai@diponegoro.sch.id',
      name: 'Ust. Malik Maulana Pratama, S.Pd.I.',
      role: 'teacher',
      roles: ['teacher'],
      teachingSubjects: ['Pendidikan Agama Islam', 'Bahasa Arab'],
      maxHours: 24,
      timeOff: [],
      isActive: true
    },
    'user_teacher_3': {
      id: 'user_teacher_3',
      uid: 'user_teacher_3',
      email: 'guru.fisika@diponegoro.sch.id',
      name: 'Romeo Galistra, M.Si.',
      role: 'teacher',
      roles: ['teacher'],
      teachingSubjects: ['Fisika'],
      maxHours: 24,
      timeOff: [],
      isActive: true
    },
    'user_tu_1': {
      id: 'user_tu_1',
      uid: 'user_tu_1',
      email: 'tu@diponegoro.sch.id',
      name: 'Rahmat Afandi, S.Kom.',
      role: 'tu',
      roles: ['tu'],
      isActive: true
    },
    'user_bendahara_1': {
      id: 'user_bendahara_1',
      uid: 'user_bendahara_1',
      email: 'bendahara@diponegoro.sch.id',
      name: 'Nopan Lias, S.E.',
      role: 'finance',
      roles: ['finance'],
      isActive: true
    },
    'user_student_1': {
      id: 'user_student_1',
      uid: 'user_student_1',
      email: 'student.nisa@diponegoro.sch.id',
      name: 'Nisa Annisa Widayanti',
      role: 'student',
      roles: ['student'],
      nisn: '0071234567',
      nis: '20261001',
      className: 'XI-IPA',
      academicYear: '2026/2027',
      gender: 'Perempuan',
      isActive: true
    },
    'user_student_2': {
      id: 'user_student_2',
      uid: 'user_student_2',
      email: 'student.wijaya@diponegoro.sch.id',
      name: 'Wijaya Saputra',
      role: 'student',
      roles: ['student'],
      nisn: '0071234568',
      nis: '20261002',
      className: 'XI-IPS',
      academicYear: '2026/2027',
      gender: 'Laki-Laki',
      isActive: true
    },
    'user_student_3': {
      id: 'user_student_3',
      uid: 'user_student_3',
      email: 'student.milzam@diponegoro.sch.id',
      name: 'Milzam Faldi',
      role: 'student',
      roles: ['student'],
      nisn: '0081234569',
      nis: '20261003',
      className: 'X',
      academicYear: '2026/2027',
      gender: 'Laki-Laki',
      isActive: true
    },
    'user_parent_1': {
      id: 'user_parent_1',
      uid: 'user_parent_1',
      email: 'wali.nisa@gmail.com',
      name: 'Bpk. Hendro Widayat',
      role: 'parent',
      roles: ['parent'],
      phoneNumber: '081234567890',
      isActive: true
    }
  },

  students: {
    'user_student_1': {
      id: 'user_student_1',
      userId: 'user_student_1',
      name: 'Nisa Annisa Widayanti',
      nisn: '0071234567',
      nis: '20261001',
      className: 'XI-IPA',
      gender: 'Perempuan',
      status: 'active',
      academicYear: '2026/2027'
    },
    'user_student_2': {
      id: 'user_student_2',
      userId: 'user_student_2',
      name: 'Wijaya Saputra',
      nisn: '0071234568',
      nis: '20261002',
      className: 'XI-IPS',
      gender: 'Laki-Laki',
      status: 'active',
      academicYear: '2026/2027'
    },
    'user_student_3': {
      id: 'user_student_3',
      userId: 'user_student_3',
      name: 'Milzam Faldi',
      nisn: '0081234569',
      nis: '20261003',
      className: 'X',
      gender: 'Laki-Laki',
      status: 'active',
      academicYear: '2026/2027'
    }
  },

  parents: {
    'user_parent_1': {
      id: 'user_parent_1',
      userId: 'user_parent_1',
      name: 'Bpk. Hendro Widayat',
      phoneNumber: '081234567890',
      email: 'wali.nisa@gmail.com',
      studentIds: ['user_student_1']
    }
  },

  parent_relations: {
    'rel_1': {
      id: 'rel_1',
      parentId: 'user_parent_1',
      studentId: 'user_student_1',
      relationshipType: 'FATHER',
      isPrimaryGuardian: true,
      verified: true
    }
  },

  schedules: {
    'sch_1': {
      id: 'sch_1',
      className: 'XI-IPA',
      dayIndex: 0,
      periodIndex: 0,
      subject: 'Matematika Peminatan',
      teacherId: 'user_teacher_1',
      teacherName: 'M. Radit Candra Winata, S.Pd.',
      room: 'R-11 IPA'
    },
    'sch_2': {
      id: 'sch_2',
      className: 'XI-IPA',
      dayIndex: 0,
      periodIndex: 1,
      subject: 'Matematika Peminatan',
      teacherId: 'user_teacher_1',
      teacherName: 'M. Radit Candra Winata, S.Pd.',
      room: 'R-11 IPA'
    },
    'sch_3': {
      id: 'sch_3',
      className: 'XI-IPA',
      dayIndex: 0,
      periodIndex: 2,
      subject: 'Fisika',
      teacherId: 'user_teacher_3',
      teacherName: 'Romeo Galistra, M.Si.',
      room: 'Lab Fisika'
    },
    'sch_4': {
      id: 'sch_4',
      className: 'X',
      dayIndex: 1,
      periodIndex: 0,
      subject: 'Pendidikan Agama Islam',
      teacherId: 'user_teacher_2',
      teacherName: 'Ust. Malik Maulana Pratama, S.Pd.I.',
      room: 'R-10'
    }
  },

  admission_waves: {
    'WAVE-1': {
      id: 'WAVE-1',
      name: 'Gelombang 1 - Jalur Prestasi & Reguler',
      academicYear: '2026/2027',
      startDate: '2026-01-01',
      endDate: '2026-06-30',
      quota: 120,
      status: 'OPEN',
      registrationFee: 150000,
      createdAt: new Date().toISOString()
    }
  },

  admission_document_requirements: {
    'REQ-KK': {
      id: 'REQ-KK',
      waveId: 'WAVE-1',
      documentName: 'Kartu Keluarga (KK)',
      documentCode: 'kk',
      isRequired: true,
      maxSizeBytes: 5242880,
      allowedTypes: ['application/pdf', 'image/jpeg', 'image/png']
    },
    'REQ-IJAZAH': {
      id: 'REQ-IJAZAH',
      waveId: 'WAVE-1',
      documentName: 'Ijazah / Surat Keterangan Lulus (SKL)',
      documentCode: 'ijazah',
      isRequired: true,
      maxSizeBytes: 5242880,
      allowedTypes: ['application/pdf', 'image/jpeg', 'image/png']
    },
    'REQ-AKTA': {
      id: 'REQ-AKTA',
      waveId: 'WAVE-1',
      documentName: 'Akta Kelahiran',
      documentCode: 'akta',
      isRequired: true,
      maxSizeBytes: 5242880,
      allowedTypes: ['application/pdf', 'image/jpeg', 'image/png']
    }
  },

  finance_billings: {
    'BILL-SPP-JULI': {
      id: 'BILL-SPP-JULI',
      title: 'SPP Bulan Juli 2026',
      academicYear: '2026/2027',
      targetClass: 'Semua Kelas',
      amount: 250000,
      dueDate: '2026-07-10',
      category: 'SPP',
      status: 'ACTIVE'
    },
    'BILL-GEDUNG': {
      id: 'BILL-GEDUNG',
      title: 'Infaq Sarana / Gedung Siswa Baru',
      academicYear: '2026/2027',
      targetClass: 'X',
      amount: 1500000,
      dueDate: '2026-08-31',
      category: 'GEDUNG',
      status: 'ACTIVE'
    }
  },

  letter_templates: {
    'TMPL-AKTIF': {
      id: 'TMPL-AKTIF',
      title: 'Surat Keterangan Aktif Siswa',
      code: 'SKA',
      bodyTemplate: 'Menerangkan bahwa {{nama_siswa}} NISN: {{nisn}} adalah benar siswa aktif kelas {{kelas}} SMAS Islam Diponegoro Wagir Tahun Pelajaran {{tahun_ajaran}}.',
      signatory: 'Kepala Sekolah',
      category: 'SISWA'
    },
    'TMPL-PANGGILAN': {
      id: 'TMPL-PANGGILAN',
      title: 'Surat Panggilan Orang Tua / Wali',
      code: 'SPO',
      bodyTemplate: 'Mengharap kehadiran Bapak/Ibu Wali dari siswa {{nama_siswa}} kelas {{kelas}} pada hari {{hari}}, tanggal {{tanggal}} untuk koordinasi perkembangan belajar siswa.',
      signatory: 'Guru BK / Waka Kesiswaan',
      category: 'BK'
    }
  },

  audit_logs: {
    'log_init': {
      id: 'log_init',
      action: 'SYSTEM_BOOT',
      actorEmail: 'system@diponegoro.sch.id',
      timestamp: new Date().toISOString(),
      details: 'Sistem SMAS Islam Diponegoro Wagir Sandbox Engine diinisialisasi.'
    }
  }
};
