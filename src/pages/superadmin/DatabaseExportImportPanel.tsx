import React, { useState } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  FileJson,
  Layers,
  Search,
  CheckSquare,
  Square,
  ShieldAlert,
  Server,
  Calendar,
  Users,
  CreditCard,
  GraduationCap,
  Globe,
  FileText,
  UserCheck,
  Building,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import {
  MODULE_COLLECTION_GROUPS,
  ALL_SYSTEM_COLLECTION_KEYS,
  executeDatabaseExport,
  validateImportPayload,
  executeDatabaseImport,
  ExportProgress,
  ImportValidationResult
} from '../../lib/exportUtils';
import { useAuth } from '../../contexts/AuthContext';
import { useVirtualMode } from '../../contexts/VirtualModeContext';

export default function DatabaseExportImportPanel() {
  const { profile } = useAuth();
  const { isVirtualMode } = useVirtualMode();

  const [activeSubTab, setActiveSubTab] = useState<'export' | 'import' | 'catalog'>('export');

  // Export States
  const [exportMode, setExportMode] = useState<'full' | 'modules' | 'custom'>('full');
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>(
    MODULE_COLLECTION_GROUPS.map(g => g.id)
  );
  const [selectedCollectionKeys, setSelectedCollectionKeys] = useState<string[]>(
    ALL_SYSTEM_COLLECTION_KEYS
  );
  const [tenantFilter, setTenantFilter] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string>('');

  // Import States
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importRawJson, setImportRawJson] = useState<any | null>(null);
  const [importValidation, setImportValidation] = useState<ImportValidationResult | null>(null);
  const [selectedImportCollections, setSelectedImportCollections] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    currentCollection: string;
    completedDocs: number;
    totalDocs: number;
    percent: number;
  } | null>(null);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string>('');

  // Module icon helper
  const getModuleIcon = (id: string) => {
    switch (id) {
      case 'identity_rbac': return <Users className="w-5 h-5 text-indigo-600" />;
      case 'academic_curriculum': return <Calendar className="w-5 h-5 text-blue-600" />;
      case 'students': return <GraduationCap className="w-5 h-5 text-emerald-600" />;
      case 'teachers': return <UserCheck className="w-5 h-5 text-amber-600" />;
      case 'admission_ppdb': return <Building className="w-5 h-5 text-rose-600" />;
      case 'supervision': return <SlidersHorizontal className="w-5 h-5 text-purple-600" />;
      case 'parents': return <Users className="w-5 h-5 text-cyan-600" />;
      case 'finance': return <CreditCard className="w-5 h-5 text-green-600" />;
      case 'administration_tu': return <FileText className="w-5 h-5 text-orange-600" />;
      case 'website_cms': return <Globe className="w-5 h-5 text-sky-600" />;
      case 'platform_system': return <Server className="w-5 h-5 text-slate-600" />;
      default: return <Database className="w-5 h-5 text-blue-600" />;
    }
  };

  // Module Selection Handlers
  const toggleModuleSelection = (groupId: string) => {
    const group = MODULE_COLLECTION_GROUPS.find(g => g.id === groupId);
    if (!group) return;

    if (selectedModuleIds.includes(groupId)) {
      setSelectedModuleIds(prev => prev.filter(id => id !== groupId));
      setSelectedCollectionKeys(prev =>
        prev.filter(key => !group.collections.some(c => c.key === key))
      );
    } else {
      setSelectedModuleIds(prev => [...prev, groupId]);
      const newKeys = group.collections.map(c => c.key);
      setSelectedCollectionKeys(prev => Array.from(new Set([...prev, ...newKeys])));
    }
  };

  const toggleCollectionSelection = (colKey: string) => {
    if (selectedCollectionKeys.includes(colKey)) {
      setSelectedCollectionKeys(prev => prev.filter(k => k !== colKey));
    } else {
      setSelectedCollectionKeys(prev => [...prev, colKey]);
    }
  };

  const selectAllCollections = () => {
    setSelectedCollectionKeys(ALL_SYSTEM_COLLECTION_KEYS);
    setSelectedModuleIds(MODULE_COLLECTION_GROUPS.map(g => g.id));
  };

  const deselectAllCollections = () => {
    setSelectedCollectionKeys([]);
    setSelectedModuleIds([]);
  };

  // Execute Export
  const handleStartExport = async () => {
    let collectionsToExport: string[] = [];
    if (exportMode === 'full') {
      collectionsToExport = ALL_SYSTEM_COLLECTION_KEYS;
    } else if (exportMode === 'modules') {
      collectionsToExport = MODULE_COLLECTION_GROUPS
        .filter(g => selectedModuleIds.includes(g.id))
        .flatMap(g => g.collections.map(c => c.key));
    } else {
      collectionsToExport = selectedCollectionKeys;
    }

    if (collectionsToExport.length === 0) {
      alert('Pilih setidaknya satu koleksi database untuk diekspor.');
      return;
    }

    setIsExporting(true);
    setExportSuccessMessage('');
    setExportProgress({
      currentCollection: 'Memulai proses...',
      collectionIndex: 0,
      totalCollections: collectionsToExport.length,
      documentsCount: 0,
      phase: 'fetching'
    });

    const result = await executeDatabaseExport({
      selectedCollections: collectionsToExport,
      tenantId: tenantFilter,
      userEmail: profile?.email || 'super_admin@smas-diponegoro.sch.id',
      isVirtualMode,
      onProgress: (p) => setExportProgress(p)
    });

    setIsExporting(false);
    if (result.success) {
      setExportSuccessMessage(`Berhasil mengekspor ${result.totalDocs} dokumen dari ${collectionsToExport.length} koleksi ke file "${result.filename}".`);
    }
  };

  // Handle File Input for Import
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportSuccessMessage('');
    setImportProgress(null);

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      setImportRawJson(json);
      const validation = validateImportPayload(json);
      setImportValidation(validation);
      setSelectedImportCollections(validation.detectedCollections);
    } catch (err: any) {
      setImportValidation({
        isValid: false,
        isLegacyFormat: false,
        detectedCollections: [],
        totalDocuments: 0,
        collectionDocCounts: {},
        validationErrors: ['File bukan merupakan JSON yang valid: ' + err.message],
        validationWarnings: []
      });
      setImportRawJson(null);
    }
  };

  // Execute Import
  const handleStartImport = async () => {
    if (!importRawJson || !importValidation?.isValid) return;

    const confirmMsg = `Peringatan: Pemulihan data akan menulis ${selectedImportCollections.length} koleksi ke ${isVirtualMode ? 'Database Virtual Sandbox' : 'Database Live Firestore'}. Dokumen dengan ID yang sama akan diperbarui (merge). Apakah Anda yakin?`;
    if (!window.confirm(confirmMsg)) return;

    setIsImporting(true);
    setImportSuccessMessage('');

    const result = await executeDatabaseImport({
      parsedJson: importRawJson,
      selectedCollections: selectedImportCollections,
      isVirtualMode,
      onProgress: (p) => setImportProgress(p)
    });

    setIsImporting(false);
    if (result.success) {
      setImportSuccessMessage(`Pemulihan database selesai. Total ${result.totalRestored} dokumen dari ${result.restoredCollections.length} koleksi berhasil dipulihkan.`);
      setImportFile(null);
      setImportRawJson(null);
      setImportValidation(null);
    } else {
      alert(result.message || 'Terjadi kesalahan saat memulihkan data.');
    }
  };

  // Filtered collections for custom checklist
  const filteredGroups = MODULE_COLLECTION_GROUPS.map(group => ({
    ...group,
    collections: group.collections.filter(
      c =>
        c.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
        c.key.toLowerCase().includes(searchFilter.toLowerCase()) ||
        c.description.toLowerCase().includes(searchFilter.toLowerCase())
    )
  })).filter(group => group.collections.length > 0);

  return (
    <div className="space-y-6">
      {/* HEADER CARD */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/20 border border-blue-400/30 rounded-xl backdrop-blur-sm">
                <Database className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">Database Migration & Backup Studio</h3>
                <p className="text-sm text-slate-300">
                  Cadangkan, ekspor komprehensif, dan pulihkan seluruh data 11 modul sistem ke format JSON terstruktur v2.0.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-medium">
                <CheckCircle className="w-3.5 h-3.5" />
                {ALL_SYSTEM_COLLECTION_KEYS.length} Koleksi Terdaftar
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 font-medium">
                <Layers className="w-3.5 h-3.5" />
                {MODULE_COLLECTION_GROUPS.length} Modul Terintegrasi
              </span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium ${
                isVirtualMode
                  ? 'bg-purple-500/20 border border-purple-500/30 text-purple-300'
                  : 'bg-amber-500/20 border border-amber-500/30 text-amber-300'
              }`}>
                <Server className="w-3.5 h-3.5" />
                Target: {isVirtualMode ? 'Virtual Sandbox (Data Lokal)' : 'Live Production Firestore'}
              </span>
            </div>
          </div>

          {/* TAB BUTTONS */}
          <div className="flex bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60 self-start md:self-auto">
            <button
              onClick={() => setActiveSubTab('export')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeSubTab === 'export'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Download className="w-4 h-4" />
              Export Database
            </button>
            <button
              onClick={() => setActiveSubTab('import')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeSubTab === 'import'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Upload className="w-4 h-4" />
              Import & Restore
            </button>
            <button
              onClick={() => setActiveSubTab('catalog')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeSubTab === 'catalog'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              Katalog Koleksi
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: EXPORT DATABASE */}
      {activeSubTab === 'export' && (
        <div className="space-y-6">
          {/* Notification Alert */}
          {exportSuccessMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-900 shadow-sm animate-fadeIn">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm font-medium">{exportSuccessMessage}</div>
            </div>
          )}

          {/* EXPORT MODE SELECTOR */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
            <div>
              <h4 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-blue-600" />
                Pilih Lingkup Pencadangan (Export Scope)
              </h4>
              <p className="text-sm text-gray-500 mt-1">
                Tentukan apakah ingin mencadangkan seluruh sistem sekaligus atau memilih modul tertentu sesuai kebutuhan.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setExportMode('full')}
                className={`p-4 rounded-xl border text-left transition-all relative ${
                  exportMode === 'full'
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-700 font-bold text-xs">
                    Rekomendasi
                  </div>
                  {exportMode === 'full' ? (
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-300" />
                  )}
                </div>
                <h5 className="font-bold text-gray-900 text-sm">Full System Backup</h5>
                <p className="text-xs text-gray-500 mt-1">
                  Mengekspor seluruh {ALL_SYSTEM_COLLECTION_KEYS.length} koleksi di semua modul secara komprehensif.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setExportMode('modules')}
                className={`p-4 rounded-xl border text-left transition-all relative ${
                  exportMode === 'modules'
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700 font-bold text-xs">
                    Modular
                  </div>
                  {exportMode === 'modules' ? (
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-300" />
                  )}
                </div>
                <h5 className="font-bold text-gray-900 text-sm">Pilih per Modul</h5>
                <p className="text-xs text-gray-500 mt-1">
                  Pilih modul fungsional tertentu (misal: hanya PPDB, Keuangan, atau Akademik).
                </p>
              </button>

              <button
                type="button"
                onClick={() => setExportMode('custom')}
                className={`p-4 rounded-xl border text-left transition-all relative ${
                  exportMode === 'custom'
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-slate-100 rounded-lg text-slate-700 font-bold text-xs">
                    Granular
                  </div>
                  {exportMode === 'custom' ? (
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-300" />
                  )}
                </div>
                <h5 className="font-bold text-gray-900 text-sm">Koleksi Kustom</h5>
                <p className="text-xs text-gray-500 mt-1">
                  Centang secara spesifik tabel/koleksi individual yang ingin dimasukkan ke file export.
                </p>
              </button>
            </div>

            {/* TENANT FILTER */}
            <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-800">Filter Lingkup Tenant / Sekolah</label>
                <p className="text-xs text-gray-500">Pilih untuk mengekspor data seluruh tenant atau sekolah aktif tertentu.</p>
              </div>
              <select
                value={tenantFilter}
                onChange={(e) => setTenantFilter(e.target.value)}
                className="px-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="ALL">Semua Data (Global & Multi-Tenant)</option>
                <option value="smas-diponegoro">SMAS Islam Diponegoro (Default)</option>
              </select>
            </div>
          </div>

          {/* MODULAR SELECTION INTERFACE */}
          {exportMode === 'modules' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-900 text-base">Pilih Modul yang Ingin Diexport</h4>
                  <p className="text-xs text-gray-500">Centang kategori modul fungsional di bawah ini.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedModuleIds(MODULE_COLLECTION_GROUPS.map(g => g.id))}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => setSelectedModuleIds([])}
                    className="text-xs text-gray-500 font-semibold hover:underline"
                  >
                    Hapus Pilihan
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {MODULE_COLLECTION_GROUPS.map(group => {
                  const isSelected = selectedModuleIds.includes(group.id);
                  return (
                    <div
                      key={group.id}
                      onClick={() => toggleModuleSelection(group.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/40'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="mt-0.5">
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {getModuleIcon(group.id)}
                          <h5 className="text-sm font-bold text-gray-900 truncate">{group.name}</h5>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{group.description}</p>
                        <div className="mt-2 text-[11px] text-blue-700 font-medium bg-blue-100/60 inline-block px-2 py-0.5 rounded">
                          {group.collections.length} Koleksi
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CUSTOM GRANULAR CHECKLIST */}
          {exportMode === 'custom' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-gray-900 text-base">Pilih Koleksi Spesifik</h4>
                  <p className="text-xs text-gray-500">
                    {selectedCollectionKeys.length} dari {ALL_SYSTEM_COLLECTION_KEYS.length} koleksi terpilih.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Cari tabel/koleksi..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs w-52 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={selectAllCollections}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Semua
                  </button>
                  <button
                    onClick={deselectAllCollections}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Kosongkan
                  </button>
                </div>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {filteredGroups.map(group => (
                  <div key={group.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                    <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      {getModuleIcon(group.id)}
                      {group.name}
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {group.collections.map(col => {
                        const isChecked = selectedCollectionKeys.includes(col.key);
                        return (
                          <label
                            key={col.key}
                            className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-white border-blue-300 shadow-2xs'
                                : 'bg-white/60 border-gray-200 hover:bg-white'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleCollectionSelection(col.key)}
                              className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                              <div className="font-bold text-gray-900 font-mono text-[11px]">{col.key}</div>
                              <div className="text-gray-600 font-medium mt-0.5">{col.label}</div>
                              <div className="text-gray-400 text-[10px] mt-0.5">{col.description}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EXPORT ACTION & PROGRESS CARD */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileJson className="w-5 h-5 text-blue-600" />
                <h4 className="font-bold text-gray-900 text-base">Format Output & Spesifikasi</h4>
              </div>
              <p className="text-xs text-gray-500">
                File akan diexport dalam format JSON standar v2.0 (lengkap dengan metadata timestamp, schema version, dan checksum total dokumen).
              </p>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <button
                onClick={handleStartExport}
                disabled={isExporting}
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Mengekspor ({exportProgress?.collectionIndex}/{exportProgress?.totalCollections})...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>Download Database JSON</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* PROGRESS BAR DISPLAY */}
          {isExporting && exportProgress && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2 animate-fadeIn">
              <div className="flex justify-between text-xs font-semibold text-blue-900">
                <span>Mengambil: <strong className="font-mono">{exportProgress.currentCollection}</strong></span>
                <span>{exportProgress.collectionIndex} / {exportProgress.totalCollections} Koleksi ({exportProgress.documentsCount} Dokumen)</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round(
                      (exportProgress.collectionIndex / Math.max(exportProgress.totalCollections, 1)) * 100
                    )}%`
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: IMPORT & RESTORE */}
      {activeSubTab === 'import' && (
        <div className="space-y-6">
          {/* Notification Alert */}
          {importSuccessMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-900 shadow-sm animate-fadeIn">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm font-medium">{importSuccessMessage}</div>
            </div>
          )}

          {/* UPLOAD & DROPZONE */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div>
              <h4 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                Unggah File Backup JSON
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                Pilih file JSON backup yang sebelumnya diunduh dari sistem ini.
              </p>
            </div>

            <div className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl p-8 text-center transition-colors bg-gray-50/50 flex flex-col items-center justify-center">
              <FileJson className="w-12 h-12 text-blue-500 mb-3" />
              <p className="text-sm font-bold text-gray-800">
                {importFile ? importFile.name : 'Pilih file backup .json dari komputer'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Mendukung format Schema v2.0 (baru) maupun format Flat Legacy v1.0.
              </p>
              <label className="mt-4 inline-flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold px-4 py-2 rounded-lg text-sm shadow-2xs cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                <span>Pilih File JSON</span>
                <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          </div>

          {/* PRE-FLIGHT VALIDATION INSPECTOR */}
          {importValidation && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-600" />
                  <h4 className="font-bold text-gray-900 text-base">Hasil Analisis & Validasi File</h4>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  importValidation.isValid
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {importValidation.isValid ? 'Format Valid & Siap Dipulihkan' : 'Format Tidak Valid'}
                </span>
              </div>

              {/* METADATA SUMMARY */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 rounded-xl p-3 text-xs">
                <div>
                  <span className="text-gray-500 block">Versi Format</span>
                  <span className="font-bold text-gray-800">
                    {importValidation.meta?.schemaVersion || (importValidation.isLegacyFormat ? 'Legacy v1.0' : 'Unknown')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Waktu Backup</span>
                  <span className="font-bold text-gray-800">
                    {importValidation.meta?.exportedAt ? new Date(importValidation.meta.exportedAt).toLocaleString('id-ID') : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Total Koleksi</span>
                  <span className="font-bold text-blue-600">{importValidation.detectedCollections.length} Tabel</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Total Dokumen</span>
                  <span className="font-bold text-emerald-600">{importValidation.totalDocuments} Dokumen</span>
                </div>
              </div>

              {/* WARNINGS & ERRORS */}
              {importValidation.validationErrors.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Kesalahan Validasi:
                  </div>
                  {importValidation.validationErrors.map((err, idx) => (
                    <div key={idx}>• {err}</div>
                  ))}
                </div>
              )}

              {importValidation.validationWarnings.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-amber-600" />
                    Peringatan Struktur:
                  </div>
                  {importValidation.validationWarnings.map((w, idx) => (
                    <div key={idx}>• {w}</div>
                  ))}
                </div>
              )}

              {/* COLLECTION SELECTION FOR RESTORE */}
              {importValidation.isValid && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-800">Pilih Koleksi yang Ingin Dipulihkan:</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedImportCollections(importValidation.detectedCollections)}
                        className="text-blue-600 font-semibold hover:underline"
                      >
                        Pilih Semua
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => setSelectedImportCollections([])}
                        className="text-gray-500 font-semibold hover:underline"
                      >
                        Hapus Pilihan
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                    {importValidation.detectedCollections.map(col => {
                      const count = importValidation.collectionDocCounts[col] || 0;
                      const isChecked = selectedImportCollections.includes(col);
                      return (
                        <label
                          key={col}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-blue-50/50 border-blue-300'
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedImportCollections(prev => prev.filter(k => k !== col));
                                } else {
                                  setSelectedImportCollections(prev => [...prev, col]);
                                }
                              }}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-mono text-gray-800 truncate">{col}</span>
                          </div>
                          <span className="font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded text-[11px] ml-2">
                            {count} docs
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                      <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                      <span>Data akan dipulihkan ke <strong>{isVirtualMode ? 'Virtual Sandbox' : 'Firestore Live'}</strong> menggunakan metode update merge.</span>
                    </div>

                    <button
                      onClick={handleStartImport}
                      disabled={isImporting || selectedImportCollections.length === 0}
                      className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      {isImporting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Memulihkan ({importProgress?.percent || 0}%)...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>Eksekusi Pemulihan ({selectedImportCollections.length} Koleksi)</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* IMPORT PROGRESS */}
                  {isImporting && importProgress && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2 animate-fadeIn">
                      <div className="flex justify-between text-xs font-semibold text-emerald-900">
                        <span>Memulihkan: <strong className="font-mono">{importProgress.currentCollection}</strong></span>
                        <span>{importProgress.completedDocs} / {importProgress.totalDocs} Dokumen ({importProgress.percent}%)</span>
                      </div>
                      <div className="w-full bg-emerald-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${importProgress.percent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: KATALOG KOLEKSI SISTEM */}
      {activeSubTab === 'catalog' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden space-y-4 p-6">
          <div>
            <h4 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Matriks Katalog Koleksi Database ({ALL_SYSTEM_COLLECTION_KEYS.length} Koleksi Aktif)
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              Daftar seluruh tabel/koleksi Firestore yang digunakan dalam arsitektur aplikasi SMAS Islam Diponegoro.
            </p>
          </div>

          <div className="space-y-6">
            {MODULE_COLLECTION_GROUPS.map(group => (
              <div key={group.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {getModuleIcon(group.id)}
                    <div>
                      <h5 className="font-bold text-gray-900 text-sm">{group.name}</h5>
                      <span className="text-xs text-gray-500">{group.description}</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
                    {group.collections.length} Koleksi
                  </span>
                </div>

                <div className="divide-y divide-gray-100">
                  {group.collections.map(col => (
                    <div key={col.key} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-gray-50/60 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-mono border border-blue-100">
                            {col.key}
                          </code>
                          <span className="text-xs font-bold text-gray-800">{col.label}</span>
                        </div>
                        <p className="text-xs text-gray-500">{col.description}</p>
                      </div>
                      <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded self-start sm:self-auto whitespace-nowrap">
                        Terintegrasi Export
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
