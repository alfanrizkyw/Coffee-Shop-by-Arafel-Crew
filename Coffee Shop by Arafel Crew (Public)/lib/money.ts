const idr = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

export function rupiah(n: number): string {
  return `Rp${idr.format(Math.round(n))}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

const TZ = 'Asia/Jakarta';

// Hanya dipanggil di sisi klien oleh I18nProvider; server selalu memakai id-ID.
let dateLocale = 'id-ID';
export function setDateLocale(locale: string) {
  dateLocale = locale;
}

export function jakartaDateKey(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export function jakartaTime(iso: string): string {
  return new Intl.DateTimeFormat(dateLocale, { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export function jakartaDateTime(iso: string): string {
  return new Intl.DateTimeFormat(dateLocale, {
    timeZone: TZ, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

export function jakartaDateShort(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat(dateLocale, { timeZone: TZ, day: '2-digit', month: 'short' }).format(new Date(Date.UTC(y, m - 1, d, 5)));
}