import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Globe, CheckCircle, Clock, XCircle, Search, ExternalLink } from 'lucide-react';
import { TenantPublicProfile } from '../../domains/website/types';

export default function PlatformDomainsPanel() {
  const [profiles, setProfiles] = useState<TenantPublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'tenant_public_profiles'));
      const list = snap.docs.map(d => d.data() as TenantPublicProfile);
      
      // Only keep profiles that have a custom domain configured (even if disabled)
      const domainProfiles = list.filter(p => p.domainMappings?.customDomain);
      setProfiles(domainProfiles);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const handleUpdateStatus = async (tenantId: string, customDomain: string, status: 'VERIFIED' | 'ACTIVE' | 'DISABLED') => {
    if (!window.confirm(`Yakin mengubah status domain ${customDomain} menjadi ${status}?`)) return;
    try {
      const docRef = doc(db, 'tenant_public_profiles', tenantId);
      await updateDoc(docRef, {
        'domainMappings.status': status,
        'domainMappings.verifiedAt': status === 'VERIFIED' || status === 'ACTIVE' ? Date.now() : null
      });
      loadProfiles();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const filteredProfiles = profiles.filter(p => 
    p.domainMappings?.customDomain?.toLowerCase().includes(search.toLowerCase()) || 
    p.schoolName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <Globe className="w-5 h-5 mr-2 text-indigo-600" />
            Custom Domain Management
          </h2>
          <p className="text-sm text-gray-500 mt-1">Kelola permohonan custom domain dari semua tenant.</p>
        </div>
        <div className="relative flex-1 sm:max-w-xs w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Cari domain atau sekolah..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full focus:border-indigo-500 outline-none" 
          />
        </div>
      </div>

      <div className="p-0 overflow-x-auto">
        {loading ? (
           <div className="text-center py-10">Memuat data domain...</div>
        ) : profiles.length === 0 ? (
           <div className="text-center py-10 text-gray-500">Belum ada tenant yang mengajukan custom domain.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sekolah</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Custom Domain</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredProfiles.map((p) => (
                <tr key={p.tenantId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{p.schoolName}</div>
                    <div className="text-xs text-gray-500">Tenant ID: {p.tenantId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <a 
                      href={`https://${p.domainMappings?.customDomain}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-sm font-mono text-indigo-600 hover:text-indigo-900 flex items-center"
                    >
                      {p.domainMappings?.customDomain}
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {p.domainMappings?.status === 'ACTIVE' && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" /> ACTIVE
                      </span>
                    )}
                    {p.domainMappings?.status === 'PENDING' && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        <Clock className="w-3 h-3 mr-1" /> PENDING
                      </span>
                    )}
                    {p.domainMappings?.status === 'VERIFIED' && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <CheckCircle className="w-3 h-3 mr-1" /> VERIFIED
                      </span>
                    )}
                    {p.domainMappings?.status === 'DISABLED' && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        <XCircle className="w-3 h-3 mr-1" /> DISABLED
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {p.domainMappings?.status === 'PENDING' && (
                      <button onClick={() => handleUpdateStatus(p.tenantId, p.domainMappings!.customDomain!, 'ACTIVE')} className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors mx-1">
                        Terima & Aktifkan
                      </button>
                    )}
                    {(p.domainMappings?.status === 'ACTIVE' || p.domainMappings?.status === 'VERIFIED') && (
                      <button onClick={() => handleUpdateStatus(p.tenantId, p.domainMappings!.customDomain!, 'DISABLED')} className="text-amber-600 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors mx-1">
                        Nonaktifkan
                      </button>
                    )}
                    {p.domainMappings?.status === 'DISABLED' && (
                      <button onClick={() => handleUpdateStatus(p.tenantId, p.domainMappings!.customDomain!, 'ACTIVE')} className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors mx-1">
                        Aktifkan
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
