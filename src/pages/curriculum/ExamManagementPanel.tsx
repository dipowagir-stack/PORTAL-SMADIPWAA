import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Users, CalendarDays, Printer, Clock, AlertCircle, 
  FileText, Check, LayoutGrid, Shuffle, ArrowRightLeft, Sparkles,
  Maximize2, X, Download, HelpCircle, CheckCircle2, ChevronRight,
  Compass, DoorOpen, Armchair, Layers, BookOpen, CheckSquare
} from 'lucide-react';
import { 
  getExamRooms, getAssessments, getGrades, getClasses, 
  saveExamRoom, deleteExamRoom, getExamSchedules, saveExamSchedule, 
  deleteExamSchedule, publishExamSchedule, getUsersByRoles, getStudents,
  getMasterCurriculumConfig, getCurriculumConfig
} from '../../domains/academic/services';
import { useVirtualMode } from '../../contexts/VirtualModeContext';
import { ExamRoom, ExamSchedule } from '../../domains/academic/types';

export default function ExamManagementPanel({ 
  classes: externalClasses,
  teachers: externalTeachers,
  teachingLoads: externalLoads
}: { 
  classes?: string[];
  teachers?: any[];
  teachingLoads?: any[];
}) {
  const [activeSubTab, setActiveSubTab] = useState<'rooms' | 'schedules' | 'print'>('rooms');
  const [initialPrintRoomId, setInitialPrintRoomId] = useState<string | null>(null);
  const [initialPrintDocType, setInitialPrintDocType] = useState<'berita_acara' | 'denah_ruangan' | 'label_meja' | 'jadwal_ruangan'>('denah_ruangan');

  const handleQuickPrint = (roomId: string, docType: 'denah_ruangan' | 'label_meja' | 'berita_acara' | 'jadwal_ruangan') => {
    setInitialPrintRoomId(roomId);
    setInitialPrintDocType(docType);
    setActiveSubTab('print');
  };

  return (
    <div className="space-y-6" id="exam-management-container">
      {/* Sub Navigation Bar */}
      <div className="flex bg-white rounded-xl p-1.5 border border-gray-200 shadow-sm w-full md:w-max mx-auto print:hidden gap-1">
        <button 
          id="tab-rooms-btn"
          onClick={() => setActiveSubTab('rooms')} 
          className={`flex-1 md:flex-none px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
            activeSubTab === 'rooms' 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Pemetaan Ruang Ujian
        </button>
        <button 
          id="tab-schedules-btn"
          onClick={() => setActiveSubTab('schedules')} 
          className={`flex-1 md:flex-none px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
            activeSubTab === 'schedules' 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Jadwal & Pengawas (Multi-Mapel)
        </button>
        <button 
          id="tab-print-btn"
          onClick={() => setActiveSubTab('print')} 
          className={`flex-1 md:flex-none px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
            activeSubTab === 'print' 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Printer className="w-4 h-4" />
          Cetak Dokumen, Jadwal & Label
        </button>
      </div>

      {activeSubTab === 'rooms' && (
        <ExamRoomsManager 
          initialClasses={externalClasses} 
          onQuickPrint={handleQuickPrint} 
        />
      )}
      {activeSubTab === 'schedules' && (
        <ExamSchedulesManager 
          initialTeachers={externalTeachers}
          initialLoads={externalLoads}
          initialClasses={externalClasses}
        />
      )}
      {activeSubTab === 'print' && (
        <ExamPrintCenter 
          initialRoomId={initialPrintRoomId} 
          initialDocType={initialPrintDocType} 
        />
      )}
    </div>
  );
}

// Helper palette for class badges
const CLASS_COLORS = [
  { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', dot: 'bg-blue-500' },
  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', dot: 'bg-emerald-500' },
  { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', dot: 'bg-amber-500' },
  { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300', dot: 'bg-purple-500' },
  { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300', dot: 'bg-rose-500' },
  { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-300', dot: 'bg-cyan-500' },
  { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-300', dot: 'bg-indigo-500' },
  { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300', dot: 'bg-orange-500' },
];

function getClassColor(className: string, classList: string[]) {
  const idx = classList.indexOf(className);
  if (idx >= 0) return CLASS_COLORS[idx % CLASS_COLORS.length];
  return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300', dot: 'bg-gray-400' };
}

// ==========================================
// 1. PEMETAAN RUANG UJIAN (ROOMS MANAGER)
// ==========================================
function ExamRoomsManager({ 
  initialClasses, 
  onQuickPrint 
}: { 
  initialClasses?: string[]; 
  onQuickPrint: (roomId: string, docType: 'denah_ruangan' | 'label_meja' | 'berita_acara' | 'jadwal_ruangan') => void 
}) {
  const { isVirtualMode, vMaster, vUsers } = useVirtualMode();
  const defaultClassesList = ['X', 'XI-IPA', 'XII-IPA', 'XI-IPS', 'XII-IPS'];
  const [rooms, setRooms] = useState<ExamRoom[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<string[]>(() => {
    if (initialClasses && Array.isArray(initialClasses) && initialClasses.length > 0) {
      return initialClasses;
    }
    return defaultClassesList;
  });
  const [loading, setLoading] = useState(false);

  // Form State
  const [newRoomName, setNewRoomName] = useState('');
  const [format, setFormat] = useState('4x5');
  const [customCols, setCustomCols] = useState(4);
  const [customRows, setCustomRows] = useState(5);
  const [seatingPattern, setSeatingPattern] = useState<'zigzag' | 'sequential_col' | 'sequential_row' | 'random'>('zigzag');
  const [supervisorPosition, setSupervisorPosition] = useState<'center' | 'left' | 'right'>('center');
  const [doorPosition, setDoorPosition] = useState<'back_right' | 'back_left' | 'front_right' | 'front_left'>('back_right');
  const [numberingFlow, setNumberingFlow] = useState<'row_z' | 'col_vertical' | 'snake_s'>('col_vertical');
  const [selectedClasses, setSelectedClasses] = useState<{ className: string; quota: number }[]>([]);

  // Layout Generator State
  const [generatedLayout, setGeneratedLayout] = useState<(any | null)[][] | null>(null);
  const [allocatedStudents, setAllocatedStudents] = useState<any[]>([]);
  const [selectedSeatForSwap, setSelectedSeatForSwap] = useState<{ r: number; c: number } | null>(null);
  const [previewRoomModal, setPreviewRoomModal] = useState<ExamRoom | null>(null);

  useEffect(() => {
    fetchData();
  }, [initialClasses, isVirtualMode, vMaster, vUsers]);

  const fetchData = async () => {
    setLoading(true);
    try {
      try {
        const rs = await getExamRooms();
        setRooms(rs || []);
      } catch (err) {
        console.warn('Error loading exam rooms:', err);
      }

      const collectedClasses = new Set<string>();
      defaultClassesList.forEach(c => collectedClasses.add(c));

      let loadedStudents: any[] = [];

      // 1. Virtual Mode data if active
      if (isVirtualMode) {
        if (vMaster?.classes && Array.isArray(vMaster.classes)) {
          vMaster.classes.forEach((c: string) => {
            if (c && c) collectedClasses.add(c);
          });
        }
        if (vUsers && Array.isArray(vUsers)) {
          const vStudents = vUsers.filter((u: any) => u.role === 'student');
          loadedStudents = vStudents;
          vStudents.forEach((s: any) => {
            if (s.className && s.className) collectedClasses.add(s.className);
          });
        }
      }

      // 2. Initial Classes from props
      if (initialClasses && Array.isArray(initialClasses) && initialClasses.length > 0) {
        initialClasses.forEach((c: string) => {
          if (c && c) collectedClasses.add(c);
        });
      }

      // 3. Fetch from Master Curriculum Config
      try {
        const masterRes = await getMasterCurriculumConfig();
        const masterVal = masterRes.isSuccess ? (masterRes.getValue() as any) : null;
        if (masterVal?.classes) {
          masterVal.classes.forEach((c: string) => {
            if (c && c) collectedClasses.add(c);
          });
        }
      } catch (e) {
        console.warn('Could not load master config classes:', e);
      }

      // 4. Fetch from Curriculum Config ('master' doc)
      try {
        const configMaster = await getCurriculumConfig('master');
        if (configMaster.isSuccess && configMaster.getValue()?.classes) {
          configMaster.getValue()!.classes.forEach((c: string) => {
            if (c && c) collectedClasses.add(c);
          });
        }
      } catch (e) {
        console.warn('Could not load config master doc:', e);
      }

      // 5. Fetch from Academic Classes Collection
      try {
        const classesRes = await getClasses();
        if (classesRes.isSuccess && classesRes.getValue()) {
          classesRes.getValue().forEach((c: any) => {
            if (c.name && c.name) collectedClasses.add(c.name);
          });
        }
      } catch (e) {
        console.warn('Could not load academic classes:', e);
      }

      // 6. Fetch Students from DB
      if (loadedStudents.length === 0) {
        try {
          const res = await getStudents();
          if (res.isSuccess && res.getValue()) {
            loadedStudents = res.getValue();
          }
        } catch (e) {
          console.warn('Could not load students:', e);
        }
      }

      setStudents(loadedStudents);

      loadedStudents.forEach((s: any) => {
        if (s.className && s.className) {
          collectedClasses.add(s.className);
        }
      });

      const sortedClasses = Array.from(collectedClasses).sort();
      setClasses(sortedClasses);
    } catch (e) {
      console.error('Error fetching room data:', e);
    } finally {
      setLoading(false);
    }
  };

  const getDims = () => {
    if (format === 'custom') {
      return { cols: customCols, rows: customRows, capacity: customCols * customRows, formatStr: `${customCols}x${customRows}` };
    }
    const [c, r] = format.split('x').map(Number);
    return { cols: c, rows: r, capacity: c * r, formatStr: format };
  };

  const currentCapacity = getDims().capacity;
  const totalQuota = selectedClasses.reduce((acc, curr) => acc + (curr.quota || 0), 0);

  const handleAutoDistributeQuota = () => {
    if (selectedClasses.length === 0) return;
    const base = Math.floor(currentCapacity / selectedClasses.length);
    const rem = currentCapacity % selectedClasses.length;

    const updated = selectedClasses.map((item, idx) => ({
      ...item,
      quota: base + (idx < rem ? 1 : 0)
    }));
    setSelectedClasses(updated);
    setGeneratedLayout(null);
  };

  const handleFillWithRealCounts = () => {
    if (selectedClasses.length === 0) return;
    const updated = selectedClasses.map(item => {
      const countReal = students.filter(s => (s.className || '').toLowerCase() === item.className.toLowerCase()).length;
      return {
        ...item,
        quota: countReal > 0 ? countReal : 10
      };
    });
    setSelectedClasses(updated);
    setGeneratedLayout(null);
  };

  const handleSelectAllClasses = () => {
    if (classes.length === 0) return;
    const baseQuota = Math.max(1, Math.floor(currentCapacity / classes.length));
    const all = classes.map((c, idx) => ({
      className: c,
      quota: idx < currentCapacity ? baseQuota : 0
    }));
    setSelectedClasses(all.filter(x => x.quota > 0));
    setGeneratedLayout(null);
  };

  const handleClearSelectedClasses = () => {
    setSelectedClasses([]);
    setGeneratedLayout(null);
  };

  const handleGenerateLayout = () => {
    const { cols, rows, capacity } = getDims();

    if (!newRoomName) {
      alert('Mohon masukkan Nama / Kode Ruangan terlebih dahulu.');
      return;
    }

    if (selectedClasses.length === 0) {
      alert('Pilih minimal satu kelas dan tentukan kuota siswa.');
      return;
    }

    if (totalQuota > capacity) {
      alert(`Total kuota (${totalQuota}) melebihi kapasitas format bangku ruangan (${capacity}).`);
      return;
    }

    if (totalQuota === 0) {
      alert('Total kuota siswa tidak boleh 0.');
      return;
    }

    // Build Student Pools per class from database
    const classPools: { className: string; list: any[] }[] = [];
    const allAssignedStudents: any[] = [];

    selectedClasses.forEach(sc => {
      if (sc.quota <= 0) return;

      const realStudentsInClass = students
        .filter(s => (s.className || '').toLowerCase() === sc.className.toLowerCase())
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      const allocatedForThisClass: any[] = [];

      for (let i = 0; i < sc.quota; i++) {
        if (i < realStudentsInClass.length) {
          const st = realStudentsInClass[i];
          allocatedForThisClass.push({
            uid: st.uid || `std_${sc.className}_${i + 1}`,
            name: st.name || `Siswa ${i + 1}`,
            nisn: st.nisn || `NISN-${sc.className}-${String(i + 1).padStart(2, '0')}`,
            className: sc.className,
            isPlaceholder: false
          });
        } else {
          allocatedForThisClass.push({
            uid: `seat_slot_${sc.className}_${i + 1}_${Date.now()}`,
            name: `Peserta ${String(i + 1).padStart(2, '0')} (${sc.className})`,
            nisn: `PES-${sc.className}-${String(i + 1).padStart(2, '0')}`,
            className: sc.className,
            isPlaceholder: true
          });
        }
      }

      classPools.push({ className: sc.className, list: allocatedForThisClass });
      allAssignedStudents.push(...allocatedForThisClass);
    });

    // 1. Arrange student sequence based on Seating Pattern (Anti-contek cross class)
    let orderedStudents: (any | null)[] = [];

    if (seatingPattern === 'zigzag') {
      const copies = classPools.map(p => [...p.list]);
      let hasLeft = true;
      while (hasLeft) {
        hasLeft = false;
        for (let i = 0; i < copies.length; i++) {
          if (copies[i].length > 0) {
            orderedStudents.push(copies[i].shift());
            hasLeft = true;
          }
        }
      }
    } else if (seatingPattern === 'sequential_col' || seatingPattern === 'sequential_row') {
      orderedStudents = classPools.flatMap(p => p.list);
    } else if (seatingPattern === 'random') {
      const flatList = classPools.flatMap(p => p.list);
      for (let i = flatList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [flatList[i], flatList[j]] = [flatList[j], flatList[i]];
      }
      orderedStudents = flatList;
    }

    // 2. Populate Grid based on Numbering Flow (Acuan Posisi Meja & Penomoran)
    const grid: (any | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));

    if (numberingFlow === 'col_vertical') {
      // Lajur Kolom dari Depan ke Belakang (Column-first: Meja 1 di depan kiri, 2 di belakangnya, dst.)
      let idx = 0;
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (idx < orderedStudents.length) {
            const st = orderedStudents[idx];
            if (st) st.seatNumber = idx + 1;
            grid[r][c] = st;
            idx++;
          }
        }
      }
    } else if (numberingFlow === 'snake_s') {
      // Ular / Zig-zag baris
      let idx = 0;
      for (let r = 0; r < rows; r++) {
        if (r % 2 === 0) {
          for (let c = 0; c < cols; c++) {
            if (idx < orderedStudents.length) {
              const st = orderedStudents[idx];
              if (st) st.seatNumber = idx + 1;
              grid[r][c] = st;
              idx++;
            }
          }
        } else {
          for (let c = cols - 1; c >= 0; c--) {
            if (idx < orderedStudents.length) {
              const st = orderedStudents[idx];
              if (st) st.seatNumber = idx + 1;
              grid[r][c] = st;
              idx++;
            }
          }
        }
      }
    } else {
      // Row Z-Pattern (Kiri ke Kanan dari Baris Depan ke Belakang)
      let idx = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (idx < orderedStudents.length) {
            const st = orderedStudents[idx];
            if (st) st.seatNumber = idx + 1;
            grid[r][c] = st;
            idx++;
          }
        }
      }
    }

    setAllocatedStudents(allAssignedStudents);
    setGeneratedLayout(grid);
    setSelectedSeatForSwap(null);
  };

  const handleSeatClick = (r: number, c: number) => {
    if (!generatedLayout) return;

    if (!selectedSeatForSwap) {
      setSelectedSeatForSwap({ r, c });
    } else {
      // Swap the 2 seats
      const newGrid = generatedLayout.map(row => [...row]);
      const temp = newGrid[selectedSeatForSwap.r][selectedSeatForSwap.c];
      newGrid[selectedSeatForSwap.r][selectedSeatForSwap.c] = newGrid[r][c];
      newGrid[r][c] = temp;

      setGeneratedLayout(newGrid);
      setSelectedSeatForSwap(null);
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoomName || !generatedLayout) return;
    const { capacity, formatStr } = getDims();

    try {
      await saveExamRoom({
        name: newRoomName,
        capacity,
        format: formatStr,
        supervisorPosition,
        doorPosition,
        numberingFlow,
        layout: generatedLayout,
        students: allocatedStudents
      });

      // Reset form
      setNewRoomName('');
      setSelectedClasses([]);
      setGeneratedLayout(null);
      setAllocatedStudents([]);
      setSelectedSeatForSwap(null);
      fetchData();
      alert('Ruang ujian dan denah tempat duduk berhasil disimpan!');
    } catch (e) {
      console.error('Error saving exam room:', e);
      alert('Gagal menyimpan ruang ujian. Silakan coba lagi.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus "${name}"?`)) return;
    try {
      await deleteExamRoom(id);
      fetchData();
    } catch (e) {
      console.error('Error deleting exam room:', e);
      alert('Gagal menghapus ruang ujian.');
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-600 font-medium">Memuat data pemetaan ruang ujian...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6" id="exam-rooms-manager">
      {/* Left Column: Room Generator Form */}
      <div className="xl:col-span-5 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5 h-fit">
        <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-blue-600" />
              Buat & Atur Ruang Ujian
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Penataan meja pengawas, pintu, dan penomoran meja ujian</p>
          </div>
          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100">
            Kapasitas: {currentCapacity}
          </span>
        </div>

        {/* Room Name */}
        <div>
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
            Nama / Kode Ruangan <span className="text-red-500">*</span>
          </label>
          <input
            id="room-name-input"
            type="text"
            placeholder="Contoh: Ruang 01 (Kelas X / Lab)"
            value={newRoomName}
            onChange={e => setNewRoomName(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
        </div>

        {/* Format Selection */}
        <div>
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
            Format Bangku (Kolom x Baris)
          </label>
          <select
            id="room-format-select"
            value={format}
            onChange={e => {
              setFormat(e.target.value);
              setGeneratedLayout(null);
            }}
            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium text-gray-800"
          >
            <option value="4x5">4 Kolom x 5 Baris (20 Siswa - Standar Ujian)</option>
            <option value="5x4">5 Kolom x 4 Baris (20 Siswa - Meja Lebar)</option>
            <option value="4x6">4 Kolom x 6 Baris (24 Siswa)</option>
            <option value="5x5">5 Kolom x 5 Baris (25 Siswa)</option>
            <option value="5x6">5 Kolom x 6 Baris (30 Siswa - Ruang Besar)</option>
            <option value="5x7">5 Kolom x 7 Baris (35 Siswa)</option>
            <option value="6x6">6 Kolom x 6 Baris (36 Siswa - Aula)</option>
            <option value="custom">Kustom Baris & Kolom Sendiri...</option>
          </select>

          {format === 'custom' && (
            <div className="grid grid-cols-2 gap-3 mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Jumlah Kolom</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={customCols}
                  onChange={e => {
                    setCustomCols(Math.max(1, parseInt(e.target.value) || 1));
                    setGeneratedLayout(null);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-center font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Jumlah Baris</label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={customRows}
                  onChange={e => {
                    setCustomRows(Math.max(1, parseInt(e.target.value) || 1));
                    setGeneratedLayout(null);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-center font-bold"
                />
              </div>
            </div>
          )}
        </div>

        {/* Posisi Meja Pengawas & Pintu Masuk (Acuan Tata Letak) */}
        <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 uppercase">
            <Compass className="w-4 h-4 text-blue-600" />
            Acuan Tata Letak & Meja Pengawas
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Posisi Meja Pengawas */}
            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">Posisi Meja Pengawas</label>
              <select
                value={supervisorPosition}
                onChange={e => { setSupervisorPosition(e.target.value as any); setGeneratedLayout(null); }}
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white text-gray-800"
              >
                <option value="center">Depan Tengah (Center)</option>
                <option value="left">Depan Kiri (Left)</option>
                <option value="right">Depan Kanan (Right)</option>
              </select>
            </div>

            {/* Posisi Pintu Masuk */}
            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">Posisi Pintu Masuk</label>
              <select
                value={doorPosition}
                onChange={e => { setDoorPosition(e.target.value as any); setGeneratedLayout(null); }}
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white text-gray-800"
              >
                <option value="back_right">Belakang Kanan (Standar)</option>
                <option value="back_left">Belakang Kiri</option>
                <option value="front_right">Depan Kanan</option>
                <option value="front_left">Depan Kiri</option>
              </select>
            </div>
          </div>

          {/* Arah Penomoran Meja (Nomor Urut Ujian) */}
          <div>
            <label className="text-[11px] font-bold text-gray-700 block mb-1">
              Arah Penomoran Meja (Urutan Pasang Stiker Nomor Meja)
            </label>
            <select
              value={numberingFlow}
              onChange={e => { setNumberingFlow(e.target.value as any); setGeneratedLayout(null); }}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white text-gray-800"
            >
              <option value="col_vertical">🔽 Urut Lajur/Kolom (Depan ke Belakang - Standar Meja)</option>
              <option value="row_z">➡️ Urut Baris (Kiri ke Kanan / Z-Pattern)</option>
              <option value="snake_s">🔄 Urut Zig-Zag / Ular (S-Pattern)</option>
            </select>
          </div>
        </div>

        {/* Pola Distribusi Peserta */}
        <div>
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
            Pola Silang Kelas (Anti-Contek)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setSeatingPattern('zigzag'); setGeneratedLayout(null); }}
              className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                seatingPattern === 'zigzag'
                  ? 'border-blue-600 bg-blue-50/80 text-blue-800 ring-2 ring-blue-500/20'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Silang Otomatis
              </div>
              <p className="text-[11px] text-gray-500 font-normal">Antar-kelas disilang di setiap baris</p>
            </button>

            <button
              type="button"
              onClick={() => { setSeatingPattern('sequential_col'); setGeneratedLayout(null); }}
              className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                seatingPattern === 'sequential_col'
                  ? 'border-blue-600 bg-blue-50/80 text-blue-800 ring-2 ring-blue-500/20'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1 font-bold">
                <ChevronRight className="w-3.5 h-3.5 text-blue-600" />
                Blok per Kelas
              </div>
              <p className="text-[11px] text-gray-500 font-normal">Kelas dikelompokkan berurutan</p>
            </button>
          </div>
        </div>

        {/* Classes Selection & Quota */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Pilih Kelas & Alokasi Kuota Siswa <span className="text-red-500">*</span>
              </label>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Data real dari <strong>Parameter Kelas</strong> & <strong>Manajemen Siswa</strong>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoDistributeQuota}
                disabled={selectedClasses.length === 0}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold disabled:opacity-40 hover:underline"
              >
                Bagi Rata ({currentCapacity})
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={handleFillWithRealCounts}
                disabled={selectedClasses.length === 0}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold disabled:opacity-40 hover:underline"
              >
                Sesuai Data Siswa
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={selectedClasses.length === classes.length ? handleClearSelectedClasses : handleSelectAllClasses}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold hover:underline"
              >
                {selectedClasses.length === classes.length ? 'Reset' : 'Pilih Semua'}
              </button>
            </div>
          </div>

          <div className="space-y-1.5 max-h-52 overflow-y-auto border border-gray-200 p-2.5 rounded-xl bg-gray-50">
            {classes.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
                Belum ada data kelas yang terdaftar.
              </div>
            ) : (
              classes.map(c => {
                const sel = selectedClasses.find(sc => sc.className === c);
                const countReal = students.filter(s => (s.className || '').toLowerCase() === c.toLowerCase()).length;
                const color = getClassColor(c, classes);

                return (
                  <div 
                    key={c} 
                    className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                      sel 
                        ? 'bg-white border-blue-200 shadow-xs' 
                        : 'bg-white/60 border-transparent hover:bg-white hover:border-gray-200'
                    }`}
                  >
                    <label className="flex items-center space-x-2.5 flex-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!sel}
                        onChange={e => {
                          setGeneratedLayout(null);
                          if (e.target.checked) {
                            const initialQuota = Math.min(10, Math.max(1, countReal || 10));
                            setSelectedClasses([...selectedClasses, { className: c, quota: initialQuota }]);
                          } else {
                            setSelectedClasses(selectedClasses.filter(x => x.className !== c));
                          }
                        }}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <div>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold ${color.bg} ${color.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`}></span>
                          Kelas {c}
                        </span>
                        <span className="text-[11px] text-gray-400 ml-2">
                          ({countReal > 0 ? `${countReal} siswa terdata` : '0 siswa'})
                        </span>
                      </div>
                    </label>

                    {sel && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500 font-medium">Kuota:</span>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-sm font-bold text-center text-gray-800 bg-white focus:border-blue-500 outline-none"
                          value={sel.quota}
                          onChange={e => {
                            setGeneratedLayout(null);
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            setSelectedClasses(selectedClasses.map(x => x.className === c ? { ...x, quota: val } : x));
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Quota vs Capacity Summary Indicator */}
          <div className="mt-3 p-3 rounded-xl border flex items-center justify-between text-xs font-semibold bg-gray-50 border-gray-200">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span>Total Kuota Terpilih: <strong className="text-gray-900">{totalQuota} Siswa</strong></span>
            </div>
            <div className={`px-2.5 py-1 rounded-md text-xs font-bold ${
              totalQuota === currentCapacity
                ? 'bg-emerald-100 text-emerald-800'
                : totalQuota > currentCapacity
                ? 'bg-red-100 text-red-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {totalQuota === currentCapacity
                ? `Pas (${totalQuota}/${currentCapacity})`
                : totalQuota > currentCapacity
                ? `Kelebihan (+${totalQuota - currentCapacity})`
                : `Sisa Kursi (${currentCapacity - totalQuota})`}
            </div>
          </div>
        </div>

        {/* Generate / Action Buttons */}
        {!generatedLayout ? (
          <button
            id="generate-layout-btn"
            type="button"
            onClick={handleGenerateLayout}
            disabled={!newRoomName || selectedClasses.length === 0 || totalQuota > currentCapacity}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm flex items-center justify-center gap-2 text-sm"
          >
            <Sparkles className="w-4 h-4" />
            Generate Denah Ruang & Tata Letak
          </button>
        ) : (
          <div className="space-y-4 pt-2 border-t border-gray-100">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-xs text-emerald-800">
                <p className="font-bold">Denah Tempat Duduk Berhasil Digenerate!</p>
                <p className="text-emerald-700 mt-0.5">
                  Posisi meja pengawas dan penomoran meja telah diselaraskan. Klik 2 bangku untuk menukar tempat duduk jika diperlukan.
                </p>
              </div>
            </div>

            {/* Interactive Preview in Form Column with Supervisor Desk Indicator */}
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 overflow-x-auto space-y-4">
              {/* PAPAN TULIS & MEJA PENGAWAS */}
              <div className="space-y-1.5">
                <div className="text-center font-bold text-[10px] tracking-wider py-1 px-4 bg-gray-700 text-white rounded-md mx-auto w-4/5 shadow-xs">
                  PAPAN TULIS
                </div>
                <div className={`flex ${supervisorPosition === 'left' ? 'justify-start' : supervisorPosition === 'right' ? 'justify-end' : 'justify-center'}`}>
                  <div className="border-2 border-blue-600 bg-blue-50 text-blue-900 font-black text-xs px-4 py-2 rounded-lg flex items-center gap-2 shadow-xs">
                    <Armchair className="w-4 h-4 text-blue-600" />
                    MEJA PENGAWAS UJIAN ({supervisorPosition === 'left' ? 'KIRI' : supervisorPosition === 'right' ? 'KANAN' : 'TENGAH'})
                  </div>
                </div>
              </div>

              {/* Grid Bangku Peserta */}
              <div
                className="grid gap-2 mx-auto w-max"
                style={{ gridTemplateColumns: `repeat(${getDims().cols}, minmax(0, 1fr))` }}
              >
                {generatedLayout.map((row, rIdx) =>
                  row.map((seat, cIdx) => {
                    const isSelected = selectedSeatForSwap?.r === rIdx && selectedSeatForSwap?.c === cIdx;
                    const seatNum = seat?.seatNumber || (rIdx * getDims().cols + cIdx + 1);
                    const color = seat ? getClassColor(seat.className, classes) : null;

                    return (
                      <button
                        type="button"
                        key={`${rIdx}-${cIdx}`}
                        onClick={() => handleSeatClick(rIdx, cIdx)}
                        className={`w-18 h-18 rounded-lg border text-left p-1.5 flex flex-col justify-between transition-all duration-150 relative ${
                          isSelected
                            ? 'ring-2 ring-blue-600 scale-105 z-10 bg-blue-100 border-blue-500'
                            : seat
                            ? `${color?.bg} ${color?.border} hover:shadow-md cursor-pointer`
                            : 'bg-gray-100 border-dashed border-gray-300 text-gray-300'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="text-[10px] font-black text-gray-700 bg-white/80 px-1 rounded">
                            #{String(seatNum).padStart(2, '0')}
                          </span>
                          {seat && (
                            <span className={`text-[9px] font-bold px-1 rounded ${color?.bg} ${color?.text}`}>
                              {seat.className}
                            </span>
                          )}
                        </div>
                        {seat ? (
                          <span className="text-[10px] font-semibold text-gray-900 line-clamp-2 leading-tight">
                            {seat.name}
                          </span>
                        ) : (
                          <span className="text-center text-[10px] text-gray-400 font-medium">Kosong</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* PINTU MASUK MARKER */}
              <div className={`flex ${doorPosition.includes('left') ? 'justify-start' : 'justify-end'} pt-2`}>
                <div className="border border-dashed border-gray-400 bg-gray-100 text-gray-600 font-bold text-[10px] px-3 py-1 rounded-md flex items-center gap-1">
                  <DoorOpen className="w-3.5 h-3.5 text-gray-500" />
                  PINTU MASUK ({doorPosition.replace('_', ' ').toUpperCase()})
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setGeneratedLayout(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                Ubah Parameter
              </button>
              <button
                id="save-room-btn"
                type="button"
                onClick={handleCreateRoom}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Simpan Ruangan Ini
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Existing Exam Rooms List & Quick Actions */}
      <div className="xl:col-span-7 space-y-4" id="exam-rooms-list">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Daftar Ruangan Terpetakan</h3>
            <p className="text-xs text-gray-500">Total: {rooms.length} Ruangan Siap Digunakan</p>
          </div>
          {rooms.length > 0 && (
            <button
              onClick={() => onQuickPrint(rooms[0].id as string, 'denah_ruangan')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak Semua Dokumen
            </button>
          )}
        </div>

        {rooms.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <LayoutGrid className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-gray-800">Belum Ada Ruang Ujian</h4>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Gunakan formulir di sebelah kiri untuk membuat ruang ujian baru, memilih kelas, dan menata denah tempat duduk secara otomatis.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {rooms.map(room => {
              const cols = room.format ? parseInt(room.format.split('x')[0]) || 4 : 4;
              const uniqueClassesInRoom = Array.from(
                new Set((room.students || []).map((s: any) => s.className).filter(Boolean))
              ) as string[];

              return (
                <div
                  key={room.id}
                  className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow duration-200"
                >
                  {/* Card Header */}
                  <div className="px-5 py-4 bg-gray-50/80 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <h4 className="font-bold text-gray-900 text-base">{room.name}</h4>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                          {room.capacity} Siswa
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                          Format: {room.format || '-'}
                        </span>
                        {room.supervisorPosition && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            Meja Pengawas: {room.supervisorPosition === 'left' ? 'Kiri' : room.supervisorPosition === 'right' ? 'Kanan' : 'Tengah'}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                        <span>Kelas Peserta:</span>
                        {uniqueClassesInRoom.map(c => {
                          const color = getClassColor(c, classes);
                          return (
                            <span
                              key={c}
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${color.bg} ${color.text} border ${color.border}`}
                            >
                              {c}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        title="Lihat Denah Penuh"
                        onClick={() => setPreviewRoomModal(room)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-semibold flex items-center gap-1 border border-gray-200 bg-white"
                      >
                        <Maximize2 className="w-3.5 h-3.5" /> Denah
                      </button>

                      <button
                        title="Cetak Denah Ruangan (A4)"
                        onClick={() => onQuickPrint(room.id as string, 'denah_ruangan')}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-semibold flex items-center gap-1 border border-indigo-200 bg-white"
                      >
                        <Printer className="w-3.5 h-3.5" /> Cetak Denah
                      </button>

                      <button
                        title="Cetak Jadwal Ujian Ruangan (Tempel Dinding/Pintu)"
                        onClick={() => onQuickPrint(room.id as string, 'jadwal_ruangan')}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-semibold flex items-center gap-1 border border-blue-200 bg-white"
                      >
                        <CalendarDays className="w-3.5 h-3.5" /> Jadwal Dinding
                      </button>

                      <button
                        title="Cetak Label Meja Ujian"
                        onClick={() => onQuickPrint(room.id as string, 'label_meja')}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg text-xs font-semibold flex items-center gap-1 border border-emerald-200 bg-white"
                      >
                        <FileText className="w-3.5 h-3.5" /> Label Meja
                      </button>

                      <button
                        title="Hapus Ruangan"
                        onClick={() => handleDelete(room.id as string, room.name)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg border border-red-200 bg-white hover:text-red-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Visual Grid Thumbnail */}
                  <div className="p-4 bg-white overflow-x-auto">
                    {room.layout && room.format ? (
                      <div className="space-y-3">
                        <div
                          className="grid gap-1.5 mx-auto w-max"
                          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                        >
                          {room.layout.flat().map((seat, idx) => {
                            const color = seat ? getClassColor(seat.className, classes) : null;
                            const seatNum = seat?.seatNumber || (idx + 1);
                            return (
                              <div
                                key={idx}
                                className={`w-20 h-16 rounded-lg border p-1 flex flex-col justify-between text-left ${
                                  seat
                                    ? `${color?.bg} ${color?.border} shadow-2xs`
                                    : 'bg-gray-50 border-dashed border-gray-200'
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] font-bold text-gray-500">
                                    #{String(seatNum).padStart(2, '0')}
                                  </span>
                                  {seat && (
                                    <span className={`text-[8px] font-bold px-1 rounded ${color?.bg} ${color?.text}`}>
                                      {seat.className}
                                    </span>
                                  )}
                                </div>
                                {seat ? (
                                  <span className="text-[10px] font-semibold text-gray-800 line-clamp-1 leading-tight">
                                    {seat.name}
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-gray-300">-</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {(room.students || []).map((s, idx) => (
                          <div
                            key={s.uid || idx}
                            className="flex items-center text-xs border border-gray-100 rounded-lg p-2 bg-gray-50"
                          >
                            <span className="text-gray-400 font-bold mr-2 w-5">{idx + 1}.</span>
                            <span className="truncate flex-1 font-medium text-gray-800" title={s.name}>
                              {s.name}
                            </span>
                            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold ml-2">
                              {s.className}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Preview Denah Lengkap */}
      {previewRoomModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-xl">{previewRoomModal.name}</h3>
                <p className="text-xs text-gray-500">
                  Kapasitas: {previewRoomModal.capacity} Siswa | Format: {previewRoomModal.format} | 
                  Meja Pengawas: {previewRoomModal.supervisorPosition || 'Tengah'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const id = previewRoomModal.id as string;
                    setPreviewRoomModal(null);
                    onQuickPrint(id, 'denah_ruangan');
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak Denah
                </button>
                <button
                  onClick={() => setPreviewRoomModal(null)}
                  className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Visual Full Stage */}
            <div className="border-2 border-gray-300 rounded-2xl p-6 bg-gray-50 space-y-6">
              {/* PAPAN TULIS & MEJA PENGAWAS */}
              <div className="space-y-2">
                <div className="text-center font-bold text-xs py-1.5 px-6 bg-gray-800 text-white rounded-lg mx-auto w-3/4 shadow-sm">
                  PAPAN TULIS
                </div>
                <div className={`flex ${previewRoomModal.supervisorPosition === 'left' ? 'justify-start' : previewRoomModal.supervisorPosition === 'right' ? 'justify-end' : 'justify-center'}`}>
                  <div className="border-2 border-blue-600 bg-blue-50 text-blue-900 font-bold text-sm px-6 py-2.5 rounded-xl shadow-xs flex items-center gap-2">
                    <Armchair className="w-5 h-5 text-blue-600" />
                    MEJA PENGAWAS UJIAN
                  </div>
                </div>
              </div>

              {previewRoomModal.layout && previewRoomModal.format && (
                <div
                  className="grid gap-3 mx-auto w-max"
                  style={{
                    gridTemplateColumns: `repeat(${previewRoomModal.format.split('x')[0]}, minmax(0, 1fr))`
                  }}
                >
                  {previewRoomModal.layout.flat().map((seat, idx) => {
                    const color = seat ? getClassColor(seat.className, classes) : null;
                    const seatNum = seat?.seatNumber || (idx + 1);
                    return (
                      <div
                        key={idx}
                        className={`w-28 h-24 rounded-xl border-2 p-2 flex flex-col justify-between ${
                          seat
                            ? `${color?.bg} ${color?.border} shadow-sm`
                            : 'bg-gray-100 border-dashed border-gray-300'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-gray-700 bg-white/80 px-1 rounded">
                            #{seatNum}
                          </span>
                          {seat && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${color?.bg} ${color?.text}`}>
                              {seat.className}
                            </span>
                          )}
                        </div>
                        {seat ? (
                          <div>
                            <p className="text-xs font-bold text-gray-900 line-clamp-2 leading-tight">{seat.name}</p>
                            <p className="text-[10px] text-gray-500 font-mono mt-0.5">{seat.nisn}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium text-center">Kosong</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-gray-200 text-xs text-gray-500 font-bold">
                <span>▲ DEPAN RUANGAN</span>
                <span className="flex items-center gap-1">
                  <DoorOpen className="w-4 h-4 text-gray-600" />
                  PINTU MASUK ({previewRoomModal.doorPosition || 'Belakang Kanan'})
                </span>
                <span>BELAKANG RUANGAN ▼</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 2. JADWAL & PENGAWAS (MULTI-MAPEL PER HARI)
// ==========================================
const STANDARD_EXAM_SUBJECTS = [
  'Pendidikan Agama Islam & Budi Pekerti',
  'Pendidikan Pancasila & Kewarganegaraan (PPKn)',
  'Bahasa Indonesia',
  'Matematika Wajib',
  'Bahasa Inggris',
  'Sejarah Indonesia',
  'Seni Budaya',
  'Pendidikan Jasmani, Olahraga & Kesehatan (PJOK)',
  'Informatika',
  'Prakarya & Kewirausahaan (PKWU)',
  'Bahasa Arab',
  'Matematika Peminatan',
  'Fisika',
  'Kimia',
  'Biologi',
  'Geografi',
  'Sosiologi',
  'Ekonomi',
  'Sejarah Peminatan'
];

interface DailySessionRow {
  sessionName: string;
  startTime: string;
  endTime: string;
  subject: string;
  subjectsMapping?: Record<string, string>;
  supervisorId: string;
}

function ExamSchedulesManager({
  initialTeachers,
  initialLoads,
  initialClasses
}: {
  initialTeachers?: any[];
  initialLoads?: any[];
  initialClasses?: string[];
}) {
  const { isVirtualMode, vMaster, vUsers } = useVirtualMode();
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [rooms, setRooms] = useState<ExamRoom[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<string[]>(STANDARD_EXAM_SUBJECTS);
  const [loading, setLoading] = useState(true);

  // Form State
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [targetRoomId, setTargetRoomId] = useState<string>('');
  const [applyToAllRooms, setApplyToAllRooms] = useState<boolean>(false);

  // Multi-session Builder State (1 to 3+ sessions in one day)
  const [sessions, setSessions] = useState<DailySessionRow[]>([
    { sessionName: 'Sesi 1 (Pagi)', startTime: '07:30', endTime: '09:00', subject: '', supervisorId: '' },
    { sessionName: 'Sesi 2 (Siang)', startTime: '09:30', endTime: '11:00', subject: '', supervisorId: '' }
  ]);

  useEffect(() => {
    fetchData();
  }, [initialTeachers, initialLoads, isVirtualMode, vMaster, vUsers]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Rooms & Schedules
      const rs = await getExamRooms();
      setRooms(rs || []);
      if (rs && rs.length > 0 && !targetRoomId) {
        setTargetRoomId(rs[0].id as string);
      }
      const sc = await getExamSchedules();
      setSchedules(sc || []);

      // 2. Fetch Strictly REAL Teachers from Database & System (No fake fallback dummy data)
      const teacherMap = new Map<string, any>();

      // A. From virtual mode vUsers if active
      if (isVirtualMode && vUsers && Array.isArray(vUsers)) {
        vUsers.forEach((u: any) => {
          const isTeacherRole = 
            ['teacher', 'admin', 'super_admin', 'curriculum', 'tu'].includes(u.role) ||
            (Array.isArray(u.roles) && u.roles.some((r: string) => ['teacher', 'admin', 'super_admin', 'curriculum', 'tu'].includes(r)));
          if (isTeacherRole && u.name) {
            const uid = u.uid || u.id;
            teacherMap.set(uid, {
              uid,
              name: u.name,
              role: u.role || 'teacher',
              nip: u.nip || '',
              teachingSubjects: u.teachingSubjects || []
            });
          }
        });
      }

      // B. From props initialTeachers
      if (initialTeachers && Array.isArray(initialTeachers) && initialTeachers.length > 0) {
        initialTeachers.forEach((t: any) => {
          const uid = t.uid || t.id;
          if (uid && t.name) {
            teacherMap.set(uid, {
              ...teacherMap.get(uid),
              uid,
              name: t.name,
              role: t.role || 'teacher',
              nip: t.nip || teacherMap.get(uid)?.nip || '',
              teachingSubjects: t.teachingSubjects || teacherMap.get(uid)?.teachingSubjects || []
            });
          }
        });
      }

      // C. From Database Users by Role
      try {
        const res = await getUsersByRoles(['teacher', 'curriculum', 'admin', 'super_admin', 'tu']);
        if (res.isSuccess && Array.isArray(res.getValue())) {
          res.getValue().forEach((u: any) => {
            const uid = u.uid || u.id;
            if (uid && u.name) {
              teacherMap.set(uid, {
                ...teacherMap.get(uid),
                uid,
                name: u.name,
                role: u.role || 'teacher',
                nip: u.nip || teacherMap.get(uid)?.nip || '',
                teachingSubjects: u.teachingSubjects || teacherMap.get(uid)?.teachingSubjects || []
              });
            }
          });
        }
      } catch (e) {
        console.warn('Could not fetch DB teachers:', e);
      }

      // D. Attach taught subjects from teaching loads
      const allLoads = [
        ...(initialLoads || []),
        ...(vMaster?.teachingLoads || [])
      ];

      allLoads.forEach((ld: any) => {
        if (ld.teacherId && teacherMap.has(ld.teacherId) && ld.subject) {
          const t = teacherMap.get(ld.teacherId);
          const currentSubjects = t.teachingSubjects || [];
          if (!currentSubjects.includes(ld.subject)) {
            t.teachingSubjects = [...currentSubjects, ld.subject];
            teacherMap.set(ld.teacherId, t);
          }
        }
      });

      const loadedTeachers = Array.from(teacherMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      setTeachers(loadedTeachers);

      // 3. Fetch Subjects
      const subjectsSet = new Set<string>(STANDARD_EXAM_SUBJECTS);

      if (vMaster?.subjects && Array.isArray(vMaster.subjects)) {
        vMaster.subjects.forEach((s: string) => {
          if (s && s) subjectsSet.add(s);
        });
      }

      allLoads.forEach((ld: any) => {
        if (ld.subject && ld.subject) {
          subjectsSet.add(ld.subject);
        }
      });

      try {
        const masterRes = await getMasterCurriculumConfig();
        const masterVal = masterRes.isSuccess ? (masterRes.getValue() as any) : null;
        if (masterVal?.subjects && Array.isArray(masterVal.subjects)) {
          masterVal.subjects.forEach((s: string) => {
            if (s && s) subjectsSet.add(s);
          });
        }
      } catch (e) {
        console.warn('Could not fetch master config subjects:', e);
      }

      setSubjectsList(Array.from(subjectsSet));
    } catch (e) {
      console.error('Error fetching exam schedule dependencies:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSessionRow = () => {
    const nextIdx = sessions.length + 1;
    let defStart = '11:15';
    let defEnd = '12:45';
    if (nextIdx === 3) {
      defStart = '11:15';
      defEnd = '12:45';
    } else if (nextIdx === 4) {
      defStart = '13:00';
      defEnd = '14:30';
    }
    setSessions([
      ...sessions,
      {
        sessionName: `Sesi ${nextIdx}`,
        startTime: defStart,
        endTime: defEnd,
        subject: '',
        supervisorId: ''
      }
    ]);
  };

  const handleRemoveSessionRow = (index: number) => {
    if (sessions.length <= 1) {
      alert('Minimal harus ada 1 sesi ujian.');
      return;
    }
    setSessions(sessions.filter((_, i) => i !== index));
  };

  const handleUpdateSession = (index: number, field: keyof DailySessionRow, value: string) => {
    const updated = [...sessions];
    updated[index] = { ...updated[index], [field]: value };
    setSessions(updated);
  };

  const handleApplyPreset = (presetType: '1_sesi' | '2_sesi' | '3_sesi') => {
    if (presetType === '1_sesi') {
      setSessions([
        { sessionName: 'Sesi 1 (Pagi)', startTime: '07:30', endTime: '09:00', subject: '', supervisorId: '' }
      ]);
    } else if (presetType === '2_sesi') {
      setSessions([
        { sessionName: 'Sesi 1 (Pagi)', startTime: '07:30', endTime: '09:00', subject: '', supervisorId: '' },
        { sessionName: 'Sesi 2 (Siang)', startTime: '09:30', endTime: '11:00', subject: '', supervisorId: '' }
      ]);
    } else if (presetType === '3_sesi') {
      setSessions([
        { sessionName: 'Sesi 1 (Pagi)', startTime: '07:30', endTime: '09:00', subject: '', supervisorId: '' },
        { sessionName: 'Sesi 2 (Pagi Ke-2)', startTime: '09:30', endTime: '11:00', subject: '', supervisorId: '' },
        { sessionName: 'Sesi 3 (Siang)', startTime: '11:15', endTime: '12:45', subject: '', supervisorId: '' }
      ]);
    }
  };

  const handleSaveAllSessions = async () => {
    if (!date) {
      alert('Mohon pilih tanggal pelaksanaan.');
      return;
    }

    if (!applyToAllRooms && !targetRoomId) {
      alert('Mohon pilih ruangan ujian.');
      return;
    }

    // Validate sessions
    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      if (!s.subject) {
        alert(`Mata pelajaran untuk ${s.sessionName || `Sesi ${i + 1}`} belum diisi.`);
        return;
      }
      if (!s.supervisorId) {
        alert(`Guru pengawas untuk ${s.sessionName || `Sesi ${i + 1}`} belum dipilih.`);
        return;
      }
    }

    const targetRooms = applyToAllRooms ? rooms : rooms.filter(r => r.id === targetRoomId);

    if (targetRooms.length === 0) {
      alert('Tidak ada ruangan yang tersedia.');
      return;
    }

    try {
      let countSaved = 0;
      for (const room of targetRooms) {
        for (const ses of sessions) {
          const teacher = teachers.find(t => t.uid === ses.supervisorId);
          await saveExamSchedule({
            date,
            sessionName: ses.sessionName,
            startTime: ses.startTime,
            endTime: ses.endTime,
            subject: ses.subject,
            subjectsMapping: ses.subjectsMapping,
            roomId: room.id as string,
            roomName: room.name,
            supervisorId: ses.supervisorId,
            supervisorName: teacher?.name || 'Pengawas',
            status: 'draft',
            academicYear: '2024/2025',
            semester: 'Ganjil'
          });
          countSaved++;
        }
      }

      fetchData();
      alert(`Berhasil menyimpan ${countSaved} jadwal sesi ujian (Draft)!`);
    } catch (e) {
      console.error('Error saving multi-session schedule:', e);
      alert('Gagal menyimpan jadwal ujian.');
    }
  };

  const handlePublish = async (id: string) => {
    if (!confirm('Setelah diterbitkan, jadwal ini akan aktif dan muncul di Berita Acara & Jadwal Guru Pengawas. Lanjutkan?')) return;
    try {
      await publishExamSchedule(id);
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Gagal menerbitkan jadwal.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus jadwal ujian ini?')) return;
    try {
      await deleteExamSchedule(id);
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Gagal menghapus jadwal.');
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-600 font-medium">Memuat jadwal ujian, daftar guru sistem, dan mata pelajaran...</p>
      </div>
    );
  }

  const grouped = schedules.reduce((acc, curr) => {
    if (!acc[curr.date]) acc[curr.date] = [];
    acc[curr.date].push(curr);
    return acc;
  }, {} as Record<string, ExamSchedule[]>);

  const targetRoomsForClasses = applyToAllRooms ? rooms : rooms.filter(r => r.id === targetRoomId);
  const uniqueTargetClasses = Array.from(
    new Set(
      targetRoomsForClasses.flatMap(r => (r.students || []).map((s: any) => s.className).filter(Boolean))
    )
  ).sort() as string[];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6" id="exam-schedules-manager">
      {/* Left Column: Form Multi-Session Schedule Builder */}
      <div className="xl:col-span-6 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5 h-fit">
        <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              Penjadwalan Ujian Harian (Multi-Mapel & Pengawas)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Atur 1-3 sesi mata pelajaran dan guru pengawas per hari</p>
          </div>
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-100 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> {teachers.length} Guru Sistem
          </span>
        </div>

        <div className="space-y-4">
          {/* Tanggal & Ruangan Target */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                Tanggal Pelaksanaan <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                Pilih Ruangan Ujian <span className="text-red-500">*</span>
              </label>
              <select
                disabled={applyToAllRooms}
                value={targetRoomId}
                onChange={e => setTargetRoomId(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 disabled:bg-gray-100"
              >
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.capacity} Siswa)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Opsi Terapkan ke Semua Ruangan */}
          <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-200">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={applyToAllRooms}
                onChange={e => setApplyToAllRooms(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span>Terapkan susunan sesi ini serentak ke <strong>Semua {rooms.length} Ruangan</strong></span>
            </label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => handleApplyPreset('1_sesi')}
                className="text-[11px] font-bold px-2 py-0.5 bg-white border border-gray-200 rounded text-gray-600 hover:bg-gray-100"
              >
                1 Mapel
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('2_sesi')}
                className="text-[11px] font-bold px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-blue-700 hover:bg-blue-100"
              >
                2 Mapel (Standar)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('3_sesi')}
                className="text-[11px] font-bold px-2 py-0.5 bg-white border border-gray-200 rounded text-gray-600 hover:bg-gray-100"
              >
                3 Mapel
              </button>
            </div>
          </div>

          {/* Multi-Session Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Daftar Sesi Ujian Hari Ini ({sessions.length} Sesi)
              </label>
              <button
                type="button"
                onClick={handleAddSessionRow}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Sesi Ujian
              </button>
            </div>

            {sessions.map((ses, idx) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={ses.sessionName}
                      onChange={e => handleUpdateSession(idx, 'sessionName', e.target.value)}
                      placeholder="Nama Sesi (contoh: Sesi 1)"
                      className="font-bold text-sm text-gray-900 bg-transparent border-b border-dashed border-gray-300 focus:border-blue-500 outline-none w-36"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs text-gray-600 bg-white px-2 py-1 rounded-lg border border-gray-200">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <input
                        type="time"
                        value={ses.startTime}
                        onChange={e => handleUpdateSession(idx, 'startTime', e.target.value)}
                        className="bg-transparent text-xs font-bold outline-none"
                      />
                      <span>-</span>
                      <input
                        type="time"
                        value={ses.endTime}
                        onChange={e => handleUpdateSession(idx, 'endTime', e.target.value)}
                        className="bg-transparent text-xs font-bold outline-none"
                      />
                    </div>
                    {sessions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSessionRow(idx)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                        title="Hapus Sesi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Subject Selection for this Session */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-gray-700">
                      Mata Pelajaran Sesi {idx + 1} <span className="text-red-500">*</span>
                    </label>
                  </div>

                  {uniqueTargetClasses.length > 1 ? (
                    <div className="space-y-2 mb-2 p-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                      {uniqueTargetClasses.map(cls => (
                        <div key={cls} className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-gray-600 bg-gray-200 px-2 py-1 rounded w-20 text-center truncate" title={`Kelas ${cls}`}>Kelas {cls}</span>
                          <div className="flex-1">
                            <input
                              type="text"
                              list={`subjects-list-${idx}`}
                              placeholder="Pilih/Ketik Mapel..."
                              value={ses.subjectsMapping?.[cls] || ''}
                              onChange={e => {
                                const newMapping = { ...(ses.subjectsMapping || {}), [cls]: e.target.value };
                                const subjectsStr = Object.entries(newMapping)
                                  .filter(([_, v]) => v)
                                  .map(([k, v]) => `Kls ${k}: ${v}`)
                                  .join(' | ');
                                
                                const updatedSessions = [...sessions];
                                updatedSessions[idx] = { 
                                  ...ses, 
                                  subjectsMapping: newMapping, 
                                  subject: subjectsStr 
                                };

                                // Auto-suggest supervisor logic
                                if (e.target.value && !ses.supervisorId) {
                                  const newSub = e.target.value;
                                  const match = teachers.find(t => 
                                    t.teachingSubjects && t.teachingSubjects.some((ts: string) => 
                                      ts.toLowerCase().includes(newSub.toLowerCase()) || 
                                      newSub.toLowerCase().includes(ts.toLowerCase())
                                    )
                                  );
                                  if (match) {
                                    updatedSessions[idx].supervisorId = match.uid;
                                  }
                                }
                                setSessions(updatedSessions);
                              }}
                              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                          </div>
                        </div>
                      ))}
                      <datalist id={`subjects-list-${idx}`}>
                        {subjectsList.map((s, i) => (
                          <option key={i} value={s} />
                        ))}
                      </datalist>
                    </div>
                  ) : (
                    <>
                      <select
                        value={ses.subject}
                        onChange={e => {
                          const newSub = e.target.value;
                          handleUpdateSession(idx, 'subject', newSub);
                          // Auto-suggest real teacher for this subject
                          if (newSub && !ses.supervisorId) {
                            const match = teachers.find(t => 
                              t.teachingSubjects && t.teachingSubjects.some((ts: string) => 
                                ts.toLowerCase().includes(newSub.toLowerCase()) || 
                                newSub.toLowerCase().includes(ts.toLowerCase())
                              )
                            );
                            if (match) {
                              handleUpdateSession(idx, 'supervisorId', match.uid);
                            }
                          }
                        }}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 mb-1.5"
                      >
                        <option value="">-- Pilih Mata Pelajaran --</option>
                        <optgroup label="Muatan Umum">
                          {subjectsList.slice(0, 11).map((sub, sIdx) => (
                            <option key={sIdx} value={sub}>{sub}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Peminatan & Lainnya">
                          {subjectsList.slice(11).map((sub, sIdx) => (
                            <option key={sIdx} value={sub}>{sub}</option>
                          ))}
                        </optgroup>
                      </select>

                      <input
                        type="text"
                        list={`subjects-list-${idx}`}
                        placeholder="Atau ketik nama mata pelajaran..."
                        value={ses.subject}
                        onChange={e => handleUpdateSession(idx, 'subject', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700 bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                      <datalist id={`subjects-list-${idx}`}>
                        {subjectsList.map((s, i) => (
                          <option key={i} value={s} />
                        ))}
                      </datalist>
                    </>
                  )}
                </div>

                {/* Supervisor Selection for this Session (Strictly Real System Teachers) */}
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">
                    Guru Pengawas Sesi {idx + 1} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={ses.supervisorId}
                    onChange={e => handleUpdateSession(idx, 'supervisorId', e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  >
                    <option value="">-- Pilih Guru Pengawas Sesi Ini --</option>
                    {teachers.map(t => {
                      const subStr = t.teachingSubjects && t.teachingSubjects.length > 0 ? ` (Guru ${t.teachingSubjects[0]})` : '';
                      return (
                        <option key={t.uid} value={t.uid}>
                          {t.name} {t.nip ? `[NIP: ${t.nip}]` : ''}{subStr}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <button
            id="schedule-save-all-btn"
            onClick={handleSaveAllSessions}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow"
          >
            <Check className="w-4 h-4" /> Simpan Semua Jadwal Sesi Hari Ini
          </button>
        </div>
      </div>

      {/* Right Column: Daftar Jadwal Ujian Terstruktur */}
      <div className="xl:col-span-6 space-y-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-indigo-600" />
              Daftar Jadwal Pelaksanaan Ujian
            </h3>
            <p className="text-xs text-gray-500">Total: {schedules.length} Sesi Terjadwal</p>
          </div>
          {schedules.length > 0 && (
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-200">
              {Object.keys(grouped).length} Hari Pelaksanaan
            </span>
          )}
        </div>

        {Object.keys(grouped).length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <CalendarDays className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-gray-800">Belum Ada Jadwal Ujian</h4>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Gunakan formulir multi-sesi di sebelah kiri untuk mengatur 1-3 mata pelajaran dan menetapkan guru pengawas harian.
            </p>
          </div>
        ) : (
          Object.keys(grouped)
            .sort()
            .map(d => (
              <div key={d} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="px-5 py-3.5 bg-gray-50/90 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-blue-600" />
                    <h4 className="font-bold text-gray-900 text-sm">
                      {new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </h4>
                  </div>
                  <span className="text-xs font-semibold text-gray-500 bg-white px-2 py-0.5 rounded-md border border-gray-200">
                    {grouped[d].length} Sesi
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {grouped[d]
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map(s => (
                      <div key={s.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            {s.sessionName && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-800">
                                {s.sessionName}
                              </span>
                            )}
                            <span className="font-bold text-gray-900 text-base">{s.subject}</span>
                            {s.status === 'draft' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                DRAFT
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> DITERBITKAN
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-600 flex flex-wrap items-center gap-4">
                            <span className="flex items-center gap-1 font-semibold text-gray-700">
                              <Clock className="w-3.5 h-3.5 text-blue-600" />
                              {s.startTime} - {s.endTime}
                            </span>
                            <span className="flex items-center gap-1 font-semibold text-gray-700">
                              <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
                              {s.roomName}
                            </span>
                            <span className="flex items-center gap-1 bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded-md border border-emerald-100 font-medium">
                              <Users className="w-3.5 h-3.5 text-emerald-600" />
                              Pengawas: <strong>{s.supervisorName}</strong>
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {s.status === 'draft' && (
                            <button
                              onClick={() => handlePublish(s.id as string)}
                              className="px-3.5 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-bold shadow-xs transition-colors"
                            >
                              Terbitkan
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(s.id as string)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl border border-red-200 hover:text-red-700 transition-colors"
                            title="Hapus Jadwal"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

// ==========================================
// 3. CETAK DOKUMEN, JADWAL & LABEL
// ==========================================
export function ExamPrintCenter({
  initialRoomId,
  initialDocType
}: {
  initialRoomId?: string | null;
  initialDocType?: 'berita_acara' | 'denah_ruangan' | 'label_meja' | 'jadwal_ruangan';
}) {
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [rooms, setRooms] = useState<ExamRoom[]>([]);
  const [dateFilter, setDateFilter] = useState('');
  const [docType, setDocType] = useState<'berita_acara' | 'denah_ruangan' | 'label_meja' | 'jadwal_ruangan'>(
    initialDocType || 'denah_ruangan'
  );
  const [roomFilter, setRoomFilter] = useState<string>(initialRoomId || '');

  useEffect(() => {
    if (initialRoomId) setRoomFilter(initialRoomId);
    if (initialDocType) setDocType(initialDocType);
  }, [initialRoomId, initialDocType]);

  useEffect(() => {
    getExamSchedules().then(s => setSchedules(s));
    getExamRooms().then(r => {
      setRooms(r);
      if (!roomFilter && r.length > 0 && !initialRoomId) {
        setRoomFilter(r[0].id as string);
      }
    });
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const filteredRooms = rooms.filter(r => (roomFilter ? r.id === roomFilter : true));
  const filteredSchedules = schedules.filter(s => {
    const matchDate = dateFilter ? s.date === dateFilter : true;
    const matchRoom = roomFilter ? s.roomId === roomFilter : true;
    return matchDate && matchRoom;
  });

  return (
    <div className="space-y-6" id="exam-print-center">
      {/* Control Panel (Hidden on Print) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-end justify-between gap-4 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 w-full">
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase tracking-wider">
              Pilih Jenis Dokumen Cetak
            </label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value as any)}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold bg-white outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="denah_ruangan">📄 Denah Tempat Duduk Ruangan (A4)</option>
              <option value="jadwal_ruangan">📅 Jadwal Ujian Ruangan (Ditempel di Pintu / Dinding)</option>
              <option value="label_meja">🏷️ Label Meja / Nomor Meja Peserta Ujian</option>
              <option value="berita_acara">📋 Berita Acara & Daftar Hadir Peserta</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase tracking-wider">
              Pilih Ruangan
            </label>
            <select
              value={roomFilter}
              onChange={e => setRoomFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-medium bg-white outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Semua Ruangan ({rooms.length}) --</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.capacity} Siswa - {r.format})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm flex items-center justify-center gap-2 h-[42px]"
        >
          <Printer className="w-4 h-4" /> Cetak Dokumen (PDF/Printer)
        </button>
      </div>

      {/* Printable Preview Area */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 overflow-x-auto">
        {/* 1. DENAH TEMPAT DUDUK RUANGAN (A4) WITH SUPERVISOR DESK & NUMBERING ORIENTATION */}
        {docType === 'denah_ruangan' && (
          filteredRooms.length === 0 ? (
            <p className="text-center text-gray-500 py-12">Tidak ada ruangan yang dipilih atau belum ada ruangan.</p>
          ) : (
            filteredRooms.map(room => {
              const cols = room.format ? parseInt(room.format.split('x')[0]) || 4 : 4;
              const supervisorPos = room.supervisorPosition || 'center';

              return (
                <div
                  key={room.id}
                  className="print-page w-full max-w-4xl mx-auto bg-white p-8 mb-8 border border-gray-300 rounded-xl shadow-xs print:border-none print:shadow-none print:p-0 print:m-0"
                  style={{ pageBreakAfter: 'always' }}
                >
                  {/* Header Kop Resmi */}
                  <div className="flex items-center gap-6 border-b-2 border-black pb-4 mb-6">
                    <img src="/logo.png" alt="Logo Sekolah" className="w-20 h-20 object-contain" />
                    <div className="flex-1 text-center pr-26">
                      <h2 className="font-bold text-lg tracking-wider uppercase">SMAS ISLAM DIPONEGORO WAGIR</h2>
                      <h1 className="font-black text-xl uppercase mt-0.5">DENAH TEMPAT DUDUK PESERTA UJIAN</h1>
                      <p className="text-xs text-gray-600">Tahun Ajaran 2024/2025 • Semester Ganjil</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm font-bold mb-6 px-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">RUANGAN:</span>
                      <span className="text-black uppercase text-base">{room.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">KAPASITAS:</span>
                      <span>{room.capacity} Siswa ({room.format})</span>
                    </div>
                  </div>

                  {/* Seating Canvas with Supervisor Desk */}
                  <div className="border-2 border-black rounded-xl p-6 bg-white space-y-6">
                    {/* PAPAN TULIS */}
                    <div className="text-center font-bold text-xs py-1 px-4 bg-gray-200 border border-black mx-auto w-3/4">
                      PAPAN TULIS
                    </div>

                    {/* MEJA PENGAWAS */}
                    <div className={`flex ${supervisorPos === 'left' ? 'justify-start' : supervisorPos === 'right' ? 'justify-end' : 'justify-center'}`}>
                      <div className="text-center font-bold text-sm py-2 px-8 bg-gray-100 border-2 border-black">
                        🪑 MEJA PENGAWAS UJIAN
                      </div>
                    </div>

                    {room.layout && room.format ? (
                      <div
                        className="grid gap-3 justify-center mx-auto"
                        style={{
                          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`
                        }}
                      >
                        {room.layout.flat().map((seat, i) => {
                          const seatNum = seat?.seatNumber || (i + 1);
                          return (
                            <div
                              key={i}
                              className={`w-32 h-26 border-2 ${
                                seat ? 'border-black bg-white' : 'border-dashed border-gray-400 bg-gray-50'
                              } p-2 flex flex-col justify-between text-left relative`}
                            >
                              <div className="flex justify-between items-center border-b border-gray-300 pb-1">
                                <span className="font-black text-xs">NO. {String(seatNum).padStart(2, '0')}</span>
                                {seat && (
                                  <span className="text-[10px] font-bold bg-gray-200 px-1.5 py-0.5 rounded">
                                    {seat.className}
                                  </span>
                                )}
                              </div>
                              {seat ? (
                                <div>
                                  <p className="text-[11px] font-bold text-black uppercase leading-tight line-clamp-2">
                                    {seat.name}
                                  </p>
                                  <p className="text-[9px] text-gray-600 font-mono mt-0.5">{seat.nisn}</p>
                                </div>
                              ) : (
                                <span className="text-center text-xs text-gray-400 my-auto">KOSONG</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-center text-sm text-gray-500 py-10">Format denah visual tidak tersedia.</p>
                    )}

                    <div className="flex justify-between items-center text-xs font-bold pt-2 text-gray-600 border-t border-gray-300">
                      <span>▲ DEPAN RUANGAN</span>
                      <span>🚪 PINTU MASUK ({room.doorPosition || 'Belakang Kanan'})</span>
                      <span>BELAKANG RUANGAN ▼</span>
                    </div>
                  </div>

                  {/* Signature Footer */}
                  <div className="flex justify-between text-xs mt-8 pt-4 px-6">
                    <div className="text-center">
                      <p className="mb-14">Mengetahui,<br />Ketua Panitia Ujian</p>
                      <p className="font-bold underline">( _________________________ )</p>
                    </div>
                    <div className="text-center">
                      <p className="mb-14">Wagir, ....................................<br />Pengawas Ruang</p>
                      <p className="font-bold underline">( _________________________ )</p>
                    </div>
                  </div>
                </div>
              );
            })
          )
        )}

        {/* 2. JADWAL UJIAN PER RUANGAN (UNTUK DITEMPEL DI PINTU / DINDING RUANGAN) */}
        {docType === 'jadwal_ruangan' && (
          filteredRooms.length === 0 ? (
            <p className="text-center text-gray-500 py-12">Tidak ada data ruangan.</p>
          ) : (
            filteredRooms.map(room => {
              const roomSchedules = schedules
                .filter(s => s.roomId === room.id)
                .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

              const uniqueClassesInRoom = Array.from(
                new Set((room.students || []).map((s: any) => s.className).filter(Boolean))
              ) as string[];

              return (
                <div
                  key={room.id}
                  className="print-page w-full max-w-4xl mx-auto bg-white p-8 mb-8 border border-gray-300 rounded-xl shadow-xs print:border-none print:shadow-none print:p-0 print:m-0"
                  style={{ pageBreakAfter: 'always' }}
                >
                  {/* Header Kop Resmi */}
                  <div className="flex items-center gap-6 border-b-2 border-black pb-4 mb-6">
                    <img src="/logo.png" alt="Logo Sekolah" className="w-16 h-16 object-contain" />
                    <div className="flex-1 text-center pr-22">
                      <h2 className="font-bold text-base tracking-wider uppercase">SMAS ISLAM DIPONEGORO WAGIR</h2>
                      <h1 className="font-black text-xl uppercase mt-0.5">JADWAL PELAKSANAAN UJIAN RUANGAN</h1>
                      <p className="text-xs text-gray-600">Tahun Pelajaran 2024/2025 • Semester Ganjil</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold mb-6 p-4 border border-black rounded-lg bg-gray-50">
                    <div>
                      <p><span className="text-gray-500">Nama Ruangan:</span> <strong className="text-black uppercase text-sm">{room.name}</strong></p>
                      <p className="mt-1"><span className="text-gray-500">Kapasitas:</span> {room.capacity} Siswa ({room.format})</p>
                    </div>
                    <div>
                      <p><span className="text-gray-500">Kelas Peserta:</span> <strong className="text-black">{uniqueClassesInRoom.join(', ') || '-'}</strong></p>
                      <p className="mt-1"><span className="text-gray-500">Jumlah Peserta Terdaftar:</span> {room.students?.length || 0} Siswa</p>
                    </div>
                  </div>

                  {/* Schedule Table */}
                  <table className="w-full border-collapse border border-black text-xs mb-6">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-black p-2.5 w-10 text-center">No</th>
                        <th className="border border-black p-2.5 w-36 text-left">Hari / Tanggal</th>
                        <th className="border border-black p-2.5 w-28 text-center">Sesi / Jam</th>
                        <th className="border border-black p-2.5 text-left">Mata Pelajaran</th>
                        <th className="border border-black p-2.5 w-44 text-left">Guru Pengawas</th>
                        <th className="border border-black p-2.5 w-24 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roomSchedules.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="border border-black p-4 text-center text-gray-500">
                            Belum ada jadwal pelaksanaan ujian yang dibuat untuk ruangan ini.
                          </td>
                        </tr>
                      ) : (
                        roomSchedules.map((sc, idx) => (
                          <tr key={sc.id || idx}>
                            <td className="border border-black p-2 text-center font-bold">{idx + 1}</td>
                            <td className="border border-black p-2">
                              {new Date(sc.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="border border-black p-2 text-center font-semibold">
                              {sc.startTime} - {sc.endTime}
                            </td>
                            <td className="border border-black p-2 font-bold uppercase">{sc.subject}</td>
                            <td className="border border-black p-2 font-semibold">{sc.supervisorName}</td>
                            <td className="border border-black p-2 text-center text-[10px] uppercase font-bold">
                              {sc.status === 'published' ? 'Aktif' : 'Draft'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* Tata Tertib Peserta Ringkas */}
                  <div className="border border-black p-3 text-[11px] mb-8 space-y-1">
                    <p className="font-bold underline">Tata Tertib Peserta Ujian:</p>
                    <p>1. Memasuki ruangan ujian 15 menit sebelum ujian dimulai sesuai nomor meja yang tertera.</p>
                    <p>2. Dilarang membawa handphone, catatan, atau alat komunikasi lainnya ke dalam ruangan ujian.</p>
                    <p>3. Mengisi dan menandatangani daftar hadir yang diedarkan oleh guru pengawas ruang.</p>
                  </div>

                  {/* Signatures */}
                  <div className="flex justify-between text-xs pt-4 px-4">
                    <div className="text-center">
                      <p className="mb-14">Mengetahui,<br />Kepala SMAS Islam Diponegoro Wagir</p>
                      <p className="font-bold underline">( _________________________ )</p>
                    </div>
                    <div className="text-center">
                      <p className="mb-14">Wagir, ....................................<br />Ketua Panitia Ujian</p>
                      <p className="font-bold underline">( _________________________ )</p>
                    </div>
                  </div>
                </div>
              );
            })
          )
        )}

        {/* 3. LABEL MEJA UJIAN (SEAT CARDS) */}
        {docType === 'label_meja' && (
          filteredRooms.length === 0 ? (
            <p className="text-center text-gray-500 py-12">Tidak ada data ruangan.</p>
          ) : (
            filteredRooms.map(room => (
              <div
                key={room.id}
                className="print-page w-full max-w-4xl mx-auto bg-white p-6 mb-8 border border-gray-300 rounded-xl shadow-xs print:border-none print:shadow-none print:p-0 print:m-0"
                style={{ pageBreakAfter: 'always' }}
              >
                <div className="text-center border-b border-black pb-2 mb-4 print:hidden">
                  <h3 className="font-bold text-sm">Label Meja Ujian: {room.name} ({room.students?.length || 0} Siswa)</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {(room.students || []).map((student: any, idx: number) => {
                    const seatNum = student.seatNumber || (idx + 1);
                    return (
                      <div
                        key={idx}
                        className="border-2 border-dashed border-black rounded-xl p-4 bg-white space-y-2 relative"
                      >
                        <div className="flex justify-between items-center border-b border-black pb-1.5 mb-1">
                          <div className="flex items-center gap-1.5">
                            <img src="/logo.png" alt="Logo Sekolah" className="w-5 h-5 object-contain" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
                              SMAS ISLAM DIPONEGORO WAGIR
                            </span>
                          </div>
                          <span className="text-xs font-black px-2 py-0.5 bg-black text-white rounded">
                            MEJA #{String(seatNum).padStart(2, '0')}
                          </span>
                        </div>

                        <div className="space-y-1 py-1">
                          <p className="text-xs text-gray-500 uppercase font-semibold">Nama Peserta:</p>
                          <p className="text-base font-black text-black leading-tight uppercase line-clamp-1">
                            {student.name}
                          </p>
                        </div>

                        <div className="flex justify-between items-center text-xs pt-1 border-t border-gray-200">
                          <div>
                            <span className="text-gray-500">Kelas: </span>
                            <strong className="text-black font-bold">{student.className}</strong>
                          </div>
                          <div>
                            <span className="text-gray-500">Ruang: </span>
                            <strong className="text-black font-bold">{room.name}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )
        )}

        {/* 4. BERITA ACARA & DAFTAR HADIR PER SESI / MAPEL */}
        {docType === 'berita_acara' && (
          filteredSchedules.length === 0 ? (
            <p className="text-center text-gray-500 py-12">Belum ada jadwal pelaksanaan ujian yang sesuai filter.</p>
          ) : (
            filteredSchedules.map(schedule => {
              const room = rooms.find(r => r.id === schedule.roomId);
              return (
                <div
                  key={schedule.id}
                  className="print-page w-full max-w-4xl mx-auto bg-white p-8 mb-8 border border-gray-300 rounded-xl shadow-xs print:border-none print:shadow-none print:p-0 print:m-0"
                  style={{ pageBreakAfter: 'always' }}
                >
                  <div className="flex items-center gap-6 border-b-2 border-black pb-4 mb-6">
                    <img src="/logo.png" alt="Logo Sekolah" className="w-16 h-16 object-contain" />
                    <div className="flex-1 text-center pr-22">
                      <h2 className="font-bold text-base tracking-wider uppercase">SMAS ISLAM DIPONEGORO WAGIR</h2>
                      <h1 className="font-black text-xl uppercase mt-0.5">BERITA ACARA & DAFTAR HADIR UJIAN</h1>
                      <p className="text-xs text-gray-600">Tahun Pelajaran 2024/2025 • Semester Ganjil</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-xs font-semibold p-3 border border-black rounded-lg bg-gray-50">
                    <div className="flex"><span className="w-28 text-gray-600">Mata Pelajaran:</span> <strong className="text-black uppercase">{schedule.subject}</strong></div>
                    <div className="flex"><span className="w-28 text-gray-600">Tanggal Ujian:</span> <strong className="text-black">{schedule.date}</strong></div>
                    <div className="flex"><span className="w-28 text-gray-600">Sesi & Waktu:</span> <strong className="text-black">{schedule.sessionName ? `${schedule.sessionName} (${schedule.startTime} - ${schedule.endTime})` : `${schedule.startTime} - ${schedule.endTime}`}</strong></div>
                    <div className="flex"><span className="w-28 text-gray-600">Ruangan:</span> <strong className="text-black uppercase">{schedule.roomName}</strong></div>
                    <div className="flex"><span className="w-28 text-gray-600">Guru Pengawas:</span> <strong className="text-black">{schedule.supervisorName}</strong></div>
                    <div className="flex"><span className="w-28 text-gray-600">Jumlah Peserta:</span> <strong className="text-black">{room?.students?.length || 0} Siswa</strong></div>
                  </div>

                  <table className="w-full border-collapse border border-black text-xs mb-6">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-black p-2 w-10 text-center">No</th>
                        <th className="border border-black p-2 text-left">Nama Peserta</th>
                        <th className="border border-black p-2 w-24 text-center">Kelas</th>
                        <th className="border border-black p-2 w-24 text-center">Nomor Meja</th>
                        <th className="border border-black p-2 w-44" colSpan={2}>Tanda Tangan Peserta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {room?.students?.map((st: any, i: number) => {
                        const seatNum = st.seatNumber || (i + 1);
                        return (
                          <tr key={st.uid || i}>
                            <td className="border border-black p-2 text-center">{i + 1}</td>
                            <td className="border border-black p-2">
                              <span className="font-bold">{st.name}</span>
                              <span className="block text-[10px] text-gray-500 font-mono">{st.nisn}</span>
                            </td>
                            <td className="border border-black p-2 text-center font-semibold">{st.className}</td>
                            <td className="border border-black p-2 text-center font-bold">Meja #{seatNum}</td>
                            <td className="border border-black p-2 h-10 w-22">
                              {i % 2 === 0 ? <span className="text-[10px]">{i + 1}. .........</span> : null}
                            </td>
                            <td className="border border-black p-2 h-10 w-22">
                              {i % 2 !== 0 ? <span className="text-[10px]">{i + 1}. .........</span> : null}
                            </td>
                          </tr>
                        );
                      }) || (
                        <tr>
                          <td colSpan={6} className="border border-black p-4 text-center text-gray-500">
                            Tidak ada peserta pada ruangan ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  <div className="mb-6 border border-black p-3 text-xs">
                    <p className="font-bold mb-1">Catatan Pelaksanaan Ujian (Kejadian Penting):</p>
                    <p className="text-gray-400 italic">.....................................................................................................................................................................................</p>
                  </div>

                  <div className="flex justify-between text-xs pt-4">
                    <div className="text-center">
                      <p className="mb-14">Panitia Pelaksana Ujian</p>
                      <p className="font-bold underline">( _________________________ )</p>
                    </div>
                    <div className="text-center">
                      <p className="mb-14">Pengawas Ruang</p>
                      <p className="font-bold underline">{schedule.supervisorName}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>

      {/* Global CSS for Clean Printing */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #exam-print-center, #exam-print-center * {
            visibility: visible;
          }
          #exam-print-center {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
            background: white !important;
          }
          .print-page {
            box-shadow: none !important;
            border: none !important;
            page-break-after: always;
            margin: 0 auto !important;
            padding: 20px !important;
          }
        }
      `
        }}
      />
    </div>
  );
}
