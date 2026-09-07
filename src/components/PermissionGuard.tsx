import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface PermissionGuardProps {
  permission: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAll?: boolean;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({ 
  permission, 
  children, 
  fallback = null,
  requireAll = false 
}) => {
  const { hasPermission, profile } = useAuth();

  const permissions = Array.isArray(permission) ? permission : [permission];
  
  let isAllowed = false;
  
  if (requireAll) {
    isAllowed = permissions.every(p => hasPermission(p));
  } else {
    isAllowed = permissions.some(p => hasPermission(p));
  }

  if (isAllowed) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};
