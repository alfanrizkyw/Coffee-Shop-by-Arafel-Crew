import { jakartaDateTime, rupiah } from './money';
import { Order, PAY_METHOD_LABEL } from './types';
import { Lang, translate } from './i18n';

const INK = '#20241f';
const MUTED = '#6d746a';
const GREEN = '#1a7f37';
const RED = '#c0392b';
const CREAM = '#F1E9D6';
const FOREST = '#0C1F18';

// Nota digambar ke canvas resolusi tinggi lalu diunduh/dibagikan sebagai PNG,
// sehingga pelanggan bisa menyimpannya ke galeri tanpa printer thermal.
export async function renderReceiptPng(order: Order, namaKedai: string, lang: Lang = 'id'): Promise<Blob> {
  const tr = (k: string) => translate(lang, k);
  const W = 384;
  const P = 26;
  const SCALE = 2;
  const MAXH = 2600;
  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = MAXH * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas tidak tersedia di perangkat ini.');
  ctx.scale(SCALE, SCALE);

  const font = (size: number, weight = 400) => { ctx.font = `${weight} ${size}px "Courier New", ui-monospace, Menlo, monospace`; };
  const innerW = W - P * 2;

  const wrap = (text: string, size: number, weight = 400, maxW = innerW): string[] => {
    font(size, weight);
    const words = String(text).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  };

  // Pita merek di atas
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, 78);
  ctx.fillStyle = FOREST;
  ctx.textAlign = 'center';
  font(19, 700);
  ctx.fillText(namaKedai.toUpperCase(), W / 2, 34);
  ctx.fillStyle = MUTED;
  font(10, 400);
  ctx.fillText(tr('N O T A   P E M B A Y A R A N'), W / 2, 56);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 78, W, MAXH - 78);

  let y = 78 + P;
  ctx.textAlign = 'left';

  const dashed = () => {
    ctx.strokeStyle = '#b9bdb4';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(P, y);
    ctx.lineTo(W - P, y);
    ctx.stroke();
    ctx.setLineDash([]);
    y += 14;
  };
  const text = (t: string, size: number, color: string, weight = 400, align: 'left' | 'right' | 'center' = 'left', x = P) => {
    font(size, weight);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(t, align === 'right' ? W - P : align === 'center' ? W / 2 : x, y);
  };
  const pair = (label: string, value: string, size = 12, valueColor = INK, valueWeight = 700) => {
    text(label, size, MUTED);
    text(value, size, valueColor, valueWeight, 'right');
    y += size + 8;
  };

  pair(tr('Kode'), order.kode);
  pair(tr('Waktu'), jakartaDateTime(order.dibuat), 11, INK, 400);
  pair(tr('Pelanggan'), order.nama, 12, INK, 400);
  pair(tr('Meja'), order.meja, 12, INK, 400);
  y += 2;
  dashed();

  for (const it of order.items) {
    for (const ln of wrap(it.nama, 12, 700)) { text(ln, 12, INK, 700); y += 17; }
    text(`${it.qty} x ${rupiah(it.harga)}`, 11, MUTED);
    text(rupiah(it.harga * it.qty), 11, INK, 700, 'right');
    y += 20;
  }
  dashed();

  text('TOTAL', 13, INK, 700);
  text(rupiah(order.total), 16, FOREST, 700, 'right');
  y += 24;
  pair(tr('Metode'), tr(PAY_METHOD_LABEL[order.metode]), 12, INK, 400);
  const lunas = order.statusBayar === 'lunas';
  pair(tr('Status'), lunas ? tr('LUNAS') : tr('BELUM BAYAR'), 12, lunas ? GREEN : RED, 700);

  if (order.catatan) {
    y += 2;
    dashed();
    for (const ln of wrap(`${tr('Catatan')}: ${order.catatan}`, 11, 400)) { text(ln, 11, MUTED); y += 16; }
  }
  y += 4;
  dashed();
  text(tr('Terima kasih sudah mampir'), 11, INK, 700, 'center');
  y += 16;
  text(tr('Simpan nota ini sebagai bukti pembayaran'), 10, MUTED, 400, 'center');
  y += P;

  const out = document.createElement('canvas');
  out.width = W * SCALE;
  out.height = Math.ceil(y) * SCALE;
  const octx = out.getContext('2d');
  if (!octx) throw new Error('Canvas tidak tersedia di perangkat ini.');
  octx.drawImage(canvas, 0, 0, W * SCALE, Math.ceil(y) * SCALE, 0, 0, W * SCALE, Math.ceil(y) * SCALE);

  return new Promise<Blob>((resolve, reject) => {
    out.toBlob((b) => (b ? resolve(b) : reject(new Error('Gagal membuat gambar nota.'))), 'image/png');
  });
}

export async function saveReceiptPhoto(order: Order, namaKedai: string, lang: Lang = 'id'): Promise<'shared' | 'downloaded'> {
  const blob = await renderReceiptPng(order, namaKedai, lang);
  const file = new File([blob], `nota-${order.kode}.png`, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: translate(lang, 'Nota {kode}', { kode: order.kode }), text: translate(lang, 'Nota pembayaran {kedai}', { kedai: namaKedai }) });
      return 'shared';
    } catch {
      // pengguna menutup share sheet — jatuh ke unduhan
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
}