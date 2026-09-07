import React, { useState, useEffect } from 'react';
import { PackageCheck, Loader2 } from 'lucide-react';
import { useTenant } from '../../foundation/tenant/TenantContext';
import { tenantModuleService } from '../../foundation/modules/TenantModuleService';
import { entitlementService } from '../../foundation/tenant/EntitlementService';
import { TenantModule } from '../../foundation/modules/types';

export default function TenantModulesPanel() {
  const { securityContext } = useTenant();
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModules = async () => {
      if (!securityContext) return;
      setLoading(true);
      const res = await entitlementService.getTenantEntitlement(securityContext.tenantId, securityContext);
      if (res.isSuccess) {
        setActiveModules(res.getValue().activeModules);
      }
      setLoading(false);
    };
    fetchModules();
  }, [securityContext]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 flex items-center">
          <PackageCheck className="w-5 h-5 mr-2 text-blue-600" />
          Modul Berlisensi
        </h3>
        <p className="text-sm text-gray-500 mt-1">Daftar modul yang tersedia untuk institusi Anda berdasarkan langganan aktif.</p>
      </div>
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {activeModules.map(mod => (
              <div key={mod} className="border border-green-200 bg-green-50 rounded-lg p-4 flex items-center justify-between">
                <span className="font-bold text-green-900 capitalize">{mod}</span>
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
              </div>
            ))}
            {activeModules.length === 0 && (
              <div className="col-span-full text-center text-gray-500">Belum ada modul yang aktif.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
