import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Users, BookOpen, GraduationCap, FileText, 
  CreditCard, Calendar, Activity, AlertCircle, 
  CheckCircle, ChevronDown, Bell, Clock, ArrowRight
} from 'lucide-react';
import { ParentDashboardWorkflow } from '../../workflows/parent/ParentDashboardWorkflow';
import { ParentDashboardDTO } from '../../domains/parent/dtos/ParentFacadeDTO';

export default function ParentDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [linkedStudents, setLinkedStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<ParentDashboardDTO | null>(null);
  const [showAddStudent, setShowAddStudent] = useState(false);
  useEffect(() => {
    const init = async () => {
      if (!profile?.uid) return;
      setLoading(true);
      
      try {
        const studentsRes = await ParentDashboardWorkflow.getLinkedStudents(profile.uid);
        if (studentsRes.isSuccess) {
          const students = studentsRes.getValue();
          setLinkedStudents(students);
          if (students.length > 0 && !selectedStudentId) {
            setSelectedStudentId(students[0].studentProfile?.userId || students[0].relation.studentId);
          }
        }
      } catch (err: any) {
        console.error("Failed to initialize parent dashboard", err);
        setError("Gagal memuat profil parent: " + (err.message || String(err)));
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [profile?.uid]);
  useEffect(() => {
    const fetchDashboard = async () => {
      if (!profile?.uid || !selectedStudentId) return;
      
      const dashRes = await ParentDashboardWorkflow.getDashboardSummary(profile.uid, selectedStudentId);
      if (dashRes.isSuccess) {
        setDashboardData(dashRes.getValue());
        setError(null);
      } else {
        setError(dashRes.isFailure ? dashRes.getError() as string : 'Terjadi kesalahan');
      }
    };

    fetchDashboard();
  }, [selectedStudentId, profile?.uid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 sm:p-8 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30 backdrop-blur-sm">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{profile?.displayName || 'Parent Dashboard'}</h1>
                <p className="text-indigo-100 mt-1 flex items-center gap-2">
                  <span>Orang Tua / Wali</span>
                  <span className="w-1 h-1 rounded-full bg-indigo-300"></span>
                  <span>{linkedStudents.length} Anak Terhubung</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full border border-indigo-600"></span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-3">
           <AlertCircle className="h-5 w-5" />
           <p>{error}</p>
        </div>
      )}

      {/* STUDENT SELECTOR */}
      {linkedStudents.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4 overflow-x-auto">
          {linkedStudents.map((link) => {
            const stuId = link.studentProfile?.userId || link.relation.studentId;
            return (
            <button
              key={stuId}
              onClick={() => setSelectedStudentId(stuId)}
              className={`flex items-center gap-3 p-3 rounded-lg min-w-[200px] border transition-all ${
                selectedStudentId === stuId
                  ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                  : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
              }`}
            >
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                selectedStudentId === stuId ? 'bg-indigo-600' : 'bg-gray-200'
              }`}>
                <GraduationCap className={`h-5 w-5 ${
                  selectedStudentId === stuId ? 'text-white' : 'text-gray-500'
                }`} />
              </div>
              <div className="text-left">
                <p className={`font-semibold text-sm ${
                   selectedStudentId === stuId ? 'text-indigo-900' : 'text-gray-700'
                }`}>
                  {link.studentProfile?.fullName || 'Nama Siswa'}
                </p>
                <p className="text-xs text-gray-500">
                  {link.studentProfile?.nis || '-'} • Kelas {link.studentProfile?.className || '-'}
                </p>
              </div>
            </button>
            );
          })}
          
          <button
            onClick={() => setShowAddStudent(true)}
            className="flex items-center gap-3 p-3 rounded-lg min-w-[200px] border border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-indigo-600"
          >
            <div className="h-10 w-10 rounded-full flex items-center justify-center bg-indigo-100 text-indigo-600">
               <span className="text-xl font-bold">+</span>
            </div>
            <div className="text-left">
               <p className="font-semibold text-sm">Tambah Siswa</p>
               <p className="text-xs text-gray-500">Pakai Kode Sambungan</p>
            </div>
          </button>
        </div>
      )}

      {!linkedStudents.length && (
         <div className="bg-yellow-50 text-yellow-800 p-6 rounded-xl border border-yellow-200 flex flex-col items-center justify-center text-center">
            <Users className="h-12 w-12 text-yellow-400 mb-4" />
            <h3 className="font-semibold text-lg">Belum Ada Anak Terhubung</h3>
            <p className="text-yellow-700 mt-2 max-w-md">Silakan hubungi administrator sekolah untuk menghubungkan akun Anda dengan profil anak Anda.</p>
         </div>
      )}
      {(!linkedStudents.length || showAddStudent) && !loading && (
         <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center max-w-xl mx-auto mt-10 relative">
            {linkedStudents.length > 0 && (
               <button 
                 onClick={() => setShowAddStudent(false)}
                 className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-medium text-sm p-2 bg-gray-100 rounded-lg"
               >
                 Tutup
               </button>
            )}
            <Users className="h-12 w-12 text-indigo-400 mb-4" />
            <h3 className="font-bold text-xl text-gray-900 mb-2">Hubungkan Profil Siswa</h3>
            <p className="text-gray-500 mb-6">
              Masukkan <strong>Kode Sambungan</strong> yang bisa didapatkan dari aplikasi/dashboard anak Anda untuk mulai memantau perkembangan akademis dan keuangan.
            </p>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const code = (e.target as any).linkCode.value;
              if (!code) return;
              setLoading(true);
              try {
                const { ParentDashboardWorkflow } = await import('../../workflows/parent/ParentDashboardWorkflow');
                const res = await ParentDashboardWorkflow.linkParentByCode(profile!.uid, code.toUpperCase());
                if (res.isSuccess) {
                  window.location.reload();
                } else {
                  setError((res as any).getError());
                }
              } catch (err: any) {
                setError(err.message || 'Gagal menghubungkan');
              } finally {
                setLoading(false);
              }
            }} className="w-full max-w-sm flex gap-2">
              <input 
                name="linkCode"
                type="text" 
                placeholder="Contoh: A1B2C3" 
                className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-center uppercase tracking-widest"
                required
              />
              <button 
                type="submit"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors whitespace-nowrap"
              >
                Sambungkan
              </button>
            </form>
         </div>
      )}
             
      {dashboardData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6 lg:col-span-2">
             {/* QUICK SUMMARY (Today) */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                   <Activity className="h-5 w-5 text-indigo-500" />
                   Ringkasan Hari Ini
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-sm text-gray-500 mb-1">Status Kehadiran</p>
                      <p className="font-semibold text-green-600 flex items-center gap-2">
                         <CheckCircle className="h-4 w-4" /> Hadir
                      </p>
                   </div>
                   <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-sm text-gray-500 mb-1">Jadwal Berikutnya</p>
                      <p className="font-semibold text-gray-800 flex items-center gap-2">
                         <Clock className="h-4 w-4 text-gray-400" /> Matematika (09:00)
                      </p>
                   </div>
                </div>
             </div>

             {/* ATTENDANCE & ACADEMIC GRID */}
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* ATTENDANCE */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                   <div className="flex justify-between items-start mb-4">
                      <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                         <Calendar className="h-5 w-5 text-emerald-500" />
                         Kehadiran
                      </h3>
                   </div>
                   
                   <div className="flex items-end gap-2 mb-6">
                      <span className="text-3xl font-bold text-gray-800">
                         {dashboardData.attendance.totalMeetings > 0 
                            ? Math.round((dashboardData.attendance.present / dashboardData.attendance.totalMeetings) * 100) 
                            : 0}%
                      </span>
                      <span className="text-sm text-gray-500 mb-1">Tingkat Kehadiran</span>
                   </div>

                   <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                         <span className="text-gray-500">Hadir</span>
                         <span className="font-medium text-emerald-600">{dashboardData.attendance.present} Hari</span>
                      </div>
                      <div className="flex justify-between text-sm">
                         <span className="text-gray-500">Sakit / Izin</span>
                         <span className="font-medium text-yellow-600">{dashboardData.attendance.sick + dashboardData.attendance.leave} Hari</span>
                      </div>
                      <div className="flex justify-between text-sm">
                         <span className="text-gray-500">Alfa</span>
                         <span className="font-medium text-red-600">{dashboardData.attendance.absent} Hari</span>
                      </div>
                   </div>
                   
                   <button className="w-full mt-6 py-2 text-sm text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg transition-colors flex items-center justify-center gap-2">
                      Detail Kehadiran <ArrowRight className="h-4 w-4" />
                   </button>
                </div>

                {/* ACADEMIC */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                   <div className="flex justify-between items-start mb-4">
                      <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                         <BookOpen className="h-5 w-5 text-blue-500" />
                         Akademik
                      </h3>
                   </div>
                   
                   <div className="flex items-end gap-2 mb-6">
                      <span className="text-3xl font-bold text-gray-800">{dashboardData.academic.averageGrade || 0}</span>
                      <span className="text-sm text-gray-500 mb-1">Rata-rata Nilai</span>
                   </div>

                   <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                         <span className="text-gray-500">Semester</span>
                         <span className="font-medium text-gray-800">{dashboardData.academic.currentSemester}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                         <span className="text-gray-500">Peringkat Kelas</span>
                         <span className="font-medium text-gray-800">{dashboardData.academic.rank ? `${dashboardData.academic.rank}` : '-'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                         <span className="text-gray-500">Status</span>
                         <span className="font-medium text-green-600 capitalize">{dashboardData.studentProfile.status}</span>
                      </div>
                   </div>

                   <button className="w-full mt-6 py-2 text-sm text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg transition-colors flex items-center justify-center gap-2">
                      Lihat Rapor <ArrowRight className="h-4 w-4" />
                   </button>
                </div>
             </div>

          </div>

          {/* RIGHT COLUMN: Finance, Docs, Quick Actions */}
          <div className="space-y-6">
             
             {/* FINANCE */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                   <CreditCard className="h-5 w-5 text-rose-500" />
                   Keuangan
                </h3>
                
                <div className={`p-4 rounded-xl border mb-4 ${
                   dashboardData.finance.status === 'Clear' 
                   ? 'bg-green-50 border-green-100' 
                   : 'bg-rose-50 border-rose-100'
                }`}>
                   <p className="text-sm text-gray-600 mb-1">Total Tunggakan</p>
                   <p className={`text-2xl font-bold ${
                      dashboardData.finance.status === 'Clear' ? 'text-green-700' : 'text-rose-700'
                   }`}>
                      Rp {dashboardData.finance.totalUnpaid.toLocaleString('id-ID')}
                   </p>
                </div>

                <button className="w-full py-2 text-sm text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg transition-colors flex items-center justify-center gap-2">
                   Riwayat Pembayaran <ArrowRight className="h-4 w-4" />
                </button>
             </div>

             {/* NOTIFICATIONS / ALERTS */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                   <Bell className="h-5 w-5 text-amber-500" />
                   Notifikasi Terbaru
                </h3>
                
                <div className="space-y-3">
                   {dashboardData.notifications.length > 0 ? (
                      dashboardData.notifications.map(notif => (
                         <div key={notif.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm">
                            <p className="font-medium text-gray-800">{notif.title}</p>
                            <p className="text-gray-500 text-xs mt-1">{new Date(notif.date).toLocaleDateString()}</p>
                         </div>
                      ))
                   ) : (
                      <div className="text-center py-6 text-gray-500 text-sm">
                         Tidak ada notifikasi baru.
                      </div>
                   )}
                </div>
             </div>

             {/* QUICK ACTIONS */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                   <FileText className="h-5 w-5 text-indigo-500" />
                   Aksi Cepat
                </h3>
                <div className="space-y-2">
                   <button className="w-full text-left px-4 py-3 rounded-lg border border-gray-100 hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-sm font-medium text-gray-700 hover:text-indigo-700">
                      Ajukan Surat Izin
                   </button>
                   <button className="w-full text-left px-4 py-3 rounded-lg border border-gray-100 hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-sm font-medium text-gray-700 hover:text-indigo-700">
                      Unduh Kalender Akademik
                   </button>
                   <button className="w-full text-left px-4 py-3 rounded-lg border border-gray-100 hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-sm font-medium text-gray-700 hover:text-indigo-700">
                      Hubungi Wali Kelas
                   </button>
                </div>
             </div>

          </div>

        </div>
      )}

    </div>
  );
}
