import React, { useState, useEffect } from 'react';
import { 
  Plus, UploadCloud, RotateCcw, AlertTriangle, CheckCircle, 
  Settings, Clock, FileText, Database, ShieldAlert, X
} from 'lucide-react';
import { 
  PlatformRelease, 
  ReleaseStatus, 
  ReleaseChannel,
  TenantApplicabilityScope 
} from '../../foundation/release/types';
import { versionService } from '../../foundation/release/VersionService';
import { PlatformReleaseRepositoryImpl } from '../../foundation/release/PlatformReleaseRepository';

export default function PlatformReleasePanel() {
  const [releases, setReleases] = useState<PlatformRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const repo = new PlatformReleaseRepositoryImpl();

  const loadReleases = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await repo.getAllReleases();
      if (result.isFailure) {
        setError(result.getError() || 'Gagal memuat release');
      } else {
        setReleases(result.getValue());
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReleases();
  }, []);

  const getStatusBadge = (status: ReleaseStatus) => {
    switch(status) {
      case ReleaseStatus.DRAFT: return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Draft</span>;
      case ReleaseStatus.TESTING: return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Testing</span>;
      case ReleaseStatus.STAGED: return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Staged</span>;
      case ReleaseStatus.RELEASED: return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Released</span>;
      case ReleaseStatus.ROLLED_BACK: return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Rolled Back</span>;
      case ReleaseStatus.ARCHIVED: return <span className="px-2 py-1 bg-slate-100 text-slate-800 text-xs rounded-full">Archived</span>;
    }
  };

  const handlePublish = async (id: string) => {
    if (!window.confirm('Yakin publish release ini ke semua tenant?')) return;
    try {
      const res = await versionService.publishRelease(id);
      if (res.isFailure) {
        alert(res.getError());
      } else {
        loadReleases();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRollback = async (id: string) => {
    if (!window.confirm('Yakin rollback release ini? Ini akan mengembalikan versi ke stable sebelumnya.')) return;
    try {
      const res = await versionService.rollbackRelease(id);
      if (res.isFailure) {
        alert(res.getError());
      } else {
        loadReleases();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <UploadCloud className="w-5 h-5 mr-2 text-indigo-600" />
            Platform Release & Update Management
          </h2>
          <p className="text-sm text-gray-500 mt-1">Mengelola rilis aplikasi pusat, update, dan deployment untuk semua tenant.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center text-sm font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Release
        </button>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="text-center py-8">Memuat data releases...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Channel</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rollout</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {releases.map((release) => (
                  <tr key={release.id}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">v{release.version}</span>
                        <span className="text-xs text-gray-500">Build: {release.buildNumber}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{release.releaseChannel}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getStatusBadge(release.status)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                      {release.applicabilityScope}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(release.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      {release.status === ReleaseStatus.DRAFT || release.status === ReleaseStatus.STAGED || release.status === ReleaseStatus.TESTING ? (
                        <button onClick={() => handlePublish(release.id)} className="text-green-600 hover:text-green-900 mr-3">Publish</button>
                      ) : null}
                      
                      {release.status === ReleaseStatus.RELEASED && (
                        <button onClick={() => handleRollback(release.id)} className="text-red-600 hover:text-red-900 mr-3">Rollback</button>
                      )}
                      
                      <button className="text-indigo-600 hover:text-indigo-900">Detail</button>
                    </td>
                  </tr>
                ))}
                {releases.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Belum ada release platform yang tercatat.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {showCreateModal && (
        <CreateReleaseModal 
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadReleases();
          }}
        />
      )}
    </div>
  );
}

function CreateReleaseModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    version: '1.0.1',
    buildNumber: 2,
    releaseChannel: ReleaseChannel.STABLE,
    releaseNotes: '',
    minimumClientVersion: '1.0.0',
    applicabilityScope: TenantApplicabilityScope.GLOBAL,
    migrationRequired: false,
    maintenanceMode: false
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await versionService.createRelease(formData as any);
      if (res.isFailure) {
        alert(res.getError());
      } else {
        onSuccess();
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <UploadCloud className="w-5 h-5 mr-2 text-indigo-500" />
            Create New Release
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Version Number (SemVer)</label>
              <input 
                type="text" required
                className="w-full rounded-lg border-gray-300 border p-2 text-sm"
                value={formData.version}
                onChange={e => setFormData({...formData, version: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Build Number</label>
              <input 
                type="number" required
                className="w-full rounded-lg border-gray-300 border p-2 text-sm"
                value={formData.buildNumber}
                onChange={e => setFormData({...formData, buildNumber: parseInt(e.target.value)})}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Release Channel</label>
              <select 
                className="w-full rounded-lg border-gray-300 border p-2 text-sm"
                value={formData.releaseChannel}
                onChange={e => setFormData({...formData, releaseChannel: e.target.value as ReleaseChannel})}
              >
                <option value={ReleaseChannel.STABLE}>Stable</option>
                <option value={ReleaseChannel.BETA}>Beta / Staged</option>
                <option value={ReleaseChannel.INTERNAL}>Internal Testing</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Tenant Scope</label>
              <select 
                className="w-full rounded-lg border-gray-300 border p-2 text-sm"
                value={formData.applicabilityScope}
                onChange={e => setFormData({...formData, applicabilityScope: e.target.value as TenantApplicabilityScope})}
              >
                <option value={TenantApplicabilityScope.GLOBAL}>Global (All Tenants)</option>
                <option value={TenantApplicabilityScope.TENANT}>Selected Tenants (Staged)</option>
                <option value={TenantApplicabilityScope.PLAN}>By Plan (Enterprise Only)</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Client Version (Forces Update)</label>
            <input 
              type="text" required
              className="w-full rounded-lg border-gray-300 border p-2 text-sm"
              value={formData.minimumClientVersion}
              onChange={e => setFormData({...formData, minimumClientVersion: e.target.value})}
            />
            <p className="text-xs text-gray-500 mt-1">Klien dengan versi di bawah ini akan dipaksa update.</p>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <h4 className="text-sm font-semibold text-orange-800 flex items-center mb-3">
              <Database className="w-4 h-4 mr-2" />
              Migration & Maintenance
            </h4>
            <div className="space-y-3">
              <label className="flex items-center">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  checked={formData.migrationRequired}
                  onChange={e => setFormData({...formData, migrationRequired: e.target.checked})}
                />
                <span className="ml-2 text-sm text-gray-700">Release ini membutuhkan Data Migration</span>
              </label>
              <label className="flex items-center">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  checked={formData.maintenanceMode}
                  onChange={e => setFormData({...formData, maintenanceMode: e.target.checked})}
                />
                <span className="ml-2 text-sm text-gray-700">Aktifkan Maintenance Mode saat rilis</span>
              </label>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Release Notes</label>
            <textarea 
              rows={4} required
              className="w-full rounded-lg border-gray-300 border p-2 text-sm"
              value={formData.releaseNotes}
              onChange={e => setFormData({...formData, releaseNotes: e.target.value})}
              placeholder="Jelaskan fitur baru dan perbaikan..."
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Create Release'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
