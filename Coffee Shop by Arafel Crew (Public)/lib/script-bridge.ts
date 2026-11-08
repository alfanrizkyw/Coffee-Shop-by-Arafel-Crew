import { ApiError } from './errors';
import {
  AppSettings, DEFAULT_SETTINGS, DiagResult, LogEntry, MenuItem, MenuInput, Order, Review, StoredAccount,
} from './types';

const URL_ENV = 'GOOGLE_SCRIPT_URL';
const SECRET_ENV = 'GOOGLE_SCRIPT_SECRET';

async function call<T>(action: string, payload: Record<string, unknown> = {}, retry = true): Promise<T> {
  const url = process.env[URL_ENV];
  const secret = process.env[SECRET_ENV];
  if (!url || !secret) throw new ApiError(503, 'Spreadsheet belum dikonfigurasi. Lihat panduan SETUP.md.');

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, action, payload }),
      redirect: 'follow',
      signal: AbortSignal.timeout(25000),
      cache: 'no-store',
    });
  } catch (err) {
    if (retry) return call<T>(action, payload, false);
    throw new ApiError(502, 'Tidak bisa menghubungi Spreadsheet (timeout/jaringan). Coba lagi.');
  }

  const text = await res.text();
  let parsed: { ok?: boolean; data?: T; error?: string; code?: string };
  try {
    parsed = JSON.parse(text);
  } catch {
    if (retry) return call<T>(action, payload, false);
    throw new ApiError(502, 'Bridge Spreadsheet membalas tidak valid. Pastikan deploy Apps Script sudah benar (akses: Anyone).');
  }
  if (!parsed.ok) {
    if (parsed.code === 'CONFLICT') throw new ApiError(409, parsed.error || 'Data berubah, muat ulang.');
    if (parsed.code === 'AUTH') throw new ApiError(502, 'Secret bridge ditolak. Samakan GOOGLE_SCRIPT_SECRET dengan BRIDGE_SECRET di Apps Script.');
    if (parsed.code === 'NOTFOUND') throw new ApiError(404, parsed.error || 'Data tidak ditemukan.');
    throw new ApiError(502, `Spreadsheet error: ${parsed.error || 'tidak diketahui'}`);
  }
  return parsed.data as T;
}

export const scriptBridge = {
  mode: 'sheet' as const,

  getMenu: () => call<MenuItem[]>('getMenu'),
  addMenu: (input: MenuInput) => call<MenuItem>('addMenu', { menu: input }),
  updateMenu: (id: string, patch: Partial<MenuInput>, expect?: string) =>
    call<MenuItem>('updateMenu', { id, patch, expect }),
  deleteMenu: (id: string) => call<void>('deleteMenu', { id }),

  getOrders: (opts?: { since?: string; limit?: number; full?: boolean }) =>
    call<Order[]>('getOrders', { ...opts }),
  getOrderByToken: (token: string) => call<Order | null>('getOrderByToken', { token }),
  getOrderById: (id: string) => call<Order | null>('getOrderById', { id }),
  addOrder: (order: Order) => call<Order>('addOrder', { order }),
  updateOrder: (id: string, patch: Partial<Order>, expect?: string) =>
    call<Order>('updateOrder', { id, patch, expect }),

  getReviews: (opts?: { since?: string; limit?: number }) => call<Review[]>('getReviews', { ...opts }),
  getReviewByOrder: (orderId: string) => call<Review | null>('getReviewByOrder', { orderId }),
  addReview: (review: Review) => call<Review>('addReview', { review }),

  getSettings: async () => ({ ...DEFAULT_SETTINGS, ...(await call<Partial<AppSettings>>('getSettings')) }),
  setSetting: (key: keyof AppSettings, value: string) => call<void>('setSetting', { key, value }),

  addLog: (e: Omit<LogEntry, 'id'>) => call<void>('addLog', { entry: e }),
  getLogs: (limit: number) => call<LogEntry[]>('getLogs', { limit }),
  clearLogs: () => call<void>('clearLogs'),

  saveImage: (b64: string, mime: string) => call<{ id: string }>('saveImage', { b64, mime }).then((r) => r.id),
  getImage: (id: string) => call<{ b64: string; mime: string } | null>('getImage', { id }),

  diagnose: () => call<DiagResult>('diagnose'),
  repair: () => call<string[]>('repair'),

  listAccounts: () => call<StoredAccount[]>('getAccounts'),
  getAccount: (username: string) => call<StoredAccount | null>('getAccount', { username }),
  createAccount: (account: StoredAccount) => call<StoredAccount>('createAccount', { account }),
  updateAccount: (id: string, patch: Partial<Pick<StoredAccount, 'username' | 'role' | 'salt' | 'hash'>>, expect?: string) =>
    call<StoredAccount>('updateAccount', { id, patch, expect }),
  deleteAccount: (id: string) => call<void>('deleteAccount', { id }),
  resetAccounts: () => call<string[]>('resetAccounts'),
};