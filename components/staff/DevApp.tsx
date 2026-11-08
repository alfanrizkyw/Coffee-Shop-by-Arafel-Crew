'use client';

import { useState } from 'react';
import { Activity, Bug, CheckCircle2, Database, RefreshCw, Settings2, ShieldCheck, Trash2, Wrench, XCircle, KeyRound } from 'lucide-react';
import { api } from '@/lib/api-client';
import { jakartaDateTime } from '@/lib/money';
import { AppSettings, DiagResult, LogEntry, LogLevel, Role } from '@/lib/types';
import { usePoll } from '@/lib/usePoll';
import { useI18n } from '@/lib/i18n';
import { Alert, Confirm, EmptyState, Spinner } from '@/components/ui';
import StaffShell from '@/components/staff/StaffShell';
import { useToast } from '@/components/Toast';

interface DiagResponse {
  mode: 'sheet' | 'demo' | 'unconfigured';
  time: string;
  latencyMs: number;
  env: { scriptUrl: boolean; scriptSecret: boolean; sessionSecret: boolean };
  diag: DiagResult | null;
  diagError: string;
}

export default function DevApp({ username, role }: { username: string; role: Role }) {
  const [tab, setTab] = useState('log');
  return (
    <StaffShell
      username={username}
      role={role}
      title="Panel Developer"
      nav={[
        { key: 'log', label: 'Log Error & Aktivitas', icon: Bug },
        { key: 'diag', label: 'Diagnostik', icon: Activity },
        { key: 'sistem', label: 'Sistem', icon: Settings2 },
      ]}
      active={tab}
      onNav={setTab}
    >
      {tab === 'log' && <LogsView />}
      {tab === 'diag' && <DiagnosticsView />}
      {tab === 'sistem' && <SystemView />}
    </StaffShell>
  );
}

const LEVEL_TONE: Record<LogLevel, string> = {
  info: 'bg-forest-700 text-cream-dim',
  warn: 'bg-wood-400/20 text-wood-300',
  error: 'bg-danger/20 text-red-300',
};

function LogsView() {
  const { t } = useI18n();
  const toast = useToast();
  const { data, error, loading, refresh } = usePoll<{ logs: LogEntry[] }>('/api/dev/logs?limit=300', 10000);
  const [level, setLevel] = useState<'semua' | LogLevel>('semua');
  const [clearOpen, setClearOpen] = useState(false);
  const [clearBusy, setClearBusy] = useState(false);

  const logs = (data?.logs ?? []).filter((l) => level === 'semua' || l.level === level);
  const errorCount = (data?.logs ?? []).filter((l) => l.level === 'error').length;

  const clear = async () => {
    setClearBusy(true);
    try {
      await api('/api/dev/logs', 'DELETE');
      toast('Semua log dibersihkan.', 'ok');
      setClearOpen(false);
      refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Gagal membersihkan log.', 'error');
    } finally {
      setClearBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(['semua', 'error', 'warn', 'info'] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            className={`chip capitalize ${level === l ? 'bg-forest-600 border-forest-500 text-white' : 'bg-forest-850 border-forest-750 text-cream-dim hover:bg-forest-800'}`}
            aria-pressed={level === l}
          >
            {t(l)}{l === 'error' && errorCount > 0 ? ` (${errorCount})` : ''}
          </button>
        ))}
        <button onClick={refresh} className="btn-ghost !min-h-[36px] !px-2.5 !py-1.5 ml-auto" aria-label={t('Refresh log')}>
          <RefreshCw size={14} />
        </button>
        <button onClick={() => setClearOpen(true)} className="btn-danger !min-h-[36px] !text-xs">
          <Trash2 size={13} /> {t('Bersihkan')}
        </button>
      </div>

      <p className="text-xs text-moss">{t('Error dari browser pelanggan/staff dan server tercatat otomatis di sini (update tiap 10 detik). Klik baris untuk detail teknis.')}</p>
      {error && <Alert tone="warn">{t(error)}</Alert>}
      {loading ? <Spinner /> : logs.length === 0 ? (
        <EmptyState title="Tidak ada log" desc="Sistem sehat — belum ada aktivitas/error tercatat." />
      ) : (
        <div className="space-y-1.5">
          {logs.map((l) => (
            <details key={l.id} className="card !rounded-lg overflow-hidden group">
              <summary className="flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer list-none hover:bg-forest-800 transition-colors duration-150">
                <span className={`badge ${LEVEL_TONE[l.level]} shrink-0`}>{l.level}</span>
                <span className="text-xs text-moss whitespace-nowrap shrink-0">{jakartaDateTime(l.waktu)}</span>
                <span className="badge bg-forest-900 text-moss border border-forest-750 shrink-0 hidden sm:inline-flex">{l.sumber}</span>
                <span className="text-sm truncate flex-1">{l.pesan}</span>
              </summary>
              <div className="px-3.5 pb-3 pt-1 border-t border-forest-750">
                <p className="text-xs text-moss mb-1">{t('Sumber')}: {l.sumber} · ID: {l.id}</p>
                <pre className="text-xs text-cream-dim whitespace-pre-wrap break-words bg-forest-900 rounded-md p-2.5 max-h-48 overflow-y-auto">{l.detail || t('(tanpa detail)')}</pre>
              </div>
            </details>
          ))}
        </div>
      )}

      <Confirm
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        onConfirm={clear}
        title="Bersihkan semua log?"
        desc="Semua catatan error dan aktivitas dihapus permanen dari spreadsheet. Pastikan error penting sudah dicatat/diperbaiki."
        confirmLabel="Ya, Bersihkan"
        danger
        busy={clearBusy}
      />
    </div>
  );
}

function DiagnosticsView() {
  const { t } = useI18n();
  const toast = useToast();
  const { data, error, loading, refresh } = usePoll<DiagResponse>('/api/dev/diagnostics', 15000);
  const [repairBusy, setRepairBusy] = useState(false);
  const [results, setResults] = useState<string[] | null>(null);

  const repair = async () => {
    setRepairBusy(true);
    setResults(null);
    try {
      const res = await api<{ results: string[] }>('/api/dev/repair', 'POST', {});
      setResults(res.results);
      toast('Perbaikan selesai — lihat hasil di bawah.', 'ok');
      refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Perbaikan gagal.', 'error');
    } finally {
      setRepairBusy(false);
    }
  };

  if (loading) return <Spinner label="Menjalankan diagnostik…" />;
  if (!data) return <Alert>{t(error || 'Diagnostik tidak tersedia.')}</Alert>;

  const healthy = data.mode !== 'unconfigured' && !data.diagError && data.env.sessionSecret &&
    (!data.diag || (Object.values(data.diag.tabs).every((tab) => tab.exists && tab.headersOk) && data.diag.folderOk));

  return (
    <div className="space-y-4 max-w-3xl">
      <div className={`card p-5 flex items-center gap-3 ${healthy ? 'border-ok/50' : 'border-danger/50'}`}>
        {healthy ? <CheckCircle2 size={28} className="text-green-300 shrink-0" aria-hidden /> : <XCircle size={28} className="text-red-300 shrink-0" aria-hidden />}
        <div>
          <p className="font-display font-bold">{healthy ? t('Sistem Sehat') : t('Perlu Perhatian')}</p>
          <p className="text-sm text-moss">
            {t('Mode')}: <span className="font-semibold text-cream">{data.mode === 'sheet' ? t('Google Spreadsheet (produksi)') : data.mode === 'demo' ? t('Demo lokal (belum terhubung Spreadsheet)') : t('BELUM DIKONFIGURASI')}</span>
            {' · '}{t('Respons database: {ms} ms', { ms: data.latencyMs })}
          </p>
        </div>
        <button onClick={refresh} className="btn-ghost !min-h-[36px] !px-2.5 !py-1.5 ml-auto" aria-label={t('Refresh diagnostik')}>
          <RefreshCw size={14} />
        </button>
      </div>

      {data.mode === 'demo' && (
        <Alert tone="info">{t('Mode demo aktif karena GOOGLE_SCRIPT_URL belum diisi. Data tersimpan lokal di perangkat server ini saja. Ikuti SETUP.md untuk menghubungkan Spreadsheet.')}</Alert>
      )}
      {data.diagError && <Alert>{t('Diagnostik database gagal: {error}', { error: t(data.diagError) })}</Alert>}

      <div className="card p-5">
        <h2 className="font-display font-bold mb-3 flex items-center gap-2"><ShieldCheck size={16} aria-hidden /> {t('Konfigurasi Server')}</h2>
        <ul className="space-y-2 text-sm">
          <EnvRow ok={data.env.scriptUrl} label={t('GOOGLE_SCRIPT_URL (alamat bridge Apps Script)')} />
          <EnvRow ok={data.env.scriptSecret} label={t('GOOGLE_SCRIPT_SECRET (kunci rahasia bridge)')} />
          <EnvRow ok={data.env.sessionSecret} label={t('Kunci sesi login (SESSION_SECRET / turunan secret)')} />
        </ul>
      </div>

      {data.diag && (
        <div className="card p-5">
          <h2 className="font-display font-bold mb-3 flex items-center gap-2"><Database size={16} aria-hidden /> {t('Struktur Database')}</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-moss uppercase border-b border-forest-750">
                <th className="py-2 font-semibold">{t('Tab')}</th>
                <th className="py-2 font-semibold">{t('Ada')}</th>
                <th className="py-2 font-semibold">{t('Header')}</th>
                <th className="py-2 font-semibold text-right">{t('Baris')}</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.diag.tabs).map(([name, tab]) => (
                <tr key={name} className="border-b border-forest-800 last:border-0">
                  <td className="py-2.5 font-semibold">{name}</td>
                  <td className="py-2.5">{tab.exists ? <CheckCircle2 size={15} className="text-green-300" aria-label={t('Ada')} /> : <XCircle size={15} className="text-red-300" aria-label={t('Tidak ada')} />}</td>
                  <td className="py-2.5">{tab.headersOk ? <CheckCircle2 size={15} className="text-green-300" aria-label={t('Benar')} /> : <XCircle size={15} className="text-red-300" aria-label={t('Rusak')} />}</td>
                  <td className="py-2.5 text-right tabular-nums text-moss">{tab.rows}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-sm mt-3 flex items-center gap-2">
            {data.diag.folderOk ? <CheckCircle2 size={15} className="text-green-300" aria-hidden /> : <XCircle size={15} className="text-red-300" aria-hidden />}
            {t('Folder penyimpanan gambar (Drive)')}: {data.diag.folderOk ? t('siap') : t('bermasalah')}
          </p>
        </div>
      )}

      <div className="card p-5">
        <h2 className="font-display font-bold mb-2 flex items-center gap-2"><Wrench size={16} aria-hidden /> {t('Perbaikan Jarak Jauh')}</h2>
        <p className="text-sm text-moss mb-3">{t('Membuat ulang tab/header yang hilang dan folder gambar tanpa menghapus data. Aman dijalankan kapan saja.')}</p>
        <button onClick={repair} disabled={repairBusy} className="btn-primary">
          <Wrench size={15} /> {repairBusy ? t('Memperbaiki…') : t('Jalankan Perbaikan Otomatis')}
        </button>
        {results && (
          <ul className="mt-3 space-y-1.5">
            {results.map((r, i) => (
              <li key={i} className={`text-sm flex items-start gap-2 ${r.startsWith('PERHATIAN') ? 'text-red-300' : 'text-cream-dim'}`}>
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-forest-500 shrink-0" aria-hidden />{r}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EnvRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2.5">
      {ok ? <CheckCircle2 size={16} className="text-green-300 shrink-0" aria-hidden /> : <XCircle size={16} className="text-red-300 shrink-0" aria-hidden />}
      <span className={ok ? 'text-cream-dim' : 'text-red-200'}>{label}</span>
    </li>
  );
}

function ResetAccountsCard() {
  const { t } = useI18n();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<string[] | null>(null);

  const reset = async () => {
    setBusy(true);
    setResults(null);
    try {
      const res = await api<{ results: string[] }>('/api/dev/accounts-reset', 'POST', {});
      setResults(res.results);
      toast('Akun staff direset ke default.', 'ok');
      setOpen(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Gagal mereset akun.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-5 border-danger/40">
      <h2 className="font-display font-bold mb-2 flex items-center gap-2 text-red-300"><RefreshCw size={16} aria-hidden /> {t('Reset Akun Staff')}</h2>
      <p className="text-sm text-moss mb-3">
        {t('Kembalikan akun kasir & bos ke default')} (<span className="font-semibold text-cream">kasir/kasir</span> {t('dan')} <span className="font-semibold text-cream">bos/bos</span>). {t('Akun tambahan dihapus dan semua staff dipaksa login ulang. Pakai jika bos lupa password atau terkunci di luar. Akun dev tidak terpengaruh.')}
      </p>
      <button onClick={() => setOpen(true)} className="btn-danger">
        <RefreshCw size={15} aria-hidden /> {t('Reset ke Default')}
      </button>
      {results && (
        <ul className="mt-3 space-y-1.5">
          {results.map((r, i) => (
            <li key={i} className="text-sm text-cream-dim flex items-start gap-2">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-forest-500 shrink-0" aria-hidden />{r}
            </li>
          ))}
        </ul>
      )}
      <Confirm
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={reset}
        title="Reset semua akun staff?"
        desc="Akun kasir & bos kembali ke kasir/kasir dan bos/bos. Akun tambahan dihapus permanen dan semua staff harus login ulang. Segera ganti password default lewat Panel Bos setelah reset."
        confirmLabel="Ya, Reset"
        danger
        busy={busy}
      />
    </div>
  );
}

function SystemView() {
  const { t } = useI18n();
  const toast = useToast();
  const { data, refresh } = usePoll<{ settings: AppSettings }>('/api/staff/settings', 30000);
  const [busy, setBusy] = useState(false);
  const maintenance = data?.settings.maintenance === '1';

  const toggleMaintenance = async () => {
    setBusy(true);
    try {
      await api('/api/dev/maintenance', 'POST', { on: !maintenance });
      toast(!maintenance ? 'Mode maintenance AKTIF — pelanggan tidak bisa memesan.' : 'Mode maintenance dimatikan — kedai buka kembali.', 'ok');
      refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Gagal mengubah mode.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className={`card p-5 ${maintenance ? 'border-wood-400/60' : ''}`}>
        <h2 className="font-display font-bold mb-2 flex items-center gap-2"><Wrench size={16} aria-hidden /> {t('Mode Maintenance')}</h2>
        <p className="text-sm text-moss mb-4">{t('Saat aktif, pelanggan masih bisa melihat menu tapi tidak bisa mengirim pesanan. Pakai saat ada perbaikan atau kedai tutup mendadak.')}</p>
        <div className="flex items-center gap-3">
          <button
            role="switch"
            aria-checked={maintenance}
            aria-label={t('Mode maintenance')}
            onClick={toggleMaintenance}
            disabled={busy || !data}
            className={`relative w-14 h-8 rounded-full transition-colors duration-200 cursor-pointer ${maintenance ? 'bg-wood-500' : 'bg-forest-750'} disabled:opacity-50`}
          >
            <span className={`absolute top-1 w-6 h-6 rounded-full bg-cream transition-all duration-200 ${maintenance ? 'left-7' : 'left-1'}`} />
          </button>
          <span className={`font-semibold text-sm ${maintenance ? 'text-wood-300' : 'text-green-300'}`}>
            {maintenance ? t('AKTIF — kedai tidak menerima pesanan') : t('Nonaktif — kedai menerima pesanan')}
          </span>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-display font-bold mb-2 flex items-center gap-2"><KeyRound size={16} aria-hidden /> {t('Keamanan Akun')}</h2>
        <p className="text-sm text-moss mb-3">
          {t('Password default (kasir/kasir, bos/bos) mudah ditebak. Untuk keamanan jangka panjang:')}
        </p>
        <ul className="text-sm text-cream-dim space-y-1.5 list-disc list-inside">
          <li>{t('Akun')} <span className="font-semibold text-cream">kasir & bos</span> {t('dikelola di database — ganti username/password dan tambah admin lewat')} <span className="font-semibold text-cream">{t('Panel Bos → Akun Staff')}</span>. {t('Sesi login lama otomatis keluar saat akun diubah.')}</li>
          <li>{t('Akun')} <span className="font-semibold text-cream">dev</span> {t('hanya lewat environment variable')} <code className="text-wood-300">DEV_PASSWORD</code> {t('di Vercel (lalu Redeploy). Username "dev" dicadangkan dan tidak bisa dibuat lewat Panel Bos.')}</li>
          <li><code className="text-wood-300">SESSION_SECRET</code> — {t('isi teks acak panjang (32+ karakter) agar sesi login makin kuat.')}</li>
        </ul>
        <p className="text-xs text-moss mt-3">{t('Sesi login berlaku 12 jam dan tersimpan sebagai cookie terenkripsi (HTTP-only). Jika semua akun bos terkunci, gunakan Reset Akun Staff di bawah.')}</p>
      </div>

      <ResetAccountsCard />

      <div className="card p-5">
        <h2 className="font-display font-bold mb-2">{t('Tentang Aplikasi')}</h2>
        <ul className="text-sm text-cream-dim space-y-1.5">
          <li>{t('Area Barat POS v1.0 — Next.js di Vercel + Google Spreadsheet via Apps Script.')}</li>
          <li>{t('Pesanan, menu, pengaturan, akun staff, dan log tersimpan di spreadsheet kedai (tab Menu/Orders/Settings/Accounts/Logs).')}</li>
          <li>{t('Foto menu dan QR QRIS tersimpan di folder Google Drive "Area Barat - Assets". Semua pembayaran dikonfirmasi kasir di meja kasir.')}</li>
          <li>{t('Log dipangkas otomatis di 5.000 entri terakhir agar spreadsheet tetap ringan.')}</li>
        </ul>
      </div>
    </div>
  );
}