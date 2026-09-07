import React, { useState, useEffect } from 'react';
import { Calendar, Save, X, Clock, BookOpen, Settings, Plus, FileText, Trash2, CheckCircle2, AlertCircle, CalendarDays, RefreshCw, Edit, Edit2, UserCircle, Upload, Image as ImageIcon, FileDown } from 'lucide-react';
import { 
  getMasterCurriculumConfig, updateMasterCurriculumConfig,
  getAcademicCalendar, updateAcademicCalendar,
  replaceAllSchedules, getUsersByRoles, getStudents,
  createUser, updateUser, updateUserClassName, getSchedules
} from '../../domains/academic/services';
import { useVirtualMode } from '../../contexts/VirtualModeContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePeriod } from '../../contexts/PeriodContext';
import { getCurriculumConfig, updateCurriculumConfig } from '../../domains/academic/services';
import { generateSchedule } from '../../lib/scheduleGenerator';
import ExamManagementPanel from './ExamManagementPanel';
import ScheduleRolloverPanel from './ScheduleRolloverPanel';
import { exportToCSV } from '../../lib/exportUtils';

interface Teacher {
  uid: string;
  name: string;
  maxHours: number;
  timeOff: string[]; // Format: "dayIndex-periodIndex" e.g., "0-1" (Senin jam ke 1)
}

interface TeachingLoad {
  id: string;
  className: string;
  subject: string;
  teacherId: string;
  hours: number;
}

export default function CurriculumDashboard() {
  const { profile, activeRole } = useAuth();
  const { viewingYear, viewingSemester, isReadOnly } = usePeriod();
  const activeYearId = viewingYear?.id || 'master';
  const { isVirtualMode: isTestingMode, vMaster, setVMaster, vUsers, setVUsers, vSchedules, setVSchedules } = useVirtualMode();

  const [activeTab, setActiveTab] = useState('waktu');
  
  // States Parameter Master
  const [daysPerWeek, setDaysPerWeek] = useState(6);
  const [periodsPerDay, setPeriodsPerDay] = useState(6);
  const [classes, setClasses] = useState<string[]>(['X', 'XI-IPA', 'XII-IPA', 'XI-IPS', 'XII-IPS']);
  const [homeroomTeachers, setHomeroomTeachers] = useState<{className: string; teacherId: string; teacherName: string;}[]>([]);
  const [piketTeachers, setPiketTeachers] = useState<{dayIndex: number; teacherId: string; teacherName: string;}[]>([]);

  // States Struktur Waktu
  const [startTime, setStartTime] = useState('07:00');
  const [periodDuration, setPeriodDuration] = useState(45);
  const [breakCount, setBreakCount] = useState(2);
  const [breakDuration, setBreakDuration] = useState(15);
  const [break1AfterPeriod, setBreak1AfterPeriod] = useState(4);
  const [break2AfterPeriod, setBreak2AfterPeriod] = useState(6);
  const [fridayStartTime, setFridayStartTime] = useState('07:00');
  const [fridayPeriodDuration, setFridayPeriodDuration] = useState(35);
  const [fridayBreakCount, setFridayBreakCount] = useState(2);
  const [fridayBreakDuration, setFridayBreakDuration] = useState(15);
  const [fridayBreak1AfterPeriod, setFridayBreak1AfterPeriod] = useState(4);
  const [fridayBreak2AfterPeriod, setFridayBreak2AfterPeriod] = useState(6);
  const [isTimeOffSubmissionOpen, setIsTimeOffSubmissionOpen] = useState(false);
  
  // States Guru
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);

  // States Beban Mengajar
  const [teachingLoads, setTeachingLoads] = useState<TeachingLoad[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        let data: any = null;
        if (isTestingMode && vMaster) {
          data = vMaster;
        } else {
          const res = await getCurriculumConfig(activeYearId);
          if (res.isSuccess && res.getValue()) {
            data = res.getValue();
          } else {
            const masterRes = await getMasterCurriculumConfig();
            if (masterRes.isSuccess && masterRes.getValue()) {
              data = masterRes.getValue();
            } else {
              const fallbackMaster = await getCurriculumConfig('master');
              if (fallbackMaster.isSuccess) data = fallbackMaster.getValue();
            }
          }
        }
        
        if (data) {
          if (data.daysPerWeek) setDaysPerWeek(data.daysPerWeek);
          if (data.periodsPerDay) setPeriodsPerDay(data.periodsPerDay);
          if (data.classes) setClasses(data.classes);
          if (data.homeroomTeachers) setHomeroomTeachers(data.homeroomTeachers);
          if (data.piketTeachers) setPiketTeachers(data.piketTeachers);
          if (data.teachingLoads) setTeachingLoads(data.teachingLoads);
          if (data.startTime) setStartTime(data.startTime);
          if (data.periodDuration) setPeriodDuration(data.periodDuration);
          if (data.breakCount) setBreakCount(data.breakCount);
          if (data.breakDuration) setBreakDuration(data.breakDuration);
          if (data.break1AfterPeriod) setBreak1AfterPeriod(data.break1AfterPeriod);
          if (data.break2AfterPeriod) setBreak2AfterPeriod(data.break2AfterPeriod);
          if (data.fridayStartTime) setFridayStartTime(data.fridayStartTime);
          if (data.fridayPeriodDuration) setFridayPeriodDuration(data.fridayPeriodDuration);
          if (data.fridayBreakCount !== undefined) setFridayBreakCount(data.fridayBreakCount);
          if (data.fridayBreakDuration !== undefined) setFridayBreakDuration(data.fridayBreakDuration);
          if (data.fridayBreak1AfterPeriod !== undefined) setFridayBreak1AfterPeriod(data.fridayBreak1AfterPeriod);
          if (data.fridayBreak2AfterPeriod !== undefined) setFridayBreak2AfterPeriod(data.fridayBreak2AfterPeriod);
          if (data.isTimeOffSubmissionOpen !== undefined) setIsTimeOffSubmissionOpen(data.isTimeOffSubmissionOpen);
        }
      } catch (error) {
        console.error("Error fetching master data", error);
      } finally {
        setLoadingData(false);
      }
    };
    fetchMasterData();
  }, []);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        let docs = [];
        if (isTestingMode) {
          docs = vUsers.filter(u => ['teacher', 'admin', 'super_admin', 'curriculum', 'tu'].includes(u.role)).map(u => ({ id: u.uid, data: () => u }));
        } else {
          const res = await getUsersByRoles(['teacher', 'admin', 'super_admin', 'curriculum', 'tu']);
          if (res.isSuccess) {
            docs = res.getValue().map(u => ({ id: u.uid || u.id, data: () => u }));
          } else {
            docs = [];
          }
        }
        
        const t = docs.map(doc => ({
          uid: doc.id,
          name: doc.data().name,
          maxHours: doc.data().maxHours || 24,
          timeOff: doc.data().timeOff || []
        }));
        setTeachers(t as Teacher[]);
      } catch (error) {
        console.error("Error fetching teachers", error);
      } finally {
        setLoadingTeachers(false);
      }
    };
    fetchTeachers();
  }, []);

  const updateMasterData = async (updates: any) => {
    if (updates.daysPerWeek !== undefined) setDaysPerWeek(updates.daysPerWeek);
    if (updates.periodsPerDay !== undefined) setPeriodsPerDay(updates.periodsPerDay);
    if (updates.classes !== undefined) setClasses(updates.classes);
    if (updates.homeroomTeachers !== undefined) setHomeroomTeachers(updates.homeroomTeachers);
    if (updates.piketTeachers !== undefined) setPiketTeachers(updates.piketTeachers);
    if (updates.teachingLoads !== undefined) setTeachingLoads(updates.teachingLoads);
    if (updates.startTime !== undefined) setStartTime(updates.startTime);
    if (updates.periodDuration !== undefined) setPeriodDuration(updates.periodDuration);
    if (updates.breakCount !== undefined) setBreakCount(updates.breakCount);
    if (updates.breakDuration !== undefined) setBreakDuration(updates.breakDuration);
    if (updates.break1AfterPeriod !== undefined) setBreak1AfterPeriod(updates.break1AfterPeriod);
    if (updates.break2AfterPeriod !== undefined) setBreak2AfterPeriod(updates.break2AfterPeriod);
    if (updates.fridayStartTime !== undefined) setFridayStartTime(updates.fridayStartTime);
    if (updates.fridayPeriodDuration !== undefined) setFridayPeriodDuration(updates.fridayPeriodDuration);
    if (updates.fridayBreakCount !== undefined) setFridayBreakCount(updates.fridayBreakCount);
    if (updates.fridayBreakDuration !== undefined) setFridayBreakDuration(updates.fridayBreakDuration);
    if (updates.fridayBreak1AfterPeriod !== undefined) setFridayBreak1AfterPeriod(updates.fridayBreak1AfterPeriod);
    if (updates.fridayBreak2AfterPeriod !== undefined) setFridayBreak2AfterPeriod(updates.fridayBreak2AfterPeriod);
    if (updates.isTimeOffSubmissionOpen !== undefined) setIsTimeOffSubmissionOpen(updates.isTimeOffSubmissionOpen);

    if (!isTestingMode) {
      try {
        const res = await updateMasterCurriculumConfig(updates);
        if (res.isFailure) throw new Error(res.getError());
      } catch (error) {
        console.error("Error updating master data", error);
      }
    }
  };

  const tabs = [
    { id: 'waktu', label: 'Struktur Waktu', icon: <Clock className="w-5 h-5" /> },
    { id: 'master', label: 'Parameter Kelas', icon: <CalendarDays className="w-5 h-5" /> },
    { id: 'kalender', label: 'Kalender Akademik', icon: <Calendar className="w-5 h-5" /> },
    { id: 'siswa', label: 'Manajemen Siswa', icon: <UserCircle className="w-5 h-5" /> },
    { id: 'guru', label: 'Ketersediaan Guru (Time-Off)', icon: <Clock className="w-5 h-5" /> },
    { id: 'beban', label: 'Beban Mengajar', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'otomatisasi', label: 'Otomatisasi Jadwal', icon: <Settings className="w-5 h-5" /> },
    { id: 'exam', label: 'Manajemen Ujian', icon: <FileText className="w-5 h-5" /> },
    { id: 'rollover', label: 'Rollover Jadwal', icon: <RefreshCw className="w-5 h-5" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Kurikulum</h2>
        <p className="text-gray-500 text-sm">Persiapkan parameter, data ketersediaan guru, dan beban mengajar untuk proses otomatisasi jadwal (Tanpa Data Mock).</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50/50'
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
          {activeTab === 'waktu' && (
            <StrukturWaktuPanel 
              startTime={startTime} periodDuration={periodDuration} breakCount={breakCount}
              breakDuration={breakDuration} break1AfterPeriod={break1AfterPeriod} break2AfterPeriod={break2AfterPeriod}
              fridayStartTime={fridayStartTime} fridayPeriodDuration={fridayPeriodDuration}
              fridayBreakCount={fridayBreakCount} fridayBreakDuration={fridayBreakDuration}
              fridayBreak1AfterPeriod={fridayBreak1AfterPeriod} fridayBreak2AfterPeriod={fridayBreak2AfterPeriod}
              piketTeachers={piketTeachers} teachers={teachers}
              updateMasterData={updateMasterData} loading={loadingData}
            />
          )}
          {activeTab === 'master' && (
            <ParameterMasterPanel 
              days={daysPerWeek} periods={periodsPerDay}
              classes={classes} homeroomTeachers={homeroomTeachers} piketTeachers={piketTeachers} teachers={teachers}
              updateMasterData={updateMasterData}
              loading={loadingData}
            />
          )}
          {activeTab === 'kalender' && <KalenderAkademikPanel />}
          {activeTab === 'siswa' && (
            <ManajemenSiswaPanel 
              classes={classes}
              isTestingMode={isTestingMode}
            />
          )}
          {activeTab === 'guru' && (
            <KetersediaanGuruPanel 
              teachers={teachers} setTeachers={setTeachers} 
              loading={loadingTeachers} 
              daysPerWeek={daysPerWeek} periodsPerDay={periodsPerDay}
              isTestingMode={isTestingMode}
              startTime={startTime} periodDuration={periodDuration}
              breakCount={breakCount} breakDuration={breakDuration}
              break1AfterPeriod={break1AfterPeriod} break2AfterPeriod={break2AfterPeriod}
              fridayStartTime={fridayStartTime} fridayPeriodDuration={fridayPeriodDuration}
              fridayBreakCount={fridayBreakCount} fridayBreakDuration={fridayBreakDuration}
              fridayBreak1AfterPeriod={fridayBreak1AfterPeriod} fridayBreak2AfterPeriod={fridayBreak2AfterPeriod}
              isTimeOffSubmissionOpen={isTimeOffSubmissionOpen}
              updateMasterData={updateMasterData}
            />
          )}
          {activeTab === 'beban' && (
            <BebanMengajarPanel 
              classes={classes} teachers={teachers} 
              loads={teachingLoads} updateMasterData={updateMasterData}
              loading={loadingData}
            />
          )}
          {activeTab === 'otomatisasi' && (
            <OtomatisasiPanel 
              classes={classes} teachers={teachers} loads={teachingLoads}
              daysPerWeek={daysPerWeek} periodsPerDay={periodsPerDay}
              break1AfterPeriod={break1AfterPeriod}
              break2AfterPeriod={break2AfterPeriod}
              breakCount={breakCount}
              fridayBreak1AfterPeriod={fridayBreak1AfterPeriod}
              fridayBreak2AfterPeriod={fridayBreak2AfterPeriod}
              fridayBreakCount={fridayBreakCount}
              startTime={startTime} periodDuration={periodDuration} breakDuration={breakDuration}
              fridayStartTime={fridayStartTime} fridayPeriodDuration={fridayPeriodDuration} fridayBreakDuration={fridayBreakDuration}
            />
          )}
          {activeTab === 'exam' && (
            <ExamManagementPanel 
              classes={classes} 
              teachers={teachers} 
              teachingLoads={teachingLoads} 
            />
          )}
          {activeTab === 'rollover' && <ScheduleRolloverPanel />}
        </div>
      </div>
    </div>
  );
}

// 0. PANEL STRUKTUR WAKTU
function StrukturWaktuPanel({ 
  startTime, periodDuration, breakCount, breakDuration, 
  break1AfterPeriod, break2AfterPeriod,
  fridayStartTime, fridayPeriodDuration, fridayBreakCount, fridayBreakDuration, fridayBreak1AfterPeriod, fridayBreak2AfterPeriod, updateMasterData, loading 
}: any) {
  const [localState, setLocalState] = useState({
    startTime, periodDuration, breakCount, breakDuration, break1AfterPeriod, break2AfterPeriod, fridayStartTime, fridayPeriodDuration, fridayBreakCount, fridayBreakDuration, fridayBreak1AfterPeriod, fridayBreak2AfterPeriod
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalState({ startTime, periodDuration, breakCount, breakDuration, break1AfterPeriod, break2AfterPeriod, fridayStartTime, fridayPeriodDuration, fridayBreakCount, fridayBreakDuration, fridayBreak1AfterPeriod, fridayBreak2AfterPeriod });
  }, [startTime, periodDuration, breakCount, breakDuration, break1AfterPeriod, break2AfterPeriod, fridayStartTime, fridayPeriodDuration, fridayBreakCount, fridayBreakDuration, fridayBreak1AfterPeriod, fridayBreak2AfterPeriod]);

  const handleSave = async () => {
    setSaving(true);
    await updateMasterData(localState);
    setSaving(false);
  };

  if (loading) {
    return <div className="text-center py-10"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">Inisialisasi Jam Pelajaran</h3>
        <button 
          onClick={handleSave} disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4">
          <h4 className="font-semibold text-gray-800 border-b pb-2">Hari Reguler (Senin - Kamis & Sabtu)</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jam Masuk Sekolah</label>
            <input 
              type="time" 
              value={localState.startTime} 
              onChange={(e) => setLocalState({ ...localState, startTime: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white outline-none focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Durasi 1 Jam Pelajaran (Menit)</label>
            <input 
              type="number" min="15" max="120"
              value={localState.periodDuration} 
              onChange={(e) => setLocalState({ ...localState, periodDuration: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Istirahat per Hari</label>
            <input 
              type="number" min="0" max="5"
              value={localState.breakCount} 
              onChange={(e) => setLocalState({ ...localState, breakCount: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Durasi per Istirahat (Menit)</label>
            <input 
              type="number" min="0" max="60"
              value={localState.breakDuration} 
              onChange={(e) => setLocalState({ ...localState, breakDuration: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white outline-none focus:border-blue-500"
            />
          </div>

          {localState.breakCount > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Letak Istirahat 1 (Setelah Jam Ke-)</label>
              <input 
                type="number" min="1" max="10"
                value={localState.break1AfterPeriod} 
                onChange={(e) => setLocalState({ ...localState, break1AfterPeriod: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white outline-none focus:border-blue-500"
              />
            </div>
          )}

          {localState.breakCount > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Letak Istirahat 2 (Setelah Jam Ke-)</label>
              <input 
                type="number" min="1" max="10"
                value={localState.break2AfterPeriod} 
                onChange={(e) => setLocalState({ ...localState, break2AfterPeriod: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white outline-none focus:border-blue-500"
              />
            </div>
          )}
        </div>

        <div className="bg-blue-50 p-5 rounded-xl border border-blue-200 space-y-4">
          <h4 className="font-semibold text-blue-900 border-b border-blue-200 pb-2">Kondisi Khusus: Hari Jumat</h4>
          <p className="text-sm text-blue-700">Penyesuaian waktu untuk ibadah atau kegiatan khusus.</p>
          
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">Jam Masuk Sekolah (Jumat)</label>
            <input 
              type="time" 
              value={localState.fridayStartTime} 
              onChange={(e) => setLocalState({ ...localState, fridayStartTime: e.target.value })}
              className="w-full border border-blue-300 rounded-lg px-3 py-2 bg-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">Jumlah Istirahat per Hari (Jumat)</label>
            <input 
              type="number" min="0" max="5"
              value={localState.fridayBreakCount ?? 2} 
              onChange={(e) => setLocalState({ ...localState, fridayBreakCount: Number(e.target.value) })}
              className="w-full border border-blue-300 rounded-lg px-3 py-2 bg-white outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">Durasi per Istirahat (Menit) (Jumat)</label>
            <input 
              type="number" min="0" max="60"
              value={localState.fridayBreakDuration ?? 15} 
              onChange={(e) => setLocalState({ ...localState, fridayBreakDuration: Number(e.target.value) })}
              className="w-full border border-blue-300 rounded-lg px-3 py-2 bg-white outline-none focus:border-blue-500"
            />
          </div>
          {(localState.fridayBreakCount ?? 2) > 0 && (
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-1">Letak Istirahat 1 (Setelah Jam Ke-) (Jumat)</label>
              <input 
                type="number" min="1" max="10"
                value={localState.fridayBreak1AfterPeriod ?? 4} 
                onChange={(e) => setLocalState({ ...localState, fridayBreak1AfterPeriod: Number(e.target.value) })}
                className="w-full border border-blue-300 rounded-lg px-3 py-2 bg-white outline-none focus:border-blue-500"
              />
            </div>
          )}
          {(localState.fridayBreakCount ?? 2) > 1 && (
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-1">Letak Istirahat 2 (Setelah Jam Ke-) (Jumat)</label>
              <input 
                type="number" min="1" max="10"
                value={localState.fridayBreak2AfterPeriod ?? 6} 
                onChange={(e) => setLocalState({ ...localState, fridayBreak2AfterPeriod: Number(e.target.value) })}
                className="w-full border border-blue-300 rounded-lg px-3 py-2 bg-white outline-none focus:border-blue-500"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">Durasi 1 Jam Pelajaran Jumat (Menit)</label>
            <input 
              type="number" min="15" max="120"
              value={localState.fridayPeriodDuration} 
              onChange={(e) => setLocalState({ ...localState, fridayPeriodDuration: Number(e.target.value) })}
              className="w-full border border-blue-300 rounded-lg px-3 py-2 bg-white outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// 1. PANEL PARAMETER MASTER
function ParameterMasterPanel({ days, periods, classes, homeroomTeachers, piketTeachers, teachers, updateMasterData, loading }: any) {
  const [newClass, setNewClass] = useState('');
  const [selectedHomeroomTeacher, setSelectedHomeroomTeacher] = useState('');
  
  const [editingClass, setEditingClass] = useState<string | null>(null);
  const [editTeacher, setEditTeacher] = useState('');

  const addClass = (e: React.FormEvent) => {
    e.preventDefault();
    if(newClass.trim() && !classes.includes(newClass.trim())) {
      const clsName = newClass.trim();
      
      // Validation: 1 teacher = 1 class check
      if (selectedHomeroomTeacher) {
        const alreadyAssigned = homeroomTeachers?.find((ht: any) => ht.teacherId === selectedHomeroomTeacher);
        if (alreadyAssigned) {
          alert(`Guru tersebut sudah menjadi wali kelas untuk kelas ${alreadyAssigned.className}. Satu guru hanya boleh memegang satu kelas.`);
          return;
        }
      }

      const newClasses = [...classes, clsName];
      const updates: any = { classes: newClasses };
      
      if (selectedHomeroomTeacher) {
        const teacher = teachers.find((t: any) => t.uid === selectedHomeroomTeacher);
        if (teacher) {
          const newHTs = [...(homeroomTeachers || []), { className: clsName, teacherId: teacher.uid, teacherName: teacher.name }];
          updates.homeroomTeachers = newHTs;
        }
      }
      
      updateMasterData(updates);
      setNewClass('');
      setSelectedHomeroomTeacher('');
    }
  };

  const removeClass = (clsToRemove: string) => {
    const newClasses = classes.filter((c: string) => c !== clsToRemove);
    const updates: any = { classes: newClasses };
    if (homeroomTeachers) {
      updates.homeroomTeachers = homeroomTeachers.filter((ht: any) => ht.className !== clsToRemove);
    }
    updateMasterData(updates);
  };

  const saveEditClass = (cls: string) => {
    // Check if new teacher is already assigned to another class
    if (editTeacher) {
      const alreadyAssigned = homeroomTeachers?.find((ht: any) => ht.teacherId === editTeacher && ht.className !== cls);
      if (alreadyAssigned) {
        alert(`Guru tersebut sudah menjadi wali kelas untuk kelas ${alreadyAssigned.className}.`);
        return;
      }
    }

    let newHTs = [...(homeroomTeachers || [])].filter(h => h.className !== cls);
    if (editTeacher) {
      const teacher = teachers.find((t: any) => t.uid === editTeacher);
      if (teacher) {
        newHTs.push({ className: cls, teacherId: teacher.uid, teacherName: teacher.name });
      }
    }
    
    updateMasterData({ homeroomTeachers: newHTs });
    setEditingClass(null);
  };

  const localPiket = piketTeachers || [];

  if (loading) {
    return <div className="text-center py-10"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Parameter Waktu Efektif</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah Hari Efektif / Minggu</label>
            <select 
              value={days} onChange={(e) => updateMasterData({ daysPerWeek: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
            >
              <option value={5}>5 Hari (Senin - Jumat)</option>
              <option value={6}>6 Hari (Senin - Sabtu)</option>
            </select>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">Maksimal Jam Pelajaran / Hari</label>
            <input 
              type="number" min="1" max="12"
              value={periods} onChange={(e) => updateMasterData({ periodsPerDay: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
            />
          </div>
        </div>
      </div>

      <div className="bg-orange-50 p-5 rounded-xl border border-orange-200">
        <h4 className="font-semibold text-orange-900 border-b border-orange-200 pb-2 mb-4">Penugasan Guru Piket Harian</h4>
        <p className="text-sm text-orange-800 mb-4">Atur guru piket untuk setiap harinya. Guru Piket memiliki wewenang untuk mengisi absensi mapel yang kosong pada hari tersebut.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(dayIdx => {
            const dayNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            if (dayIdx > days) return null;
            
            const currentAssignment = localPiket.find((p: any) => p.dayIndex === dayIdx);
            return (
              <div key={dayIdx} className="bg-white p-3 rounded border border-orange-200">
                <label className="block text-sm font-medium text-orange-900 mb-2">{dayNames[dayIdx - 1]}</label>
                <select
                  value={currentAssignment?.teacherId || ''}
                  onChange={(e) => {
                    const tId = e.target.value;
                    const teacher = teachers?.find((t: any) => t.uid === tId);
                    let newPiket = localPiket.filter((p: any) => p.dayIndex !== dayIdx);
                    if (tId && teacher) {
                      newPiket.push({ dayIndex: dayIdx, teacherId: tId, teacherName: teacher.name });
                    }
                    updateMasterData({ piketTeachers: newPiket });
                  }}
                  className="w-full border border-orange-300 rounded px-2 py-1 bg-white text-sm"
                >
                  <option value="">-- Pilih Guru Piket --</option>
                  {teachers?.map((t: any) => (
                    <option key={t.uid} value={t.uid}>{t.name}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Daftar Kelas (Ruang)</h3>
        <form onSubmit={addClass} className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-3 mb-4">
          <input 
            type="text" value={newClass} onChange={(e) => setNewClass(e.target.value)}
            placeholder="Masukkan nama kelas (Contoh: X-A)" 
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2" required
          />
          <select
            value={selectedHomeroomTeacher}
            onChange={(e) => setSelectedHomeroomTeacher(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 bg-white"
          >
            <option value="">-- Pilih Wali Kelas (Opsional) --</option>
            {teachers.map((t: any) => (
              <option key={t.uid} value={t.uid}>{t.name}</option>
            ))}
          </select>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center md:justify-start">
            <Plus className="w-4 h-4 mr-2" /> Tambah Kelas
          </button>
        </form>

        {classes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {classes.map((cls: string, idx: number) => {
              const ht = homeroomTeachers?.find((h: any) => h.className === cls);
              const isEditing = editingClass === cls;
              return (
              <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col relative group">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-gray-900 text-lg">{cls}</span>
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => {
                        setEditingClass(cls);
                        setEditTeacher(ht?.teacherId || '');
                      }} className="text-gray-500 hover:bg-gray-100 p-1 rounded transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => removeClass(cls)} className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {isEditing ? (
                  <div className="mt-2 flex flex-col space-y-2">
                    <select
                      value={editTeacher}
                      onChange={(e) => setEditTeacher(e.target.value)}
                      className="w-full border border-gray-300 rounded text-sm px-2 py-1 bg-white"
                    >
                      <option value="">-- Pilih Wali Kelas --</option>
                      {teachers.map((t: any) => (
                        <option key={t.uid} value={t.uid}>{t.name}</option>
                      ))}
                    </select>
                    <div className="flex space-x-2">
                      <button onClick={() => saveEditClass(cls)} className="bg-blue-600 text-white text-xs px-3 py-1 rounded hover:bg-blue-700">Simpan</button>
                      <button onClick={() => setEditingClass(null)} className="bg-gray-200 text-gray-700 text-xs px-3 py-1 rounded hover:bg-gray-300">Batal</button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 mt-1">
                    <span className="block font-medium text-xs text-gray-400 mb-1">Wali Kelas:</span>
                    {ht ? <span className="text-blue-700 font-medium">{ht.teacherName}</span> : <span className="italic text-gray-400">Belum diatur</span>}
                  </div>
                )}
              </div>
            )})}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">Belum ada kelas yang didaftarkan.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// 2. PANEL KETERSEDIAAN GURU (TIME-OFF)
function KetersediaanGuruPanel({ 
  teachers, setTeachers, loading, daysPerWeek, periodsPerDay, isTestingMode,
  startTime, periodDuration, breakCount, breakDuration, break1AfterPeriod, break2AfterPeriod, fridayStartTime, fridayPeriodDuration,
  fridayBreakCount, fridayBreakDuration, fridayBreak1AfterPeriod, fridayBreak2AfterPeriod,
  isTimeOffSubmissionOpen, updateMasterData
}: any) {
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [tempMaxHours, setTempMaxHours] = useState(24);
  const [tempTimeOff, setTempTimeOff] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showVirtualTeacherModal, setShowVirtualTeacherModal] = useState(false);
  const [virtualTeacherName, setVirtualTeacherName] = useState('');
  const [addingVirtualTeacher, setAddingVirtualTeacher] = useState(false);

  const handleAddVirtualTeacher = async () => {
    if (!virtualTeacherName.trim()) {
      alert("Nama guru wajib diisi.");
      return;
    }
    setAddingVirtualTeacher(true);
    try {
      const uid = "virtual_" + Date.now();
      const newTeacher = {
        uid,
        name: virtualTeacherName.trim().toUpperCase(),
        role: 'teacher',
        isVirtual: true,
        maxHours: 24,
        timeOff: [],
        createdAt: Date.now()
      };
      
      if (!isTestingMode) {
        const res = await createUser(uid, newTeacher);
        if (res.isFailure) throw new Error(res.getError());
      }
      
      setTeachers([...teachers, newTeacher]);
      setShowVirtualTeacherModal(false);
      setVirtualTeacherName('');
    } catch (error) {
      console.error("Error adding virtual teacher", error);
      alert("Terjadi kesalahan saat menambahkan guru.");
    } finally {
      setAddingVirtualTeacher(false);
    }
  };

  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].slice(0, daysPerWeek);

  const parseTime = (timeStr: string) => {
    const [h, m] = (timeStr || '00:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const formatTime = (totalMin: number) => {
    const h = Math.floor((totalMin % 1440) / 60).toString().padStart(2, '0');
    const m = (totalMin % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const getTimeRange = (dayName: string, periodIdx: number) => {
    const isFriday = dayName === 'Jumat';
    let currentMinutes = isFriday ? parseTime(fridayStartTime || '07:00') : parseTime(startTime || '07:00');
    const pDuration = isFriday ? (fridayPeriodDuration || 35) : (periodDuration || 45);
    const bCount = isFriday ? (fridayBreakCount ?? breakCount ?? 0) : (breakCount || 0);
    const bDuration = isFriday ? (fridayBreakDuration ?? breakDuration ?? 15) : (breakDuration || 15);

    for (let i = 0; i < periodIdx; i++) {
      currentMinutes += pDuration;
      if (i === ((isFriday ? (fridayBreak1AfterPeriod ?? break1AfterPeriod) : break1AfterPeriod) - 1) && bCount >= 1) currentMinutes += bDuration;
      if (i === ((isFriday ? (fridayBreak2AfterPeriod ?? break2AfterPeriod) : break2AfterPeriod) - 1) && bCount >= 2) currentMinutes += bDuration;
    }
    
    const startStr = formatTime(currentMinutes);
    const endStr = formatTime(currentMinutes + pDuration);
    return `${startStr} - ${endStr}`;
  };

  const openEditor = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setTempMaxHours(teacher.maxHours);
    setTempTimeOff([...teacher.timeOff]);
  };

  const toggleTimeOff = (dayIdx: number, periodIdx: number) => {
    const key = `${dayIdx}-${periodIdx}`;
    if (tempTimeOff.includes(key)) {
      setTempTimeOff(tempTimeOff.filter(k => k !== key));
    } else {
      setTempTimeOff([...tempTimeOff, key]);
    }
  };

  const saveConfig = async () => {
    if(!editingTeacher) return;
    setSaving(true);
    try {
      if (!isTestingMode) {
        const res = await updateUser(editingTeacher.uid, { maxHours: tempMaxHours, timeOff: tempTimeOff });
        if (res.isFailure) throw new Error(res.getError());
      }
      setTeachers(teachers.map((t: Teacher) => 
        t.uid === editingTeacher.uid ? { ...t, maxHours: tempMaxHours, timeOff: tempTimeOff } : t
      ));
      setEditingTeacher(null);
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan ke database.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Konfigurasi Ketersediaan Guru</h3>
          <p className="text-sm text-gray-500">Atur ketersediaan waktu dan batasan jam mengajar guru.</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button 
            onClick={() => setShowVirtualTeacherModal(true)}
            className="flex items-center px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
          >
            <UserCircle className="w-4 h-4 mr-1.5" />
            Tambah Guru (Virtual)
          </button>
          <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-center space-x-4 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-gray-800">Buka Akses Pengisian (Mandiri)</p>
            <p className="text-xs text-gray-500">Guru dapat mengisi Time-Off di dashboard mereka.</p>
          </div>
          <button
            onClick={() => updateMasterData({ isTimeOffSubmissionOpen: !isTimeOffSubmissionOpen })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isTimeOffSubmissionOpen ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isTimeOffSubmissionOpen ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div></div>
      ) : teachers.length > 0 ? (
        <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-600">Nama Guru</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-center">Maks Jam/Minggu</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-center">Titik Jam Diblokir</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {teachers.map((t: Teacher) => (
                <tr key={t.uid} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                  <td className="px-4 py-3 text-center">{t.maxHours} Jam</td>
                  <td className="px-4 py-3 text-center">
                    {t.timeOff.length > 0 ? (
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">{t.timeOff.length} Titik</span>
                    ) : (
                      <span className="text-gray-400 text-xs">Kosong (Bebas)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEditor(t)} className="text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg font-medium inline-flex items-center">
                      <Edit className="w-4 h-4 mr-1" /> Atur Time-Off
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <Clock className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 font-medium">Belum ada akun Guru yang terdaftar di sistem.</p>
          <button 
            onClick={() => setShowVirtualTeacherModal(true)}
            className="mt-4 flex items-center px-4 py-2 mx-auto bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <UserCircle className="w-4 h-4 mr-1.5" />
            Tambah Guru Secara Manual
          </button>
        </div>
      )}

      {/* Modal Tambah Guru Virtual */}
      {showVirtualTeacherModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Tambah Guru Virtual</h3>
              <button onClick={() => setShowVirtualTeacherModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg flex items-start text-sm text-blue-800">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <p>Fitur ini digunakan jika ada guru yang belum mendaftar, namun Admin/Kurikulum ingin mendaftarkan namanya ke dalam sistem agar bisa dijadwalkan.</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap Guru</label>
                <input 
                  type="text"
                  value={virtualTeacherName}
                  onChange={(e) => setVirtualTeacherName(e.target.value)}
                  placeholder="Contoh: BUDI SANTOSO, S.Pd"
                  className="w-full uppercase border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
              <button 
                onClick={() => setShowVirtualTeacherModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Batal
              </button>
              <button 
                onClick={handleAddVirtualTeacher}
                disabled={!virtualTeacherName.trim() || addingVirtualTeacher}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {addingVirtualTeacher ? 'Menyimpan...' : 'Simpan Guru'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingTeacher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-1">Atur Ketersediaan: {editingTeacher.name}</h3>
            <p className="text-sm text-gray-500 mb-6">Tentukan jam maksimal dan blokir jadwal di mana guru tidak bisa mengajar (Time-Off).</p>
            
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">Maksimal Jam Mengajar / Minggu</label>
              <input 
                type="number" min="1" value={tempMaxHours} onChange={e => setTempMaxHours(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 w-32 outline-none focus:border-blue-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">Peta Ketersediaan (Grid Time-Off)</label>
              <p className="text-xs text-gray-500 mb-3">Klik kotak untuk memblokir jadwal (Warna merah = Guru tidak bisa mengajar).</p>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-center text-sm">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="py-2 border-r border-gray-200 font-semibold w-24 text-gray-600">Jam Ke-</th>
                      {days.map(d => <th key={d} className="py-2 border-r border-gray-200 font-semibold text-gray-600">{d}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: periodsPerDay }).map((_, periodIdx) => (
                      <tr key={periodIdx} className="border-b border-gray-200">
                        <td className="py-2 px-1 border-r border-gray-200 font-medium bg-gray-50 align-top">
                          <div className="flex flex-col items-center justify-center space-y-1 h-full pt-1">
                            <span>Jam {periodIdx + 1}</span>
                            <span className="text-[11px] text-blue-600 font-bold tracking-tight">{getTimeRange('Senin', periodIdx)}</span>
                          </div>
                        </td>
                        {days.map((dayName, dayIdx) => {
                          const isOff = tempTimeOff.includes(`${dayIdx}-${periodIdx}`);
                          
                          return (
                            <td 
                              key={dayIdx} 
                              onClick={() => toggleTimeOff(dayIdx, periodIdx)}
                              className={`border-r border-gray-200 cursor-pointer transition-colors p-1 align-top ${isOff ? 'bg-red-50 hover:bg-red-100' : 'bg-white hover:bg-gray-50'}`}
                            >
                              <div className="flex flex-col space-y-1 h-full">
                                {dayName === 'Jumat' && (
                                  <span className="text-[10px] text-gray-500 font-mono tracking-tighter">{getTimeRange('Jumat', periodIdx)}</span>
                                )}
                                <div className={`w-full h-12 rounded flex flex-col items-center justify-center transition-all ${isOff ? 'bg-red-500 text-white shadow-inner scale-95' : 'border border-gray-200 text-gray-300'}`}>
                                  {isOff && <span className="text-xs font-bold">BLOKIR</span>}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
              <button onClick={() => setEditingTeacher(null)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">
                Batal
              </button>
              <button onClick={saveConfig} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center">
                {saving ? 'Menyimpan...' : 'Simpan Ketersediaan'}
              </button>
            </div>
          </div>
          
      </div>
      )}
    </div>
  );
}

// 3. PANEL BEBAN MENGAJAR (TEACHING LOAD)
function BebanMengajarPanel({ classes, teachers, loads, updateMasterData, loading }: any) {
  const [formData, setFormData] = useState({ className: '', subject: '', teacherId: '', hours: 2 });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if(formData.className && formData.subject && formData.teacherId && formData.hours > 0) {
      updateMasterData({ teachingLoads: [...loads, { id: Date.now().toString(), ...formData }] });
      setFormData({ ...formData, subject: '', hours: 2 }); // reset partial
    }
  };

  if (loading) {
    return <div className="text-center py-10"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Tambah Beban Mengajar (Teaching Load)</h3>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="space-y-1 md:col-span-1">
            <label className="text-sm font-medium text-gray-700">Kelas</label>
            <select required value={formData.className} onChange={e => setFormData({...formData, className: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white">
              <option value="">Pilih...</option>
              {classes.map((c: string) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1 md:col-span-1">
            <label className="text-sm font-medium text-gray-700">Mata Pelajaran</label>
            <input required type="text" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} placeholder="Misal: Fisika" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Guru Pengampu</label>
            <select required value={formData.teacherId} onChange={e => setFormData({...formData, teacherId: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white">
              <option value="">Pilih Guru...</option>
              {teachers.map((t: Teacher) => <option key={t.uid} value={t.uid}>{t.name}</option>)}
            </select>
          </div>
          <div className="space-y-1 md:col-span-1">
            <label className="text-sm font-medium text-gray-700">Jam/Mgg</label>
            <div className="flex space-x-2">
              <input required type="number" min="1" value={formData.hours} onChange={e => setFormData({...formData, hours: Number(e.target.value)})} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700">Add</button>
            </div>
          </div>
        </form>
      </div>

      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-3">Daftar Beban Mengajar</h3>
        {loads.length > 0 ? (
          <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-600">Kelas</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Mata Pelajaran</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Guru</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-center">Jam/Minggu</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loads.map((load: TeachingLoad) => (
                  <tr key={load.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">{load.className}</td>
                    <td className="px-4 py-3 text-gray-700">{load.subject}</td>
                    <td className="px-4 py-3 font-medium text-blue-700">{teachers.find((t: Teacher) => t.uid === load.teacherId)?.name || 'Unknown'}</td>
                    <td className="px-4 py-3 text-center font-bold text-gray-700">{load.hours}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => updateMasterData({ teachingLoads: loads.filter((l: TeachingLoad) => l.id !== load.id) })} className="text-red-500 hover:text-red-700 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500">
            Belum ada beban mengajar yang didaftarkan.
          </div>
        )}
      </div>
    </div>
  );
}

// 4. PANEL OTOMATISASI JADWAL
function OtomatisasiPanel({ classes, teachers, loads, daysPerWeek, periodsPerDay, isTestingMode, break1AfterPeriod, break2AfterPeriod, breakCount, fridayBreak1AfterPeriod, fridayBreak2AfterPeriod, fridayBreakCount, startTime, periodDuration, breakDuration, fridayStartTime, fridayPeriodDuration, fridayBreakDuration }: any) {
  const { vSchedules, setVSchedules } = useVirtualMode();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [schedule, setSchedule] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [restAreaItems, setRestAreaItems] = useState<any[]>([]);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [unplacedCount, setUnplacedCount] = useState(0);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (isTestingMode) {
        if (vSchedules && vSchedules.length > 0) {
          setSchedule(vSchedules);
          setStatus('success');
        }
      } else {
        try {
          const res = await getSchedules();
          if (res.isSuccess) {
            const data = res.getValue();
            if (data && data.length > 0) {
              setSchedule(data);
              setStatus('success');
            }
          }
        } catch (error) {
          console.error("Error loading schedules", error);
        }
      }
    };
    fetchInitialData();
  }, [isTestingMode]);

  const handleDragStart = (e: any, item: any, source: string) => {
    setDraggedItem({ ...item, source });
  };

  const handleDropToRestArea = (e: any) => {
    e.preventDefault();
    if (draggedItem && draggedItem.source !== 'restArea') {
      setSchedule(schedule.filter((s: any) => s.id !== draggedItem.id));
      if (!restAreaItems.find(r => r.id === draggedItem.id)) {
        setRestAreaItems([...restAreaItems, draggedItem]);
      }
      setDraggedItem(null);
    }
  };

  const handleDropToCell = (e: any, d: number, p: number, cls: string) => {
    e.preventDefault();
    if (!draggedItem) return;

    const existingItem = schedule.find((s: any) => s.className === cls && s.dayIndex === d && s.periodIndex === p);

    if (draggedItem.source === 'restArea') {
      let newSchedule = [...schedule];
      let newRestArea = restAreaItems.filter(r => r.id !== draggedItem.id);
      if (existingItem) {
        newSchedule = newSchedule.filter(s => s.id !== existingItem.id);
        newRestArea.push(existingItem);
      }
      newSchedule.push({ ...draggedItem, dayIndex: d, periodIndex: p, className: cls });
      setSchedule(newSchedule);
      setRestAreaItems(newRestArea);
    } else {
      if (existingItem) {
        let newSchedule = schedule.map((s: any) => {
          if (s.id === draggedItem.id) return { ...s, dayIndex: d, periodIndex: p, className: cls };
          if (s.id === existingItem.id) return { ...s, dayIndex: draggedItem.dayIndex, periodIndex: draggedItem.periodIndex, className: draggedItem.className };
          return s;
        });
        setSchedule(newSchedule);
      } else {
        let newSchedule = schedule.map((s: any) => {
          if (s.id === draggedItem.id) return { ...s, dayIndex: d, periodIndex: p, className: cls };
          return s;
        });
        setSchedule(newSchedule);
      }
    }
    setDraggedItem(null);
  };


  const isReady = classes.length > 0 && teachers.length > 0 && loads.length > 0;
  const totalHours = loads.reduce((acc: number, curr: any) => acc + curr.hours, 0);

  
  const daysName = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].slice(0, daysPerWeek);

  const uniqueSubjects = Array.from(new Set(loads.map((l: any) => l.subject))).sort();
  const subjectCodes: Record<string, number> = {};
  uniqueSubjects.forEach((sub: any, index: number) => {
    subjectCodes[sub] = index + 1;
  });

  const activeTeachers = teachers.filter((t: any) => loads.some((l: any) => l.teacherId === t.uid)).sort((a: any, b: any) => a.name.localeCompare(b.name));
  const getTeacherCode = (index: number) => {
     let c = '';
     let num = index;
     while (num >= 0) {
        c = String.fromCharCode(65 + (num % 26)) + c;
        num = Math.floor(num / 26) - 1;
     }
     return c;
  };
  const teacherCodes: Record<string, string> = {};
  activeTeachers.forEach((t: any, index: number) => {
     teacherCodes[t.uid] = getTeacherCode(index);
  });

  const handleGenerate = () => {
    setStatus('loading');
    setUnplacedCount(0);
    setTimeout(() => {
      try {
        const generated = generateSchedule(loads, teachers, daysPerWeek, periodsPerDay);
        setSchedule(generated);
        console.log("=== GENERATED SCHEDULE ===");
        console.log("Loads:", loads);
        console.log("Teachers:", teachers);
        console.log("Days:", daysPerWeek, "Periods:", periodsPerDay);
        console.log("Output Schedule Length:", generated.length);
        console.log("Output Schedule:", generated);

        
        const unplaced: any[] = [];
        loads.forEach((load: any) => {
          const placedCount = generated.filter((s: any) => s.subject === load.subject && s.teacherId === load.teacherId && s.className === load.className).length;
          const missingCount = load.hours - placedCount;
          for (let i = 0; i < missingCount; i++) {
            unplaced.push({
              id: `unplaced-${load.id}-${i}-${Date.now()}`,
              subject: load.subject,
              teacherId: load.teacherId,
              className: load.className,
              source: 'restArea'
            });
          }
        });
        
        if (unplaced.length > 0) {
          setUnplacedCount(unplaced.length);
          setRestAreaItems(unplaced);
        } else {
          setUnplacedCount(0);
          setRestAreaItems([]);
        }
        
        setStatus('success');
      } catch (err: any) {
        console.error(err);
        setStatus('idle');
        alert("Gagal menggenerate jadwal: " + err.message);
      }
    }, 1500); // Simulate some thought time
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await replaceAllSchedules(schedule);
      if (res.isFailure) throw new Error(res.getError());
      alert("Jadwal berhasil disimpan!");
    } catch (e) {
      console.error(e);
      alert("Gagal menyimpan jadwal.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <div className="space-y-6 print:hidden">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm text-center">
          <p className="text-gray-500 text-sm font-medium">Total Kelas</p>
          <h4 className={`text-3xl font-bold mt-1 ${classes.length > 0 ? 'text-gray-900' : 'text-red-500'}`}>{classes.length}</h4>
        </div>
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm text-center">
          <p className="text-gray-500 text-sm font-medium">Total Guru</p>
          <h4 className={`text-3xl font-bold mt-1 ${teachers.length > 0 ? 'text-gray-900' : 'text-red-500'}`}>{teachers.length}</h4>
        </div>
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm text-center">
          <p className="text-gray-500 text-sm font-medium">Total Beban Mengajar (Jam)</p>
          <h4 className={`text-3xl font-bold mt-1 ${totalHours > 0 ? 'text-blue-600' : 'text-red-500'}`}>{totalHours}</h4>
        </div>
      </div>

      {!isReady && status === 'idle' && (
        <div className="bg-red-50 p-4 rounded-xl border border-red-200 flex items-start space-x-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold">Data Parameter Belum Lengkap!</h4>
            <p className="text-sm mt-1">Anda harus mengisi setidaknya 1 Kelas, 1 Guru, dan 1 Beban Mengajar sebelum algoritma dapat dijalankan.</p>
          </div>
        </div>
      )}

      {status === 'idle' && isReady && (
        <div className="bg-blue-50 p-8 rounded-xl border border-blue-200 text-center">
          <Settings className="w-12 h-12 text-blue-500 mx-auto mb-3 animate-spin-slow" />
          <h4 className="text-blue-900 font-bold mb-2">Engine Penjadwalan Siap Dijalankan</h4>
          <p className="text-blue-700 font-medium mb-6 text-sm max-w-xl mx-auto">
            Sistem akan mulai mengeksekusi algoritma *Genetic* untuk mencocokkan beban mengajar ({loads.length} entri) ke dalam slot waktu tanpa melanggar batasan *Time-Off* guru dan kapasitas maksimal jam mereka.
          </p>
          <button 
            onClick={handleGenerate}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-md"
          >
            Eksekusi Algoritma (Generate)
          </button>
        </div>
      )}

      {status === 'loading' && (
        <div className="bg-gray-50 p-10 rounded-xl border border-gray-200 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h4 className="text-gray-900 font-bold text-lg mb-2">Mengeksekusi Algoritma Genetik...</h4>
          <p className="text-gray-500 font-medium text-sm">Sedang mengevaluasi generasi populasi, crossover, dan mutasi rute jadwal. Mohon tunggu.</p>
        </div>
      )}

      {status === 'success' && (
        <div className="bg-green-50 p-10 rounded-xl border border-green-200 text-center">
          <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h4 className="text-green-900 font-bold text-xl mb-2">Jadwal Ditampilkan</h4>
          {unplacedCount > 0 ? (
            <div className="bg-red-100 text-red-800 p-3 rounded-lg mb-6 max-w-2xl mx-auto border border-red-200">
              <span className="font-bold">Peringatan:</span> Terdapat {unplacedCount} jam pelajaran yang gagal dijadwalkan karena bentrok jadwal guru (Time-Off / Jam Mengajar Penuh). Jadwal di bawah ini mungkin tidak lengkap. Silakan edit manual dengan menggeser blok ke kolom yang kosong, atau longgarkan *Time-Off* guru.
            </div>
          ) : (
            <p className="text-green-700 font-medium mb-8 text-sm">Berikut adalah hasil jadwal yang ada. Semua batasan Time-Off telah dipenuhi.</p>
          )}
          <div className="flex flex-wrap justify-center gap-4">
            <button 
              onClick={() => {
                const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].slice(0, daysPerWeek);
                const csvData = schedule.map(s => {
                  const teacher = teachers.find((t: any) => t.uid === s.teacherId);
                  return {
                    'Kelas': s.className,
                    'Hari': days[s.dayIndex] || `Hari ${s.dayIndex + 1}`,
                    'Jam ke-': s.periodIndex + 1,
                    'Mata Pelajaran': s.subject,
                    'Guru': teacher ? teacher.name : 'Unknown'
                  };
                });
                exportToCSV(csvData, 'Jadwal_Pelajaran_Lengkap');
              }}
              className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-emerald-700 transition-colors shadow-sm flex items-center"
            >
              <FileDown className="w-5 h-5 mr-2" />
              Ekspor CSV
            </button>
            <button onClick={handleSave} disabled={saving} className="bg-white border-2 border-green-600 text-green-700 px-6 py-2.5 rounded-lg font-bold hover:bg-green-50 transition-colors">
              {saving ? "Menyimpan..." : "Simpan ke Database"}
            </button>
            <button 
              onClick={() => window.print()}
              className="bg-white border-2 border-blue-600 text-blue-700 px-6 py-2.5 rounded-lg font-bold hover:bg-blue-50 transition-colors"
            >
              Cetak PDF
            </button>
            <button 
              onClick={async () => {
                if (window.confirm("Apakah Anda yakin ingin menghapus jadwal ini dari database?")) {
                  setSaving(true);
                  try {
                    const res = await replaceAllSchedules([]);
                    if (res.isFailure) throw new Error(res.getError());
                    
                    setSchedule([]);
                    setRestAreaItems([]);
                    setStatus('idle');
                    if (isTestingMode) setVSchedules([]);
                    alert("Jadwal berhasil dihapus dari database!");
                  } catch (e) {
                    console.error(e);
                    alert("Gagal menghapus jadwal.");
                  } finally {
                    setSaving(false);
                  }
                }
              }}
              className="bg-red-50 text-red-600 border-2 border-red-200 px-6 py-2.5 rounded-lg font-bold hover:bg-red-100 hover:border-red-300 transition-colors"
            >
              Hapus Jadwal
            </button>
            <button 
              onClick={() => { setStatus('idle'); setSchedule([]); setRestAreaItems([]); }}
              className="bg-gray-100 text-gray-700 border-2 border-gray-200 px-6 py-2.5 rounded-lg font-bold hover:bg-gray-200 transition-colors"
            >
              Generate Ulang (Tanpa Simpan)
            </button>
          </div>
          
          <div className="mt-8 text-left">
            <h5 className="font-bold text-gray-900 mb-4 text-center text-xl">Pratinjau Jadwal (Drag & Drop untuk Edit)</h5>

            

            
            <div className="bg-blue-50 p-4 border-2 border-dashed border-blue-300 rounded-xl mb-8">
              <h6 className="font-bold text-blue-900 mb-2 flex items-center"><Settings className="w-4 h-4 mr-2" /> Rest Area (Drag jadwal ke sini untuk mengosongkan slot sementara)</h6>
              <div 
                className="flex flex-wrap items-start content-start gap-2 min-h-[120px] max-h-[300px] overflow-y-auto bg-white p-3 rounded-lg border border-blue-100"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDropToRestArea}
              >
                {restAreaItems.map(item => (
                   <div 
                     key={item.id} 
                     draggable 
                     onDragStart={(e) => handleDragStart(e, item, 'restArea')} 
                     className="bg-white border-2 border-blue-500 text-blue-800 px-3 py-1.5 rounded cursor-move text-xs font-bold shadow-sm"
                   >
                     {item.className} | {teacherCodes[item.teacherId]}{subjectCodes[item.subject]}
                   </div>
                ))}
                {restAreaItems.length === 0 && <span className="text-gray-400 text-sm italic w-full flex items-center justify-center">Kosong. Tarik blok jadwal ke area ini...</span>}
              </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-6 items-start">
              {/* Kolom Kiri: KODE MATPEL */}
              <div className="w-full xl:w-56 flex-shrink-0 bg-white p-4 rounded-xl border border-gray-200 shadow-sm sticky top-6">
                <h6 className="font-bold text-gray-800 mb-4 border-b pb-2 flex justify-between">
                  <span>KODE MATPEL</span>
                </h6>
                <div>
                  <table className="w-full text-sm text-left border-collapse">
                     <tbody>
                       {uniqueSubjects.map((sub: any) => (
                         <tr key={sub} className="hover:bg-gray-50">
                           <td className="border-b border-gray-200 p-2 font-bold w-12 text-center text-emerald-700 bg-emerald-50 rounded-l-md">{subjectCodes[sub]}</td>
                           <td className="border-b border-gray-200 p-2 text-gray-800">{sub}</td>
                         </tr>
                       ))}
                     </tbody>
                  </table>
                </div>
              </div>

              {/* Kolom Tengah: Tabel Jadwal */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 w-full min-w-0">
                {daysName.map((dayName, d) => (
                  <div key={d} className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm overflow-x-auto w-full">
                    <h6 className="font-bold text-center bg-green-200 text-green-900 py-2 mb-2 uppercase rounded">{dayName}</h6>
                    <table className="w-full text-xs text-center border-collapse">
                      <thead>
                        <tr className="bg-green-100 text-green-900">
                          <th className="border border-gray-300 p-2 w-12">JAM</th>
                          {classes.map((cls: string) => (
                            <th key={cls} className="border border-gray-300 p-2">{cls}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({length: periodsPerDay}).map((_, p) => {
                          const pIndex = p + 1;
                          let isBreak = false;
                          let isBreak2 = false;
                          if (d === 4) { // Jumat
                             if (fridayBreakCount > 0 && pIndex === fridayBreak1AfterPeriod) isBreak = true;
                             if (fridayBreakCount > 1 && pIndex === fridayBreak2AfterPeriod) isBreak2 = true;
                          } else {
                             if (breakCount > 0 && pIndex === break1AfterPeriod) isBreak = true;
                             if (breakCount > 1 && pIndex === break2AfterPeriod) isBreak2 = true;
                          }
                          return (
                            <React.Fragment key={p}>
                              <tr>
                                <td className="border border-gray-300 p-2 font-bold bg-gray-50">{p + 1}</td>
                                {classes.map((cls: string) => { 
                                  const item = schedule.find((s: any) => s.className === cls && s.dayIndex === d && s.periodIndex === p);
                                  return (
                                    <td 
                                      key={cls} 
                                      className={`border border-gray-300 p-1 transition-colors ${draggedItem ? 'hover:bg-blue-50' : ''}`}
                                      onDragOver={(e) => e.preventDefault()}
                                      onDrop={(e) => handleDropToCell(e, d, p, cls)}
                                    >
                                      {item ? (
                                        <div 
                                          draggable
                                          onDragStart={(e) => handleDragStart(e, item, 'cell')}
                                          className="bg-white border border-blue-200 text-blue-700 py-1 px-1 sm:px-2 rounded cursor-move font-bold shadow-sm whitespace-nowrap"
                                        >
                                          {teacherCodes[item.teacherId] || '?'}{subjectCodes[item.subject] || '?'}
                                        </div>
                                      ) : (
                                        <div className="h-6 w-full flex items-center justify-center text-gray-300 text-xs">
                                          -
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                              {(isBreak || isBreak2) && (
                                <tr>
                                  <td colSpan={classes.length + 1} className="bg-orange-100 text-orange-800 font-bold py-1 border border-gray-300 tracking-widest text-center">
                                    ISTIRAHAT
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>

              {/* Kolom Kanan: KODE GURU */}
              <div className="w-full xl:w-56 flex-shrink-0 bg-white p-4 rounded-xl border border-gray-200 shadow-sm sticky top-6">
                <h6 className="font-bold text-gray-800 mb-4 border-b pb-2 flex justify-between">
                  <span>KODE GURU</span>
                </h6>
                <div>
                  <table className="w-full text-sm text-left border-collapse">
                     <tbody>
                       {activeTeachers.map((t: any) => (
                         <tr key={t.uid} className="hover:bg-gray-50">
                           <td className="border-b border-gray-200 p-2 font-bold w-12 text-center text-blue-700 bg-blue-50 rounded-l-md">{teacherCodes[t.uid]}</td>
                           <td className="border-b border-gray-200 p-2 text-gray-800">{t.name}</td>
                         </tr>
                       ))}
                     </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

          {/* HIDE IN SCREEN, SHOW IN PRINT */}
          <style>{`
            @media print {
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body * {
                visibility: hidden;
              }
              #print-section, #print-section * {
                visibility: visible;
              }
              #print-section {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
              @page {
                size: 330mm 210mm; /* F4 Landscape */
                margin: 10mm;
              }
            }
          `}</style>
          
          <div id="print-section" className="hidden print:block font-serif text-black bg-white min-h-screen text-[10px]">
            <div className="text-center mb-4">
              <h1 className="font-bold text-xl uppercase tracking-wider leading-tight">Jadwal Pelajaran Semester Ganjil</h1>
              <h2 className="font-bold text-xl uppercase tracking-wider leading-tight">SMA ISLAM DIPONEGORO WAGIR</h2>
              <h3 className="font-bold text-lg uppercase tracking-wider leading-tight">Tahun Pelajaran 2026 - 2027</h3>
            </div>
            
            <div className="flex flex-row gap-4">
              <div className="flex-[2]">
                <div className="grid grid-cols-3 gap-2">
                  {['Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'].slice(0, daysPerWeek).map((dayName, d) => {
                    const isJumat = d === 4;
                    const bCount = isJumat ? fridayBreakCount : breakCount;
                    const b1 = isJumat ? fridayBreak1AfterPeriod : break1AfterPeriod;
                    const b2 = isJumat ? fridayBreak2AfterPeriod : break2AfterPeriod;
                    
                    return (
                      <div key={d} className="border-2 border-black p-0.5">
                        <div className="bg-green-200 border-b-2 border-black font-bold text-center py-0.5 uppercase text-[11px]">{dayName}</div>
                        <table className="w-full text-[9px] text-center border-collapse">
                          <thead>
                            <tr className="bg-green-100 border-b border-black">
                              <th className="border-r border-black p-0.5 w-5">JAM</th>
                              {classes.map((cls) => (
                                <th key={cls} className="border-r border-black p-0.5 last:border-r-0">{cls}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from({length: periodsPerDay}).map((_, p) => {
                              const pIndex = p + 1;
                              let isBreak = false;
                              let isBreak2 = false;
                              if (bCount > 0 && pIndex === b1) isBreak = true;
                              if (bCount > 1 && pIndex === b2) isBreak2 = true;
                              
                              return (
                                <React.Fragment key={p}>
                                  <tr>
                                    <td className="border border-black p-0.5 font-bold">{p + 1}</td>
                                    {classes.map((cls) => { 
                                      const item = schedule.find((s) => s.className === cls && s.dayIndex === d && s.periodIndex === p);
                                      return (
                                        <td key={cls} className="border border-black p-0.5 font-bold">
                                          {item ? (
                                            <>{teacherCodes[item.teacherId] || '?'}{subjectCodes[item.subject] || '?'}</>
                                          ) : (
                                            <span className="text-gray-300">-</span>
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                  {(isBreak || isBreak2) && (
                                    <tr>
                                      <td colSpan={classes.length + 1} className="bg-yellow-100 font-bold py-0.5 border border-black text-center text-[9px] tracking-widest italic">
                                        ISTIRAHAT
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-1 text-left text-[10px] italic font-medium">
                  * Catatan: Khusus Pend. Agama Non Muslim, di hari Jum'at/Sabtu.
                </div>
                
                <div className="mt-8 flex flex-row gap-4">
                  <div className="flex-1">
                    <div className="text-[12px] mt-2">
                      <p>Wagir, 13 Juli 2026</p>
                      <p>Kepala SMAI Diponegoro Wagir</p>
                      <div className="h-16"></div>
                      <p className="font-bold underline">AISYAH ALBARIROH, S.Pd</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex-[1] flex flex-col gap-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <table className="w-full text-[9px] border-collapse border-2 border-black">
                      <thead>
                        <tr><th colSpan={2} className="border-b-2 border-black text-left pl-1 bg-gray-100 py-0.5">KODE GURU</th></tr>
                      </thead>
                      <tbody>
                        {teachers.filter((t) => loads.some((l) => l.teacherId === t.uid)).sort((a, b) => a.name.localeCompare(b.name)).map((t) => (
                          <tr key={t.uid}>
                            <td className="border border-black text-center font-bold w-5">{teacherCodes[t.uid]}</td>
                            <td className="border border-black pl-1">{t.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex-1">
                    <table className="w-full text-[9px] border-collapse border-2 border-black">
                      <thead>
                        <tr><th colSpan={2} className="border-b-2 border-black text-left pl-1 bg-gray-100 py-0.5">KODE MATPEL</th></tr>
                      </thead>
                      <tbody>
                        {Array.from(new Set(loads.map((l) => l.subject))).sort().map((sub) => (
                          <tr key={String(sub)}>
                            <td className="border border-black text-center font-bold w-5">{subjectCodes[String(sub)]}</td>
                            <td className="border border-black pl-1">{String(sub)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-2">
                  <div className="flex-1">
                    <table className="w-full text-[9px] border-collapse border-2 border-black">
                      <thead>
                        <tr><th colSpan={2} className="border-b border-black bg-green-200 py-0.5">WAKTU (SENIN-KAMIS)</th></tr>
                      </thead>
                      <tbody>
                        {(() => {
                          let time = 7 * 60;
                          if (startTime) {
                            const [h, m] = startTime.split(':').map(Number);
                            time = h * 60 + m;
                          }
                          const ft = (t) => {
                            const hh = Math.floor(t/60).toString().padStart(2, '0');
                            const mm = (t%60).toString().padStart(2, '0');
                            return hh + '.' + mm;
                          };
                          const rows = [];
                          for(let p = 1; p <= periodsPerDay; p++) {
                            const st = ft(time);
                            time += periodDuration || 45;
                            const en = ft(time);
                            rows.push(
                              <tr key={p}>
                                <td className="border border-black text-center font-bold w-6">{p}</td>
                                <td className="border border-black text-center">{st} - {en}</td>
                              </tr>
                            );
                            if ((breakCount > 0 && p === break1AfterPeriod) || (breakCount > 1 && p === break2AfterPeriod)) {
                              const bst = ft(time);
                              time += breakDuration || 15;
                              const ben = ft(time);
                              rows.push(
                                <tr key={"b"+p} className="bg-yellow-100">
                                  <td className="border border-black text-center font-bold">IST</td>
                                  <td className="border border-black text-center">{bst} - {ben}</td>
                                </tr>
                              );
                            }
                          }
                          return rows;
                        })()}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex-1">
                    <table className="w-full text-[9px] border-collapse border-2 border-black">
                      <thead>
                        <tr><th colSpan={2} className="border-b border-black bg-green-200 py-0.5">WAKTU (JUM'AT)</th></tr>
                      </thead>
                      <tbody>
                        {(() => {
                          let time = 7 * 60;
                          if (fridayStartTime) {
                            const [h, m] = fridayStartTime.split(':').map(Number);
                            time = h * 60 + m;
                          }
                          const ft = (t) => {
                            const hh = Math.floor(t/60).toString().padStart(2, '0');
                            const mm = (t%60).toString().padStart(2, '0');
                            return hh + '.' + mm;
                          };
                          const rows = [];
                          for(let p = 1; p <= periodsPerDay; p++) {
                            const st = ft(time);
                            time += fridayPeriodDuration || 35;
                            const en = ft(time);
                            rows.push(
                              <tr key={p}>
                                <td className="border border-black text-center font-bold w-6">{p}</td>
                                <td className="border border-black text-center">{st} - {en}</td>
                              </tr>
                            );
                            if ((fridayBreakCount > 0 && p === fridayBreak1AfterPeriod) || (fridayBreakCount > 1 && p === fridayBreak2AfterPeriod)) {
                              const bst = ft(time);
                              time += fridayBreakDuration || 15;
                              const ben = ft(time);
                              rows.push(
                                <tr key={"b"+p} className="bg-yellow-100">
                                  <td className="border border-black text-center font-bold">IST</td>
                                  <td className="border border-black text-center">{bst} - {ben}</td>
                                </tr>
                              );
                            }
                          }
                          return rows;
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
    </>
  );
}

// 5. PANEL MANAJEMEN SISWA
interface StudentData {
  uid: string;
  name: string;
  className?: string;
  nisn?: string;
}

function ManajemenSiswaPanel({ classes, isTestingMode }: { classes: string[], isTestingMode: boolean }) {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState<string>('all');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingNisnId, setEditingNisnId] = useState<string | null>(null);
  const [editNisnValue, setEditNisnValue] = useState<string>('');
  
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [promotionSourceClass, setPromotionSourceClass] = useState('');
  const [promotionTargetClass, setPromotionTargetClass] = useState('');
  const [isPromoting, setIsPromoting] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await getStudents();
      if (res.isFailure) throw new Error(res.getError());
      const s = res.getValue().map((u: any) => ({
        uid: u.uid || u.id,
        name: u.name,
        className: u.className,
        nisn: u.nisn
      }));
      setStudents(s as StudentData[]);
    } catch (error) {
      console.error("Error fetching students", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNisn = async (uid: string) => {
    if (isTestingMode) {
      setStudents(students.map(s => s.uid === uid ? { ...s, nisn: editNisnValue } : s));
      setEditingNisnId(null);
      return;
    }
    
    setSavingId(uid);
    try {
      const res = await updateUser(uid, { nisn: editNisnValue });
      if (res.isFailure) throw new Error(res.getError());
      setStudents(students.map(s => s.uid === uid ? { ...s, nisn: editNisnValue } : s));
    } catch (error) {
      console.error("Error updating student NISN", error);
      alert("Gagal memperbarui NISN siswa");
    } finally {
      setSavingId(null);
      setEditingNisnId(null);
    }
  };

  const handleMassPromotion = async () => {
    if (!promotionSourceClass || !promotionTargetClass) {
      alert("Pilih kelas asal dan kelas tujuan.");
      return;
    }
    
    if (promotionSourceClass === promotionTargetClass) {
      alert("Kelas asal dan tujuan tidak boleh sama.");
      return;
    }

    const studentsToPromote = students.filter(s => s.className === promotionSourceClass);
    if (studentsToPromote.length === 0) {
      alert("Tidak ada siswa di kelas asal.");
      return;
    }

    if (!confirm(`Anda yakin ingin memindahkan ${studentsToPromote.length} siswa dari ${promotionSourceClass} ke ${promotionTargetClass === 'LULUS' ? 'Status Lulus/Alumni' : promotionTargetClass}?`)) {
      return;
    }

    setIsPromoting(true);
    try {
      if (isTestingMode) {
        setStudents(students.map(s => s.className === promotionSourceClass ? { ...s, className: promotionTargetClass === 'LULUS' ? undefined : promotionTargetClass } : s));
      } else {
        const promises = studentsToPromote.map(s => {
           return updateUserClassName(s.uid, promotionTargetClass === 'LULUS' ? null : promotionTargetClass);
        });
        await Promise.all(promises);
        setStudents(students.map(s => s.className === promotionSourceClass ? { ...s, className: promotionTargetClass === 'LULUS' ? undefined : promotionTargetClass } : s));
      }
      setShowPromotionModal(false);
      setPromotionSourceClass('');
      setPromotionTargetClass('');
      alert("Kenaikan kelas berhasil diproses!");
    } catch (error) {
      console.error("Error promoting students", error);
      alert("Terjadi kesalahan saat memproses kenaikan kelas.");
    } finally {
      setIsPromoting(false);
    }
  };

  const updateStudentClass = async (uid: string, newClassName: string) => {
    if (isTestingMode) {
      setStudents(students.map(s => s.uid === uid ? { ...s, className: newClassName || undefined } : s));
      return;
    }

    setSavingId(uid);
    try {
      const res = await updateUserClassName(uid, newClassName || null);
      if (res.isFailure) throw new Error(res.getError());
      setStudents(students.map(s => s.uid === uid ? { ...s, className: newClassName || undefined } : s));
    } catch (error) {
      console.error("Error updating student class", error);
      alert("Gagal memperbarui kelas siswa");
    } finally {
      setSavingId(null);
    }
  };

  const filteredStudents = students.filter(s => {
    if (filterClass === 'all') return true;
    if (filterClass === 'unassigned') return !s.className;
    return s.className === filterClass;
  });

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Manajemen Kelas Siswa</h3>
          <p className="text-sm text-gray-500">Atur penempatan siswa ke dalam kelas-kelas yang tersedia.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowPromotionModal(true)}
            className="flex items-center px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
          >
            <Upload className="w-4 h-4 mr-1.5" />
            Kenaikan Kelas Massal
          </button>
          <select 
            value={filterClass} 
            onChange={(e) => { setFilterClass(e.target.value); setCurrentPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm focus:border-blue-500 outline-none"
          >
            <option value="all">Semua Siswa</option>
            <option value="unassigned">Belum Punya Kelas</option>
            {classes.map(c => <option key={c} value={c}>Kelas {c}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div></div>
      ) : students.length > 0 ? (
        <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-600 w-1/3">Nama Siswa</th>
                <th className="px-4 py-3 font-semibold text-gray-600 w-1/4">NISN</th>
                <th className="px-4 py-3 font-semibold text-gray-600 w-1/4">Kelas Saat Ini</th>
                <th className="px-4 py-3 font-semibold text-gray-600 w-1/4 text-right">Pindahkan ke Kelas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedStudents.length > 0 ? paginatedStudents.map((s) => (
                <tr key={s.uid} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {editingNisnId === s.uid ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editNisnValue}
                          onChange={(e) => setEditNisnValue(e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 w-24 text-xs"
                          placeholder="NISN"
                        />
                        <button 
                          onClick={() => handleSaveNisn(s.uid)}
                          disabled={savingId === s.uid}
                          className="text-green-600 hover:text-green-800"
                        >
                          {savingId === s.uid ? '...' : <Save className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => setEditingNisnId(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between group">
                        <span className="text-gray-600">{s.nisn || '-'}</span>
                        <button 
                          onClick={() => {
                            setEditingNisnId(s.uid);
                            setEditNisnValue(s.nisn || '');
                          }}
                          className="text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.className ? (
                      <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-md text-xs font-semibold">{s.className}</span>
                    ) : (
                      <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-md text-xs font-semibold">Belum Ada Kelas</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <select
                      value={s.className || ''}
                      onChange={(e) => updateStudentClass(s.uid, e.target.value)}
                      disabled={savingId === s.uid}
                      className="border border-gray-300 rounded-lg px-2 py-1.5 bg-white text-xs w-full max-w-[150px] outline-none focus:border-blue-500 disabled:opacity-50"
                    >
                      <option value="">-- Tanpa Kelas / DO --</option>
                      {classes.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">
                    Tidak ada siswa yang sesuai dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          {filteredStudents.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
              <span className="text-sm text-gray-500">
                Menampilkan <span className="font-medium text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> hingga <span className="font-medium text-gray-900">{Math.min(currentPage * itemsPerPage, filteredStudents.length)}</span> dari <span className="font-medium text-gray-900">{filteredStudents.length}</span> siswa
              </span>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded-md bg-white border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Sebelumnya
                </button>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded-md bg-white border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <UserCircle className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 font-medium">Belum ada akun Siswa yang terdaftar di sistem.</p>
        </div>
      )}

      {/* Modal Kenaikan Kelas */}
      {showPromotionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Kenaikan Kelas Massal</h3>
              <button onClick={() => setShowPromotionModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg flex items-start text-sm text-blue-800">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <p>Fitur ini akan memindahkan <b>seluruh</b> siswa dari Kelas Asal ke Kelas Tujuan sekaligus. Pastikan Anda telah menyiapkan daftar Kelas Tujuan sebelumnya.</p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kelas Asal</label>
                  <select 
                    value={promotionSourceClass}
                    onChange={(e) => setPromotionSourceClass(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Pilih Kelas Asal --</option>
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                
                <div className="flex justify-center">
                  <div className="bg-gray-100 p-1 rounded-full">
                    <Upload className="w-5 h-5 text-gray-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kelas Tujuan / Status Baru</label>
                  <select 
                    value={promotionTargetClass}
                    onChange={(e) => setPromotionTargetClass(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Pilih Kelas Tujuan --</option>
                    {classes.filter(c => c !== promotionSourceClass).map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="LULUS" className="text-green-600 font-bold">Lulus / Cabut Kelas</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
              <button 
                onClick={() => setShowPromotionModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Batal
              </button>
              <button 
                onClick={handleMassPromotion}
                disabled={!promotionSourceClass || !promotionTargetClass || isPromoting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {isPromoting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Memproses...
                  </>
                ) : 'Proses Kenaikan Kelas'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KalenderAkademikPanel() {
  const [events, setEvents] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [status, setStatus] = React.useState<'idle'|'uploading'|'success'|'error'>('idle');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    
    try {
      const { base64, mimeType } = await new Promise<{base64: string, mimeType: string}>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const resultStr = reader.result?.toString();
          if (resultStr) {
            const split = resultStr.split(',');
            const mimeMatch = split[0].match(/:(.*?);/);
            const mimeType = mimeMatch ? mimeMatch[1] : file.type;
            resolve({ base64: split[1], mimeType });
          } else {
            reject(new Error("Failed to read image"));
          }
        };
        reader.onerror = error => reject(error);
      });

      const response = await fetch('/api/analyze-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType })
      });
      
      const data = await response.json();
      if (data.success && data.events) {
        setEvents(data.events);
        setStatus('success');
      } else {
        throw new Error(data.error || "Gagal memproses gambar");
      }
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  const handleEventChange = (index: number, field: string, value: any) => {
    const newEvents = [...events];
    newEvents[index][field] = value;
    setEvents(newEvents);
  };
  
  const addEvent = () => {
    setEvents([...events, { date: '', description: '', isHoliday: false }]);
  };
  
  const removeEvent = (index: number) => {
    setEvents(events.filter((_, i) => i !== index));
  };

  const [saveMessage, setSaveMessage] = React.useState('');

  const saveToFirebase = async () => {
    setLoading(true);
    setSaveMessage('');
    try {
      const res = await updateAcademicCalendar({ academic_calendar: events });
      if (res.isFailure) throw new Error(res.getError());
      setSaveMessage("Berhasil disimpan!");
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (e) {
      console.error(e);
      setSaveMessage("Gagal menyimpan data.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      const res = await getAcademicCalendar();
      if (res.isSuccess && res.getValue()?.academic_calendar) {
        setEvents(res.getValue()!.academic_calendar);
      }
      setLoading(false);
    };
    fetchEvents();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Kalender Akademik Pintar</h3>
          <p className="text-sm text-gray-500">Upload gambar kalender pendidikan dari dinas. Sistem AI akan otomatis mengekstrak jadwal ke dalam tabel yang bisa diedit.</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl text-center">
        <ImageIcon className="w-12 h-12 text-blue-400 mx-auto mb-3" />
        <h4 className="font-bold text-blue-900 mb-2">Upload Kalender Dinas (Gambar)</h4>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange} 
          className="mb-4 block w-full max-w-sm mx-auto text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
        />
        <button 
          onClick={handleUpload}
          disabled={!file || status === 'uploading'}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center mx-auto"
        >
          {status === 'uploading' ? (
            <><div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div> Menganalisis Gambar...</>
          ) : (
            <><Upload className="w-4 h-4 mr-2" /> Analisis dengan AI</>
          )}
        </button>
        {status === 'error' && <p className="text-red-500 text-sm mt-2 font-medium">Gagal menganalisis gambar. Silakan coba lagi.</p>}
        {status === 'success' && <p className="text-green-600 text-sm mt-2 font-medium">Berhasil mengekstrak {events.length} agenda!</p>}
      </div>

      {events.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-gray-900">Hasil Analisis & Editor Agenda</h4>
            <button onClick={addEvent} className="text-sm font-medium text-blue-600 flex items-center hover:text-blue-700">
              <Plus className="w-4 h-4 mr-1" /> Tambah Agenda
            </button>
          </div>
          
          <div className="space-y-3">
            {events.map((ev, idx) => (
              <div key={idx} className="flex space-x-3 items-center">
                <input 
                  type="text" 
                  value={ev.date}
                  onChange={e => handleEventChange(idx, 'date', e.target.value)}
                  placeholder="Tanggal (ex: 2026-07-15)"
                  className="w-48 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                />
                <input 
                  type="text" 
                  value={ev.description}
                  onChange={e => handleEventChange(idx, 'description', e.target.value)}
                  placeholder="Deskripsi Kegiatan"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                />
                <label className="flex items-center space-x-2 text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100">
                  <input 
                    type="checkbox" 
                    checked={!!ev.isHoliday}
                    onChange={e => handleEventChange(idx, 'isHoliday', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span>Libur KBM</span>
                </label>
                <button onClick={() => removeEvent(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end items-center space-x-4">
            {saveMessage && (
              <span className={`text-sm font-medium ${saveMessage.includes('Gagal') ? 'text-red-500' : 'text-green-600'}`}>
                {saveMessage}
              </span>
            )}
            <button 
              onClick={saveToFirebase}
              disabled={loading}
              className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-green-700 transition-colors flex items-center"
            >
              {loading ? "Menyimpan..." : <><CheckCircle2 className="w-5 h-5 mr-2" /> Simpan Kalender Akademik</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

