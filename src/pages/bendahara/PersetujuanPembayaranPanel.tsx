import React, { useState, useEffect } from 'react';
import { getPendingPaymentsResult, updatePaymentResult } from '../../domains/finance/services';
import { CheckCircle, XCircle, Search, Clock, Printer } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function PersetujuanPembayaranPanel() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await getPendingPaymentsResult();
      if (res.isSuccess) {
        setPayments(res.getValue());
      } else {
        setPayments([]);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Setujui pembayaran ini? Pastikan Anda sudah menerima uang tunai.')) return;
    try {
      const date = new Date();
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      const transactionId = `TRX-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-${randomPart}`;

      await updatePaymentResult(id, { status: 'approved', recordedBy: profile?.name || 'Bendahara', transactionId });
      setPayments(payments.map(p => p.id === id ? { ...p, status: 'approved', recordedBy: profile?.name || 'Bendahara', transactionId } : p));
    } catch (error) {
      console.error('Error approving payment:', error);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Tolak pengajuan pembayaran ini?')) return;
    try {
      await updatePaymentResult(id, { status: 'rejected' });
      setPayments(payments.map(p => p.id === id ? { ...p, status: 'rejected' } : p));
    } catch (error) {
      console.error('Error rejecting payment:', error);
    }
  };

  const handlePrint = (payment: any) => {
    // Generate a simple print layout for thermal printer 5x7 cm
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const html = `
      <html>
        <head>
          <title>Struk Pembayaran</title>
          <style>
            @page {
              size: 50mm 70mm;
              margin: 0;
            }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              margin: 0; 
              padding: 2mm; 
              width: 46mm; 
              color: black;
              font-size: 10px;
              box-sizing: border-box;
            }
            .header { text-align: center; margin-bottom: 3px; border-bottom: 1px dashed black; padding-bottom: 3px; }
            .header h3 { margin: 0 0 2px 0; font-size: 11px; font-weight: bold; }
            .header p { margin: 0; font-size: 8px; }
            .content { margin-bottom: 3px; }
            .item { display: flex; justify-content: space-between; margin-bottom: 2px; }
            .item-col { display: flex; flex-direction: column; margin-bottom: 2px; }
            .total { font-weight: bold; font-size: 10px; border-top: 1px dashed black; padding-top: 3px; margin-top: 3px; }
            .footer { text-align: center; margin-top: 5px; font-size: 8px; border-top: 1px dashed black; padding-top: 3px; }
            .footer p { margin: 1px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h3>BUKTI PEMBAYARAN</h3>
            <p>${payment.transactionId || 'TRX-MANUAL'}</p>
            <p>${payment.createdAt?.toMillis ? new Date(payment.createdAt.toMillis()).toLocaleString('id-ID') : new Date().toLocaleString('id-ID')}</p>
          </div>
          <div class="content">
            <div class="item"><span>Siswa:</span> <span>${payment.studentName?.substring(0, 15) || '-'}</span></div>
            <div class="item"><span>NISN:</span> <span>${payment.nisn || '-'}</span></div>
            <div class="item"><span>Kelas:</span> <span>${payment.studentClass || '-'}</span></div>
            <div class="item-col">
              <span>Tagihan:</span> 
              <span style="text-align: right;">${payment.billingEventTitle || 'Tagihan'} ${payment.month ? '(' + payment.month + ')' : ''}</span>
            </div>
            <div class="item total"><span>Total:</span> <span>Rp ${payment.amount?.toLocaleString('id-ID')}</span></div>
          </div>
          <div class="footer">
            <p>Kasir: ${payment.recordedBy?.substring(0, 15) || 'Bendahara'}</p>
            <p>Terima Kasih</p>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const filteredPayments = payments.filter(p => 
    p.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.nisn?.includes(searchTerm) ||
    p.billingEventTitle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-gray-900">Persetujuan & Cetak Struk</h3>
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Cari siswa, NISN, atau tagihan..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-10 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Tanggal</th>
                <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Siswa</th>
                <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Tagihan</th>
                <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Nominal</th>
                <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500">
                    {payment.createdAt?.toMillis ? new Date(payment.createdAt.toMillis()).toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-gray-900">{payment.studentName}</div>
                    <div className="text-xs text-gray-500">Kelas: {payment.studentClass} • NISN: {payment.nisn}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    <div className="font-medium">{payment.billingEventTitle || 'Tagihan (Legacy)'}</div>
                    {payment.month && (
                      <div className="text-xs text-blue-600 font-medium mt-0.5 bg-blue-50 inline-block px-2 py-0.5 rounded">Bulan {payment.month} {payment.year || ''}</div>
                    )}
                    {payment.isInstallment && (
                      <div className="text-xs text-orange-600 font-medium mt-0.5 bg-orange-50 inline-block px-2 py-0.5 rounded border border-orange-200">Cicilan</div>
                    )}
                    {payment.months && payment.months.length > 0 && (
                      <div className="text-xs text-gray-500 mt-0.5">Bulan: {payment.months.join(', ')}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-900">
                    Rp {payment.amount?.toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${
                      payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                      payment.status === 'approved' ? 'bg-green-100 text-green-800' : 
                      'bg-red-100 text-red-800'
                    }`}>
                      {payment.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                      {payment.status === 'pending' ? 'Menunggu' : 
                       payment.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {payment.status === 'pending' ? (
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => handleApprove(payment.id)}
                          className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                          title="Setujui"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleReject(payment.id)}
                          className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                          title="Tolak"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    ) : payment.status === 'approved' ? (
                      <button 
                        onClick={() => handlePrint(payment)}
                        className="px-3 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors text-xs flex items-center inline-flex"
                      >
                        <Printer className="w-4 h-4 mr-1" /> Cetak
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Selesai</span>
                    )}
                  </td>
                </tr>
              ))}
              
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                    Tidak ada data pembayaran.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
