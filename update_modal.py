import re

with open('src/pages/admin/supervision/SupervisionDetailModal.tsx', 'r') as f:
    content = f.read()

# Add imports
imports_to_add = """
import { calculateSupervisionScore } from '../../../domains/supervision/models/SupervisionChecklist';
import { RecommendationStatus } from '../../../domains/supervision/models/SupervisionSession';
"""
content = content.replace("import { SUPERVISION_ADMINISTRATION_CHECKLIST } from '../../../domains/supervision/models/SupervisionChecklist';", 
                          "import { SUPERVISION_ADMINISTRATION_CHECKLIST, calculateSupervisionScore } from '../../../domains/supervision/models/SupervisionChecklist';\nimport { RecommendationStatus } from '../../../domains/supervision/models/SupervisionSession';")

# Add state variables
state_vars = """
  const [activeTab, setActiveTab] = useState<'EVIDENCE' | 'SCORING'>('EVIDENCE');
  const [scores, setScores] = useState<Record<string, number>>(supervision?.props?.observation?.scores || {});
  const [finalFeedback, setFinalFeedback] = useState({
    summary: supervision?.props?.finalFeedback?.summary || '',
    strengths: supervision?.props?.finalFeedback?.strengths?.join('\\n') || '',
    weaknesses: supervision?.props?.finalFeedback?.weaknesses?.join('\\n') || '',
    recommendations: supervision?.props?.finalFeedback?.recommendations?.join('\\n') || '',
    recommendationStatus: supervision?.props?.finalFeedback?.recommendationStatus || 'CONTINUE' as RecommendationStatus,
  });
"""
content = content.replace("const [evidences, setEvidences] = useState<any[]>([]);", "const [evidences, setEvidences] = useState<any[]>([]);\n" + state_vars)

# Add save scoring logic
save_scoring_logic = """
  const handleSaveScoring = async () => {
    try {
      setProcessing(true);
      const svc = new SupervisionService(new SupervisionRepositoryImpl());
      
      // Save observation scores
      await svc.submitObservation(supervision.props.id, {
        rubricId: 'ADMIN-01',
        scores,
        notes: ''
      }, currentUser?.uid || 'system');
      
      // Calculate final result
      const calculated = calculateSupervisionScore(scores);
      
      // Format feedback
      const feedbackData = {
        summary: finalFeedback.summary,
        strengths: finalFeedback.strengths.split('\\n').filter((s: string) => s.trim()),
        weaknesses: finalFeedback.weaknesses.split('\\n').filter((s: string) => s.trim()),
        recommendations: finalFeedback.recommendations.split('\\n').filter((s: string) => s.trim()),
        recommendationStatus: finalFeedback.recommendationStatus
      };
      
      await svc.submitFinalFeedback(supervision.props.id, feedbackData, currentUser?.uid || 'system');
      await svc.submitFinalResult(supervision.props.id, calculated, currentUser?.uid || 'system');
      
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
      const res = await svc.finalizeSupervision(supervision.props.id, currentUser?.uid || 'system');
      if (res.isSuccess) {
        alert('Supervisi berhasil diselesaikan.');
        onUpdate();
        onClose();
      } else {
        alert(res.getError() as string);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(false);
    }
  };
"""
content = content.replace("const handleCompleteSupervision = async () => {", save_scoring_logic + "\n  const handleCompleteSupervision = async () => {")

# Update tabs UI
tabs_ui = """
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
"""
content = content.replace('<div className="p-6">', tabs_ui + '\n        <div className="p-6">')

# Modify body to render content based on tab
content = content.replace(
    '          <div className="space-y-4">',
    '          {activeTab === \'EVIDENCE\' ? (\n          <div className="space-y-4">'
)

scoring_ui = """
          </div>
          ) : (
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
"""

content = content.replace('          </div>\n\n        </div>', scoring_ui + '\n\n        </div>')

# Hide old finalize buttons in evidence tab
content = content.replace('            <button \n              onClick={handleCompleteSupervision}', '{activeTab === \'EVIDENCE\' && <button \n              onClick={handleCompleteSupervision}')
content = content.replace('Selesaikan Supervisi\n            </button>', 'Selesaikan Supervisi\n            </button>}')

with open('src/pages/admin/supervision/SupervisionDetailModal.tsx', 'w') as f:
    f.write(content)
