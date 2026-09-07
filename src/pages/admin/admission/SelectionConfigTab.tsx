import React, { useState, useEffect } from 'react';
import { admissionWaveService } from '../../../domains/admission/services/AdmissionWaveService';
import { admissionSelectionService } from '../../../domains/admission/services/AdmissionSelectionService';
import { AdmissionWave } from '../../../domains/admission/entities/AdmissionWave';
import { useAuth } from '../../../contexts/AuthContext';
import { Settings, Play, CheckCircle2 } from 'lucide-react';

export default function SelectionConfigTab() {
  const { user } = useAuth();
  const [waves, setWaves] = useState<AdmissionWave[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWaveId, setSelectedWaveId] = useState('');
  const [quota, setQuota] = useState('');
  const [method, setMethod] = useState<'MANUAL' | 'RULE_BASED'>('MANUAL');
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchWaves();
  }, []);

  const fetchWaves = async () => {
    setLoading(true);
    const res = await admissionWaveService.getAllResult();
    if (res.isSuccess) {
      setWaves(res.getValue()!);
      if (res.getValue()!.length > 0) {
         const w = res.getValue()![0];
         setSelectedWaveId(w.id!);
         setQuota(w.quota.toString());
         setMethod(w.selectionConfig?.method || 'MANUAL');
      }
    }
    setLoading(false);
  };

  const handleWaveChange = (id: string) => {
    setSelectedWaveId(id);
    const w = waves.find(w => w.id === id);
    if (w) {
      setQuota(w.quota.toString());
      setMethod(w.selectionConfig?.method || 'MANUAL');
    }
  };

  const handleSaveConfig = async () => {
    const res = await admissionWaveService.updateResult(selectedWaveId, {
      quota: parseInt(quota) || 0,
      selectionConfig: {
        method,
      }
    });
    if (res.isSuccess) {
       setMessage('Konfigurasi berhasil disimpan');
       setTimeout(() => setMessage(''), 3000);
       fetchWaves();
    }
  };

  const handleRunSelection = async () => {
    if (!user) return;
    if (method !== 'RULE_BASED') {
       setMessage('Metode seleksi saat ini MANUAL. Anda harus memilih pendaftar secara manual melalui tab Daftar Calon Siswa (akan datang).');
       return;
    }
    setRunning(true);
    setMessage('');
    const res = await admissionSelectionService.runRuleBasedSelection(selectedWaveId, user.id);
    setRunning(false);
    if (res.isFailure) {
       setMessage('Gagal: ' + res.getError());
    } else {
       setMessage('Seleksi otomatis berhasil dijalankan!');
    }
  };

  if (loading) return <div className="p-6">Memuat konfigurasi...</div>;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-4xl">
      <div className="flex items-center space-x-2 mb-6">
        <Settings className="w-6 h-6 text-gray-700" />
        <h3 className="text-lg font-bold text-gray-900">Konfigurasi Seleksi</h3>
      </div>

      {message && (
        <div className="mb-6 p-4 bg-blue-50 text-blue-700 rounded-lg flex items-center">
          <CheckCircle2 className="w-5 h-5 mr-2" />
          {message}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Gelombang</label>
          <select 
            value={selectedWaveId} 
            onChange={e => handleWaveChange(e.target.value)}
            className="w-full md:w-1/2 border border-gray-300 rounded-lg p-2.5 outline-none focus:border-blue-500"
          >
            {waves.map(w => (
              <option key={w.id} value={w.id}>{w.name} ({w.academicYear})</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Kuota Penerimaan</label>
            <input 
              type="number" 
              value={quota} 
              onChange={e => setQuota(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Metode Seleksi</label>
            <select 
              value={method} 
              onChange={e => setMethod(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-blue-500"
            >
              <option value="MANUAL">Manual (Satu per satu)</option>
              <option value="RULE_BASED">Rule-Based (Otomatis berdasarkan kriteria)</option>
            </select>
          </div>
        </div>

        <div className="pt-4 flex justify-start space-x-4">
          <button 
            onClick={handleSaveConfig}
            className="px-6 py-2 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 transition-colors"
          >
            Simpan Konfigurasi
          </button>
        </div>
      </div>

      <div className="mt-12 pt-8 border-t border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Jalankan Proses Seleksi</h3>
        <p className="text-sm text-gray-500 mb-6">Proses ini akan menyeleksi semua pendaftar berstatus VERIFIED pada gelombang ini sesuai dengan metode seleksi yang dipilih.</p>
        
        <button 
          onClick={handleRunSelection}
          disabled={running}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50"
        >
          <Play className="w-5 h-5 mr-2" />
          {running ? 'Memproses...' : 'Mulai Seleksi Otomatis'}
        </button>
      </div>
    </div>
  );
}
