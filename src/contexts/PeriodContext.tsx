import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { periodContextService } from '../domains/academic/periodContext';
import { AcademicYear, AcademicSemesterMaster } from '../domains/academic/types';

interface PeriodContextType {
  activeYear: AcademicYear | null;
  activeSemester: AcademicSemesterMaster | null;
  viewingYear: AcademicYear | null;
  viewingSemester: AcademicSemesterMaster | null;
  isReadOnly: boolean;
  setViewingContext: (year: AcademicYear | null, semester: AcademicSemesterMaster | null) => void;
  resetToActive: () => void;
  loading: boolean;
}

const PeriodContext = createContext<PeriodContextType | undefined>(undefined);

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [activeSemester, setActiveSemester] = useState<AcademicSemesterMaster | null>(null);
  
  const [viewingYear, setViewingYear] = useState<AcademicYear | null>(null);
  const [viewingSemester, setViewingSemester] = useState<AcademicSemesterMaster | null>(null);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivePeriod();
  }, []);

  const fetchActivePeriod = async () => {
    setLoading(true);
    const res = await periodContextService.getActivePeriod();
    if (res.isSuccess) {
      const { academicYear, semester } = res.getValue();
      setActiveYear(academicYear);
      setActiveSemester(semester);
      
      // Default viewing to active
      if (!viewingYear) setViewingYear(academicYear);
      if (!viewingSemester) setViewingSemester(semester);
    }
    setLoading(false);
  };

  const setViewingContext = (year: AcademicYear | null, semester: AcademicSemesterMaster | null) => {
    setViewingYear(year);
    setViewingSemester(semester);
  };

  const resetToActive = () => {
    setViewingYear(activeYear);
    setViewingSemester(activeSemester);
  };

  // If viewing is not the active, it's read only. (Or if it's archived/closed)
  const isReadOnly = (viewingYear?.id !== activeYear?.id) || 
                     (viewingSemester?.id !== activeSemester?.id) || 
                     (viewingSemester?.state === 'CLOSED' || viewingSemester?.state === 'ARCHIVED');

  return (
    <PeriodContext.Provider value={{
      activeYear,
      activeSemester,
      viewingYear,
      viewingSemester,
      isReadOnly,
      setViewingContext,
      resetToActive,
      loading
    }}>
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriod() {
  const context = useContext(PeriodContext);
  if (context === undefined) {
    throw new Error('usePeriod must be used within a PeriodProvider');
  }
  return context;
}
