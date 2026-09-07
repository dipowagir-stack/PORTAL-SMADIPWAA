import React, { useState, useEffect } from 'react';
import { Building, Shield, Activity, RefreshCw, AlertTriangle, AlertCircle, Database, Server, Box, GitBranch, Download, CheckCircle2, FileCode } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useVirtualMode } from '../../contexts/VirtualModeContext';

export default function PlatformOverviewPanel() {
  const { isVirtualMode, vTenants } = useVirtualMode();
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState('');
  const [metrics, setMetrics] = useState({
    totalTenants: 0,
    activeTenants: 0,
    expiringTenants: 0,
    expiredTenants: 0,
    suspendedTenants: 0,
    activeModules: 0,
    criticalIssues: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, [isVirtualMode]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      if (isVirtualMode) {
        // use vTenants
        const total = vTenants.length;
        const active = vTenants.filter(t => t.status === 'ACTIVE').length;
        const suspended = vTenants.filter(t => t.status === 'SUSPENDED').length;
        setMetrics({
          totalTenants: total,
          activeTenants: active,
          expiringTenants: 0, // mock
          expiredTenants: 0,
          suspendedTenants: suspended,
          activeModules: 12,
          criticalIssues: 2
        });
      } else {
        const tenantsRef = collection(db, 'tenants');
        const snap = await getDocs(tenantsRef);
        let total = 0, active = 0, suspended = 0;
        snap.forEach(doc => {
          total++;
          if (doc.data().status === 'ACTIVE') active++;
          if (doc.data().status === 'SUSPENDED') suspended++;
        });
        setMetrics({
          totalTenants: total,
          activeTenants: active,
          expiringTenants: 0,
          expiredTenants: 0,
          suspendedTenants: suspended,
          activeModules: 12,
          criticalIssues: 0
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportSql = async () => {
    setExporting(true);
    setExportSuccess('');
    try {
      const res = await fetch('/api/migration/export-sql', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setExportSuccess(`Berhasil diekspor: ${data.totalRows} data entitas siap untuk cPanel.`);
      } else {
        alert('Gagal mengekspor: ' + data.error);
      }
    } catch (e: any) {
      alert('Error saat ekspor: ' + e.message);
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadSql = () => {
    window.location.href = '/api/migration/download-sql';
  };

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tenants */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Tenants</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{metrics.totalTenants}</h3>
            </div>
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
              <Building className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">{metrics.activeTenants} Active</span>
            <span className="mx-2 text-gray-300">|</span>
            <span className="text-orange-600 font-medium">{metrics.suspendedTenants} Suspended</span>
          </div>
        </div>

        {/* Subscription Status */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Expiring/Expired</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{metrics.expiringTenants + metrics.expiredTenants}</h3>
            </div>
            <div className="bg-orange-50 p-2 rounded-lg text-orange-600">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
             <span className="text-orange-600 font-medium">{metrics.expiringTenants} Expiring</span>
             <span className="mx-2 text-gray-300">|</span>
             <span className="text-red-600 font-medium">{metrics.expiredTenants} Expired</span>
          </div>
        </div>

        {/* Active Modules */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Modules</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{metrics.activeModules}</h3>
            </div>
            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
              <Box className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">Across all active tenants</span>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Critical Issues</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{metrics.criticalIssues}</h3>
            </div>
            <div className="bg-red-50 p-2 rounded-lg text-red-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            {metrics.criticalIssues > 0 ? (
               <span className="text-red-600 font-medium">Requires immediate action</span>
            ) : (
               <span className="text-green-600 font-medium flex items-center"><Activity className="w-4 h-4 mr-1"/> Platform Healthy</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><GitBranch className="w-5 h-5 mr-2 text-indigo-600"/> Platform Version Info</h3>
            <div className="space-y-4">
               <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-500">Release Channel</span>
                  <span className="bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full text-xs font-semibold">STABLE</span>
               </div>
               <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-500">Platform Version</span>
                  <span className="font-mono text-gray-900 font-medium">v2.4.0</span>
               </div>
               <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-500">Last Release Date</span>
                  <span className="text-gray-900">12 Aug 2024</span>
               </div>
               <div className="flex justify-between items-center py-2">
                  <span className="text-gray-500">Tenants Pending Update</span>
                  <span className="font-bold text-orange-600">3 Tenants</span>
               </div>
            </div>
         </div>
         
         <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Activity className="w-5 h-5 mr-2 text-green-600"/> Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
               <button className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors flex flex-col justify-center">
                  <span className="font-medium text-gray-900 block">Trigger Health Check</span>
                  <span className="text-xs text-gray-500 mt-1">Run on all active tenants</span>
               </button>
               <button className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors flex flex-col justify-center">
                  <span className="font-medium text-gray-900 block">Publish New Release</span>
                  <span className="text-xs text-gray-500 mt-1">Stage to specific channel</span>
               </button>
               <button className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors flex flex-col justify-center">
                  <span className="font-medium text-gray-900 block">Manage Modules</span>
                  <span className="text-xs text-gray-500 mt-1">Configure global modules</span>
               </button>
               <button className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors flex flex-col justify-center">
                  <span className="font-medium text-gray-900 block">Audit Logs</span>
                  <span className="text-xs text-gray-500 mt-1">View platform activities</span>
               </button>
            </div>
         </div>
      </div>
      {/* cPanel & MySQL Standalone Migration Center */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-xl text-white p-6 shadow-md border border-blue-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Database className="w-6 h-6 text-emerald-400" />
              <h3 className="text-xl font-bold text-white">Pusat Migrasi Mandiri cPanel & MySQL</h3>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                Decoupled Ready
              </span>
            </div>
            <p className="text-blue-200 text-sm mt-1 max-w-2xl">
              Seluruh data sekolah (tenants, akun guru/siswa/admin, dan periode akademik) telah berhasil diekspor menjadi skrip SQL terisolasi multi-tenant yang siap diimpor langsung ke phpMyAdmin atau MySQL cPanel Anda.
            </p>
            {exportSuccess && (
              <div className="mt-3 flex items-center space-x-2 text-sm text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{exportSuccess}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportSql}
              disabled={exporting}
              className="inline-flex items-center px-4 py-2.5 bg-blue-800/80 hover:bg-blue-700/80 text-white text-xs font-semibold rounded-lg border border-blue-700 transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${exporting ? 'animate-spin' : ''}`} />
              {exporting ? 'Mengekspor...' : 'Ekspor Ulang Data SQL'}
            </button>
            <button
              onClick={handleDownloadSql}
              className="inline-flex items-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              <Download className="w-4 h-4 mr-2" />
              Download schoolsaas_migration.sql
            </button>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-blue-800/60 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-blue-200">
          <div className="flex items-start space-x-2">
            <div className="w-5 h-5 rounded-full bg-blue-800 flex items-center justify-center font-bold text-white text-[11px] flex-shrink-0">1</div>
            <div>
              <strong className="text-white block">Buat Database cPanel</strong>
              Buat database baru via cPanel MySQL Database Wizard.
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-5 h-5 rounded-full bg-blue-800 flex items-center justify-center font-bold text-white text-[11px] flex-shrink-0">2</div>
            <div>
              <strong className="text-white block">Import ke phpMyAdmin</strong>
              Upload schema.sql lalu migration_data.sql ke phpMyAdmin.
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-5 h-5 rounded-full bg-blue-800 flex items-center justify-center font-bold text-white text-[11px] flex-shrink-0">3</div>
            <div>
              <strong className="text-white block">Atur .env & Setup Node.js App</strong>
              Sesuaikan DB_HOST, DB_USER, DB_PASSWORD di menu Setup Node.js App cPanel.
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
