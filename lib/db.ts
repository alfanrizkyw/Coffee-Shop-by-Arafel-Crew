import { ApiError } from './errors';
import { demoStore } from './demo-store';
import { scriptBridge } from './script-bridge';
import {
  AppSettings, DiagResult, LogEntry, MenuItem, MenuInput, Order, Review, StaffAccount, StoredAccount,
} from './types';

export interface DB {
  mode: 'sheet' | 'demo' | 'unconfigured';
  getMenu(): Promise<MenuItem[]>;
  addMenu(input: MenuInput): Promise<MenuItem>;
  updateMenu(id: string, patch: Partial<MenuInput>, expect?: string): Promise<MenuItem>;
  deleteMenu(id: string): Promise<void>;
  getOrders(opts?: { since?: string; limit?: number; full?: boolean }): Promise<Order[]>;
  getOrderByToken(token: string): Promise<Order | null>;
  getOrderById(id: string): Promise<Order | null>;
  addOrder(order: Order): Promise<Order>;
  updateOrder(id: string, patch: Partial<Order>, expect?: string): Promise<Order>;
  getReviews(opts?: { since?: string; limit?: number }): Promise<Review[]>;
  getReviewByOrder(orderId: string): Promise<Review | null>;
  addReview(review: Review): Promise<Review>;
  getSettings(): Promise<AppSettings>;
  setSetting(key: keyof AppSettings, value: string): Promise<void>;
  addLog(e: Omit<LogEntry, 'id'>): Promise<void>;
  getLogs(limit: number): Promise<LogEntry[]>;
  clearLogs(): Promise<void>;
  saveImage(b64: string, mime: string): Promise<string>;
  getImage(id: string): Promise<{ b64: string; mime: string } | null>;
  diagnose(): Promise<DiagResult>;
  repair(): Promise<string[]>;
  listAccounts(): Promise<StaffAccount[]>;
  getAccount(username: string): Promise<StoredAccount | null>;
  createAccount(account: StoredAccount): Promise<StaffAccount>;
  updateAccount(id: string, patch: Partial<Pick<StoredAccount, 'username' | 'role' | 'salt' | 'hash'>>, expect?: string): Promise<StaffAccount>;
  deleteAccount(id: string): Promise<void>;
  resetAccounts(): Promise<string[]>;
}

// Adapter internal menyimpan salt/hash; lapisan publik `db` mengupasnya lewat toPublicAccount.
interface Adapter extends DB {
  listAccounts(): Promise<StoredAccount[]>;
  createAccount(account: StoredAccount): Promise<StoredAccount>;
  updateAccount(id: string, patch: Partial<Pick<StoredAccount, 'username' | 'role' | 'salt' | 'hash'>>, expect?: string): Promise<StoredAccount>;
}

function unconfigured(): never {
  throw new ApiError(503, 'Aplikasi belum terhubung ke Spreadsheet. Buka halaman /dev setelah mengatur GOOGLE_SCRIPT_URL dan GOOGLE_SCRIPT_SECRET di Vercel (lihat SETUP.md).');
}

const notConfigured: Adapter = {
  mode: 'unconfigured',
  getMenu: unconfigured, addMenu: unconfigured, updateMenu: unconfigured, deleteMenu: unconfigured,
  getOrders: unconfigured, getOrderByToken: unconfigured, getOrderById: unconfigured,
  addOrder: unconfigured, updateOrder: unconfigured,
  getReviews: unconfigured, getReviewByOrder: unconfigured, addReview: unconfigured,
  getSettings: unconfigured, setSetting: unconfigured, addLog: async () => {}, getLogs: async () => [],
  clearLogs: unconfigured, saveImage: unconfigured, getImage: async () => null,
  diagnose: unconfigured, repair: unconfigured,
  listAccounts: unconfigured, getAccount: unconfigured, createAccount: unconfigured,
  updateAccount: unconfigured, deleteAccount: unconfigured, resetAccounts: unconfigured,
};

function pickAdapter(): Adapter {
  if (process.env.GOOGLE_SCRIPT_URL && process.env.GOOGLE_SCRIPT_SECRET) return scriptBridge;
  if (process.env.NODE_ENV !== 'production') return demoStore;
  return notConfigured;
}

const adapter = pickAdapter();

// TTL cache mengurangi panggilan ke Apps Script saat banyak perangkat polling bersamaan.
const cache = new Map<string, { t: number; data: unknown }>();

async function ttl<T>(key: string, ms: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < ms) return hit.data as T;
  const data = await fn();
  cache.set(key, { t: Date.now(), data });
  if (cache.size > 500) {
    for (const [k, v] of cache) if (Date.now() - v.t > 30000) cache.delete(k);
  }
  return data;
}

function invalidate(prefixes: string[]) {
  for (const k of cache.keys()) if (prefixes.some((p) => k.startsWith(p))) cache.delete(k);
}

export const db: DB = {
  mode: adapter.mode,

  getMenu: () => ttl('menu', 3000, () => adapter.getMenu()),
  async addMenu(input) {
    const m = await adapter.addMenu(input);
    invalidate(['menu']);
    return m;
  },
  async updateMenu(id, patch, expect) {
    const m = await adapter.updateMenu(id, patch, expect);
    invalidate(['menu']);
    return m;
  },
  async deleteMenu(id) {
    await adapter.deleteMenu(id);
    invalidate(['menu']);
  },

  getOrders: (opts) => ttl(`orders:${JSON.stringify(opts || {})}`, 2500, () => adapter.getOrders(opts)),
  getOrderByToken: (token) => ttl(`token:${token}`, 2000, () => adapter.getOrderByToken(token)),
  getOrderById: (id) => adapter.getOrderById(id),
  async addOrder(order) {
    const o = await adapter.addOrder(order);
    invalidate(['orders:', `token:${o.token}`]);
    return o;
  },
  async updateOrder(id, patch, expect) {
    const o = await adapter.updateOrder(id, patch, expect);
    invalidate(['orders:', `token:${o.token}`]);
    return o;
  },

  getReviews: (opts) => ttl(`reviews:${JSON.stringify(opts || {})}`, 3000, () => adapter.getReviews(opts)),
  getReviewByOrder: (orderId) => ttl(`reviewOrder:${orderId}`, 2000, () => adapter.getReviewByOrder(orderId)),
  async addReview(review) {
    const r = await adapter.addReview(review);
    invalidate(['reviews:', `reviewOrder:${review.orderId}`]);
    return r;
  },

  getSettings: () => ttl('settings', 3000, () => adapter.getSettings()),
  async setSetting(key, value) {
    await adapter.setSetting(key, value);
    invalidate(['settings']);
  },

  addLog: (e) => adapter.addLog(e),
  getLogs: (limit) => adapter.getLogs(limit),
  async clearLogs() {
    await adapter.clearLogs();
  },

  saveImage: (b64, mime) => adapter.saveImage(b64, mime),
  getImage: (id) => ttl(`img:${id}`, 300000, () => adapter.getImage(id)),

  diagnose: () => adapter.diagnose(),
  async repair() {
    const result = await adapter.repair();
    invalidate(['menu', 'settings', 'orders:', 'token:', 'accounts', 'reviews:', 'reviewOrder:']);
    return result;
  },

  listAccounts: () => ttl('accounts', 2000, async () => (await adapter.listAccounts()).map(toPublicAccount)),
  getAccount: (username) => adapter.getAccount(username),
  async createAccount(account) {
    const a = await adapter.createAccount(account);
    invalidate(['accounts']);
    return toPublicAccount(a);
  },
  async updateAccount(id, patch, expect) {
    const a = await adapter.updateAccount(id, patch, expect);
    invalidate(['accounts']);
    return toPublicAccount(a);
  },
  async deleteAccount(id) {
    await adapter.deleteAccount(id);
    invalidate(['accounts']);
  },
  async resetAccounts() {
    const result = await adapter.resetAccounts();
    invalidate(['accounts']);
    return result;
  },
};

function toPublicAccount(a: StoredAccount): StaffAccount {
  return { id: a.id, username: a.username, role: a.role, dibuat: a.dibuat, diubah: a.diubah };
}