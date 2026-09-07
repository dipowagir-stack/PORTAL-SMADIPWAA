import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Building, Server, Settings, Activity, FileText, Grid, CreditCard, AlertCircle, Eye, Globe, LayoutTemplate } from 'lucide-react';
import TenantListPanel from './TenantListPanel';
import PlatformReleasePanel from '../superadmin/PlatformReleasePanel';
import ModuleCatalogPanel from '../superadmin/ModuleCatalogPanel';
import PlatformHealthSummary from './PlatformHealthSummary';
import PlatformOverviewPanel from './PlatformOverviewPanel';
import PlatformDomainsPanel from './PlatformDomainsPanel';
import SaasWebsitePanel from './SaasWebsitePanel';
import PlatformTeamPanel from './PlatformTeamPanel';

export default function PlatformHubDashboard() {
  const { profile, activeRole, hasPermission } = useAuth();
  
  // Platform HUB access requires platform role + platform permission, or explicit legacy compatibility
  const isPlatformRole = activeRole === 'platform_admin' || activeRole === 'platform_support' || activeRole === 'platform_engineer';
  const isSuperAdminCompat = activeRole === 'super_admin'; // Legacy super_admin compatibility mapped explicitly
  const hasPlatformAccess = isPlatformRole || hasPermission('platform:access') || isSuperAdminCompat;

  if (!hasPlatformAccess) {
    return (
      <div className="flex justify-center items-center h-64 text-red-600 font-bold">
        Akses Ditolak: Halaman ini memerlukan permission Platform HUB.
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-indigo-900 rounded-xl shadow-lg border border-indigo-800 p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4 text-white">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Server className="w-6 h-6 text-indigo-300" />
            EduOS Platform HUB
          </h2>
          <p className="text-indigo-200 mt-1 text-sm">Control Plane untuk mengelola tenant, subscription, modul, dan rilis aplikasi pusat.</p>
        </div>
        
        <div className="flex items-center space-x-3 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0">
          <div className="flex bg-indigo-950 p-1 rounded-lg border border-indigo-800 shrink-0">
            {[
              { id: 'overview', icon: <Grid className="w-4 h-4 mr-2" />, label: 'Overview', allowedRoles: ['platform_admin', 'platform_support', 'platform_engineer'] },
              { id: 'tenants', icon: <Building className="w-4 h-4 mr-2" />, label: 'Schools / Tenants', allowedRoles: ['platform_admin', 'platform_support', 'platform_engineer'] },
              { id: 'domains', icon: <Globe className="w-4 h-4 mr-2" />, label: 'Custom Domains', allowedRoles: ['platform_admin', 'platform_support'] },
              { id: 'subscriptions', icon: <CreditCard className="w-4 h-4 mr-2" />, label: 'Subscriptions', allowedRoles: ['platform_admin'] },
              { id: 'modules', icon: <Settings className="w-4 h-4 mr-2" />, label: 'Modules', allowedRoles: ['platform_admin', 'platform_engineer'] },
              { id: 'releases', icon: <Activity className="w-4 h-4 mr-2" />, label: 'Releases', allowedRoles: ['platform_admin', 'platform_engineer'] },
              { id: 'health', icon: <Shield className="w-4 h-4 mr-2" />, label: 'Health', allowedRoles: ['platform_admin', 'platform_engineer'] },
              { id: 'issues', icon: <AlertCircle className="w-4 h-4 mr-2" />, label: 'Issues', allowedRoles: ['platform_admin', 'platform_engineer', 'platform_support'] },
              { id: 'website', icon: <LayoutTemplate className="w-4 h-4 mr-2" />, label: 'Website SaaS', allowedRoles: ['platform_admin', 'platform_support'] },
              { id: 'audit', icon: <FileText className="w-4 h-4 mr-2" />, label: 'Audit', allowedRoles: ['platform_admin', 'platform_support'] },
              { id: 'settings', icon: <Settings className="w-4 h-4 mr-2" />, label: 'Platform Team', allowedRoles: ['platform_admin'] },
            ].filter(tab => tab.allowedRoles.includes(activeRole || 'platform_admin') || isSuperAdminCompat).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-indigo-300 hover:text-white hover:bg-indigo-800'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === 'overview' && <PlatformOverviewPanel />}
      {activeTab === 'tenants' && <TenantListPanel />}
      {activeTab === 'domains' && <PlatformDomainsPanel />}
      {activeTab === 'subscriptions' && (
        <div className="bg-white p-8 text-center rounded-xl border border-gray-200 text-gray-500">
           Platform Subscriptions List (Coming Soon - Manage all active plans)
        </div>
      )}
      {activeTab === 'modules' && <ModuleCatalogPanel />}
      {activeTab === 'releases' && <PlatformReleasePanel />}
      {activeTab === 'health' && <PlatformHealthSummary />}
      {activeTab === 'issues' && (
        <div className="bg-white p-8 text-center rounded-xl border border-gray-200 text-gray-500">
           Platform Issues Overview (Coming Soon)
        </div>
      )}
      {activeTab === 'website' && <SaasWebsitePanel />}
      {activeTab === 'audit' && (
        <div className="bg-white p-8 text-center rounded-xl border border-gray-200 text-gray-500">
          Platform Audit Module (Coming Soon)
        </div>
      )}
      {activeTab === 'settings' && (
        <PlatformTeamPanel />
      )}
    </div>
  );
}
