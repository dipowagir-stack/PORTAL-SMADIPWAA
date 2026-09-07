import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../foundation/tenant/TenantContext';
import { platformHealthService } from '../../foundation/health/PlatformHealthService';
import { PlatformHealthMetadata } from '../../foundation/health/types';
import { Server, Activity, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function PlatformHealthSummary() {
  const { profile } = useAuth();
  const { securityContext } = useTenant();
  const [health, setHealth] = useState<PlatformHealthMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHealth = async () => {
      if (!securityContext) return;
      setLoading(true);
      try {
        const res = await platformHealthService.getPlatformHealth(securityContext);
        if (res.isSuccess) {
          setHealth(res.getValue());
        }
      } catch (e) {
        console.error('Failed to load platform health', e);
      } finally {
        setLoading(false);
      }
    };
    loadHealth();
  }, [securityContext]);

  if (loading) {
     return <div className="animate-pulse bg-gray-100 rounded-xl h-24 mb-6"></div>;
  }

  if (!health) {
     return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
       <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center">
          <div className={`p-3 rounded-lg mr-4 ${health.globalErrorStatus === 'HEALTHY' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
             {health.globalErrorStatus === 'HEALTHY' ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
          </div>
          <div>
             <p className="text-xs text-gray-500 font-medium">Platform Status</p>
             <p className="text-lg font-bold text-gray-900">{health.globalErrorStatus}</p>
          </div>
       </div>

       <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg mr-4">
             <Server className="w-6 h-6" />
          </div>
          <div>
             <p className="text-xs text-gray-500 font-medium">Current Release</p>
             <p className="text-lg font-bold text-gray-900">v{health.currentReleaseVersion}</p>
          </div>
       </div>

       <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-lg mr-4">
             <Activity className="w-6 h-6" />
          </div>
          <div>
             <p className="text-xs text-gray-500 font-medium">Active Features</p>
             <p className="text-lg font-bold text-gray-900">{health.activeFeatureCount}</p>
          </div>
       </div>

       <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-lg mr-4">
             <Clock className="w-6 h-6" />
          </div>
          <div>
             <p className="text-xs text-gray-500 font-medium">Maintenance Mode</p>
             <p className="text-lg font-bold text-gray-900">{health.maintenanceMode ? 'Active' : 'Off'}</p>
          </div>
       </div>
    </div>
  );
}
