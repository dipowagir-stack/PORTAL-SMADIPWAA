import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PermissionGuard } from '../../components/PermissionGuard';
import { studentPromotionService, PromotionPreview, PromotionExecutePayload } from '../../domains/student/promotionService';
import { academicYearService, getClasses } from '../../domains/academic/services';
import { AcademicYear, AcademicClass } from '../../domains/academic/types';
import { Users, ShieldAlert, CheckCircle2, AlertCircle, ArrowRight, Save, UserCheck, Search, Filter } from 'lucide-react';

export default function StudentPromotionPanel() {
  const { profile } = useAuth();
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [sourceYear, setSourceYear] = useState('');
  const [sourceSemester, setSourceSemester] = useState<number>(2); // Default to genap for rollover
  const [targetYear, setTargetYear] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [previews, setPreviews] = useState<PromotionPreview[]>([]);
  const [classMappings, setClassMappings] = useState<Record<string, { targetClassId: string; targetClassName: string }>>({});
  
  const [step, setStep] = useState(1); // 1: Select Year & Map, 2: Preview, 3: Executing
  const [executionResult, setExecutionResult] = useState<any>(null);

  useEffect(() => {
    fetchAcademicYears();
    fetchClasses();
  }, []);

  const fetchAcademicYears = async () => {
    const res = await academicYearService.getAll();
    if (res.isSuccess) {
      setAcademicYears(res.getValue());
    }
  };

  const fetchClasses = async () => {
    const res = await getClasses();
    if (res.isSuccess) {
      const cls = res.getValue();
      setClasses(cls);
      
      // Auto-initialize mappings
      const initialMap: Record<string, any> = {};
      cls.forEach(c => {
        initialMap[c.id || c.name] = { targetClassId: '', targetClassName: '' };
      });
      setClassMappings(initialMap);
    }
  };

  const handleMappingChange = (sourceClassId: string, targetValue: string) => {
    if (targetValue === 'GRADUATE') {
      setClassMappings(prev => ({
        ...prev,
        [sourceClassId]: { targetClassId: 'GRADUATE', targetClassName: 'GRADUATE' }
      }));
    } else {
      const selectedClass = classes.find(c => c.id === targetValue || c.name === targetValue);
      if (selectedClass) {
        setClassMappings(prev => ({
          ...prev,
          [sourceClassId]: { targetClassId: selectedClass.id || selectedClass.name, targetClassName: selectedClass.name }
        }));
      } else {
        setClassMappings(prev => ({
          ...prev,
          [sourceClassId]: { targetClassId: '', targetClassName: '' }
        }));
      }
    }
  };

  const handleGeneratePreview = async () => {
    if (!sourceYear || !targetYear) return alert('Pilih Tahun Ajaran Asal dan Tujuan');
    
    setLoading(true);
    // Hardcoded semester 1 for target
    const res = await studentPromotionService.generatePromotionPreview(sourceYear, sourceSemester, classMappings);
    
    if (res.isSuccess) {
      setPreviews(res.getValue());
      setStep(2);
    } else if (res.isFailure) {
      alert('Gagal menghasilkan preview: ' + res.getError());
    }
    setLoading(false);
  };

  const handleExecute = async () => {
    if (!confirm('Peringatan: Aksi ini akan membuat enrollment baru untuk siswa terpilih tanpa menghapus histori lama. Lanjutkan?')) return;
    
    setLoading(true);
    const payloads: PromotionExecutePayload[] = previews.map(p => ({
      studentId: p.studentId,
      currentEnrollmentId: p.currentEnrollmentId,
      action: p.status === 'GRADUATED' ? 'GRADUATE' : p.status === 'RETAINED' ? 'RETAIN' : 'PROMOTE',
      targetClassId: p.proposedClassId,
      targetClassName: p.proposedClassName,
      reason: p.reason
    }));

    const res = await studentPromotionService.executePromotionBatch(payloads, targetYear, 1, profile!.id);
    
    if (res.isSuccess) {
      setExecutionResult(res.getValue());
      setStep(3);
    } else if (res.isFailure) {
      alert('Gagal mengeksekusi promotion: ' + res.getError());
    }
    setLoading(false);
  };

  const updatePreviewStatus = (index: number, status: any, reason?: string) => {
    const newPreviews = [...previews];
    newPreviews[index].status = status;
    if (reason) newPreviews[index].reason = reason;
    setPreviews(newPreviews);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold flex items-center text-gray-900 mb-2">
          <UserCheck className="w-6 h-6 mr-2 text-blue-600" /> Kenaikan Kelas & Kelulusan (Rollover)
        </h2>
        <p className="text-sm text-gray-500 mb-6">Kelola kenaikan kelas siswa tanpa merusak atau mengubah histori data akademik tahun ajaran sebelumnya.</p>
        
        {step === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <label className="block text-sm font-bold text-gray-700 mb-2">Tahun Ajaran & Semester Asal</label>
                <div className="grid grid-cols-2 gap-2">
                  <select value={sourceYear} onChange={e => setSourceYear(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">Pilih Tahun Asal...</option>
                    {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                  <select value={sourceSemester} onChange={e => setSourceSemester(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value={1}>Ganjil (1)</option>
                    <option value={2}>Genap (2)</option>
                  </select>
                </div>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <label className="block text-sm font-bold text-gray-700 mb-2">Tahun Ajaran Tujuan (Next)</label>
                <select value={targetYear} onChange={e => setTargetYear(e.target.value)} className="w-full border border-blue-300 rounded-lg px-3 py-2">
                  <option value="">Pilih Tahun Ajaran Tujuan...</option>
                  {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
                <div className="mt-2 text-xs text-blue-700 bg-blue-100 p-2 rounded">
                  <strong>Catatan:</strong> Siswa akan otomatis didaftarkan ke <strong>Semester Ganjil (1)</strong> pada tahun ajaran tujuan.
                </div>
              </div>
            </div>

            <div className="p-4 border border-gray-200 rounded-xl">
              <h3 className="font-bold text-gray-800 mb-4">Mapping Kelas (Opsional)</h3>
              <p className="text-sm text-gray-500 mb-4">Pemetaan ini akan digunakan untuk menghasilkan preview status secara otomatis.</p>
              
              <div className="grid grid-cols-3 gap-4 font-semibold text-gray-600 text-sm mb-2 px-2">
                <div>Kelas Asal (ID/Nama)</div>
                <div>Aksi</div>
                <div>Kelas Tujuan (ID/Nama)</div>
              </div>
              
              {/* Form Mapping Dinamis */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                 {classes.map(c => {
                   const sourceId = c.id || c.name;
                   const mapping = classMappings[sourceId] || { targetClassId: '' };
                   return (
                     <div key={sourceId} className="grid grid-cols-3 gap-4 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <div className="font-medium text-gray-800 px-2">{c.name}</div>
                        <div className="text-center"><ArrowRight className="w-4 h-4 mx-auto text-gray-400" /></div>
                        <select 
                          className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full outline-none focus:border-blue-500 bg-white"
                          value={mapping.targetClassId}
                          onChange={e => handleMappingChange(sourceId, e.target.value)}
                        >
                          <option value="">-- Pilih Tujuan --</option>
                          <option value={sourceId}>Tetap ({c.name})</option>
                          {classes.filter(t => t.id !== c.id).map(t => (
                            <option key={t.id} value={t.id || t.name}>Naik ke {t.name}</option>
                          ))}
                          <option value="GRADUATE" className="text-purple-600 font-bold">LULUS</option>
                        </select>
                     </div>
                   );
                 })}
                 {classes.length === 0 && (
                   <div className="text-sm text-gray-500 text-center py-4">Belum ada data kelas yang terdaftar.</div>
                 )}
              </div>
            </div>

            <div className="flex justify-end">
              <button 
                onClick={handleGeneratePreview}
                disabled={loading || !sourceYear || !targetYear}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {loading ? 'Memproses...' : 'Generate Promotion Preview'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Preview Kenaikan Kelas & Kelulusan</h3>
              <button onClick={() => setStep(1)} className="text-gray-500 hover:text-gray-700 text-sm font-medium border border-gray-300 px-3 py-1.5 rounded-lg">Kembali</button>
            </div>

            <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-xl text-sm mb-4">
              <span className="font-bold">Info:</span> Anda dapat melakukan override (mengubah) status secara manual untuk siswa tertentu sebelum eksekusi.
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-600">Siswa</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Kelas Asal</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Kelas Tujuan</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Alasan / Catatan</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Aksi Manual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {previews.map((p, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {p.studentName}
                        <div className="text-xs text-gray-500 font-mono mt-0.5">{p.studentId}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{p.currentClassName}</td>
                      <td className="px-4 py-3 text-blue-700 font-medium">{p.proposedClassName || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                          p.status === 'READY' ? 'bg-green-100 text-green-700' :
                          p.status === 'GRADUATED' ? 'bg-purple-100 text-purple-700' :
                          p.status === 'RETAINED' ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{p.reason}</td>
                      <td className="px-4 py-3">
                        <select 
                          className="border border-gray-300 rounded px-2 py-1 text-xs outline-none bg-white"
                          value={p.status}
                          onChange={(e) => updatePreviewStatus(idx, e.target.value, 'Manual Override by Admin')}
                        >
                          <option value="READY">PROMOTE (READY)</option>
                          <option value="RETAINED">RETAIN</option>
                          <option value="GRADUATED">GRADUATE</option>
                          <option value="MANUAL_REVIEW">REVIEW PENDING</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {previews.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Tidak ada data enrollment ditemukan pada periode ini.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="text-sm text-gray-600 font-medium">Total Siswa: {previews.length}</div>
              <PermissionGuard requiredPermission="academic:promotion:execute">
                <button 
                  onClick={handleExecute}
                  disabled={loading || previews.length === 0}
                  className="bg-green-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 flex items-center shadow-sm"
                >
                  {loading ? 'Mengeksekusi...' : 'Approve & Eksekusi Batch'}
                </button>
              </PermissionGuard>
            </div>
          </div>
        )}

        {step === 3 && executionResult && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="text-2xl font-bold text-green-800 mb-1">Eksekusi Berhasil</h3>
              <p className="text-green-700 mb-4">Siswa telah berhasil dinaikkan / diluluskan tanpa menghapus data akademik sebelumnya.</p>
              
              <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto bg-white p-4 rounded-lg shadow-sm">
                <div>
                  <div className="text-xs text-gray-500 font-medium uppercase">Total Proses</div>
                  <div className="text-xl font-bold text-gray-900">{executionResult.totalProcessed}</div>
                </div>
                <div>
                  <div className="text-xs text-green-600 font-medium uppercase">Sukses</div>
                  <div className="text-xl font-bold text-green-700">{executionResult.totalSuccess}</div>
                </div>
                <div>
                  <div className="text-xs text-red-600 font-medium uppercase">Gagal</div>
                  <div className="text-xl font-bold text-red-700">{executionResult.totalFailed}</div>
                </div>
              </div>
            </div>

            {executionResult.failedStudents.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <h4 className="font-bold text-red-800 mb-2 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2" /> Detail Kegagalan ({executionResult.failedStudents.length} Siswa)
                </h4>
                <ul className="list-disc pl-5 text-sm text-red-700 space-y-1">
                  {executionResult.failedStudents.map((f: any, i: number) => (
                    <li key={i}>{f.studentId} - {f.reason}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-center">
              <button 
                onClick={() => { setStep(1); setPreviews([]); setExecutionResult(null); }}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700"
              >
                Selesai & Kembali
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
