/**
 * Decoupled SchoolSaaS Client API Connector (Replacing Firebase Client SDK)
 * Connects directly to cPanel / Node.js backend with JWT & Multi-Tenant headers.
 */

export interface DecoupledUser {
  uid: string;
  authUid?: string;
  email: string;
  name: string;
  displayName?: string;
  role?: string;
  additionalRoles?: string[];
  tenantId?: string | null;
  waNumber?: string;
  waParentNumber?: string;
  nisn?: string;
  photoUrl?: string;
  photoURL?: string;
  className?: string;
  points?: number;
  status?: string;
}

class ApiClient {
  private tokenKey = 'schoolsaas_jwt_token';
  private userKey = 'schoolsaas_auth_user';
  private tenantKey = 'schoolsaas_active_tenant_id';

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token: string) {
    localStorage.setItem(this.tokenKey, token);
  }

  getSavedUser(): DecoupledUser | null {
    const raw = localStorage.getItem(this.userKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  setSavedUser(user: DecoupledUser | null) {
    if (user) {
      localStorage.setItem(this.userKey, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.userKey);
    }
  }

  getTenantId(): string | null {
    return localStorage.getItem(this.tenantKey) || null;
  }

  setTenantId(tenantId: string | null) {
    if (tenantId) {
      localStorage.setItem(this.tenantKey, tenantId);
    } else {
      localStorage.removeItem(this.tenantKey);
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const tenantId = this.getTenantId();
    if (tenantId) {
      headers['X-Tenant-Id'] = tenantId;
    }
    return headers;
  }

  async login(email: string, password?: string, tenantCode?: string): Promise<{ user: DecoupledUser; token: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, tenantCode }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Gagal login ke sistem.');
    }
    this.setToken(data.token);
    this.setSavedUser(data.user);
    if (data.user.tenantId) {
      this.setTenantId(data.user.tenantId);
    }
    return data;
  }

  async loginGoogle(googlePayload: { email: string; displayName?: string; photoUrl?: string; uid?: string }): Promise<{ user: DecoupledUser; token: string }> {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(googlePayload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Gagal autentikasi Google.');
    }
    this.setToken(data.token);
    this.setSavedUser(data.user);
    return data;
  }

  async logout(): Promise<void> {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  async getMe(): Promise<DecoupledUser | null> {
    const token = this.getToken();
    if (!token) return null;
    try {
      const res = await fetch('/api/auth/me', { headers: this.getHeaders() });
      if (!res.ok) {
        this.logout();
        return null;
      }
      const data = await res.json();
      if (data.success && data.user) {
        this.setSavedUser(data.user);
        return data.user;
      }
      return null;
    } catch {
      return this.getSavedUser();
    }
  }

  // Generic Data Operations
  async getCollection(collectionName: string): Promise<any[]> {
    try {
      const res = await fetch(`/api/data/${collectionName}`, { headers: this.getHeaders() });
      const data = await res.json();
      return data.success ? data.data : [];
    } catch (e) {
      console.warn(`[ApiClient] Failed to fetch collection ${collectionName}:`, e);
      return [];
    }
  }

  async getDocument(collectionName: string, id: string): Promise<any | null> {
    try {
      const res = await fetch(`/api/data/${collectionName}/${id}`, { headers: this.getHeaders() });
      if (!res.ok) return null;
      const data = await res.json();
      return data.success ? data.data : null;
    } catch {
      return null;
    }
  }

  async setDocument(collectionName: string, id: string, docData: any): Promise<any> {
    const res = await fetch(`/api/data/${collectionName}/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(docData),
    });
    return await res.json();
  }

  async addDocument(collectionName: string, docData: any): Promise<any> {
    const res = await fetch(`/api/data/${collectionName}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(docData),
    });
    return await res.json();
  }

  async deleteDocument(collectionName: string, id: string): Promise<any> {
    const res = await fetch(`/api/data/${collectionName}/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return await res.json();
  }
}

export const apiClient = new ApiClient();
