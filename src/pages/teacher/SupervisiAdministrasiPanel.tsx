import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../foundation/tenant/TenantContext';
import { usePeriod } from '../../contexts/PeriodContext';
import { SupervisionSession } from '../../domains/supervision/models/SupervisionSession';
import { SupervisionFollowUp } from '../../domains/supervision/models/SupervisionFollowUp';
import { SupervisionEvidence } from '../../domains/supervision/models/SupervisionEvidence';
import { SupervisionStatus } from '../../domains/supervision/models/SupervisionStatus';
import { SUPERVISION_ADMINISTRATION_CHECKLIST } from '../../domains/supervision/models/SupervisionChecklist';
import { 
  CheckCircle, Clock, AlertCircle, FileText, Upload, RefreshCw, X, ShieldAlert 
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { SupervisionEvidenceService } from '../../domains/supervision/services/SupervisionEvidenceService';
import { SupervisionEvidenceRepositoryImpl } from '../../domains/supervision/repositories/SupervisionEvidenceRepositoryImpl';
import { SupervisionRepositoryImpl } from '../../domains/supervision/repositories/SupervisionRepositoryImpl';
import { getTeacherDocumentsResult } from '../../domains/teacher/services';

export default function SupervisiAdministrasiPanel() {
  const { profile } = useAuth();
  const { tenant } = useTenant();
  const { activeYear, activeSemester } = usePeriod();

  const [activeSupervision, setActiveSupervision] = useState<SupervisionSession | null>(null);
  const [evidences, setEvidences] = useState<SupervisionEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [followUps, setFollowUps] = useState<SupervisionFollowUp[]>([]);
  const [teacherDocs, setTeacherDocs] = useState<any[]>([]);

  // Repos & Services
  const supervisionRepo = new SupervisionRepositoryImpl();
  const evidenceRepo = new SupervisionEvidenceRepositoryImpl();
  const evidenceService = new SupervisionEvidenceService(evidenceRepo, supervisionRepo);

  useEffect(() => {
    if (!profile?.uid || !tenant?.id) return;
    if (!activeYear || !activeSemester) {
      setLoading(false);
      return;
    }
    loadData();
  }, [profile?.uid, tenant?.id, activeYear, activeSemester]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Find active supervision for this teacher in current period
      const sessions = await supervisionRepo.findByPeriod(tenant!.id, activeYear!.id, activeSemester!.id);
      const mySession = sessions.find(s => s.props.teacherId === profile!.uid && s.props.status.value !== 'CANCELLED');
      
      if (mySession) {
        setActiveSupervision(mySession);
        
        // Load Evidences
        const evsResult = await evidenceService.getEvidencesBySupervision(tenant!.id, mySession.props.id!);
        if (evsResult.isSuccess) {
          setEvidences(evsResult.getValue()!);
        }

        // Load Teacher Documents for selection
        const docsRes = await getTeacherDocumentsResult(profile!.uid);
        if (docsRes.isSuccess) {
          setTeacherDocs(docsRes.getValue());
        }
      } else {
        setActiveSupervision(null);
      }
    } catch (error) {
      console.error('Error loading supervision data', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (!activeYear || !activeSemester) {
     return (
       <div className="bg-gray-50 p-10 rounded-2xl border border-gray-200 text-center">
         <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
         <h3 className="text-xl font-bold text-gray-800 mb-2">Periode Aktif Belum Diatur</h3>
         <p className="text-gray-500">Silakan hubungi administrator untuk mengatur tahun ajaran dan semester aktif.</p>
       </div>
     );
  }

  if (!activeSupervision) {
    return (
      <div className="bg-gray-50 p-10 rounded-2xl border border-gray-200 text-center">
        <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-800 mb-2">Tidak Ada Supervisi Aktif</h3>
        <p className="text-gray-500">Anda tidak memiliki jadwal supervisi administrasi pada periode akademik ini.</p>
      </div>
    );
  }

  const isSubmitted = activeSupervision.props.status.value === 'SUBMITTED' 
                   || activeSupervision.props.status.value === 'UNDER_REVIEW' 
                   || activeSupervision.props.status.value === 'COMPLETED';

  return (
    <div className="space-y-6">
      {/* Session Info */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Supervisi Administrasi Pembelajaran</h3>
          <p className="text-gray-500 text-sm">
            Tanggal Jadwal: {new Date(activeSupervision.props.scheduledDate).toLocaleDateString('id-ID', { dateStyle: 'full' })}
          </p>
        </div>
        <div>
          <StatusBadge status={activeSupervision.props.status.value} />
        </div>
      </div>

      {activeSupervision.props.status.value === 'REVISION_REQUIRED' && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl flex items-start shadow-sm">
          <AlertCircle className="w-6 h-6 mr-3 flex-shrink-0" />
          <div>
            <h4 className="font-bold mb-1">Perbaikan Diperlukan</h4>
            <p className="text-sm">Supervisor meminta perbaikan pada beberapa bukti administrasi Anda. Silakan periksa catatan dan upload ulang bukti yang sesuai, lalu Submit kembali.</p>
          </div>
        </div>
      )}

      {/* Checklist */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h4 className="font-semibold text-gray-800">Checklist Kelengkapan Administrasi</h4>
        </div>
        <div className="divide-y divide-gray-100">
          {SUPERVISION_ADMINISTRATION_CHECKLIST.map(item => (
            <ChecklistItemRow 
              key={item.code} 
              item={item} 
              evidence={evidences.find(e => e.props.itemCode === item.code)} 
              teacherDocs={teacherDocs}
              supervision={activeSupervision}
              onUpdate={loadData}
              isSubmitted={isSubmitted}
              evidenceService={evidenceService}
              tenantId={tenant!.id}
            />
          ))}
        </div>
      </div>

      {/* Submission Action */}
      {!isSubmitted && (
        <SubmissionSummary 
          evidences={evidences} 
          supervision={activeSupervision} 
          onSubmitted={loadData} 
          evidenceService={evidenceService}
          tenantId={tenant!.id}
        />
      )}
    </div>
  );
}

function ChecklistItemRow({ item, evidence, teacherDocs, supervision, onUpdate, isSubmitted, evidenceService, tenantId }: any) {
  const [showAttach, setShowAttach] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const status = evidence?.props.status || 'MISSING';
  const isRevisionRequired = status === 'REVISION_REQUIRED';
  
  // Can edit if not submitted, OR if it's explicitly revision required
  const canEdit = (!isSubmitted && supervision.props.status.value !== 'REVISION_REQUIRED') || isRevisionRequired;

  const handleAttach = async (sourceType: 'DOCUMENT' | 'SYSTEM_RECORD' | 'MANUAL_ENTRY', systemSourceId?: string) => {
    if ((sourceType === 'DOCUMENT' || sourceType === 'MANUAL_ENTRY') && !selectedDocId) return;
    setIsSaving(true);
    try {
      const finalSourceId = sourceType === 'SYSTEM_RECORD' ? (systemSourceId || 'EDUOS_SYSTEM_RECORD') : selectedDocId;
      
      const command = {
        tenantId,
        supervisionId: supervision.props.id,
        teacherId: supervision.props.teacherId,
        academicYearId: supervision.props.academicYearId,
        semesterId: supervision.props.semesterId,
        category: item.category,
        itemCode: item.code,
        sourceType,
        sourceId: finalSourceId
      };
      
      const res = await evidenceService.attachEvidence(command);
      if (res.isSuccess) {
        setShowAttach(false);
        onUpdate();
      } else {
        alert(res.getError() as string);
      }
    } catch (e) {
      console.error(e);
      alert('Terjadi kesalahan saat menyimpan.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h5 className="font-medium text-gray-900">{item.label}</h5>
            {item.required && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Wajib</span>}
          </div>
          <p className="text-sm text-gray-500 mt-1">{item.description}</p>
          
          {evidence && evidence.props.sourceId && evidence.props.sourceType === 'DOCUMENT' && (
            <div className="mt-3 flex items-center p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-500 mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 line-clamp-1">
                  {teacherDocs.find((d: any) => d.id === evidence.props.sourceId)?.judul || `Document ID: ${evidence.props.sourceId}`}
                </p>
                <p className="text-xs text-blue-600 mt-0.5">Sumber: Dokumen Guru</p>
              </div>
            </div>
          )}

          {evidence && evidence.props.sourceId && evidence.props.sourceType === 'SYSTEM_RECORD' && (
             <div className="mt-3 flex items-center p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
               <CheckCircle className="w-5 h-5 text-indigo-500 mr-3" />
               <div className="flex-1">
                 <p className="text-sm font-medium text-indigo-900 line-clamp-1">
                   Otomatis dari Sistem EduOS
                 </p>
                 <p className="text-xs text-indigo-600 mt-0.5">Sumber: Log & Rekaman Akademik</p>
               </div>
             </div>
          )}

          {evidence && evidence.props.sourceId && evidence.props.sourceType === 'MANUAL_ENTRY' && (
             <div className="mt-3 flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
               <FileText className="w-5 h-5 text-gray-500 mr-3 flex-shrink-0" />
               <div className="flex-1">
                 <p className="text-sm text-gray-900 line-clamp-3 italic">
                   "{evidence.props.sourceId}"
                 </p>
                 <p className="text-xs text-gray-500 mt-0.5">Sumber: Catatan Langsung</p>
               </div>
             </div>
          )}

          {isRevisionRequired && evidence?.props.reviewerNotes && (
             <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
               <strong>Catatan Perbaikan:</strong> {evidence.props.reviewerNotes}
             </div>
          )}

          {evidence?.props?.reviewHistory && evidence.props.reviewHistory.length > 0 && (
            <div className="mt-3">
              <button 
                onClick={() => {
                  const el = document.getElementById(`history-teacher-${evidence.props.id}`);
                  if (el) el.classList.toggle('hidden');
                }}
                className="text-xs font-semibold text-gray-500 hover:text-gray-700 underline"
              >
                Lihat Riwayat Review ({evidence.props.reviewHistory.length})
              </button>
              <div id={`history-teacher-${evidence.props.id}`} className="hidden mt-2 space-y-2 border-l-2 border-gray-200 pl-3">
                {evidence.props.reviewHistory.map((hist: any, idx: number) => (
                  <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                    <div className="flex justify-between text-gray-500 mb-1">
                      <span className="font-semibold">Iterasi #{hist.iteration || idx + 1}</span>
                      <span>{new Date(hist.timestamp).toLocaleDateString('id-ID')}</span>
                    </div>
                    <div className="font-medium mb-1"><EvidenceBadge status={hist.status} /></div>
                    <p className="text-gray-700">{hist.notes || '-'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showAttach && canEdit && (
            <div className="mt-4 p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Sumber Bukti Administrasi</label>
              
              {item.expectedSourceTypes.includes('DOCUMENT') && (
                <div className="mb-4">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Dokumen Repositori</span>
                  <div className="flex space-x-2">
                    <select 
                      value={selectedDocId} 
                      onChange={e => setSelectedDocId(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-sm"
                    >
                      <option value="">-- Pilih Dokumen --</option>
                      {teacherDocs.map((doc: any) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.judul} ({doc.jenis}) - {doc.className || 'Umum'}
                        </option>
                      ))}
                    </select>
                    <button 
                      onClick={() => handleAttach('DOCUMENT')} 
                      disabled={!selectedDocId || isSaving}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSaving ? 'Tunggu...' : 'Tautkan Dokumen'}
                    </button>
                  </div>
                </div>
              )}

              {item.expectedSourceTypes.includes('SYSTEM_RECORD') && (
                <div className="mb-4 pt-4 border-t border-gray-100">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Data Sistem Otomatis</span>
                  <div className="flex items-center justify-between bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                    <div className="flex items-center">
                      <RefreshCw className="w-5 h-5 text-indigo-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-indigo-900">Gunakan Data Sistem EduOS</p>
                        <p className="text-xs text-indigo-700">Bukti akan diambil dari log aktivitas dan data akademik Anda.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleAttach('SYSTEM_RECORD', 'EDUOS_SYSTEM_RECORD')}
                      disabled={isSaving}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Tautkan Data
                    </button>
                  </div>
                </div>
              )}

              {item.expectedSourceTypes.includes('MANUAL_ENTRY') && (
                <div className="mb-4 pt-4 border-t border-gray-100">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Teks / Catatan Langsung</span>
                  <div className="flex flex-col space-y-2">
                    <textarea 
                      value={selectedDocId} 
                      onChange={e => setSelectedDocId(e.target.value)}
                      placeholder="Ketik catatan / deskripsi di sini..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-sm h-24 resize-none"
                    />
                    <div className="flex justify-end">
                      <button 
                        onClick={() => handleAttach('MANUAL_ENTRY')} 
                        disabled={!selectedDocId || isSaving}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isSaving ? 'Tunggu...' : 'Simpan Catatan'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-gray-100">
                <button 
                  onClick={() => setShowAttach(false)} 
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="ml-6 flex flex-col items-end space-y-2">
          <EvidenceBadge status={status} />
          {canEdit && !showAttach && (
            <button 
              onClick={() => setShowAttach(true)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
            >
              <Upload className="w-4 h-4 mr-1" />
              {evidence ? 'Ganti' : 'Lampirkan'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SubmissionSummary({ evidences, supervision, onSubmitted, evidenceService, tenantId }: any) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const requiredItems = SUPERVISION_ADMINISTRATION_CHECKLIST.filter(i => i.required);
  const completedRequired = requiredItems.filter(i => 
    evidences.some((e: any) => e.props.itemCode === i.code && e.props.sourceId)
  );
  
  const isComplete = completedRequired.length === requiredItems.length;

  const handleSubmit = async () => {
    if (!isComplete && supervision.props.status.value !== 'REVISION_REQUIRED') {
      alert("Harap lengkapi semua dokumen wajib sebelum submit.");
      return;
    }
    
    if (confirm("Apakah Anda yakin ingin submit? Data tidak dapat diubah setelah disubmit kecuali ada permintaan perbaikan.")) {
      setIsSubmitting(true);
      try {
        const command = {
          tenantId,
          supervisionId: supervision.props.id,
          teacherId: supervision.props.teacherId
        };
        const res = await evidenceService.submitSupervisionEvidence(command);
        if (res.isFailure) throw new Error(res.getError() as string);
        
        // Update Supervision Session Status
        const { SupervisionService } = await import('../../domains/supervision/services/SupervisionService');
        const supService = new SupervisionService(new SupervisionRepositoryImpl());
        const newStatus = supervision.props.status.value === 'REVISION_REQUIRED' ? 'RESUBMITTED' : 'SUBMITTED';
        const transitionRes = await supService.updateSessionStatus(supervision.props.id, newStatus, supervision.props.teacherId);
        if (transitionRes.isFailure) throw new Error(transitionRes.getError() as string);

        onSubmitted();
      } catch (error) {
        console.error(error);
        alert("Gagal melakukan submit. Silakan coba lagi.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between">
      <div>
        <h4 className="font-bold text-gray-900 mb-1">Status Kelengkapan</h4>
        <p className="text-sm text-gray-600">
          Wajib Terpenuhi: <span className="font-bold">{completedRequired.length} / {requiredItems.length}</span>
        </p>
      </div>
      <div className="mt-4 sm:mt-0">
        <button
          onClick={handleSubmit}
          disabled={!isComplete || isSubmitting}
          className={`px-6 py-2.5 rounded-xl font-medium text-white transition-colors ${
            !isComplete ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-sm'
          }`}
        >
          {isSubmitting ? 'Memproses...' : (supervision.props.status.value === 'REVISION_REQUIRED' ? 'Resubmit Perbaikan' : 'Submit Eviden')}
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string, label: string }> = {
    'DRAFT': { color: 'bg-gray-100 text-gray-700', label: 'Belum Dimulai' },
    'SCHEDULED': { color: 'bg-blue-100 text-blue-700', label: 'Terjadwal' },
    'SUBMITTED': { color: 'bg-indigo-100 text-indigo-700', label: 'Terkirim' },
    'UNDER_REVIEW': { color: 'bg-yellow-100 text-yellow-700', label: 'Sedang Diperiksa' },
    'REVISION_REQUIRED': { color: 'bg-red-100 text-red-700', label: 'Perlu Perbaikan' },
    'RESUBMITTED': { color: 'bg-indigo-100 text-indigo-700', label: 'Dikirim Ulang' },
    'COMPLETED': { color: 'bg-green-100 text-green-700', label: 'Selesai' },
    'CANCELLED': { color: 'bg-gray-100 text-gray-500', label: 'Dibatalkan' },
  };
  const config = map[status] || { color: 'bg-gray-100 text-gray-700', label: status };
  return <span className={`px-3 py-1 rounded-full text-xs font-bold ${config.color}`}>{config.label}</span>;
}

function EvidenceBadge({ status }: { status: string }) {
  const map: Record<string, { color: string, label: string }> = {
    'MISSING': { color: 'bg-gray-100 text-gray-500', label: 'Kosong' },
    'DRAFT': { color: 'bg-blue-100 text-blue-700', label: 'Terlampir' },
    'SUBMITTED': { color: 'bg-indigo-100 text-indigo-700', label: 'Terkirim' },
    'UNDER_REVIEW': { color: 'bg-yellow-100 text-yellow-700', label: 'Diperiksa' },
    'REVISION_REQUIRED': { color: 'bg-red-100 text-red-700', label: 'Perlu Revisi' },
    'RESUBMITTED': { color: 'bg-indigo-100 text-indigo-700', label: 'Dikirim Ulang' },
    'APPROVED': { color: 'bg-green-100 text-green-700', label: 'Disetujui' },
    'REJECTED': { color: 'bg-red-100 text-red-700', label: 'Ditolak' },
  };
  const config = map[status] || { color: 'bg-gray-100 text-gray-500', label: status };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.color}`}>{config.label}</span>;
}
