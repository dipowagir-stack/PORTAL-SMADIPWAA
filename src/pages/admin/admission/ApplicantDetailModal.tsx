import React, { useState, useEffect } from 'react';
import { applicantService } from '../../../domains/admission/services/ApplicantService';
import { admissionDocumentService } from '../../../domains/admission/services/AdmissionDocumentService';
import { admissionPaymentService } from '../../../domains/admission/services/AdmissionPaymentService';
import { admissionVerificationService } from '../../../domains/admission/services/AdmissionVerificationService';
import { admissionSelectionService } from '../../../domains/admission/services/AdmissionSelectionService';
import { admissionAuditService } from '../../../domains/admission/services/AdmissionAuditService';
import { admissionConversionService } from '../../../domains/admission/services/AdmissionConversionService';
import { Applicant } from '../../../domains/admission/entities/Applicant';
import { AdmissionAudit } from '../../../domains/admission/entities/AdmissionAudit';
import { DocumentItem } from '../../../domains/document/types';
import { FinanceInvoice, FinancePayment } from '../../../domains/finance/types';
import { useAuth } from '../../../contexts/AuthContext';
import { X, CheckCircle, AlertCircle, Eye, FileText, DollarSign, Clock, Download, ChevronRight, Award, Activity } from 'lucide-react';
import { PermissionGuard } from '../../../components/PermissionGuard';

export default function ApplicantDetailModal({ applicantId, onClose, onUpdate }: { applicantId: string, onClose: () => void, onUpdate: () => void }) {
  const { user } = useAuth();
  const [applicant, setApplicant] = useState<Applicant | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [invoice, setInvoice] = useState<FinanceInvoice | null>(null);
  const [payments, setPayments] = useState<FinancePayment[]>([]);
  const [audits, setAudits] = useState<AdmissionAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'registration' | 'docs' | 'payment' | 'verification' | 'selection' | 'conversion' | 'audit'>('profile');
  const [notes, setNotes] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [isConverted, setIsConverted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchDetail();
  }, [applicantId]);

  const fetchDetail = async () => {
    setLoading(true);
    const [appRes, docRes, invRes, payRes, auditRes] = await Promise.all([
      applicantService.getById(applicantId),
      admissionDocumentService.getDocumentsForApplicant(applicantId),
      admissionPaymentService.getApplicantInvoice(applicantId),
      admissionPaymentService.getApplicantPayments(applicantId),
      admissionAuditService.getByApplicant(applicantId)
    ]);
    if (appRes) {
      setApplicant(appRes);
      if (appRes.createdBy) {
        import('../../../domains/academic/services').then(({ usersService }) => {
          usersService.getByIdResult(appRes.createdBy).then(u => {
            if (u.isSuccess && u.getValue()?.conversionCompleted) {
              setIsConverted(true);
            }
          });
        });
      }
    }
    if (docRes.isSuccess) setDocuments(docRes.getValue()!);
    if (invRes.isSuccess) setInvoice(invRes.getValue()!);
    if (payRes.isSuccess) setPayments(payRes.getValue()!);
    if (auditRes.isSuccess) setAudits(auditRes.getValue()!.sort((a, b) => b.timestamp - a.timestamp));
    setLoading(false);
  };


  const handleVerify = async () => {
    if (!user) return;
    setVerifying(true);
    setErrorMsg('');
    const res = await admissionVerificationService.verifyApplicant(applicantId, user.id, notes);
    setVerifying(false);
    if (res.isFailure) {
      setErrorMsg(res.getError()!);
    } else {
      onUpdate();
      fetchDetail();
    }
  };

  const handleRevision = async () => {
    if (!user) return;
    if (!notes) {
      setErrorMsg('Alasan perbaikan wajib diisi');
      return;
    }
    setVerifying(true);
    setErrorMsg('');
    const res = await admissionVerificationService.requestRevision(applicantId, user.id, notes);
    setVerifying(false);
    if (res.isFailure) {
      setErrorMsg(res.getError()!);
    } else {
      onUpdate();
      fetchDetail();
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-xl flex items-center space-x-3 shadow-xl">
           <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
           <span className="font-medium text-gray-700">Memuat data...</span>
        </div>
      </div>
    );
  }

  if (!applicant) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{applicant.fullName}</h2>
              <span className={`px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-md ${
                ['VERIFIED', 'SELECTED', 'ENROLLED'].includes(applicant.status) ? 'bg-green-100 text-green-800' :
                ['REJECTED', 'NOT_SELECTED'].includes(applicant.status) ? 'bg-red-100 text-red-800' :
                ['DOCUMENT_REVISION', 'WAITLISTED'].includes(applicant.status) ? 'bg-orange-100 text-orange-800' :
                ['SUBMITTED', 'DOCUMENT_REVIEW'].includes(applicant.status) ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {applicant.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-gray-500 font-mono">{applicant.registrationNumber || 'Draft'}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><X className="w-6 h-6"/></button>
        </div>

        <div className="border-b border-gray-200 px-6 overflow-x-auto">
          <nav className="-mb-px flex space-x-6">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'profile' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Data Pribadi
            </button>
            <button
              onClick={() => setActiveTab('registration')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'registration' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Registrasi & Sekolah
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center transition-colors ${activeTab === 'docs' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Dokumen <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${activeTab === 'docs' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{documents.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('payment')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'payment' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Pembayaran
            </button>
            <button
              onClick={() => setActiveTab('verification')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'verification' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Verifikasi
            </button>
            <button
              onClick={() => setActiveTab('selection')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'selection' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Seleksi
            </button>
            <button
              onClick={() => setActiveTab('conversion')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors flex items-center ${activeTab === 'conversion' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Konversi Siswa
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors flex items-center ${activeTab === 'audit' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Aktivitas
            </button>
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-start border border-red-100 shadow-sm">
              <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-sm font-medium">{errorMsg}</p>
            </div>
          )}

          {activeTab === 'conversion' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-4">Konversi Siswa</h3>
                
                <PermissionGuard permission="admission:enroll" fallback={<div className="bg-gray-50 p-4 rounded-xl text-gray-500 text-center border border-gray-200">Anda tidak memiliki izin untuk mengkonversi siswa.</div>}>
                {isConverted ? (
                  <div className="bg-green-50 p-6 rounded-xl text-center border border-green-200">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <h4 className="text-lg font-bold text-green-900">Siswa Aktif</h4>
                    <p className="text-green-700 mt-2">Pendaftar ini telah berhasil dikonversi menjadi siswa aktif.</p>
                  </div>
                ) : (applicant.status === 'ENROLLED' && applicant.reRegistrationStatus === 'COMPLETED') ? (
                  <div>
                    <div className="bg-blue-50 p-4 rounded-xl flex items-start border border-blue-200 mb-6">
                      <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-blue-900">Siap Dikonversi</h4>
                        <p className="text-blue-800 text-sm mt-1">
                          Pendaftar telah menyelesaikan daftar ulang dan siap dikonversi menjadi data siswa aktif pada sistem sekolah.
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={async () => {
                        if (!user) return;
                        if (!window.confirm('Anda yakin ingin mengkonversi pendaftar ini menjadi siswa aktif?')) return;
                        
                        setVerifying(true);
                        const res = await admissionConversionService.convertApplicantToStudent(applicantId, user.id);
                        setVerifying(false);
                        
                        if (res.isFailure) {
                          setErrorMsg(res.getError()!);
                        } else {
                          // Ensure we show "Siswa Aktif" next time we render
                          onUpdate();
                          fetchDetail();
                        }
                      }}
                      disabled={verifying}
                      className="w-full flex justify-center items-center px-6 py-4 border border-transparent text-white bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-lg transition-colors shadow-sm disabled:opacity-50"
                    >
                      {verifying ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div> : <CheckCircle className="w-6 h-6 mr-3" />}
                      Proses Konversi Siswa
                    </button>
                  </div>
                ) : (
                  <div className="bg-yellow-50 p-6 rounded-xl text-center border border-yellow-200">
                    <AlertCircle className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
                    <h4 className="text-lg font-bold text-yellow-900">Belum Memenuhi Syarat</h4>
                    <p className="text-yellow-700 mt-2">
                      Konversi hanya dapat dilakukan untuk pendaftar dengan status <b>Lulus (SELECTED)</b> dan telah <b>Menyelesaikan Daftar Ulang</b>.
                    </p>
                  </div>
                )}
                </PermissionGuard>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-blue-600" /> Riwayat Aktivitas & Audit
              </h3>
              {audits.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p>Belum ada riwayat aktivitas tercatat.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {audits.map((audit) => (
                    <div key={audit.id} className="flex flex-col sm:flex-row sm:items-start p-4 border border-gray-100 rounded-xl bg-gray-50/50">
                      <div className="flex items-center mb-2 sm:mb-0 sm:w-48 flex-shrink-0 text-sm text-gray-500">
                        <Clock className="w-4 h-4 mr-1.5" />
                        {new Date(audit.timestamp).toLocaleString('id-ID')}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${
                            audit.action.includes('VERIFY') || audit.action.includes('APPROVED') ? 'bg-green-100 text-green-800' :
                            audit.action.includes('REJECT') || audit.action.includes('REVISION') ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {audit.action}
                          </span>
                          <span className="text-sm font-medium text-gray-900">oleh {audit.actorId}</span>
                        </div>
                        {audit.reason && (
                          <p className="text-sm text-gray-600 bg-white p-2 border border-gray-100 rounded mt-2">
                            <span className="font-semibold text-gray-700">Catatan:</span> {audit.reason}
                          </p>
                        )}
                        {audit.metadata && Object.keys(audit.metadata).length > 0 && (
                          <div className="mt-2 text-xs text-gray-500 bg-gray-100 p-2 rounded font-mono overflow-x-auto">
                            {JSON.stringify(audit.metadata, null, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
               <h3 className="text-lg font-bold text-gray-900 border-b pb-4">Data Pribadi</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-4">
                   <div><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Nama Lengkap</span> <span className="font-medium text-gray-900">{applicant.fullName}</span></div>
                   <div><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">NIK</span> <span className="font-medium text-gray-900">{applicant.nationalId}</span></div>
                   <div><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Tempat, Tanggal Lahir</span> <span className="font-medium text-gray-900">{applicant.birthPlace}, {applicant.birthDate}</span></div>
                   <div><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Jenis Kelamin</span> <span className="font-medium text-gray-900">{applicant.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span></div>
                 </div>
                 <div className="space-y-4">
                   <div><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Email</span> <span className="font-medium text-gray-900">{applicant.email}</span></div>
                   <div><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">No. HP / WA</span> <span className="font-medium text-gray-900">{applicant.phone}</span></div>
                   <div><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Agama</span> <span className="font-medium text-gray-900">{applicant.religion}</span></div>
                   <div><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Alamat Lengkap</span> <span className="font-medium text-gray-900">{applicant.address}</span></div>
                 </div>
               </div>
            </div>
          )}

          {activeTab === 'registration' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 border-b pb-4 mb-4">Pilihan PPDB</h3>
                  <div className="space-y-4">
                    <div><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Jalur Pendaftaran</span> <span className="font-medium text-gray-900">{applicant.applicantType}</span></div>
                    <div><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Program / Jurusan</span> <span className="font-medium text-gray-900">{applicant.program || '-'}</span></div>
                    <div><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Tahun Akademik</span> <span className="font-medium text-gray-900">{applicant.academicYear}</span></div>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 border-b pb-4 mb-4">Asal Sekolah</h3>
                  <div className="space-y-4">
                    <div><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Nama Sekolah</span> <span className="font-medium text-gray-900">{applicant.schoolOrigin}</span></div>
                    <div><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">NPSN</span> <span className="font-medium text-gray-900">{applicant.schoolOriginNpsn || '-'}</span></div>
                    <div><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">NISN</span> <span className="font-medium text-gray-900">{applicant.nisn || '-'}</span></div>
                    <div><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Tahun Lulus</span> <span className="font-medium text-gray-900">{applicant.graduationYear || '-'}</span></div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'docs' && (
            <div className="space-y-4">
              {documents.length === 0 ? (
                <div className="bg-white p-12 rounded-xl border border-gray-100 text-center shadow-sm">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-900 font-medium">Belum Ada Dokumen</p>
                  <p className="text-sm text-gray-500 mt-1">Pendaftar belum mengunggah dokumen apapun.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documents.map(doc => (
                    <div key={doc.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-start">
                      <div className={`p-3 rounded-xl mr-4 ${doc.status === 'APPROVED' ? 'bg-green-50 text-green-600' : doc.status === 'REJECTED' || doc.status === 'REVISION_REQUIRED' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 mb-1">{doc.metadata?.requirementId || doc.title}</h4>
                        <div className="flex items-center space-x-2 mb-3">
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${doc.status === 'APPROVED' ? 'bg-green-100 text-green-800' : doc.status === 'REJECTED' || doc.status === 'REVISION_REQUIRED' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}`}>
                            {doc.status.replace('_', ' ')}
                          </span>
                        </div>
                        {doc.url ? (
                          <a href={doc.url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                            <Eye className="w-4 h-4 mr-2" /> Lihat Dokumen
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400 italic">File belum diunggah</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                 <div className="flex items-center justify-between border-b pb-4 mb-4">
                   <h3 className="text-lg font-bold text-gray-900 flex items-center">
                     <DollarSign className="w-5 h-5 mr-2 text-emerald-600"/> Tagihan Pembayaran
                   </h3>
                   {invoice && (
                     <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                       {invoice.status}
                     </span>
                   )}
                 </div>
                 
                 {invoice ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-4">
                       <div><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">No. Invoice</span> <span className="font-medium text-gray-900">{invoice.invoiceNumber}</span></div>
                       <div><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Tanggal Terbit</span> <span className="font-medium text-gray-900">{new Date(invoice.issuedDate).toLocaleDateString('id-ID')}</span></div>
                       <div><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Jatuh Tempo</span> <span className="font-medium text-red-600">{new Date(invoice.dueDate).toLocaleDateString('id-ID')}</span></div>
                     </div>
                     <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 flex flex-col justify-center items-center">
                       <span className="text-sm font-medium text-gray-500 mb-2">Total Tagihan</span>
                       <span className="text-3xl font-bold font-mono text-gray-900">Rp {invoice.totalAmount.toLocaleString('id-ID')}</span>
                     </div>
                   </div>
                 ) : (
                   <div className="text-center py-8 text-gray-500">
                     <AlertCircle className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                     <p>Belum ada tagihan yang diterbitkan untuk pendaftar ini.</p>
                   </div>
                 )}
              </div>

              {payments.length > 0 && (
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-4">Riwayat Transaksi</h3>
                  <div className="space-y-3">
                    {payments.map(payment => (
                      <div key={payment.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-gray-50/50">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-lg mr-4 ${payment.status === 'verified' ? 'bg-green-100 text-green-600' : payment.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                            {payment.status === 'verified' ? <CheckCircle className="w-5 h-5" /> : payment.status === 'rejected' ? <X className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-bold font-mono text-gray-900">Rp {payment.amount.toLocaleString('id-ID')}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{new Date(payment.paymentDate).toLocaleDateString('id-ID')} • Metode: {payment.method}</p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded ${payment.status === 'verified' ? 'bg-green-100 text-green-800' : payment.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}`}>
                          {payment.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'verification' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-4">Alur Verifikasi</h3>
                
                <div className="relative pb-8">
                  <div className="absolute left-4 top-2 bottom-0 w-0.5 bg-gray-200"></div>
                  
                  <div className="relative flex items-start mb-6">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center ring-4 ring-white z-10">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h4 className="font-semibold text-gray-900">Pendaftaran Disubmit</h4>
                      <p className="text-sm text-gray-500 mt-1">{new Date(applicant.createdAt).toLocaleDateString('id-ID')} • Oleh Calon Siswa</p>
                    </div>
                  </div>
                  
                  <div className="relative flex items-start mb-6">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white z-10 ${
                      applicant.status === 'DOCUMENT_REVIEW' || applicant.status === 'VERIFIED' ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <FileText className={`w-5 h-5 ${applicant.status === 'DOCUMENT_REVIEW' || applicant.status === 'VERIFIED' ? 'text-blue-600' : 'text-gray-400'}`} />
                    </div>
                    <div className="ml-4">
                      <h4 className="font-semibold text-gray-900">Pemeriksaan Dokumen</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        {applicant.status === 'VERIFIED' ? 'Dokumen lengkap dan valid' : 
                         applicant.status === 'DOCUMENT_REVISION' ? 'Membutuhkan perbaikan dokumen' : 
                         'Menunggu panitia memverifikasi'}
                      </p>
                    </div>
                  </div>

                  <div className="relative flex items-start">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white z-10 ${
                      applicant.status === 'VERIFIED' ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <CheckCircle className={`w-5 h-5 ${applicant.status === 'VERIFIED' ? 'text-green-600' : 'text-gray-400'}`} />
                    </div>
                    <div className="ml-4">
                      <h4 className="font-semibold text-gray-900">Terverifikasi</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        {applicant.status === 'VERIFIED' ? `Diverifikasi pada ${new Date(applicant.updatedAt).toLocaleDateString('id-ID')}` : 'Belum diverifikasi'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <PermissionGuard permission="admission:verify" fallback={<div className="bg-gray-50 p-4 rounded-xl text-gray-500 text-center border border-gray-200">Anda tidak memiliki izin untuk melakukan verifikasi.</div>}>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-4">Tindakan Verifikasi</h3>
                  
                  {['VERIFIED', 'SELECTED', 'NOT_SELECTED', 'WAITLISTED', 'ENROLLED'].includes(applicant.status) ? (
                    <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-center border border-green-100">
                      <CheckCircle className="w-5 h-5 mr-3" />
                      <div>
                        <p className="font-bold">Pendaftar telah diverifikasi</p>
                        <p className="text-sm mt-0.5">Tidak ada tindakan verifikasi lanjutan yang diperlukan.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Catatan Verifikasi</label>
                        <textarea 
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          className="w-full border border-gray-300 rounded-xl p-4 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all shadow-sm"
                          rows={3}
                          placeholder="Tambahkan catatan mengapa dokumen ditolak atau informasi tambahan lainnya..."
                        />
                        <p className="text-xs text-gray-500 mt-2 flex items-center">
                          <AlertCircle className="w-3.5 h-3.5 mr-1" />
                          Catatan ini wajib diisi jika meminta perbaikan ke calon siswa.
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button 
                          onClick={handleRevision}
                          disabled={verifying}
                          className="flex-1 flex justify-center items-center px-6 py-3 border border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-xl font-bold text-sm transition-colors shadow-sm disabled:opacity-50"
                        >
                          {verifying ? <div className="w-4 h-4 border-2 border-orange-700 border-t-transparent rounded-full animate-spin mr-2"></div> : <AlertCircle className="w-5 h-5 mr-2" />}
                          Minta Perbaikan
                        </button>
                        <button 
                          onClick={handleVerify}
                          disabled={verifying}
                          className="flex-1 flex justify-center items-center px-6 py-3 border border-transparent text-white bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-sm transition-colors shadow-sm disabled:opacity-50"
                        >
                          {verifying ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div> : <CheckCircle className="w-5 h-5 mr-2" />}
                          Setujui & Verifikasi
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </PermissionGuard>
            </div>
          )}

          {activeTab === 'selection' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-4">Status Seleksi</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Hasil Seleksi Saat Ini</span>
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold uppercase tracking-wider ${
                      ['SELECTED', 'ENROLLED'].includes(applicant.status) ? 'bg-green-100 text-green-800' :
                      ['NOT_SELECTED'].includes(applicant.status) ? 'bg-red-100 text-red-800' :
                      ['WAITLISTED'].includes(applicant.status) ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {applicant.status === 'VERIFIED' ? 'MENUNGGU SELEKSI' : applicant.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Jalur Pendaftaran</span>
                    <span className="font-medium text-gray-900">{applicant.applicantType} - {applicant.program || 'Umum'}</span>
                  </div>
                </div>
              </div>

              <PermissionGuard permission="admission:select" fallback={<div className="bg-gray-50 p-4 rounded-xl text-gray-500 text-center border border-gray-200">Anda tidak memiliki izin untuk melakukan seleksi.</div>}>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-4">Keputusan Seleksi Manual</h3>
                  
                  {!['VERIFIED', 'SELECTED', 'NOT_SELECTED', 'WAITLISTED'].includes(applicant.status) ? (
                    <div className="bg-yellow-50 text-yellow-700 p-4 rounded-xl flex items-center border border-yellow-200">
                      <AlertCircle className="w-5 h-5 mr-3" />
                      <div>
                        <p className="font-bold">Pendaftar belum siap untuk diseleksi</p>
                        <p className="text-sm mt-0.5">Selesaikan proses verifikasi dokumen terlebih dahulu.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Catatan Seleksi (Internal)</label>
                        <textarea 
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          className="w-full border border-gray-300 rounded-xl p-4 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all shadow-sm"
                          rows={3}
                          placeholder="Tambahkan catatan khusus terkait keputusan seleksi..."
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button 
                          onClick={async () => {
                             if (!user) return;
                             setVerifying(true);
                             const res = await admissionSelectionService.manuallySelectApplicant(applicantId, user.id, 'NOT_SELECTED' as any, notes);
                             setVerifying(false);
                             if (res.isFailure) setErrorMsg(res.getError()!);
                             else { onUpdate(); fetchDetail(); }
                          }}
                          disabled={verifying}
                          className="flex-1 flex justify-center items-center px-6 py-3 border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 rounded-xl font-bold text-sm transition-colors shadow-sm disabled:opacity-50"
                        >
                          {verifying ? <div className="w-4 h-4 border-2 border-red-700 border-t-transparent rounded-full animate-spin mr-2"></div> : <X className="w-5 h-5 mr-2" />}
                          Tolak (Tidak Lulus)
                        </button>
                        <button 
                          onClick={async () => {
                             if (!user) return;
                             setVerifying(true);
                             const res = await admissionSelectionService.manuallySelectApplicant(applicantId, user.id, 'WAITLISTED' as any, notes);
                             setVerifying(false);
                             if (res.isFailure) setErrorMsg(res.getError()!);
                             else { onUpdate(); fetchDetail(); }
                          }}
                          disabled={verifying}
                          className="flex-1 flex justify-center items-center px-6 py-3 border border-yellow-200 text-yellow-700 bg-yellow-50 hover:bg-yellow-100 rounded-xl font-bold text-sm transition-colors shadow-sm disabled:opacity-50"
                        >
                          {verifying ? <div className="w-4 h-4 border-2 border-yellow-700 border-t-transparent rounded-full animate-spin mr-2"></div> : <Clock className="w-5 h-5 mr-2" />}
                          Daftar Tunggu
                        </button>
                        <button 
                          onClick={async () => {
                             if (!user) return;
                             setVerifying(true);
                             const res = await admissionSelectionService.manuallySelectApplicant(applicantId, user.id, 'SELECTED' as any, notes);
                             setVerifying(false);
                             if (res.isFailure) setErrorMsg(res.getError()!);
                             else { onUpdate(); fetchDetail(); }
                          }}
                          disabled={verifying}
                          className="flex-1 flex justify-center items-center px-6 py-3 border border-transparent text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold text-sm transition-colors shadow-sm disabled:opacity-50"
                        >
                          {verifying ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div> : <Award className="w-5 h-5 mr-2" />}
                          Terima (Lulus)
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </PermissionGuard>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
