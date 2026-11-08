import { db } from '@/lib/db';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [menu, settings] = await Promise.all([db.getMenu(), db.getSettings()]);
    menu.sort((a, b) => a.kategori.localeCompare(b.kategori) || a.nama.localeCompare(b.nama));
    return Response.json({
      menu,
      settings: {
        namaKedai: settings.namaKedai,
        qrisId: settings.qrisId,
        maintenance: settings.maintenance,
        pengumuman: settings.pengumuman,
        wifiNama: settings.wifiNama,
        wifiSandi: settings.wifiSandi,
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return jsonError(err);
  }
}