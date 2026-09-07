import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../foundation/tenant/TenantContext';
import { tenantHealthService } from '../../foundation/health/TenantHealthService';
import { TenantHealth } from '../../foundation/health/types';
import { ShieldAlert, CheckCircle, Activity, Box, Settings, Server, AlertTriangle } from 'lucide-react';

interface Props {
  tenantId: string;
}

export default function TenantHealthPanel({ tenantId }: Props) {
  const { profile } = useAuth();
  const { securityContext } = useTenant();
  const [health, setHealth] = useState<TenantHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      if (!securityContext) return;
      setLoading(true);
      try {
        const res = await tenantHealthService.getTenantHealth(tenantId, securityContext);
        if (res.isFailure) {
          setError(res.getError());
        } else {
          setHealth(res.getValue());
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    if (tenantId) fetchHealth();
  }, [tenantId, securityContext]);

  if (loading) return <div className="animate-pulse bg-gray-100 rounded-xl h-48 w-full mt-4"></div>;
  if (error) return <div className="text-red-600 mt-4 text-sm font-medium p-4 bg-red-50 rounded-lg border border-red-200">Failed to load health: {error}</div>;
  if (!health) return null;

  const renderStatus = (status: string) => {
    switch (status) {
      case 'HEALTHY':
      case 'READY':
      case 'CURRENT':
        return <span className="inline-flex items-center text-green-600"><CheckCircle className="w-4 h-4 mr-1" /> {status}</span>;
      case 'WARNING':
      case 'INCOMPLETE':
      case 'UPDATE_AVAILABLE':
        return <span className="inline-flex items-center text-amber-600"><AlertTriangle className="w-4 h-4 mr-1" /> {status}</span>;
      case 'DEGRADED':
      case 'INVALID':
      case 'MIGRATION_REQUIRED':
      case 'BLOCKED':
        return <span className="inline-flex items-center text-red-600"><ShieldAlert className="w-4 h-4 mr-1" /> {status}</span>;
      default:
        return <span className="text-gray-500">{status}</span>;
    }
  };

  return (
    <div className="mt-6 border-t border-gray-100 pt-6">
      <h4 className="text-md font-bold text-gray-900 flex items-center mb-4">
        <Activity className="w-5 h-5 mr-2 text-indigo-500" />
        Tenant Health Metrics
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
           <h5 className="text-sm font-semibold text-gray-700 flex items-center mb-3"><Settings className="w-4 h-4 mr-2" /> Configuration</h5>
           <div className="flex justify-between text-sm mb-2">
             <span className="text-gray-500">Status</span>
             <span className="font-medium">{renderStatus(health.configurationStatus.status)}</span>
           </div>
           {health.configurationStatus.missingRequiredSettings.length > 0 && (
              <div className="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded">
                 Missing: {health.configurationStatus.missingRequiredSettings.join(', ')}
              </div>
           )}
        </div>

        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
           <h5 className="text-sm font-semibold text-gray-700 flex items-center mb-3"><Server className="w-4 h-4 mr-2" /> Release & Compatibility</h5>
           <div className="flex justify-between text-sm mb-2">
             <span className="text-gray-500">Version</span>
             <span className="font-medium">v{health.releaseHealth.currentVersion}</span>
           </div>
           <div className="flex justify-between text-sm">
             <span className="text-gray-500">Status</span>
             <span className="font-medium">{renderStatus(health.releaseHealth.status)}</span>
           </div>
        </div>
      </div>

      <div className="mt-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
         <h5 className="text-sm font-semibold text-gray-700 flex items-center mb-3"><Box className="w-4 h-4 mr-2" /> Modules</h5>
         <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
               <thead className="bg-gray-50 text-gray-500">
                  <tr>
                     <th className="px-3 py-2 text-left font-medium rounded-tl-lg">Module</th>
                     <th className="px-3 py-2 text-left font-medium">Status</th>
                     <th className="px-3 py-2 text-left font-medium">Entitlement</th>
                     <th className="px-3 py-2 text-left font-medium rounded-tr-lg">Compatibility</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                  {health.moduleHealth.map(m => (
                     <tr key={m.moduleCode}>
                        <td className="px-3 py-2 font-medium text-gray-900">{m.moduleCode}</td>
                        <td className="px-3 py-2">{renderStatus(m.status)}</td>
                        <td className="px-3 py-2">{m.entitlement ? 'Yes' : 'No'}</td>
                        <td className="px-3 py-2">{m.compatibility}</td>
                     </tr>
                  ))}
                  {health.moduleHealth.length === 0 && (
                     <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-500">No modules active.</td></tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
