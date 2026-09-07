import UserManagementPanel from './UserManagementPanel';
import React, { useState, useEffect, useMemo } from 'react';
import { Users, Calendar, Settings, Database, Shield, Activity, FileText, Search, Edit, Trash2, Key, History, Save, RefreshCw, AlertTriangle, Archive, Eye, Download, CheckCircle, FolderArchive, FileBarChart, Upload, ArrowUpRight, Globe } from 'lucide-react';
import { collection, getDocs, getDoc, setDoc, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth, UserProfile, UserRole } from '../../contexts/AuthContext';
import TeacherToolsPanel from './TeacherToolsPanel';
import ModuleCatalogPanel from './ModuleCatalogPanel';
import AcademicPeriodPanel from './AcademicPeriodPanel';
import StudentPromotionPanel from '../admin/StudentPromotionPanel';
import PlatformReleasePanel from './PlatformReleasePanel';
import { useVirtualMode } from '../../contexts/VirtualModeContext';
import WebsiteSettingsPanel from './WebsiteSettingsPanel';
import DatabaseExportImportPanel from './DatabaseExportImportPanel';

export default function SuperAdminDashboard() {
  const { profile, hasPermission } = useAuth();
  
  if (profile?.role !== 'super_admin') {
    return (
      <div className="flex justify-center items-center h-64 text-red-600 font-bold">
        Akses Ditolak: Halaman ini khusus untuk Super Admin.
      </div>
    );
  }
  const { isVirtualMode, toggleVirtualMode, isVirtualLoading, isQuotaExceeded } = useVirtualMode();
  const [activeTab, setActiveTab] = useState('users');
  
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {isQuotaExceeded && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 shadow-sm">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-amber-950">Info Kuota Firestore Free Tier</h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Batas pembacaan harian Firestore (Free Tier) sedang tercapai. Mode Virtual Sandbox beroperasi 100% aman menggunakan data simulasi lokal terisolasi tanpa memerlukan akses database live.
              </p>
            </div>
          </div>
          <a
            href="https://console.firebase.google.com/project/decisive-aleph-j7k72/firestore/databases/ai-studio-ace49a47-40ec-4c50-9cf0-e0bbd7ea490e/data?openUpgradeDialog=true"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition-colors whitespace-nowrap"
          >
            Upgrade Kuota Firebase
          </a>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-red-600" />
            Super Admin Dashboard
          </h2>
          <p className="text-gray-500 mt-1 text-sm">Pusat kendali sistem, manajemen pengguna, dan konfigurasi aplikasi.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* VIRTUAL MODE TOGGLE */}
          <div className="flex items-center space-x-2 bg-purple-50 px-4 py-2 rounded-lg border border-purple-100">
            <div className="flex flex-col text-right">
              <span className="text-sm font-bold text-purple-900">Mode Virtual</span>
              <span className="text-xs text-purple-600">{isVirtualMode ? 'Aktif (Data Lokal)' : 'Nonaktif (Data Live)'}</span>
            </div>
            <button
              onClick={() => {
                console.log("Toggle clicked", !isVirtualMode);
                toggleVirtualMode(!isVirtualMode);
              }}
              disabled={isVirtualLoading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isVirtualMode ? 'bg-purple-600' : 'bg-gray-300'
              } ${isVirtualLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer z-10 hover:ring-2 hover:ring-purple-300 relative'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isVirtualMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto">
            {[
              { id: 'users', icon: <Users className="w-4 h-4 mr-2" />, label: 'Pengguna' },
              { id: 'settings', icon: <Settings className="w-4 h-4 mr-2" />, label: 'Pengaturan' },
              { id: 'website', icon: <Globe className="w-4 h-4 mr-2" />, label: 'Website Sekolah' },
      { id: 'period', icon: <Calendar className="w-4 h-4 mr-2" />, label: 'Periode Akademik' },
              { id: 'promotion', icon: <ArrowUpRight className="w-4 h-4 mr-2" />, label: 'Kenaikan Kelas' },
              { id: 'logs', icon: <History className="w-4 h-4 mr-2" />, label: 'Log Sistem' },
              { id: 'database', icon: <FolderArchive className="w-4 h-4 mr-2" />, label: 'Arsip & Database' },
              { id: 'tools', icon: <Key className="w-4 h-4 mr-2" />, label: 'Alat Guru' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === 'users' && <UserManagementPanel />}
      {activeTab === 'settings' && <SystemSettingsPanel />}
      {activeTab === 'website' && <WebsiteSettingsPanel />}
      {activeTab === 'period' && <AcademicPeriodPanel />}
      {activeTab === 'promotion' && <StudentPromotionPanel />}
      {activeTab === 'logs' && <AuditLogsPanel />}
      {activeTab === 'database' && <DatabaseAndArchivePanel />}
      {activeTab === 'tools' && <TeacherToolsPanel />}

    </div>
  );
}

function SystemSettingsPanel() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    academicYear: '2024/2025',
    semester: 'Ganjil',
    schoolName: 'SMA Negeri 1 Nusantara',
    schoolLogo: '/vite.svg',
    pinCurriculum: '2024',
    pinPrincipal: '123456',
    pinTU: '4321',
    pinSuperAdmin: '999999',
    isAcademicFrozen: false
  });
  const [freezeConfirm, setFreezeConfirm] = useState('');
  const [showFreezeModal, setShowFreezeModal] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        
        const docSnap = await getDoc(doc(db, 'settings', 'global'));
        if (docSnap.exists()) {
          setSettings({ ...settings, ...docSnap.data() });
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);
  
  const handleSave = async () => {
    setSaving(true);
    try {
      
      await setDoc(doc(db, 'settings', 'global'), settings);
      alert('Pengaturan berhasil disimpan!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const generatePin = (field: string, length: number) => {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    const newPin = Math.floor(Math.random() * (max - min + 1) + min).toString();
    handleChange(field, newPin);
  };

  if (loading) return <div className="text-center py-10">Memuat pengaturan...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center space-x-2">
          <Key className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-bold text-gray-900">Manajemen PIN Akses</h3>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500 mb-4">PIN ini digunakan saat pendaftaran awal untuk memvalidasi pengguna dengan peran khusus.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PIN Kurikulum</label>
              <div className="flex">
                <input type="text" value={settings.pinCurriculum} onChange={e => handleChange('pinCurriculum', e.target.value)} className="flex-1 border border-gray-300 rounded-l-lg px-3 py-2 font-mono" />
                <button onClick={() => generatePin('pinCurriculum', 4)} className="bg-gray-100 border border-gray-300 border-l-0 rounded-r-lg px-3 py-2 text-gray-600 hover:bg-gray-200">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PIN Kepala Sekolah</label>
              <div className="flex">
                <input type="text" value={settings.pinPrincipal} onChange={e => handleChange('pinPrincipal', e.target.value)} className="flex-1 border border-gray-300 rounded-l-lg px-3 py-2 font-mono" />
                <button onClick={() => generatePin('pinPrincipal', 6)} className="bg-gray-100 border border-gray-300 border-l-0 rounded-r-lg px-3 py-2 text-gray-600 hover:bg-gray-200">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PIN Tata Usaha</label>
              <div className="flex">
                <input type="text" value={settings.pinTU} onChange={e => handleChange('pinTU', e.target.value)} className="flex-1 border border-gray-300 rounded-l-lg px-3 py-2 font-mono" />
                <button onClick={() => generatePin('pinTU', 4)} className="bg-gray-100 border border-gray-300 border-l-0 rounded-r-lg px-3 py-2 text-gray-600 hover:bg-gray-200">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PIN Super Admin</label>
              <div className="flex">
                <input type="text" value={settings.pinSuperAdmin} onChange={e => handleChange('pinSuperAdmin', e.target.value)} className="flex-1 border border-gray-300 rounded-l-lg px-3 py-2 font-mono text-red-600" />
                <button onClick={() => generatePin('pinSuperAdmin', 6)} className="bg-gray-100 border border-gray-300 border-l-0 rounded-r-lg px-3 py-2 text-gray-600 hover:bg-gray-200">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="pt-4 flex justify-end">
            <button onClick={handleSave} disabled={saving} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Menyimpan...' : <><Save className="w-4 h-4 mr-2" /> Simpan PIN</>}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center space-x-2">
          <Settings className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-bold text-gray-900">Konfigurasi Global</h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Ajaran Aktif</label>
            <input type="text" value={settings.academicYear} onChange={e => handleChange('academicYear', e.target.value)} placeholder="Contoh: 2024/2025" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Semester Aktif</label>
            <select value={settings.semester} onChange={e => handleChange('semester', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Sekolah</label>
            <input type="text" value={settings.schoolName} onChange={e => handleChange('schoolName', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL Logo Sekolah</label>
            <input type="text" value={settings.schoolLogo} onChange={e => handleChange('schoolLogo', e.target.value)} placeholder="Masukkan URL logo sekolah" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
            <p className="text-xs text-gray-500 mt-1">Gunakan URL gambar valid atau path ke file lokal.</p>
          </div>
          
          <div className="pt-4 flex justify-end">
            <button onClick={handleSave} disabled={saving} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Menyimpan...' : <><Save className="w-4 h-4 mr-2" /> Simpan Konfigurasi</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuditLogsPanel() {
  const [logs, setLogs] = useState<any[]>([]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <History className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-bold text-gray-900">Log Aktivitas Sistem</h3>
        </div>
        <button className="text-sm text-blue-600 font-medium hover:text-blue-800">Muat Ulang</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-3 font-semibold text-gray-500 uppercase tracking-wider">Aktivitas</th>
              <th className="px-6 py-3 font-semibold text-gray-500 uppercase tracking-wider">Pelaku</th>
              <th className="px-6 py-3 font-semibold text-gray-500 uppercase tracking-wider">Waktu</th>
              <th className="px-6 py-3 font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.length > 0 ? logs.map((log: any) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{log.action}</div>
                  {log.detail && <div className="text-xs text-gray-500 mt-0.5">{log.detail}</div>}
                </td>
                <td className="px-6 py-4 text-gray-600">{log.user}</td>
                <td className="px-6 py-4 text-gray-500">{log.time}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                    log.status === 'Success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {log.status}
                  </span>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  Belum ada log aktivitas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DatabaseAndArchivePanel() {
  const [viewState, setViewState] = useState<'overview' | 'recap'>('overview');
  const [selectedArchive, setSelectedArchive] = useState<any>(null);

  // Mock data untuk arsip
  const archives = [
    { id: '1', year: '2023/2024', semester: 'Genap', date: '15 Juni 2024', studentCount: 312, size: '2.4 MB' },
    { id: '2', year: '2023/2024', semester: 'Ganjil', date: '20 Des 2023', studentCount: 308, size: '2.1 MB' },
    { id: '3', year: '2022/2023', semester: 'Genap', date: '18 Juni 2023', studentCount: 295, size: '1.9 MB' }
  ];

  // Mock data rekap untuk arsip terpilih
  const archiveStudents = [
    { id: 's1', name: 'Ahmad Faisal', nisn: '0054321987', className: '10A', totalPoints: 1250, attendance: '98%', rank: 1 },
    { id: 's2', name: 'Budi Santoso', nisn: '0054321988', className: '10A', totalPoints: 1100, attendance: '95%', rank: 2 },
    { id: 's3', name: 'Citra Kirana', nisn: '0054321989', className: '10B', totalPoints: 1050, attendance: '92%', rank: 3 },
    { id: 's4', name: 'Dewi Lestari', nisn: '0054321990', className: '11A', totalPoints: 950, attendance: '90%', rank: 4 },
    { id: 's5', name: 'Eko Prasetyo', nisn: '0054321991', className: '11B', totalPoints: 800, attendance: '85%', rank: 5 },
  ];

  if (viewState === 'recap' && selectedArchive) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 text-gray-500 text-sm mb-2">
              <button onClick={() => setViewState('overview')} className="hover:text-blue-600 transition-colors">Arsip Database</button>
              <span>/</span>
              <span className="text-gray-900 font-medium">Rekap Kompilasi</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <FolderArchive className="w-6 h-6 mr-3 text-blue-600" />
              Rekap Kompilasi {selectedArchive.year} - {selectedArchive.semester}
            </h2>
            <p className="text-gray-500 mt-1">Laporan historis akhir semester yang dikunci (Read-Only).</p>
          </div>
          <div className="flex space-x-3">
            <button className="flex items-center space-x-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 shadow-sm transition-colors">
              <Download className="w-4 h-4" />
              <span>Unduh PDF Kelas</span>
            </button>
            <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 shadow-sm transition-colors">
              <FileBarChart className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Cari siswa historis..." className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:border-blue-500 outline-none" />
              </div>
              <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:border-blue-500 outline-none">
                <option value="all">Semua Kelas</option>
                <option value="10A">Kelas 10A</option>
                <option value="10B">Kelas 10B</option>
              </select>
            </div>
          </div>
          
          <table className="w-full text-left text-sm">
            <thead className="bg-white border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-semibold text-gray-600">Peringkat</th>
                <th className="px-6 py-3 font-semibold text-gray-600">Nama Siswa</th>
                <th className="px-6 py-3 font-semibold text-gray-600">NISN</th>
                <th className="px-6 py-3 font-semibold text-gray-600">Kelas</th>
                <th className="px-6 py-3 font-semibold text-gray-600">Total Poin Akhir</th>
                <th className="px-6 py-3 font-semibold text-gray-600">Kehadiran</th>
                <th className="px-6 py-3 font-semibold text-gray-600 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {archiveStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-gray-500 font-medium">#{student.rank}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">{student.name}</td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">{student.nisn}</td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-semibold">{student.className}</span>
                  </td>
                  <td className="px-6 py-4 font-bold text-green-600">{student.totalPoints}</td>
                  <td className="px-6 py-4 font-medium text-gray-700">{student.attendance}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center">
                      <Eye className="w-4 h-4 mr-1" /> Rapor
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* SECTION: ARSIP AKADEMIK & KOMPILASI */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <FolderArchive className="w-6 h-6 text-blue-600 mr-2" />
              Arsip & Rekap Kompilasi
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Manajemen pencadangan akhir semester dan rekapitulasi data historis siswa.
            </p>
          </div>
          <button className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center">
            <Archive className="w-5 h-5 mr-2" />
            Tutup Tahun & Buat Arsip
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-semibold text-gray-600">Tahun & Semester</th>
                <th className="px-6 py-3 font-semibold text-gray-600">Tanggal Arsip</th>
                <th className="px-6 py-3 font-semibold text-gray-600">Jumlah Siswa</th>
                <th className="px-6 py-3 font-semibold text-gray-600">Ukuran Data</th>
                <th className="px-6 py-3 font-semibold text-gray-600 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {archives.map((arc) => (
                <tr key={arc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">TA {arc.year}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mt-0.5">Semester {arc.semester}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{arc.date}</td>
                  <td className="px-6 py-4 text-gray-600">{arc.studentCount} Siswa</td>
                  <td className="px-6 py-4 text-gray-500 text-xs font-mono">{arc.size}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => { setSelectedArchive(arc); setViewState('recap'); }}
                      className="inline-flex items-center justify-center bg-white border border-gray-300 text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 px-3 py-1.5 rounded-lg font-medium text-sm transition-colors"
                    >
                      <FileBarChart className="w-4 h-4 mr-1.5" /> Lihat Rekap
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION: MIGRASI DATA & BACKUP STUDIO */}
      <div>
        <DatabaseExportImportPanel />
      </div>

      {/* SECTION: DATABASE METRICS */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <Database className="w-6 h-6 text-gray-700 mr-2" />
          Status Database Aktif
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Firestore Storage</h3>
                <p className="text-sm text-gray-500">Kapasitas digunakan</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '15%' }}></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>150 MB</span>
              <span>1 GB (Free Tier)</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-green-100 p-2 rounded-lg text-green-600">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Status Layanan</h3>
                <p className="text-sm text-gray-500">Koneksi Realtime</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-medium text-gray-700">Online & Stabil</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                <Save className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Pencadangan Harian</h3>
                <p className="text-sm text-gray-500">Otomatis (Cloud)</p>
              </div>
            </div>
            <button className="w-full bg-white border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Sinkronisasi Manual
            </button>
          </div>
        </div>
      </div>

      {/* SECTION: DANGER ZONE */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-red-800 flex items-center mb-2">
          <AlertTriangle className="w-5 h-5 mr-2" /> Zona Berbahaya (Danger Zone)
        </h3>
        <p className="text-sm text-red-600 mb-4">
          Tindakan di bawah ini bersifat destruktif dan hanya berdampak pada data aktif saat ini. Arsip lama tidak akan terhapus.
        </p>
        <div className="flex flex-wrap gap-4">
          <button className="bg-white border border-red-300 text-red-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
            Hapus Log Absensi Mentah (&gt; 1 Tahun)
          </button>
          <button className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-sm">
            Hard Reset Data Transaksional Sistem
          </button>
        </div>
      </div>
    </div>
  );
}
