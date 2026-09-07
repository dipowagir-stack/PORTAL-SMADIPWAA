import React, { useState, useEffect } from 'react';
import { getClasses } from '../../domains/academic/services';
import { getStudentsByClassIdResult } from '../../domains/student/services';
import { getBillingEventsResult, getApprovedPaymentsResult } from '../../domains/finance/services';
import { Search, Download } from 'lucide-react';

export default function LaporanTunggakanPanel() {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClassesAndEvents();
  }, []);

  const fetchClassesAndEvents = async () => {
    try {
      const classRes = await getClasses();
      if (classRes.isSuccess) setClasses(classRes.getValue());

      const eventRes = await getBillingEventsResult();
      if (eventRes.isSuccess) setEvents(eventRes.getValue());
    } catch (error) {
      console.error(error);
    }
  };

  const handleFilter = async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const studentRes = await getStudentsByClassIdResult(selectedClass);
      if (studentRes.isSuccess) {
        setStudents(studentRes.getValue());
      } else {
        setStudents([]);
      }

      const paymentRes = await getApprovedPaymentsResult();
      if (paymentRes.isSuccess) {
        setPayments(paymentRes.getValue());
      } else {
        setPayments([]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTunggakan = (studentId: string) => {
    // Events applicable to this class or all
    const applicableEvents = events.filter(ev => {
      if (ev.targetType === 'all') return true;
      if (ev.targetType === 'class') {
         const selectedClassName = classes.find(c => c.id === selectedClass)?.name;
         return ev.targetValue === selectedClass || ev.targetValue === selectedClassName;
      }
      return false;
    });
    
    let totalTagihan = 0;
    let totalDibayar = 0;
    let rincian: {title: string, sisa: number, detail?: string}[] = [];

    applicableEvents.forEach(ev => {
      if (ev.billingType === 'monthly') {
        const fullYearAmount = ev.amount * 12;
        totalTagihan += fullYearAmount;
        
        const paidMonthsCount = payments
          .filter(p => p.studentId === studentId && p.billingEventId === ev.id)
          .reduce((sum, p) => sum + (p.months?.length || 0), 0);
          
        const dibayar = paidMonthsCount * ev.amount;
        totalDibayar += dibayar;
        
        const sisa = fullYearAmount - dibayar;
        if (sisa > 0) {
          rincian.push({ title: ev.title, sisa, detail: `(${12 - paidMonthsCount} Bulan)` });
        }
      } else {
        totalTagihan += ev.amount;
        const dibayar = payments
          .filter(p => p.studentId === studentId && p.billingEventId === ev.id)
          .reduce((sum, p) => sum + p.amount, 0);
        totalDibayar += dibayar;
        
        const sisa = ev.amount - dibayar;
        if (sisa > 0) {
          rincian.push({ title: ev.title, sisa });
        }
      }
    });

    return { total: totalTagihan - totalDibayar, rincian };
  };

  const handleExportCSV = () => {
    if (students.length === 0) return;
    const header = "NISN,Nama Siswa,Total Tunggakan (Rp),Rincian Tunggakan\n";
    const rows = students.map(s => {
      const tunggakan = calculateTunggakan(s.id);
      const rincianStr = tunggakan.rincian.map(r => `${r.title}: ${r.sisa}`).join('; ');
      return `"${s.nisn || ''}","${s.name}","${tunggakan.total}","${rincianStr}"`;
    }).join("\n");
    
    const csvContent = "data:text/csv;charset=utf-8," + header + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const className = classes.find(c => c.id === selectedClass)?.name || 'Kelas';
    link.setAttribute("download", `Laporan_Tunggakan_${className}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter Kelas</label>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:ring-teal-500">
            <option value="">-- Pilih Kelas --</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2 w-full md:w-auto self-end">
          <button onClick={handleFilter} disabled={!selectedClass || loading} className="flex-1 md:flex-none bg-teal-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50">
            {loading ? 'Memuat...' : 'Tampilkan'}
          </button>
          <button onClick={handleExportCSV} disabled={students.length === 0} className="flex-1 md:flex-none bg-gray-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-900 disabled:opacity-50 flex items-center justify-center">
            <Download className="w-4 h-4 mr-2" /> Ekspor CSV
          </button>
        </div>
      </div>

      {students.length > 0 && (
        <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Siswa</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Tunggakan</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rincian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {students.map(student => {
                const tunggakan = calculateTunggakan(student.id);
                return (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{student.name}</div>
                      <div className="text-xs text-gray-500">NISN: {student.nisn}</div>
                    </td>
                    <td className="px-6 py-4">
                      {tunggakan.total > 0 ? (
                        <span className="font-bold text-red-600">Rp {tunggakan.total.toLocaleString('id-ID')}</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">Lunas Semua</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">
                      {tunggakan.rincian.length > 0 ? (
                        <ul className="list-disc pl-4 space-y-1">
                          {tunggakan.rincian.map((r, i) => (
                            <li key={i}>{r.title} {r.detail}: <span className="font-semibold text-gray-900">Rp {r.sisa.toLocaleString('id-ID')}</span></li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-gray-400 italic">Tidak ada tunggakan</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
