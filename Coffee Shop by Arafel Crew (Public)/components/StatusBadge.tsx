'use client';

import { OrderStatus, PayStatus, ORDER_STATUS_LABEL, PAY_STATUS_LABEL } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

const ORDER_TONE: Record<OrderStatus, string> = {
  baru: 'bg-wood-400/15 text-wood-300 border border-wood-400/40',
  diproses: 'bg-sky/10 text-sky border border-sky/40',
  siap: 'bg-ok/15 text-green-300 border border-ok/50',
  selesai: 'bg-forest-700/40 text-moss border border-forest-700',
  batal: 'bg-danger/10 text-red-300 border border-danger/40',
};

const PAY_TONE: Record<PayStatus, string> = {
  belum_bayar: 'bg-danger/10 text-red-300 border border-danger/40',
  lunas: 'bg-ok/15 text-green-300 border border-ok/50',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useI18n();
  return <span className={`badge ${ORDER_TONE[status]}`}>{t(ORDER_STATUS_LABEL[status])}</span>;
}

export function PayStatusBadge({ status }: { status: PayStatus }) {
  const { t } = useI18n();
  return <span className={`badge ${PAY_TONE[status]}`}>{t(PAY_STATUS_LABEL[status])}</span>;
}