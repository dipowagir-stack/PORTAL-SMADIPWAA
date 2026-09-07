import React, { useState, useEffect } from 'react';
import { admissionWaveService } from '../../domains/admission/services/AdmissionWaveService';
import { admissionDocumentService } from '../../domains/admission/services/AdmissionDocumentService';
import { AdmissionDocumentRequirement } from '../../domains/admission/entities/AdmissionDocumentRequirement';
import { AdmissionWave, WaveStatus } from '../../domains/admission/entities/AdmissionWave';
import { Link } from 'react-router-dom';
import { GraduationCap, ArrowRight, BookOpen, Clock, FileText, CheckCircle2, UserCircle2, Upload, CreditCard, Search, Megaphone, UserPlus, Calendar, ChevronDown, HelpCircle, Phone, Mail, MapPin } from 'lucide-react';

export default function PPDBLanding() {
  const [activeWave, setActiveWave] = useState<AdmissionWave | null>(null);
  const [requirements, setRequirements] = useState<AdmissionDocumentRequirement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWaves = async () => {
      const res = await admissionWaveService.getAllResult();
      if (res.isSuccess) {
        const waves = res.getValue()!;
        const openWaves = waves.filter(w => w.status === WaveStatus.OPEN);
        let currentWave = null;
        if (openWaves.length > 0) {
          currentWave = openWaves[0];
          setActiveWave(currentWave);
        } else if (waves.length > 0) {
          currentWave = waves[waves.length - 1];
          setActiveWave(currentWave);
        }
        
        if (currentWave) {
          const reqRes = await admissionDocumentService.getAllResult();
          if (reqRes.isSuccess) {
            const allReqs = reqRes.getValue()!;
            setRequirements(allReqs.filter(r => r.waveId === currentWave.id));
          }
        }
      }
      setLoading(false);
    };
    fetchWaves();
  }, []);

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getStatusText = (status: WaveStatus) => {
    switch(status) {
      case WaveStatus.OPEN: return 'Sedang Dibuka';
      case WaveStatus.CLOSED: return 'Ditutup';
      case WaveStatus.DRAFT: return 'Segera Dibuka';
      case WaveStatus.ARCHIVED: return 'Arsip';
      default: return 'Tidak Diketahui';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-xl tracking-tight text-gray-900 block">PPDB Online</span>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">SMAS Islam Diponegoro</span>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#informasi" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Informasi</a>
              <a href="#alur" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Alur Pendaftaran</a>
              <a href="#syarat" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Syarat</a>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2">
                Masuk
              </Link>
              <Link to="/login?role=applicant" className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-xl shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                Daftar Sekarang
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/40 via-slate-50 to-slate-50 -z-10"></div>
        <div className="absolute top-20 right-0 -translate-y-12 translate-x-1/3 w-[800px] h-[800px] bg-blue-50/50 rounded-full blur-3xl -z-10"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-8">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                {!loading && activeWave ? `${activeWave.name} ${getStatusText(activeWave.status)}` : 'Memuat informasi...'}
              </span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
              Penerimaan Peserta Didik Baru <span className="text-blue-600 inline-block">
                {!loading && activeWave ? `Tahun ${activeWave.academicYear}` : 'SMAS Islam Diponegoro'}
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-600 mb-10 leading-relaxed max-w-2xl mx-auto">
              Bergabunglah bersama kami untuk mewujudkan generasi yang unggul dalam prestasi, berakhlak mulia, dan berwawasan global.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Link to="/login?role=applicant" className="w-full sm:w-auto text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:shadow-xl hover:-translate-y-1 flex items-center justify-center">
                Daftar Sekarang <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <Link to="/login" className="w-full sm:w-auto text-base font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-8 py-4 rounded-xl shadow-sm transition-all flex items-center justify-center">
                Sudah Punya Akun? Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Alur Pendaftaran */}
      <section id="alur" className="py-24 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Alur Pendaftaran</h2>
            <p className="mt-4 text-lg text-gray-500">Proses pendaftaran dari awal hingga daftar ulang.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <StepCard 
              number="01" 
              title="Buat Akun" 
              description="Daftar melalui portal menggunakan akun Google Anda." 
              icon={<UserCircle2 className="w-6 h-6 text-blue-600" />} 
            />
            <StepCard 
              number="02" 
              title="Isi Formulir" 
              description="Lengkapi biodata diri, orang tua, dan asal sekolah." 
              icon={<FileText className="w-6 h-6 text-blue-600" />} 
            />
            <StepCard 
              number="03" 
              title="Unggah Dokumen" 
              description="Unggah scan dokumen persyaratan yang diminta." 
              icon={<Upload className="w-6 h-6 text-blue-600" />} 
            />
            <StepCard 
              number="04" 
              title="Pembayaran" 
              description="Bayar biaya pendaftaran sesuai dengan tagihan di sistem." 
              icon={<CreditCard className="w-6 h-6 text-blue-600" />} 
            />
            <StepCard 
              number="05" 
              title="Verifikasi" 
              description="Proses pengecekan kesesuaian data dan dokumen oleh panitia." 
              icon={<Search className="w-6 h-6 text-blue-600" />} 
            />
            <StepCard 
              number="06" 
              title="Seleksi" 
              description="Proses penyeleksian berkas sesuai kuota dan jalur." 
              icon={<BookOpen className="w-6 h-6 text-blue-600" />} 
            />
            <StepCard 
              number="07" 
              title="Pengumuman" 
              description="Lihat hasil kelulusan seleksi PPDB melalui dashboard." 
              icon={<Megaphone className="w-6 h-6 text-blue-600" />} 
            />
            <StepCard 
              number="08" 
              title="Daftar Ulang" 
              description="Bagi yang lulus, wajib melakukan registrasi ulang secara resmi." 
              icon={<UserPlus className="w-6 h-6 text-blue-600" />} 
            />
          </div>
        </div>
      </section>

      {/* Section 6: Biaya PPDB */}
      <section id="biaya" className="py-24 bg-slate-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Biaya Pendaftaran</h2>
            <p className="mt-4 text-lg text-gray-500">Rincian biaya administrasi untuk mengikuti seleksi PPDB.</p>
          </div>
          
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-gray-100 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <CreditCard className="w-32 h-32 text-blue-900" />
              </div>
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-8 border-b border-gray-100">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Formulir & Seleksi</h3>
                    <p className="text-gray-500 text-sm mt-1">Biaya pendaftaran PPDB</p>
                  </div>
                  <div className="mt-4 sm:mt-0 text-left sm:text-right">
                    <span className="text-3xl font-extrabold text-blue-600">Rp 150.000</span>
                    <span className="text-gray-400 text-sm block">/ Siswa</span>
                  </div>
                </div>
                
                <ul className="space-y-4 mb-10">
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 shrink-0 mt-0.5" />
                    <span className="text-gray-600">Akses penuh ke portal PPDB online</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 shrink-0 mt-0.5" />
                    <span className="text-gray-600">Proses verifikasi berkas dan validasi panitia</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 shrink-0 mt-0.5" />
                    <span className="text-gray-600">Biaya pelaksanaan tes seleksi (jika ada)</span>
                  </li>
                </ul>

                <div className="bg-blue-50 text-blue-800 text-sm p-4 rounded-xl mb-8 flex items-start">
                  <Clock className="w-5 h-5 text-blue-600 mr-3 shrink-0 mt-0.5" />
                  <p>Pembayaran <strong>tidak dilakukan di halaman ini</strong>. Tagihan akan diterbitkan otomatis di dalam akun Anda setelah proses pendaftaran awal selesai.</p>
                </div>
                
                <Link to="/login?role=applicant" className="w-full flex items-center justify-center text-base font-semibold text-white bg-slate-900 hover:bg-slate-800 px-6 py-4 rounded-xl shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                  Daftar untuk melanjutkan <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Jalur Pendaftaran */}
      <section id="jalur" className="py-24 bg-slate-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Jalur Pendaftaran</h2>
            <p className="mt-4 text-lg text-gray-500">Pilih jalur pendaftaran yang sesuai dengan kualifikasi Anda.</p>
          </div>
          
          {loading ? (
             <div className="text-center py-12">
               <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent mx-auto"></div>
             </div>
          ) : activeWave?.paths && activeWave.paths.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {activeWave.paths.map((path, idx) => (
                <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{path}</h3>
                  <p className="text-gray-500 text-sm">
                    Jalur pendaftaran {path} pada gelombang {activeWave.name}.
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm max-w-3xl mx-auto">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Belum Ada Konfigurasi Jalur</h3>
              <p className="text-gray-500">
                Panitia belum mengkonfigurasi jalur pendaftaran spesifik untuk gelombang ini. Silakan cek kembali nanti atau hubungi panitia PPDB.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Section 4: Persyaratan Dokumen & Info */}
      <section id="syarat" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="p-12 lg:p-16 flex flex-col justify-center">
                <h2 className="text-3xl font-bold text-white mb-6">Persyaratan Dokumen</h2>
                <p className="text-slate-300 mb-8">Siapkan dokumen-dokumen berikut sebelum memulai pengisian formulir pendaftaran.</p>
                
                {loading ? (
                  <p className="text-slate-400">Memuat persyaratan...</p>
                ) : requirements.length > 0 ? (
                  <ul className="space-y-4">
                    {requirements.map((req, idx) => (
                      <li key={idx} className="flex items-start">
                        <CheckCircle2 className="w-5 h-5 text-blue-400 mr-3 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-white font-medium block">{req.documentName}</span>
                          {req.applicantType && (
                            <span className="text-xs text-blue-300 block mt-0.5">Khusus Jalur: {req.applicantType}</span>
                          )}
                          <span className="text-xs text-slate-400 block mt-0.5">Maks. {(req.maxSizeBytes / 1024 / 1024).toFixed(1)}MB ({req.allowedTypes.join(', ')})</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                    <p className="text-slate-400 text-sm">Belum ada daftar dokumen yang dikonfigurasi untuk gelombang ini.</p>
                  </div>
                )}
                
                <div className="mt-10">
                  <Link to="/login?role=applicant" className="inline-flex items-center text-sm font-semibold text-slate-900 bg-white hover:bg-slate-50 px-6 py-3 rounded-xl transition-colors">
                    Daftar Sekarang <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </div>
              </div>
              <div className="relative hidden lg:block bg-slate-800">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 mix-blend-overlay"></div>
                <div className="h-full w-full flex items-center justify-center p-12">
                   <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/10 w-full max-w-sm">
                      <h3 className="text-xl font-bold text-white mb-2">Informasi Gelombang Aktif</h3>
                      {loading ? (
                        <p className="text-slate-300 text-sm">Memuat data...</p>
                      ) : activeWave ? (
                        <>
                          <p className="text-blue-300 text-sm mb-6 font-medium bg-blue-900/40 inline-block px-3 py-1 rounded-full border border-blue-500/30">
                            {activeWave.name} • {getStatusText(activeWave.status)}
                          </p>
                          
                          <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-white/10 pb-3">
                              <span className="text-sm text-slate-300">Tahun Ajaran</span>
                              <span className="text-sm font-medium text-white">{activeWave.academicYear}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-white/10 pb-3">
                              <span className="text-sm text-slate-300">Periode Pendaftaran</span>
                              <div className="text-right">
                                <span className="text-sm font-medium text-white block">{formatDate(activeWave.startDate)}</span>
                                <span className="text-xs text-slate-400">s/d {formatDate(activeWave.endDate)}</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-300">Kuota Tersedia</span>
                              <span className="text-sm font-medium text-white">
                                {activeWave.quota ? `${activeWave.quota} Siswa` : 'Tidak dibatasi'}
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="text-slate-300 text-sm">Belum ada gelombang pendaftaran yang dibuka saat ini.</p>
                      )}
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 7: Jadwal PPDB */}
      <section id="jadwal" className="py-24 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Jadwal Pelaksanaan</h2>
            <p className="mt-4 text-lg text-gray-500">Linimasa penting proses Penerimaan Peserta Didik Baru.</p>
          </div>
          
          <div className="max-w-3xl mx-auto">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent mx-auto"></div>
              </div>
            ) : activeWave ? (
              <div className="relative border-l-2 border-blue-100 ml-3 md:ml-0 md:border-none space-y-8">
                
                {/* 1. Pendaftaran */}
                <div className="relative flex flex-col md:flex-row md:items-center">
                  <div className="hidden md:flex md:w-1/3 justify-end pr-8 text-right">
                    <div className="text-sm font-bold text-gray-900">{formatDate(activeWave.startDate)}</div>
                    <div className="text-xs text-gray-500 ml-2">s/d {formatDate(activeWave.endDate)}</div>
                  </div>
                  <div className="absolute -left-[21px] md:relative md:left-0 w-10 h-10 bg-white border-4 border-blue-100 rounded-full flex items-center justify-center shrink-0 z-10 shadow-sm">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  </div>
                  <div className="ml-8 md:ml-0 md:w-1/3 md:pl-8">
                    <div className="md:hidden text-sm font-bold text-blue-600 mb-1">{formatDate(activeWave.startDate)} - {formatDate(activeWave.endDate)}</div>
                    <h3 className="text-lg font-bold text-gray-900">Pendaftaran Dibuka</h3>
                    <p className="text-gray-500 text-sm mt-1">Pembukaan portal pendaftaran secara online</p>
                  </div>
                </div>

                {/* 2. Verifikasi */}
                {activeWave.scheduleVerification && (
                  <div className="relative flex flex-col md:flex-row md:items-center">
                    <div className="hidden md:flex md:w-1/3 justify-end pr-8 text-right">
                      <div className="text-sm font-bold text-gray-900">{formatDate(activeWave.scheduleVerification)}</div>
                    </div>
                    <div className="absolute -left-[21px] md:relative md:left-0 w-10 h-10 bg-white border-4 border-blue-100 rounded-full flex items-center justify-center shrink-0 z-10 shadow-sm">
                      <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                    </div>
                    <div className="ml-8 md:ml-0 md:w-1/3 md:pl-8">
                      <div className="md:hidden text-sm font-bold text-blue-600 mb-1">{formatDate(activeWave.scheduleVerification)}</div>
                      <h3 className="text-lg font-bold text-gray-900">Verifikasi Dokumen</h3>
                      <p className="text-gray-500 text-sm mt-1">Pengecekan berkas oleh panitia</p>
                    </div>
                  </div>
                )}

                {/* 3. Seleksi */}
                {activeWave.scheduleSelection && (
                  <div className="relative flex flex-col md:flex-row md:items-center">
                    <div className="hidden md:flex md:w-1/3 justify-end pr-8 text-right">
                      <div className="text-sm font-bold text-gray-900">{formatDate(activeWave.scheduleSelection)}</div>
                    </div>
                    <div className="absolute -left-[21px] md:relative md:left-0 w-10 h-10 bg-white border-4 border-blue-100 rounded-full flex items-center justify-center shrink-0 z-10 shadow-sm">
                      <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                    </div>
                    <div className="ml-8 md:ml-0 md:w-1/3 md:pl-8">
                      <div className="md:hidden text-sm font-bold text-indigo-600 mb-1">{formatDate(activeWave.scheduleSelection)}</div>
                      <h3 className="text-lg font-bold text-gray-900">Proses Seleksi</h3>
                      <p className="text-gray-500 text-sm mt-1">Seleksi nilai dan kualifikasi pendaftar</p>
                    </div>
                  </div>
                )}

                {/* 4. Pengumuman */}
                {activeWave.scheduleAnnouncement && (
                  <div className="relative flex flex-col md:flex-row md:items-center">
                    <div className="hidden md:flex md:w-1/3 justify-end pr-8 text-right">
                      <div className="text-sm font-bold text-gray-900">{formatDate(activeWave.scheduleAnnouncement)}</div>
                    </div>
                    <div className="absolute -left-[21px] md:relative md:left-0 w-10 h-10 bg-white border-4 border-emerald-100 rounded-full flex items-center justify-center shrink-0 z-10 shadow-sm">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    </div>
                    <div className="ml-8 md:ml-0 md:w-1/3 md:pl-8">
                      <div className="md:hidden text-sm font-bold text-emerald-600 mb-1">{formatDate(activeWave.scheduleAnnouncement)}</div>
                      <h3 className="text-lg font-bold text-gray-900">Pengumuman Kelulusan</h3>
                      <p className="text-gray-500 text-sm mt-1">Hasil seleksi dipublikasikan di portal</p>
                    </div>
                  </div>
                )}

                {/* 5. Daftar Ulang */}
                {activeWave.scheduleRegistration && (
                  <div className="relative flex flex-col md:flex-row md:items-center">
                    <div className="hidden md:flex md:w-1/3 justify-end pr-8 text-right">
                      <div className="text-sm font-bold text-gray-900">{formatDate(activeWave.scheduleRegistration)}</div>
                    </div>
                    <div className="absolute -left-[21px] md:relative md:left-0 w-10 h-10 bg-white border-4 border-amber-100 rounded-full flex items-center justify-center shrink-0 z-10 shadow-sm">
                      <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                    </div>
                    <div className="ml-8 md:ml-0 md:w-1/3 md:pl-8">
                      <div className="md:hidden text-sm font-bold text-amber-600 mb-1">{formatDate(activeWave.scheduleRegistration)}</div>
                      <h3 className="text-lg font-bold text-gray-900">Daftar Ulang</h3>
                      <p className="text-gray-500 text-sm mt-1">Batas akhir registrasi peserta yang lulus</p>
                    </div>
                  </div>
                )}
                
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-gray-100">
                <Calendar className="w-10 h-10 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">Jadwal Belum Tersedia</h3>
                <p className="text-gray-500">Belum ada informasi jadwal untuk gelombang ini.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section 8: FAQ */}
      <section id="faq" className="py-24 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
              <HelpCircle className="w-8 h-8 text-blue-600 -rotate-3" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Pertanyaan Umum (FAQ)</h2>
            <p className="mt-4 text-lg text-gray-500">Temukan jawaban untuk pertanyaan yang sering diajukan terkait PPDB.</p>
          </div>
          
          <div className="space-y-4">
            <FAQItem 
              question="Apakah pendaftaran PPDB bisa dilakukan secara offline?" 
              answer="Sistem PPDB kami dilakukan secara full-online untuk memudahkan transparansi dan akses. Jika Anda mengalami kesulitan teknis, Anda dapat datang ke sekolah pada jam kerja untuk mendapatkan panduan pengisian dari panitia." 
            />
            <FAQItem 
              question="Bagaimana jika saya belum memiliki SKL atau Ijazah saat mendaftar?" 
              answer="Jika SKL atau Ijazah belum terbit, Anda dapat menggunakan Surat Keterangan Kelas 9 atau Rapor semester terakhir yang dilegalisir dari sekolah asal sebagai dokumen sementara. Ijazah asli wajib diserahkan saat proses Daftar Ulang." 
            />
            <FAQItem 
              question="Apakah saya harus membayar biaya pendaftaran sebelum mengisi formulir?" 
              answer="Tidak. Anda harus membuat akun dan mengisi formulir pendaftaran awal terlebih dahulu. Setelah itu, sistem akan otomatis menerbitkan tagihan pendaftaran yang bisa Anda bayarkan." 
            />
            <FAQItem 
              question="Kapan pengumuman hasil seleksi PPDB?" 
              answer="Pengumuman hasil seleksi akan diinformasikan sesuai dengan jadwal gelombang yang aktif. Anda dapat melihat status kelulusan langsung di dashboard akun Anda." 
            />
            <FAQItem 
              question="Apakah ada kuota khusus untuk pendaftar melalui jalur prestasi?" 
              answer="Tentu. Panitia menyediakan kuota khusus untuk Jalur Prestasi Akademik dan Non-Akademik. Pastikan Anda memilih jalur yang tepat saat mengisi formulir dan menyiapkan dokumen sertifikat pendukung." 
            />
          </div>
        </div>
      </section>

      {/* Section 9: Kontak Panitia */}
      <section id="kontak" className="py-24 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Pusat Bantuan & Layanan Informasi</h2>
            <p className="mt-4 text-lg text-gray-500">Hubungi panitia PPDB kami jika Anda memiliki pertanyaan atau kendala.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 text-center hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Phone className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">WhatsApp / Telepon</h3>
              <p className="text-gray-500 mb-4 text-sm">Hubungi kami via pesan atau telepon pada jam kerja.</p>
              <a href="#" className="inline-block font-semibold text-green-600 hover:text-green-700">+62 812-3456-7890</a>
            </div>

            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 text-center hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Email</h3>
              <p className="text-gray-500 mb-4 text-sm">Kirimkan pertanyaan detail melalui alamat surel kami.</p>
              <a href="mailto:ppdb@smasdiponegorowagir.sch.id" className="inline-block font-semibold text-blue-600 hover:text-blue-700">ppdb@smasdiponegorowagir.sch.id</a>
            </div>

            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 text-center hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Sekretariat PPDB</h3>
              <p className="text-gray-500 mb-4 text-sm">Kunjungi sekretariat kami untuk layanan langsung.</p>
              <p className="font-medium text-gray-900">Jl. Raya Wagir No.1, Kab. Malang</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 10: Call to Action (CTA) */}
      <section className="py-24 bg-blue-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-6">
            Siap Membangun Masa Depan Bersama Kami?
          </h2>
          <p className="text-blue-100 text-lg mb-10 leading-relaxed max-w-2xl mx-auto">
            Kuota pendaftaran terbatas. Segera buat akun Anda dan mulailah proses pendaftaran sekarang juga.
          </p>
          <Link to="/login?role=applicant" className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-blue-600 bg-white rounded-full shadow-xl hover:bg-slate-50 hover:shadow-2xl hover:-translate-y-1 transition-all">
            Mulai Pendaftaran <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center items-center space-x-2 mb-4">
            <GraduationCap className="w-6 h-6 text-gray-400" />
            <span className="font-bold text-gray-900">EduOS</span>
          </div>
          <p className="text-gray-500 text-sm">
            © 2026 SMAS Islam Diponegoro Wagir. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function StepCard({ number, title, description, icon }: { number: string, title: string, description: string, icon: React.ReactNode }) {
  return (
    <div className="relative p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-lg transition-shadow">
      <div className="text-4xl font-extrabold text-slate-200 absolute top-4 right-6 -z-0">
        {number}
      </div>
      <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center mb-6 relative z-10">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2 relative z-10">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed relative z-10">{description}</p>
    </div>
  );
}

function ListItem({ text }: { text: string }) {
  return (
    <li className="flex items-start">
      <CheckCircle2 className="w-5 h-5 text-blue-400 mr-3 shrink-0 mt-0.5" />
      <span className="text-slate-300">{text}</span>
    </li>
  );
}



function FAQItem({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden transition-all duration-200 hover:border-blue-200">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full text-left px-6 py-5 flex items-center justify-between focus:outline-none"
      >
        <h4 className="font-semibold text-gray-900 pr-4">{question}</h4>
        <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
      </button>
      <div className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 pb-5 opacity-100' : 'max-h-0 opacity-0'}`}>
        <p className="text-gray-600 text-sm leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}
