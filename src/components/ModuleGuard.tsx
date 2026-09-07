import React from 'react';
import { useTenant } from '../foundation/tenant/TenantContext';

interface ModuleGuardProps {
  moduleCode: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ModuleGuard({ moduleCode, children, fallback }: ModuleGuardProps) {
  const { entitlement, loading } = useTenant();

  if (loading) return null;

  const hasAccess = entitlement?.activeModules?.includes(moduleCode) ?? false;

  if (!hasAccess) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center bg-gray-50 rounded-xl border border-gray-100 my-8 max-w-2xl mx-auto">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Modul Tidak Tersedia</h3>
        <p className="text-gray-500 max-w-md">
          Modul <strong>{moduleCode}</strong> belum diaktifkan atau tidak termasuk dalam paket langganan saat ini.
          Silakan hubungi Administrator Platform untuk informasi lebih lanjut.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
