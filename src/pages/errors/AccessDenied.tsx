import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, DownloadCloud } from 'lucide-react';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function AccessDenied({ reason }: { reason: string }) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [isProvisioning, setIsProvisioning] = useState(false);
  
  let title = 'Akses Ditolak';
  let message = 'Anda tidak memiliki hak akses untuk halaman ini.';
  
  switch (reason) {
    case 'PLATFORM_ACCESS_DENIED':
      title = 'Akses Platform Ditolak';
      message = 'Hanya administrator platform yang diizinkan untuk mengakses Platform HUB.';
      break;
    case 'NO_MEMBERSHIP':
      title = 'Tidak Ada Keanggotaan';
      message = 'Anda tidak terdaftar sebagai anggota di sekolah / tenant ini.';
      break;
    case 'APPLICANT_ACCESS_DENIED':
      title = 'Akses Pendaftar Ditolak';
      message = 'Halaman ini khusus untuk pendaftar PPDB (Applicant).';
      break;
    case 'TENANT_UNRESOLVED':
      title = 'Tenant Tidak Ditemukan';
      message = 'Gagal memuat konteks tenant untuk permintaan ini.';
      break;
  }

  const handleProvisioning = async () => {
    if (!user) return;
    setIsProvisioning(true);
    try {
      const tenantId = 'smas-diponegoro';
      
      // 1. Create Tenant
      await setDoc(doc(db, 'tenants', tenantId), {
        name: 'SMAS Islam Diponegoro Wagir',
        domain: 'smas-diponegoro',
        status: 'ACTIVE',
        type: 'K12',
        subscriptionPlan: 'ENTERPRISE',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      // 2. Create Membership for current user
      await addDoc(collection(db, 'tenant_memberships'), {
        userId: user.uid,
        tenantId: tenantId,
        roles: ['super_admin'],
        permissions: [],
        status: 'ACTIVE',
        joinedAt: Date.now()
      });

      // 3. Create Public Website Profile
      await setDoc(doc(db, 'tenant_public_profiles', tenantId), {
        id: tenantId,
        tenantId: tenantId,
        schoolName: 'SMA Diponegoro',
        officialName: 'SMA Swasta Islam Diponegoro Wagir',
        shortName: 'SMA Dipo',
        primaryColor: '#15803d',
        secondaryColor: '#166534',
        accentColor: '#eab308',
        heroTitle: 'Cerdas, Berkarakter, dan Islami',
        heroSubtitle: 'Selamat datang di portal resmi SMAS Islam Diponegoro Wagir.',
        address: 'Jl. Raya Wagir, Malang',
        published: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      window.location.href = '/dashboard'; // Force reload to re-initialize tenant context
    } catch (err: any) {
      alert('Gagal inisialisasi: ' + err.message);
      setIsProvisioning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600 mb-8">{message}</p>
        
        {reason === 'NO_MEMBERSHIP' && user && profile?.role === 'super_admin' && (
          <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100 text-left">
            <h3 className="font-bold text-blue-900 mb-2">Inisialisasi Sistem Baru?</h3>
            <p className="text-sm text-blue-800 mb-4">
              Sepertinya Anda belum terdaftar di tenant manapun. Sebagai pemilik sistem, Anda dapat membuat tenant awal (SMAS Islam Diponegoro) untuk akun Anda.
            </p>
            <button
              onClick={handleProvisioning}
              disabled={isProvisioning}
              className="w-full bg-blue-600 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-70"
            >
              {isProvisioning ? 'Memproses...' : (
                <>
                  <DownloadCloud className="w-5 h-5 mr-2" />
                  Jadikan SMA Diponegoro sbg Tenant Saya
                </>
              )}
            </button>
          </div>
        )}

        <button
          onClick={() => navigate('/')}
          className="w-full bg-gray-100 text-gray-700 font-medium py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Kembali ke Beranda
        </button>
      </div>
    </div>
  );
}
