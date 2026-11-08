export type Role = 'kasir' | 'bos' | 'dev';

export interface MenuItem {
  id: string;
  nama: string;
  kategori: string;
  harga: number;
  deskripsi: string;
  fotoId: string;
  tersedia: boolean;
  dibuat: string;
  diubah: string;
}

export type MenuInput = Pick<MenuItem, 'nama' | 'kategori' | 'harga' | 'deskripsi' | 'fotoId' | 'tersedia'>;

export type OrderStatus = 'baru' | 'diproses' | 'siap' | 'selesai' | 'batal';
export type PayStatus = 'belum_bayar' | 'lunas';
export type PayMethod = 'qris' | 'tunai';

export interface OrderItem {
  menuId: string;
  nama: string;
  harga: number;
  qty: number;
}

export interface Order {
  id: string;
  token: string;
  kode: string;
  nama: string;
  meja: string;
  items: OrderItem[];
  total: number;
  metode: PayMethod;
  statusBayar: PayStatus;
  status: OrderStatus;
  catatan: string;
  dibuat: string;
  diubah: string;
}

export interface Review {
  id: string;
  orderId: string;
  kode: string;
  nama: string;
  rating: number;
  komentar: string;
  dibuat: string;
}

export interface ReviewSummary {
  count: number;
  avg: number;
  dist: number[];
}

export interface AppSettings {
  namaKedai: string;
  qrisId: string;
  maintenance: string;
  pengumuman: string;
  wifiNama: string;
  wifiSandi: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  namaKedai: 'Area Barat',
  qrisId: '',
  maintenance: '0',
  pengumuman: '',
  wifiNama: '',
  wifiSandi: '',
};

export type StaffRole = 'kasir' | 'bos';

export interface StaffAccount {
  id: string;
  username: string;
  role: StaffRole;
  dibuat: string;
  diubah: string;
}

export interface StoredAccount extends StaffAccount {
  salt: string;
  hash: string;
}

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  waktu: string;
  level: LogLevel;
  sumber: string;
  pesan: string;
  detail: string;
}

export interface DiagResult {
  tabs: Record<string, { exists: boolean; rows: number; headersOk: boolean }>;
  folderOk: boolean;
  bridgeTime?: string;
}

export interface PublicData {
  menu: MenuItem[];
  settings: Pick<AppSettings, 'namaKedai' | 'qrisId' | 'maintenance' | 'pengumuman' | 'wifiNama' | 'wifiSandi'>;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  baru: 'Baru',
  diproses: 'Diproses',
  siap: 'Siap',
  selesai: 'Selesai',
  batal: 'Dibatalkan',
};

export const PAY_STATUS_LABEL: Record<PayStatus, string> = {
  belum_bayar: 'Belum Bayar',
  lunas: 'Lunas',
};

export const PAY_METHOD_LABEL: Record<PayMethod, string> = {
  qris: 'QRIS',
  tunai: 'Tunai',
};

export const ALLOWED_STATUS_TRANSITION: Record<OrderStatus, OrderStatus[]> = {
  baru: ['diproses', 'batal'],
  diproses: ['siap', 'batal'],
  siap: ['selesai', 'diproses'],
  selesai: [],
  batal: [],
};