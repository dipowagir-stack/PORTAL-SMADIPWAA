import React, { useEffect, useState } from 'react';
import { versionService } from '../foundation/release/VersionService';
import { UpdateAvailability } from '../foundation/release/types';
import { DownloadCloud, X } from 'lucide-react';

export default function UpdatePrompt() {
  const [updateStatus, setUpdateStatus] = useState<UpdateAvailability | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const result = await versionService.isUpdateAvailable();
        if (result.isSuccess) {
          setUpdateStatus(result.getValue());
        }
      } catch (error) {
        console.error('Failed to check for updates', error);
      } finally {
        setLoading(false);
      }
    };

    checkUpdate();
    
    // Check every hour
    const interval = setInterval(checkUpdate, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdate = () => {
    window.location.reload();
  };

  if (loading || !updateStatus?.updateAvailable || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border border-blue-200 rounded-lg shadow-xl p-4 max-w-sm w-full">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3 text-blue-600">
          <DownloadCloud className="w-6 h-6" />
          <h3 className="font-semibold">Versi Baru Tersedia</h3>
        </div>
        {!updateStatus.forceUpdate && (
          <button 
            onClick={() => setDismissed(true)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      
      <div className="mt-2 text-sm text-gray-600">
        <p>Aplikasi telah diperbarui ke versi <strong>{updateStatus.latestVersion}</strong>.</p>
        {updateStatus.releaseNotes && (
          <div className="mt-2 text-xs bg-gray-50 p-2 rounded max-h-24 overflow-y-auto">
            {updateStatus.releaseNotes}
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end space-x-2">
        {!updateStatus.forceUpdate && (
          <button 
            onClick={() => setDismissed(true)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Nanti
          </button>
        )}
        <button 
          onClick={handleUpdate}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          {updateStatus.forceUpdate ? 'Update Sekarang (Wajib)' : 'Muat Ulang & Update'}
        </button>
      </div>
    </div>
  );
}
