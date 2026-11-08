export async function compressImage(file: File, maxDim = 1000, quality = 0.82): Promise<{ b64: string; mime: string }> {
  if (!file.type.startsWith('image/')) throw new Error('File harus berupa gambar (JPG/PNG/WebP).');
  if (file.size > 15 * 1024 * 1024) throw new Error('Ukuran file maksimal 15 MB.');

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  } catch {
    bitmap = await createImageBitmap(file);
  }
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Browser tidak mendukung pemrosesan gambar.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  let q = quality;
  let dataUrl = canvas.toDataURL('image/jpeg', q);
  while (dataUrl.length > 2_000_000 && q > 0.35) {
    q -= 0.12;
    dataUrl = canvas.toDataURL('image/jpeg', q);
  }
  if (dataUrl.length > 2_600_000) throw new Error('Gambar terlalu besar. Pilih foto lain.');
  return { b64: dataUrl.split(',')[1], mime: 'image/jpeg' };
}