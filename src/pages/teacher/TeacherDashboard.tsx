import React, { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getTeacherSchedulesResult, getTeacherAttendanceLogsResult, getStudentsByClassResult, getTeacherExamSchedulesResult, submitExamReportResult,
  submitStudentAttendanceResult, getTeacherDocumentsResult, saveTeacherDocumentResult,
  deleteTeacherDocumentResult
} from '../../domains/teacher/services';
import { useGoogleLogin } from '@react-oauth/google';
import { Users, FileText, CheckSquare, Award, MessageSquare, AlertCircle, X, Edit2, Eye, Clock, FileDown, RefreshCw, Trash2, Key, Calendar, BookOpen, CheckCircle } from 'lucide-react';
import KetersediaanPanel from './KetersediaanPanel';
import TeacherToolsView from './TeacherToolsView';
import PiketPanel from './PiketPanel';
import ProtaPromesPanel from './ProtaPromesPanel';
import WaliKelasPanel from './WaliKelasPanel';
import SupervisiAdministrasiPanel from './SupervisiAdministrasiPanel';
import { exportToCSV } from '../../lib/exportUtils';
import { getAcademicCalendar, getExamSchedules, getAssessments, saveAssessment, saveGrade } from '../../domains/academic/services';
import { isAcademicFrozen } from '../../domains/academic/freezeService';
import { useVirtualMode } from '../../contexts/VirtualModeContext';

export default function TeacherDashboard() {
  const { profile } = useAuth();
  const { isVirtualMode, vSchedules } = useVirtualMode();
  const [activeTab, setActiveTab] = useState('absensi');
  const [frozen, setFrozen] = useState(false);
  const [homeroomClass, setHomeroomClass] = useState<string | null>(null);

  React.useEffect(() => { 
    (async () => { 
      const {isAcademicFrozen} = await import('../../domains/academic/freezeService'); 
      setFrozen(await isAcademicFrozen()); 
      
      const { getMasterCurriculumConfig } = await import('../../domains/academic/services');
      const masterRes = await getMasterCurriculumConfig();
      if (masterRes.isSuccess && masterRes.getValue()?.homeroomTeachers) {
        const ht = masterRes.getValue()!.homeroomTeachers!.find(h => h.teacherId === profile?.uid);
        if (ht) setHomeroomClass(ht.className);
      }
    })(); 
  }, [profile?.uid]);

  const tabs = [
    { id: 'absensi', label: 'Absensi', icon: <Users className="w-5 h-5" /> },
    { id: 'piket', label: 'Guru Piket', icon: <AlertCircle className="w-5 h-5" /> },
    ...(homeroomClass ? [{ id: 'walikelas', label: 'Wali Kelas', icon: <Users className="w-5 h-5 text-indigo-500" /> }] : []),
    { id: 'promes', label: 'Prota & Promes', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'materi', label: 'RPP & LKPD', icon: <FileText className="w-5 h-5" /> },
    { id: 'nilai', label: 'Input Nilai', icon: <Award className="w-5 h-5" /> },
    { id: 'supervisi', label: 'Supervisi Admin', icon: <CheckCircle className="w-5 h-5" /> },
    { id: 'catatan', label: 'Catatan Khusus', icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'ketersediaan', label: 'Ketersediaan Waktu', icon: <Clock className="w-5 h-5" /> },
    { id: 'tools', label: 'Alat Guru', icon: <Key className="w-5 h-5" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Guru</h2>
        <p className="text-gray-500">Kelola kelas, absensi, materi, dan nilai siswa.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'absensi' && <AbsensiPanel profile={profile} frozen={frozen} />}
          {activeTab === 'piket' && <PiketPanel profile={profile} frozen={frozen} />}
          {activeTab === 'walikelas' && homeroomClass && <WaliKelasPanel profile={profile} className={homeroomClass} frozen={frozen} />}
          {activeTab === 'promes' && <ProtaPromesPanel />}
          {activeTab === 'materi' && <MateriPanel profile={profile} frozen={frozen} />}
          {activeTab === 'nilai' && <NilaiPanel profile={profile} frozen={frozen} />}
          {activeTab === 'supervisi' && <SupervisiAdministrasiPanel />}
          {activeTab === 'catatan' && <CatatanPanel profile={profile} />}
          {activeTab === 'ketersediaan' && <KetersediaanPanel />}
          {activeTab === 'tools' && <TeacherToolsView />}
        </div>
      </div>
    </div>
  );
}

function AbsensiPanel({ profile, frozen }: any) {
  const { isVirtualMode, vSchedules } = useVirtualMode();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [pertemuan, setPertemuan] = useState('1');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [materi, setMateri] = useState('');
  
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReminder, setShowReminder] = useState(true);
  const [holidayName, setHolidayName] = useState<string | null>(null);
  
  const [todaySchedules, setTodaySchedules] = useState<any[]>([]);
  const [todayExamSchedules, setTodayExamSchedules] = useState<any[]>([]);
  const [mergedTimeline, setMergedTimeline] = useState<any[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [isClassSelected, setIsClassSelected] = useState(false);
  const isExamMode = mergedTimeline.find(s => s.id === selectedScheduleId)?.isExam || false;
  
  const [lastSessionInfo, setLastSessionInfo] = useState<{ pertemuan: number, materi: string } | null>(null);

  React.useEffect(() => {
    if (!profile?.uid) return;
    const fetchSchedulesAndDetect = async () => {
      try {
        // Cek kalender akademik untuk hari libur KBM
        const calRes = await getAcademicCalendar();
        if (calRes.isSuccess && calRes.getValue()?.academic_calendar) {
          const events = calRes.getValue()!.academic_calendar;
          const curr = new Date();
          const yyyy = curr.getFullYear();
          const mm = String(curr.getMonth() + 1).padStart(2, '0');
          const dd = String(curr.getDate()).padStart(2, '0');
          const dateStr = `${yyyy}-${mm}-${dd}`;
          
          let foundHoliday = null;
          for (const ev of events) {
            if (ev.isHoliday) {
              if (ev.date === dateStr) {
                foundHoliday = ev.description; break;
              }
              if (ev.date.includes(' to ')) {
                const [start, end] = ev.date.split(' to ');
                if (dateStr >= start && dateStr <= end) {
                  foundHoliday = ev.description; break;
                }
              }
            }
          }
          if (foundHoliday) {
            setHolidayName(foundHoliday);
            setLoading(false);
            return; // Berhenti eksekusi jadwal jika libur
          }
        }

        let scheds: any[] = [];
        let examScheds: any[] = [];
        
        const curr = new Date();
        const yyyy = curr.getFullYear();
        const mm = String(curr.getMonth() + 1).padStart(2, '0');
        const dd = String(curr.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        if (isVirtualMode) {
          scheds = vSchedules.filter(s => s.teacherId === profile.uid);
        } else {
          const res = await getTeacherSchedulesResult(profile.uid);
          if (res.isSuccess) scheds = res.getValue();
          
          const examRes = await getTeacherExamSchedulesResult(profile.uid);
          if (examRes.isSuccess) {
            // Filter exams for today and that are published
            examScheds = examRes.getValue().filter((e: any) => e.date === dateStr && e.status === 'published');
          }
        }
        
        // 2. Detect current day (0 = Senin, 1 = Selasa...)
        const dayMap = [6, 0, 1, 2, 3, 4, 5]; // Date.getDay() 0=Sunday, 1=Monday
        const todayIdx = dayMap[new Date().getDay()];
        
        // Match today's regular schedules
        let todayScheds = scheds.filter((s: any) => s.dayIndex === todayIdx);
        
        // If it's a holiday, clear regular schedules (but keep exams if any)
        if (holidayName) {
           todayScheds = [];
        }

        // Merge and sort by startTime
        const timeline = [
          ...todayScheds.map(s => ({ ...s, isExam: false, displayTime: s.startTime })),
          ...examScheds.map(e => ({ ...e, isExam: true, displayTime: e.startTime }))
        ].sort((a, b) => a.displayTime.localeCompare(b.displayTime));
        
        setTodaySchedules(todayScheds);
        setTodayExamSchedules(examScheds);
        setMergedTimeline(timeline);

        if (timeline.length > 0) {
          handleScheduleSelect(timeline[0], timeline[0].id);
        } else {
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    };
    fetchSchedulesAndDetect();
  }, [profile?.uid]);

  const handleScheduleSelect = async (schedule: any, scheduleId: string) => {
    setSelectedScheduleId(scheduleId);
    setSelectedClass(schedule.className || schedule.roomName);
    setSelectedSubject(schedule.subject);
    setIsClassSelected(true);
    setMateri('');
    
    if (schedule.isExam) {
      setLoading(true);
      try {
        const { getExamRooms } = await import('../../domains/academic/services');
        const rooms = await getExamRooms();
        const room = rooms.find((r: any) => r.id === schedule.roomId);
        if (room) {
          setStudents(room.students.map((s: any) => ({
            ...s, attendance: 'H' // Default Hadir
          })));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    } else {
      await Promise.all([
        fetchStudentsForClass(schedule.className),
        fetchLastSession(schedule.className, schedule.subject)
      ]);
    }
  };

  const fetchLastSession = async (className: string, subject: string) => {
    try {
      const res = await (await import('../../domains/teacher/services')).getLastSessionResult(profile!.uid, className, subject);
      if (res.isSuccess && res.getValue()) {
        const lastLog = res.getValue();
        const lastPertemuan = Number(lastLog.pertemuan) || 0;
        setPertemuan(String(lastPertemuan + 1));
        setLastSessionInfo({
          pertemuan: lastPertemuan,
          materi: lastLog.materi || '-'
        });
        setShowReminder(true);
      } else {
        setPertemuan('1');
        setLastSessionInfo(null);
      }
    } catch (error) {
      console.error("Error fetching last session:", error);
      setPertemuan('1');
      setLastSessionInfo(null);
    }
  };

  const fetchStudentsForClass = async (className: string) => {
    setLoading(true);
    try {
      const res = await (await import('../../domains/teacher/services')).getStudentsByClassResult(className);
      const data = res.isSuccess ? res.getValue().map((u: any) => ({ ...u, uid: u.id, status: 'H' })) : [];
      setStudents(data);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const setStudentStatus = (id: string, newStatus: string) => {
    setStudents(students.map(s => s.uid === id ? { ...s, status: newStatus } : s));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setStatus('idle');
    try {
      const hadirCount = students.filter(s => s.status === 'H').length;
      const terlambatCount = students.filter(s => s.status === 'T').length;
      const sakitCount = students.filter(s => s.status === 'S').length;
      const izinCount = students.filter(s => s.status === 'I').length;
      const alfaCount = students.filter(s => s.status === 'A').length;

      const calculatePoints = (status: string) => {
        switch (status) {
          case 'H': return 4;
          case 'T': return 3;
          case 'S': return 2;
          case 'I': return 1;
          case 'A': return 0;
          default: return 0;
        }
      };

      const studentsToUpdate = students.map(s => ({
         uid: s.uid,
         pointsToAdd: calculatePoints(s.status),
         points: s.points || 0
      })).filter(s => s.pointsToAdd > 0);

      const log = {
        teacherId: profile.uid,
        teacherName: profile.name,
        className: selectedClass,
        subject: selectedSubject,
        pertemuan: Number(pertemuan),
        materi: materi,
        tanggal: tanggal,
        stats: {
          hadir: hadirCount,
          terlambat: terlambatCount,
          sakit: sakitCount,
          izin: izinCount,
          alfa: alfaCount
        }
      };
      
      const res = await submitStudentAttendanceResult({ log, studentsToUpdate });
      if (res.isFailure) throw new Error(res.getError());

      // Refetch last session info immediately to update state
      await fetchLastSession(selectedClass, selectedSubject);

      const now = new Date();
      const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const [year, month, day] = tanggal.split('-');
      const formattedDateTime = `${day}/${month}/${year} ${timeString}`;

      let rekapAbsensi = `✅ Hadir: ${hadirCount}`;
      if (terlambatCount > 0) rekapAbsensi += `\n🕒 Terlambat: ${terlambatCount}`;
      if (sakitCount > 0) rekapAbsensi += `\n🤒 Sakit: ${sakitCount}`;
      if (izinCount > 0) rekapAbsensi += `\n💌 Izin: ${izinCount}`;
      if (alfaCount > 0) rekapAbsensi += `\n❌ Alfa: ${alfaCount}`;

      const reportMessage = `*LAPORAN AKTIVITAS GURU*
📁 Kelas: ${selectedClass} (${selectedSubject})
📅 ${formattedDateTime}
📚 Pertemuan ke: ${pertemuan}
📝 Materi: ${materi || '-'}

*Rekap Absensi:*
${rekapAbsensi}

Sistem Administrasi Sekolah 🚀`;

      const response = await fetch('/api/send-wa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: reportMessage,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error(error);
      setStatus('error');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  if (!isClassSelected && !loading) {
    return (
      <div className="bg-gray-50 p-10 rounded-2xl border border-gray-200 text-center">
        <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-800 mb-2">Tidak Ada Jadwal Mengajar</h3>
        <p className="text-gray-500">Anda tidak memiliki jadwal mengajar pada hari ini berdasarkan kurikulum sistem.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold text-gray-900">Absensi Kelas (Otomatis)</h3>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 p-5 rounded-xl shadow-sm mb-6">
        <h3 className="text-lg font-bold text-indigo-900 flex items-center mb-2">
          <Clock className="w-5 h-5 mr-2" />
          Jadwal Mengajar Anda Hari Ini
        </h3>
        <p className="text-sm text-indigo-800 mb-4">
          Sistem otomatis mengarahkan Anda ke kelas yang sesuai dengan jadwal kurikulum.
        </p>
        
        {todaySchedules.length > 1 ? (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <select 
              value={selectedScheduleId}
              onChange={(e) => {
                const schedule = todaySchedules.find(s => s.id === e.target.value);
                if (schedule) handleScheduleSelect(schedule, e.target.value);
              }}
              className="border border-indigo-300 rounded-lg px-4 py-2 outline-none focus:border-indigo-500 w-full sm:w-auto bg-white font-medium text-gray-700 shadow-sm"
            >
              {todaySchedules.map((s, idx) => (
                <option key={s.id} value={s.id}>Jam ke-{s.periodIndex + 1}: {s.className} - {s.subject}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="bg-white px-4 py-3 rounded-lg border border-indigo-100 inline-block">
            <span className="font-semibold text-gray-800">Kelas: {selectedClass}</span>
            <span className="mx-2 text-gray-300">|</span>
            <span className="text-gray-600">{selectedSubject}</span>
          </div>
        )}
      </div>

      {showReminder && isClassSelected && lastSessionInfo && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg mb-6 text-sm flex items-start shadow-sm relative pr-10 animate-fade-in">
          <div className="mr-3 mt-0.5"><AlertCircle className="w-5 h-5 text-blue-600" /></div>
          <div>
            <span className="font-semibold block mb-1">Riwayat Pertemuan Terakhir</span>
            Sistem mendeteksi bahwa kelas ini telah Anda ajar sebelumnya hingga <span className="font-bold">Pertemuan ke-{lastSessionInfo.pertemuan}</span>.
            <br />
            Materi terakhir: <span className="italic font-medium">{lastSessionInfo.materi}</span>
            <br />
            <span className="text-blue-600 font-medium mt-1 inline-block">Sistem otomatis menyiapkan sesi ini sebagai Pertemuan ke-{pertemuan}.</span>
          </div>
          <button 
            onClick={() => setShowReminder(false)}
            className="absolute top-4 right-4 text-blue-400 hover:text-blue-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {isClassSelected ? (
        <>
          <div className="flex flex-col md:flex-row gap-4">
        {isExamMode ? (
          <>
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-semibold text-gray-700">Tanggal Ujian</label>
              <input 
                type="date" 
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 w-full sm:w-auto bg-gray-50" 
                readOnly
              />
            </div>
            <div className="flex-1 flex flex-col space-y-2">
              <label className="text-sm font-semibold text-gray-700">Catatan Berita Acara Ujian</label>
              <input 
                type="text" 
                placeholder="Tulis catatan ujian (contoh: Semua peserta hadir dan tertib)..." 
                value={materi}
                onChange={(e) => setMateri(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-red-500"
              />
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-semibold text-gray-700">Pertemuan Ke:</label>
              <input 
                type="number"
                min="1"
                value={pertemuan}
                onChange={(e) => setPertemuan(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 w-full sm:w-32 bg-gray-50 font-semibold"
                readOnly
              />
              <span className="text-xs text-gray-500">Otomatis dari sistem</span>
            </div>
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-semibold text-gray-700">Tanggal</label>
              <input 
                type="date" 
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 w-full sm:w-auto" 
              />
            </div>
            <div className="flex-1 flex flex-col space-y-2">
              <div className="flex items-center mt-7">
                <span className="bg-blue-600 text-white px-3 py-2 rounded-l-lg font-medium text-sm">MATERI</span>
                <input 
                  type="text" 
                  placeholder="Tulis Topik / Materi Pembelajaran Hari Ini..." 
                  value={materi}
                  onChange={(e) => setMateri(e.target.value)}
                  className="flex-1 border border-gray-300 border-l-0 rounded-r-lg px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      ) : students.length === 0 ? (
        <div className="bg-gray-50 p-8 rounded-xl border border-gray-200 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Belum ada data siswa terdaftar di sistem.</p>
          <p className="text-sm text-gray-400 mt-1">Grid kartu absensi akan muncul otomatis setelah siswa membuat akun.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-20">
          {students.map(student => (
            <div key={student.uid} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white hover:shadow-md transition-shadow flex flex-col">
              <div className={`h-32 bg-gray-200 relative ${student.status === 'H' ? 'bg-blue-600' : 'bg-gray-200'}`}>
                {student.photoUrl ? (
                  <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover object-top mix-blend-multiply" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                    <Users className="w-12 h-12 opacity-50" />
                  </div>
                )}
              </div>
              <div className="p-3 text-center border-b border-gray-100 flex-1">
                <h4 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{student.name}</h4>
                <p className="text-xs text-gray-500 mt-1">{student.nis || '-'}</p>
              </div>
              
              <div className="flex divide-x divide-gray-100 border-t border-gray-100">
                {[
                  { id: 'H', label: 'Hadir', color: 'bg-green-100 text-green-700', active: 'bg-green-500 text-white' },
                  { id: 'T', label: 'Telat', color: 'bg-yellow-100 text-yellow-700', active: 'bg-yellow-500 text-white' },
                  { id: 'I', label: 'Izin', color: 'bg-blue-100 text-blue-700', active: 'bg-blue-500 text-white' },
                  { id: 'S', label: 'Sakit', color: 'bg-purple-100 text-purple-700', active: 'bg-purple-500 text-white' },
                  { id: 'A', label: 'Alfa', color: 'bg-red-100 text-red-700', active: 'bg-red-500 text-white' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStudentStatus(student.uid, s.id)}
                    className={`flex-1 py-2 text-xs font-bold transition-colors ${
                      student.status === s.id ? s.active : `text-gray-400 hover:${s.color}`
                    }`}
                  >
                    {s.id}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {students.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="hidden sm:block text-sm font-medium text-gray-500">
              <span className="text-green-600 font-bold">{students.filter(s => s.status === 'H').length}</span> Hadir | 
              <span className="text-yellow-600 font-bold ml-2">{students.filter(s => s.status === 'T').length}</span> Terlambat | 
              <span className="text-purple-600 font-bold ml-2">{students.filter(s => s.status === 'S').length}</span> Sakit | 
              <span className="text-blue-600 font-bold ml-2">{students.filter(s => s.status === 'I').length}</span> Izin | 
              <span className="text-red-600 font-bold ml-2">{students.filter(s => s.status === 'A').length}</span> Alfa
            </div>
            
            <div className="flex w-full sm:w-auto items-center space-x-3">
              {status === 'success' && <span className="text-green-600 font-medium text-sm flex items-center"><CheckSquare className="w-4 h-4 mr-1"/>Tersimpan</span>}
              {status === 'error' && <span className="text-red-600 font-medium text-sm">Gagal Menyimpan</span>}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`flex-1 sm:flex-none flex items-center justify-center px-6 py-2.5 rounded-xl text-white font-medium shadow-sm transition-all ${
                  isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow active:scale-95'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Memproses...
                  </>
                ) : (
                  <>
                    Simpan & Update
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      ) : null}
    </div>
  );
}
function MateriPanel({ profile }: any) {
  const { isVirtualMode, vSchedules } = useVirtualMode();
  const [showForm, setShowForm] = useState(false);
  const [documents, setDocuments] = useState<{ pertemuan: string, jenis: string, judul: string, link: string, fileName?: string, fileUrl?: string, id: string, teacherId?: string, className?: string, subject?: string }[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [pertemuan, setPertemuan] = useState('1');
  const [jenis, setJenis] = useState('RPP');
  const [judul, setJudul] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [link, setLink] = useState(''); // Keep for existing docs
  
  // New states for Class & Subject
  const [teacherSchedules, setTeacherSchedules] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');




  const [selectedSubject, setSelectedSubject] = useState('');
  
  // Filter state
  const [filterClass, setFilterClass] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!profile?.uid) return;
    const fetchSchedulesAndDocs = async () => {
      try {
        // Fetch schedules
        let scheds: any[] = [];
        if (isVirtualMode) {
          scheds = vSchedules.filter(s => s.teacherId === profile.uid);
        } else {
          const res = await getTeacherSchedulesResult(profile.uid);
          if (res.isSuccess) scheds = res.getValue();
        }
        setTeacherSchedules(scheds);
        
        // Fetch docs
        const res = await getTeacherDocumentsResult(profile.uid);
        if (res.isSuccess) {
           setDocuments(res.getValue().sort((a: any, b: any) => parseInt(a.pertemuan || '0') - parseInt(b.pertemuan || '0')));
        }
      } catch(e) {
        console.error("Error fetching docs", e);
      }
    };
    fetchSchedulesAndDocs();
  }, [profile?.uid]);

  const uniqueClasses = Array.from(new Set(teacherSchedules.map(s => s.className)));
  
  const handleClassChange = (cls: string) => {
    setSelectedClass(cls);
    const subjectsForClass = Array.from(new Set(teacherSchedules.filter(s => s.className === cls).map(s => s.subject)));
    if (subjectsForClass.length > 0) {
      setSelectedSubject(subjectsForClass[0] as string);
    } else {
      setSelectedSubject('');
    }
  };

  const googleLogin = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/drive.file',
    onSuccess: async (tokenResponse) => {
      alert("Autentikasi berhasil! Mulai mengupload file...");
      if (!selectedFile) {
        setIsUploading(false);
        return;
      }
      
      try {
        const metadata = {
          name: `${jenis}_${selectedClass}_${selectedSubject}_${judul}_${pertemuan}`,
          mimeType: selectedFile.type || 'application/octet-stream',
          parents: ['1LJR1OmBS-aezK6DZqRUU2ftByjecsWV6']
        };

        const metaRes = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metadata)
        });
        
        const metaData = await metaRes.json();
        
        if (metaData.error) {
          console.error("Drive API Error (Metadata):", metaData.error);
          alert(`Error membuat file (metadata): ${metaData.error.message}`);
          setIsUploading(false);
          return;
        }

        const fileId = metaData.id;

        const uploadRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
            'Content-Type': selectedFile.type || 'application/octet-stream',
          },
          body: selectedFile
        });
        
        const uploadData = await uploadRes.json();
        if (uploadData.error) {
          console.error("Drive API Error (Upload):", uploadData.error);
          alert(`Error mengupload konten file: ${uploadData.error.message}`);
          setIsUploading(false);
          return;
        }

        const getRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,webViewLink`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
          }
        });
        const getData = await getRes.json();

        // Make file public
        await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role: 'reader',
            type: 'anyone'
          })
        });
        
        const newDoc = { 
          id: editingId || Date.now().toString(), 
          teacherId: profile?.uid || '',
          pertemuan, 
          jenis, 
          judul, 
          link: getData.webViewLink,
          fileName: selectedFile.name,
          fileUrl: getData.webViewLink,
          className: selectedClass,
          subject: selectedSubject
        };

        const res = await saveTeacherDocumentResult(newDoc);
        if (res.isFailure) throw new Error(res.getError());

        if (editingId) {
          setDocuments(documents.map(d => d.id === editingId ? newDoc : d).sort((a, b) => parseInt(a.pertemuan) - parseInt(b.pertemuan)));
        } else {
          setDocuments([...documents, newDoc].sort((a, b) => parseInt(a.pertemuan) - parseInt(b.pertemuan)));
        }
        
        alert("Upload sukses!");
        resetForm();
      } catch (error: any) {
        console.error("Error uploading document:", error);
        if (error?.message?.includes("permissions") || error?.code === "permission-denied") {
          alert(`Gagal menyimpan ke database Firestore. Detail: ${error?.message}`);
        } else {
          alert(`Gagal upload ke Google Drive. Detail: ${error?.message || JSON.stringify(error)}`);
        }
      } finally {
        setIsUploading(false);
      }
    },
    onError: (error) => {
      setIsUploading(false);
      alert(`Gagal autentikasi dengan Google Drive. Detail: ${JSON.stringify(error)}`);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !selectedSubject) {
      alert("Pilih Kelas dan Mata Pelajaran terlebih dahulu!");
      return;
    }
    
    if (judul.trim()) {
      if (selectedFile) {
        setIsUploading(true);
        googleLogin();
      } else if (editingId && link) {
        // Just updating the details without changing file
        setIsUploading(true);
        try {
          const newDoc = {
            id: editingId,
            teacherId: profile?.uid || '',
            pertemuan,
            jenis,
            judul,
            link: link,
            fileName: documents.find(d => d.id === editingId)?.fileName,
            fileUrl: documents.find(d => d.id === editingId)?.fileUrl,
            className: selectedClass,
            subject: selectedSubject
          };
          
          const res = await saveTeacherDocumentResult(newDoc);
        if (res.isFailure) throw new Error(res.getError());

          setDocuments(documents.map(d => d.id === editingId ? newDoc : d).sort((a, b) => parseInt(a.pertemuan) - parseInt(b.pertemuan)));
          alert("Perubahan berhasil disimpan!");
          resetForm();
        } catch(err: any) {
          console.error(err);
          alert("Gagal menyimpan perubahan ke database.");
        } finally {
          setIsUploading(false);
        }
      } else {
        alert("Pilih file terlebih dahulu");
      }
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setJudul('');
    setLink('');
    setSelectedFile(null);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEdit = (doc: any) => {
    setEditingId(doc.id);
    setPertemuan(doc.pertemuan);
    setJenis(doc.jenis);
    setJudul(doc.judul);
    setLink(doc.link);
    setSelectedClass(doc.className || '');
    setSelectedSubject(doc.subject || '');
    setSelectedFile(null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus dokumen ini?")) {
      try {
        const res = await deleteTeacherDocumentResult(id);
        if (res.isFailure) throw new Error(res.getError());
        setDocuments(documents.filter(d => d.id !== id));
      } catch(e) {
        console.error(e);
        alert("Gagal menghapus dokumen dari database");
      }
    }
  };

  const filteredDocs = filterClass ? documents.filter(d => d.className === filterClass) : documents;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-900">Materi, RPP & LKPD</h3>
        <button 
          onClick={() => {
            if (showForm) resetForm();
            else {
              if (uniqueClasses.length > 0 && !selectedClass) {
                handleClassChange(uniqueClasses[0] as string);
              }
              setShowForm(true);
            }
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {showForm ? 'Batal' : 'Upload Dokumen'}
        </button>
      </div>
      
      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6 animate-fade-in">
          <h4 className="font-bold text-gray-900 mb-4">
            {editingId ? 'Edit Dokumen Pembelajaran' : 'Upload Dokumen Pembelajaran'}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1">
                <label className="text-sm font-semibold text-gray-700">Pilih Kelas:</label>
                <select 
                  value={selectedClass}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                  required
                >
                  <option value="" disabled>-- Pilih Kelas --</option>
                  {uniqueClasses.map(cls => (
                    <option key={cls as string} value={cls as string}>{cls as React.ReactNode}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-sm font-semibold text-gray-700">Mata Pelajaran:</label>
                <select 
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                  required
                >
                  <option value="" disabled>-- Pilih Mapel --</option>
                  {Array.from(new Set(teacherSchedules.filter(s => s.className === selectedClass).map(s => s.subject))).map(sub => (
                    <option key={sub as string} value={sub as string}>{sub as React.ReactNode}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1">
                <label className="text-sm font-semibold text-gray-700">Pertemuan Ke:</label>
                <input 
                  type="number" 
                  min="1" 
                  value={pertemuan} 
                  onChange={(e) => setPertemuan(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-sm font-semibold text-gray-700">Jenis Dokumen:</label>
                <select 
                  value={jenis} 
                  onChange={(e) => setJenis(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                >
                  <option value="RPP">RPP (Modul Ajar)</option>
                  <option value="LKPD">LKPD (Lembar Kerja)</option>
                  <option value="Materi">Materi Tambahan (Slide/PDF)</option>
                </select>
              </div>
            </div>
            
            <div className="flex flex-col space-y-1">
              <label className="text-sm font-semibold text-gray-700">Judul Topik / Dokumen:</label>
              <input 
                type="text" 
                value={judul} 
                onChange={(e) => setJudul(e.target.value)}
                placeholder="Contoh: Modul Ajar Fisika Bab 2: Dinamika Gerak"
                className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="flex flex-col space-y-1 pt-2">
              <label className="text-sm font-semibold text-gray-700">Pilih File (PDF/Doc/Materi):</label>
              <input 
                type="file" 
                ref={fileInputRef}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedFile(file);
                  } else {
                    setSelectedFile(null);
                  }
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                required={!editingId}
              />
              {editingId && !selectedFile && <span className="text-xs text-gray-500 mt-1">Biarkan kosong jika tidak ingin mengubah file saat ini.</span>}
              <p className="text-xs text-gray-500 mt-1">💡 File akan otomatis di-upload ke Google Drive Sekolah.</p>
            </div>
            
            <div className="flex justify-end pt-2 space-x-3">
              <button 
                type="button" 
                onClick={resetForm}
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                disabled={isUploading}
              >
                Batal
              </button>
              <button 
                type="submit" 
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center"
                disabled={isUploading}
              >
                {isUploading ? (
                  <span className="flex items-center">
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Mengupload...
                  </span>
                ) : (
                  editingId && !selectedFile ? 'Simpan Perubahan' : 'Upload & Simpan'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {documents.length > 0 ? (
        <div className="space-y-4">
          <div className="flex justify-end">
             <select 
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-sm bg-white"
              >
                <option value="">Semua Kelas</option>
                {uniqueClasses.map(cls => (
                  <option key={cls as string} value={cls as string}>Filter: Kelas {cls as React.ReactNode}</option>
                ))}
              </select>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-semibold text-gray-600">Kelas / Mapel</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Pertemuan</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Jenis & Judul</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">File</th>
                  <th className="px-6 py-3 font-semibold text-gray-600 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{doc.className || '-'}</div>
                      <div className="text-xs text-gray-500">{doc.subject || '-'}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">Ke-{doc.pertemuan}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{doc.jenis}</div>
                      <div className="text-gray-500">{doc.judul}</div>
                    </td>
                    <td className="px-6 py-4">
                      <a 
                        href={doc.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center underline"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Buka
                      </a>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button onClick={() => handleEdit(doc)} className="text-gray-400 hover:text-blue-600">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(doc.id)} className="text-gray-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 border-dashed rounded-xl p-8 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h4 className="text-gray-900 font-medium mb-1">Belum ada dokumen ${filterClass ? `untuk Kelas ${filterClass}` : ''}</h4>
          <p className="text-gray-500 text-sm">Upload RPP, LKPD, atau materi tambahan untuk diarsipkan</p>
        </div>
      )}
    </div>
  );
}
function NilaiPanel({ profile, frozen }: any) {
  const { isVirtualMode, vSchedules } = useVirtualMode();
  const [jenis, setJenis] = useState('Formatif');
  const [ke, setKe] = useState('1');
  
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [examAlerts, setExamAlerts] = useState<any[]>([]);
  const [lockedExams, setLockedExams] = useState<any>({});
  const [isFinalizing, setIsFinalizing] = useState(false);

  React.useEffect(() => {
    if (!profile?.uid) return;
    const fetchTeacherClasses = async () => {
      try {
        let scheds: any[] = [];
        if (isVirtualMode) {
          scheds = vSchedules.filter(s => s.teacherId === profile.uid);
        } else {
          const res = await getTeacherSchedulesResult(profile.uid);
          if (res.isSuccess) scheds = res.getValue();
        }
        const uniqueClasses = Array.from(new Set(scheds.map(s => s.className))) as string[];
        setClasses(uniqueClasses);
        if (uniqueClasses.length > 0) {
          setSelectedClass(uniqueClasses[0]);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchTeacherClasses();
  }, [profile?.uid]);

  React.useEffect(() => {
    if (!selectedClass) return;
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const res = await (await import('../../domains/teacher/services')).getStudentsByClassResult(selectedClass);
        const data = res.isSuccess ? res.getValue().map((u: any) => ({ ...u, score: null, isEditing: false })) : [];
        setGrades(data);
      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [selectedClass]);

  React.useEffect(() => {
    if (!profile?.uid) return;
    const checkExams = async () => {
      try {
        const examsRes = await getExamSchedules();
        const assessmentsRes = await getAssessments();
        const assessments = assessmentsRes.isSuccess ? assessmentsRes.getValue() : [];
        
        let scheds: any[] = [];
        if (isVirtualMode) {
          scheds = vSchedules.filter((s:any) => s.teacherId === profile.uid);
        } else {
          const res = await getTeacherSchedulesResult(profile.uid);
          if (res.isSuccess) scheds = res.getValue();
        }

        const teacherSubjects = Array.from(new Set(scheds.map(s => s.subject)));
        
        // Find published exams for subjects taught by this teacher
        const relevantExams = examsRes.filter((ex: any) => 
          ex.status === 'published' && teacherSubjects.includes(ex.subject)
        );

        const alerts: any[] = [];
        const locked: any = {};
        
        for (const ex of relevantExams) {
          const examDate = new Date(ex.date);
          const today = new Date();
          
          if (examDate <= today) {
            // Find which classes the teacher teaches for this subject
            const subjectClasses = scheds.filter(s => s.subject === ex.subject).map(s => s.className);
            const uniqueSubjClasses = Array.from(new Set(subjectClasses));
            
            for (const cls of uniqueSubjClasses) {
              // Check if assessment already exists and is locked
              const existingAss = assessments.find((a: any) => 
                a.subject === ex.subject && a.className === cls && a.date === ex.date && a.type === 'Ujian'
              );
              
              if (existingAss) {
                locked[`${ex.subject}-${cls}`] = true;
              } else {
                alerts.push({
                  id: ex.id,
                  subject: ex.subject,
                  className: cls,
                  date: ex.date,
                  daysLeft: 3 // hardcoded for display
                });
              }
            }
          }
        }
        setExamAlerts(alerts);
        setLockedExams(locked);
      } catch (e) {
        console.error("Error checking exams:", e);
      }
    };
    checkExams();
  }, [profile?.uid, isVirtualMode]);


  const handleFinalizeGrades = async () => {
    if (!selectedClass || !jenis) return;
    
    // Require confirmation
    if (!confirm("Peringatan: Finalisasi akan MENGUNCI nilai secara permanen. Anda tidak dapat mengubahnya lagi tanpa izin Kurikulum. Lanjutkan?")) return;
    
    setIsFinalizing(true);
    try {
      const assessmentData = {
        className: selectedClass,
        subject: grades.length > 0 ? jenis : 'Mata Pelajaran', // Realistically needs correct subject mapping
        teacherId: profile.uid,
        title: `Nilai ${jenis} ${ke}`,
        type: jenis.includes('Sumatif') ? 'Ujian' : 'Harian',
        date: new Date().toISOString().split('T')[0]
      };
      
      const savedAssRes = await saveAssessment(assessmentData as any);
      if (savedAssRes.isSuccess) {
        const savedAss = savedAssRes.getValue();
        for (const g of grades) {
          if (g.score !== null) {
            await saveGrade({
              studentId: g.uid,
              studentName: g.name,
              assessmentId: savedAss.id!,
              score: g.score
            } as any);
          }
        }
        
        // Update local locked state
        setLockedExams((prev: any) => ({...prev, [`${assessmentData.subject}-${selectedClass}`]: true}));
        
        // Remove from alerts
        setExamAlerts(prev => prev.filter(a => !(a.subject === assessmentData.subject && a.className === selectedClass)));
        
        alert("Finalisasi berhasil! Nilai telah dikunci dan diserahkan ke sistem Kurikulum.");
      }
    } catch(e) {
      console.error(e);
      alert("Terjadi kesalahan saat memfinalisasi nilai.");
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleEdit = (id: string) => {
    setGrades(grades.map(g => g.uid === id ? { ...g, isEditing: true } : g));
  };

  const handleSave = (id: string, newScore: number | null) => {
    setGrades(grades.map(g => g.uid === id ? { ...g, score: newScore, isEditing: false } : g));
  };

  const handleDelete = (id: string) => {
    setGrades(grades.map(g => g.uid === id ? { ...g, score: null, isEditing: false } : g));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">

      {examAlerts.length > 0 && (
        <div className="mb-6 space-y-3">
          {examAlerts.map((alert, idx) => (
            <div key={idx} className="flex items-start gap-3 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl shadow-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-bold">Peringatan Input Nilai Ujian</p>
                <p>Nilai ujian <strong>{alert.subject}</strong> untuk <strong>Kelas {alert.className}</strong> belum diisi/difinalisasi. Ujian telah dilaksanakan pada {alert.date}.</p>
              </div>
              <div className="text-xs font-bold bg-red-100 px-3 py-1.5 rounded-lg border border-red-200">
                Tenggat: {alert.daysLeft} Hari Lagi
              </div>
            </div>
          ))}
        </div>
      )}

        <h3 className="text-lg font-bold text-gray-900">Input Nilai Siswa</h3>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <select 
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="border border-gray-300 rounded-lg text-sm px-3 py-2 bg-white outline-none focus:border-blue-500 font-medium text-gray-700"
          >
            {classes.map(cls => <option key={cls} value={cls}>Kelas {cls}</option>)}
          </select>
          <select 
            value={jenis}
            onChange={(e) => setJenis(e.target.value)}
            className="border border-gray-300 rounded-lg text-sm px-3 py-2 bg-white outline-none focus:border-blue-500 font-medium text-gray-700"
          >
            <option value="Formatif">Formatif (Tugas / Observasi)</option>
            <option value="Sumatif Lingkup Materi">Sumatif Lingkup (Ulangan Harian)</option>
            <option value="Sumatif Tengah Semester">Sumatif Tengah Semester (STS)</option>
            <option value="Sumatif Akhir Semester">Sumatif Akhir Semester (SAS)</option>
            <option value="Proyek P5">Proyek P5</option>
          </select>
          <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg px-3 py-1.5 focus-within:border-blue-500">
            <span className="text-sm font-medium text-gray-600">Sesi ke:</span>
            <input 
              type="number" 
              min="1" 
              value={ke} 
              onChange={(e) => setKe(e.target.value)} 
              className="text-sm w-12 outline-none font-semibold text-gray-900" 
            />
          </div>
          <button 
            onClick={() => exportToCSV(grades.map(g => ({
              'UID': g.uid,
              'Nama Siswa': g.name,
              'NISN': g.nisn || '-',
              'Jenis Penilaian': jenis,
              'Sesi': ke,
              'Nilai': g.score || 'Belum Dinilai'
            })), `Nilai_${jenis}_Sesi${ke}_Kelas_${selectedClass}`)}
            disabled={grades.length === 0}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-emerald-700 transition-colors flex items-center"
            title="Download CSV Nilai"
          >
            <FileDown className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Ekspor CSV</span>
            <span className="sm:hidden">CSV</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center">
            <Award className="w-4 h-4 mr-2 text-blue-600" />
            Merekap: {jenis} {ke && `- Sesi ${ke}`}
          </h4>
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">Download Format Excel</button>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
            </div>
          ) : grades.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Belum ada data siswa terdaftar di sistem.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nama Siswa</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Nilai</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-48">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {grades.map(grade => (
                  <tr key={grade.uid} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{grade.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {grade.isEditing ? (
                        <input 
                          type="number" 
                          defaultValue={grade.score ?? ''} 
                          id={`score-input-${grade.uid}`}
                          className="border border-blue-500 ring-2 ring-blue-100 rounded px-3 py-1.5 w-20 outline-none text-center font-semibold text-gray-900" 
                          autoFocus
                        />
                      ) : (
                        <span className={`font-bold inline-block px-3 py-1 rounded ${grade.score !== null ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>
                          {grade.score !== null ? grade.score : '-'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {grade.isEditing ? (
                        <div className="flex justify-end space-x-3">
                          <button 
                            onClick={() => {
                              const input = document.getElementById(`score-input-${grade.uid}`) as HTMLInputElement;
                              const val = input.value === '' ? null : Number(input.value);
                              handleSave(grade.uid, val);
                            }} 
                            className="text-green-600 hover:text-green-800 font-bold bg-green-50 px-3 py-1 rounded"
                          >
                            Simpan
                          </button>
                          <button 
                            onClick={() => setGrades(grades.map(g => g.uid === grade.uid ? { ...g, isEditing: false } : g))} 
                            className="text-gray-500 hover:text-gray-700 font-medium px-3 py-1"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end space-x-3">
                          <button 
                            onClick={() => handleEdit(grade.uid)} 
                            className="text-blue-600 hover:text-blue-800 font-medium bg-blue-50 px-3 py-1 rounded transition-colors"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDelete(grade.uid)} 
                            className="text-red-600 hover:text-red-800 font-medium bg-red-50 px-3 py-1 rounded transition-colors"
                          >
                            Hapus
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          )}
        </div>
        
        {/* FINALIZATION BUTTON */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            Pastikan semua nilai sudah terisi sebelum finalisasi.
          </div>
          <button
            onClick={handleFinalizeGrades}
            disabled={isFinalizing || grades.some((g:any) => g.score === null) || grades.length === 0}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold transition-colors ${
              grades.some((g:any) => g.score === null) || grades.length === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
            }`}
          >
            {isFinalizing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <CheckSquare className="w-5 h-5" />
            )}
            <span>Finalisasi & Kirim Nilai</span>
          </button>
        </div>

      </div>
    </div>

  );
}

function CatatanPanel() {
  const [showForm, setShowForm] = useState(false);
  const [catatanList, setCatatanList] = useState<{id: number|string, name: string, text: string, date: string}[]>([]);
  const [newName, setNewName] = useState('');
  const [newCatatan, setNewCatatan] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if(newName.trim() && newCatatan.trim()) {
      setCatatanList([{
        id: Date.now(),
        name: newName,
        text: newCatatan,
        date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      }, ...catatanList]);
      setNewName('');
      setNewCatatan('');
      setShowForm(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-900">Catatan Khusus Siswa</h3>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {showForm ? 'Batal' : 'Tambah Catatan'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm mb-6">
          <h4 className="font-bold text-gray-900 mb-4">Buat Catatan Baru</h4>
          <div className="space-y-4">
            <div className="flex flex-col space-y-1">
              <label className="text-sm font-semibold text-gray-700">Nama Siswa</label>
              <input 
                type="text" 
                value={newName} 
                onChange={e => setNewName(e.target.value)}
                placeholder="Cari nama siswa..."
                className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                required 
              />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-sm font-semibold text-gray-700">Catatan/Evaluasi</label>
              <textarea 
                value={newCatatan} 
                onChange={e => setNewCatatan(e.target.value)}
                placeholder="Tuliskan catatan khusus atau perkembangan siswa..."
                className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 h-24 resize-none"
                required 
              />
            </div>
            <div className="flex justify-end pt-2">
              <button 
                type="submit" 
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Simpan & Kirim
              </button>
            </div>
          </div>
        </form>
      )}

      {catatanList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {catatanList.map(cat => (
            <div key={cat.id} className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm flex items-start space-x-4">
              <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">{cat.name}</h4>
                <p className="text-gray-600 text-sm mt-1">{cat.text}</p>
                <span className="text-xs text-gray-400 mt-2 block">{cat.date}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 p-8 rounded-xl border border-gray-200 text-center">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Belum ada catatan khusus.</p>
          <p className="text-sm text-gray-400 mt-1">Catatan ini bisa dikirim sebagai notifikasi ke WhatsApp orang tua.</p>
        </div>
      )}
    </div>
  );
}

