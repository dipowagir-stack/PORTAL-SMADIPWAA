import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, AlertTriangle, XCircle, ArrowRight, Loader2 } from 'lucide-react';
import { academicYearRolloverService, ActivationValidationResult, StudentPromotionPreview, TeacherRolloverPreview, ClassRolloverPreview, FinancePreparationPreview, RolloverPreparationMatrix } from '../../domains/academic/academicYearRolloverService';
import { useAuth } from '../../contexts/AuthContext';
import { AcademicYear } from '../../domains/academic/types';

interface AcademicYearRolloverModalProps {
  year: AcademicYear;
  onClose: () => void;
  onActivated: () => void;
}

export const AcademicYearRolloverModal: React.FC<AcademicYearRolloverModalProps> = ({ year, onClose, onActivated }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  
  const [matrix, setMatrix] = useState<RolloverPreparationMatrix | null>(null);
  const [classesPreview, setClassesPreview] = useState<ClassRolloverPreview[]>([]);
  const [studentPreview, setStudentPreview] = useState<StudentPromotionPreview[]>([]);
  const [teacherPreview, setTeacherPreview] = useState<TeacherRolloverPreview[]>([]);
  const [financePreview, setFinancePreview] = useState<FinancePreparationPreview | null>(null);
  const [validation, setValidation] = useState<ActivationValidationResult | null>(null);

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CLASSES' | 'STUDENTS' | 'TEACHERS' | 'FINANCE'>('OVERVIEW');
  const [confirmationText, setConfirmationText] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      if (year.id) {
        const [mRes, cRes, sRes, tRes, fRes, vRes] = await Promise.all([
          academicYearRolloverService.getCarryForwardMatrix(year.id),
          academicYearRolloverService.previewClassRollover(year.id),
          academicYearRolloverService.previewStudentPromotion(year.id),
          academicYearRolloverService.previewTeacherRollover(year.id),
          academicYearRolloverService.previewFinancePreparation(year.id),
          academicYearRolloverService.validateActivation(year.id)
        ]);

        if (mRes.isSuccess) setMatrix(mRes.getValue());
        if (cRes.isSuccess) setClassesPreview(cRes.getValue() || []);
        if (sRes.isSuccess) setStudentPreview(sRes.getValue() || []);
        if (tRes.isSuccess) setTeacherPreview(tRes.getValue() || []);
        if (fRes.isSuccess) setFinancePreview(fRes.getValue() || null);
        if (vRes.isSuccess) setValidation(vRes.getValue() || null);
      }
      setLoading(false);
    };
    loadData();
  }, [year.id]);

  const handleActivate = async () => {
    if (!validation?.isReady || !year.id || !profile?.uid) return;
    setActivating(true);
    const res = await academicYearRolloverService.activateAcademicYear(year.id, profile.uid);
    setActivating(false);
    if (res.isSuccess) {
      alert('Tahun Ajaran berhasil diaktifkan. Context periode telah dipindahkan.');
      onActivated();
    } else {
      if (res.isFailure) alert('Gagal aktivasi: ' + res.getError());
    }
  };

  const renderBadge = (status: string) => {
    switch(status) {
      case 'READY': return <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold">READY</span>;
      case 'WARNING': return <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-bold">WARNING</span>;
      case 'BLOCKED': return <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-bold">BLOCKED</span>;
      case 'GRADUATED': return <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">GRADUATED</span>;
      case 'MANUAL_REVIEW': return <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-bold">MANUAL REVIEW</span>;
      default: return <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full font-bold">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white p-8 rounded-2xl flex flex-col items-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <p className="font-bold text-gray-700">Menganalisis Rollover Tahun Ajaran...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-2xl">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Aktivasi Tahun Ajaran & Rollover</h3>
            <p className="text-sm text-gray-500 mt-1">Mempersiapkan tahun ajaran {year.name} menjadi ACTIVE</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <XCircle className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="flex border-b border-gray-200 bg-white px-6">
          {['OVERVIEW', 'CLASSES', 'STUDENTS', 'TEACHERS', 'FINANCE'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-white">
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              {validation?.blockers.length ? (
                <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                  <h4 className="font-bold text-red-800 flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5" /> Blockers ({validation.blockers.length})
                  </h4>
                  <ul className="list-disc pl-5 text-sm text-red-700 space-y-1">
                    {validation.blockers.map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                </div>
              ) : null}

              {validation?.warnings.length ? (
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                  <h4 className="font-bold text-orange-800 flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5" /> Warnings ({validation.warnings.length})
                  </h4>
                  <ul className="list-disc pl-5 text-sm text-orange-700 space-y-1">
                    {validation.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              ) : null}

              <div>
                <h4 className="font-bold text-gray-800 mb-3">Carry Forward Matrix</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {matrix && Object.entries(matrix).map(([key, action]: [string, any]) => (
                    <div key={key} className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                      <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">{key.replace(/([A-Z])/g, ' $1')}</div>
                      <div className="font-bold text-gray-900 text-sm mb-1">{action.type}</div>
                      <div className="text-xs text-gray-600 line-clamp-2">{action.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'CLASSES' && (
            <div className="space-y-4">
              <h4 className="font-bold text-gray-800">Class Rollover Preview</h4>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 font-bold text-gray-700">Existing Class</th>
                      <th className="p-3"></th>
                      <th className="p-3 font-bold text-gray-700">New Class</th>
                      <th className="p-3 font-bold text-gray-700">Status</th>
                      <th className="p-3 font-bold text-gray-700">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {classesPreview.map((c, i) => (
                      <tr key={i}>
                        <td className="p-3 text-gray-900 font-medium">{c.existingClassName}</td>
                        <td className="p-3 text-gray-400"><ArrowRight className="w-4 h-4" /></td>
                        <td className="p-3 text-gray-900 font-medium">{c.newClassName}</td>
                        <td className="p-3">{renderBadge(c.status)}</td>
                        <td className="p-3 text-gray-500 text-xs">{c.reason || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'STUDENTS' && (
            <div className="space-y-4">
              <h4 className="font-bold text-gray-800">Student Promotion Preview</h4>
              <p className="text-xs text-gray-500 mb-4 bg-blue-50 p-2 rounded border border-blue-100">Note: Data is not modified during this phase. This is only a structural planning preview.</p>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 font-bold text-gray-700">Student</th>
                      <th className="p-3 font-bold text-gray-700">Current</th>
                      <th className="p-3"></th>
                      <th className="p-3 font-bold text-gray-700">Proposed</th>
                      <th className="p-3 font-bold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {studentPreview.map((s, i) => (
                      <tr key={i}>
                        <td className="p-3 text-gray-900 font-medium">{s.studentName}</td>
                        <td className="p-3 text-gray-600">{s.currentClassName}</td>
                        <td className="p-3 text-gray-400"><ArrowRight className="w-4 h-4" /></td>
                        <td className="p-3 text-gray-900 font-medium">{s.proposedClassName || '-'}</td>
                        <td className="p-3 flex items-center gap-2">
                          {renderBadge(s.status)}
                          {s.reason && <span className="text-xs text-gray-500 ml-2">{s.reason}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'TEACHERS' && (
            <div className="space-y-4">
              <h4 className="font-bold text-gray-800">Teacher Rollover Preview</h4>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 font-bold text-gray-700">Teacher</th>
                      <th className="p-3 font-bold text-gray-700">Current Assignments</th>
                      <th className="p-3 font-bold text-gray-700">Proposed Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {teacherPreview.map((t, i) => (
                      <tr key={i}>
                        <td className="p-3 text-gray-900 font-medium">{t.teacherName}</td>
                        <td className="p-3 text-gray-600">{t.currentAssignmentSummary}</td>
                        <td className="p-3 flex flex-col gap-1 items-start">
                          {renderBadge(t.status)}
                          {t.reason && <span className="text-xs text-gray-500">{t.reason}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'FINANCE' && financePreview && (
            <div className="space-y-4">
              <h4 className="font-bold text-gray-800">Finance Preparation</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                  <div className="text-sm text-gray-500 font-bold mb-1">Fee Configuration Status</div>
                  <div>{renderBadge(financePreview.feeConfigurationStatus)}</div>
                  <p className="text-xs text-gray-500 mt-2">New fee templates will be cloned from previous year.</p>
                </div>
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                  <div className="text-sm text-gray-500 font-bold mb-1">Outstanding Invoices (Previous)</div>
                  <div className="text-2xl font-bold text-gray-900">{financePreview.outstandingInvoices}</div>
                  <p className="text-xs text-gray-500 mt-2">Will be carried forward as arrears.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {validation?.isReady ? (
              <span className="flex items-center text-green-700 font-bold"><CheckCircle className="w-5 h-5 mr-1" /> Ready to Activate</span>
            ) : (
              <span className="flex items-center text-red-700 font-bold"><XCircle className="w-5 h-5 mr-1" /> Activation Blocked</span>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition-colors">Batal</button>
            
            <div className="flex flex-col items-end gap-2">
              {validation?.isReady && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-600 font-medium">Ketik <strong>AKTIFKAN {year.name}</strong>:</span>
                  <input 
                    type="text" 
                    value={confirmationText} 
                    onChange={e => setConfirmationText(e.target.value)} 
                    className="border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:border-blue-500 w-40"
                    placeholder={"AKTIFKAN " + year.name}
                  />
                </div>
              )}
              <button 
                onClick={handleActivate} 
                disabled={!validation?.isReady || activating || confirmationText !== "AKTIFKAN " + year.name}
                className={`px-5 py-2.5 rounded-lg font-bold shadow-sm transition-colors flex items-center ${validation?.isReady && confirmationText === "AKTIFKAN " + year.name && !activating ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              >
                {activating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                {activating ? 'Mengaktifkan...' : 'Konfirmasi & Aktifkan'}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
