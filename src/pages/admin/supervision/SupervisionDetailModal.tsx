import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, FileText, Download, ShieldCheck, XCircle } from 'lucide-react';
import { SupervisionSession } from '../../../domains/supervision/models/SupervisionSession';
import { SupervisionService } from '../../../domains/supervision/services/SupervisionService';
import { SupervisionEvidence } from '../../../domains/supervision/models/SupervisionEvidence';
import { SUPERVISION_ADMINISTRATION_CHECKLIST, calculateSupervisionScore } from '../../../domains/supervision/models/SupervisionChecklist';
import { RecommendationStatus } from '../../../domains/supervision/models/SupervisionSession';
import { SupervisionEvidenceService } from '../../../domains/supervision/services/SupervisionEvidenceService';
import { SupervisionRepositoryImpl } from '../../../domains/supervision/repositories/SupervisionRepositoryImpl';
import { SupervisionEvidenceRepositoryImpl } from '../../../domains/supervision/repositories/SupervisionEvidenceRepositoryImpl';
import { useAuth } from '../../../contexts/AuthContext';
import { useTenant } from '../../../foundation/tenant/TenantContext';

import { SupervisionStatus } from '../../../domains/supervision/models/SupervisionStatus';

export default function SupervisionDetailModal({ supervision, teacherName, onClose, onUpdate }: any) {
  const { profile } = useAuth();
  const { tenant } = useTenant();
  const [evidences, setEvidences] = useState<SupervisionEvidence[]>([]);

  const [activeTab, setActiveTab] = useState<'EVIDENCE' | 'SCORING'>('EVIDENCE');
  const [scores, setScores] = useState<Record<string, number>>(supervision?.props?.observation?.scores || {});
  const [finalFeedback, setFinalFeedback] = useState({
    summary: supervision?.props?.finalFeedback?.summary || '',
    strengths: supervision?.props?.finalFeedback?.strengths?.join('\n') || '',
    weaknesses: supervision?.props?.finalFeedback?.weaknesses?.join('\n') || '',
    recommendations: supervision?.props?.finalFeedback?.recommendations?.join('\n') || '',
    recommendationStatus: supervision?.props?.finalFeedback?.recommendationStatus || 'CONTINUE' as RecommendationStatus,
  });

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const supervisionRepo = new SupervisionRepositoryImpl();
  const evidenceRepo = new SupervisionEvidenceRepositoryImpl();
  const evidenceService = new SupervisionEvidenceService(evidenceRepo, supervisionRepo);

  const loadEvidences = async () => {
    setLoading(true);
    try {
      const res = await evidenceService.getEvidencesBySupervision(tenant!.id, supervision.props.id);
      if (res.isSuccess) {
        setEvidences(res.getValue()!);
      }
      
      // If status is SUBMITTED or RESUBMITTED, change it to UNDER_REVIEW automatically
      if (supervision.props.status.value === 'SUBMITTED' || supervision.props.status.value === 'RESUBMITTED') {
        const { SupervisionService } = await import('../../../domains/supervision/services/SupervisionService');
        const svc = new SupervisionService(new SupervisionRepositoryImpl());
        await svc.updateSessionStatus(supervision.props.id, 'UNDER_REVIEW', profile!.uid);
        onUpdate();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvidences();
  }, []);

  const handleReviewEvidence = async (itemCode: string, status: 'APPROVED' | 'REVISION_REQUIRED' | 'REJECTED', notes: string = '') => {
    setProcessing(true);
    try {
      const command = {
        tenantId: tenant!.id,
        supervisionId: supervision.props.id,
        itemCode,
        reviewerId: profile!.uid,
        status,
        notes
      };
      const res = await evidenceService.reviewEvidence(command as any);
      if (res.isFailure) {
         alert('Gagal mereview bukti: ' + (res as any).getError());
      } else {
         await loadEvidences();
      }
    } catch (e) {
      console.error(e);
      alert('Terjadi kesalahan.');
    } finally {
      setProcessing(false);
    }
  };

  
  const handleSaveScoring = async () => {
    try {
      setProcessing(true);
      const svc = new SupervisionService(new SupervisionRepositoryImpl());
      
      await svc.submitObservation(supervision.props.id, {
        rubricId: 'ADMIN-01',
        scores,
        notes: ''
      }, profile!.uid || 'system');
      
      const calculated = calculateSupervisionScore(scores);
      
      const feedbackData = {
        summary: finalFeedback.summary,
        strengths: finalFeedback.strengths.split('\n').filter((s: string) => s.trim()),
        weaknesses: finalFeedback.weaknesses.split('\n').filter((s: string) => s.trim()),
        recommendations: finalFeedback.recommendations.split('\n').filter((s: string) => s.trim()),
        recommendationStatus: finalFeedback.recommendationStatus
      };
      
      await svc.submitFinalFeedback(supervision.props.id, feedbackData, profile!.uid || 'system');
      await svc.submitFinalResult(supervision.props.id, calculated, profile!.uid || 'system');
      
      alert('Penilaian berhasil disimpan.');
      onUpdate();
    } catch (e) {
      console.error(e);
      alert('Gagal menyimpan penilaian');
    } finally {
      setProcessing(false);
    }
  };

  
  const handleFinalize = async () => {
    try {
      setProcessing(true);
      const svc = new SupervisionService(new SupervisionRepositoryImpl());
      
      const calculated = calculateSupervisionScore(scores);
      
      const feedbackData = {
        summary: finalFeedback.summary,
        strengths: finalFeedback.strengths.split('\n').filter((s: string) => s.trim()),
        weaknesses: finalFeedback.weaknesses.split('\n').filter((s: string) => s.trim()),
        recommendations: finalFeedback.recommendations.split('\n').filter((s: string) => s.trim()),
        recommendationStatus: finalFeedback.recommendationStatus
      };
      
      await svc.submitObservation(supervision.props.id, {
        rubricId: 'ADMIN-01',
        scores,
        notes: ''
      }, profile!.uid);

      await svc.submitFinalFeedback(supervision.props.id, feedbackData, profile!.uid);
      await svc.submitFinalResult(supervision.props.id, calculated, profile!.uid);
      
      await svc.finalizeSupervision(supervision.props.id, profile!.uid);
      
      alert('Supervisi berhasil difinalisasi.');
      onUpdate();
      onClose();
    } catch (e) {
      console.error(e);
      alert('Gagal finalisasi');
    } finally {
      setProcessing(false);
    }
  };

  const handleCompleteSupervision = async () => {
    setProcessing(true);
    try {
      const { SupervisionService } = await import('../../../domains/supervision/services/SupervisionService');
      const svc = new SupervisionService(new SupervisionRepositoryImpl());
      const res = await svc.updateSessionStatus(supervision.props.id, 'COMPLETED', profile!.uid);
      if (res.isFailure) {
         alert('Tidak dapat menyelesaikan: ' + (res as any).getError());
         setProcessing(false);
         return;
      }

      alert('Supervisi Administrasi Selesai!');
      onUpdate();
      onClose();
    } catch (e) {
      console.error(e);
      alert('Terjadi kesalahan saat menyelesaikan supervisi.');
    } finally {
      setProcessing(false);
    }
  };

  const requiredItems = SUPERVISION_ADMINISTRATION_CHECKLIST.filter(i => i.required);
  const isAllRequiredApproved = requiredItems.every(i => {
     const ev = evidences.find(e => e.props.itemCode === i.code);
     return ev && ev.props.status === 'APPROVED';
  });

  const hasAnyRevisionRequired = evidences.some(e => e.props.status === 'REVISION_REQUIRED');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Review Kelengkapan Administrasi</h2>
            <p className="text-sm text-gray-500">Guru: {teacherName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>


        {/* TABS */}
        <div className="border-b border-gray-200 px-6 mt-4">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('EVIDENCE')}
              className={`${
                activeTab === 'EVIDENCE'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
            >
              Pemeriksaan Bukti
            </button>
            <button
              onClick={() => setActiveTab('SCORING')}
              className={`${
                activeTab === 'SCORING'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
            >
              Penilaian & Finalisasi
            </button>
          </nav>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {loading && <div className="text-center py-12 text-gray-500">Memuat detail bukti administrasi...</div>}
          
          {!loading && activeTab === 'EVIDENCE' && (
            <div className="space-y-4">
              {SUPERVISION_ADMINISTRATION_CHECKLIST.map(item => {
                const evidence = evidences.find(e => e.props.itemCode === item.code);
                return (
                  <EvidenceReviewCard 
                    key={item.code} 
                    item={item} 
                    evidence={evidence} 
                    onReview={handleReviewEvidence}
                    processing={processing}
                  />
                );
              })}
            </div>
          )}

          {!loading && activeTab === 'SCORING' && (
            <div className="space-y-8">
              {/* SCORING FORM */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-4">Penilaian Rubrik</h4>
                <div className="space-y-4">
                  {SUPERVISION_ADMINISTRATION_CHECKLIST.map((item, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 border-gray-100 last:border-0 last:pb-0">
                      <div className="mb-2 sm:mb-0">
                        <p className="font-semibold text-sm">{item.label}</p>
                        <p className="text-xs text-gray-500">{item.description} (Bobot: {item.weight})</p>
                      </div>
                      <select
                        value={scores[item.code] || ''}
                        onChange={e => setScores({...scores, [item.code]: Number(e.target.value)})}
                        className="border border-gray-300 rounded p-1 text-sm w-24 focus:border-blue-500 outline-none"
                        disabled={supervision?.props?.status?.value === 'COMPLETED'}
                      >
                        <option value="" disabled>Skor</option>
                        {[1,2,3,4].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* FEEDBACK & RECOMMENDATION */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
                <h4 className="font-bold text-gray-900 mb-4">Kesimpulan & Rekomendasi</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catatan Kesimpulan</label>
                  <textarea
                    value={finalFeedback.summary}
                    onChange={e => setFinalFeedback({...finalFeedback, summary: e.target.value})}
                    className="w-full border border-gray-300 rounded p-2 text-sm h-20 outline-none focus:border-blue-500"
                    disabled={supervision?.props?.status?.value === 'COMPLETED'}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kekuatan (Pisahkan dengan baris baru)</label>
                    <textarea
                      value={finalFeedback.strengths}
                      onChange={e => setFinalFeedback({...finalFeedback, strengths: e.target.value})}
                      className="w-full border border-gray-300 rounded p-2 text-sm h-24 outline-none focus:border-blue-500"
                      disabled={supervision?.props?.status?.value === 'COMPLETED'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Area Perbaikan (Pisahkan dengan baris baru)</label>
                    <textarea
                      value={finalFeedback.weaknesses}
                      onChange={e => setFinalFeedback({...finalFeedback, weaknesses: e.target.value})}
                      className="w-full border border-gray-300 rounded p-2 text-sm h-24 outline-none focus:border-blue-500"
                      disabled={supervision?.props?.status?.value === 'COMPLETED'}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rekomendasi / Tindak Lanjut (Pisahkan dengan baris baru)</label>
                  <textarea
                    value={finalFeedback.recommendations}
                    onChange={e => setFinalFeedback({...finalFeedback, recommendations: e.target.value})}
                    className="w-full border border-gray-300 rounded p-2 text-sm h-24 outline-none focus:border-blue-500"
                    disabled={supervision?.props?.status?.value === 'COMPLETED'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status Rekomendasi</label>
                  <select
                    value={finalFeedback.recommendationStatus}
                    onChange={e => setFinalFeedback({...finalFeedback, recommendationStatus: e.target.value as any})}
                    className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-blue-500"
                    disabled={supervision?.props?.status?.value === 'COMPLETED'}
                  >
                    <option value="CONTINUE">Lanjutkan Kinerja (Tidak Butuh Tindak Lanjut Khusus)</option>
                    <option value="IMPROVEMENT_REQUIRED">Perlu Peningkatan Mandiri</option>
                    <option value="FOLLOW_UP_REQUIRED">Wajib Tindak Lanjut (Pembinaan/Follow-up)</option>
                  </select>
                </div>

                {supervision?.props?.status?.value !== 'COMPLETED' && (
                  <div className="pt-4 flex justify-end gap-3">
                    <button
                      onClick={handleSaveScoring}
                      disabled={processing}
                      className="px-4 py-2 bg-blue-50 text-blue-700 font-medium rounded-lg hover:bg-blue-100 disabled:opacity-50"
                    >
                      Simpan Penilaian
                    </button>
                    <button
                      onClick={handleFinalize}
                      disabled={processing || !isAllRequiredApproved}
                      className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      Finalisasi Supervisi
                    </button>
                  </div>
                )}
                {supervision?.props?.status?.value === 'COMPLETED' && (
                  <div className="pt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="font-semibold text-green-800">Supervisi telah difinalisasi</p>
                    <p className="text-sm text-green-700 mt-1">Skor Akhir: {supervision.props.finalResult?.percentage.toFixed(2)}% ({supervision.props.finalResult?.category})</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="p-6 border-t border-gray-100 bg-white flex items-center justify-between">

          <div className="text-sm">
            {hasAnyRevisionRequired ? (
               <span className="text-red-600 font-medium flex items-center"><AlertCircle className="w-4 h-4 mr-1"/> Beberapa item perlu revisi. Guru harus resubmit.</span>
            ) : isAllRequiredApproved ? (
               <span className="text-emerald-600 font-medium flex items-center"><CheckCircle className="w-4 h-4 mr-1"/> Semua syarat wajib terpenuhi.</span>
            ) : (
               <span className="text-gray-500 font-medium">Belum semua syarat wajib disetujui.</span>
            )}
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
            >
              Tutup
            </button>
            
            {hasAnyRevisionRequired && !isAllRequiredApproved && (
              <button 
                onClick={async () => {
                  setProcessing(true);
                  try {
                    const { SupervisionService } = await import('../../../domains/supervision/services/SupervisionService');
                    const svc = new SupervisionService(new SupervisionRepositoryImpl());
                    const res = await svc.updateSessionStatus(supervision.props.id, 'REVISION_REQUIRED', profile!.uid);
                    if (res.isSuccess) {
                      alert('Permintaan revisi telah dikirim ke guru.');
                      onUpdate();
                      onClose();
                    } else {
                      alert((res as any).getError() as string);
                    }
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setProcessing(false);
                  }
                }}
                disabled={processing}
                className="px-6 py-2 rounded-lg font-medium text-white bg-yellow-600 hover:bg-yellow-700 flex items-center disabled:opacity-50"
              >
                <AlertCircle className="w-5 h-5 mr-2" />
                Kirim Permintaan Revisi
              </button>
            )}

            {activeTab === 'EVIDENCE' && <button 
              onClick={handleCompleteSupervision}
              disabled={!isAllRequiredApproved || processing || hasAnyRevisionRequired}
              className={`px-6 py-2 rounded-lg font-medium text-white flex items-center ${
                !isAllRequiredApproved || processing || hasAnyRevisionRequired ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              <ShieldCheck className="w-5 h-5 mr-2" />
              Selesaikan Supervisi
            </button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function EvidenceReviewCard({ item, evidence, onReview, processing }: any) {
  const [feedback, setFeedback] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  
  const status = evidence?.props?.status || 'MISSING';
  const hasEvidence = !!evidence?.props?.sourceId;
  const isApproved = status === 'APPROVED';
  
  const handleAction = (newStatus: 'APPROVED' | 'REVISION_REQUIRED' | 'REJECTED') => {
    if ((newStatus === 'REVISION_REQUIRED' || newStatus === 'REJECTED') && !feedback.trim()) {
      alert('Mohon isi catatan / alasan penolakan atau revisi.');
      return;
    }
    onReview(item.code, newStatus, feedback);
    setIsReviewing(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col md:flex-row gap-6 shadow-sm">
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-1">
          <h4 className="font-bold text-gray-900">{item.label}</h4>
          {item.required && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Wajib</span>}
        </div>
        <p className="text-sm text-gray-500 mb-3">{item.description}</p>
        
        {hasEvidence ? (
          <div className="flex items-start p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
            <FileText className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900 break-all">{evidence.props.sourceId}</p>
              <p className="text-xs text-blue-600 mt-0.5 uppercase tracking-wide">Tipe: {evidence.props.sourceType}</p>
            </div>
            {evidence.props.sourceType === 'DOCUMENT' && (
              <button className="ml-auto text-blue-600 hover:text-blue-800 p-2">
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-500 italic">
            Bukti belum dilampirkan oleh guru.
          </div>
        )}

        {evidence?.props?.reviewerNotes && !isReviewing && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-sm text-yellow-800">
            <strong>Catatan Anda (Terakhir):</strong> {evidence.props.reviewerNotes}
          </div>
        )}
        
        {evidence?.props?.reviewHistory && evidence.props.reviewHistory.length > 0 && (
          <div className="mt-3">
            <button 
              onClick={() => {
                const el = document.getElementById(`history-${evidence.props.id}`);
                if (el) el.classList.toggle('hidden');
              }}
              className="text-xs font-semibold text-gray-500 hover:text-gray-700 underline"
            >
              Lihat Riwayat Review ({evidence.props.reviewHistory.length})
            </button>
            <div id={`history-${evidence.props.id}`} className="hidden mt-2 space-y-2 border-l-2 border-gray-200 pl-3">
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
      </div>

      <div className="w-full md:w-64 shrink-0 flex flex-col border-l border-gray-100 md:pl-6">
        <div className="mb-4">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Status Pemeriksaan</p>
          <EvidenceBadge status={status} />
        </div>
        
        {hasEvidence && !isApproved && status !== 'REVISION_REQUIRED' && status !== 'REJECTED' && (
          <div className="flex-1 flex flex-col justify-end space-y-2">
            {!isReviewing ? (
              <button 
                onClick={() => setIsReviewing(true)}
                className="w-full py-2 bg-blue-50 text-blue-700 font-medium text-sm rounded-lg hover:bg-blue-100"
              >
                Beri Keputusan
              </button>
            ) : (
              <div className="space-y-3 mt-auto">
                <textarea 
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="Catatan opsional / alasan perbaikan..."
                  className="w-full text-sm border border-gray-300 rounded-lg p-2 h-20 resize-none outline-none focus:border-blue-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handleAction('APPROVED')}
                    disabled={processing}
                    className="py-1.5 bg-green-100 text-green-700 hover:bg-green-200 font-medium text-sm rounded-md"
                  >
                    Setujui
                  </button>
                  <button 
                    onClick={() => handleAction('REVISION_REQUIRED')}
                    disabled={processing}
                    className="py-1.5 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 font-medium text-sm rounded-md"
                  >
                    Revisi
                  </button>
                </div>
                <button 
                  onClick={() => setIsReviewing(false)}
                  className="w-full py-1 text-gray-500 text-xs hover:text-gray-700"
                >
                  Batal
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EvidenceBadge({ status }: { status: string }) {
  const map: Record<string, { color: string, label: string }> = {
    'MISSING': { color: 'bg-gray-100 text-gray-500', label: 'Belum Lampirkan' },
    'DRAFT': { color: 'bg-blue-100 text-blue-700', label: 'Telah Lampirkan (Draft)' },
    'SUBMITTED': { color: 'bg-indigo-100 text-indigo-700', label: 'Terkirim (Menunggu)' },
    'UNDER_REVIEW': { color: 'bg-yellow-100 text-yellow-700', label: 'Sedang Review' },
    'REVISION_REQUIRED': { color: 'bg-red-100 text-red-700', label: 'Perlu Revisi' },
    'RESUBMITTED': { color: 'bg-indigo-100 text-indigo-700', label: 'Dikirim Ulang' },
    'APPROVED': { color: 'bg-green-100 text-green-700', label: 'Disetujui' },
    'REJECTED': { color: 'bg-red-100 text-red-700', label: 'Ditolak' },
  };
  const config = map[status] || { color: 'bg-gray-100 text-gray-500', label: status };
  return <span className={`px-2.5 py-1 rounded-md text-xs font-semibold block w-max ${config.color}`}>{config.label}</span>;
}
