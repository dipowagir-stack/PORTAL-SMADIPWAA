import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { applicantService } from '../../domains/admission/services/ApplicantService';
import { admissionDocumentService } from '../../domains/admission/services/AdmissionDocumentService';
import { CheckSquare } from 'lucide-react';
import { AdmissionDocumentRequirement } from '../../domains/admission/entities/AdmissionDocumentRequirement';
import { DocumentItem } from '../../domains/document/types';
import { Loader2, Upload, AlertCircle, CheckCircle, FileText, XCircle, Clock } from 'lucide-react';

export default function ApplicantDocumentPanel({ applicantId }: { applicantId: string }) {
  const { user } = useAuth();
  const [requirements, setRequirements] = useState<AdmissionDocumentRequirement[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [completeness, setCompleteness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqsRes, docsRes, compRes] = await Promise.all([
        admissionDocumentService.getRequirementsForApplicant(applicantId),
        admissionDocumentService.getDocumentsForApplicant(applicantId),
        admissionDocumentService.getDocumentCompleteness(applicantId)
      ]);

      if (reqsRes.isSuccess) setRequirements(reqsRes.getValue());
      if (docsRes.isSuccess) setDocuments(docsRes.getValue());
      if (compRes.isSuccess) setCompleteness(compRes.getValue());
    } catch (e) {
      setError('Gagal memuat dokumen');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [applicantId]);

  const handleUpload = async (reqId: string, file: File, existingDocId?: string) => {
    if (!user) return;
    const req = requirements.find(r => r.id === reqId);
    if (!req) return;

    if (file.size > req.maxSizeBytes) {
      alert(`Ukuran file maksimal ${req.maxSizeBytes / 1024 / 1024}MB`);
      return;
    }
    if (!req.allowedTypes.includes(file.type)) {
      alert(`Tipe file tidak diizinkan. Tipe yang diizinkan: ${req.allowedTypes.join(', ')}`);
      return;
    }

    setUploadingId(reqId);
    try {
      let res;
      if (existingDocId) {
        res = await admissionDocumentService.replaceDocument(existingDocId, {
          applicantId,
          requirementId: reqId,
          file
        }, user.uid);
      } else {
        res = await admissionDocumentService.uploadDocument({
          applicantId,
          requirementId: reqId,
          file
        }, user.uid);
      }

      if (res.isFailure) {
        alert('Gagal mengupload dokumen: ' + res.getError());
      } else {
        await fetchData();
      }
    } catch (e) {
      alert('Terjadi kesalahan saat upload');
    } finally {
      setUploadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const isComplete = completeness?.overallStatus === 'COMPLETE';

  return (
    <div className="space-y-6 mt-8">
      <div className="border border-gray-100 rounded-xl p-5 bg-white">
        <div className="flex items-center justify-between mb-4 pb-2 border-b">
          <h4 className="font-semibold text-gray-900">Dokumen Persyaratan</h4>
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${isComplete ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
            {isComplete ? 'Lengkap' : 'Belum Lengkap'}
          </span>
        </div>

        {completeness && (
          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-center">
              <p className="text-xs text-blue-600 font-semibold uppercase">Wajib</p>
              <p className="text-xl font-bold text-blue-900">{completeness.totalRequired}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-100 text-center">
              <p className="text-xs text-green-600 font-semibold uppercase">Terverifikasi</p>
              <p className="text-xl font-bold text-green-900">{completeness.approved}</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 text-center">
              <p className="text-xs text-orange-600 font-semibold uppercase">Pending</p>
              <p className="text-xl font-bold text-orange-900">{completeness.pending}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-center">
              <p className="text-xs text-red-600 font-semibold uppercase">Kurang/Ditolak</p>
              <p className="text-xl font-bold text-red-900">{completeness.missing}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          {requirements.length === 0 ? (
            <p className="text-gray-500 text-sm italic">Belum ada persyaratan dokumen.</p>
          ) : requirements.map(req => {
            const doc = documents.find(d => d.metadata?.requirementId === req.id);
            return (
              <DocumentRow 
                key={req.id} 
                req={req} 
                doc={doc} 
                uploading={uploadingId === req.id} 
                onUpload={(file) => handleUpload(req.id!, file, doc?.id)} 
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

const DocumentRow: React.FC<{ req: AdmissionDocumentRequirement, doc?: DocumentItem, uploading: boolean, onUpload: (f: File) => void }> = ({ req, doc, uploading, onUpload }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const status = doc?.status || 'NOT_SUBMITTED';

  let StatusIcon = AlertCircle;
  let statusColor = 'text-gray-400';
  let bgColor = 'bg-gray-100';
  let statusText = 'Belum Upload';

  if (status === 'SUBMITTED') {
    StatusIcon = Clock;
    statusColor = 'text-blue-500';
    bgColor = 'bg-blue-50';
    statusText = 'Menunggu Pemeriksaan';
  } else if (status === 'UNDER_REVIEW') {
    StatusIcon = Clock;
    statusColor = 'text-blue-500';
    bgColor = 'bg-blue-50';
    statusText = 'Sedang Diverifikasi';
  } else if (status === 'APPROVED') {
    StatusIcon = CheckCircle;
    statusColor = 'text-green-500';
    bgColor = 'bg-green-50';
    statusText = 'Terverifikasi';
  } else if (status === 'REJECTED' || status === 'REVISION_REQUIRED') {
    StatusIcon = XCircle;
    statusColor = 'text-red-500';
    bgColor = 'bg-red-50';
    statusText = status === 'REVISION_REQUIRED' ? 'Perlu Perbaikan' : 'Ditolak';
  }

  const canUpload = !doc || status === 'REJECTED' || status === 'REVISION_REQUIRED';

  return (
    <div className={`p-4 rounded-lg border ${doc ? 'border-gray-200' : 'border-dashed border-gray-300'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start">
          <div className={`p-2 rounded-lg ${bgColor} mr-3`}>
            <StatusIcon className={`w-5 h-5 ${statusColor}`} />
          </div>
          <div>
            <h5 className="font-medium text-gray-900 flex items-center">
              {req.documentName}
              {req.isRequired && <span className="text-red-500 ml-1">*</span>}
            </h5>
            <p className="text-xs text-gray-500 mt-0.5">
              Maks {(req.maxSizeBytes / 1024 / 1024).toFixed(0)}MB ({req.allowedTypes.map(t => t.split('/')[1] || t).join(', ')})
            </p>
            
            {doc && (
              <div className="mt-2 flex items-center space-x-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColor} ${bgColor}`}>
                  {statusText}
                </span>
                <a href={doc.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center">
                  <FileText className="w-3 h-3 mr-1" /> Lihat Dokumen
                </a>
              </div>
            )}
            
            {doc?.verificationNotes && (
              <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-700">
                <strong>Catatan Verifikasi:</strong> {doc.verificationNotes}
              </div>
            )}
          </div>
        </div>

        <div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept={req.allowedTypes.join(',')}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                onUpload(e.target.files[0]);
              }
            }}
          />
          {canUpload && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {doc ? 'Upload Ulang' : 'Upload'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
