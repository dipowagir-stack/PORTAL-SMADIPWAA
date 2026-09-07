import React, { useState, useRef } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { useAuth, UserRole } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { GraduationCap, UserCircle, BookOpen, UserCog, Upload, Shield, Briefcase } from 'lucide-react';

export default function SetupProfile() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [role, setRole] = useState<UserRole>((new URLSearchParams(location.search).get('role') as UserRole) || null);
  const [name, setName] = useState(user?.displayName?.toUpperCase() || '');
  const [waNumber, setWaNumber] = useState('');
  const [waParentNumber, setWaParentNumber] = useState('');
  const [nisn, setNisn] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isClaimMode, setIsClaimMode] = useState(false);
  const [claimNisn, setClaimNisn] = useState('');
  const [claimCode, setClaimCode] = useState('');

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>;
  }

  if (!user) {
    const routingMode = localStorage.getItem('tenantRoutingMode');
    const lastSubdomain = localStorage.getItem('lastTenantSubdomain');
    
    let redirectPath = "/login";
    if (routingMode === 'saas' && lastSubdomain) {
      redirectPath = `/s/${lastSubdomain}/login`;
    }
    
    return <Navigate to={redirectPath} replace />;
  }

  if (profile) {
    if (profile.role === 'applicant') {
      return <Navigate to="/ppdb/dashboard" replace />;
    }
    if (['platform_admin', 'platform_support', 'platform_engineer'].includes(profile.role || '')) {
      return <Navigate to="/platform" replace />;
    }
    
    // Check for a specific redirect in URL
    const searchParams = new URLSearchParams(location.search);
    const redirectUrl = searchParams.get('redirect');
    if (redirectUrl) {
      return <Navigate to={redirectUrl} replace />;
    }
    
    // Default to app dashboard for tenant users
    return <Navigate to="/app" replace />;
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // Increased to 5MB before compression
        setError('Ukuran file maksimal 5MB sebelum kompresi');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimension 400px
          const MAX_DIM = 400;
          if (width > height) {
            if (width > MAX_DIM) {
              height *= MAX_DIM / width;
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width *= MAX_DIM / height;
              height = MAX_DIM;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress with WebP or JPEG
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          
          setPhotoUrl(compressedDataUrl);
          setError('');
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimNisn || !claimCode) {
      setError('NISN dan Kode Aktivasi wajib diisi');
      return;
    }
    
    setIsSubmitting(true);
    setError('');

    try {
      const q = query(collection(db, 'users'), 
        where('nisn', '==', claimNisn),
        where('activationCode', '==', claimCode.toUpperCase()),
        where('isOfflineAccount', '==', true)
      );
      
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setError('Data tidak ditemukan atau kode aktivasi salah');
        setIsSubmitting(false);
        return;
      }
      
      const offlineDoc = snap.docs[0];
      
      if (offlineDoc.data().isClaimed) {
        setError('Akun offline ini sudah diklaim sebelumnya');
        setIsSubmitting(false);
        return;
      }
      
      await updateDoc(doc(db, 'users', offlineDoc.id), {
        authUid: user?.uid,
        email: user?.email,
        updatedAt: Date.now(),
        isClaimed: true,
      });
      
      await refreshProfile();
      if (role === 'applicant') {
        navigate('/ppdb/dashboard', { replace: true });
      } else if (['platform_admin', 'platform_support', 'platform_engineer'].includes(role)) {
        navigate('/platform-hub', { replace: true });
      } else {
        navigate('/app', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat mengklaim akun');
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) {
      setError('Silahkan pilih peran Anda');
      return;
    }
    if (!name.trim()) {
      setError('Nama lengkap wajib diisi');
      return;
    }
    if (!waNumber) {
      setError('Nomor WhatsApp wajib diisi');
      return;
    }
    if (role === 'student') {
      if (!nisn.trim()) {
        setError('NISN wajib diisi untuk siswa');
        return;
      }
      if (!waParentNumber) {
        setError('Nomor WhatsApp orang tua wajib diisi untuk siswa');
        return;
      }
    }
    if (!photoUrl) {
      setError('Foto profil wajib diunggah');
      return;
    }
    
    // Check PIN for protected roles
    // Validate PIN from settings
    if (role === 'curriculum' || role === 'tu' || role === 'admin' || role === 'super_admin') {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'global'));
        if (docSnap.exists()) {
          const settings = docSnap.data();
          if (role === 'curriculum' && pin !== settings.pinCurriculum) {
            setError('PIN Kurikulum tidak valid');
            setIsSubmitting(false);
            return;
          }
          if (role === 'tu' && pin !== settings.pinTU) {
            setError('PIN Tata Usaha tidak valid');
            setIsSubmitting(false);
            return;
          }
          if (role === 'admin' && pin !== settings.pinPrincipal) {
            setError('PIN Kepala Sekolah tidak valid');
            setIsSubmitting(false);
            return;
          }
          if (role === 'super_admin' && pin !== settings.pinSuperAdmin) {
            setError('PIN Super Admin tidak valid');
            setIsSubmitting(false);
            return;
          }
        } else {
          // Fallback if settings don't exist yet
          if (role === 'curriculum' && pin !== '2024') {
            setError('PIN Kurikulum tidak valid'); setIsSubmitting(false); return;
          }
          if (role === 'tu' && pin !== '4321') {
            setError('PIN Tata Usaha tidak valid'); setIsSubmitting(false); return;
          }
          if (role === 'admin' && pin !== '123456') {
            setError('PIN Kepala Sekolah tidak valid'); setIsSubmitting(false); return;
          }
          if (role === 'super_admin' && pin !== '999999') {
            setError('PIN Super Admin tidak valid'); setIsSubmitting(false); return;
          }
        }
      } catch (e) {
        console.error("Error validating PIN:", e);
        setError('Terjadi kesalahan saat memvalidasi PIN. Coba lagi.');
        setIsSubmitting(false);
        return;
      }
    }

    setIsSubmitting(true);
    setError('');

    try {
      const userData = {
        uid: user.uid,
        email: user.email,
        name: name.toUpperCase(),
        role,
        waNumber,
        photoUrl,
        ...(role === 'student' ? { waParentNumber, nisn, points: 0 } : {}),
        createdAt: Date.now(),
      };

      await setDoc(doc(db, 'users', user.uid), userData);
      await refreshProfile();
      if (role === 'applicant') {
        navigate('/ppdb/dashboard', { replace: true });
      } else if (['platform_admin', 'platform_support', 'platform_engineer'].includes(role)) {
        navigate('/platform-hub', { replace: true });
      } else {
        navigate('/app', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan profil');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Lengkapi Profil Anda
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Pendaftaran awal akun untuk {user.email}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100">
          
          <div className="mb-6 flex border-b border-gray-200">
            <button 
              type="button"
              onClick={() => { setIsClaimMode(false); setError(''); }}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${!isClaimMode ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Daftar Baru
            </button>
            <button 
              type="button"
              onClick={() => { setIsClaimMode(true); setError(''); }}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${isClaimMode ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Klaim Akun Sekolah
            </button>
          </div>

          {isClaimMode ? (
            <form className="space-y-6" onSubmit={handleClaimSubmit}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm text-blue-800 mb-4">
                Gunakan menu ini jika Anda sudah didaftarkan secara manual oleh pihak sekolah (Admin/TU) dan memiliki Kode Aktivasi (PIN).
              </div>

              <div>
                <label htmlFor="claimNisn" className="block text-sm font-medium text-gray-700">
                  NISN (Nomor Induk Siswa Nasional)
                </label>
                <div className="mt-1">
                  <input
                    id="claimNisn"
                    type="text"
                    required
                    value={claimNisn}
                    onChange={(e) => setClaimNisn(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Contoh: 0012345678"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="claimCode" className="block text-sm font-medium text-gray-700">
                  Kode Aktivasi (PIN)
                </label>
                <div className="mt-1">
                  <input
                    id="claimCode"
                    type="text"
                    required
                    value={claimCode}
                    onChange={(e) => setClaimCode(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm uppercase"
                    placeholder="Contoh: AB12CD"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting || !claimNisn || !claimCode}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Memproses...' : 'Klaim Akun Saya'}
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Pilih Peran Anda
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <RoleOption 
                  selected={role === 'student'} 
                  onClick={() => { setRole('student'); setPin(''); setError(''); }}
                  icon={<UserCircle className="w-6 h-6" />}
                  label="Siswa"
                />
                <RoleOption 
                  selected={role === 'applicant'} 
                  onClick={() => { setRole('applicant'); setPin(''); setError(''); }}
                  icon={<UserCircle className="w-6 h-6" />}
                  label="Pendaftar PPDB"
                />
                <RoleOption 
                  selected={role === 'teacher'} 
                  onClick={() => { setRole('teacher'); setPin(''); setError(''); }}
                  icon={<BookOpen className="w-6 h-6" />}
                  label="Guru"
                />
                <RoleOption 
                  selected={role === 'tu'} 
                  onClick={() => { setRole('tu'); setError(''); }}
                  icon={<Briefcase className="w-6 h-6" />}
                  label="TU"
                />
                <RoleOption 
                  selected={role === 'curriculum'} 
                  onClick={() => { setRole('curriculum'); setError(''); }}
                  icon={<GraduationCap className="w-6 h-6" />}
                  label="Kurikulum"
                />
                <RoleOption 
                  selected={role === 'admin'} 
                  onClick={() => { setRole('admin'); setError(''); }}
                  icon={<UserCog className="w-6 h-6" />}
                  label="Kepsek"
                />
                <RoleOption 
                  selected={role === 'super_admin'} 
                  onClick={() => { setRole('super_admin'); setError(''); }}
                  icon={<Shield className="w-6 h-6" />}
                  label="Admin"
                />
                <RoleOption 
                  selected={role === 'parent'} 
                  onClick={() => { setRole('parent'); setPin(''); setError(''); }}
                  icon={<UserCircle className="w-6 h-6" />}
                  label="Orang Tua"
                />
              </div>
            </div>

            {(role === 'curriculum' || role === 'admin' || role === 'tu' || role === 'super_admin') && (
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                <label htmlFor="pin" className="block text-sm font-medium text-orange-800 mb-1">
                  PIN Akses {role === 'curriculum' ? 'Kurikulum' : role === 'admin' ? 'Kepala Sekolah' : role === 'tu' ? 'Tata Usaha' : 'Admin'}
                </label>
                <input
                  id="pin"
                  type="password"
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-orange-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  placeholder="Masukkan PIN Akses"
                />
                <p className="mt-1 text-xs text-orange-600">
                  Peran ini membutuhkan PIN otorisasi.
                </p>
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nama Lengkap
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="appearance-none uppercase block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Contoh: BUDI SANTOSO"
                />
              </div>
            </div>

            <div>
              <label htmlFor="waNumber" className="block text-sm font-medium text-gray-700">
                Nomor WhatsApp Anda
              </label>
              <div className="mt-1">
                <input
                  id="waNumber"
                  name="waNumber"
                  type="tel"
                  required
                  value={waNumber}
                  onChange={(e) => setWaNumber(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Contoh: 08123456789"
                />
              </div>
            </div>

            {role === 'student' && (
              <>
                <div>
                  <label htmlFor="nisn" className="block text-sm font-medium text-gray-700">
                    NISN (Nomor Induk Siswa Nasional)
                  </label>
                  <div className="mt-1">
                    <input
                      id="nisn"
                      name="nisn"
                      type="text"
                      required={role === 'student'}
                      value={nisn}
                      onChange={(e) => setNisn(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Contoh: 0012345678"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="waParentNumber" className="block text-sm font-medium text-gray-700">
                    Nomor WhatsApp Orang Tua / Wali
                  </label>
                  <div className="mt-1">
                    <input
                      id="waParentNumber"
                      name="waParentNumber"
                      type="tel"
                      required={role === 'student'}
                      value={waParentNumber}
                      onChange={(e) => setWaParentNumber(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Contoh: 08129876543"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Foto Profil (Wajib)
              </label>
              <div className="mt-1 flex items-center space-x-4">
                <div className="flex-shrink-0 h-24 w-24 bg-gray-100 border border-gray-300 rounded-full overflow-hidden flex items-center justify-center">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <UserCircle className="h-12 w-12 text-gray-400" />
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center space-x-2"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Pilih Foto</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Format JPG, PNG. Maksimal 5MB.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting || !role}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Menyimpan...' : 'Selesai & Lanjutkan'}
              </button>
            </div>
          </form>
          )}
        </div>
      </div>
    </div>
  );
}

function RoleOption({ selected, onClick, icon, label }: { selected: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
        selected 
          ? 'border-blue-600 bg-blue-50 text-blue-700' 
          : 'border-gray-200 bg-white text-gray-500 hover:border-blue-300 hover:bg-blue-50/50'
      }`}
    >
      <div className="mb-2">{icon}</div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
