import { ApiError } from './errors';

function fail(name: string, msg: string): never {
  throw new ApiError(400, `${name}: ${msg}`);
}

export function vStr(v: unknown, name: string, min: number, max: number): string {
  if (typeof v !== 'string') fail(name, 'harus berupa teks');
  const s = (v as string).replace(/[\u0000-\u001f\u007f]/g, '').trim();
  if (s.length < min) fail(name, min > 0 ? 'wajib diisi' : 'tidak valid');
  if (s.length > max) fail(name, `maksimal ${max} karakter`);
  return s;
}

export function vInt(v: unknown, name: string, min: number, max: number): number {
  const n = typeof v === 'string' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isInteger(n)) fail(name, 'harus berupa angka bulat');
  const num = n as number;
  if (num < min || num > max) fail(name, `harus antara ${min} dan ${max}`);
  return num;
}

export function vOneOf<T extends string>(v: unknown, name: string, options: readonly T[]): T {
  if (typeof v !== 'string' || !options.includes(v as T)) fail(name, `harus salah satu dari: ${options.join(', ')}`);
  return v as T;
}

export function vBool(v: unknown, name: string): boolean {
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  fail(name, 'harus true/false');
}

const B64 = /^[A-Za-z0-9+/]+={0,2}$/;
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export function vImage(v: unknown): { b64: string; mime: string } {
  if (typeof v !== 'object' || v === null) fail('gambar', 'tidak valid');
  const { b64, mime } = v as { b64?: unknown; mime?: unknown };
  if (typeof b64 !== 'string' || b64.length === 0 || !B64.test(b64)) fail('gambar', 'data gambar tidak valid');
  if (b64.length > 2_800_000) fail('gambar', 'ukuran maksimal 2 MB setelah kompresi');
  const m = vOneOf(mime, 'format gambar', IMAGE_MIMES);
  return { b64, mime: m };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  return (fwd ? fwd.split(',')[0].trim() : 'local') || 'local';
}

export function vUsername(v: unknown): string {
  const s = vStr(v, 'Username', 3, 20).toLowerCase();
  if (!/^[a-z0-9_]+$/.test(s)) fail('Username', 'hanya huruf kecil, angka, dan underscore (3-20 karakter)');
  if (s === 'dev') fail('Username', '"dev" dicadangkan untuk developer');
  return s;
}

export function vPassword(v: unknown): string {
  return vStr(v, 'Password', 6, 100);
}