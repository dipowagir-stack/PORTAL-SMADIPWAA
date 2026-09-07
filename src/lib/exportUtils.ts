import { collection, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { virtualDatabase } from '../foundation/sandbox/VirtualDatabase';

export interface CollectionGroup {
  id: string;
  name: string;
  description: string;
  icon?: string;
  collections: {
    key: string;
    label: string;
    description: string;
  }[];
}

export const MODULE_COLLECTION_GROUPS: CollectionGroup[] = [
  {
    id: 'identity_rbac',
    name: 'Identitas, Akun & Hak Akses (RBAC)',
    description: 'Data akun pengguna, peran, permission matrix, dan data tenant.',
    collections: [
      { key: 'users', label: 'Pengguna Sistem', description: 'Akun guru, staf, siswa, wali murid, dan admin' },
      { key: 'user_roles', label: 'Relasi Peran Pengguna', description: 'Penetapan role/peran per pengguna' },
      { key: 'role_permissions', label: 'Matriks Izin Role', description: 'Izin akses spesifik per peran sistem' },
      { key: 'tenants', label: 'Data Tenant / Sekolah', description: 'Profil sekolah dan data registrasi tenant' },
      { key: 'tenant_memberships', label: 'Keanggotaan Tenant', description: 'Relasi akun ke tenant/sekolah tertentu' }
    ]
  },
  {
    id: 'academic_curriculum',
    name: 'Akademik, Kurikulum & Jadwal',
    description: 'Tahun ajaran, semester, mata pelajaran, rombel, jadwal KBM, dan ujian.',
    collections: [
      { key: 'academic_years', label: 'Tahun Ajaran', description: 'Master tahun pelajaran aktif dan arsip' },
      { key: 'academic_semesters', label: 'Semester Akademik', description: 'Master semester ganjil/genap' },
      { key: 'academic_periods', label: 'Periode Akademik', description: 'Konfigurasi siklus & lifecycle periode' },
      { key: 'academic_subjects', label: 'Mata Pelajaran', description: 'Master mata pelajaran & kurikulum' },
      { key: 'classes', label: 'Rombongan Belajar (Kelas)', description: 'Data ruang kelas dan wali kelas' },
      { key: 'schedules', label: 'Jadwal Pelajaran', description: 'Alokasi jam pelajaran guru dan kelas' },
      { key: 'curriculum_data', label: 'Konfigurasi Kurikulum', description: 'Struktur kurikulum (Merdeka / K13) & kalender' },
      { key: 'prota_promes', label: 'Prota & Promes', description: 'Program tahunan dan semester guru' },
      { key: 'ketersediaan', label: 'Ketersediaan Mengajar Guru', description: 'Preferensi hari & jam kosong guru' },
      { key: 'exam_rooms', label: 'Ruang Ujian', description: 'Data ruangan pelaksanaan asesmen/ujian' },
      { key: 'exam_schedules', label: 'Jadwal Ujian', description: 'Sesi dan jadwal tes/asesmen' },
      { key: 'exam_reports', label: 'Laporan Ujian', description: 'Rekapitulasi hasil dan berita acara ujian' },
      { key: 'academic_assessments', label: 'Penilaian Akademik', description: 'Komponen nilai formatif & sumatif' },
      { key: 'academic_grades', label: 'Nilai Siswa', description: 'Daftar nilai mata pelajaran siswa' },
      { key: 'academic_report_cards', label: 'Rapor Akademik', description: 'Kompilasi cetak rapor semester' }
    ]
  },
  {
    id: 'students',
    name: 'Kesiswaan & Profil Siswa',
    description: 'Profil akademik, riwayat rombel, wali siswa, prestasi, dan rekam medis.',
    collections: [
      { key: 'student_academic_profiles', label: 'Profil Akademik Siswa', description: 'NISN, NIS, data kesiswaan terintegrasi' },
      { key: 'student_guardians', label: 'Data Orang Tua / Wali', description: 'Kontak dan biodata wali siswa' },
      { key: 'student_health', label: 'Rekam Kesehatan Siswa', description: 'Data fisik dan riwayat medis' },
      { key: 'student_enrollments', label: 'Riwayat Penempatan Kelas', description: 'Histori rombel dan semester siswa' },
      { key: 'student_achievements', label: 'Prestasi Siswa', description: 'Catatan kejuaraan dan capaian' },
      { key: 'student_violations', label: 'Catatan Pelanggaran & Poin', description: 'Riwayat kedisiplinan dan konseling' },
      { key: 'student_documents', label: 'Dokumen Kesiswaan', description: 'Ijazah, KK, Akta, dan berkas siswa' },
      { key: 'student_extracurriculars', label: 'Ekstrakurikuler', description: 'Keikutsertaan kegiatan non-akademik' },
      { key: 'student_portfolios', label: 'Portofolio Siswa', description: 'Karya dan capaian proyek P5/pembelajaran' },
      { key: 'promotion_audits', label: 'Audit Kenaikan Kelas', description: 'Log eksekusi kenaikan/kelulusan rombel' },
      { key: 'attendance_logs', label: 'Presensi / Absensi Siswa & Guru', description: 'Log kehadiran harian dan per jam' }
    ]
  },
  {
    id: 'teachers',
    name: 'Kepegawaian & Guru',
    description: 'Profil guru, sertifikasi, beban jam mengajar, dan perangkat ajar.',
    collections: [
      { key: 'teacher_profiles', label: 'Profil Guru & Staf', description: 'NUPTK, NIP, biodata lengkap guru' },
      { key: 'teacher_employments', label: 'Data Kepegawaian', description: 'Status SK, golongan, TMT, dan kontrak' },
      { key: 'teacher_certifications', label: 'Sertifikasi Pendidik', description: 'Sertifikat profesi guru & PPG' },
      { key: 'teacher_teaching_loads', label: 'Beban Jam Mengajar', description: 'Total jam wajib dan tambahan' },
      { key: 'teacher_tools', label: 'Perangkat Pembelajaran', description: 'Modul ajar, RPP, CP, TP, dan ATP' },
      { key: 'teacher_documents', label: 'Dokumen Administrasi Guru', description: 'SK pembagian tugas dan portofolio guru' },
      { key: 'piket_logs', label: 'Jurnal Guru Piket', description: 'Laporan harian piket dan ketertiban sekolah' }
    ]
  },
  {
    id: 'admission_ppdb',
    name: 'PPDB / Penerimaan Siswa Baru',
    description: 'Pendaftaran gelombang, berkas verifikasi, dan status seleksi santri/siswa baru.',
    collections: [
      { key: 'admission_waves', label: 'Gelombang PPDB', description: 'Master gelombang, jadwal, dan kuota' },
      { key: 'admission_applicants', label: 'Data Calon Pendaftar', description: 'Akun dan formulir awal pendaftar' },
      { key: 'admission_registrations', label: 'Registrasi Formulir PPDB', description: 'Biodata lengkap & pilihan jurusan/program' },
      { key: 'admission_document_requirements', label: 'Syarat Berkas PPDB', description: 'Daftar kelengkapan dokumen pendaftaran' },
      { key: 'admission_payments', label: 'Pembayaran Formulir PPDB', description: 'Bukti bayar pendaftaran dan registrasi ulang' },
      { key: 'admission_selection_configs', label: 'Konfigurasi Seleksi', description: 'Bobot nilai tes, wawancara, dan passing grade' },
      { key: 'admission_audits', label: 'Log Audit PPDB', description: 'Riwayat verifikasi berkas dan approval admin' }
    ]
  },
  {
    id: 'supervision',
    name: 'Supervisi Administrasi & Pembelajaran',
    description: 'Instrumen supervisi kepala sekolah, observasi kelas, dan tindak lanjut.',
    collections: [
      { key: 'supervisions', label: 'Sesi Supervisi', description: 'Jadwal dan status supervisi guru oleh kepala sekolah' },
      { key: 'supervision_evidences', label: 'Bukti Fisik & Eviden', description: 'Dokumen dan catatan observasi supervisi' },
      { key: 'supervision_follow_ups', label: 'Tindak Lanjut & Rekomendasi', description: 'Rencana perbaikan dan pembinaan guru' },
      { key: 'supervision_sessions', label: 'Sesi Supervisi Virtual', description: 'Data sesi supervisi terintegrasi' }
    ]
  },
  {
    id: 'parents',
    name: 'Portal Wali Murid & Komunikasi',
    description: 'Hubungan akun orang tua, persetujuan kegiatan, dan jalur komunikasi.',
    collections: [
      { key: 'parents', label: 'Master Akun Wali Murid', description: 'Profil dan kontak WhatsApp orang tua' },
      { key: 'parent_student_relations', label: 'Relasi Orang Tua - Siswa', description: 'Tautan anak kandung/wali ke siswa' },
      { key: 'parent_invitations', label: 'Undangan Tautan Wali', description: 'Kode aktivasi & OTP sambung akun' },
      { key: 'parent_approvals', label: 'Persetujuan Kegiatan Wali', description: 'Konfirmasi izin outing class, studi banding, dsb' },
      { key: 'parent_communications', label: 'Pesan & Pengumuman Orang Tua', description: 'Riwayat komunikasi langsung sekolah-wali' },
      { key: 'parent_timelines', label: 'Linimasa Perkembangan Anak', description: 'Feed aktivitas dan kabar belajar siswa' }
    ]
  },
  {
    id: 'finance',
    name: 'Keuangan & Pembayaran SPP',
    description: 'Master tarif SPP, tagihan, transaksi pembayaran, kas, dan jurnal akuntansi.',
    collections: [
      { key: 'billing_events', label: 'Event Tagihan Rutin', description: 'Jadwal penagihan SPP bulanan & DSP' },
      { key: 'payments', label: 'Log Transaksi Kasir', description: 'Riwayat pembayaran fisik & online siswa' },
      { key: 'finance_billings', label: 'Master Tagihan Siswa', description: 'Daftar invoice dan rincian pos tagihan' },
      { key: 'finance_payments', label: 'Pencatatan Pembayaran Lengkap', description: 'Audit trail kas masuk bendahara' },
      { key: 'finance_invoices', label: 'Faktur & Kuitansi', description: 'Nomor invoice resmi dan status pelunasan' },
      { key: 'finance_ledgers', label: 'Buku Besar Keuangan', description: 'Pos akun debet/kredit sekolah' },
      { key: 'finance_journals', label: 'Jurnal Transaksi Umum', description: 'Jurnal kas harian dan pengeluaran' },
      { key: 'finance_cash_flows', label: 'Arus Kas Sekolah', description: 'Laporan cash flow masuk dan keluar' },
      { key: 'finance_scholarships', label: 'Beasiswa & Keringanan', description: 'Data siswa penerima subsidi SPP' },
      { key: 'finance_payrolls', label: 'Penggajian Guru & Staf', description: 'Slip gaji dan honor mengajar' }
    ]
  },
  {
    id: 'administration_tu',
    name: 'Tata Usaha & Persuratan Digital',
    description: 'Template surat otomatis, nomor surat keluar/masuk, dan arsip dokumen resmi.',
    collections: [
      { key: 'letter_templates', label: 'Template Surat Resmi', description: 'Format surat aktif, dispensasi, mutasi, dll' },
      { key: 'letters', label: 'Arsip Surat Keluar / Masuk', description: 'Daftar surat terbit dan nomor agenda' },
      { key: 'doc_templates', label: 'Template Dokumen V2', description: 'Format form dan cetak dinamis' },
      { key: 'doc_items', label: 'Item Dokumen Digital', description: 'Berkas arsip digital sekolah' },
      { key: 'doc_signatures', label: 'Tanda Tangan Digital', description: 'Log otorisasi dokumen elektronik' }
    ]
  },
  {
    id: 'website_cms',
    name: 'Website Sekolah & CMS Publik',
    description: 'Halaman profil sekolah, berita, artikel, dan pengaturan subdomain.',
    collections: [
      { key: 'tenant_public_profiles', label: 'Profil Publik Website', description: 'Nama sekolah, sambutan, logo, domain' },
      { key: 'tenant_cms_contents', label: 'Artikel & Konten Berita', description: 'Berita kegiatan, artikel, pengumuman publik' },
      { key: 'website_pages', label: 'Halaman Statis Website', description: 'Halaman Visi Misi, Fasilitas, Kontak' },
      { key: 'website_articles', label: 'Arsip Artikel Sekolah', description: 'Koleksi postingan artikel' },
      { key: 'website_settings', label: 'Pengaturan Tampilan CMS', description: 'Tema warna, navigasi menu, dan footer' }
    ]
  },
  {
    id: 'platform_system',
    name: 'Platform, Konfigurasi & Audit Log',
    description: 'Pengaturan global, PIN akses, feature flags, audit sistem, dan notifikasi.',
    collections: [
      { key: 'settings', label: 'Konfigurasi Global & PIN', description: 'PIN kurikulum, kepsek, TU, superadmin, status freeze' },
      { key: 'audit_logs', label: 'Log Audit & Keamanan', description: 'Jejak aktivitas admin dan aksi kritis' },
      { key: 'notifications', label: 'Notifikasi Sistem', description: 'Pemberitahuan in-app pengguna' },
      { key: 'notification_jobs', label: 'Antrean Pengiriman Pesan', description: 'Queue WhatsApp & email gateway' },
      { key: 'notification_preferences', label: 'Preferensi Notifikasi', description: 'Pengaturan saluran broadcast' },
      { key: 'feature_flags', label: 'Fitur Sistem (Feature Flags)', description: 'Aktivasi modular fitur sekolah' },
      { key: 'tenant_feature_overrides', label: 'Override Fitur Tenant', description: 'Kustomisasi fitur per sekolah' },
      { key: 'tenant_subscriptions', label: 'Langganan Paket Sekolah', description: 'Status paket SaaS & lisensi aktif' },
      { key: 'tenant_modules', label: 'Modul Aktif Sekolah', description: 'Katalog modul yang di-enable per tenant' },
      { key: 'platform_modules', label: 'Master Katalog Modul SaaS', description: 'Daftar modul platform yang tersedia' },
      { key: 'platform_releases', label: 'Changelog & Rilis Versi', description: 'Histori pembaruan versi aplikasi' }
    ]
  }
];

export const ALL_SYSTEM_COLLECTION_KEYS = Array.from(
  new Set(MODULE_COLLECTION_GROUPS.flatMap(group => group.collections.map(c => c.key)))
);

export interface ExportMeta {
  appName: string;
  exportedAt: string;
  schemaVersion: string;
  exportedBy: string;
  tenantFilter: string;
  isVirtualMode: boolean;
  totalCollections: number;
  totalDocuments: number;
  collectionsSummary: Record<string, number>;
}

export interface ExportDatabasePayload {
  _meta: ExportMeta;
  data: Record<string, any[]>;
}

export interface ExportProgress {
  currentCollection: string;
  collectionIndex: number;
  totalCollections: number;
  documentsCount: number;
  phase: 'idle' | 'fetching' | 'compressing' | 'completed' | 'error';
  errorMessage?: string;
}

export interface ImportValidationResult {
  isValid: boolean;
  isLegacyFormat: boolean;
  meta?: ExportMeta;
  detectedCollections: string[];
  totalDocuments: number;
  collectionDocCounts: Record<string, number>;
  validationErrors: string[];
  validationWarnings: string[];
}

/**
 * Perform database export to a downloadable JSON file.
 */
export async function executeDatabaseExport(options: {
  selectedCollections?: string[];
  tenantId?: string;
  userEmail?: string;
  isVirtualMode?: boolean;
  onProgress?: (progress: ExportProgress) => void;
}): Promise<{ success: boolean; filename: string; totalDocs: number; message?: string }> {
  const {
    selectedCollections = ALL_SYSTEM_COLLECTION_KEYS,
    tenantId = 'ALL',
    userEmail = 'Super Admin',
    isVirtualMode = false,
    onProgress
  } = options;

  const targetCollections = selectedCollections.length > 0 ? selectedCollections : ALL_SYSTEM_COLLECTION_KEYS;
  const exportedData: Record<string, any[]> = {};
  const collectionsSummary: Record<string, number> = {};
  let totalDocsCount = 0;

  try {
    for (let i = 0; i < targetCollections.length; i++) {
      const colKey = targetCollections[i];

      onProgress?.({
        currentCollection: colKey,
        collectionIndex: i + 1,
        totalCollections: targetCollections.length,
        documentsCount: totalDocsCount,
        phase: 'fetching'
      });

      let docsList: any[] = [];

      if (isVirtualMode || virtualDatabase.isActive()) {
        const vItems = await virtualDatabase.getDocs(colKey);
        docsList = vItems.map(item => ({ ...item }));
      } else {
        try {
          const snap = await getDocs(collection(db, colKey));
          snap.forEach(docSnap => {
            docsList.push({ id: docSnap.id, ...docSnap.data() });
          });
        } catch (colErr: any) {
          console.warn(`Could not read collection "${colKey}":`, colErr.message);
          // If empty or no permissions on empty collections, record as empty array
          docsList = [];
        }
      }

      // Optional tenant filtering
      if (tenantId && tenantId !== 'ALL') {
        docsList = docsList.filter(item => {
          // If the document has a tenantId, only include if matches
          if (item.tenantId !== undefined) {
            return item.tenantId === tenantId;
          }
          // Global configs without tenantId are kept
          return true;
        });
      }

      exportedData[colKey] = docsList;
      collectionsSummary[colKey] = docsList.length;
      totalDocsCount += docsList.length;
    }

    onProgress?.({
      currentCollection: 'Finalizing JSON',
      collectionIndex: targetCollections.length,
      totalCollections: targetCollections.length,
      documentsCount: totalDocsCount,
      phase: 'compressing'
    });

    const now = new Date();
    const timestampStr = now.toISOString().replace(/[:.]/g, '-');
    const dateReadable = now.toISOString().split('T')[0];

    const meta: ExportMeta = {
      appName: 'SMAS Islam Diponegoro Management System',
      exportedAt: now.toISOString(),
      schemaVersion: '2.0.0',
      exportedBy: userEmail,
      tenantFilter: tenantId,
      isVirtualMode,
      totalCollections: Object.keys(exportedData).length,
      totalDocuments: totalDocsCount,
      collectionsSummary
    };

    const payload: ExportDatabasePayload = {
      _meta: meta,
      data: exportedData
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const modeTag = isVirtualMode ? '_virtual' : '_live';
    const filename = `backup_db_sekolah_${dateReadable}_${timestampStr.slice(11, 19)}${modeTag}.json`;
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onProgress?.({
      currentCollection: 'Selesai',
      collectionIndex: targetCollections.length,
      totalCollections: targetCollections.length,
      documentsCount: totalDocsCount,
      phase: 'completed'
    });

    return {
      success: true,
      filename,
      totalDocs: totalDocsCount
    };
  } catch (error: any) {
    console.error('executeDatabaseExport error:', error);
    onProgress?.({
      currentCollection: 'Error',
      collectionIndex: 0,
      totalCollections: targetCollections.length,
      documentsCount: totalDocsCount,
      phase: 'error',
      errorMessage: error.message || 'Terjadi kesalahan saat mengekspor database'
    });
    return {
      success: false,
      filename: '',
      totalDocs: totalDocsCount,
      message: error.message || 'Gagal mengekspor data'
    };
  }
}

/**
 * Validate imported JSON file and generate a breakdown summary.
 */
export function validateImportPayload(parsedJson: any): ImportValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!parsedJson || typeof parsedJson !== 'object') {
    return {
      isValid: false,
      isLegacyFormat: false,
      detectedCollections: [],
      totalDocuments: 0,
      collectionDocCounts: {},
      validationErrors: ['Format file bukan merupakan objek JSON yang valid.'],
      validationWarnings: []
    };
  }

  // Check if it's the new format with _meta and data
  const isNewFormat = Boolean(parsedJson._meta && parsedJson.data && typeof parsedJson.data === 'object');
  const isLegacyFormat = !isNewFormat && Object.values(parsedJson).every(v => Array.isArray(v));

  let dataObj: Record<string, any[]> = {};
  let meta: ExportMeta | undefined = undefined;

  if (isNewFormat) {
    dataObj = parsedJson.data;
    meta = parsedJson._meta;
  } else if (isLegacyFormat) {
    dataObj = parsedJson;
    warnings.push('File menggunakan format backup legacy (tanpa metadata header).');
  } else {
    // Try to recover if there is a flat collection map
    const potentialCollections = Object.keys(parsedJson).filter(k => Array.isArray(parsedJson[k]));
    if (potentialCollections.length > 0) {
      for (const k of potentialCollections) {
        dataObj[k] = parsedJson[k];
      }
      warnings.push(`Ditemukan ${potentialCollections.length} koleksi yang dapat dipulihkan.`);
    } else {
      errors.push('Struktur file JSON tidak mengandung array koleksi data yang dikenali.');
    }
  }

  const detectedCollections = Object.keys(dataObj);
  const collectionDocCounts: Record<string, number> = {};
  let totalDocuments = 0;

  for (const col of detectedCollections) {
    const list = dataObj[col];
    if (Array.isArray(list)) {
      collectionDocCounts[col] = list.length;
      totalDocuments += list.length;
    } else {
      warnings.push(`Koleksi "${col}" bukan merupakan array dan akan dilewati.`);
    }
  }

  if (detectedCollections.length === 0) {
    errors.push('Tidak ada koleksi data yang ditemukan dalam file ini.');
  }

  return {
    isValid: errors.length === 0,
    isLegacyFormat,
    meta,
    detectedCollections,
    totalDocuments,
    collectionDocCounts,
    validationErrors: errors,
    validationWarnings: warnings
  };
}

/**
 * Execute import of verified JSON payload into Firestore or Virtual DB.
 */
export async function executeDatabaseImport(options: {
  parsedJson: any;
  selectedCollections?: string[];
  isVirtualMode?: boolean;
  onProgress?: (progress: {
    currentCollection: string;
    completedDocs: number;
    totalDocs: number;
    percent: number;
  }) => void;
}): Promise<{ success: boolean; totalRestored: number; restoredCollections: string[]; message?: string }> {
  const { parsedJson, selectedCollections, isVirtualMode = false, onProgress } = options;

  const validation = validateImportPayload(parsedJson);
  if (!validation.isValid) {
    return {
      success: false,
      totalRestored: 0,
      restoredCollections: [],
      message: validation.validationErrors.join(', ')
    };
  }

  const dataObj: Record<string, any[]> = parsedJson._meta && parsedJson.data ? parsedJson.data : parsedJson;
  const collectionsToImport = selectedCollections && selectedCollections.length > 0
    ? selectedCollections.filter(c => dataObj[c])
    : Object.keys(dataObj).filter(c => Array.isArray(dataObj[c]));

  const totalTargetDocs = collectionsToImport.reduce((sum, c) => sum + (dataObj[c]?.length || 0), 0);
  let totalRestored = 0;
  const restoredCollections: string[] = [];

  try {
    for (const colName of collectionsToImport) {
      const docsList = dataObj[colName];
      if (!Array.isArray(docsList) || docsList.length === 0) continue;

      if (isVirtualMode || virtualDatabase.isActive()) {
        for (const docItem of docsList) {
          const { id, ...data } = docItem;
          const targetId = id || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          await virtualDatabase.updateDoc(colName, targetId, { id: targetId, ...data });
          totalRestored++;
          onProgress?.({
            currentCollection: colName,
            completedDocs: totalRestored,
            totalDocs: totalTargetDocs,
            percent: Math.round((totalRestored / totalTargetDocs) * 100)
          });
        }
      } else {
        // Live Firestore import with batching (max 400 per batch)
        const batchSize = 400;
        for (let i = 0; i < docsList.length; i += batchSize) {
          const chunk = docsList.slice(i, i + batchSize);
          const batch = writeBatch(db);

          for (const docItem of chunk) {
            const { id, ...data } = docItem;
            if (id) {
              const docRef = doc(db, colName, id);
              batch.set(docRef, data, { merge: true });
            } else {
              const newRef = doc(collection(db, colName));
              batch.set(newRef, data, { merge: true });
            }
            totalRestored++;
          }

          await batch.commit();

          onProgress?.({
            currentCollection: colName,
            completedDocs: totalRestored,
            totalDocs: totalTargetDocs,
            percent: Math.round((totalRestored / totalTargetDocs) * 100)
          });
        }
      }

      restoredCollections.push(colName);
    }

    return {
      success: true,
      totalRestored,
      restoredCollections
    };
  } catch (err: any) {
    console.error('executeDatabaseImport error:', err);
    return {
      success: false,
      totalRestored,
      restoredCollections,
      message: err.message || 'Gagal memulihkan sebagian data.'
    };
  }
}

/**
 * Generic helper to export tabular data to CSV.
 */
export function exportToCSV(
  data: Record<string, any>[],
  filename = 'export_data.csv',
  headers?: { key: string; label: string }[]
): void {
  if (!data || data.length === 0) {
    console.warn('exportToCSV: Data kosong.');
    return;
  }

  const columns = headers || Object.keys(data[0]).map(key => ({ key, label: key }));
  const headerRow = columns.map(c => `"${c.label.replace(/"/g, '""')}"`).join(',');

  const rows = data.map(item => {
    return columns.map(c => {
      const val = item[c.key];
      if (val === undefined || val === null) return '""';
      if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',');
  });

  const csvContent = '\uFEFF' + [headerRow, ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generic helper to export JSON object to downloadable file.
 */
export function exportToJSON(data: any, filename = 'export_data.json'): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.json') ? filename : `${filename}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

