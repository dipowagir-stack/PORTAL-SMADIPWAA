import React, { useState, useEffect } from 'react';
import { PermissionGuard } from '../../../components/PermissionGuard';
import ApplicantListTab from './ApplicantListTab';
import SelectionConfigTab from './SelectionConfigTab';
import AdminDashboardTab from './AdminDashboardTab';

export default function AdmissionAdminPanel() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'list' | 'selection'>('dashboard');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard PPDB (Panitia)</h2>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'dashboard'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Ringkasan
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'list'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Daftar Calon Siswa
          </button>
          <PermissionGuard permission="admission:select">
            <button
              onClick={() => setActiveTab('selection')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'selection'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Konfigurasi & Seleksi
            </button>
          </PermissionGuard>
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'dashboard' && <AdminDashboardTab />}
        {activeTab === 'list' && <ApplicantListTab />}
        {activeTab === 'selection' && (
          <PermissionGuard permission="admission:select" fallback={<div>Akses Ditolak</div>}>
            <SelectionConfigTab />
          </PermissionGuard>
        )}
      </div>
    </div>
  );
}
