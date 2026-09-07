import React, { useState, useEffect } from 'react';
import { getRecentPaymentsResult } from '../../domains/finance/services';
import { Search } from 'lucide-react';

export default function RiwayatPembayaranPanel() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await getRecentPaymentsResult();
      if (res.isSuccess) {
        setPayments(res.getValue());
      } else {
        setPayments([]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = payments.filter(p => 
    p.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.nisn?.includes(searchTerm) ||
    p.billingEventTitle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Riwayat Pembayaran Terbaru</h2>
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Cari transaksi..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Siswa</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tagihan</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nominal</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Metode</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kasir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    Tidak ada data transaksi.
                  </td>
                </tr>
              ) : null}
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-500">
                    {p.createdAt ? new Date(p.createdAt.toMillis()).toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{p.studentName}</div>
                    <div className="text-xs text-gray-500">{p.studentClass} • {p.nisn}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{p.billingEventTitle || 'Tagihan (Legacy)'}</div>
                    {p.month && (
                      <div className="text-xs text-blue-600 font-medium mt-0.5 bg-blue-50 inline-block px-2 py-0.5 rounded">Bulan {p.month} {p.year || ''}</div>
                    )}
                    {p.isInstallment && (
                      <div className="text-xs text-orange-600 font-medium mt-0.5 bg-orange-50 inline-block px-2 py-0.5 rounded border border-orange-200">Cicilan</div>
                    )}
                    {p.months && p.months.length > 0 && (
                      <div className="text-xs text-gray-500 mt-0.5">Bulan: {p.months.join(', ')}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-bold text-teal-600">Rp {p.amount.toLocaleString('id-ID')}</td>
                  <td className="px-6 py-4 uppercase text-xs font-bold text-gray-500">{p.method}</td>
                  <td className="px-6 py-4 text-gray-500">{p.recordedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
