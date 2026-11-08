import { db } from './db';
import { nowIso } from './money';
import { LogLevel } from './types';

export function logEvent(level: LogLevel, sumber: string, pesan: string, detail = '') {
  const entry = { waktu: nowIso(), level, sumber, pesan: pesan.slice(0, 500), detail: detail.slice(0, 2000) };
  if (level === 'error') console.error(`[${sumber}]`, pesan, detail);
  else console.log(`[${sumber}]`, pesan);
  db.addLog(entry).catch((err) => console.error('[log] gagal menyimpan log', err));
}