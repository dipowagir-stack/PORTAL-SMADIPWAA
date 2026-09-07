import React, { useState } from 'react';
import { CreditCard, History, CheckSquare, FileText, ClipboardList, Calendar } from 'lucide-react';
import MasterTagihanPanel from './MasterTagihanPanel';
import PersetujuanPembayaranPanel from './PersetujuanPembayaranPanel';
import RiwayatPembayaranPanel from './RiwayatPembayaranPanel';
import LaporanTunggakanPanel from './LaporanTunggakanPanel';
import FinancePeriodPanel from './FinancePeriodPanel';

export default function BendaharaDashboard() {
  const [activeTab, setActiveTab] = useState<'persetujuan' | 'riwayat' | 'master' | 'laporan' | 'period'>('persetujuan');

  const tabs = [
    { id: 'persetujuan', label: 'Persetujuan Pembayaran', icon: CheckSquare },
    { id: 'riwayat', label: 'Riwayat Pembayaran', icon: History },
    { id: 'master', label: 'Master Tagihan', icon: ClipboardList },
    { id: 'laporan', label: 'Laporan Tunggakan', icon: FileText },
    { id: 'period', label: 'Periode Keuangan', icon: Calendar },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <CreditCard className="w-32 h-32" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-2">
            <span className="bg-teal-100 text-teal-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Bendahara / Kasir</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manajemen Keuangan</h1>
          <p className="text-gray-500 max-w-2xl">Kelola persetujuan tagihan dari siswa, kelola master tagihan, dan pantau rekap tunggakan siswa.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto hide-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-5 h-5 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'persetujuan' && <PersetujuanPembayaranPanel />}
          {activeTab === 'riwayat' && <RiwayatPembayaranPanel />}
          {activeTab === 'master' && <MasterTagihanPanel />}
          {activeTab === 'laporan' && <LaporanTunggakanPanel />}
          {activeTab === 'period' && <FinancePeriodPanel />}
        </div>
      </div>
    </div>
  );
}
