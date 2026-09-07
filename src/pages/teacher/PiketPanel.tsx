import React, { useState, useEffect } from 'react';
import { Users, AlertCircle, Save, Calendar, CheckSquare, Search, CheckCircle } from 'lucide-react';
import { getAllTeachersResult, getSchedulesByDayResult, getStudentsByClassResult, submitPiketAttendanceResult } from '../../domains/teacher/services';

export default function PiketPanel({ profile }: any) {
  const [selectedClass, setSelectedClass] = useState('');
  const [absentTeacher, setAbsentTeacher] = useState('');
  const [subject, setSubject] = useState('');
  const [pertemuan, setPertemuan] = useState('1');
  const [materi, setMateri] = useState('');
  const [notes, setNotes] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [searchClass, setSearchClass] = useState('');
  const [todaySchedules, setTodaySchedules] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchSchedulesAndTeachers = async () => {
      try {
        const resTeachers = await getAllTeachersResult();
        const teacherMap: Record<string, string> = {};
        if (resTeachers.isSuccess) {
           resTeachers.getValue().forEach((t: any) => {
             teacherMap[t.id] = t.name;
           });
        }
        setTeachers(teacherMap);

        const dayMap = [6, 0, 1, 2, 3, 4, 5];
        const todayIdx = dayMap[new Date().getDay()];
        
        const resSched = await getSchedulesByDayResult(todayIdx);
        let scheds: any[] = [];
        if (resSched.isSuccess) {
           scheds = resSched.getValue();
        }
        
        scheds.sort((a, b) => (a.periodIndex || 0) - (b.periodIndex || 0));
        setTodaySchedules(scheds);
      } catch (e) {
        console.error(e);
      }
    };
    fetchSchedulesAndTeachers();
  }, []);

  const fetchStudents = async () => {
    if (!searchClass) return;
    setLoading(true);
    try {
      const res = await getStudentsByClassResult(searchClass);
      const data = res.isSuccess ? res.getValue().map((u: any) => ({ ...u, uid: u.id, status: 'H' })) : [];
      setStudents(data);
      setSelectedClass(searchClass);
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
    if (!selectedClass || students.length === 0) return;
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
      
      const log = {
        piketTeacherId: profile.uid,
        piketTeacherName: profile.name,
        absentTeacherName: absentTeacher,
        className: selectedClass,
        subject,
        pertemuan,
        materi,
        notes,
        attendance: {
          hadir: hadirCount,
          terlambat: terlambatCount,
          sakit: sakitCount,
          izin: izinCount,
          alfa: alfaCount
        }
      };
      
      const studentsToUpdate = students.map(s => ({
         uid: s.uid,
         pointsToAdd: calculatePoints(s.status),
         points: s.points || 0
      })).filter(s => s.pointsToAdd > 0);

      const res = await submitPiketAttendanceResult({ log, studentsToUpdate });
      if (res.isFailure) throw new Error(res.getError());
      setStatus('success');
      
      // Reset form
      setStudents([]);
      setSelectedClass('');
      setSearchClass('');
      setAbsentTeacher('');
      setSubject('');
      setMateri('');
      setNotes('');
    } catch (error) {
      console.error(error);
      setStatus('error');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 p-5 rounded-xl shadow-sm mb-6 flex items-start space-x-4">
        <div className="bg-amber-100 p-3 rounded-full text-amber-600">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-bold text-amber-900 text-lg">Mode Guru Piket</h4>
          <p className="text-amber-700 mt-1">
            Gunakan fitur ini untuk mengambil alih absensi kelas jika guru mata pelajaran berhalangan hadir atau kesulitan menggunakan sistem.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-800 text-lg border-b pb-2">Informasi Kelas Pengganti</h3>
        
        <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
          <label className="block text-sm font-medium text-blue-900 mb-2">Pilih Jadwal Hari Ini (Otomatis)</label>
          <select
            onChange={(e) => {
              const idx = e.target.value;
              if (idx !== '') {
                const s = todaySchedules[Number(idx)];
                setSearchClass(s.className);
                setSubject(s.subject);
                setAbsentTeacher(teachers[s.teacherId] || '');
              }
            }}
            className="w-full p-2.5 border border-blue-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">-- Pilih Jadwal Kelas yang Kosong --</option>
            {todaySchedules.map((s, idx) => (
              <option key={s.id} value={idx}>
                Jam ke-{s.periodIndex + 1}: {s.className} - {s.subject} (Guru: {teachers[s.teacherId] || 'Tidak diketahui'})
              </option>
            ))}
          </select>
          <p className="text-xs text-blue-600 mt-2">Memilih jadwal akan otomatis mengisi form di bawah.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cari Kelas</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={searchClass}
                onChange={(e) => setSearchClass(e.target.value)}
                placeholder="Contoh: XII-IPA 1"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
              <button 
                onClick={fetchStudents}
                disabled={loading || !searchClass}
                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? <span className="animate-spin text-xl">↻</span> : <Search className="w-5 h-5" />}
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Guru Berhalangan</label>
            <input
              type="text"
              value={absentTeacher}
              onChange={(e) => setAbsentTeacher(e.target.value)}
              placeholder="Contoh: Bpk. Budi Santoso"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mata Pelajaran</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Contoh: Fisika"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pertemuan Ke</label>
            <input
              type="number"
              value={pertemuan}
              onChange={(e) => setPertemuan(e.target.value)}
              min="1"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Materi / Tugas yang Diberikan</label>
            <input
              type="text"
              value={materi}
              onChange={(e) => setMateri(e.target.value)}
              placeholder="Contoh: Mengerjakan LKS Halaman 45"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan Tambahan Piket</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Kelas kondusif, 2 siswa dipanggil ke BK."
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>
        </div>
      </div>

      {students.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Daftar Siswa - Kelas {selectedClass}</h3>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {students.length} Siswa
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3 border-b">Nama Siswa</th>
                  <th className="px-4 py-3 border-b">NIS</th>
                  <th className="px-4 py-3 border-b">Status Kehadiran</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.uid} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{student.name}</td>
                    <td className="px-4 py-3 text-gray-500">{student.nis || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex space-x-1">
                        {[
                          { id: 'H', label: 'H', color: 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200' },
                          { id: 'T', label: 'T', color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200' },
                          { id: 'I', label: 'I', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200' },
                          { id: 'S', label: 'S', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200' },
                          { id: 'A', label: 'A', color: 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200' },
                        ].map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setStudentStatus(student.uid, s.id)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border transition-all ${
                              student.status === s.id ? s.color + ' ring-2 ring-offset-1 ring-opacity-50 ring-' + s.color.split('-')[1] : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !absentTeacher || !subject}
              className={`flex items-center px-6 py-2.5 rounded-lg text-white font-medium ${
                isSubmitting || !absentTeacher || !subject ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Simpan Laporan Piket
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          Laporan piket berhasil disimpan!
        </div>
      )}
    </div>
  );
}
