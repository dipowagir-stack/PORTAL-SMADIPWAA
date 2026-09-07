import React, { useState, useEffect } from 'react';
import { Globe, Server, CheckCircle, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useTenant } from '../../foundation/tenant/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { websiteService } from '../../domains/website/services/WebsiteService';
import { TenantPublicProfile } from '../../domains/website/types';

export default function WebsiteDomainTab() {
  const { activeTenant } = useTenant();
  const { user, profile: userProfile, permissions } = useAuth();
  const [profile, setProfile] = useState<TenantPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customDomain, setCustomDomain] = useState('');
  
  useEffect(() => {
    if (!activeTenant) return;
    
    websiteService.getTenantProfile(activeTenant.id).then(res => {
      if (res.isSuccess) {
        const p = res.getValue();
        setProfile(p);
        if (p.domainMappings?.customDomain) {
          setCustomDomain(p.domainMappings.customDomain);
        }
      }
      setLoading(false);
    });
  }, [activeTenant]);

  const handleSaveDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !activeTenant || !user || !userProfile) return;
    
    setSaving(true);
    try {
      const cleanDomain = customDomain.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase().trim();
      
      const updatedProfile = {
        ...profile,
        domainMappings: {
          ...profile.domainMappings,
          customDomain: cleanDomain || undefined,
          status: cleanDomain ? 'PENDING' : 'DISABLED'
        }
      } as TenantPublicProfile;

      const context = {
        userId: user.uid,
        tenantId: activeTenant.id,
        roles: [userProfile.role || ''],
        permissions,
        isPlatformAdmin: false
      };

      const res = await websiteService.updateTenantProfile(context, updatedProfile);
      if (res.isSuccess) {
        setProfile(updatedProfile);
        setCustomDomain(cleanDomain);
        alert(cleanDomain ? 'Custom domain berhasil diajukan! Status saat ini PENDING.' : 'Custom domain dihapus.');
      } else {
        alert((res as any).getError() as string);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-10">Memuat data domain...</div>;
  }

  const domainStatus = profile?.domainMappings?.status || 'DISABLED';
  const hasDomain = !!profile?.domainMappings?.customDomain;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 flex items-center">
          <Globe className="w-5 h-5 mr-2 text-indigo-600" />
          Pengaturan Custom Domain
        </h3>
        <p className="text-gray-500 text-sm mt-1">
          Gunakan nama domain sekolah Anda sendiri (misal: www.sekolahanda.sch.id) untuk mengakses platform ini.
        </p>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 mb-8">
        <h4 className="font-semibold text-indigo-900 flex items-center mb-2">
          <Server className="w-4 h-4 mr-2" />
          Instruksi DNS / CNAME
        </h4>
        <p className="text-sm text-indigo-800 mb-3">
          Sebelum mendaftarkan domain Anda, pastikan Anda telah mengatur <strong>CNAME Record</strong> pada panel pengaturan DNS domain Anda, lalu arahkan ke:
        </p>
        <div className="bg-white px-4 py-3 rounded-lg border border-indigo-200 font-mono text-center font-bold text-gray-800">
          cname.schoolsaas.com
        </div>
      </div>

      <form onSubmit={handleSaveDomain} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alamat Custom Domain
          </label>
          <div className="flex rounded-md shadow-sm">
            <span className="inline-flex items-center px-4 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
              https://
            </span>
            <input
              type="text"
              required={false}
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="www.sekolahanda.sch.id"
              className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm outline-none"
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Kosongkan form ini dan klik simpan jika Anda ingin berhenti menggunakan custom domain.
          </p>
        </div>

        {hasDomain && (
          <div className="bg-white border rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Status Domain Saat Ini</p>
              <p className="font-mono text-sm mt-1 text-gray-900">{profile?.domainMappings?.customDomain}</p>
            </div>
            
            {domainStatus === 'PENDING' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                <Clock className="w-3.5 h-3.5 mr-1" />
                Menunggu Verifikasi
              </span>
            )}
            
            {domainStatus === 'ACTIVE' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                Domain Aktif & Terverifikasi
              </span>
            )}
            
            {(domainStatus === 'DISABLED' || domainStatus === 'VERIFIED') && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                Belum Aktif
              </span>
            )}
          </div>
        )}

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving || customDomain === profile?.domainMappings?.customDomain}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan Domain'}
          </button>
        </div>
      </form>
    </div>
  );
}
