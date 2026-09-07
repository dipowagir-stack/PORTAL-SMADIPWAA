import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface WithPermissionProps {
  permission: string | string[];
  requireAll?: boolean;
  redirectTo?: string;
}

export const withPermission = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  { permission, requireAll = false, redirectTo = '/' }: WithPermissionProps
) => {
  return (props: P) => {
    const { hasPermission, profile } = useAuth();
    
    const permissions = Array.isArray(permission) ? permission : [permission];
    
    let isAllowed = false;

    if (requireAll) {
      isAllowed = permissions.every(p => hasPermission(p));
    } else {
      isAllowed = permissions.some(p => hasPermission(p));
    }


    if (!isAllowed) {
      return <Navigate to={redirectTo} replace />;
    }

    return <WrappedComponent {...props} />;
  };
};
