'use client';

import { Star } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export function Stars({ value, size = 14, className = '' }: { value: number; size?: number; className?: string }) {
  const { t } = useI18n();
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} role="img" aria-label={t('{value} dari 5 bintang', { value })}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
          <Star size={size} className="absolute inset-0 text-forest-600" aria-hidden />
          <span className="absolute inset-0 overflow-hidden" style={{ width: `${Math.min(Math.max(value - (i - 1), 0), 1) * 100}%` }}>
            <Star size={size} className="text-wood-400 fill-wood-400" aria-hidden />
          </span>
        </span>
      ))}
    </span>
  );
}

export function StarInput({ value, onChange, disabled = false }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label={t('Rating pesanan')}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={t('{i} bintang', { i })}
          disabled={disabled}
          onClick={() => onChange(i)}
          className="p-1 rounded-md transition-transform duration-150 active:scale-90 cursor-pointer disabled:cursor-not-allowed"
        >
          <Star size={30} className={i <= value ? 'text-wood-400 fill-wood-400' : 'text-forest-600'} aria-hidden />
        </button>
      ))}
    </div>
  );
}