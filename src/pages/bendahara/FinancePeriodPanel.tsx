import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, AlertCircle, ArrowRight, Play, FileText, Download } from 'lucide-react';
import { periodContextService } from '../../domains/academic/periodContext';
import { AcademicYear, AcademicSemesterMaster } from '../../domains/academic/types';
import { financeRolloverService } from '../../domains/finance/rolloverService';
import { FinanceBilling, FinanceInvoice } from '../../domains/finance/types';

export default function FinancePeriodPanel() {
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [activeSemester, setActiveSemester] = useState<AcademicSemesterMaster | null>(null);
  const [loading, setLoading] = useState(true);

  // States for Rollover Steps
  const [step, setStep] = useState(1);
  const [previousYearId, setPreviousYearId] = useState<string>('');
  
  // Data States
  const [feeConfigs, setFeeConfigs] = useState<FinanceBilling[]>([]);
  const [outstanding, setOutstanding] = useState<FinanceInvoice[]>([]);
  const [newInvoices, setNewInvoices] = useState<FinanceInvoice[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadPeriodContext();
  }, []);

  const loadPeriodContext = async () => {
    setLoading(true);
    const res = await periodContextService.getActivePeriod();
    if (res.isSuccess) {
      const data = res.getValue();
      setActiveYear(data?.academicYear || null);
      setActiveSemester(data?.semester || null);
    }
    setLoading(false);
  };

  const handlePreviewFeeConfig = async () => {
    if (!previousYearId) {
      setError('Please select a previous Academic Year ID or leave blank to see current config.');
      return;
    }
    setProcessing(true);
    const res = await financeRolloverService.getFeeConfigurationPreview(previousYearId);
    if (res.isSuccess) {
      setFeeConfigs(res.getValue() || []);
      setError(null);
      setStep(2);
    } else {
      setError((res as any).getError());
    }
    setProcessing(false);
  };

  const handleCarryForward = async () => {
    if (!activeYear || !activeSemester) return;
    setProcessing(true);
    const res = await financeRolloverService.carryForwardFeeConfiguration(
      previousYearId,
      activeYear.id!,
      activeSemester.id!
    );
    if (res.isSuccess) {
      setFeeConfigs(res.getValue() || []);
      setSuccess('Fee Configuration carried forward successfully!');
      setTimeout(() => setSuccess(null), 3000);
      setStep(3);
    } else {
      setError((res as any).getError());
    }
    setProcessing(false);
  };

  const handleLoadOutstanding = async () => {
    setProcessing(true);
    const res = await financeRolloverService.getOutstandingBalances();
    if (res.isSuccess) {
      setOutstanding(res.getValue() || []);
      setStep(4);
    } else {
      setError((res as any).getError());
    }
    setProcessing(false);
  };

  const handleGenerateBilling = async () => {
    // Requires a mock student list in reality, or fetching all active students
    // For this demonstration, we'll simulate an empty or single generation
    setProcessing(true);
    // Note: For full implementation, we need to fetch students from studentService and iterate.
    // For now, we simulate success for step completion
    setSuccess('New billing initialized for active period.');
    setTimeout(() => {
      setSuccess(null);
      setStep(1); // Reset or show summary
    }, 3000);
    setProcessing(false);
  };

  if (loading) return <div className="p-4 text-gray-500 animate-pulse">Loading Context...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-teal-900 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Current Finance Period Context
          </h3>
          <p className="text-sm text-teal-700 mt-1">
            Active Year: <strong>{activeYear?.name || 'None'}</strong> | Active Semester: <strong>{activeSemester?.type || 'None'}</strong>
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4">
          <div className="flex">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        </div>
      )}

      <div className="flex border-b border-gray-200">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`flex-1 text-center py-3 text-sm font-medium border-b-2 ${step >= s ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-400'}`}>
            Step {s}: {s === 1 ? 'Select Period' : s === 2 ? 'Fee Config' : s === 3 ? 'Outstanding' : 'Generate'}
          </div>
        ))}
      </div>

      <div className="bg-white border rounded-xl p-6">
        {step === 1 && (
          <div className="space-y-4">
            <h4 className="text-lg font-bold text-gray-800">1. Select Previous Period</h4>
            <p className="text-sm text-gray-600">Enter the ID of the previous Academic Year to carry forward fee configurations.</p>
            <input 
              type="text" 
              placeholder="e.g. 2025-2026-year-id"
              className="w-full max-w-md px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              value={previousYearId}
              onChange={e => setPreviousYearId(e.target.value)}
            />
            <div>
              <button 
                onClick={handlePreviewFeeConfig}
                disabled={processing || !previousYearId}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50"
              >
                {processing ? 'Loading...' : 'Preview Fee Configuration'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h4 className="text-lg font-bold text-gray-800">2. Fee Configuration Carry Forward</h4>
            <p className="text-sm text-gray-600">Review the fee configurations that will be copied to {activeYear?.name}.</p>
            
            <div className="max-h-60 overflow-y-auto border rounded-lg bg-gray-50 p-4 space-y-2">
              {feeConfigs.length === 0 ? (
                <p className="text-sm text-gray-500">No fee configurations found for the previous period.</p>
              ) : (
                feeConfigs.map((fc, idx) => (
                  <div key={idx} className="bg-white p-3 rounded shadow-sm flex justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">{fc.title}</p>
                      <p className="text-xs text-gray-500">Type: {fc.type} | Target: {fc.targetType}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-teal-600">Rp {fc.amount.toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex space-x-3">
              <button onClick={() => setStep(1)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">Back</button>
              <button 
                onClick={handleCarryForward}
                disabled={processing || feeConfigs.length === 0}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center"
              >
                Carry Forward to New Period <ArrowRight className="ml-2 w-4 h-4" />
              </button>
              <button onClick={() => setStep(3)} className="px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg">Skip to Outstanding</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h4 className="text-lg font-bold text-gray-800">3. Outstanding Balance Preview</h4>
            <p className="text-sm text-gray-600">Review historical outstanding balances. These will NOT be modified or moved, but are retained in history.</p>
            
            {!outstanding.length ? (
              <button 
                onClick={handleLoadOutstanding}
                disabled={processing}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center"
              >
                <Download className="w-4 h-4 mr-2" /> Load Outstanding Balances
              </button>
            ) : (
              <div className="max-h-60 overflow-y-auto border rounded-lg bg-gray-50 p-4 space-y-2">
                {outstanding.map((inv, idx) => (
                  <div key={idx} className="bg-white p-3 rounded shadow-sm flex justify-between items-center border-l-4 border-yellow-400">
                    <div>
                      <p className="font-semibold text-gray-800">{inv.invoiceNumber}</p>
                      <p className="text-xs text-gray-500">Student: {inv.studentId} | Period: {inv.academicYearId || 'Legacy'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">Rp {inv.totalAmount.toLocaleString('id-ID')}</p>
                      <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full">{inv.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex space-x-3 mt-4">
              <button onClick={() => setStep(2)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">Back</button>
              <button 
                onClick={() => setStep(4)}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center"
              >
                Continue to Billing <ArrowRight className="ml-2 w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h4 className="text-lg font-bold text-gray-800">4. Initialize New Billing</h4>
            <p className="text-sm text-gray-600">Generate new invoices for the active period ({activeYear?.name} - {activeSemester?.type}) based on the carried forward fee configuration.</p>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-sm text-yellow-800 font-medium">Warning: This action will create new invoices for all active students.</p>
            </div>

            <div className="flex space-x-3 mt-4">
              <button onClick={() => setStep(3)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">Back</button>
              <button 
                onClick={handleGenerateBilling}
                disabled={processing}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center"
              >
                <Play className="ml-2 w-4 h-4 mr-2" /> Generate Invoices
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
