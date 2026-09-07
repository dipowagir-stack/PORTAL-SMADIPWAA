import React, { useState, useEffect, useMemo } from 'react';
import { applicantService } from '../../../domains/admission/services/ApplicantService';
import { Applicant, ApplicantStatus } from '../../../domains/admission/entities/Applicant';
import { admissionWaveService } from '../../../domains/admission/services/AdmissionWaveService';
import { AdmissionWave } from '../../../domains/admission/entities/AdmissionWave';
import { Search, Eye, Filter, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import ApplicantDetailModal from './ApplicantDetailModal';

export default function ApplicantListTab() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [waveFilter, setWaveFilter] = useState('');
  const [waves, setWaves] = useState<AdmissionWave[]>([]);
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(null);
  
  // Sorting
  const [sortField, setSortField] = useState<'createdAt' | 'fullName' | 'registrationNumber'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchData = async () => {
    setLoading(true);
    const [appRes, waveRes] = await Promise.all([
      applicantService.getAllResult(),
      admissionWaveService.getAllResult()
    ]);
    if (appRes.isSuccess) setApplicants(appRes.getValue()!);
    if (waveRes.isSuccess) setWaves(waveRes.getValue()!);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSort = (field: 'createdAt' | 'fullName' | 'registrationNumber') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    let result = applicants.filter(a => {
      if (statusFilter && a.status !== statusFilter) return false;
      if (waveFilter && a.waveId !== waveFilter) return false;
      if (search && !a.fullName.toLowerCase().includes(search.toLowerCase()) && !a.registrationNumber?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    result = result.sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';
      
      if (sortField === 'createdAt') {
        valA = a.createdAt;
        valB = b.createdAt;
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB as string).toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [applicants, search, statusFilter, waveFilter, sortField, sortDirection]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);
  const paginatedData = filteredAndSorted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, waveFilter]);

  const getWaveName = (waveId: string) => {
    return waves.find(w => w.id === waveId)?.name || 'Unknown Wave';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="relative w-full md:w-72">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama / no registrasi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
            <div className="flex items-center w-full sm:w-auto bg-white border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
              <div className="pl-3 py-2 bg-gray-50 border-r border-gray-200">
                <Filter className="w-4 h-4 text-gray-500" />
              </div>
              <select
                value={waveFilter}
                onChange={(e) => setWaveFilter(e.target.value)}
                className="w-full sm:w-40 p-2 outline-none text-sm bg-transparent"
              >
                <option value="">Semua Gelombang</option>
                {waves.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-48 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
            >
              <option value="">Semua Status</option>
              {Object.values(ApplicantStatus).map(status => (
                <option key={status} value={status}>{status.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('registrationNumber')}>
                <div className="flex items-center">No. Registrasi <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" /></div>
              </th>
              <th className="px-6 py-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('fullName')}>
                <div className="flex items-center">Nama Calon Siswa <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" /></div>
              </th>
              <th className="px-6 py-4 font-semibold text-gray-600">Gelombang</th>
              <th className="px-6 py-4 font-semibold text-gray-600">Status Utama</th>
              <th className="px-6 py-4 font-semibold text-gray-600">Daftar Ulang</th>
              <th className="px-6 py-4 font-semibold text-gray-600 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    Memuat data...
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-500 bg-gray-50/50">
                  <div className="flex flex-col items-center justify-center">
                    <Search className="w-10 h-10 text-gray-300 mb-3" />
                    <p className="text-gray-900 font-medium">Tidak ada data pendaftar ditemukan.</p>
                    <p className="text-sm text-gray-500 mt-1">Coba sesuaikan filter atau kata kunci pencarian Anda.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((a) => (
                <tr key={a.id} className="hover:bg-blue-50/50 transition-colors group">
                  <td className="px-6 py-4 font-mono font-medium text-blue-700">{a.registrationNumber || <span className="text-gray-400 italic">Draft</span>}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{a.fullName}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{a.schoolOrigin || '-'}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {getWaveName(a.waveId)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                      ['VERIFIED', 'SELECTED', 'ENROLLED'].includes(a.status) ? 'bg-green-100 text-green-800 border border-green-200' :
                      ['REJECTED', 'NOT_SELECTED'].includes(a.status) ? 'bg-red-100 text-red-800 border border-red-200' :
                      ['DOCUMENT_REVISION', 'WAITLISTED'].includes(a.status) ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                      ['SUBMITTED', 'DOCUMENT_REVIEW'].includes(a.status) ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                      'bg-gray-100 text-gray-800 border border-gray-200'
                    }`}>
                      {a.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {a.status === 'SELECTED' || a.status === 'ENROLLED' ? (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        a.reRegistrationStatus === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                        a.reRegistrationStatus === 'EXPIRED' ? 'bg-red-100 text-red-800' :
                        a.reRegistrationStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {a.reRegistrationStatus || '-'}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => setSelectedApplicantId(a.id!)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      title="Lihat Detail"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {!loading && filteredAndSorted.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Menampilkan <span className="font-medium text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> hingga <span className="font-medium text-gray-900">{Math.min(currentPage * itemsPerPage, filteredAndSorted.length)}</span> dari <span className="font-medium text-gray-900">{filteredAndSorted.length}</span> pendaftar
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-lg border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-gray-700 px-2">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-lg border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {selectedApplicantId && (
        <ApplicantDetailModal
          applicantId={selectedApplicantId}
          onClose={() => setSelectedApplicantId(null)}
          onUpdate={() => fetchData()}
        />
      )}
    </div>
  );
}
