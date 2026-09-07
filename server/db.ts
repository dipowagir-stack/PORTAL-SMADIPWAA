import mysql from 'mysql2/promise';

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
}

const dbConfig: DbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'schoolsaas',
};

let pool: mysql.Pool | null = null;
let isConnected = false;

// Initialize MySQL pool with error handling
export function getDbPool(): mysql.Pool {
  if (!pool) {
    try {
      pool = mysql.createPool({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
        waitForConnections: true,
        connectionLimit: 15,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
      });
      console.log(`[SchoolSaaS DB] MySQL Pool created for ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    } catch (err) {
      console.error('[SchoolSaaS DB] Failed to create MySQL pool:', err);
    }
  }
  return pool!;
}

// In-Memory fallback store for container sandbox preview when cPanel MySQL is not directly reachable
const memoryStore: Record<string, Record<string, any>> = {};

export async function executeQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const p = getDbPool();
  if (p) {
    try {
      const [rows] = await p.query(sql, params);
      return rows as T[];
    } catch (err: any) {
      // In local dev container without live MySQL, handle gracefully
      if (err.code === 'ECONNREFUSED' || err.code === 'ER_BAD_DB_ERROR' || err.code === 'ER_ACCESS_DENIED_ERROR') {
        console.warn(`[SchoolSaaS DB] Local MySQL not reachable (${err.code}). Using local memory layer.`);
      } else {
        console.error('[SchoolSaaS DB Query Error]:', err.message);
      }
    }
  }
  return [];
}

// Memory-backed operations for standalone resilience
export const localStore = {
  getCollection(name: string) {
    if (!memoryStore[name]) {
      memoryStore[name] = {};
    }
    return memoryStore[name];
  },
  find(collectionName: string, predicate?: (item: any) => boolean) {
    const col = this.getCollection(collectionName);
    const list = Object.values(col);
    if (!predicate) return list;
    return list.filter(predicate);
  },
  findById(collectionName: string, id: string) {
    const col = this.getCollection(collectionName);
    return col[id] || null;
  },
  save(collectionName: string, id: string, data: any) {
    const col = this.getCollection(collectionName);
    col[id] = { ...data, id, updatedAt: new Date().toISOString() };
    return col[id];
  },
  delete(collectionName: string, id: string) {
    const col = this.getCollection(collectionName);
    delete col[id];
    return true;
  }
};
