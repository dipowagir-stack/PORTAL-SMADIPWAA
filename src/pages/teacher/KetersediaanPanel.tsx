import { getCurriculumMasterResult, getTeacherProfileDataResult, updateTeacherProfileResult } from "../../domains/teacher/services";
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, CheckCircle } from 'lucide-react';

export default function KetersediaanPanel() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Master data
  const [isOpen, setIsOpen] = useState(false);
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [periodsPerDay, setPeriodsPerDay] = useState(8);
  const [startTime, setStartTime] = useState('07:00');
  const [periodDuration, setPeriodDuration] = useState(45);
  const [breakCount, setBreakCount] = useState(2);
  const [breakDuration, setBreakDuration] = useState(15);
  const [break1AfterPeriod, setBreak1AfterPeriod] = useState(4);
  const [break2AfterPeriod, setBreak2AfterPeriod] = useState(6);
  const [fridayStartTime, setFridayStartTime] = useState('07:00');
  const [fridayPeriodDuration, setFridayPeriodDuration] = useState(35);
  const [fridayBreakCount, setFridayBreakCount] = useState(2);
  const [fridayBreakDuration, setFridayBreakDuration] = useState(15);
  const [fridayBreak1AfterPeriod, setFridayBreak1AfterPeriod] = useState(4);
  const [fridayBreak2AfterPeriod, setFridayBreak2AfterPeriod] = useState(6);
  
  // Teacher data
  const [timeOff, setTimeOff] = useState<string[]>([]);
  
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].slice(0, daysPerWeek);

  const parseTime = (timeStr: string) => {
    const [h, m] = (timeStr || '00:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const formatTime = (totalMin: number) => {
    const h = Math.floor((totalMin % 1440) / 60).toString().padStart(2, '0');
    const m = (totalMin % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const getTimeRange = (dayName: string, periodIdx: number) => {
    const isFriday = dayName === 'Jumat';
    let currentMinutes = isFriday ? parseTime(fridayStartTime || '07:00') : parseTime(startTime || '07:00');
    const pDuration = isFriday ? (fridayPeriodDuration || 35) : (periodDuration || 45);
    const bCount = isFriday ? (fridayBreakCount ?? breakCount ?? 0) : (breakCount || 0);
    const bDuration = isFriday ? (fridayBreakDuration ?? breakDuration ?? 15) : (breakDuration || 15);

    for (let i = 0; i < periodIdx; i++) {
      currentMinutes += pDuration;
      if (i === ((isFriday ? (fridayBreak1AfterPeriod ?? break1AfterPeriod) : break1AfterPeriod) - 1) && bCount >= 1) currentMinutes += bDuration;
      if (i === ((isFriday ? (fridayBreak2AfterPeriod ?? break2AfterPeriod) : break2AfterPeriod) - 1) && bCount >= 2) currentMinutes += bDuration;
    }
    
    const startStr = formatTime(currentMinutes);
    const endStr = formatTime(currentMinutes + pDuration);
    return `${startStr} - ${endStr}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.uid) return;
      try {
        const [currRes, userRes] = await Promise.all([
            getCurriculumMasterResult(),
            getTeacherProfileDataResult(profile.uid)
          ]);

        if (currRes.isSuccess) {
          const m = currRes.getValue();
          setIsOpen(!!m.isTimeOffSubmissionOpen);
          if (m.daysPerWeek) setDaysPerWeek(m.daysPerWeek);
          if (m.periodsPerDay) setPeriodsPerDay(m.periodsPerDay);
          if (m.startTime) setStartTime(m.startTime);
          if (m.periodDuration) setPeriodDuration(m.periodDuration);
          if (m.breakCount !== undefined) setBreakCount(m.breakCount);
          if (m.breakDuration) setBreakDuration(m.breakDuration);
          if (m.break1AfterPeriod) setBreak1AfterPeriod(m.break1AfterPeriod);
          if (m.break2AfterPeriod) setBreak2AfterPeriod(m.break2AfterPeriod);
          if (m.fridayStartTime) setFridayStartTime(m.fridayStartTime);
          if (m.fridayPeriodDuration) setFridayPeriodDuration(m.fridayPeriodDuration);
          if (m.fridayBreakCount !== undefined) setFridayBreakCount(m.fridayBreakCount);
          if (m.fridayBreakDuration !== undefined) setFridayBreakDuration(m.fridayBreakDuration);
          if (m.fridayBreak1AfterPeriod !== undefined) setFridayBreak1AfterPeriod(m.fridayBreak1AfterPeriod);
          if (m.fridayBreak2AfterPeriod !== undefined) setFridayBreak2AfterPeriod(m.fridayBreak2AfterPeriod);
        }
        
        if (userRes.isSuccess) {
          const u = userRes.getValue();
          setTimeOff(u.timeOff || []);
        }
      } catch (error) {
        console.error("Error fetching timeoff data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile?.uid]);

  const toggleTimeOff = (dayIdx: number, periodIdx: number) => {
    if (!isOpen) return; // Read-only if closed
    const key = `${dayIdx}-${periodIdx}`;
    if (timeOff.includes(key)) {
      setTimeOff(timeOff.filter(k => k !== key));
    } else {
      setTimeOff([...timeOff, key]);
    }
  };

  const handleSave = async () => {
    if (!profile?.uid) return;
    setSaving(true);
    try {
      const res = await updateTeacherProfileResult(profile.uid, { timeOff: timeOff });
      if (res.isFailure) throw new Error(res.getError());
      alert('Ketersediaan berhasil disimpan!');
    } catch (error) {
      console.error(error);
      alert('Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-10"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 rounded-xl p-5 border border-blue-100 flex items-start space-x-4">
        <Clock className="w-8 h-8 text-blue-500 mt-1" />
        <div>
          <h3 className="text-lg font-bold text-gray-900">Ketersediaan Waktu (Time-Off)</h3>
          <p className="text-gray-600 text-sm mt-1">
            Klik kotak pada grid di bawah ini untuk menandai waktu di mana Anda <strong>TIDAK BISA</strong> mengajar (Warna Merah = Diblokir).
          </p>
          {!isOpen && (
            <div className="mt-3 inline-block bg-yellow-100 border border-yellow-300 text-yellow-800 text-xs px-3 py-1.5 rounded-lg font-medium">
              Sesi pengisian saat ini ditutup. Anda hanya dapat melihat ketersediaan Anda.
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 overflow-x-auto">
        <table className="w-full text-center text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="py-2 px-1 border-r border-gray-200 font-semibold w-24 text-gray-600">Jam Ke-</th>
              {days.map(d => <th key={d} className="py-2 border-r border-gray-200 font-semibold text-gray-600">{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: periodsPerDay }).map((_, periodIdx) => (
              <tr key={periodIdx} className="border-b border-gray-200">
                <td className="py-2 px-1 border-r border-gray-200 font-medium bg-gray-50 align-top">
                  <div className="flex flex-col items-center justify-center space-y-1 h-full pt-1">
                    <span>Jam {periodIdx + 1}</span>
                    <span className="text-[11px] text-blue-600 font-bold tracking-tight">{getTimeRange('Senin', periodIdx)}</span>
                  </div>
                </td>
                {days.map((dayName, dayIdx) => {
                  const isOff = timeOff.includes(`${dayIdx}-${periodIdx}`);
                  return (
                    <td 
                      key={dayIdx} 
                      onClick={() => toggleTimeOff(dayIdx, periodIdx)}
                      className={`border-r border-gray-200 p-1 align-top transition-colors ${isOpen ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'} ${isOff ? 'bg-red-50 hover:bg-red-100' : 'bg-white'}`}
                    >
                      <div className="flex flex-col space-y-1 h-full">
                        {dayName === 'Jumat' && (
                          <span className="text-[10px] text-gray-500 font-mono tracking-tighter">{getTimeRange('Jumat', periodIdx)}</span>
                        )}
                        <div className={`w-full h-12 rounded flex flex-col items-center justify-center transition-all ${isOff ? 'bg-red-500 text-white shadow-inner scale-95' : 'border border-gray-200 text-gray-300'}`}>
                          {isOff && <span className="text-xs font-bold">BLOKIR</span>}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isOpen && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center shadow-sm disabled:opacity-50"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : (
              <CheckCircle className="w-5 h-5 mr-2" />
            )}
            Simpan Ketersediaan
          </button>
        </div>
      )}
    </div>
  );
}
