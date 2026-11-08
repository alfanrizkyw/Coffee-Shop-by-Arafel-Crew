'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Role } from '@/lib/types';
import { useI18n, LangToggle } from '@/lib/i18n';

export interface NavItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string; 'aria-hidden'?: boolean }>;
}

const ROLE_LABEL: Record<Role, string> = { kasir: 'Kasir', bos: 'Bos', dev: 'Developer' };

export default function StaffShell({ username, role, title, nav, active, onNav, children, alertCount }: {
  username: string;
  role: Role;
  title: string;
  nav: NavItem[];
  active: string;
  onNav: (key: string) => void;
  children: React.ReactNode;
  alertCount?: number;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = `${t(title)} — Area Barat`;
  }, [title, t]);

  const logout = async () => {
    setBusy(true);
    try {
      await api('/api/auth/logout', 'POST', {});
      router.push('/login');
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-30 bg-forest-900 border-b border-forest-750">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-2 sm:gap-3">
          <Image src="/logo.webp" alt="Area Barat" width={110} height={41} sizes="96px" className="w-20 sm:w-24 h-auto" priority />
          <span className="font-display font-bold text-sm hidden sm:block">{t(title)}</span>
          <div className="ml-auto flex items-center gap-2">
            <LangToggle />
            <span className="badge bg-forest-700 text-cream-dim border border-forest-600 hidden sm:inline-flex">{t(ROLE_LABEL[role])}</span>
            <span className="text-xs text-moss hidden md:block">{username}</span>
            <button onClick={logout} disabled={busy} className="btn-ghost !min-h-[36px] !px-2.5 !py-1.5" aria-label={t('Keluar')}>
              <LogOut size={15} />
            </button>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto" aria-label={t('Navigasi')}>
          {nav.map((n) => {
            const Icon = n.icon;
            const isActive = active === n.key;
            return (
              <button
                key={n.key}
                onClick={() => onNav(n.key)}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-colors duration-200 min-h-[44px] ${isActive ? 'border-wood-400 text-wood-300' : 'border-transparent text-moss hover:text-cream'}`}
              >
                <Icon size={15} aria-hidden />
                {t(n.label)}
                {n.key === 'pesanan' && !!alertCount && (
                  <span className="badge bg-danger text-white !text-[10px]">{alertCount}</span>
                )}
              </button>
            );
          })}
        </nav>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-5">{children}</main>
    </div>
  );
}