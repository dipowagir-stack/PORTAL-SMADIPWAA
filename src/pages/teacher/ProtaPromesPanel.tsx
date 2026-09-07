import React, { useState, useEffect } from 'react';
import { Calendar, BookOpen, Clock, CheckCircle, AlertTriangle, Layers, CalendarDays } from 'lucide-react';
import { getTeacherSchedulesResult } from '../../domains/teacher/services';
import { useAuth } from '../../contexts/AuthContext';

interface TeachingMaterial {
  id: string;
  title: string;
  targetJP: number;
}

interface JPQuota {
  subject: string;
  className: string;
  availableJP: number;
}

export default function ProtaPromesPanel() {
  const { profile } = useAuth();
  const [quotas, setQuotas] = useState<JPQuota[]>([]);
  const [selectedQuota, setSelectedQuota] = useState<JPQuota | null>(null);
  const [materials, setMaterials] = useState<TeachingMaterial[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newJP, setNewJP] = useState<number | ''>('');
  const [status, setStatus] = useState<'DRAFT' | 'SUBMITTED' | 'VERIFIED'>('DRAFT');
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    async function loadQuotas() {
      if (!profile?.id) return;
      setLoading(true);
      try {
        const result = await getTeacherSchedulesResult(profile.id);
        if (result.success && result.data) {
          // Group schedules by subject and class to calculate "available JP"
          const grouping: Record<string, JPQuota> = {};
          result.data.forEach((sch: any) => {
            const key = `${sch.subject}-${sch.className}`;
            if (!grouping[key]) {
              // Assume a dummy logic for calculating Effective Weeks based on Academic Calendar
              // Let's assume 18 effective weeks for this semester.
              grouping[key] = {
                subject: sch.subject,
                className: sch.className,
                // In reality, this would be computed by intersecting with AcademicCalendar
                // Here we simulate it: 1 session per week = 2 JP * 18 effective weeks = 36 JP
                availableJP: 0
              };
            }
            // For each schedule entry (e.g. 2 hours), multiply by 18 effective weeks
            grouping[key].availableJP += (2 * 18); 
          });
          
          const quotaList = Object.values(grouping);
          setQuotas(quotaList);
          if (quotaList.length > 0) {
            setSelectedQuota(quotaList[0]);
          }
        }
      } catch (e) {
        console.error("Failed to load schedules", e);
      } finally {
        setLoading(false);
      }
    }
    loadQuotas();
  }, [profile]);

  const totalPlannedJP = materials.reduce((acc, curr) => acc + curr.targetJP, 0);
  const remainingJP = selectedQuota ? selectedQuota.availableJP - totalPlannedJP : 0;

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newJP || newJP <= 0) return;
    
    setMaterials([...materials, {
      id: Date.now().toString(),
      title: newTitle,
      targetJP: Number(newJP)
    }]);
    
    setNewTitle('');
    setNewJP('');
  };

  const handleRemoveMaterial = (id: string) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setStatus('SUBMITTED');
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (quotas.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-900 mb-1">Belum Ada Jadwal</h3>
        <p className="text-gray-500">Anda belum memiliki jadwal mengajar di semester ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Left Column: Context & Quota */}
        <div className="w-full md:w-1/3 space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Pilih Mata Pelajaran
            </h3>
            <div className="space-y-2">
              {quotas.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedQuota(q)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    selectedQuota?.subject === q.subject && selectedQuota?.className === q.className
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="font-semibold text-sm">{q.subject}</div>
                  <div className="text-xs opacity-80">Kelas: {q.className}</div>
                </button>
              ))}
            </div>
          </div>

          {selectedQuota && (
            <div className="bg-blue-600 text-white rounded-xl shadow-sm p-6 relative overflow-hidden">
              <div className="relative z-10">
                <div className="text-blue-100 text-sm font-medium mb-1">Total JP Tersedia (Aktual)</div>
                <div className="text-4xl font-bold mb-4">{selectedQuota.availableJP} <span className="text-xl font-normal opacity-80">JP</span></div>
                
                <div className="space-y-2 text-sm text-blue-100 border-t border-blue-500/50 pt-4">
                  <div className="flex justify-between">
                    <span>Minggu Efektif</span>
                    <span className="font-semibold text-white">18 Minggu</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Terpotong Libur/Event</span>
                    <span className="font-semibold text-white">2 JP</span>
                  </div>
                </div>
              </div>
              <CalendarDays className="w-32 h-32 absolute -bottom-6 -right-6 text-blue-500 opacity-30" />
            </div>
          )}
          
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
             <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Status Dokumen
             </h3>
             <div className="flex items-center gap-3">
               <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                 status === 'DRAFT' ? 'bg-gray-100 text-gray-600' :
                 status === 'SUBMITTED' ? 'bg-blue-100 text-blue-700' :
                 'bg-green-100 text-green-700'
               }`}>
                 {status}
               </span>
               <span className="text-sm text-gray-500">
                 {status === 'DRAFT' ? 'Sedang disusun' : 
                  status === 'SUBMITTED' ? 'Menunggu Review Kurikulum' : 
                  'Disetujui'}
               </span>
             </div>
          </div>
        </div>

        {/* Right Column: Planning Form */}
        <div className="w-full md:w-2/3 space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Distribusi Materi (Prota/Promes)</h3>
                <p className="text-sm text-gray-500">Petakan Capaian Pembelajaran ke alokasi waktu JP.</p>
              </div>
              <div className={`px-4 py-2 rounded-lg text-sm font-bold flex flex-col items-end ${
                remainingJP === 0 ? 'bg-green-50 text-green-700 border border-green-200' :
                remainingJP < 0 ? 'bg-red-50 text-red-700 border border-red-200' :
                'bg-orange-50 text-orange-700 border border-orange-200'
              }`}>
                <span>Sisa Kuota: {remainingJP} JP</span>
                <span className="text-xs font-medium opacity-80">Dari {selectedQuota?.availableJP} JP</span>
              </div>
            </div>

            {status === 'DRAFT' && (
              <form onSubmit={handleAddMaterial} className="flex gap-3 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Bab / Materi Pembelajaran</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Contoh: Bab 1. Virus dan Peranannya..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Alokasi JP</label>
                  <input
                    type="number"
                    value={newJP}
                    onChange={(e) => setNewJP(Number(e.target.value))}
                    min="1"
                    placeholder="12"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={status !== 'DRAFT'}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors h-[38px]"
                  >
                    Tambah
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3 mb-6">
              {materials.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Belum ada materi yang ditambahkan.
                </div>
              ) : (
                materials.map((m, index) => (
                  <div key={m.id} className="flex items-center justify-between p-4 border border-gray-100 bg-white rounded-xl shadow-sm hover:border-blue-100 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="font-medium text-gray-900">{m.title}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm font-semibold">
                        {m.targetJP} JP
                      </div>
                      {status === 'DRAFT' && (
                        <button
                          onClick={() => handleRemoveMaterial(m.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {remainingJP < 0 && (
              <div className="flex items-start gap-3 p-4 bg-red-50 text-red-700 rounded-xl mb-6">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold">Alokasi Berlebih</p>
                  <p>Total alokasi JP Anda ({totalPlannedJP} JP) melebihi ketersediaan kalender ({selectedQuota?.availableJP} JP). Silakan kurangi materi agar sesuai target.</p>
                </div>
              </div>
            )}

            {materials.length > 0 && remainingJP === 0 && status === 'DRAFT' && (
              <div className="flex items-start gap-3 p-4 bg-green-50 text-green-800 rounded-xl mb-6">
                 <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                 <div className="text-sm">
                   <p className="font-bold">Alokasi Sempurna</p>
                   <p>JP telah terdistribusi habis. Anda dapat melanjutkan untuk *generate* jadwal Promes ke kalender.</p>
                 </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-100">
              {status === 'DRAFT' ? (
                <button
                  onClick={handleGenerate}
                  disabled={remainingJP !== 0 || isGenerating}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
                    remainingJP === 0 && !isGenerating
                      ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:shadow-lg' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Generating Promes...
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-5 h-5" />
                      Generate & Submit Promes
                    </>
                  )}
                </button>
              ) : (
                <div className="text-sm font-medium text-gray-500">
                  Dokumen ini sudah disubmit dan masuk ke sistem supervisi.
                </div>
              )}
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}
