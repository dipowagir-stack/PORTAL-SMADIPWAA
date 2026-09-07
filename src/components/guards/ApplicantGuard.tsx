import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../pages/errors/AccessDenied';

export const ApplicantGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>;
  }
  
  if (!user || !profile) {
    return <Navigate to={`/ppdb/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  
  if (profile.role !== 'applicant') {
    return <AccessDenied reason="APPLICANT_ACCESS_DENIED" />;
  }
  
  return <>{children}</>;
};
