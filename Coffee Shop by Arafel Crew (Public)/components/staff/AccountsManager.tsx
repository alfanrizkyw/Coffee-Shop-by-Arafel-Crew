'use client';

import { useState } from 'react';
import { Pencil, Plus, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { api } from '@/lib/api-client';
import { jakartaDateShort, jakartaDateKey } from '@/lib/money';
import { StaffAccount, StaffRole } from '@/lib/types';
import { usePoll } from '@/lib/usePoll';
import { useI18n } from '@/lib/i18n';
import { Alert, Confirm, EmptyState, Modal, Spinner } from '@/components/ui';
import { useToast } from '@/components/Toast';

const ROLE_LABEL: Record<StaffRole, string> = { kasir: 'Kasir', bos: 'Bos' };

export default function AccountsManager({ username }: { username: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const { data, error, loading, refresh } = usePoll<{ accounts: StaffAccount[] }>('/api/staff/accounts', 30000);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StaffAccount | null>(null);
  const [deleting, setDeleting] = useState<StaffAccount | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const accounts = (data?.accounts ?? []).slice().sort((a, b) => a.username.localeCompare(b.username));

  const doDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api(`/api/staff/accounts/${deleting.id}`, 'DELETE', { expect: deleting.diubah });
      toast(t('Akun "{username}" dihapus.', { username: deleting.username }), 'ok');
      setDeleting(null);
      refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Gagal menghapus akun.', 'error');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <p className="text-sm text-moss flex-1 min-w-[200px]">{t('Kelola akun kasir & bos: tambah admin, ganti username, dan reset password.')}</p>
        <button onClick={() => { setEditing(null); setFormOpen(true); }} className="btn-primary">
          <Plus size={16} aria-hidden /> {t('Tambah Akun')}
        </button>
      </div>

      <Alert tone="info">
        {t('Mengganti password atau username membuat sesi login lama akun itu otomatis keluar.')} {t('Akun')} <span className="font-semibold">dev</span> {t('dikelola terpisah oleh developer (tidak bisa diubah di sini).')}
      </Alert>

      {error && <Alert tone="warn">{t(error)}</Alert>}
      {loading ? <Spinner /> : accounts.length === 0 ? (
        <EmptyState title="Belum ada akun staff" desc="Tambahkan akun kasir atau bos agar staff bisa login." />
      ) : (
        <div className="space-y-2">
          {accounts.map((a) => {
            const self = a.username === username;
            return (
              <div key={a.id} className="card !rounded-lg p-3.5 flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-forest-700 flex items-center justify-center shrink-0" aria-hidden>
                  {a.role === 'bos' ? <ShieldCheck size={18} className="text-wood-300" /> : <UserRound size={18} className="text-forest-300" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {a.username}
                    {self && <span className="text-moss font-normal"> {t('(kamu)')}</span>}
                  </p>
                  <p className="text-xs text-moss">{t(ROLE_LABEL[a.role])} · {t('dibuat {date}', { date: jakartaDateShort(jakartaDateKey(a.dibuat)) })}</p>
                </div>
                <span className={`badge shrink-0 ${a.role === 'bos' ? 'bg-wood-400/15 text-wood-300 border border-wood-400/40' : 'bg-forest-700 text-cream-dim border border-forest-600'}`}>
                  {t(ROLE_LABEL[a.role])}
                </span>
                <button onClick={() => { setEditing(a); setFormOpen(true); }} className="btn-ghost !min-h-[36px] !px-2.5 !py-1.5" aria-label={t('Edit akun {username}', { username: a.username })}>
                  <Pencil size={14} aria-hidden />
                </button>
                <button
                  onClick={() => setDeleting(a)}
                  disabled={self}
                  className="btn-danger !min-h-[36px] !px-2.5 !py-1.5"
                  aria-label={t('Hapus akun {username}', { username: a.username })}
                  title={self ? t('Tidak bisa menghapus akun yang sedang dipakai login') : undefined}
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {formOpen && (
        <AccountFormModal
          key={editing?.id ?? 'new'}
          open={formOpen}
          onClose={() => setFormOpen(false)}
          account={editing}
          onSaved={() => { toast(editing ? t('Akun "{username}" diperbarui.', { username: editing.username }) : 'Akun baru ditambahkan.', 'ok'); refresh(); }}
        />
      )}

      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={doDelete}
        title="Hapus akun?"
        desc={t('Akun "{username}" ({role}) akan dihapus dan tidak bisa login lagi. Tindakan ini tidak bisa dibatalkan.', { username: deleting?.username ?? '', role: deleting ? t(ROLE_LABEL[deleting.role]) : '' })}
        confirmLabel="Ya, Hapus"
        danger
        busy={deleteBusy}
      />
    </div>
  );
}

function AccountFormModal({ open, onClose, account, onSaved }: {
  open: boolean;
  onClose: () => void;
  account: StaffAccount | null;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [username, setUsername] = useState(account?.username ?? '');
  const [role, setRole] = useState<StaffRole>(account?.role ?? 'kasir');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    const uname = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(uname)) { setErr('Username: 3-20 karakter, hanya huruf kecil, angka, dan underscore.'); return; }
    if (uname === 'dev') { setErr('Username "dev" dicadangkan untuk developer.'); return; }
    if (!account && password.length < 6) { setErr('Password minimal 6 karakter.'); return; }
    if (account && password && password.length < 6) { setErr('Password baru minimal 6 karakter.'); return; }
    setBusy(true);
    try {
      if (account) {
        const patch: Record<string, string> = { expect: account.diubah };
        if (uname !== account.username) patch.username = uname;
        if (role !== account.role) patch.role = role;
        if (password) patch.password = password;
        if (Object.keys(patch).length === 1) { setErr('Tidak ada perubahan.'); setBusy(false); return; }
        await api(`/api/staff/accounts/${account.id}`, 'PATCH', patch);
      } else {
        await api('/api/staff/accounts', 'POST', { username: uname, password, role });
      }
      onSaved();
      onClose();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Gagal menyimpan akun.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={account ? t('Edit Akun — {username}', { username: account.username }) : t('Tambah Akun Staff')}>
      <form onSubmit={submit} className="space-y-4">
        {err && <Alert>{t(err)}</Alert>}
        <div>
          <label htmlFor="ac-user" className="label">{t('Username')}</label>
          <input id="ac-user" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={20} required className="w-full" placeholder={t('contoh: kasir2')} autoComplete="off" autoCapitalize="none" spellCheck={false} />
          <p className="text-xs text-moss mt-1">{t('Huruf kecil, angka, underscore. 3-20 karakter.')}</p>
        </div>
        <div>
          <span className="label">{t('Peran')}</span>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setRole('kasir')} className={`btn ${role === 'kasir' ? 'bg-forest-600 text-white border border-forest-500' : 'btn-ghost'}`} aria-pressed={role === 'kasir'}>{t('Kasir')}</button>
            <button type="button" onClick={() => setRole('bos')} className={`btn ${role === 'bos' ? 'bg-forest-600 text-white border border-forest-500' : 'btn-ghost'}`} aria-pressed={role === 'bos'}>{t('Bos')}</button>
          </div>
        </div>
        <div>
          <label htmlFor="ac-pass" className="label">{account ? t('Password Baru (opsional)') : t('Password')}</label>
          <input id="ac-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={100} minLength={account ? undefined : 6} required={!account} className="w-full" placeholder={account ? t('Kosongkan jika tidak diganti') : t('Minimal 6 karakter')} autoComplete="new-password" />
          {account && <p className="text-xs text-moss mt-1">{t('Isi hanya jika ingin mengganti password. Sesi login lama akun ini akan keluar.')}</p>}
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost flex-1" disabled={busy}>{t('Batal')}</button>
          <button type="submit" className="btn-primary flex-1" disabled={busy}>{busy ? t('Menyimpan…') : account ? t('Simpan Perubahan') : t('Tambah Akun')}</button>
        </div>
      </form>
    </Modal>
  );
}