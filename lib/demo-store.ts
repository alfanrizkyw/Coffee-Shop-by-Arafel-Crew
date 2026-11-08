import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ApiError } from './errors';
import { nowIso } from './money';
import { hashPassword } from './password';
import {
  AppSettings, DEFAULT_SETTINGS, DiagResult, LogEntry, MenuItem, MenuInput, Order, Review, StoredAccount,
} from './types';

interface DemoData {
  menu: MenuItem[];
  orders: Order[];
  reviews: Review[];
  settings: AppSettings;
  logs: LogEntry[];
  accounts: StoredAccount[];
}

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'demo.json');
const IMG_DIR = path.join(DATA_DIR, 'img');

let queue: Promise<unknown> = Promise.resolve();
function tx<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

function defaultAccounts(): StoredAccount[] {
  const t = nowIso();
  const make = (username: string, role: 'kasir' | 'bos'): StoredAccount => ({
    id: crypto.randomUUID(), username, role, ...hashPassword(username), dibuat: t, diubah: t,
  });
  return [make('kasir', 'kasir'), make('bos', 'bos')];
}

function seed(): DemoData {
  const t = nowIso();
  const item = (id: string, nama: string, kategori: string, harga: number, deskripsi: string): MenuItem => ({
    id, nama, kategori, harga, deskripsi, fotoId: '', tersedia: true, dibuat: t, diubah: t,
  });
  return {
    menu: [
      item('demo-1', 'Kopi Susu Area Barat', 'Kopi', 18000, 'Espresso, susu segar, dan gula aren khas hutan.'),
      item('demo-2', 'Americano', 'Kopi', 15000, 'Espresso ganda dengan air panas, pahit bersih.'),
      item('demo-3', 'Cappuccino', 'Kopi', 20000, 'Espresso, susu steam, dan busa lembut.'),
      item('demo-4', 'Matcho Latte', 'Non-Kopi', 22000, 'Matcha premium dengan susu segar.'),
      item('demo-5', 'Es Teh Manis', 'Non-Kopi', 8000, 'Teh seduh dingin yang menyegarkan.'),
      item('demo-6', 'Pisang Goreng Keju', 'Camilan', 15000, 'Pisang goreng hangat dengan taburan keju.'),
    ],
    orders: [],
    reviews: [],
    settings: { ...DEFAULT_SETTINGS },
    logs: [],
    accounts: defaultAccounts(),
  };
}

async function load(): Promise<DemoData> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const data = JSON.parse(raw) as DemoData;
    if (!Array.isArray(data.accounts)) data.accounts = defaultAccounts();
    if (!Array.isArray(data.reviews)) data.reviews = [];
    return data;
  } catch {
    const data = seed();
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    return data;
  }
}

async function save(data: DemoData) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = DATA_FILE + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.rename(tmp, DATA_FILE);
}

function checkExpect(current: string, expect?: string) {
  if (expect && current !== expect) {
    throw new ApiError(409, 'Data sudah diubah perangkat lain. Muat ulang lalu coba lagi.');
  }
}

export const demoStore = {
  mode: 'demo' as const,

  async getMenu(): Promise<MenuItem[]> {
    return (await load()).menu;
  },

  async addMenu(input: MenuInput): Promise<MenuItem> {
    return tx(async () => {
      const data = await load();
      const t = nowIso();
      const m: MenuItem = { ...input, id: crypto.randomUUID(), dibuat: t, diubah: t };
      data.menu.push(m);
      await save(data);
      return m;
    });
  },

  async updateMenu(id: string, patch: Partial<MenuInput>, expect?: string): Promise<MenuItem> {
    return tx(async () => {
      const data = await load();
      const m = data.menu.find((x) => x.id === id);
      if (!m) throw new ApiError(404, 'Menu tidak ditemukan.');
      checkExpect(m.diubah, expect);
      Object.assign(m, patch, { diubah: nowIso() });
      await save(data);
      return m;
    });
  },

  async deleteMenu(id: string): Promise<void> {
    return tx(async () => {
      const data = await load();
      const i = data.menu.findIndex((x) => x.id === id);
      if (i < 0) throw new ApiError(404, 'Menu tidak ditemukan.');
      data.menu.splice(i, 1);
      await save(data);
    });
  },

  async getOrders(opts?: { since?: string; limit?: number }): Promise<Order[]> {
    let orders = (await load()).orders;
    if (opts?.since) orders = orders.filter((o) => o.dibuat >= opts.since!);
    orders = [...orders].sort((a, b) => b.dibuat.localeCompare(a.dibuat));
    if (opts?.limit) orders = orders.slice(0, opts.limit);
    return orders;
  },

  async getOrderByToken(token: string): Promise<Order | null> {
    return (await load()).orders.find((o) => o.token === token) || null;
  },

  async getOrderById(id: string): Promise<Order | null> {
    return (await load()).orders.find((o) => o.id === id) || null;
  },

  async addOrder(order: Order): Promise<Order> {
    return tx(async () => {
      const data = await load();
      data.orders.push(order);
      await save(data);
      return order;
    });
  },

  async updateOrder(id: string, patch: Partial<Order>, expect?: string): Promise<Order> {
    return tx(async () => {
      const data = await load();
      const o = data.orders.find((x) => x.id === id);
      if (!o) throw new ApiError(404, 'Pesanan tidak ditemukan.');
      checkExpect(o.diubah, expect);
      Object.assign(o, patch, { diubah: nowIso() });
      await save(data);
      return o;
    });
  },

  async getReviews(opts?: { since?: string; limit?: number }): Promise<Review[]> {
    let reviews = (await load()).reviews;
    if (opts?.since) reviews = reviews.filter((r) => r.dibuat >= opts.since!);
    reviews = [...reviews].sort((a, b) => b.dibuat.localeCompare(a.dibuat));
    if (opts?.limit) reviews = reviews.slice(0, opts.limit);
    return reviews;
  },

  async getReviewByOrder(orderId: string): Promise<Review | null> {
    return (await load()).reviews.find((r) => r.orderId === orderId) || null;
  },

  async addReview(review: Review): Promise<Review> {
    return tx(async () => {
      const data = await load();
      if (data.reviews.some((r) => r.orderId === review.orderId)) {
        throw new ApiError(409, 'Pesanan ini sudah diberi ulasan.');
      }
      data.reviews.push(review);
      await save(data);
      return review;
    });
  },

  async getSettings(): Promise<AppSettings> {
    return { ...DEFAULT_SETTINGS, ...(await load()).settings };
  },

  async setSetting(key: keyof AppSettings, value: string): Promise<void> {
    return tx(async () => {
      const data = await load();
      data.settings[key] = value;
      await save(data);
    });
  },

  async addLog(e: Omit<LogEntry, 'id'>): Promise<void> {
    return tx(async () => {
      const data = await load();
      data.logs.push({ ...e, id: crypto.randomUUID() });
      if (data.logs.length > 5000) data.logs.splice(0, data.logs.length - 5000);
      await save(data);
    });
  },

  async getLogs(limit: number): Promise<LogEntry[]> {
    const logs = (await load()).logs;
    return logs.slice(-limit).reverse();
  },

  async clearLogs(): Promise<void> {
    return tx(async () => {
      const data = await load();
      data.logs = [];
      await save(data);
    });
  },

  async saveImage(b64: string, mime: string): Promise<string> {
    const id = crypto.randomUUID();
    await fs.mkdir(IMG_DIR, { recursive: true });
    await fs.writeFile(path.join(IMG_DIR, `${id}.json`), JSON.stringify({ b64, mime }));
    return id;
  },

  async getImage(id: string): Promise<{ b64: string; mime: string } | null> {
    if (!/^[A-Za-z0-9-]{8,64}$/.test(id)) return null;
    try {
      const raw = await fs.readFile(path.join(IMG_DIR, `${id}.json`), 'utf8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async diagnose(): Promise<DiagResult> {
    const data = await load();
    const tabs: DiagResult['tabs'] = {};
    for (const name of ['Menu', 'Orders', 'Reviews', 'Settings', 'Logs', 'Accounts']) {
      const rows = name === 'Menu' ? data.menu.length : name === 'Orders' ? data.orders.length
        : name === 'Reviews' ? data.reviews.length
        : name === 'Settings' ? Object.keys(data.settings).length : name === 'Accounts' ? data.accounts.length : data.logs.length;
      tabs[name] = { exists: true, rows, headersOk: true };
    }
    return { tabs, folderOk: true };
  },

  async repair(): Promise<string[]> {
    const data = await load();
    const out = ['Demo store lokal siap (mode demo, tanpa Spreadsheet).'];
    if (data.accounts.length === 0) {
      await tx(async () => {
        const d = await load();
        d.accounts = defaultAccounts();
        await save(d);
      });
      out.push('Akun default (kasir/bos) dibuat karena tab akun kosong.');
    }
    return out;
  },

  async listAccounts(): Promise<StoredAccount[]> {
    return (await load()).accounts;
  },

  async getAccount(username: string): Promise<StoredAccount | null> {
    return (await load()).accounts.find((a) => a.username === username) || null;
  },

  async createAccount(account: StoredAccount): Promise<StoredAccount> {
    return tx(async () => {
      const data = await load();
      if (data.accounts.some((a) => a.username === account.username)) {
        throw new ApiError(409, `Username "${account.username}" sudah dipakai.`);
      }
      data.accounts.push(account);
      await save(data);
      return account;
    });
  },

  async updateAccount(id: string, patch: Partial<Pick<StoredAccount, 'username' | 'role' | 'salt' | 'hash'>>, expect?: string): Promise<StoredAccount> {
    return tx(async () => {
      const data = await load();
      const a = data.accounts.find((x) => x.id === id);
      if (!a) throw new ApiError(404, 'Akun tidak ditemukan.');
      checkExpect(a.diubah, expect);
      if (patch.username && data.accounts.some((x) => x.id !== id && x.username === patch.username)) {
        throw new ApiError(409, `Username "${patch.username}" sudah dipakai.`);
      }
      Object.assign(a, patch, { diubah: nowIso() });
      await save(data);
      return a;
    });
  },

  async deleteAccount(id: string): Promise<void> {
    return tx(async () => {
      const data = await load();
      const i = data.accounts.findIndex((x) => x.id === id);
      if (i < 0) throw new ApiError(404, 'Akun tidak ditemukan.');
      data.accounts.splice(i, 1);
      await save(data);
    });
  },

  async resetAccounts(): Promise<string[]> {
    return tx(async () => {
      const data = await load();
      const out: string[] = [];
      for (const def of defaultAccounts()) {
        const existing = data.accounts.find((a) => a.username === def.username);
        if (existing) {
          const { salt, hash } = hashPassword(def.username);
          Object.assign(existing, { salt, hash, role: def.role, diubah: nowIso() });
          out.push(`Akun "${def.username}" direset ke password default.`);
        } else {
          data.accounts.push(def);
          out.push(`Akun "${def.username}" dibuat ulang dengan password default.`);
        }
      }
      await save(data);
      return out;
    });
  },
};