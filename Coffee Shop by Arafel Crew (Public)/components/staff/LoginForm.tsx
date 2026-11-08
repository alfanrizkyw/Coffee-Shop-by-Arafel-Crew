'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useI18n, LangToggle } from '@/lib/i18n';
import { Alert } from '@/components/ui';

export default function LoginForm() {
  const router = useRouter();
  const { t } = useI18n();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    document.title = `${t('Login Staff')} — Area Barat`;
  }, [t]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const res = await api<{ redirect: string }>('/api/auth/login', 'POST', { username, password });
      router.push(res.redirect);
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Login gagal.');
      setBusy(false);
    }
  };

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-end mb-3">
          <LangToggle />
        </div>
        <div className="flex justify-center mb-6">
          <Image src="/logo.webp" alt="Area Barat" width={280} height={105} priority sizes="240px" className="w-60 h-auto" />
        </div>
        <div className="card p-6">
          <h1 className="font-display text-xl font-bold mb-1">{t('Login Staff')}</h1>
          <p className="text-sm text-moss mb-5">{t('Untuk kasir, bos, dan developer.')}</p>
          <form onSubmit={submit} className="space-y-4">
            {err && <Alert>{t(err)}</Alert>}
            <div>
              <label htmlFor="username" className="label">{t('Username')}</label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                className="w-full"
              />
            </div>
            <div>
              <label htmlFor="password" className="label">{t('Password')}</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full"
              />
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full">
              <LogIn size={16} aria-hidden /> {busy ? t('Memeriksa…') : t('Masuk')}
            </button>
          </form>
        </div>
        <Link href="/" className="chip border-forest-750 bg-forest-900 text-moss hover:text-cream mt-4 mx-auto flex w-fit">
          <ArrowLeft size={14} aria-hidden /> {t('Kembali ke halaman pelanggan')}
        </Link>
      </div>
    </main>
  );
}