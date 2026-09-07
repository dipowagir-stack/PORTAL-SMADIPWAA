import React, { useEffect, useState } from 'react';
import { applicantService } from '../../../domains/admission/services/ApplicantService';
import { admissionWaveService } from '../../../domains/admission/services/AdmissionWaveService';
import { ApplicantStatus } from '../../../domains/admission/entities/Applicant';
import { WaveStatus } from '../../../domains/admission/entities/AdmissionWave';
import { admissionPaymentService } from '../../../domains/admission/services/AdmissionPaymentService';
import { Loader2, Users, FileText, CheckCircle, Clock, AlertCircle, XCircle, Award } from 'lucide-react';
import { getDocs, query, collection, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export default function AdminDashboardTab() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    total: 0,
    draft: 0,
    submitted: 0,
    underReview: 0,
    revisionRequired: 0,
    verified: 0,
    selected: 0,
    waitlisted: 0,
    notSelected: 0,
    enrolled: 0,
    unpaidCount: 0,
    totalQuota: 0,
    remainingQuota: 0
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const [appRes, waveRes] = await Promise.all([
          applicantService.getAllResult(),
          admissionWaveService.getAllResult()
        ]);

        if (appRes.isSuccess && waveRes.isSuccess) {
          const applicants = appRes.getValue() || [];
          const waves = waveRes.getValue() || [];
          
          let draft = 0;
          let submitted = 0;
          let underReview = 0;
          let revisionRequired = 0;
          let verified = 0;
          let selected = 0;
          let waitlisted = 0;
          let notSelected = 0;
          let enrolled = 0;

          applicants.forEach(a => {
            if (a.status === ApplicantStatus.DRAFT) draft++;
            if (a.status === ApplicantStatus.SUBMITTED) submitted++;
            if (a.status === ApplicantStatus.DOCUMENT_REVIEW) underReview++;
            if (a.status === ApplicantStatus.DOCUMENT_REVISION) revisionRequired++;
            if (a.status === ApplicantStatus.VERIFIED) verified++;
            if (a.status === ApplicantStatus.SELECTED) selected++;
            if (a.status === ApplicantStatus.WAITLISTED) waitlisted++;
            if (a.status === ApplicantStatus.NOT_SELECTED) notSelected++;
            if (a.status === ApplicantStatus.ENROLLED) enrolled++;
          });

          // Unpaid count: we can query finance_invoices for 'ADM-' and status = 'unpaid'
          const q = query(collection(db, 'finance_invoices'), where('status', '==', 'unpaid'));
          const snap = await getDocs(q);
          const unpaidInvoices = snap.docs.filter(d => d.data().invoiceNumber?.startsWith('ADM-')).length;

          let totalQuota = 0;
          waves.filter(w => w.status === WaveStatus.OPEN).forEach(w => {
            totalQuota += w.quota;
          });
          
          const remainingQuota = Math.max(0, totalQuota - selected - enrolled);

          setMetrics({
            total: applicants.length,
            draft,
            submitted,
            underReview,
            revisionRequired,
            verified,
            selected,
            waitlisted,
            notSelected,
            enrolled,
            unpaidCount: unpaidInvoices,
            totalQuota,
            remainingQuota
          });
        }
      } catch (err) {
        console.error("Error fetching metrics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, colorClass, bgColorClass }: any) => (
    <div className={`p-6 rounded-xl border border-gray-100 flex items-center shadow-sm ${bgColorClass || 'bg-white'}`}>
      <div className={`p-4 rounded-full mr-4 ${colorClass.replace('text-', 'bg-').replace('500', '100').replace('600', '100')}`}>
        <Icon className={`w-6 h-6 ${colorClass}`} />
      </div>
      <div>
        <h4 className="text-sm font-medium text-gray-500 mb-1">{title}</h4>
        <span className="text-2xl font-bold text-gray-900">{value}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-gray-900">Ringkasan Utama</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Pendaftar" value={metrics.total} icon={Users} colorClass="text-blue-600" />
        <StatCard title="Menunggu Verifikasi" value={metrics.underReview} icon={Clock} colorClass="text-orange-500" />
        <StatCard title="Pembayaran Tertunda" value={metrics.unpaidCount} icon={AlertCircle} colorClass="text-red-500" />
        <StatCard title="Sisa Kuota" value={metrics.remainingQuota} icon={Award} colorClass="text-green-600" />
      </div>

      <h3 className="text-lg font-bold text-gray-900 mt-8 mb-4">Status Pendaftar</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Draft</p>
          <p className="text-xl font-bold text-gray-900">{metrics.draft}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
          <p className="text-xs text-blue-600 font-semibold uppercase mb-1">Submitted</p>
          <p className="text-xl font-bold text-blue-900">{metrics.submitted}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
          <p className="text-xs text-orange-600 font-semibold uppercase mb-1">Review</p>
          <p className="text-xl font-bold text-orange-900">{metrics.underReview}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-xl border border-red-200">
          <p className="text-xs text-red-600 font-semibold uppercase mb-1">Revisi</p>
          <p className="text-xl font-bold text-red-900">{metrics.revisionRequired}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-xl border border-green-200">
          <p className="text-xs text-green-600 font-semibold uppercase mb-1">Verified</p>
          <p className="text-xl font-bold text-green-900">{metrics.verified}</p>
        </div>
      </div>

      <h3 className="text-lg font-bold text-gray-900 mt-8 mb-4">Hasil Seleksi</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
          <p className="text-xs text-emerald-600 font-semibold uppercase mb-1">Lulus Seleksi</p>
          <p className="text-xl font-bold text-emerald-900">{metrics.selected}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
          <p className="text-xs text-yellow-600 font-semibold uppercase mb-1">Daftar Tunggu</p>
          <p className="text-xl font-bold text-yellow-900">{metrics.waitlisted}</p>
        </div>
        <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
          <p className="text-xs text-rose-600 font-semibold uppercase mb-1">Tidak Lulus</p>
          <p className="text-xl font-bold text-rose-900">{metrics.notSelected}</p>
        </div>
        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
          <p className="text-xs text-indigo-600 font-semibold uppercase mb-1">Daftar Ulang</p>
          <p className="text-xl font-bold text-indigo-900">{metrics.enrolled}</p>
        </div>
      </div>
    </div>
  );
}
