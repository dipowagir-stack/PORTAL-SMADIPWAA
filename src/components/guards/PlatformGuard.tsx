import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../pages/errors/AccessDenied';

export const PlatformGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>;
  }
  
  if (!user || !profile) {
    return <Navigate to="/platform/login" replace />;
  }
  
  const isPlatformUser = ['platform_admin', 'platform_support', 'platform_engineer'].includes(profile.role || '');
  
  if (!isPlatformUser) {
    return <AccessDenied reason="PLATFORM_ACCESS_DENIED" />;
  }
  
  return <>{children}</>;
};
