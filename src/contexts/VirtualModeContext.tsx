import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { virtualDatabase, VirtualMutationLog, MockNetworkLog } from '../foundation/sandbox/VirtualDatabase';

interface VirtualContextType {
  isVirtualMode: boolean;
  toggleVirtualMode: (status: boolean) => Promise<void>;
  resetVirtualSandbox: () => Promise<void>;
  resetVirtualDatabase: () => Promise<void>;
  syncFromLiveDatabase: () => Promise<void>;
  exportVirtualScenario: () => void;
  exportSandbox: () => Promise<string>;
  importVirtualScenario: (jsonStr: string) => Promise<void>;
  importSandbox: (jsonStr: string) => Promise<void>;
  clearMutationLogs: () => void;
  clearNetworkLogs: () => void;
  isVirtualLoading: boolean;
  loadingProgress: string;
  isQuotaExceeded: boolean;
  quotaErrorMessage: string;
  mutationLogs: VirtualMutationLog[];
  networkLogs: MockNetworkLog[];
  sandboxedTables: Record<string, Record<string, any>>;
  vMaster: any;
  setVMaster: (data: any) => void;
  vUsers: any[];
  setVUsers: (data: any[]) => void;
  vSchedules: any[];
  setVSchedules: (data: any[]) => void;
}

const VirtualModeContext = createContext<VirtualContextType | null>(null);

export const VirtualModeProvider = ({ children }: { children: ReactNode }) => {
  const [isVirtualMode, setIsVirtualMode] = useState(false);
  const [isVirtualLoading, setIsVirtualLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [quotaErrorMessage, setQuotaErrorMessage] = useState('');
  const [mutationLogs, setMutationLogs] = useState<VirtualMutationLog[]>([]);
  const [networkLogs, setNetworkLogs] = useState<MockNetworkLog[]>([]);
  const [sandboxedTables, setSandboxedTables] = useState<Record<string, Record<string, any>>>({});

  // Legacy state mirrors for existing components
  const [vMaster, setVMasterState] = useState<any>(null);
  const [vUsers, setVUsersState] = useState<any[]>([]);
  const [vSchedules, setVSchedulesState] = useState<any[]>([]);

  const refreshStateFromEngine = useCallback(() => {
    const active = virtualDatabase.isActive();
    setIsVirtualMode(active);
    setIsQuotaExceeded(virtualDatabase.isQuotaExceeded());
    setQuotaErrorMessage(virtualDatabase.getQuotaErrorMessage());

    if (active) {
      const tables = virtualDatabase.getTables();
      setSandboxedTables({ ...tables });
      setMutationLogs(virtualDatabase.getMutationLogs());
      setNetworkLogs(virtualDatabase.getNetworkLogs());

      // Sync legacy properties
      if (tables['curriculum_data']?.['master']) {
        setVMasterState(tables['curriculum_data']['master']);
      }
      if (tables['users']) {
        setVUsersState(Object.values(tables['users']));
      }
      if (tables['schedules']) {
        setVSchedulesState(Object.values(tables['schedules']));
      }
    } else {
      setSandboxedTables({});
      setMutationLogs([]);
      setNetworkLogs([]);
      setVMasterState(null);
      setVUsersState([]);
      setVSchedulesState([]);
    }
  }, []);

  useEffect(() => {
    const initEngine = async () => {
      setIsVirtualLoading(true);
      setLoadingProgress('Memeriksa status Mode Virtual...');
      try {
        await virtualDatabase.init();
        refreshStateFromEngine();
      } catch (e) {
        console.error('Error initializing virtual database:', e);
      } finally {
        setIsVirtualLoading(false);
        setLoadingProgress('');
      }
    };
    initEngine();

    const unsubscribe = virtualDatabase.subscribe(() => {
      refreshStateFromEngine();
    });

    return () => {
      unsubscribe();
    };
  }, [refreshStateFromEngine]);

  const toggleVirtualMode = async (status: boolean) => {
    setIsVirtualLoading(true);
    try {
      if (status) {
        setLoadingProgress('Menginisialisasi Sandbox & Memuat Data...');
        await virtualDatabase.enable((msg) => setLoadingProgress(msg));
        refreshStateFromEngine();
      } else {
        setLoadingProgress('Menonaktifkan Mode Virtual & Menghapus Sandbox...');
        await virtualDatabase.disable();
        refreshStateFromEngine();
      }
    } catch (e: any) {
      console.error('Error toggling virtual mode:', e);
      // Fallback: force enable sandbox with fallback data
      try {
        await virtualDatabase.enable();
        refreshStateFromEngine();
      } catch (innerErr) {
        console.error('Fatal toggle error:', innerErr);
      }
    } finally {
      setIsVirtualLoading(false);
      setLoadingProgress('');
    }
  };

  const resetVirtualSandbox = async () => {
    setIsVirtualLoading(true);
    setLoadingProgress('Mereset Sandbox ke Data Awal...');
    try {
      await virtualDatabase.reset((msg) => setLoadingProgress(msg));
      refreshStateFromEngine();
    } catch (e: any) {
      console.error('Error resetting sandbox:', e);
    } finally {
      setIsVirtualLoading(false);
      setLoadingProgress('');
    }
  };

  const syncFromLiveDatabase = async () => {
    setIsVirtualLoading(true);
    setLoadingProgress('Menyinkronkan Sandbox dengan Data Live (Mohon tunggu)...');
    try {
      await virtualDatabase.syncFromLiveData((msg) => setLoadingProgress(msg));
      refreshStateFromEngine();
    } catch (e: any) {
      console.error('Error syncing sandbox from live database:', e);
    } finally {
      setIsVirtualLoading(false);
      setLoadingProgress('');
    }
  };

  const exportVirtualScenario = () => {
    try {
      const json = virtualDatabase.exportScenario();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dipowagir-sandbox-scenario-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error('Gagal mengekspor skenario:', e);
    }
  };

  const exportSandbox = async (): Promise<string> => {
    return virtualDatabase.exportScenario();
  };

  const importVirtualScenario = async (jsonStr: string) => {
    setIsVirtualLoading(true);
    setLoadingProgress('Mengimpor skenario simulasi...');
    try {
      await virtualDatabase.importScenario(jsonStr);
      refreshStateFromEngine();
    } catch (e: any) {
      console.error('Import error:', e);
      throw e;
    } finally {
      setIsVirtualLoading(false);
      setLoadingProgress('');
    }
  };

  const clearMutationLogs = () => {
    virtualDatabase.clearMutationLogs();
    refreshStateFromEngine();
  };

  const clearNetworkLogs = () => {
    virtualDatabase.clearNetworkLogs();
    refreshStateFromEngine();
  };

  // Backward compatible setters that update both local state and Sandbox tables
  const setVMaster = (data: any) => {
    setVMasterState(data);
    if (virtualDatabase.isActive()) {
      virtualDatabase.setDoc('curriculum_data', 'master', data);
    }
  };

  const setVUsers = (data: any[]) => {
    setVUsersState(data);
    if (virtualDatabase.isActive()) {
      data.forEach((u) => {
        const docId = u.uid || u.id;
        if (docId) {
          virtualDatabase.setDoc('users', docId, u);
        }
      });
    }
  };

  const setVSchedules = (data: any[]) => {
    setVSchedulesState(data);
    if (virtualDatabase.isActive()) {
      data.forEach((s) => {
        const docId = s.id;
        if (docId) {
          virtualDatabase.setDoc('schedules', docId, s);
        }
      });
    }
  };

  return (
    <VirtualModeContext.Provider
      value={{
        isVirtualMode,
        toggleVirtualMode,
        resetVirtualSandbox,
        resetVirtualDatabase: resetVirtualSandbox,
        syncFromLiveDatabase,
        exportVirtualScenario,
        exportSandbox,
        importVirtualScenario,
        importSandbox: importVirtualScenario,
        clearMutationLogs,
        clearNetworkLogs,
        isVirtualLoading,
        loadingProgress,
        isQuotaExceeded,
        quotaErrorMessage,
        mutationLogs,
        networkLogs,
        sandboxedTables,
        vMaster,
        setVMaster,
        vUsers,
        setVUsers,
        vSchedules,
        setVSchedules
      }}
    >
      {children}
    </VirtualModeContext.Provider>
  );
};

export const useVirtualMode = () => {
  const context = useContext(VirtualModeContext);
  if (!context) throw new Error('Must be used within VirtualModeProvider');
  return context;
};
