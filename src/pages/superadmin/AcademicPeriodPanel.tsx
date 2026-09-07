import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Play, Square, Archive, FolderArchive } from 'lucide-react';
import { academicYearService, academicSemesterService, periodLifecycleService, periodContextService, academicYearRolloverService } from '../../domains/academic/services';
import { AcademicYear, AcademicSemesterMaster } from '../../domains/academic/types';
import { AcademicYearRolloverModal } from './AcademicYearRolloverModal';
import { semesterInitializationService, SemesterValidationResult } from '../../domains/academic/semesterInitializationService';
import { useAuth } from '../../contexts/AuthContext';
import { PermissionGuard } from '../../components/PermissionGuard';

export default function AcademicPeriodPanel() {
  const { profile, user } = useAuth();
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<Record<string, AcademicSemesterMaster[]>>({});
  const [loading, setLoading] = useState(true);
  
  const [showYearModal, setShowYearModal] = useState(false);
  const [showSemesterModal, setShowSemesterModal] = useState<string | null>(null);
  
  const [newYear, setNewYear] = useState({ name: '', startDate: '', endDate: '' });
  const [newSemester, setNewSemester] = useState({ type: 'GANJIL', startDate: '', endDate: '' });
  const [validationResult, setValidationResult] = useState<SemesterValidationResult | null>(null);
  const [closeChecklist, setCloseChecklist] = useState<any>(null);
  const [closeConfirmationText, setCloseConfirmationText] = useState('');
  const [closingType, setClosingType] = useState<'YEAR' | 'SEMESTER' | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [validatingSemesterId, setValidatingSemesterId] = useState<string | null>(null);
  const [rolloverYear, setRolloverYear] = useState<AcademicYear | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const yRes = await academicYearService.getAll();
    if (yRes.isSuccess) {
      const allYears = yRes.getValue() || [];
      setYears(allYears);
      
      const sems: Record<string, AcademicSemesterMaster[]> = {};
      for (const y of allYears) {
        if (y.id) {
          const sRes = await academicSemesterService.getByAcademicYearId(y.id);
          if (sRes.isSuccess) {
            sems[y.id] = sRes.getValue() || [];
          }
        }
      }
      setSemesters(sems);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateYear = async () => {
    if (!newYear.name || !newYear.startDate || !newYear.endDate) return alert('Lengkapi data');
    const data = {
      name: newYear.name,
      startDate: new Date(newYear.startDate).getTime(),
      endDate: new Date(newYear.endDate).getTime()
    };
    const res = await academicYearRolloverService.initializeAcademicYear({ ...data, createdBy: profile!.uid });
    if (res.isSuccess) {
      alert('Tahun Ajaran berhasil dibuat');
      setShowYearModal(false);
      setNewYear({ name: '', startDate: '', endDate: '' });
      fetchData();
    } else if (res.isFailure) { alert('Error: ' + res.getError()); }
  };

  const handleActivateYear = (year: AcademicYear) => {
    setRolloverYear(year);
  };

  
  const handleInitiateCloseYear = async (id: string) => {
    const res = await periodLifecycleService.getAcademicYearCloseChecklist(id);
    if (res.isSuccess) {
      setCloseChecklist(res.getValue());
      setClosingType('YEAR');
      setClosingId(id);
    }
  };

  const confirmCloseYear = async () => {
    if (!closingId) return;
    const res = await periodLifecycleService.initiateCloseAcademicYear(closingId, profile!.uid);
    if (res.isSuccess) {
      alert('Tahun Ajaran sedang ditutup');
      setCloseChecklist(null);
      setClosingId(null);
      setClosingType(null);
      fetchData();
    } else if (res.isFailure) { alert('Error: ' + res.getError()); }
  };

  const handleCloseYear = async (id: string) => {
    const res = await periodLifecycleService.closeAcademicYear(id, profile!.uid);
    if (res.isSuccess) {
      alert('Tahun Ajaran ditutup');
      fetchData();
    } else if (res.isFailure) { alert('Error: ' + res.getError()); }
  };

  const handleArchiveYear = async (id: string) => {
    const res = await periodLifecycleService.archiveAcademicYear(id, profile!.uid);
    if (res.isSuccess) {
      alert('Tahun Ajaran diarsipkan');
      fetchData();
    } else if (res.isFailure) { alert('Error: ' + res.getError()); }
  };

  const handleCreateSemester = async (yearId: string) => {
    if (!newSemester.type || !newSemester.startDate || !newSemester.endDate) return alert('Lengkapi data');
    const data = {
      academicYearId: yearId,
      type: newSemester.type as any,
      startDate: new Date(newSemester.startDate).getTime(),
      endDate: new Date(newSemester.endDate).getTime()
    };
    const res = await academicSemesterService.create(data);
    if (res.isSuccess) {
      alert('Semester berhasil dibuat');
      setShowSemesterModal(null);
      setNewSemester({ type: 'GANJIL', startDate: '', endDate: '' });
      fetchData();
    } else if (res.isFailure) { alert('Error: ' + res.getError()); }
  };

  const handleActivateSemester = async (id: string) => {
    const valRes = await semesterInitializationService.validateSemester(id);
    if (valRes.isSuccess) {
       setValidationResult(valRes.getValue());
       setValidatingSemesterId(id);
    } else {
       if (valRes.isFailure) alert(valRes.getError());
    }
  };

  const confirmActivateSemester = async () => {
    if (!validatingSemesterId) return;
    const res = await semesterInitializationService.activateSemester(validatingSemesterId, profile!.uid);
    if (res.isSuccess) {
      setValidationResult(null);
      setValidatingSemesterId(null);
      fetchData();
      alert('Semester berhasil diaktifkan dan dikonfigurasi sebagai Period Context.');
    } else {
      if (res.isFailure) alert(res.getError());
    }
  };

  
  const handleInitiateCloseSemester = async (id: string) => {
    const res = await periodLifecycleService.getSemesterCloseChecklist(id);
    if (res.isSuccess) {
      setCloseChecklist(res.getValue());
      setClosingType('SEMESTER');
      setClosingId(id);
    }
  };

  const confirmCloseSemester = async () => {
    if (!closingId) return;
    const res = await periodLifecycleService.initiateCloseSemester(closingId, profile!.uid);
    if (res.isSuccess) {
      alert('Semester sedang ditutup');
      setCloseChecklist(null);
      setClosingId(null);
      setClosingType(null);
      fetchData();
    } else if (res.isFailure) { alert('Error: ' + res.getError()); }
  };

  const handleCloseSemester = async (id: string) => {
    const res = await periodLifecycleService.closeSemester(id, profile!.uid);
    if (res.isSuccess) {
      alert('Semester ditutup');
      fetchData();
    } else if (res.isFailure) { alert('Error: ' + res.getError()); }
  };

  return (
    <div className="space-y-6">
      <PermissionGuard requiredPermission="academic:period:read" fallback={<div className="p-4 text-red-600">Anda tidak memiliki akses ke halaman ini.</div>}>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold flex items-center text-gray-900">
                <Calendar className="w-6 h-6 mr-2 text-blue-600" /> Manajemen Periode Akademik
              </h2>
              <p className="text-sm text-gray-500 mt-1">Kelola siklus hidup Tahun Ajaran dan Semester.</p>
            </div>
            <PermissionGuard requiredPermission="academic:period:create">
              <button 
                onClick={() => setShowYearModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center transition-colors"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Buat Tahun Ajaran
              </button>
            </PermissionGuard>
          </div>
          
          {loading ? <div className="py-8 text-center text-gray-500">Memuat data periode...</div> : (
            <div className="space-y-6">
              {years.map(y => (
                <div key={y.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 p-4 flex items-center justify-between border-b border-gray-200">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-gray-900">{y.name}</h3>
                        <span className={`px-2.5 py-0.5 text-xs rounded-full font-bold uppercase tracking-wider ${
                          y.state === 'ACTIVE' ? 'bg-green-100 text-green-800 border border-green-200' :
                          y.state === 'PLANNING' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          y.state === 'CLOSED' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                          'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          {y.state || (y.isActive ? 'ACTIVE' : 'LEGACY')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1 font-medium">
                        {y.startDate ? new Date(y.startDate).toLocaleDateString() : '-'} - {y.endDate ? new Date(y.endDate).toLocaleDateString() : '-'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {y.state === 'PLANNING' && (
                        <PermissionGuard requiredPermission="academic:period:activate">
                          <button onClick={() => handleActivateYear(y)} className="bg-white border border-gray-300 text-gray-700 hover:bg-green-50 hover:text-green-700 hover:border-green-300 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center transition-colors">
                            <Play className="w-4 h-4 mr-1.5" /> Prepare & Activate
                          </button>
                        </PermissionGuard>
                      )}
                      {y.state === 'ACTIVE' && (
                        <PermissionGuard requiredPermission="academic:period:close">
                          <button onClick={() => handleInitiateCloseYear(y.id!)} className="bg-white border border-gray-300 text-gray-700 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center transition-colors">
                            <Square className="w-4 h-4 mr-1.5" /> Initiate Close
                          </button>
                        </PermissionGuard>
                      )}
                      {y.state === 'CLOSING' && (
                        <PermissionGuard requiredPermission="academic:period:close">
                          <button onClick={() => handleCloseYear(y.id!)} className="bg-white border border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center transition-colors">
                            <Square className="w-4 h-4 mr-1.5" /> Finalize Close
                          </button>
                        </PermissionGuard>
                      )}
                      {y.state === 'CLOSED' && (
                        <PermissionGuard requiredPermission="academic:period:archive">
                          <button onClick={() => handleArchiveYear(y.id!)} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center transition-colors">
                            <Archive className="w-4 h-4 mr-1.5" /> Archive
                          </button>
                        </PermissionGuard>
                      )}
                      
                      <PermissionGuard requiredPermission="academic:period:create">
                        <button 
                          onClick={() => setShowSemesterModal(y.id!)}
                          className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center transition-colors ml-2"
                        >
                          <Plus className="w-4 h-4 mr-1.5" /> Semester
                        </button>
                      </PermissionGuard>
                    </div>
                  </div>
                  
                  <div className="p-0">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white border-b border-gray-100 text-gray-500">
                        <tr>
                          <th className="px-4 py-2 font-semibold">Semester</th>
                          <th className="px-4 py-2 font-semibold">Start Date</th>
                          <th className="px-4 py-2 font-semibold">End Date</th>
                          <th className="px-4 py-2 font-semibold">Status</th>
                          <th className="px-4 py-2 font-semibold text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {(semesters[y.id!] || []).map(s => (
                          <tr key={s.id} className="hover:bg-gray-50/50">
                            <td className="px-4 py-3 font-bold text-gray-900">{s.type}</td>
                            <td className="px-4 py-3 text-gray-600">{s.startDate ? new Date(s.startDate).toLocaleDateString() : '-'}</td>
                            <td className="px-4 py-3 text-gray-600">{s.endDate ? new Date(s.endDate).toLocaleDateString() : '-'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs rounded-full font-bold ${
                                s.state === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                s.state === 'PLANNING' ? 'bg-blue-100 text-blue-700' :
                                s.state === 'CLOSED' ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {s.state || (s.isActive ? 'ACTIVE' : 'LEGACY')}
                              </span>
                            </td>
                            <td className="px-4 py-3 flex justify-end gap-2">
                              {s.state === 'PLANNING' && (
                                <PermissionGuard requiredPermission="academic:period:activate">
                                  <button onClick={() => handleActivateSemester(s.id!)} className="text-blue-600 hover:text-blue-800 font-medium text-xs px-2 py-1 bg-blue-50 rounded">Activate</button>
                                </PermissionGuard>
                              )}
                              {s.state === 'ACTIVE' && (
                                <PermissionGuard requiredPermission="academic:period:close">
                                  <button onClick={() => handleInitiateCloseSemester(s.id!)} className="text-orange-600 hover:text-orange-800 font-medium text-xs px-2 py-1 bg-orange-50 rounded">Initiate Close</button>
                                </PermissionGuard>
                              )}
                              {s.state === 'CLOSING' && (
                                <PermissionGuard requiredPermission="academic:period:close">
                                  <button onClick={() => handleCloseSemester(s.id!)} className="text-red-600 hover:text-red-800 font-medium text-xs px-2 py-1 bg-red-50 rounded">Finalize Close</button>
                                </PermissionGuard>
                              )}
                            </td>
                          </tr>
                        ))}
                        {(!semesters[y.id!] || semesters[y.id!].length === 0) && (
                          <tr>
                            <td colSpan={5} className="px-4 py-4 text-center text-gray-400 italic">Belum ada data semester</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {years.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200 border-dashed">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Belum ada Tahun Ajaran</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* YEAR MODAL */}
        {showYearModal && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-xl">
              <h3 className="text-xl font-bold text-gray-900 mb-5">Buat Tahun Ajaran Baru</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nama Tahun Ajaran</label>
                  <input type="text" placeholder="Contoh: 2026/2027" className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" value={newYear.name} onChange={e => setNewYear({...newYear, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Tanggal Mulai</label>
                    <input type="date" className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" value={newYear.startDate} onChange={e => setNewYear({...newYear, startDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Tanggal Selesai</label>
                    <input type="date" className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" value={newYear.endDate} onChange={e => setNewYear({...newYear, endDate: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <button onClick={() => setShowYearModal(false)} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors">Batal</button>
                <button onClick={handleCreateYear} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-sm transition-colors">Simpan Tahun</button>
              </div>
            </div>
          </div>
        )}

        {/* SEMESTER MODAL */}
        {showSemesterModal && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-xl">
              <h3 className="text-xl font-bold text-gray-900 mb-5">Buat Semester Baru</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Tipe Semester</label>
                  <select className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" value={newSemester.type} onChange={e => setNewSemester({...newSemester, type: e.target.value})}>
                    <option value="GANJIL">GANJIL</option>
                    <option value="GENAP">GENAP</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Tanggal Mulai</label>
                    <input type="date" className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" value={newSemester.startDate} onChange={e => setNewSemester({...newSemester, startDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Tanggal Selesai</label>
                    <input type="date" className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" value={newSemester.endDate} onChange={e => setNewSemester({...newSemester, endDate: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <button onClick={() => setShowSemesterModal(null)} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors">Batal</button>
                <button onClick={() => handleCreateSemester(showSemesterModal)} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-sm transition-colors">Simpan Semester</button>
              </div>
            </div>
          </div>
        )}
        
        {/* CLOSE CHECKLIST MODAL */}
        {closeChecklist && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-gray-900 mb-5">Pre-Close Checklist ({closingType === 'YEAR' ? 'Tahun Ajaran' : 'Semester'})</h3>
              
              <div className="space-y-4">
                {closeChecklist.checks.map((c: any, i: number) => (
                  <div key={i} className={`p-4 rounded-xl border ${c.status === 'pass' ? 'bg-green-50 border-green-200' : c.status === 'warning' ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-gray-800">{c.name}</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${c.status === 'pass' ? 'bg-green-100 text-green-800' : c.status === 'warning' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'}`}>{c.status.toUpperCase()}</span>
                    </div>
                    {c.message && <p className="text-sm text-gray-600 mt-1">{c.message}</p>}
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button onClick={() => { setCloseChecklist(null); setClosingId(null); setClosingType(null); }} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors">Batal</button>
                
                <div className="flex flex-col items-end gap-2">
                  {closeChecklist.status !== 'BLOCKED' && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-600 font-medium">Ketik <strong>TUTUP {closingType === 'YEAR' ? 'TAHUN' : 'SEMESTER'}</strong>:</span>
                      <input 
                        type="text" 
                        value={closeConfirmationText} 
                        onChange={e => setCloseConfirmationText(e.target.value)} 
                        className="border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:border-orange-500 w-40"
                        placeholder={"TUTUP " + (closingType === 'YEAR' ? 'TAHUN' : 'SEMESTER')}
                      />
                    </div>
                  )}
                  <button 
                    onClick={closingType === 'YEAR' ? confirmCloseYear : confirmCloseSemester} 
                    disabled={closeChecklist.status === 'BLOCKED' || closeConfirmationText !== "TUTUP " + (closingType === 'YEAR' ? 'TAHUN' : 'SEMESTER')}
                    className={`px-5 py-2.5 rounded-lg font-bold shadow-sm transition-colors ${closeChecklist.status !== 'BLOCKED' && closeConfirmationText === "TUTUP " + (closingType === 'YEAR' ? 'TAHUN' : 'SEMESTER') ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                  >
                    Initiate Close
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* VALIDATION MODAL */}
        {validationResult && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-gray-900 mb-5">Validasi Aktivasi Semester</h3>
              
              <div className="space-y-6">
                {/* Blockers */}
                {validationResult.blockers.length > 0 && (
                  <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                    <h4 className="font-bold text-red-800 flex items-center gap-2 mb-2">
                      <span>Blockers ({validationResult.blockers.length})</span>
                    </h4>
                    <ul className="list-disc pl-5 text-sm text-red-700 space-y-1">
                      {validationResult.blockers.map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                  </div>
                )}

                {/* Warnings */}
                {validationResult.warnings.length > 0 && (
                  <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                    <h4 className="font-bold text-orange-800 flex items-center gap-2 mb-2">
                      <span>Warnings ({validationResult.warnings.length})</span>
                    </h4>
                    <ul className="list-disc pl-5 text-sm text-orange-700 space-y-1">
                      {validationResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                )}

                {/* Domain Readiness */}
                <div>
                  <h4 className="font-bold text-gray-800 mb-3">Domain Readiness Audit</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {validationResult.domainChecks.map((dc, i) => (
                      <div key={i} className={`p-3 rounded-lg border ${dc.status === 'READY' ? 'bg-green-50 border-green-200' : dc.status === 'WARNING' ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-gray-700 text-sm">{dc.domain}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${dc.status === 'READY' ? 'bg-green-100 text-green-700' : dc.status === 'WARNING' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>{dc.status}</span>
                        </div>
                        <p className="text-xs text-gray-600">{dc.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button onClick={() => { setValidationResult(null); setValidatingSemesterId(null); }} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors">Batal</button>
                <button 
                  onClick={confirmActivateSemester} 
                  disabled={!validationResult.isReadyToActivate}
                  className={`px-5 py-2.5 rounded-lg font-bold shadow-sm transition-colors ${validationResult.isReadyToActivate ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                >
                  Konfirmasi Aktivasi
                </button>
              </div>
            </div>
          </div>
        )}
        {rolloverYear && (
          <AcademicYearRolloverModal
            year={rolloverYear}
            onClose={() => setRolloverYear(null)}
            onActivated={() => {
              setRolloverYear(null);
              fetchData();
            }}
          />
        )}
      </PermissionGuard>
    </div>
  );
}
