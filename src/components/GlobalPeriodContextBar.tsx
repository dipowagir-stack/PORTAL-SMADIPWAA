import React, { useState, useEffect } from 'react';
import { usePeriod } from '../contexts/PeriodContext';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, ChevronDown, Clock, AlertTriangle } from 'lucide-react';
import { AcademicYear, AcademicSemesterMaster } from '../domains/academic/types';
import { academicYearService, academicSemesterService } from '../domains/academic/services';

export default function GlobalPeriodContextBar() {
  const { profile } = useAuth();
  const { activeYear, activeSemester, viewingYear, viewingSemester, isReadOnly, setViewingContext, resetToActive, loading } = usePeriod();
  
  const [isOpen, setIsOpen] = useState(false);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<Record<string, AcademicSemesterMaster[]>>({});

  useEffect(() => {
    // Only load full history if user is staff/teacher/admin, otherwise parent/student just see active.
    const isStaff = ['super_admin', 'admin', 'curriculum', 'tu', 'bendahara', 'teacher'].includes(profile?.role || '');
    if (isStaff && isOpen && years.length === 0) {
      loadHistory();
    }
  }, [isOpen, profile?.role]);

  const loadHistory = async () => {
    const yRes = await academicYearService.getAll();
    const sRes = await academicSemesterService.getAll();
    
    if (yRes.isSuccess && sRes.isSuccess) {
      const sortedYears = yRes.getValue().sort((a, b) => b.startDate - a.startDate);
      setYears(sortedYears);
      
      const semMap: Record<string, AcademicSemesterMaster[]> = {};
      sRes.getValue().forEach(s => {
        if (!semMap[s.academicYearId]) semMap[s.academicYearId] = [];
        semMap[s.academicYearId].push(s);
      });
      setSemesters(semMap);
    }
  };

  const isStaff = ['super_admin', 'admin', 'curriculum', 'tu', 'bendahara', 'teacher'].includes(profile?.role || '');

  if (loading) {
    return <div className="h-10 bg-gray-50 border-b border-gray-200 animate-pulse"></div>;
  }

  if (!viewingYear || !viewingSemester) {
    return null; // Not initialized or no periods
  }

  const isViewingPast = viewingYear.id !== activeYear?.id || viewingSemester.id !== activeSemester?.id;

  return (
    <div className="relative z-20">
      {/* Top Banner (If ReadOnly/Past) */}
      {isViewingPast && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center text-sm font-medium text-amber-800">
          <AlertTriangle className="w-4 h-4 mr-2 text-amber-600" />
          Anda sedang melihat arsip periode masa lalu ({viewingYear.name} - {viewingSemester.type}). Semua data bersifat Read-Only.
          <button 
            onClick={resetToActive}
            className="ml-4 text-amber-900 underline hover:text-amber-700"
          >
            Kembali ke Periode Aktif
          </button>
        </div>
      )}

      {/* Main Bar inside Navbar (or just below it) */}
      <div className={`border-b ${isViewingPast ? 'bg-amber-100/30 border-amber-200' : 'bg-white border-gray-200'} px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between`}>
        <div className="flex items-center text-sm">
          <Calendar className={`w-4 h-4 mr-2 ${isViewingPast ? 'text-amber-600' : 'text-blue-600'}`} />
          <span className="text-gray-600 mr-2">Konteks Data:</span>
          <span className={`font-bold ${isViewingPast ? 'text-amber-900' : 'text-gray-900'}`}>
            TA {viewingYear.name} • Semester {viewingSemester.type}
          </span>
          {!isViewingPast && (
             <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
               <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
               Sistem Aktif
             </span>
          )}
        </div>

        {isStaff && (
          <div className="relative">
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-300 rounded-md px-3 py-1.5 shadow-sm"
            >
              <Clock className="w-4 h-4 mr-2" />
              Mesin Waktu
              <ChevronDown className="w-4 h-4 ml-2" />
            </button>

            {isOpen && (
              <div className="absolute right-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pilih Konteks Waktu</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {years.map(y => (
                    <div key={y.id} className="px-2 py-1">
                      <div className="text-xs font-semibold text-gray-400 px-2 py-1">{y.name} {y.id === activeYear?.id && '(Aktif)'}</div>
                      {(semesters[y.id!] || []).map(s => (
                        <button
                          key={s.id}
                          onClick={() => {
                            setViewingContext(y, s);
                            setIsOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm rounded-md transition-colors ${
                            viewingSemester?.id === s.id 
                              ? 'bg-blue-50 text-blue-700 font-bold' 
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          Semester {s.type} {s.state === 'ACTIVE' && '✨'} {s.state === 'ARCHIVED' && '🔒'}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
