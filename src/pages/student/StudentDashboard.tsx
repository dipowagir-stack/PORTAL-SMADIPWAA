import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Award, TrendingUp, Calendar, BookOpen, User, QrCode, CreditCard, PlusCircle, CheckCircle2, Clock, XCircle, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getAcademicCalendar } from '../../domains/academic/services';
import { 
  getConnectedParents, getOrGenerateParentLinkCode, getStudentPayments, getStudentBillingEvents, createStudentPayment, deleteStudentPayment,
  updateStudentProfile, getStudentClasses, getStudentSchedulesByClass, getGlobalSettings
} from "../../domains/student/services";

export default function StudentDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedule' | 'payment' | 'profile'>('dashboard');
  const [showIdCard, setShowIdCard] = useState(false);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 sm:p-8 bg-gradient-to-br from-blue-600 to-blue-800 text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3"><h2 className="text-2xl font-bold mb-1">Halo, {profile?.name || 'Siswa'}!</h2>{profile?.className && <span className="px-3 py-1 bg-white/20 text-white rounded-full text-sm font-semibold border border-white/30">Kelas {profile.className}</span>}</div>
              <p className="text-blue-100">Selamat datang di portal pembelajaran.</p><button className="mt-3 flex items-center space-x-2 text-sm bg-white/10 hover:bg-white/20 transition-colors border border-white/20 rounded-lg px-3 py-1.5 backdrop-blur-sm" onClick={() => setShowIdCard(true)}><User className="w-4 h-4" /><span>Lihat Kartu Pelajar</span></button>
            </div>
            <div className="bg-white/10 backdrop-blur-sm px-6 py-4 rounded-xl border border-white/20 text-center w-full sm:w-auto">
              <div className="flex items-center justify-center space-x-2 text-blue-100 mb-1">
                <Award className="w-5 h-5" />
                <span className="text-sm font-medium uppercase tracking-wider">Total Poin</span>
              </div>
              <div className="text-4xl font-extrabold">{profile?.points || 0}</div>
            </div>
          </div>
        </div>
        <div className="flex border-t border-gray-100">
          {['dashboard', 'schedule', 'payment', 'profile'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 py-4 text-center font-bold text-sm capitalize ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              {tab === 'dashboard' ? 'Dashboard' : tab === 'schedule' ? 'Jadwal' : tab === 'payment' ? 'Pembayaran' : 'Profil'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'dashboard' && <DashboardTab />}
      {activeTab === 'schedule' && <ScheduleTab profile={profile} />}
      {activeTab === 'payment' && <PaymentTab profile={profile} />}
      {activeTab === 'profile' && <ProfileTab profile={profile} />}

      {showIdCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative">
            <button onClick={() => setShowIdCard(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-white/80 rounded-full p-1"><XCircle className="w-6 h-6"/></button>
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 text-center text-white">
              <div className="w-20 h-20 bg-white/20 rounded-full mx-auto mb-3 flex items-center justify-center border-2 border-white/30 overflow-hidden">
                {profile?.photoUrl ? <img src={profile.photoUrl} alt="Foto Profil" className="w-full h-full object-cover" /> : <User className="w-10 h-10 text-white/70" />}
              </div>
              <h2 className="text-xl font-bold">{profile?.name || 'Nama Siswa'}</h2>
              <p className="text-blue-100 text-sm mt-1">NIS: {profile?.nis || '-'}</p>
            </div>
            <div className="p-6 bg-gray-50 flex flex-col items-center">
              <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 mb-4">
                <QRCodeSVG value={profile?.uid || profile?.nis || 'student-id'} size={150} />
              </div>
              <p className="text-sm text-gray-500 text-center font-medium">Tunjukkan kode QR ini untuk absensi atau kegiatan sekolah.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Riwayat Poin Terbaru</h3>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
            <Award className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 font-medium">Belum ada riwayat poin</p>
          </div>
        </div>
      </div>
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Pengumuman</h3>
          <p className="text-gray-500 text-sm">Belum ada pengumuman.</p>
        </div>
      </div>
    </div>
  );
}

function ScheduleTab({ profile }: { profile: any }) {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [academicEvents, setAcademicEvents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const clsRes = await getStudentClasses();
        const clsList = clsRes.isSuccess ? clsRes.getValue() : [];
        setClasses(clsList);
        
        const studentClass = clsList.find((c: any) => c.id === profile?.classId || c.name === profile?.className || c.students?.some((s: any) => s.uid === profile?.uid));
        if (studentClass) {
           setSelectedClassId(studentClass.id);
        } else if (clsList.length > 0) {
           setSelectedClassId(clsList[0].id);
        }

        const calRes = await getAcademicCalendar();
        if (calRes.isSuccess && calRes.getValue()?.academic_calendar) {
          setAcademicEvents(calRes.getValue()!.academic_calendar);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile?.uid]);

  useEffect(() => {
    if (!selectedClassId) return;
    const fetchSched = async () => {
      try {
        const snapRes = await getStudentSchedulesByClass(selectedClassId);
        setSchedules(snapRes.isSuccess ? snapRes.getValue() : []);
      } catch (e) {
        console.error(e);
      }
    };
    fetchSched();
  }, [selectedClassId]);

  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <BookOpen className="w-5 h-5 text-blue-600 mr-2" />
            Jadwal Pelajaran
          </h3>
          <p className="text-sm text-gray-500 mt-1">Lihat jadwal kelas Anda berdasarkan kalender akademik</p>
        </div>
        <select 
          value={selectedClassId} 
          onChange={e => setSelectedClassId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        >
           {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Memuat jadwal...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {days.map(day => {
            const daySchedules = schedules.filter(s => s.day === day).sort((a,b) => a.startTime.localeCompare(b.startTime));
            
            // Generate exact date for this weekday in current week
            const curr = new Date();
            const currentDayIndex = curr.getDay() === 0 ? 7 : curr.getDay(); // Mon=1, Sun=7
            const first = curr.getDate() - currentDayIndex + 1; 
            const d = new Date(curr);
            d.setDate(first + days.indexOf(day));
            
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;
            
            let holidayName = null;
            for (const ev of academicEvents) {
              if (ev.isHoliday) {
                if (ev.date === dateStr) {
                  holidayName = ev.description;
                  break;
                }
                if (ev.date.includes(' to ')) {
                  const [start, end] = ev.date.split(' to ');
                  if (dateStr >= start && dateStr <= end) {
                    holidayName = ev.description;
                    break;
                  }
                }
              }
            }

            return (
              <div key={day} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                  <span className="font-bold text-gray-700">{day}</span>
                  <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded shadow-sm border border-gray-100">{dateStr}</span>
                </div>
                <div className="p-4 space-y-3">
                  {holidayName ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center bg-blue-50 border border-blue-100 rounded-lg">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                        <Calendar className="w-6 h-6 text-blue-600" />
                      </div>
                      <h5 className="font-bold text-blue-900 mb-1">Kegiatan Diliburkan</h5>
                      <p className="text-sm text-blue-700">{holidayName}</p>
                    </div>
                  ) : daySchedules.length > 0 ? daySchedules.map(sched => (
                    <div key={sched.id} className="flex justify-between items-start border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{sched.subject}</div>
                        <div className="text-xs text-gray-500">{sched.teacherName}</div>
                      </div>
                      <div className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded">
                        {sched.startTime} - {sched.endTime}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center text-sm text-gray-400 italic py-2">Tidak ada jadwal</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PaymentTab({ profile }: { profile: any }) {
  const [billings, setBillings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState<any>(null);
  
  const [payAmount, setPayAmount] = useState('');
  const [payMonth, setPayMonth] = useState('');
  const [payYear, setPayYear] = useState(new Date().getFullYear().toString());
  const [payMethod, setPayMethod] = useState('transfer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [profile?.uid]);

  const fetchData = async () => {
    if (!profile?.uid) return;
    setLoading(true);
    try {
      const clsRes = await getStudentClasses();
      const clsList = clsRes.isSuccess ? clsRes.getValue() : [];
      setClasses(clsList);
      const studentClass = clsList.find((c: any) => c.id === profile?.classId || c.name === profile?.className || c.students?.some((s: any) => s.uid === profile?.uid));

      const billRes = await getStudentBillingEvents();
      const allBills = billRes.isSuccess ? billRes.getValue() : [];
      
      const myBills = allBills.filter((b: any) => {
         if (b.targetType === 'all') return true;
         if (b.targetType === 'class') {
           const classMatched = 
             (studentClass && (b.targetValue === studentClass.id || b.targetValue === studentClass.name)) ||
             (profile?.classId && b.targetValue === profile?.classId) ||
             (profile?.className && b.targetValue === profile?.className);
           if (classMatched) return true;
         }
         if (b.targetType === 'student' && b.targetValue === profile.uid) return true;
         return false;
      });
      setBillings(myBills);

      const payRes = await getStudentPayments(profile.uid);
      if (payRes.isSuccess) {
        setPayments(payRes.getValue());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePayClick = (bill: any) => {
    setSelectedBilling(bill);
    setPayAmount(bill.amount?.toString() || '');
    setPayMonth('');
    setPayYear(new Date().getFullYear().toString());
    setShowPaymentForm(true);
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBilling || !profile?.uid) return;
    setIsSubmitting(true);
    try {
      const paymentData: any = {
        billingId: selectedBilling.id,
        billingEventTitle: selectedBilling.title,
        studentId: profile.uid,
        studentName: profile.name || 'Siswa',
        nisn: profile.nisn || '-',
        studentClass: profile.className || profile.classId || '-',
        amount: Number(payAmount),
        method: payMethod,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      if (selectedBilling.billingType === 'monthly') {
        paymentData.month = payMonth;
        paymentData.year = payYear;
      }
      
      // Deteksi jika pembayaran adalah cicilan (kurang dari jumlah tagihan penuh)
      const currentPaid = payments.filter(p => p.billingId === selectedBilling.id && p.status !== 'rejected').reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      if (Number(payAmount) + currentPaid < selectedBilling.amount) {
        paymentData.isInstallment = true;
      }
      const res = await createStudentPayment(paymentData);
      if (res.isSuccess) {
        alert('Berhasil mengajukan pembayaran. Menunggu konfirmasi bendahara.');
        setShowPaymentForm(false);
        await fetchData();
      } else {
        alert('Gagal mengajukan pembayaran: ' + (res.isFailure ? res.getError() : 'Kesalahan internal'));
      }
    } catch (e) {
      console.error(e);
      alert('Gagal mengajukan pembayaran');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <CreditCard className="w-5 h-5 text-blue-600 mr-2" />
          Tagihan Saya
        </h3>
        {loading ? <div className="py-4 text-center text-gray-500">Memuat...</div> : (
          <div className="space-y-4">
            {billings.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border border-dashed rounded-xl">Belum ada tagihan</div>
            ) : billings.map(bill => {
               const billPayments = payments.filter(p => p.billingId === bill.id && p.status !== 'rejected');
               const totalPaid = billPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
               const isPaid = totalPaid >= bill.amount;
               const pendingPayments = billPayments.filter(p => p.status === 'pending');

               return (
                 <div key={bill.id} className="border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                   <div>
                     <h4 className="font-bold text-gray-900">{bill.title}</h4>
                     <p className="text-sm text-gray-500">Rp {Number(bill.amount).toLocaleString('id-ID')} • {bill.billingType === 'monthly' ? 'Bulanan' : 'Insidental'}</p>
                     {pendingPayments.length > 0 && (
                       <span className="inline-block mt-2 text-xs font-medium bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">Ada pembayaran pending</span>
                     )}
                   </div>
                   <div className="text-right flex items-center gap-4">
                     <div>
                       <div className="text-xs text-gray-500 mb-1">Status</div>
                       {isPaid ? (
                         <span className="flex items-center text-green-600 font-bold text-sm"><CheckCircle2 className="w-4 h-4 mr-1"/> Lunas</span>
                       ) : (
                         <span className="text-red-600 font-bold text-sm">Kurang Rp {(bill.amount - totalPaid).toLocaleString('id-ID')}</span>
                       )}
                     </div>
                     {!isPaid && (
                       <button onClick={() => handlePayClick(bill)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                         Bayar
                       </button>
                     )}
                   </div>
                 </div>
               );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <Clock className="w-5 h-5 text-gray-600 mr-2" />
          Riwayat Pembayaran
        </h3>
        {loading ? <div className="py-4 text-center text-gray-500">Memuat...</div> : (
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Tagihan</th>
                    <th className="px-4 py-3">Metode</th>
                    <th className="px-4 py-3">Nominal</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-gray-500">Belum ada riwayat pembayaran</td></tr>
                  ) : payments.sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)).map(p => {
                     const bill = billings.find(b => b.id === p.billingId);
                     return (
                       <tr key={p.id} className="hover:bg-gray-50">
                         <td className="px-4 py-3">{p.createdAt?.toMillis ? new Date(p.createdAt.toMillis()).toLocaleDateString('id-ID') : '-'}</td>
                         <td className="px-4 py-3 font-medium text-gray-900">
                           {bill ? bill.title : 'Tagihan'}
                           {p.month && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">{p.month} {p.year || ''}</span>}
                           {p.isInstallment && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">Cicilan</span>}
                         </td>
                         <td className="px-4 py-3 uppercase">{p.method}</td>
                         <td className="px-4 py-3 font-bold text-gray-900">Rp {Number(p.amount).toLocaleString('id-ID')}</td>
                         <td className="px-4 py-3">
                           {p.status === 'approved' ? <span className="text-green-600 text-xs font-bold uppercase">Disetujui</span> :
                            p.status === 'rejected' ? <span className="text-red-600 text-xs font-bold uppercase">Ditolak</span> :
                            <span className="text-yellow-600 text-xs font-bold uppercase">Menunggu</span>}
                         </td>
                       </tr>
                     );
                  })}
                </tbody>
             </table>
          </div>
        )}
      </div>

      {showPaymentForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900">Pembayaran Tagihan</h3>
              <button onClick={() => setShowPaymentForm(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="w-5 h-5"/></button>
            </div>
            <form onSubmit={submitPayment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tagihan</label>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 font-medium text-gray-900">
                  {selectedBilling?.title}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nominal Pembayaran (Rp)</label>
                <input 
                  type="number" 
                  min="1"
                  required
                  value={payAmount} 
                  onChange={e => setPayAmount(e.target.value)} 
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" 
                />
              </div>
              {selectedBilling?.billingType === 'monthly' && (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Bulan</label>
                    <select 
                      required
                      value={payMonth} 
                      onChange={e => setPayMonth(e.target.value)} 
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">-- Pilih Bulan --</option>
                      {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tahun</label>
                    <select 
                      required
                      value={payYear} 
                      onChange={e => setPayYear(e.target.value)} 
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">-- Tahun --</option>
                      {Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Metode Pembayaran</label>
                <select 
                  value={payMethod} 
                  onChange={e => setPayMethod(e.target.value)} 
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="transfer">Transfer Bank</option>
                  <option value="cash">Tunai (ke TU/Bendahara)</option>
                  <option value="qris">QRIS</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowPaymentForm(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">Batal</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
                  {isSubmitting ? 'Memproses...' : 'Ajukan Pembayaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileTab({ profile }: { profile: any }) {
  const [parentCode, setParentCode] = useState('');
  const [parents, setParents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', phone: '', address: '', photoUrl: '' });

  useEffect(() => {
    fetchData();
  }, [profile?.uid]);

  const fetchData = async () => {
    if (!profile?.uid) return;
    setLoading(true);
    try {
      const parentRes = await getConnectedParents(profile?.parentWaNumber || profile?.phone || profile?.uid);
      setParents(parentRes || []);
      
      const codeRes = await getOrGenerateParentLinkCode(profile.uid);
      setParentCode(codeRes || '');
      setEditData({
         name: profile.name || '',
         phone: profile.phone || profile.waNumber || '',
         address: profile.address || '',
         photoUrl: profile.photoUrl || ''
      });
    } catch (error) {
       console.error(error);
    } finally {
       setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile?.uid) return;
    try {
      await updateStudentProfile(profile.uid, editData);
      setIsEditing(false);
      alert('Profil berhasil diperbarui');
    } catch (e) {
      console.error(e);
      alert('Gagal menyimpan profil');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <User className="w-5 h-5 text-blue-600 mr-2" />
            Informasi Profil
          </h3>
          {!isEditing && (
            <button onClick={() => setIsEditing(true)} className="text-sm font-medium text-blue-600 hover:text-blue-800">
              Edit Profil
            </button>
          )}
        </div>
        
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
              <input 
                type="text" 
                value={editData.name} 
                onChange={e => setEditData({...editData, name: e.target.value})} 
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Telepon / WhatsApp</label>
              <input 
                type="text" 
                value={editData.phone} 
                onChange={e => setEditData({...editData, phone: e.target.value})} 
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL Foto Profil</label>
              <input 
                type="text" 
                value={editData.photoUrl} 
                onChange={e => setEditData({...editData, photoUrl: e.target.value})} 
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" 
                placeholder="https://example.com/foto.jpg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
              <textarea 
                value={editData.address} 
                onChange={e => setEditData({...editData, address: e.target.value})} 
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" 
                rows={3}
              />
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">Batal</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                Simpan
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Nama Lengkap</div>
              <div className="font-medium text-gray-900">{profile?.name || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Email</div>
              <div className="font-medium text-gray-900">{profile?.email || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Nomor Induk Siswa (NIS)</div>
              <div className="font-medium text-gray-900">{profile?.nis || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Status</div>
              <div className="font-medium text-green-600">{profile?.status || 'Aktif'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Nomor Telepon</div>
              <div className="font-medium text-gray-900">{profile?.phone || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Alamat</div>
              <div className="font-medium text-gray-900">{profile?.address || '-'}</div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <QrCode className="w-5 h-5 text-gray-600 mr-2" />
          Koneksi Orang Tua
        </h3>
        {loading ? <div className="text-center py-4">Memuat...</div> : (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col items-center justify-center shrink-0">
                <div className="bg-white p-2 rounded-lg shadow-sm mb-3">
                  <QRCodeSVG value={parentCode || 'kode-koneksi-orang-tua'} size={120} />
                </div>
                <div className="text-xs text-gray-500 mb-1 uppercase font-bold tracking-wider">Kode Akses</div>
                <div className="font-mono text-xl font-bold text-blue-700 tracking-widest">{parentCode || '------'}</div>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 mb-2">Orang Tua Terhubung</h4>
                {parents.length === 0 ? (
                  <p className="text-gray-500 text-sm bg-blue-50 border border-blue-100 rounded-lg p-4">
                    Belum ada orang tua yang terhubung. Berikan kode QR atau kode akses di samping kepada orang tua/wali Anda untuk memantau perkembangan akademik Anda.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {parents.map(p => (
                      <div key={p.id} className="flex items-center p-3 border border-gray-100 rounded-lg bg-gray-50">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3 shrink-0">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{p.name || 'Orang Tua / Wali'}</div>
                          <div className="text-xs text-gray-500">{p.email || p.phone || 'Email tidak tersedia'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
