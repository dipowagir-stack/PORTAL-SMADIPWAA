import React, { useState, useEffect } from 'react';
import { Package, Power, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { moduleCatalogService } from '../../foundation/modules/ModuleCatalogService';
import { PlatformModule } from '../../foundation/modules/types';

export default function ModuleCatalogPanel() {
  const [modules, setModules] = useState<PlatformModule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModules = async () => {
    setLoading(true);
    const res = await moduleCatalogService.getAllModules();
    if (res.isSuccess) {
      setModules(res.getValue());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const handleSeed = async () => {
    setLoading(true);
    await moduleCatalogService.seedInitialModules();
    await fetchModules();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Package className="w-6 h-6 mr-2 text-blue-600" />
            Platform Module Catalog
          </h2>
          <p className="text-sm text-gray-500 mt-1">Manage global available modules and feature flags.</p>
        </div>
        <button 
          onClick={handleSeed}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center"
        >
          {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Power className="w-4 h-4 mr-2" />}
          Seed Default Modules
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
            <tr>
              <th className="px-6 py-3 font-semibold">Code</th>
              <th className="px-6 py-3 font-semibold">Name</th>
              <th className="px-6 py-3 font-semibold">Version</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 font-semibold">Dependencies</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {modules.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No modules found. Click Seed to initialize.
                </td>
              </tr>
            ) : (
              modules.map((mod) => (
                <tr key={mod.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono font-bold text-blue-600">{mod.code}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{mod.name}</td>
                  <td className="px-6 py-4 text-gray-600">{mod.version}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      mod.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {mod.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {mod.dependencies.length > 0 ? mod.dependencies.join(', ') : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
