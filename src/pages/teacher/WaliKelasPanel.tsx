import React, { useState, useEffect } from 'react';
import { Calendar, Users, FileText, TrendingUp, AlertTriangle, Eye } from 'lucide-react';
import { collection, query, where, getDocs, getFirestore, addDoc } from 'firebase/firestore';

export default function WaliKelasPanel({ profile, className, frozen }: { profile: any, className: string, frozen: boolean }) {
  const [activeSubTab, setActiveSubTab] = useState('jurnal');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100">
        <div>
          <h3 className="text-lg font-bold text-indigo-900">Panel Wali Kelas: {className}</h3>
          <p className="text-indigo-700 text-sm">Kelola administrasi, rekap kehadiran, dan catatan khusus siswa perwalian Anda.</p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-6">
          {[
            { id: 'jurnal', label: 'Jurnal Kelas (Heatmap)' },
            { id: 'siswa', label: 'Daftar Siswa' },
            { id: 'kasus', label: 'Catatan Kasus' },
            { id: 'raport', label: 'E-Raport' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveSubTab(t.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeSubTab === t.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="pt-4">
        {activeSubTab === 'jurnal' && <JurnalKelasTab className={className} />}
        {activeSubTab === 'siswa' && <DaftarSiswaTab className={className} />}
        {activeSubTab === 'kasus' && <CatatanKasusTab className={className} />}
        {activeSubTab === 'raport' && <ERaportTab className={className} />}
      </div>
    </div>
  );
}

function JurnalKelasTab({ className }: { className: string }) {
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);

  // State for drill-down modal
  const [selectedCell, setSelectedCell] = useState<{ studentName: string, dateStr: string, records: any[] } | null>(null);

  useEffect(() => {
    // Generate current week dates (Monday to Saturday)
    const curr = new Date();
    const first = curr.getDate() - curr.getDay() + 1; // Monday
    const dates = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(curr.setDate(first + i));
      dates.push(new Date(d));
    }
    setWeekDates(dates);

    const fetchData = async () => {
      setLoading(true);
      try {
        const db = getFirestore();
        const startStr = dates[0].toISOString().split('T')[0];
        const endStr = dates[5].toISOString().split('T')[0];
        
        // Fetch all attendance for this class in the current week
        const q = query(
          collection(db, 'attendance_logs'),
          where('className', '==', className),
          where('tanggal', '>=', startStr),
          where('tanggal', '<=', endStr)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAttendances(data);

        // Extract unique students
        const stMap = new Map();
        data.forEach((att: any) => {
          att.students?.forEach((s: any) => {
            if (!stMap.has(s.uid)) {
              stMap.set(s.uid, { uid: s.uid, name: s.name });
            }
          });
        });
        
        // If empty, try to fetch students from teacher service fallback
        if (stMap.size === 0) {
          const { getStudentsByClassResult } = await import('../../domains/teacher/services');
          const res = await getStudentsByClassResult(className);
          if (res.isSuccess) {
            res.getValue()?.forEach(s => stMap.set(s.uid, { uid: s.uid, name: s.name }));
          }
        }
        
        setStudents(Array.from(stMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error("Error fetching attendances:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [className]);

  if (loading) {
    return <div className="text-center py-10"><div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div></div>;
  }

  const getStatusKesimpulan = (records: any[]) => {
    if (records.length === 0) return { status: 'Kosong', color: 'bg-gray-100 text-gray-400', label: '-' };
    
    let hasBolos = false;
    let hasHadir = false;
    let hasSakitIzin = false;
    
    records.forEach(r => {
      if (r.status === 'alpa') hasBolos = true;
      else if (r.status === 'hadir') hasHadir = true;
      else if (r.status === 'sakit' || r.status === 'izin') hasSakitIzin = true;
    });

    if (hasHadir && hasBolos) return { status: 'Bolos Parsial', color: 'bg-orange-100 text-orange-700 border border-orange-300', label: 'P' };
    if (hasBolos && !hasHadir) return { status: 'Bolos Full', color: 'bg-red-100 text-red-700 border border-red-300', label: 'A' };
    if (hasSakitIzin && !hasHadir) return { status: 'Sakit/Izin', color: 'bg-blue-100 text-blue-700 border border-blue-300', label: 'S/I' };
    return { status: 'Hadir', color: 'bg-emerald-100 text-emerald-700 border border-emerald-300', label: 'H' };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold text-gray-800">Rekap Mingguan (Weekly Heatmap)</h4>
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center"><span className="w-3 h-3 bg-emerald-100 border border-emerald-300 mr-1 rounded-sm"></span> Hadir</div>
          <div className="flex items-center"><span className="w-3 h-3 bg-blue-100 border border-blue-300 mr-1 rounded-sm"></span> Sakit/Izin</div>
          <div className="flex items-center"><span className="w-3 h-3 bg-orange-100 border border-orange-300 mr-1 rounded-sm"></span> Kutu Loncatan (P)</div>
          <div className="flex items-center"><span className="w-3 h-3 bg-red-100 border border-red-300 mr-1 rounded-sm"></span> Alpa Full</div>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
            <tr>
              <th className="py-3 px-4 font-semibold w-64">Nama Siswa</th>
              {weekDates.map((d, i) => (
                <th key={i} className="py-3 px-2 font-semibold text-center w-24">
                  {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][i]}<br/>
                  <span className="text-xs font-normal text-gray-400">{d.getDate()}/{d.getMonth()+1}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.map(student => (
              <tr key={student.uid} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 font-medium text-gray-800">{student.name}</td>
                {weekDates.map((d, i) => {
                  const dateStr = d.toISOString().split('T')[0];
                  // Filter records for this student on this date
                  const dayRecords = attendances
                    .filter(a => a.tanggal === dateStr)
                    .map(a => {
                      const sRec = a.students?.find((s: any) => s.uid === student.uid);
                      return {
                        subject: a.subject,
                        pertemuan: a.pertemuan,
                        teacher: a.teacherName,
                        status: sRec?.status || 'hadir',
                        notes: sRec?.notes
                      };
                    });
                  
                  const summary = getStatusKesimpulan(dayRecords);
                  
                  return (
                    <td key={i} className="py-2 px-2 text-center">
                      <button 
                        onClick={() => setSelectedCell({ studentName: student.name, dateStr, records: dayRecords })}
                        className={`w-8 h-8 rounded-md flex items-center justify-center font-bold mx-auto transition-transform hover:scale-110 ${summary.color}`}
                        title={summary.status}
                      >
                        {summary.label}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {students.length === 0 && (
          <div className="text-center py-10 text-gray-500">Tidak ada data siswa atau absen minggu ini.</div>
        )}
      </div>

      {/* Drill-down Modal */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900">{selectedCell.studentName}</h3>
                <p className="text-sm text-gray-500">Detail Absensi - {selectedCell.dateStr}</p>
              </div>
              <button onClick={() => setSelectedCell(null)} className="text-gray-400 hover:text-gray-600">
                <AlertTriangle className="w-5 h-5 hidden" /> {/* Just to use the icon to prevent unused warning if not used elsewhere, wait I'll just use normal close */}
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>
            <div className="p-6">
              {selectedCell.records.length === 0 ? (
                <div className="text-center text-gray-500 py-6">Belum ada data absensi yang masuk pada hari ini. (Menunggu Guru Mapel / Guru Piket)</div>
              ) : (
                <div className="space-y-4">
                  {selectedCell.records.map((r, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div>
                        <p className="font-medium text-gray-800">{r.subject} <span className="text-xs text-gray-500">(Jam ke-{r.pertemuan})</span></p>
                        <p className="text-xs text-gray-500">Guru: {r.teacher}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        r.status === 'hadir' ? 'bg-emerald-100 text-emerald-700' :
                        r.status === 'alpa' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {r.status.toUpperCase()}
                      </div>
                    </div>
                  ))}
                  
                  {selectedCell.records.some(r => r.status === 'alpa') && (
                    <button className="w-full mt-4 bg-orange-100 text-orange-700 border border-orange-300 font-medium py-2 rounded-lg flex items-center justify-center hover:bg-orange-200 transition-colors">
                      <AlertTriangle className="w-4 h-4 mr-2" /> Buat Catatan Kasus
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DaftarSiswaTab({ className }: { className: string }) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const { getStudentsByClassResult } = await import('../../domains/teacher/services');
        const res = await getStudentsByClassResult(className);
        if (res.isSuccess) {
          setStudents(res.getValue() || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [className]);

  if (loading) return <div className="text-center py-10"><div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div></div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h4 className="font-semibold text-gray-800">Daftar Siswa Kelas {className}</h4>
        <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded-full">{students.length} Siswa</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
            <tr>
              <th className="py-3 px-4 font-semibold">NIS/NISN</th>
              <th className="py-3 px-4 font-semibold">Nama Lengkap</th>
              <th className="py-3 px-4 font-semibold">Email</th>
              <th className="py-3 px-4 font-semibold text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center text-gray-500">Belum ada data siswa.</td></tr>
            ) : students.map((s, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="py-3 px-4 font-medium text-gray-600">{s.nisn || '-'}</td>
                <td className="py-3 px-4 font-medium text-gray-900">{s.name}</td>
                <td className="py-3 px-4 text-gray-600">{s.email || '-'}</td>
                <td className="py-3 px-4 text-center">
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Aktif</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CatatanKasusTab({ className }: { className: string }) {
  const [cases, setCases] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ studentId: '', studentName: '', category: 'Pelanggaran Ringan', notes: '' });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const db = getFirestore();
        const q = query(collection(db, 'student_cases'), where('className', '==', className));
        const snapshot = await getDocs(q);
        setCases(snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => b.createdAt - a.createdAt));

        const { getStudentsByClassResult } = await import('../../domains/teacher/services');
        const res = await getStudentsByClassResult(className);
        if (res.isSuccess) setStudents(res.getValue() || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [className]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentId) return alert('Pilih siswa');
    try {
      const student = students.find(s => s.uid === formData.studentId);
      const db = getFirestore();
      const newCase = {
        ...formData,
        studentName: student?.name || 'Unknown',
        className,
        createdAt: Date.now()
      };
      const docRef = await addDoc(collection(db, 'student_cases'), newCase);
      setCases([{ id: docRef.id, ...newCase }, ...cases]);
      setShowForm(false);
      setFormData({ studentId: '', studentName: '', category: 'Pelanggaran Ringan', notes: '' });
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan catatan');
    }
  };

  if (loading) return <div className="text-center py-10"><div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold text-gray-800">Catatan Kasus / Bimbingan Siswa</h4>
        <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          {showForm ? 'Batal' : '+ Tambah Catatan'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Siswa</label>
                <select required value={formData.studentId} onChange={e => setFormData({...formData, studentId: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="">-- Pilih Siswa --</option>
                  {students.map(s => <option key={s.uid} value={s.uid}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="Pelanggaran Ringan">Pelanggaran Ringan</option>
                  <option value="Pelanggaran Berat">Pelanggaran Berat</option>
                  <option value="Bimbingan Karir">Bimbingan Karir / Prestasi</option>
                  <option value="Teguran Kehadiran">Teguran Kehadiran / Bolos</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catatan Detail</label>
              <textarea required value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Tulis kronologi atau detail catatan..." />
            </div>
            <div className="flex justify-end">
              <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium">Simpan Catatan</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
        {cases.length === 0 ? (
          <div className="text-center py-10 text-gray-500">Belum ada catatan kasus untuk kelas ini.</div>
        ) : cases.map((c, i) => (
          <div key={c.id || i} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-gray-900">{c.studentName}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  c.category.includes('Berat') ? 'bg-red-100 text-red-700' :
                  c.category.includes('Bolos') ? 'bg-orange-100 text-orange-700' :
                  c.category.includes('Prestasi') ? 'bg-emerald-100 text-emerald-700' :
                  'bg-yellow-100 text-yellow-800'
                }`}>{c.category}</span>
              </div>
              <p className="text-gray-600 text-sm mt-1">{c.notes}</p>
            </div>
            <div className="text-xs text-gray-400 whitespace-nowrap">
              {new Date(c.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ERaportTab({ className }: { className: string }) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const { getStudentsByClassResult } = await import('../../domains/teacher/services');
        const res = await getStudentsByClassResult(className);
        if (res.isSuccess) {
          setStudents(res.getValue() || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [className]);

  if (loading) return <div className="text-center py-10"><div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h4 className="font-semibold text-gray-800">Cetak E-Raport Semester Ini</h4>
          <p className="text-sm text-gray-500">Pastikan semua guru mata pelajaran telah menyelesaikan input nilai.</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center">
          <FileText className="w-4 h-4 mr-2" /> Generate Raport Massal
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
            <tr>
              <th className="py-3 px-4 font-semibold">Nama Siswa</th>
              <th className="py-3 px-4 font-semibold text-center">Status Kelengkapan Nilai</th>
              <th className="py-3 px-4 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.length === 0 ? (
              <tr><td colSpan={3} className="py-8 text-center text-gray-500">Belum ada data siswa.</td></tr>
            ) : students.map((s, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="py-3 px-4 font-medium text-gray-900">{s.name}</td>
                <td className="py-3 px-4 text-center">
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Lengkap (12/12)</span>
                </td>
                <td className="py-3 px-4 text-right">
                  <button className="text-indigo-600 hover:text-indigo-900 font-medium">Lihat Raport</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
