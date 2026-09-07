import React from 'react';
import { useLocation, Navigate, useOutletContext } from 'react-router-dom';
import { TenantPublicProfile } from '../../../domains/website/types';

export default function PublicPages() {
  const location = useLocation();
  const { basePath } = useOutletContext<{ basePath: string }>();
  
  // If we don't recognize the route on public layout, 
  // maybe we map it to /halaman/:slug ?
  const path = location.pathname.replace(basePath, '').replace(/^\//, '');
  
  if (path && path !== '') {
    return <Navigate to={`${basePath}/halaman/${path}`} replace />;
  }

  return <Navigate to={basePath || '/'} replace />;
}
