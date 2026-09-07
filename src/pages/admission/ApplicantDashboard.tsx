import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { applicantService } from '../../domains/admission/services/ApplicantService';
import { admissionResultService } from '../../domains/admission/services/AdmissionResultService';
import { Applicant, ApplicantStatus } from '../../domains/admission/entities/Applicant';
import RegistrationForm from './RegistrationForm';
import ApplicantDocumentPanel from './ApplicantDocumentPanel';
import ApplicantPaymentPanel from './ApplicantPaymentPanel';
import { getUserNotifications } from '../../domains/notification/services';
import { Loader2, FileText, CheckCircle, AlertCircle, Clock, ChevronRight, User, Upload, CreditCard, Award, Bell } from 'lucide-react';

export default function ApplicantDashboard() {
  const { user } = useAuth();
  const [applicant, setApplicant] = useState<Applicant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'documents' | 'payment' | 'status'>('profile');
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchApplicantAndNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [appRes, notifRes] = await Promise.all([
        applicantService.getApplicantByUserId(user.uid),
        getUserNotifications(user.uid)
      ]);
      
      if (appRes.isFailure) {
        setError(appRes.getError());
      } else {
        setApplicant(appRes.getValue());
      }

      if (notifRes.isSuccess) {
        const unread = notifRes.getValue().filter(n => n.status !== 'read');
        setUnreadCount(unread.length);
      }
    } catch (err) {
      setError('Gagal memuat data pendaftar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicantAndNotifications();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="rounded-lg bg-red-50 p-4 border border-red-200">
          <div className="flex items-center text-red-600 mb-2">
            <AlertCircle className="w-5 h-5 mr-2" />
            <h3 className="font-semibold">Terjadi Kesalahan</h3>
          </div>
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="bg-gray-50 min-h-screen py-8">
        <RegistrationForm 
          existingApplicant={applicant} 
          onCancel={() => setShowForm(false)} 
          onSuccess={() => {
            setShowForm(false);
            fetchApplicantAndNotifications();
          }} 
        />
      </div>
    );
  }

  const renderStepper = () => {
    if (!applicant) return null;
    const steps = [
      { id: 'form', label: 'Pendaftaran', completed: applicant.status !== ApplicantStatus.DRAFT, current: applicant.status === ApplicantStatus.DRAFT },
      { id: 'docs', label: 'Dokumen', completed: [ApplicantStatus.VERIFIED, ApplicantStatus.SELECTED, ApplicantStatus.ENROLLED, ApplicantStatus.DOCUMENT_REVIEW].includes(applicant.status), current: [ApplicantStatus.SUBMITTED, ApplicantStatus.DOCUMENT_REVISION].includes(applicant.status) },
      { id: 'verif', label: 'Verifikasi', completed: [ApplicantStatus.VERIFIED, ApplicantStatus.SELECTED, ApplicantStatus.ENROLLED].includes(applicant.status), current: applicant.status === ApplicantStatus.DOCUMENT_REVIEW },
      { id: 'sel', label: 'Seleksi', completed: [ApplicantStatus.SELECTED, ApplicantStatus.NOT_SELECTED, ApplicantStatus.ENROLLED].includes(applicant.status), current: applicant.status === ApplicantStatus.VERIFIED },
    ];

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-100 rounded-full" />
            
            {steps.map((step, idx) => {
              const isPast = step.completed;
              const isCurrent = step.current;
              
              return (
                <div key={idx} className="relative z-10 flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors \${isPast ? 'bg-blue-600 text-white' : isCurrent ? 'bg-blue-500 text-white ring-4 ring-blue-100' : 'bg-white text-gray-400 border-2 border-gray-200'}`}>
                    {isPast ? <CheckCircle className="w-5 h-5" /> : (idx + 1)}
                  </div>
                  <span className={`mt-3 text-sm font-medium \${isCurrent ? 'text-blue-600' : isPast ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const getPriorityAction = () => {
    if (!applicant) return null;
    switch (applicant.status) {
      case ApplicantStatus.DRAFT:
        return { title: 'Lanjutkan Pendaftaran', desc: 'Formulir Anda belum selesai. Selesaikan pengisian data untuk melanjutkan.', action: () => setShowForm(true), btnText: 'Lanjutkan' };
      case ApplicantStatus.SUBMITTED:
      case ApplicantStatus.DOCUMENT_REVISION:
        return { title: 'Lengkapi Dokumen', desc: 'Silakan unggah dokumen persyaratan yang diminta.', action: () => setActiveTab('documents'), btnText: 'Unggah Dokumen' };
      case ApplicantStatus.DOCUMENT_REVIEW:
        return { title: 'Menunggu Verifikasi', desc: 'Dokumen Anda sedang diperiksa oleh panitia. Mohon cek secara berkala.', action: () => setActiveTab('documents'), btnText: 'Lihat Status' };
      case ApplicantStatus.VERIFIED:
        return { title: 'Verifikasi Selesai', desc: 'Dokumen Anda telah terverifikasi. Menunggu proses seleksi.', action: () => setActiveTab('status'), btnText: 'Lihat Hasil' };
      case ApplicantStatus.SELECTED:
        return { title: 'Selamat! Anda Lulus Seleksi', desc: 'Silakan ikuti instruksi daftar ulang selanjutnya.', action: () => setActiveTab('status'), btnText: 'Info Daftar Ulang' };
      default:
        return { title: 'Status Pendaftaran', desc: 'Lihat status terbaru pendaftaran Anda.', action: () => setActiveTab('status'), btnText: 'Lihat' };
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      
      {!applicant ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 md:p-12 text-center">
          <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Selamat Datang di Portal PPDB</h1>
          <p className="text-gray-500 mb-8 max-w-lg mx-auto">
            Anda belum memulai proses pendaftaran. Silakan siapkan data diri dan dokumen pendukung, lalu klik tombol di bawah ini untuk memulai.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors shadow-sm inline-flex items-center"
          >
            Mulai Pendaftaran Sekarang
            <ChevronRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Applicant</h1>
              <p className="text-gray-500">No. Pendaftaran: <span className="font-mono font-medium text-gray-900">{applicant.registrationNumber || 'Menunggu'}</span></p>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>
              <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm flex items-center">
                <span className="text-sm text-gray-500 mr-2">Status:</span>
                <span className="font-bold text-blue-700">{applicant.status}</span>
              </div>
            </div>
          </div>

          {renderStepper()}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Priority Action Card */}
            <div className="lg:col-span-1">
              <div className="bg-blue-600 rounded-xl shadow-sm p-6 text-white h-full flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <AlertCircle className="w-32 h-32" />
                </div>
                <div className="relative z-10 flex-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-200 mb-2">Aksi Prioritas</h3>
                  <h2 className="text-xl font-bold mb-2">{getPriorityAction()?.title}</h2>
                  <p className="text-blue-100 text-sm mb-6">{getPriorityAction()?.desc}</p>
                </div>
                <div className="relative z-10 mt-auto">
                  <button
                    onClick={getPriorityAction()?.action}
                    className="w-full bg-white text-blue-700 hover:bg-blue-50 px-4 py-2.5 rounded-lg font-bold transition-colors flex items-center justify-center"
                  >
                    {getPriorityAction()?.btnText}
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px] flex flex-col">
                <div className="flex border-b border-gray-100 overflow-x-auto">
                  <button onClick={() => setActiveTab('profile')} className={`flex items-center px-5 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors \${activeTab === 'profile' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                    <User className="w-4 h-4 mr-2" /> Data Profil
                  </button>
                  <button onClick={() => setActiveTab('documents')} disabled={applicant.status === ApplicantStatus.DRAFT} className={`flex items-center px-5 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors \${applicant.status === ApplicantStatus.DRAFT ? 'opacity-50 cursor-not-allowed' : activeTab === 'documents' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                    <Upload className="w-4 h-4 mr-2" /> Dokumen
                  </button>
                  <button onClick={() => setActiveTab('payment')} disabled={applicant.status === ApplicantStatus.DRAFT} className={`flex items-center px-5 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors \${applicant.status === ApplicantStatus.DRAFT ? 'opacity-50 cursor-not-allowed' : activeTab === 'payment' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                    <CreditCard className="w-4 h-4 mr-2" /> Pembayaran
                  </button>
                  <button onClick={() => setActiveTab('status')} disabled={applicant.status === ApplicantStatus.DRAFT} className={`flex items-center px-5 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors \${applicant.status === ApplicantStatus.DRAFT ? 'opacity-50 cursor-not-allowed' : activeTab === 'status' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                    <Award className="w-4 h-4 mr-2" /> Seleksi
                  </button>
                </div>

                <div className="p-6 flex-1 bg-gray-50/30">
                  {activeTab === 'profile' && (
                    <div className="space-y-6">
                      {applicant.status === ApplicantStatus.DRAFT && (
                        <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 mb-4 flex items-start">
                          <AlertCircle className="w-5 h-5 text-orange-500 mr-3 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-orange-800">Draft Tersimpan</h4>
                            <p className="text-sm text-orange-600 mt-1">Anda dapat melanjutkan pengisian form dengan menekan tombol Lanjutkan Pendaftaran di samping.</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                          <h4 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Data Pribadi</h4>
                          <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-3 gap-2">
                              <span className="text-gray-500">Nama</span>
                              <span className="col-span-2 font-medium text-gray-900">{applicant.fullName || '-'}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <span className="text-gray-500">NIK</span>
                              <span className="col-span-2 font-medium text-gray-900">{applicant.nationalId || '-'}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <span className="text-gray-500">Email</span>
                              <span className="col-span-2 font-medium text-gray-900">{applicant.email || '-'}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <span className="text-gray-500">No. HP</span>
                              <span className="col-span-2 font-medium text-gray-900">{applicant.phone || '-'}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                          <h4 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Informasi Akademik</h4>
                          <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-3 gap-2">
                              <span className="text-gray-500">Tahun Ajaran</span>
                              <span className="col-span-2 font-medium text-gray-900">{applicant.academicYear || '-'}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <span className="text-gray-500">Jalur</span>
                              <span className="col-span-2 font-medium text-gray-900">{applicant.applicantType || '-'}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <span className="text-gray-500">Sekolah Asal</span>
                              <span className="col-span-2 font-medium text-gray-900">{applicant.schoolOrigin || '-'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'documents' && applicant.id && (
                    <div className="-mt-8">
                      <ApplicantDocumentPanel applicantId={applicant.id} />
                    </div>
                  )}

                  {activeTab === 'payment' && applicant.id && (
                    <div className="-mt-8">
                      <ApplicantPaymentPanel applicantId={applicant.id} />
                    </div>
                  )}

                  {activeTab === 'status' && (
                    <div className="bg-white border border-gray-100 rounded-xl p-8 text-center shadow-sm max-w-2xl mx-auto mt-4">
                      {!applicant.publishedAt ? (
                        <>
                          <Clock className="w-16 h-16 text-blue-500 mx-auto mb-4 opacity-50" />
                          <h3 className="text-lg font-bold text-gray-900 mb-2">Menunggu Pengumuman</h3>
                          <p className="text-gray-600 text-sm mb-6">
                            Hasil seleksi Anda belum diumumkan. Pengumuman seleksi akan diinformasikan melalui halaman ini setelah seluruh proses seleksi selesai.
                          </p>
                          <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-full font-medium text-sm">
                            <Clock className="w-4 h-4 mr-2" />
                            Terus pantau portal ini
                          </div>
                        </>
                      ) : (
                        <>
                          {applicant.status === ApplicantStatus.SELECTED && (
                            <>
                              <Award className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                              <h3 className="text-2xl font-bold text-emerald-600 mb-2">Selamat, Anda Lulus Seleksi!</h3>
                              <p className="text-gray-600 text-sm mb-6">
                                Anda telah diterima sebagai calon siswa. Langkah selanjutnya adalah melakukan proses daftar ulang.
                              </p>
                              
                              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 text-left mb-6">
                                <h4 className="font-bold text-emerald-900 mb-4">Status Daftar Ulang</h4>
                                
                                <div className="space-y-4">
                                  <div className="flex justify-between items-center pb-3 border-b border-emerald-100/50">
                                    <span className="text-sm font-medium text-emerald-800">Status</span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                      applicant.reRegistrationStatus === 'COMPLETED' ? 'bg-emerald-200 text-emerald-900' :
                                      applicant.reRegistrationStatus === 'EXPIRED' ? 'bg-red-200 text-red-900' :
                                      'bg-yellow-200 text-yellow-900'
                                    }`}>
                                      {applicant.reRegistrationStatus || 'PENDING'}
                                    </span>
                                  </div>
                                  
                                  {applicant.reRegistrationDeadline && (
                                    <div className="flex justify-between items-center pb-3 border-b border-emerald-100/50">
                                      <span className="text-sm font-medium text-emerald-800">Batas Waktu</span>
                                      <span className="text-sm font-bold text-red-600">
                                        {new Date(applicant.reRegistrationDeadline).toLocaleDateString('id-ID')}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                
                                {applicant.reRegistrationStatus !== 'COMPLETED' && applicant.reRegistrationStatus !== 'EXPIRED' && (
                                  <button 
                                    onClick={async () => {
                                      if (confirm('Apakah Anda yakin ingin menyelesaikan daftar ulang sekarang? Pastikan semua tagihan daftar ulang telah dibayar (jika ada).')) {
                                        if (!user) return;
                                        try {
                                          const res = await admissionResultService.completeReRegistration(applicant.id!, user.uid);
                                          if (res.isFailure) {
                                            alert(res.getError());
                                          } else {
                                            alert('Daftar ulang berhasil diselesaikan!');
                                            fetchApplicantAndNotifications(); // Refresh data
                                          }
                                        } catch (e) {
                                          console.error(e);
                                          alert('Terjadi kesalahan sistem.');
                                        }
                                      }
                                    }}
                                    className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center"
                                  >
                                    <CheckCircle className="w-5 h-5 mr-2" />
                                    Konfirmasi Daftar Ulang
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                          
                          {applicant.status === ApplicantStatus.WAITLISTED && (
                            <>
                              <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                              <h3 className="text-xl font-bold text-yellow-600 mb-2">Status Daftar Tunggu</h3>
                              <p className="text-gray-600 text-sm mb-6">
                                Anda masuk dalam daftar tunggu. Kami akan menginformasikan kembali jika terdapat kuota yang tersedia dari calon siswa yang mengundurkan diri atau tidak melakukan daftar ulang.
                              </p>
                              <div className="inline-flex items-center px-4 py-2 bg-yellow-50 text-yellow-700 rounded-full font-medium text-sm">
                                <Clock className="w-4 h-4 mr-2" />
                                Harap bersabar menunggu
                              </div>
                            </>
                          )}
                          
                          {applicant.status === ApplicantStatus.NOT_SELECTED && (
                            <>
                              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                              <h3 className="text-xl font-bold text-red-600 mb-2">Mohon Maaf, Anda Tidak Lulus</h3>
                              <p className="text-gray-600 text-sm mb-6">
                                Berdasarkan hasil seleksi, Anda belum memenuhi kriteria untuk diterima pada gelombang ini. Tetap semangat dan jangan menyerah!
                              </p>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
