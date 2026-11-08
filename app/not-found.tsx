'use client';

import Link from 'next/link';
import { useI18n, LangToggle } from '@/lib/i18n';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card p-8 max-w-md text-center">
        <div className="flex justify-center mb-4"><LangToggle /></div>
        <h1 className="font-display text-xl font-bold mb-2">{t('Halaman tidak ditemukan')}</h1>
        <p className="text-moss text-sm mb-6">{t('Alamat yang kamu tuju tidak ada.')}</p>
        <Link href="/" className="btn-primary w-full">{t('Kembali ke Menu')}</Link>
      </div>
    </main>
  );
}