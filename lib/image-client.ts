export interface CropSource {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  previewUrl: string;
}

// Sumber gambar untuk pemotong: sudah diputar sesuai EXIF dan diperkecil agar ringan di HP.
export async function loadImageForCrop(file: File): Promise<CropSource> {
  if (!file.type.startsWith('image/')) throw new Error('File harus berupa gambar (JPG/PNG/WebP).');
  if (file.size > 15 * 1024 * 1024) throw new Error('Ukuran file maksimal 15 MB.');

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  } catch {
    bitmap = await createImageBitmap(file);
  }

  const maxSource = 2000;
  const scale = Math.min(1, maxSource / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Browser tidak mendukung pemrosesan gambar.');
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const previewScale = Math.min(1, 1400 / Math.max(width, height));
  const preview = document.createElement('canvas');
  preview.width = Math.max(1, Math.round(width * previewScale));
  preview.height = Math.max(1, Math.round(height * previewScale));
  const pctx = preview.getContext('2d');
  if (!pctx) throw new Error('Browser tidak mendukung pemrosesan gambar.');
  pctx.fillStyle = '#ffffff';
  pctx.fillRect(0, 0, preview.width, preview.height);
  pctx.drawImage(canvas, 0, 0, preview.width, preview.height);

  return { canvas, width, height, previewUrl: preview.toDataURL('image/jpeg', 0.86) };
}

export interface CropView {
  boxW: number;
  boxH: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
  imgW: number;
  imgH: number;
}

export function cropLayout(v: CropView) {
  const baseScale = Math.max(v.boxW / v.imgW, v.boxH / v.imgH);
  const scale = baseScale * v.zoom;
  const drawW = v.imgW * scale;
  const drawH = v.imgH * scale;
  return {
    drawW,
    drawH,
    left: v.boxW / 2 + v.offsetX - drawW / 2,
    top: v.boxH / 2 + v.offsetY - drawH / 2,
  };
}

export function clampCropOffset(v: Omit<CropView, 'offsetX' | 'offsetY'>, x: number, y: number) {
  const { drawW, drawH } = cropLayout({ ...v, offsetX: 0, offsetY: 0 });
  const maxX = Math.max(0, (drawW - v.boxW) / 2);
  const maxY = Math.max(0, (drawH - v.boxH) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, x)),
    y: Math.min(maxY, Math.max(-maxY, y)),
  };
}

export function exportCrop(source: HTMLCanvasElement, view: CropView, outputW: number, quality = 0.82): string {
  const layout = cropLayout(view);
  const k = outputW / view.boxW;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(outputW));
  canvas.height = Math.max(1, Math.round(outputW * (view.boxH / view.boxW)));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Browser tidak mendukung pemrosesan gambar.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, layout.left * k, layout.top * k, layout.drawW * k, layout.drawH * k);

  let q = quality;
  let dataUrl = canvas.toDataURL('image/jpeg', q);
  while (dataUrl.length > 2_000_000 && q > 0.35) {
    q -= 0.12;
    dataUrl = canvas.toDataURL('image/jpeg', q);
  }
  if (dataUrl.length > 2_600_000) throw new Error('Gambar terlalu besar. Pilih foto lain.');
  return dataUrl;
}
