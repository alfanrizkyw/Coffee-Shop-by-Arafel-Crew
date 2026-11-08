import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { ApiError, jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(id)) throw new ApiError(404, 'Gambar tidak ditemukan.');

    // Hanya foto menu yang publik. QRIS & gambar lain hanya untuk staff login.
    const menu = await db.getMenu();
    const isPublic = menu.some((m) => m.fotoId === id);
    let cacheControl = 'public, max-age=31536000, immutable';
    if (!isPublic) {
      const session = await getSession();
      if (!session) throw new ApiError(404, 'Gambar tidak ditemukan.');
      cacheControl = 'private, max-age=60';
    }

    const img = await db.getImage(id);
    if (!img) throw new ApiError(404, 'Gambar tidak ditemukan.');
    const bytes = Buffer.from(img.b64, 'base64');
    return new Response(new Uint8Array(bytes), {
      headers: { 'Content-Type': img.mime, 'Cache-Control': cacheControl, 'X-Content-Type-Options': 'nosniff' },
    });
  } catch (err) {
    return jsonError(err);
  }
}