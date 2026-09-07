import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../foundation/tenant/TenantContext';
import AccessDenied from '../../pages/errors/AccessDenied';

export const TenantGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading: authLoading } = useAuth();
  const { activeTenant, loading: tenantLoading } = useTenant();
  const location = useLocation();
  
  if (authLoading || tenantLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>;
  }
  
  if (!user || !profile) {
    const routingMode = localStorage.getItem('tenantRoutingMode');
    const lastSubdomain = localStorage.getItem('lastTenantSubdomain');
    
    let redirectPath = `/login?redirect=${encodeURIComponent(location.pathname)}`;
    
    if (routingMode === 'saas' && lastSubdomain) {
      redirectPath = `/s/${lastSubdomain}/login?redirect=${encodeURIComponent(location.pathname)}`;
    }
    
    return <Navigate to={redirectPath} replace />;
  }
  
  if (!activeTenant) {
    const isPlatformAdmin = profile?.role === 'platform_admin' || 
                              profile?.role === 'platform_engineer';
    
    if (!isPlatformAdmin) {
      return <AccessDenied reason="NO_MEMBERSHIP" />;
    }
  }
  
  return <>{children}</>;
};
