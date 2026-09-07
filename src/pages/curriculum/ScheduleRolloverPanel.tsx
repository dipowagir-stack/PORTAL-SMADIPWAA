import React, { useState, useEffect } from 'react';
import { Play, Check, AlertTriangle, Save, Loader2, ArrowRight } from 'lucide-react';
import { scheduleRolloverService, AssignmentRolloverPreview, ScheduleRolloverPreview } from '../../domains/academic/scheduleRolloverService';

export default function ScheduleRolloverPanel() {
  const [sourceYear, setSourceYear] = useState('2023/2024');
  const [sourceSemester, setSourceSemester] = useState(2);
  const [targetYear, setTargetYear] = useState('2024/2025');
  const [targetSemester, setTargetSemester] = useState(1);
  
  const [step, setStep] = useState<1 | 2>(1); // 1: Assignment, 2: Schedule
  const [assignmentPreviews, setAssignmentPreviews] = useState<AssignmentRolloverPreview[]>([]);
  const [schedulePreviews, setSchedulePreviews] = useState<ScheduleRolloverPreview[]>([]);
  const [loading, setLoading] = useState(false);

  const handleGenerateAssignmentPreview = async () => {
    setLoading(true);
    const res = await scheduleRolloverService.generateAssignmentPreview(sourceYear, sourceSemester, targetYear, targetSemester);
    if (res.isSuccess) {
      setAssignmentPreviews(res.getValue()!);
      alert('Assignment Preview Generated');
    } else {
      alert((res.isFailure ? res.getError() : "Unknown Error") || 'Failed to generate preview');
    }
    setLoading(false);
  };

  const handleApproveAssignments = async () => {
    setLoading(true);
    const res = await scheduleRolloverService.approveAssignments(targetYear, targetSemester, assignmentPreviews);
    if (res.isSuccess) {
      alert('Assignments Rollover Approved and Created');
      setStep(2);
    } else {
      alert((res.isFailure ? res.getError() : "Unknown Error") || 'Failed to approve assignments');
    }
    setLoading(false);
  };

  const handleGenerateSchedulePreview = async () => {
    setLoading(true);
    const res = await scheduleRolloverService.generateSchedulePreview(sourceYear, sourceSemester, targetYear, targetSemester);
    if (res.isSuccess) {
      setSchedulePreviews(res.getValue()!);
      alert('Schedule Preview Generated');
    } else {
      alert((res.isFailure ? res.getError() : "Unknown Error") || 'Failed to generate schedule preview');
    }
    setLoading(false);
  };

  const handlePublishSchedules = async () => {
    setLoading(true);
    const res = await scheduleRolloverService.publishSchedules(targetYear, targetSemester, schedulePreviews);
    if (res.isSuccess) {
      alert('Schedules Successfully Published to New Period');
    } else {
      alert((res.isFailure ? res.getError() : "Unknown Error") || 'Failed to publish schedules');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-bold mb-4">Period Context Selection</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Source Year</label>
            <input type="text" value={sourceYear} onChange={(e) => setSourceYear(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Source Semester</label>
            <input type="number" value={sourceSemester} onChange={(e) => setSourceSemester(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div className="flex justify-center pb-2">
            <ArrowRight className="text-gray-400" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Target Year</label>
            <input type="text" value={targetYear} onChange={(e) => setTargetYear(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Target Semester</label>
            <input type="number" value={targetSemester} onChange={(e) => setTargetSemester(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg" />
          </div>
        </div>
      </div>

      {step === 1 && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">1. Teaching Assignment Rollover</h3>
            <button 
              onClick={handleGenerateAssignmentPreview}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100"
            >
              <Play className="w-4 h-4 mr-2" />
              Preview Assignments
            </button>
          </div>

          {assignmentPreviews.length > 0 && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">Teacher ID</th>
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">Subject</th>
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">Class</th>
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">Hours/Week</th>
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignmentPreviews.map((p, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-3 px-4 text-sm">{p.teacherId}</td>
                        <td className="py-3 px-4 text-sm">{p.subject}</td>
                        <td className="py-3 px-4 text-sm">{p.className}</td>
                        <td className="py-3 px-4 text-sm">{p.hoursPerWeek}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            p.status === 'CARRY_FORWARD' ? 'bg-green-100 text-green-700' :
                            p.status === 'MANUAL_REVIEW' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {p.status}
                          </span>
                          {p.warningMessage && <p className="text-xs text-red-500 mt-1">{p.warningMessage}</p>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  onClick={handleApproveAssignments}
                  disabled={loading}
                  className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Check className="w-5 h-5 mr-2" />}
                  Approve & Create Assignments
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">2. Schedule Rollover</h3>
            <button 
              onClick={handleGenerateSchedulePreview}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100"
            >
              <Play className="w-4 h-4 mr-2" />
              Preview Schedules
            </button>
          </div>

          {schedulePreviews.length > 0 && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">Teacher ID</th>
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">Day</th>
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">Time</th>
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">Subject</th>
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">Class</th>
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedulePreviews.map((p, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-3 px-4 text-sm">{p.teacherId}</td>
                        <td className="py-3 px-4 text-sm">{p.day}</td>
                        <td className="py-3 px-4 text-sm">{p.startTime} - {p.endTime}</td>
                        <td className="py-3 px-4 text-sm">{p.subject}</td>
                        <td className="py-3 px-4 text-sm">{p.className}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            p.status === 'READY' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  onClick={handlePublishSchedules}
                  disabled={loading}
                  className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                  Publish Schedules
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
