import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTenant } from '../../../foundation/tenant/TenantContext';
import { usePeriod } from '../../../contexts/PeriodContext';
import { SupervisionRepositoryImpl } from '../../../domains/supervision/repositories/SupervisionRepositoryImpl';
import { SupervisionFollowUpRepositoryImpl } from '../../../domains/supervision/repositories/SupervisionFollowUpRepositoryImpl';
import { SupervisionSession } from '../../../domains/supervision/models/SupervisionSession';
import { SupervisionReportingService, SupervisionDashboardSummary } from '../../../domains/supervision/services/SupervisionReportingService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { ShieldAlert, CheckCircle, Clock, Search, BookOpen, AlertCircle, Eye, FileText, CheckCircle2, Download, BarChart2 } from 'lucide-react';
import SupervisionDetailModal from './SupervisionDetailModal';

export default function SupervisorDashboardTab() {
  const { profile, hasPermission } = useAuth();
  const { tenant } = useTenant();
  const { activeYear, activeSemester } = usePeriod();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'list'>('dashboard');

  const [supervisions, setSupervisions] = useState<SupervisionSession[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [selectedSupervision, setSelectedSupervision] = useState<SupervisionSession | null>(null);

  const [summary, setSummary] = useState<SupervisionDashboardSummary | null>(null);

  const supervisionRepo = new SupervisionRepositoryImpl();
  const followUpRepo = new SupervisionFollowUpRepositoryImpl();
  const reportingService = new SupervisionReportingService(supervisionRepo, followUpRepo);

  const loadData = async () => {
    if (!profile?.uid || !tenant?.id) return;
    if (!activeYear || !activeSemester) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const supervisorId = hasPermission('supervision:manage') ? undefined : profile.uid;
      
      const summaryResult = await reportingService.getDashboardSummary({
        tenantId: tenant.id,
        academicYearId: activeYear.id,
        semesterId: activeSemester.id,
        supervisorId
      });

      if (summaryResult.isSuccess) {
        setSummary(summaryResult.getValue()!);
      }

      // 1. Get supervisions for the list
      let sessions = await supervisionRepo.findByPeriod(tenant.id, activeYear.id, activeSemester.id);
      
      // Filter by scope
      if (supervisorId) {
        sessions = sessions.filter(s => s.props.principalId === supervisorId);
      }
      
      setSupervisions(sessions);

      // 2. Load teachers details
      const teacherIds = [...new Set(sessions.map(s => s.props.teacherId))];
      if (teacherIds.length > 0) {
        const teacherDocs: any[] = [];
        for (let i = 0; i < teacherIds.length; i += 10) {
          const chunk = teacherIds.slice(i, i + 10);
          const q = query(collection(db, 'users'), where('uid', 'in', chunk));
          const snap = await getDocs(q);
          snap.docs.forEach(d => teacherDocs.push(d.data()));
        }
        setTeachers(teacherDocs);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile?.uid, tenant?.id, activeYear, activeSemester]);

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    if (!tenant?.id || !activeYear || !activeSemester) return;
    try {
      const supervisorId = hasPermission('supervision:manage') ? undefined : profile?.uid;
      await reportingService.exportReport({
        tenantId: tenant.id,
        academicYearId: activeYear.id,
        semesterId: activeSemester.id,
        supervisorId
      }, format);
    } catch (error) {
      console.error('Export failed', error);
      alert('Gagal mengekspor laporan.');
    }
  };

  if (loading) {
     return <div className="p-8 text-center"><div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent mx-auto"></div></div>;
  }

  if (!activeYear || !activeSemester) {
     return (
       <div className="p-8 text-center text-gray-500">
         <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
         <h3 className="text-lg font-medium text-gray-900 mb-1">Periode Aktif Belum Diatur</h3>
         <p>Silakan atur tahun ajaran dan semester aktif terlebih dahulu.</p>
       </div>
     );
  }

  const getTeacherName = (id: string) => teachers.find(t => t.uid === id)?.name || 'Unknown Teacher';

  const filteredSessions = supervisions.filter(s => {
    if (statusFilter !== 'ALL' && s.props.status.value !== statusFilter) return false;
    if (search) {
       const q = search.toLowerCase();
       const teacherName = getTeacherName(s.props.teacherId).toLowerCase();
       if (!teacherName.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 mt-6">
      
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'dashboard' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <BarChart2 className="inline-block w-4 h-4 mr-2" />
          Dashboard & Laporan
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'list' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <BookOpen className="inline-block w-4 h-4 mr-2" />
          Daftar Supervisi
        </button>
      </div>

      {activeTab === 'dashboard' && summary && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Ringkasan Supervisi Administrasi</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => handleExport('pdf')} className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                <FileText className="w-4 h-4 mr-2" /> PDF
              </button>
              <button onClick={() => handleExport('excel')} className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                <FileText className="w-4 h-4 mr-2" /> Excel
              </button>
              <button onClick={() => handleExport('csv')} className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                <Download className="w-4 h-4 mr-2" /> CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <StatCard title="Total" value={summary.overview.total} />
            <StatCard title="Jadwal" value={summary.overview.scheduled} />
            <StatCard title="Submit" value={summary.overview.submitted} highlight />
            <StatCard title="Review" value={summary.overview.underReview} highlight />
            <StatCard title="Revisi" value={summary.overview.revisionRequired} alert />
            <StatCard title="Resubmit" value={summary.overview.resubmitted} highlight />
            <StatCard title="Selesai" value={summary.overview.completed} success />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h4 className="text-base font-semibold text-gray-900 mb-4">Ringkasan Nilai</h4>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Rata-rata</p>
                  <p className="text-2xl font-bold text-blue-700">{summary.score.average.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Tertinggi</p>
                  <p className="text-2xl font-bold text-green-600">{summary.score.highest}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Terendah</p>
                  <p className="text-2xl font-bold text-red-600">{summary.score.lowest === 100 && summary.overview.completed === 0 ? 0 : summary.score.lowest}%</p>
                </div>
              </div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">Distribusi Kategori</h5>
              <div className="space-y-2">
                {Object.entries(summary.score.categoryDistribution).length > 0 ? (
                  Object.entries(summary.score.categoryDistribution).map(([cat, count]) => (
                    <div key={cat} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">{cat}</span>
                      <span className="font-medium">{count} Guru</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic">Belum ada data kategori nilai</p>
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h4 className="text-base font-semibold text-gray-900 mb-4">Tindak Lanjut (Follow-up)</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard title="Total" value={summary.followUp.total} size="small" />
                <StatCard title="Open" value={summary.followUp.open} size="small" highlight />
                <StatCard title="In Progress" value={summary.followUp.inProgress} size="small" highlight />
                <StatCard title="Selesai" value={summary.followUp.completed} size="small" success />
                <StatCard title="Overdue" value={summary.followUp.overdue} size="small" alert />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h4 className="font-semibold text-gray-900">Performa Guru</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Guru</th>
                    <th className="px-5 py-3 font-semibold text-center">Supervisi</th>
                    <th className="px-5 py-3 font-semibold text-center">Status Terakhir</th>
                    <th className="px-5 py-3 font-semibold text-center">Nilai (%)</th>
                    <th className="px-5 py-3 font-semibold">Rekomendasi</th>
                    <th className="px-5 py-3 font-semibold text-center">Tindak Lanjut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {summary.teacherPerformance.length > 0 ? summary.teacherPerformance.map(t => (
                    <tr key={t.teacherId} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900">{getTeacherName(t.teacherId)}</td>
                      <td className="px-5 py-3 text-center">{t.supervisionCount}</td>
                      <td className="px-5 py-3 text-center"><StatusBadge status={t.latestStatus} /></td>
                      <td className="px-5 py-3 text-center font-medium {t.latestScore ? 'text-gray-900' : 'text-gray-400'}">
                        {t.latestScore != null ? t.latestScore.toFixed(1) : '-'}
                      </td>
                      <td className="px-5 py-3 text-gray-700">
                        {t.recommendation === 'CONTINUE' ? 'Lanjutkan' 
                          : t.recommendation === 'IMPROVEMENT_REQUIRED' ? 'Perlu Peningkatan'
                          : t.recommendation === 'FOLLOW_UP_REQUIRED' ? 'Perlu Tindak Lanjut'
                          : '-'}
                      </td>
                      <td className="px-5 py-3 text-center">
                         {t.followUpStatus === 'OVERDUE' ? <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded">OVERDUE</span>
                          : t.followUpStatus === 'OPEN' || t.followUpStatus === 'IN_PROGRESS' ? <span className="text-xs font-bold text-yellow-700 bg-yellow-100 px-2 py-1 rounded">AKTIF</span>
                          : <span className="text-gray-400">-</span>}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-gray-500">
                        Tidak ada data performa guru.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'list' && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="text-lg font-bold text-gray-900">Daftar Supervisi Guru</h3>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Cari guru..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <select 
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">Semua Status</option>
                <option value="SUBMITTED">Baru Submit</option>
                <option value="RESUBMITTED">Resubmit</option>
                <option value="UNDER_REVIEW">Sedang Review</option>
                <option value="REVISION_REQUIRED">Perlu Revisi</option>
                <option value="COMPLETED">Selesai</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-semibold rounded-tl-lg">Guru</th>
                  <th className="px-4 py-3 font-semibold">Tipe Supervisi</th>
                  <th className="px-4 py-3 font-semibold">Tanggal Jadwal</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                  <th className="px-4 py-3 font-semibold text-center rounded-tr-lg">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSessions.length > 0 ? filteredSessions.map(session => (
                  <tr key={session.props.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {getTeacherName(session.props.teacherId)}
                    </td>
                    <td className="px-4 py-3">
                      {session.props.type.value === 'ADMINISTRATION' ? 'Administrasi' : 'KBM'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(session.props.scheduledDate).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={session.props.status.value} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => setSelectedSupervision(session)}
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium bg-blue-50 px-3 py-1.5 rounded-lg"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Review
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Tidak ada data supervisi yang sesuai filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedSupervision && (
        <SupervisionDetailModal 
          supervision={selectedSupervision}
          teacherName={getTeacherName(selectedSupervision.props.teacherId)}
          onClose={() => setSelectedSupervision(null)}
          onUpdate={loadData}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, highlight, success, alert, size = 'default' }: any) {
  const isSmall = size === 'small';
  return (
    <div className={`rounded-xl border ${highlight ? 'bg-blue-50 border-blue-100' : success ? 'bg-emerald-50 border-emerald-100' : alert ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'} ${isSmall ? 'p-3' : 'p-4'}`}>
      <p className={`text-gray-500 font-medium uppercase tracking-wider mb-1 ${isSmall ? 'text-[10px]' : 'text-xs'}`}>{title}</p>
      <p className={`font-bold ${highlight ? 'text-blue-700' : success ? 'text-emerald-700' : alert ? 'text-red-700' : 'text-gray-900'} ${isSmall ? 'text-xl' : 'text-2xl'}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string, label: string }> = {
    'DRAFT': { color: 'bg-gray-100 text-gray-700', label: 'Belum Dimulai' },
    'SCHEDULED': { color: 'bg-gray-100 text-gray-700', label: 'Terjadwal' },
    'SUBMITTED': { color: 'bg-indigo-100 text-indigo-700', label: 'Baru Submit' },
    'UNDER_REVIEW': { color: 'bg-yellow-100 text-yellow-700', label: 'Sedang Diperiksa' },
    'REVISION_REQUIRED': { color: 'bg-red-100 text-red-700', label: 'Perlu Revisi' },
    'RESUBMITTED': { color: 'bg-indigo-100 text-indigo-700', label: 'Resubmit' },
    'COMPLETED': { color: 'bg-green-100 text-green-700', label: 'Selesai' },
    'CANCELLED': { color: 'bg-gray-100 text-gray-500', label: 'Batal' },
  };
  const config = map[status] || { color: 'bg-gray-100 text-gray-700', label: status };
  return <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${config.color}`}>{config.label}</span>;
}
