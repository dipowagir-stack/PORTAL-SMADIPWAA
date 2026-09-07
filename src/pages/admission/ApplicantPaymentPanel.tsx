import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { admissionPaymentService } from '../../domains/admission/services/AdmissionPaymentService';
import { FinanceInvoice, FinancePayment } from '../../domains/finance/types';
import { Loader2, CreditCard, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export default function ApplicantPaymentPanel({ applicantId }: { applicantId: string }) {
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<FinanceInvoice | null>(null);
  const [payments, setPayments] = useState<FinancePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, payRes] = await Promise.all([
        admissionPaymentService.getApplicantInvoice(applicantId),
        admissionPaymentService.getApplicantPayments(applicantId)
      ]);

      if (invRes.isSuccess) setInvoice(invRes.getValue());
      if (payRes.isSuccess) setPayments(payRes.getValue());
    } catch (e: any) {
      setError('Gagal memuat informasi pembayaran');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [applicantId]);

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="mt-8 border border-gray-100 rounded-xl p-6 bg-white flex flex-col items-center justify-center text-center">
        <div className="bg-gray-100 p-3 rounded-full mb-4">
          <CreditCard className="w-8 h-8 text-gray-400" />
        </div>
        <h4 className="font-semibold text-gray-900 mb-2">Belum Ada Tagihan</h4>
        <p className="text-gray-500 text-sm max-w-sm">
          Tagihan pendaftaran belum diterbitkan. Silakan cek kembali beberapa saat lagi atau hubungi panitia PPDB.
        </p>
      </div>
    );
  }

  const isPaid = invoice.status === 'paid';
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  return (
    <div className="mt-8 space-y-6">
      <div className="border border-gray-100 rounded-xl bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h4 className="font-semibold text-gray-900 flex items-center">
            <CreditCard className="w-5 h-5 mr-2 text-gray-400" />
            Tagihan Pembayaran Pendaftaran
          </h4>
          <span className={`px-3 py-1 text-xs font-medium rounded-full \${isPaid ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
            {isPaid ? 'Lunas' : 'Belum Lunas'}
          </span>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              {error}
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div className="space-y-4 flex-1">
              <div>
                <p className="text-sm text-gray-500 mb-1">Nomor Tagihan</p>
                <p className="font-medium text-gray-900">{invoice.invoiceNumber}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Tanggal Terbit</p>
                  <p className="font-medium text-gray-900">{new Date(invoice.issuedDate).toLocaleDateString('id-ID')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Jatuh Tempo</p>
                  <p className="font-medium text-red-600">{new Date(invoice.dueDate).toLocaleDateString('id-ID')}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 md:w-1/3 flex flex-col justify-center">
              <p className="text-sm text-gray-500 mb-1 text-center">Total Tagihan</p>
              <p className="text-2xl font-bold text-gray-900 text-center">{formatCurrency(invoice.totalAmount)}</p>
            </div>
          </div>

          {!isPaid && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h5 className="font-medium text-gray-900 mb-4">Metode Pembayaran Transfer:</h5>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-blue-900">Bank BSI (Bank Syariah Indonesia)</span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">Virtual Account</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-blue-800">Nomor Rekening / VA:</p>
                  <p className="font-mono font-bold text-lg text-blue-900 tracking-wider">701 234 5678</p>
                </div>
                <p className="text-xs text-blue-600 mt-3 pt-3 border-t border-blue-200">
                  A.n. PPDB Yayasan EduOS. Setelah melakukan transfer, simpan bukti pembayaran.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {payments.length > 0 && (
        <div className="border border-gray-100 rounded-xl bg-white p-6">
          <h4 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Riwayat Pembayaran</h4>
          <div className="space-y-3">
            {payments.map(payment => (
              <div key={payment.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg mr-3 \${payment.status === 'verified' ? 'bg-green-50 text-green-600' : payment.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                    {payment.status === 'verified' ? <CheckCircle className="w-5 h-5" /> : payment.status === 'rejected' ? <AlertCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{formatCurrency(payment.amount)}</p>
                    <p className="text-xs text-gray-500">{new Date(payment.paymentDate).toLocaleDateString('id-ID')} • {payment.method}</p>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded uppercase \${payment.status === 'verified' ? 'bg-green-100 text-green-800' : payment.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}`}>
                  {payment.status === 'verified' ? 'Diterima' : payment.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
