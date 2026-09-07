import React, { useState, useEffect } from 'react';
import { platformHubService } from '../../domains/platform/services';
import { TenantSummary } from '../../domains/platform/types';
import { Search, Filter, Plus, X, ShieldAlert, CheckCircle, Clock, AlertTriangle, Building, Eye, StopCircle, PlayCircle, ArrowLeft, Activity, Box, GitBranch, Shield, FileText, AlertCircle } from 'lucide-react';
import TenantHealthPanel from './TenantHealthPanel';
import { useAuth } from '../../contexts/AuthContext';

export default function TenantListPanel() {
  const { profile } = useAuth();
  const isPlatformAdmin = profile?.role === 'platform_admin';

  const [tenants, setTenants] = useState<TenantSummary[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<TenantSummary | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', domainPrefix: '', email: '', subscriptionPlan: 'free' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTenants = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await platformHubService.getAllTenants();
      if (res.isFailure) {
        setError((res as any).getError());
      } else {
        setTenants(res.getValue());
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const handleSuspend = async (tenantId: string) => {
    if (!window.confirm('Yakin ingin membekukan (suspend) tenant ini?')) return;
    try {
      const res = await platformHubService.suspendTenant(tenantId, 'Suspended by platform admin');
      if (res.isFailure) {
        alert((res as any).getError());
      } else {
        loadTenants();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRestore = async (tenantId: string) => {
    if (!window.confirm('Yakin ingin mengaktifkan kembali tenant ini?')) return;
    try {
      const res = await platformHubService.restoreTenant(tenantId);
      if (res.isFailure) {
        alert((res as any).getError());
      } else {
        loadTenants();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await platformHubService.createTenant(addForm);
      if (res.isFailure) {
        alert((res as any).getError());
      } else {
        setShowAddModal(false);
        setAddForm({ name: '', domainPrefix: '', email: '', subscriptionPlan: 'free' });
        loadTenants();
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.code.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedTenant) {
    return <TenantDetailView tenant={selectedTenant} onBack={() => setSelectedTenant(null)} onUpdate={loadTenants} />;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <Building className="w-5 h-5 mr-2 text-indigo-600" />
            Schools / Tenants
          </h2>
          <p className="text-sm text-gray-500 mt-1">Daftar semua sekolah (tenant) yang terdaftar di Platform.</p>
        </div>
        <div className="flex space-x-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari tenant..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full focus:border-indigo-500 outline-none" 
            />
          </div>
          <button className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 whitespace-nowrap">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </button>
          {isPlatformAdmin && (
            <button onClick={() => setShowAddModal(true)} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 whitespace-nowrap shadow-sm">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Tenant
            </button>
          )}
        </div>
      </div>

      <div className="p-0 overflow-x-auto">
        {loading ? (
           <div className="text-center py-10">Memuat data tenant...</div>
        ) : error ? (
           <div className="text-center py-10 text-red-600">{error}</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tenant</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Subscription</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Version</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredTenants.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-700 font-bold">
                        {t.name.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-bold text-gray-900">{t.name}</div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">{t.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {t.status === 'ACTIVE' ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <ShieldAlert className="w-3 h-3 mr-1" /> {t.status}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 capitalize font-medium">{t.subscriptionPlan}</span>
                    <div className="text-xs text-gray-500 mt-0.5">{t.activeModules.length} Modules</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-700">v{t.currentVersion}</span>
                    <div className="text-xs text-gray-500 mt-0.5">{t.releaseChannel}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => setSelectedTenant(t)} className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors mx-1" title="View Details">
                      Detail
                    </button>
                    {t.status === 'ACTIVE' ? (
                      <button onClick={() => handleSuspend(t.id)} className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors mx-1" title="Suspend Tenant">
                        Suspend
                      </button>
                    ) : (
                      <button onClick={() => handleRestore(t.id)} className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors mx-1" title="Restore Tenant">
                        Restore
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredTenants.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Tidak ada tenant ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Tenant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">Tambah Tenant / Sekolah Baru</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Sekolah / Institusi</label>
                  <input required type="text" value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g., SMAS Islam Diponegoro Wagir" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subdomain (Kode Akses)</label>
                  <input required type="text" value={addForm.domainPrefix} onChange={e => setAddForm({...addForm, domainPrefix: e.target.value.toLowerCase()})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono" placeholder="e.g., diponegoro" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Resmi</label>
                  <input required type="email" value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g., admin@diponegoro.sch.id" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paket Berlangganan</label>
                  <select required value={addForm.subscriptionPlan} onChange={e => setAddForm({...addForm, subscriptionPlan: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="free">Free Tier (Dasar)</option>
                    <option value="standard">Standard (Akademik & Keuangan)</option>
                    <option value="premium">Premium (AI & Fitur Penuh)</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Batal</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                  {isSubmitting ? 'Menyimpan...' : 'Simpan & Daftarkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TenantDetailView({ tenant: initialTenant, onBack, onUpdate }: { tenant: TenantSummary, onBack: () => void, onUpdate: () => void }) {
  const { profile } = useAuth();
  const isPlatformAdmin = profile?.role === 'platform_admin';

  const [activeTab, setActiveTab] = useState('overview');
  const [tenant, setTenant] = useState<TenantSummary>(initialTenant);
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync if prop changes
  useEffect(() => {
    setTenant(initialTenant);
  }, [initialTenant]);

  const AVAILABLE_MODULES = [
    { id: 'academic', name: 'Akademik', desc: 'Manajemen kurikulum, jadwal, dan nilai' },
    { id: 'student', name: 'Kesiswaan', desc: 'Manajemen data siswa dan absensi' },
    { id: 'teacher', name: 'Kepegawaian', desc: 'Manajemen guru dan staf' },
    { id: 'admin', name: 'Administrasi', desc: 'Pengaturan dan tata usaha' },
    { id: 'finance', name: 'Keuangan', desc: 'Manajemen SPP dan tagihan' },
    { id: 'admission', name: 'PPDB', desc: 'Penerimaan Peserta Didik Baru' },
    { id: 'ai', name: 'AI Features', desc: 'Fitur kecerdasan buatan EduOS' },
    { id: 'reporting', name: 'Reporting', desc: 'Laporan lanjutan dan analitik' }
  ];

  const handleToggleModule = async (moduleId: string) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const isEnabled = tenant.activeModules.includes(moduleId);
      const newModules = isEnabled 
        ? tenant.activeModules.filter(m => m !== moduleId)
        : [...tenant.activeModules, moduleId];
      
      const res = await platformHubService.updateTenantModules(tenant.id, newModules);
      if (res.isSuccess) {
        setTenant(prev => ({ ...prev, activeModules: newModules }));
        onUpdate();
      } else {
        alert((res as any).getError());
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateSubscription = async (planId: string) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const res = await platformHubService.updateTenantSubscription(tenant.id, planId);
      if (res.isSuccess) {
        setTenant(prev => ({ ...prev, subscriptionPlan: planId }));
        onUpdate();
        alert('Berhasil memperbarui paket langganan');
      } else {
        alert((res as any).getError());
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
       <button onClick={onBack} className="flex items-center text-indigo-600 hover:text-indigo-800 font-medium text-sm transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Daftar Tenant
       </button>

       {/* HEADER */}
       <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center">
             <div className="flex-shrink-0 h-16 w-16 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-700 font-bold text-2xl">
                {tenant.name.charAt(0)}
             </div>
             <div className="ml-4">
                <h2 className="text-2xl font-bold text-gray-900">{tenant.name}</h2>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                   <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700">{tenant.code}</span>
                   {tenant.status === 'ACTIVE' ? (
                      <span className="inline-flex items-center text-green-700 font-medium"><CheckCircle className="w-3.5 h-3.5 mr-1"/> Active</span>
                   ) : (
                      <span className="inline-flex items-center text-red-700 font-medium"><ShieldAlert className="w-3.5 h-3.5 mr-1"/> Suspended</span>
                   )}
                   <span className="inline-flex items-center"><Activity className="w-3.5 h-3.5 mr-1"/> Healthy</span>
                   <span className="inline-flex items-center uppercase"><Shield className="w-3.5 h-3.5 mr-1"/> {tenant.subscriptionPlan}</span>
                   <span className="inline-flex items-center"><GitBranch className="w-3.5 h-3.5 mr-1"/> v{tenant.currentVersion}</span>
                </div>
             </div>
          </div>
          <div className="flex items-center space-x-3">
             <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Manage</button>
             {isPlatformAdmin && (
               <>
                 {tenant.status === 'ACTIVE' ? (
                    <button className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100">Suspend</button>
                 ) : (
                    <button className="px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100">Restore</button>
                 )}
               </>
             )}
          </div>
       </div>

       {/* TABS */}
       <div className="flex border-b border-gray-200 overflow-x-auto">
          {[
             { id: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4 mr-2" />, show: true },
             { id: 'subscription', label: 'Subscription', icon: <CheckCircle className="w-4 h-4 mr-2" />, show: isPlatformAdmin },
             { id: 'modules', label: 'Modules', icon: <Box className="w-4 h-4 mr-2" />, show: true },
             { id: 'release', label: 'Release', icon: <GitBranch className="w-4 h-4 mr-2" />, show: true },
             { id: 'health', label: 'Health', icon: <Shield className="w-4 h-4 mr-2" />, show: true },
             { id: 'issues', label: 'Issues', icon: <AlertCircle className="w-4 h-4 mr-2" />, show: true },
             { id: 'audit', label: 'Audit', icon: <FileText className="w-4 h-4 mr-2" />, show: isPlatformAdmin },
          ].filter(t => t.show).map(tab => (
             <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                   activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
             >
                {tab.icon}
                {tab.label}
             </button>
          ))}
       </div>

       {/* CONTENT */}
       <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
          {activeTab === 'overview' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <h3 className="font-bold text-gray-900 mb-4">Tenant Summary</h3>
                   <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Created At</span><span className="font-medium text-gray-900">{new Date(tenant.createdAt).toLocaleDateString()}</span></div>
                      <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Status</span><span className="font-medium text-gray-900">{tenant.status}</span></div>
                      <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Subscription</span><span className="font-medium text-gray-900 uppercase">{tenant.subscriptionPlan}</span></div>
                      <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Active Modules</span><span className="font-medium text-gray-900">{tenant.activeModules.length} Modules</span></div>
                   </div>
                </div>
                <div>
                   <h3 className="font-bold text-gray-900 mb-4">System State</h3>
                   <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Current Version</span><span className="font-medium text-gray-900 font-mono">v{tenant.currentVersion}</span></div>
                      <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Release Channel</span><span className="font-medium text-gray-900 uppercase">{tenant.releaseChannel}</span></div>
                      <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Health Status</span><span className="font-medium text-green-600">HEALTHY</span></div>
                      <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Open Issues</span><span className="font-medium text-gray-900">0</span></div>
                   </div>
                </div>
             </div>
          )}
          {activeTab === 'subscription' && (
             <div className="space-y-6">
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                   <div>
                      <h3 className="font-bold text-gray-900 text-lg mb-1">Paket Berlangganan Saat Ini</h3>
                      <p className="text-sm text-gray-500">Ubah paket langganan untuk mengatur limitasi dan akses fitur tenant.</p>
                   </div>
                   <div className="text-right">
                      <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm font-bold uppercase rounded-full">
                         {tenant.subscriptionPlan}
                      </span>
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">Update Paket Langganan</label>
                   <div className="flex items-center gap-3">
                      <select 
                         className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none min-w-[200px]"
                         value={tenant.subscriptionPlan}
                         onChange={(e) => handleUpdateSubscription(e.target.value)}
                         disabled={isUpdating}
                      >
                         <option value="free">Free Tier</option>
                         <option value="standard">Standard Plan</option>
                         <option value="premium">Premium Plan</option>
                      </select>
                      {isUpdating && <span className="text-sm text-gray-500">Menyimpan...</span>}
                   </div>
                </div>
             </div>
          )}
          {activeTab === 'modules' && (
             <div>
                <div className="mb-6">
                   <h3 className="font-bold text-gray-900 text-lg mb-1">Manajemen Akses Modul</h3>
                   <p className="text-sm text-gray-500">Pilih modul (entitlements) apa saja yang bisa diakses oleh tenant ini.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {AVAILABLE_MODULES.map(module => {
                      const isEnabled = tenant.activeModules.includes(module.id);
                      return (
                         <div key={module.id} className={`p-4 rounded-xl border transition-colors flex justify-between items-center ${isEnabled ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200'}`}>
                            <div>
                               <div className="font-bold text-gray-900">{module.name}</div>
                               <div className="text-sm text-gray-500 mt-0.5">{module.desc}</div>
                            </div>
                            <button
                               onClick={() => handleToggleModule(module.id)}
                               disabled={isUpdating}
                               className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${isEnabled ? 'bg-indigo-600' : 'bg-gray-200'} ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                               <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                         </div>
                      );
                   })}
                </div>
             </div>
          )}
          {activeTab === 'release' && (
             <div className="text-center py-10 text-gray-500">
                <GitBranch className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900">Release Panel</h3>
                <p className="mt-1">Status pembaruan rilis: Current v{tenant.currentVersion}. (No updates available)</p>
             </div>
          )}
          {activeTab === 'health' && (
             <TenantHealthPanel tenantId={tenant.id} />
          )}
          {activeTab === 'issues' && (
             <div className="text-center py-10 text-gray-500">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900">Issues Panel</h3>
                <p className="mt-1">Belum ada issue yang terlaporkan.</p>
             </div>
          )}
          {activeTab === 'audit' && (
             <div className="text-center py-10 text-gray-500">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900">Audit Panel</h3>
                <p className="mt-1">Log aktivitas spesifik pada tenant ini.</p>
             </div>
          )}
       </div>
    </div>
  );
}
