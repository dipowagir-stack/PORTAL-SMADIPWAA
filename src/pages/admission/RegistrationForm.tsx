import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { applicantService } from '../../domains/admission/services/ApplicantService';
import { Applicant } from '../../domains/admission/entities/Applicant';
import { UpdateApplicantDTO } from '../../domains/admission/dto';
import { AlertCircle, Save, Send, ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';

interface RegistrationFormProps {
  existingApplicant: Applicant | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function RegistrationForm({ existingApplicant, onCancel, onSuccess }: RegistrationFormProps) {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState<Partial<Applicant>>({
    academicYear: existingApplicant?.academicYear || '2026/2027',
    waveId: existingApplicant?.waveId || 'WAVE-1',
    applicantType: existingApplicant?.applicantType || 'REGULER',
    fullName: existingApplicant?.fullName || user?.displayName || '',
    nationalId: existingApplicant?.nationalId || '',
    birthPlace: existingApplicant?.birthPlace || '',
    birthDate: existingApplicant?.birthDate || '',
    gender: existingApplicant?.gender || 'L',
    religion: existingApplicant?.religion || '',
    address: existingApplicant?.address || '',
    phone: existingApplicant?.phone || '',
    email: existingApplicant?.email || user?.email || '',
    schoolOrigin: existingApplicant?.schoolOrigin || '',
    schoolOriginNpsn: existingApplicant?.schoolOriginNpsn || '',
    graduationYear: existingApplicant?.graduationYear || '',
    nisn: existingApplicant?.nisn || '',
    program: existingApplicant?.program || '',
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSaveDraft = async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    setError('');
    try {
      const dto: UpdateApplicantDTO = { ...formData };
      let currentId = existingApplicant?.id;
      if (currentId) {
        await applicantService.saveDraftApplicant(dto, user.uid, currentId);
      } else {
        const res = await applicantService.saveDraftApplicant(dto, user.uid);
        if (res.isSuccess) {
           // update id for future saves
           existingApplicant = { ...existingApplicant, id: res.getValue().id } as Applicant;
        }
      }
      if (!silent) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan draft');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const nextStep = async () => {
    await handleSaveDraft(true); // auto save draft when moving next
    setCurrentStep(prev => Math.min(prev + 1, 4));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Final client validation
    if (!formData.fullName || !formData.nationalId || !formData.email || !formData.phone || !formData.birthDate || !formData.schoolOrigin || !formData.applicantType) {
      setError('Harap isi semua field yang wajib (*).');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      let currentId = existingApplicant?.id;
      const dto: UpdateApplicantDTO = { ...formData };
      
      if (!currentId) {
        const resDraft = await applicantService.saveDraftApplicant(dto, user.uid);
        if (resDraft.isFailure) {
          setError(resDraft.getError() as string);
          setLoading(false);
          return;
        }
        currentId = resDraft.getValue().id;
      } else {
        await applicantService.saveDraftApplicant(dto, user.uid, currentId);
      }
      
      if (currentId) {
        const resSubmit = await applicantService.submitApplicant(currentId, user.uid);
        if (resSubmit.isFailure) {
          setError(resSubmit.getError());
        } else {
          onSuccess();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim pendaftaran');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowExitConfirm(true);
  };

  const confirmCancel = async () => {
    await handleSaveDraft(true);
    onCancel();
  };

  const renderProgress = () => {
    const steps = ['Data Pribadi', 'Data Sekolah', 'Pilihan PPDB', 'Review'];
    return (
      <div className="mb-8 border-b border-gray-100 pb-6">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-100 rounded-full" />
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-blue-500 rounded-full transition-all duration-300" style={{ width: `\${((currentStep - 1) / 3) * 100}%` }} />
          
          {steps.map((step, idx) => {
            const stepNum = idx + 1;
            const isPast = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;
            
            return (
              <div key={idx} className="relative z-10 flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold \${isPast ? 'bg-blue-600 text-white' : isCurrent ? 'bg-blue-500 text-white ring-4 ring-blue-100' : 'bg-white text-gray-400 border-2 border-gray-200'}`}>
                  {isPast ? <CheckCircle className="w-4 h-4" /> : stepNum}
                </div>
                <span className={`mt-2 text-xs font-medium hidden md:block \${isCurrent ? 'text-blue-600' : isPast ? 'text-gray-900' : 'text-gray-400'}`}>{step}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Keluar Form?</h3>
            <p className="text-sm text-gray-600 mb-6">Perubahan terakhir Anda akan disimpan sebagai draft.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowExitConfirm(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Batal</button>
              <button onClick={confirmCancel} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">Simpan & Keluar</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center sticky top-0 z-20">
          <h2 className="text-xl font-bold text-gray-900">Formulir Pendaftaran PPDB</h2>
          <button onClick={handleCancel} className="text-gray-500 hover:text-gray-700 font-medium text-sm">
            Simpan Draft & Tutup
          </button>
        </div>

        <div className="p-6">
          {renderProgress()}

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 border border-red-200 flex items-start text-red-600">
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* STEP 1: Data Pribadi */}
            <div className={currentStep === 1 ? 'block' : 'hidden'}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">1. Data Pribadi</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap *</label>
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required={currentStep===1} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NIK (Nomor Induk Kependudukan) *</label>
                  <input type="text" name="nationalId" value={formData.nationalId} onChange={handleChange} required={currentStep===1} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tempat Lahir</label>
                  <input type="text" name="birthPlace" value={formData.birthPlace} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Lahir *</label>
                  <input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} required={currentStep===1} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Kelamin</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agama</label>
                  <select name="religion" value={formData.religion} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">Pilih Agama</option>
                    <option value="ISLAM">Islam</option>
                    <option value="KRISTEN">Kristen</option>
                    <option value="KATOLIK">Katolik</option>
                    <option value="HINDU">Hindu</option>
                    <option value="BUDDHA">Buddha</option>
                    <option value="KONGHUCU">Konghucu</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alamat Lengkap</label>
                  <textarea name="address" value={formData.address} onChange={handleChange} rows={3} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomor HP/WhatsApp *</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required={currentStep===1} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required={currentStep===1} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
            </div>

            {/* STEP 2: Data Sekolah Asal */}
            <div className={currentStep === 2 ? 'block' : 'hidden'}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">2. Data Sekolah Asal</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Sekolah Asal *</label>
                  <input type="text" name="schoolOrigin" value={formData.schoolOrigin} onChange={handleChange} required={currentStep===2} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NPSN Sekolah Asal</label>
                  <input type="text" name="schoolOriginNpsn" value={formData.schoolOriginNpsn} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NISN (Siswa)</label>
                  <input type="text" name="nisn" value={formData.nisn} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Lulus</label>
                  <input type="text" name="graduationYear" value={formData.graduationYear} onChange={handleChange} placeholder="Contoh: 2026" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
            </div>

            {/* STEP 3: Data Akademik Awal */}
            <div className={currentStep === 3 ? 'block' : 'hidden'}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">3. Pilihan PPDB</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jalur Pendaftaran *</label>
                  <select name="applicantType" value={formData.applicantType} onChange={handleChange} required={currentStep===3} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="REGULER">Reguler</option>
                    <option value="PRESTASI">Prestasi</option>
                    <option value="AFIRMASI">Afirmasi</option>
                    <option value="PINDAH_TUGAS">Pindah Tugas Orang Tua</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pilihan Program/Jurusan</label>
                  <select name="program" value={formData.program} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">-- Pilih Program --</option>
                    <option value="IPA">Ilmu Pengetahuan Alam (IPA)</option>
                    <option value="IPS">Ilmu Pengetahuan Sosial (IPS)</option>
                    <option value="BAHASA">Bahasa</option>
                  </select>
                </div>
              </div>
            </div>

            {/* STEP 4: Review */}
            <div className={currentStep === 4 ? 'block' : 'hidden'}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">4. Review Pendaftaran</h3>
              <div className="space-y-6 text-sm">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm">Data Pribadi</h4>
                  <div className="grid grid-cols-2 gap-y-2">
                    <span className="text-gray-500">Nama Lengkap</span><span className="font-medium text-gray-900">{formData.fullName || '-'}</span>
                    <span className="text-gray-500">NIK</span><span className="font-medium text-gray-900">{formData.nationalId || '-'}</span>
                    <span className="text-gray-500">Tempat, Tanggal Lahir</span><span className="font-medium text-gray-900">{formData.birthPlace || '-'}, {formData.birthDate || '-'}</span>
                    <span className="text-gray-500">Jenis Kelamin</span><span className="font-medium text-gray-900">{formData.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                    <span className="text-gray-500">Email / Telp</span><span className="font-medium text-gray-900">{formData.email} / {formData.phone}</span>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm">Data Sekolah Asal</h4>
                  <div className="grid grid-cols-2 gap-y-2">
                    <span className="text-gray-500">Sekolah Asal</span><span className="font-medium text-gray-900">{formData.schoolOrigin || '-'}</span>
                    <span className="text-gray-500">NISN</span><span className="font-medium text-gray-900">{formData.nisn || '-'}</span>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm">Pilihan PPDB</h4>
                  <div className="grid grid-cols-2 gap-y-2">
                    <span className="text-gray-500">Jalur Pendaftaran</span><span className="font-medium text-gray-900">{formData.applicantType || '-'}</span>
                    <span className="text-gray-500">Program</span><span className="font-medium text-gray-900">{formData.program || '-'}</span>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-blue-800 text-sm">Saya menyatakan bahwa data yang saya isikan adalah benar dan dapat dipertanggungjawabkan.</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={loading}
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Kembali
                </button>
              ) : (
                <div />
              )}
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleSaveDraft(false)}
                  disabled={loading}
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Simpan Draft
                </button>
                
                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => {
                      // Basic validation before next
                      if (currentStep === 1 && (!formData.fullName || !formData.nationalId || !formData.email || !formData.phone)) {
                        setError('Harap lengkapi field wajib di Data Pribadi');
                        return;
                      }
                      if (currentStep === 2 && !formData.schoolOrigin) {
                        setError('Harap lengkapi field wajib di Data Sekolah');
                        return;
                      }
                      setError('');
                      nextStep();
                    }}
                    disabled={loading}
                    className="flex items-center px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Lanjut
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center px-6 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    {loading ? 'Mengirim...' : 'Kirim Pendaftaran'}
                    <Send className="w-4 h-4 ml-2" />
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

