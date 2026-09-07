import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { documentRequirementRepo } from '../../domains/admission/repositories';
import { admissionDocumentService } from '../../domains/admission/services/AdmissionDocumentService';
import { applicantService } from '../../domains/admission/services/ApplicantService';
import { Applicant } from '../../domains/admission/entities/Applicant';
import { DocumentItem } from '../../domains/document/types';
import { Loader2, Search, Filter, CheckCircle, XCircle, FileText, AlertCircle, Eye } from 'lucide-react';

export default function DocumentVerificationPanel() {
  const { user } = useAuth();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [docLoading, setDocLoading] = useState(false);
  const [requirements, setRequirements] = useState<any[]>([]);

  const fetchApplicants = async () => {
    setLoading(true);
    try {
      const res = await applicantService.getAllResult();
      if (res.isSuccess) {
        setApplicants(res.getValue().filter(a => a.status !== 'DRAFT'));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, []);

  const handleSelectApplicant = async (applicant: Applicant) => {
    setSelectedApplicant(applicant);
    setDocLoading(true);
    try {
      const [docsRes, reqsRes] = await Promise.all([
        admissionDocumentService.getDocumentsForApplicant(applicant.id!),
        admissionDocumentService.getRequirementsForApplicant(applicant.id!)
      ]);
      
      if (docsRes.isSuccess) setDocuments(docsRes.getValue());
      if (reqsRes.isSuccess) setRequirements(reqsRes.getValue());
    } catch (e) {
      console.error(e);
    } finally {
      setDocLoading(false);
    }
  };

  const handleVerify = async (docId: string, status: 'APPROVED' | 'REJECTED' | 'REVISION_REQUIRED', notes: string = '') => {
    if (!user) return;
    try {
      const res = await admissionDocumentService.verifyDocument({
        documentId: docId,
        status,
        verificationNotes: notes
      }, user.uid);
      
      if (res.isFailure) {
        alert('Gagal memverifikasi dokumen: ' + res.getError());
      } else {
        // refresh docs
        if (selectedApplicant) {
          handleSelectApplicant(selectedApplicant);
        }
      }
    } catch (e) {
      alert('Terjadi kesalahan sistem');
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" /></div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
      {/* Left panel: List of applicants */}
      <div className="w-full md:w-1/3 border-r border-gray-100 bg-gray-50 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">Daftar Pendaftar</h3>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Cari nama atau NIK..." 
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {applicants.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">Belum ada pendaftar (selain Draft).</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {applicants.map(app => (
                <button
                  key={app.id}
                  onClick={() => handleSelectApplicant(app)}
                  className={`w-full text-left p-4 hover:bg-blue-50 transition-colors ${selectedApplicant?.id === app.id ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm truncate">{app.fullName}</p>
                      <p className="text-xs text-gray-500 mt-1">{app.registrationNumber || 'Menunggu REG'}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-[10px] font-bold rounded uppercase">
                      {app.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Verification Area */}
      <div className="w-full md:w-2/3 flex flex-col">
        {selectedApplicant ? (
          <>
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">{selectedApplicant.fullName}</h2>
              <div className="mt-2 text-sm text-gray-600 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400">NIK:</span> <span className="font-medium text-gray-900">{selectedApplicant.nationalId}</span>
                </div>
                <div>
                  <span className="text-gray-400">Jalur:</span> <span className="font-medium text-gray-900">{selectedApplicant.applicantType}</span>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
              <h3 className="font-semibold text-gray-900 mb-4">Verifikasi Dokumen</h3>
              
              {docLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
              ) : (
                <div className="space-y-4">
                  {requirements.map(req => {
                    const doc = documents.find(d => d.metadata?.requirementId === req.id);
                    return (
                      <VerificationRow 
                        key={req.id} 
                        req={req} 
                        doc={doc} 
                        onVerify={handleVerify}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 text-gray-300 mb-4" />
            <p>Pilih pendaftar dari daftar di sebelah kiri untuk memverifikasi dokumen.</p>
          </div>
        )}
      </div>
    </div>
  );
}

const VerificationRow: React.FC<{ req: any, doc: any, onVerify: (id: string, status: any, notes: string) => void }> = ({ req, doc, onVerify }) => {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');

  if (!doc) {
    return (
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm opacity-60">
        <div className="flex justify-between items-center">
          <div>
            <h5 className="font-medium text-gray-900">{req.documentName}</h5>
            <p className="text-xs text-red-500 mt-1">Belum diupload</p>
          </div>
        </div>
      </div>
    );
  }

  const handleReject = (status: 'REJECTED' | 'REVISION_REQUIRED') => {
    if (!notes.trim()) {
      alert('Alasan penolakan / revisi wajib diisi');
      return;
    }
    onVerify(doc.id, status, notes);
    setShowNotes(false);
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h5 className="font-medium text-gray-900 flex items-center">
            {req.documentName}
            {doc.status === 'APPROVED' && <CheckCircle className="w-4 h-4 text-green-500 ml-2" />}
            {(doc.status === 'REJECTED' || doc.status === 'REVISION_REQUIRED') && <XCircle className="w-4 h-4 text-red-500 ml-2" />}
            {doc.status === 'UNDER_REVIEW' && <AlertCircle className="w-4 h-4 text-blue-500 ml-2" />}
          </h5>
          <p className="text-xs text-gray-500 mt-1">Status saat ini: <span className="font-semibold">{doc.status || 'SUBMITTED'}</span></p>
          
          <div className="mt-3">
            <a href={doc.url} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium">
              <Eye className="w-4 h-4 mr-1" />
              Lihat File ({doc.url?.split('?')[0].split('.').pop()?.toUpperCase() || 'FILE'})
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {doc.status !== 'APPROVED' && (
            <button
              onClick={() => onVerify(doc.id, 'APPROVED', 'Dokumen valid dan disetujui')}
              className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-md text-xs font-semibold flex items-center justify-center transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
            </button>
          )}
          
          {doc.status !== 'APPROVED' && !showNotes && (
            <button
              onClick={() => setShowNotes(true)}
              className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-md text-xs font-semibold flex items-center justify-center transition-colors"
            >
              <XCircle className="w-3.5 h-3.5 mr-1" /> Tolak / Revisi
            </button>
          )}
        </div>
      </div>

      {showNotes && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <label className="block text-xs font-medium text-gray-700 mb-1">Alasan Penolakan / Permintaan Revisi *</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm mb-3 outline-none focus:border-red-500"
            rows={2}
            placeholder="Contoh: Foto buram, KTP tidak terbaca..."
          ></textarea>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNotes(false)} className="px-3 py-1.5 text-gray-500 text-xs font-medium hover:bg-gray-50 rounded-md">Batal</button>
            <button onClick={() => handleReject('REVISION_REQUIRED')} className="px-3 py-1.5 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-md text-xs font-semibold">Minta Revisi</button>
            <button onClick={() => handleReject('REJECTED')} className="px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 rounded-md text-xs font-semibold">Tolak Permanen</button>
          </div>
        </div>
      )}

      {doc.verificationNotes && !showNotes && (
        <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600 border border-gray-100">
          <strong>Riwayat Catatan:</strong> {doc.verificationNotes}
        </div>
      )}
    </div>
  );
}
