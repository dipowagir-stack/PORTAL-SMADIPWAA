import React, { useState } from 'react';
import { useVirtualMode } from '../contexts/VirtualModeContext';
import { Database, RotateCcw, Download, Upload, X, Terminal, CheckCircle2, Activity, AlertTriangle, ExternalLink, CloudDownload } from 'lucide-react';

export default function VirtualModeBanner() {
  const { 
    isVirtualMode, 
    toggleVirtualMode, 
    mutationLogs, 
    networkLogs, 
    clearMutationLogs, 
    resetVirtualDatabase,
    syncFromLiveDatabase,
    exportSandbox,
    importSandbox,
    isQuotaExceeded
  } = useVirtualMode();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'mutations' | 'network' | 'manage' | 'quota'>('mutations');
  const [importText, setImportText] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!isVirtualMode) return null;

  const upgradeUrl = "https://console.firebase.google.com/project/decisive-aleph-j7k72/firestore/databases/ai-studio-ace49a47-40ec-4c50-9cf0-e0bbd7ea490e/data?openUpgradeDialog=true";

  const handleExport = async () => {
    try {
      const data = await exportSandbox();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sandbox-snapshot-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMsg('Data sandbox berhasil diexport!');
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (e: any) {
      setStatusMsg(`Gagal export: ${e.message}`);
    }
  };

  const handleImport = async () => {
    try {
      if (!importText.trim()) return;
      await importSandbox(importText.trim());
      setImportText('');
      setStatusMsg('Data sandbox berhasil di-restore!');
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (e: any) {
      setStatusMsg(`Gagal restore: ${e.message}`);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Yakin ingin mereset seluruh data sandbox? Semua modifikasi virtual akan dikembalikan ke kondisi awal (Data Dummy).')) {
      await resetVirtualDatabase();
      setStatusMsg('Database sandbox berhasil di-reset ke Data Dummy!');
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  const handleSyncLive = async () => {
    if (window.confirm('Yakin ingin menyinkronkan dengan data Live Firestore? Proses ini akan menimpa data sandbox saat ini dengan kondisi asli sekolah dan memakan sedikit waktu untuk mengunduh.')) {
      await syncFromLiveDatabase();
      setStatusMsg('Sandbox berhasil disinkronkan dengan Data Live!');
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  return (
    <>
      {/* Top sticky banner */}
      <div id="virtual-mode-banner" className={`${
        isQuotaExceeded ? 'bg-amber-950 border-amber-800 text-amber-100' : 'bg-purple-900 border-purple-800 text-purple-100'
      } px-4 py-2 text-xs sm:text-sm flex items-center justify-between shadow-inner print:hidden border-b`}>
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <span className="flex h-2.5 w-2.5 relative">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isQuotaExceeded ? 'bg-amber-400' : 'bg-purple-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isQuotaExceeded ? 'bg-amber-300' : 'bg-purple-300'}`}></span>
          </span>
          <span className="font-semibold text-white flex items-center gap-1.5 whitespace-nowrap">
            <Database className="w-4 h-4 text-purple-300 inline" />
            SANDBOX ENGINE AKTIF
          </span>
          <span className="hidden md:inline truncate">
            {isQuotaExceeded 
              ? 'Data Live Firestore mencapai batas kuota harian Free Tier. Sandbox berjalan 100% menggunakan data simulasi lokal.' 
              : 'Semua perubahan tersimpan terisolasi di IndexedDB & tidak mempengaruhi database Live Firestore.'}
          </span>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          {isQuotaExceeded && (
            <button
              onClick={() => {
                setActiveTab('quota');
                setIsOpen(true);
              }}
              className="flex items-center gap-1 bg-amber-800/80 hover:bg-amber-700 text-amber-200 px-2.5 py-1 rounded text-xs border border-amber-600 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Info Kuota</span>
            </button>
          )}

          <button
            onClick={() => {
              setActiveTab('mutations');
              setIsOpen(true);
            }}
            className="flex items-center gap-1.5 bg-purple-800 hover:bg-purple-700 text-purple-100 px-2.5 py-1 rounded text-xs border border-purple-600 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-purple-300" />
            <span>Audit & Mutasi</span>
            <span className="bg-purple-600 text-white font-mono px-1.5 py-0.2 rounded-full text-[10px]">
              {mutationLogs.length}
            </span>
          </button>

          <button
            onClick={() => toggleVirtualMode(false)}
            className="bg-purple-700 hover:bg-purple-600 text-white font-medium px-2.5 py-1 rounded text-xs transition-colors"
          >
            Kembali ke Live
          </button>
        </div>
      </div>

      {/* Modal / Inspector Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-purple-950 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="font-bold text-base">Virtual Sandbox Engine Inspector</h3>
                  <p className="text-xs text-purple-300">Pantau mutasi data lokal, request simulasi, dan kelola skenario pengujian</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-purple-300 hover:text-white p-1 rounded-lg hover:bg-purple-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-nav */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 bg-gray-50">
              <div className="flex space-x-4">
                <button
                  onClick={() => setActiveTab('mutations')}
                  className={`py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'mutations'
                      ? 'border-purple-600 text-purple-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  Mutation Logs ({mutationLogs.length})
                </button>
                <button
                  onClick={() => setActiveTab('network')}
                  className={`py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'network'
                      ? 'border-purple-600 text-purple-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Terminal className="w-4 h-4" />
                  Intercepted Network ({networkLogs.length})
                </button>
                <button
                  onClick={() => setActiveTab('manage')}
                  className={`py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'manage'
                      ? 'border-purple-600 text-purple-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" />
                  Manajemen Sandbox
                </button>
                {isQuotaExceeded && (
                  <button
                    onClick={() => setActiveTab('quota')}
                    className={`py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-1.5 ${
                      activeTab === 'quota'
                        ? 'border-amber-600 text-amber-700'
                        : 'border-transparent text-amber-600 hover:text-amber-800'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Status Kuota Firestore
                  </button>
                )}
              </div>

              {activeTab === 'mutations' && mutationLogs.length > 0 && (
                <button
                  onClick={clearMutationLogs}
                  className="text-xs text-red-600 hover:text-red-800 font-medium py-1 px-2 rounded hover:bg-red-50"
                >
                  Bersihkan Log
                </button>
              )}
            </div>

            {/* Status message */}
            {statusMsg && (
              <div className="bg-green-50 border-b border-green-200 text-green-800 px-6 py-2 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>{statusMsg}</span>
              </div>
            )}

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-900 text-slate-100 font-mono text-xs">
              {activeTab === 'quota' && (
                <div className="space-y-4 font-sans">
                  <div className="bg-amber-950/70 border border-amber-700/80 p-4 rounded-xl text-amber-200 space-y-3">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                      <h4>Batas Kuota Harian Firestore (Free Tier) Tercapai</h4>
                    </div>
                    <p className="text-xs leading-relaxed text-amber-300">
                      Basis data cloud Firestore pada project ini telah mencapai kuota pembacaan harian gratis (Spark Plan 50,000 reads/hari). Kuota gratis akan di-reset otomatis setiap hari (00:00 UTC / jam 07:00 WIB).
                    </p>
                    <div className="bg-slate-950 p-3 rounded-lg border border-amber-900/50 text-xs font-mono text-amber-400">
                      Status Mode Virtual: Tetap Aktif & Berfungsi 100% Menggunakan Fallback Sandbox Engine (Lokal IndexedDB).
                    </div>
                    <div className="pt-2">
                      <a
                        href={upgradeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-3.5 py-2 rounded-lg text-xs transition-colors"
                      >
                        Buka Firebase Console / Upgrade Kuota
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'mutations' && (
                <div className="space-y-3">
                  {mutationLogs.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      Belum ada operasi write/mutasi yang dilakukan di mode virtual.
                    </div>
                  ) : (
                    mutationLogs.map((log) => (
                      <div key={log.id} className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-slate-400 text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded font-bold uppercase text-[10px] ${
                              (log.operation === 'CREATE' || log.type === 'CREATE') ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                              (log.operation === 'UPDATE' || log.type === 'UPDATE') ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                              (log.operation === 'DELETE' || log.type === 'DELETE') ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                              'bg-purple-950 text-purple-400 border border-purple-800'
                            }`}>
                              {log.operation || log.type}
                            </span>
                            <span className="text-purple-300 font-semibold">{log.collection}</span>
                            {log.docId && <span className="text-slate-400">#{log.docId}</span>}
                          </div>
                          <span>{log.timestamp}</span>
                        </div>
                        {log.summary && (
                          <div className="text-slate-300 text-xs font-sans">{log.summary}</div>
                        )}
                        {(log.data || log.payload) && (
                          <pre className="bg-slate-950 p-2 rounded text-[11px] text-slate-300 overflow-x-auto border border-slate-800">
                            {JSON.stringify(log.data || log.payload, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'network' && (
                <div className="space-y-3">
                  {networkLogs.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      Belum ada request external/API pihak ketiga yang dicegat.
                    </div>
                  ) : (
                    networkLogs.map((req) => (
                      <div key={req.id} className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-slate-400 text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className="bg-blue-950 text-blue-400 border border-blue-800 px-1.5 py-0.5 rounded font-bold uppercase text-[10px]">
                              {req.method || req.service}
                            </span>
                            <span className="text-slate-200 font-semibold">{req.url || req.target}</span>
                            <span className="bg-emerald-900 text-emerald-300 px-1 rounded text-[10px]">MOCKED</span>
                          </div>
                          <span>{req.timestamp}</span>
                        </div>
                        {req.message && (
                          <div className="text-slate-300 text-xs font-sans">Pesan: {req.message}</div>
                        )}
                        {req.payload && (
                          <pre className="bg-slate-950 p-2 rounded text-[11px] text-slate-300 overflow-x-auto border border-slate-800">
                            {JSON.stringify(req.payload, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'manage' && (
                <div className="space-y-6 text-slate-300 font-sans text-sm">
                  <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg space-y-2">
                    <h4 className="font-bold text-white flex items-center gap-2">
                      <Download className="w-4 h-4 text-purple-400" />
                      Export Sandbox Snapshot
                    </h4>
                    <p className="text-xs text-slate-400">
                      Simpan seluruh modifikasi, data virtual, dan log skenario ke file JSON untuk dicadangkan atau dibagikan.
                    </p>
                    <button
                      onClick={handleExport}
                      className="mt-2 bg-purple-600 hover:bg-purple-500 text-white font-medium px-3 py-1.5 rounded text-xs transition-colors"
                    >
                      Download Snapshot (.json)
                    </button>
                  </div>

                  <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg space-y-2">
                    <h4 className="font-bold text-white flex items-center gap-2">
                      <Upload className="w-4 h-4 text-purple-400" />
                      Restore / Import Sandbox Snapshot
                    </h4>
                    <p className="text-xs text-slate-400">
                      Paste konten JSON snapshot untuk mengembalikan kondisi data virtual pengujian.
                    </p>
                    <textarea
                      rows={3}
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder='Paste JSON data di sini...'
                      className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                    <button
                      onClick={handleImport}
                      disabled={!importText.trim()}
                      className="mt-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium px-3 py-1.5 rounded text-xs transition-colors"
                    >
                      Apply Snapshot
                    </button>
                  </div>

                  <div className="bg-emerald-950/40 border border-emerald-800/60 p-4 rounded-lg space-y-2">
                    <h4 className="font-bold text-emerald-300 flex items-center gap-2">
                      <CloudDownload className="w-4 h-4 text-emerald-400" />
                      Sync dari Database Live (Kondisi Nyata)
                    </h4>
                    <p className="text-xs text-emerald-200/80">
                      Ganti data dummy saat ini dengan snapshot terbaru dari database live sekolah (hanya baca).
                    </p>
                    <button
                      onClick={handleSyncLive}
                      className="mt-2 bg-emerald-700 hover:bg-emerald-600 text-white font-medium px-3 py-1.5 rounded text-xs transition-colors"
                    >
                      Sync Sekarang
                    </button>
                  </div>

                  <div className="bg-rose-950/40 border border-rose-800/60 p-4 rounded-lg space-y-2">
                    <h4 className="font-bold text-rose-300 flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-rose-400" />
                      Reset Sandbox ke Kondisi Awal (Dummy)
                    </h4>
                    <p className="text-xs text-rose-200/80">
                      Hapus seluruh data virtual lokal di IndexedDB dan refresh dengan dataset dummy bawaan sistem.
                    </p>
                    <button
                      onClick={handleReset}
                      className="mt-2 bg-rose-700 hover:bg-rose-600 text-white font-medium px-3 py-1.5 rounded text-xs transition-colors"
                    >
                      Reset Sandbox
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-100 px-6 py-3 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium px-4 py-1.5 rounded-lg text-xs transition-colors"
              >
                Tutup Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
