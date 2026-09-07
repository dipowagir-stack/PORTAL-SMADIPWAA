const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/supervision/SupervisionDetailModal.tsx', 'utf8');

const regex = /<div className="flex-1 overflow-y-auto p-6 bg-gray-50">([\s\S]*?)<div className="p-6 border-t border-gray-100 bg-white flex items-center justify-between">/;

const newBlock = `
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
`;

code = code.replace(regex, newBlock);
fs.writeFileSync('src/pages/admin/supervision/SupervisionDetailModal.tsx', code);
