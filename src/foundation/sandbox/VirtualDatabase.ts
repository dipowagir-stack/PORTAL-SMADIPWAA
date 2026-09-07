import { get, set, del } from 'idb-keyval';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { DEFAULT_FALLBACK_SANDBOX_DATA } from './defaultSandboxData';

export interface VirtualMutationLog {
  id: string;
  timestamp: string;
  type?: 'CREATE' | 'UPDATE' | 'DELETE';
  operation?: 'CREATE' | 'UPDATE' | 'DELETE';
  collection: string;
  docId: string;
  summary?: string;
  payload?: any;
  data?: any;
}

export interface MockNetworkLog {
  id: string;
  timestamp: string;
  service?: 'WHATSAPP' | 'EMAIL' | 'SMS' | 'WEBHOOK' | 'API';
  method?: string;
  url?: string;
  target?: string;
  message?: string;
  payload?: any;
  status: 'MOCKED_INTERCEPTED';
}

const IDB_MODE_KEY = 'virtualMode';
const IDB_TABLES_KEY = 'virtual_db_tables';
const IDB_MUTATIONS_KEY = 'virtual_mutation_logs';
const IDB_NETWORK_KEY = 'virtual_network_logs';
const IDB_QUOTA_KEY = 'virtual_quota_warning';

export const CORE_SANDBOX_COLLECTIONS = [
  'curriculum_data',
  'users',
  'schedules',
  'settings',
  'academic_periods',
  'exam_rooms',
  'exam_schedules',
  'finance_billings',
  'finance_payments',
  'finance_ledgers',
  'invoices',
  'payments',
  'admission_waves',
  'admission_applicants',
  'admission_document_requirements',
  'admission_audits',
  'parents',
  'parent_relations',
  'parent_invitations',
  'parent_approvals',
  'parent_threads',
  'parent_messages',
  'teacher_tools',
  'letter_templates',
  'letters',
  'doc_templates',
  'doc_items',
  'audit_logs',
  'students',
  'student_attendances',
  'journals',
  'ketersediaan',
  'role_permissions',
  'user_roles',
  'supervision_sessions',
  'notifications'
];

type ChangeListener = (collection: string, action: string, data?: any) => void;

class VirtualDatabaseEngine {
  private active: boolean = false;
  private tables: Record<string, Record<string, any>> = {};
  private mutationLogs: VirtualMutationLog[] = [];
  private networkLogs: MockNetworkLog[] = [];
  private listeners: Set<ChangeListener> = new Set();
  private originalFetch: typeof window.fetch | null = null;
  private initialized: boolean = false;
  private quotaExceeded: boolean = false;
  private quotaErrorMessage: string = '';

  async init(): Promise<boolean> {
    if (this.initialized) return this.active;
    try {
      const savedMode = await get(IDB_MODE_KEY);
      if (savedMode === 'true') {
        this.active = true;
        const savedTables = await get(IDB_TABLES_KEY);
        if (savedTables && typeof savedTables === 'object') {
          this.tables = savedTables;
        } else {
          this.tables = { ...DEFAULT_FALLBACK_SANDBOX_DATA };
        }
        const savedMutations = await get(IDB_MUTATIONS_KEY);
        if (Array.isArray(savedMutations)) {
          this.mutationLogs = savedMutations;
        }
        const savedNetwork = await get(IDB_NETWORK_KEY);
        if (Array.isArray(savedNetwork)) {
          this.networkLogs = savedNetwork;
        }
        const savedQuota = await get(IDB_QUOTA_KEY);
        if (savedQuota) {
          this.quotaExceeded = true;
          this.quotaErrorMessage = String(savedQuota);
        }
        this.setupNetworkInterceptor();
      }
    } catch (e) {
      console.error('[VirtualDB] Init error:', e);
      this.tables = { ...DEFAULT_FALLBACK_SANDBOX_DATA };
    }
    this.initialized = true;
    return this.active;
  }

  isActive(): boolean {
    return this.active;
  }

  isQuotaExceeded(): boolean {
    return this.quotaExceeded;
  }

  getQuotaErrorMessage(): string {
    return this.quotaErrorMessage;
  }

  getTables(): Record<string, Record<string, any>> {
    return this.tables;
  }

  getMutationLogs(): VirtualMutationLog[] {
    return [...this.mutationLogs];
  }

  getNetworkLogs(): MockNetworkLog[] {
    return [...this.networkLogs];
  }

  clearMutationLogs(): void {
    this.mutationLogs = [];
    this.persistLogs();
    this.notifyListeners('*', 'CLEAR_LOGS');
  }

  clearNetworkLogs(): void {
    this.networkLogs = [];
    this.persistLogs();
    this.notifyListeners('*', 'CLEAR_NETWORK');
  }

  subscribe(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(collection: string, action: string, data?: any) {
    this.listeners.forEach((fn) => {
      try {
        fn(collection, action, data);
      } catch (err) {
        console.error('[VirtualDB] Listener notification error:', err);
      }
    });
  }

  private async persistTables() {
    try {
      await set(IDB_TABLES_KEY, this.tables);
      // Also sync legacy keys for backward compatibility
      if (this.tables['curriculum_data'] && this.tables['curriculum_data']['master']) {
        await set('vMaster', this.tables['curriculum_data']['master']);
      }
      if (this.tables['users']) {
        await set('vUsers', Object.values(this.tables['users']));
      }
      if (this.tables['schedules']) {
        await set('vSchedules', Object.values(this.tables['schedules']));
      }
    } catch (e) {
      console.error('[VirtualDB] Persist error:', e);
    }
  }

  private async persistLogs() {
    try {
      await set(IDB_MUTATIONS_KEY, this.mutationLogs.slice(0, 300));
      await set(IDB_NETWORK_KEY, this.networkLogs.slice(0, 300));
    } catch (e) {
      console.error('[VirtualDB] Log persist error:', e);
    }
  }

  private setupNetworkInterceptor() {
    if (typeof window === 'undefined') return;
    if (!this.originalFetch) {
      this.originalFetch = window.fetch;
    }

    const self = this;
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      const urlString = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);

      if (self.active && (urlString.includes('/api/send-wa') || urlString.includes('/api/notify'))) {
        let payload: any = {};
        try {
          if (init?.body) {
            payload = JSON.parse(init.body as string);
          }
        } catch {
          payload = init?.body;
        }

        self.logNetworkCall({
          service: 'WHATSAPP',
          method: init?.method || 'POST',
          url: urlString,
          target: payload.target || payload.phone || payload.recipient || 'Grup/Nomor Kontak',
          message: payload.message || payload.text || 'Pesan Notifikasi',
          payload
        });

        // Return a mock successful Response
        return new Response(
          JSON.stringify({
            success: true,
            mocked: true,
            status: 'virtual_mode_intercepted',
            message: 'Mode Virtual Aktif: Pesan berhasil disimulasikan tanpa mengirim ke nomor fisik asli.'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return self.originalFetch!.apply(this, [input, init]);
    };
  }

  private restoreNetwork() {
    if (this.originalFetch && typeof window !== 'undefined') {
      window.fetch = this.originalFetch;
      this.originalFetch = null;
    }
  }

  logMutation(log: {
    type?: 'CREATE' | 'UPDATE' | 'DELETE';
    operation?: 'CREATE' | 'UPDATE' | 'DELETE';
    collection: string;
    docId: string;
    summary?: string;
    payload?: any;
    data?: any;
  }) {
    const op = log.operation || log.type || 'UPDATE';
    const entry: VirtualMutationLog = {
      id: 'mut_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type: op,
      operation: op,
      collection: log.collection,
      docId: log.docId,
      summary: log.summary,
      payload: log.payload || log.data,
      data: log.data || log.payload
    };
    this.mutationLogs.unshift(entry);
    if (this.mutationLogs.length > 300) this.mutationLogs.pop();
    this.persistLogs();
  }

  logNetworkCall(log: {
    service?: 'WHATSAPP' | 'EMAIL' | 'SMS' | 'WEBHOOK' | 'API';
    method?: string;
    url?: string;
    target?: string;
    message?: string;
    payload?: any;
  }) {
    const entry: MockNetworkLog = {
      id: 'net_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      status: 'MOCKED_INTERCEPTED',
      service: log.service || 'API',
      method: log.method || 'POST',
      url: log.url || '/api/send-wa',
      target: log.target || 'Recipient',
      message: log.message,
      payload: log.payload
    };
    this.networkLogs.unshift(entry);
    if (this.networkLogs.length > 300) this.networkLogs.pop();
    this.persistLogs();
  }

  async enable(onProgress?: (msg: string) => void): Promise<void> {
    this.active = true;
    await set(IDB_MODE_KEY, 'true');
    this.setupNetworkInterceptor();

    onProgress?.('Menginisialisasi Sandbox dengan Data Simulasi...');
    this.tables = { ...DEFAULT_FALLBACK_SANDBOX_DATA };
    await this.persistTables();
    this.notifyListeners('*', 'ENABLE_DEFAULT');

    this.logMutation({
      type: 'CREATE',
      operation: 'CREATE',
      collection: 'system',
      docId: 'sandbox_session',
      summary: 'Mode Virtual Sandbox aktif (Menggunakan Data Simulasi Default).'
    });
  }

  async syncFromLiveData(onProgress?: (msg: string) => void): Promise<void> {
    onProgress?.('Mengambil data terbaru dari database live...');
    await this.snapshotLiveDatabase(onProgress);
    this.logMutation({
      type: 'UPDATE',
      operation: 'UPDATE',
      collection: 'system',
      docId: 'sandbox_sync',
      summary: 'Sandbox berhasil disinkronisasi dengan database Live produksi.'
    });
  }

  async disable(): Promise<void> {
    this.active = false;
    this.restoreNetwork();
    await del(IDB_MODE_KEY);
    await del(IDB_TABLES_KEY);
    await del(IDB_MUTATIONS_KEY);
    await del(IDB_NETWORK_KEY);
    await del(IDB_QUOTA_KEY);
    await del('vMaster');
    await del('vUsers');
    await del('vSchedules');
    this.tables = {};
    this.mutationLogs = [];
    this.networkLogs = [];
    this.quotaExceeded = false;
    this.quotaErrorMessage = '';
    this.notifyListeners('*', 'DISABLE');
  }

  async reset(onProgress?: (msg: string) => void): Promise<void> {
    onProgress?.('Mereset Sandbox ke Kondisi Awal (Data Simulasi)...');
    this.tables = { ...DEFAULT_FALLBACK_SANDBOX_DATA };
    this.mutationLogs = [];
    this.networkLogs = [];
    await this.persistTables();
    await this.persistLogs();
    
    this.logMutation({
      type: 'UPDATE',
      operation: 'UPDATE',
      collection: 'system',
      docId: 'sandbox_reset',
      summary: 'Sandbox berhasil di-reset ulang ke Data Simulasi Bawaan.'
    });
    this.notifyListeners('*', 'RESET');
  }

  async snapshotLiveDatabase(onProgress?: (msg: string) => void): Promise<void> {
    const newTables: Record<string, Record<string, any>> = {};
    let quotaHit = false;
    let quotaMsg = '';

    for (const colName of CORE_SANDBOX_COLLECTIONS) {
      try {
        onProgress?.(`Memuat koleksi: ${colName}...`);
        if (colName === 'curriculum_data') {
          const masterSnap = await getDoc(doc(db, 'curriculum_data', 'master'));
          if (masterSnap.exists()) {
            newTables['curriculum_data'] = {
              master: { id: 'master', ...masterSnap.data() }
            };
          }
        } else if (colName === 'settings') {
          const globalSnap = await getDoc(doc(db, 'settings', 'global'));
          if (globalSnap.exists()) {
            newTables['settings'] = {
              global: { id: 'global', ...globalSnap.data() }
            };
          }
        } else {
          const snap = await getDocs(collection(db, colName));
          newTables[colName] = {};
          snap.forEach((d) => {
            newTables[colName][d.id] = { id: d.id, ...d.data() };
          });
        }
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (msg.includes('Quota exceeded') || msg.includes('quota metric') || msg.includes('resource-exhausted')) {
          quotaHit = true;
          quotaMsg = msg;
        }
        console.warn(`[VirtualDB] Snapshot fallback on ${colName}:`, err);
        if (!newTables[colName]) newTables[colName] = {};
      }
    }

    // Check if quota was hit or if all collections are empty -> Populate from rich DEFAULT_FALLBACK_SANDBOX_DATA
    this.quotaExceeded = quotaHit;
    this.quotaErrorMessage = quotaMsg;
    if (quotaHit) {
      await set(IDB_QUOTA_KEY, quotaMsg);
    } else {
      await del(IDB_QUOTA_KEY);
    }

    // Ensure all critical collections have complete realistic seed fallback data
    for (const [col, docs] of Object.entries(DEFAULT_FALLBACK_SANDBOX_DATA)) {
      if (!newTables[col] || Object.keys(newTables[col]).length === 0) {
        newTables[col] = { ...docs };
      }
    }

    this.tables = newTables;
    await this.persistTables();
    this.notifyListeners('*', 'SNAPSHOT');
  }

  // --- CRUD Operations in Virtual Sandbox ---

  async getDoc(colName: string, docId: string): Promise<any | null> {
    if (!this.tables[colName]) {
      // Check fallback data first
      if (DEFAULT_FALLBACK_SANDBOX_DATA[colName] && DEFAULT_FALLBACK_SANDBOX_DATA[colName][docId]) {
        this.tables[colName] = this.tables[colName] || {};
        this.tables[colName][docId] = DEFAULT_FALLBACK_SANDBOX_DATA[colName][docId];
        this.persistTables();
        return this.tables[colName][docId];
      }

      // Lazy snapshot single doc from Live if collection not loaded yet
      try {
        const snap = await getDoc(doc(db, colName, docId));
        if (snap.exists()) {
          this.tables[colName] = this.tables[colName] || {};
          this.tables[colName][docId] = { id: snap.id, ...snap.data() };
          this.persistTables();
          return this.tables[colName][docId];
        }
      } catch (e) {
        console.warn(`[VirtualDB] Lazy getDoc fallback on ${colName}/${docId}:`, e);
      }
      return null;
    }
    return this.tables[colName][docId] || null;
  }

  async getDocs(colName: string, filterFn?: (item: any) => boolean): Promise<any[]> {
    if (!this.tables[colName]) {
      // Lazy fetch collection from Live or Fallback
      if (DEFAULT_FALLBACK_SANDBOX_DATA[colName]) {
        this.tables[colName] = { ...DEFAULT_FALLBACK_SANDBOX_DATA[colName] };
        this.persistTables();
      } else {
        try {
          const snap = await getDocs(collection(db, colName));
          this.tables[colName] = {};
          snap.forEach((d) => {
            this.tables[colName][d.id] = { id: d.id, ...d.data() };
          });
          this.persistTables();
        } catch (e) {
          console.warn(`[VirtualDB] Lazy getDocs fallback on ${colName}:`, e);
          this.tables[colName] = {};
        }
      }
    }
    const items = Object.values(this.tables[colName] || {});
    if (filterFn) {
      return items.filter(filterFn);
    }
    return items;
  }

  async setDoc(colName: string, docId: string, data: any, options?: { merge?: boolean }): Promise<void> {
    this.tables[colName] = this.tables[colName] || {};
    const existing = this.tables[colName][docId] || {};
    const mergedData = options?.merge ? { ...existing, ...data, id: docId } : { ...data, id: docId };
    this.tables[colName][docId] = mergedData;

    this.logMutation({
      type: existing.id ? 'UPDATE' : 'CREATE',
      operation: existing.id ? 'UPDATE' : 'CREATE',
      collection: colName,
      docId,
      summary: `Set dokumen [${colName}/${docId}]`,
      payload: data,
      data
    });

    await this.persistTables();
    this.notifyListeners(colName, 'SET', mergedData);
  }

  async addDoc(colName: string, data: any): Promise<string> {
    this.tables[colName] = this.tables[colName] || {};
    const newId = 'v_' + Math.random().toString(36).substring(2, 9);
    const item = { ...data, id: newId, createdAt: data.createdAt || new Date().toISOString() };
    this.tables[colName][newId] = item;

    this.logMutation({
      type: 'CREATE',
      operation: 'CREATE',
      collection: colName,
      docId: newId,
      summary: `Tambah dokumen baru ke [${colName}]`,
      payload: data,
      data
    });

    await this.persistTables();
    this.notifyListeners(colName, 'ADD', item);
    return newId;
  }

  async updateDoc(colName: string, docId: string, data: any): Promise<void> {
    this.tables[colName] = this.tables[colName] || {};
    const existing = this.tables[colName][docId] || { id: docId };
    const updated = { ...existing, ...data, id: docId, updatedAt: new Date().toISOString() };
    this.tables[colName][docId] = updated;

    this.logMutation({
      type: 'UPDATE',
      operation: 'UPDATE',
      collection: colName,
      docId,
      summary: `Update dokumen [${colName}/${docId}]`,
      payload: data,
      data
    });

    await this.persistTables();
    this.notifyListeners(colName, 'UPDATE', updated);
  }

  async deleteDoc(colName: string, docId: string): Promise<void> {
    if (this.tables[colName] && this.tables[colName][docId]) {
      const deletedData = this.tables[colName][docId];
      delete this.tables[colName][docId];

      this.logMutation({
        type: 'DELETE',
        operation: 'DELETE',
        collection: colName,
        docId,
        summary: `Hapus dokumen [${colName}/${docId}]`,
        payload: deletedData,
        data: deletedData
      });

      await this.persistTables();
      this.notifyListeners(colName, 'DELETE', { id: docId });
    }
  }

  exportScenario(): string {
    const payload = {
      app: 'SMAS Islam Diponegoro Wagir - Sandbox State',
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      tables: this.tables,
      mutationLogs: this.mutationLogs,
      networkLogs: this.networkLogs
    };
    return JSON.stringify(payload, null, 2);
  }

  async importScenario(jsonStr: string): Promise<void> {
    try {
      const data = JSON.parse(jsonStr);
      if (data.tables && typeof data.tables === 'object') {
        this.tables = data.tables;
        this.mutationLogs = Array.isArray(data.mutationLogs) ? data.mutationLogs : [];
        this.networkLogs = Array.isArray(data.networkLogs) ? data.networkLogs : [];
        await this.persistTables();
        await this.persistLogs();
        this.logMutation({
          type: 'UPDATE',
          operation: 'UPDATE',
          collection: 'system',
          docId: 'scenario_imported',
          summary: `Skenario simulasi berhasil diimpor (${Object.keys(this.tables).length} koleksi loaded).`
        });
        this.notifyListeners('*', 'IMPORT');
      } else {
        throw new Error('Format skenario JSON tidak valid.');
      }
    } catch (err: any) {
      console.error('[VirtualDB] Import error:', err);
      throw new Error('Gagal mengimpor file skenario: ' + (err.message || 'File tidak valid'));
    }
  }
}

export const virtualDatabase = new VirtualDatabaseEngine();
