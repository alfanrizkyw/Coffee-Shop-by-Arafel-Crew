'use client';

import { useState } from 'react';
import { Download, TrendingUp, ReceiptText, Coins, CupSoda, Star } from 'lucide-react';
import { jakartaDateShort, jakartaDateTime, rupiah } from '@/lib/money';
import { Report } from '@/lib/reports';
import { ORDER_STATUS_LABEL, PAY_METHOD_LABEL, PAY_STATUS_LABEL } from '@/lib/types';
import { usePoll } from '@/lib/usePoll';
import { useI18n } from '@/lib/i18n';
import { Alert, EmptyState, Spinner } from '@/components/ui';
import { OrderStatusBadge, PayStatusBadge } from '@/components/StatusBadge';
import { Stars } from '@/components/Stars';

export default function ReportsView() {
  const { t } = useI18n();
  const [range, setRange] = useState<'1' | '7' | '30'>('7');
  const { data: report, error, loading } = usePoll<Report>(`/api/staff/reports?range=${range}`, 30000);

  const exportCsv = () => {
    if (!report) return;
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [
      ['Kode', 'Waktu (WIB)', 'Nama', 'Meja', 'Items', 'Total', 'Metode', 'Status Bayar', 'Status Pesanan'].map(esc).join(';'),
      ...report.orders.map((o) => [
        o.kode,
        jakartaDateTime(o.dibuat),
        o.nama,
        o.meja,
        o.items.map((i) => `${i.qty}x ${i.nama}`).join(', '),
        o.total,
        PAY_METHOD_LABEL[o.metode],
        PAY_STATUS_LABEL[o.statusBayar],
        ORDER_STATUS_LABEL[o.status],
      ].map(esc).join(';')),
    ];
    const blob = new Blob(['\uFEFF' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `laporan-area-barat-${range}hari.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {([['1', 'Hari Ini'], ['7', '7 Hari'], ['30', '30 Hari']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setRange(key)}
            className={`chip ${range === key ? 'bg-forest-600 border-forest-500 text-white' : 'bg-forest-850 border-forest-750 text-cream-dim hover:bg-forest-800'}`}
            aria-pressed={range === key}
          >
            {t(label)}
          </button>
        ))}
        <button onClick={exportCsv} disabled={!report || report.orders.length === 0} className="btn-ghost !min-h-[38px] !text-xs ml-auto">
          <Download size={14} /> {t('Export CSV')}
        </button>
      </div>

      {error && <Alert tone="warn">{t('Koneksi terganggu: {error}. Data diperbarui otomatis tiap 30 detik.', { error: t(error) })}</Alert>}
      {loading || !report ? <Spinner label="Menghitung laporan…" /> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={TrendingUp} label={t('Pendapatan (lunas)')} value={rupiah(report.summary.revenue)} highlight />
            <StatCard icon={ReceiptText} label={t('Pesanan lunas')} value={String(report.summary.paidOrders)} sub={t('{n} total pesanan', { n: report.summary.totalOrders })} />
            <StatCard icon={Coins} label={t('Rata-rata / pesanan')} value={rupiah(report.summary.avgOrder)} />
            <StatCard icon={CupSoda} label={t('Item terjual')} value={String(report.summary.itemsSold)} />
          </div>

          <div className="card p-5">
            <h2 className="font-display font-bold mb-4">{t('Pendapatan Harian')}</h2>
            <DailyChart report={report} />
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <div className="card p-5">
              <h2 className="font-display font-bold mb-3">{t('Menu Terlaris')}</h2>
              {report.topItems.length === 0 ? <p className="text-sm text-moss">{t('Belum ada penjualan lunas di periode ini.')}</p> : (
                <ol className="space-y-2">
                  {report.topItems.map((it, i) => (
                    <li key={it.nama} className="flex items-center gap-3 text-sm">
                      <span className="w-6 h-6 rounded-full bg-forest-700 text-cream-dim text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className="flex-1 truncate">{it.nama}</span>
                      <span className="text-moss text-xs tabular-nums">{it.qty}×</span>
                      <span className="text-wood-300 font-semibold tabular-nums text-xs">{rupiah(it.revenue)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="card p-5 space-y-4">
              <div>
                <h2 className="font-display font-bold mb-3">{t('Metode Pembayaran (lunas)')}</h2>
                <div className="grid grid-cols-2 gap-3">
                  {(['qris', 'tunai'] as const).map((m) => (
                    <div key={m} className="rounded-lg bg-forest-900 border border-forest-750 p-3">
                      <p className="text-xs text-moss uppercase">{t(PAY_METHOD_LABEL[m])}</p>
                      <p className="font-bold text-wood-300">{rupiah(report.methods[m].revenue)}</p>
                      <p className="text-xs text-moss">{t('{n} pesanan', { n: report.methods[m].count })}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="font-display font-bold mb-2">{t('Status Pesanan')}</h2>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(report.statusCounts) as (keyof typeof report.statusCounts)[]).map((s) => (
                    <span key={s} className="text-xs text-cream-dim inline-flex items-center gap-1.5">
                      <OrderStatusBadge status={s} /> <span className="tabular-nums font-bold">{report.statusCounts[s]}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold">{t('Ulasan Pelanggan')}</h2>
              <span className="text-xs text-moss tabular-nums">{t('{n} ulasan', { n: report.reviewSummary.count })}</span>
            </div>
            {report.reviewSummary.count === 0 ? (
              <p className="text-sm text-moss">{t('Belum ada ulasan di periode ini. Ulasan muncul setelah pelanggan menyelesaikan pesanan dan memberi rating.')}</p>
            ) : (
              <div className="grid lg:grid-cols-[240px_1fr] gap-5">
                <div className="space-y-3">
                  <div className="flex items-end gap-2">
                    <span className="font-display font-bold text-4xl text-wood-300 tabular-nums leading-none">{report.reviewSummary.avg.toFixed(1)}</span>
                    <Stars value={report.reviewSummary.avg} size={16} className="mb-0.5" />
                  </div>
                  <div className="space-y-1.5">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const n = report.reviewSummary.dist[star - 1];
                      const pct = report.reviewSummary.count ? (n / report.reviewSummary.count) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 text-xs">
                          <span className="w-3 text-moss tabular-nums">{star}</span>
                          <Star size={11} className="text-wood-400 fill-wood-400 shrink-0" aria-hidden />
                          <div className="flex-1 h-1.5 rounded-full bg-forest-800 overflow-hidden">
                            <div className="h-full rounded-full bg-wood-400" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-6 text-right text-moss tabular-nums">{n}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <ul className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {report.reviews.map((r) => (
                    <li key={r.id} className="rounded-lg bg-forest-900 border border-forest-750 p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-semibold truncate">{r.nama}</span>
                        <Stars value={r.rating} size={12} />
                      </div>
                      {r.komentar && <p className="text-sm text-cream-dim">{r.komentar}</p>}
                      <p className="text-[11px] text-moss mt-1">{r.kode} · {jakartaDateTime(r.dibuat)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="card p-5">
            <h2 className="font-display font-bold mb-3">{t('Transaksi ({n})', { n: report.orders.length })}</h2>
            {report.orders.length === 0 ? (
              <EmptyState title="Belum ada transaksi" desc="Transaksi muncul otomatis setelah ada pesanan masuk." />
            ) : (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="text-left text-xs text-moss uppercase border-b border-forest-750">
                      <th className="py-2 pr-3 font-semibold">{t('Kode')}</th>
                      <th className="py-2 pr-3 font-semibold">{t('Waktu')}</th>
                      <th className="py-2 pr-3 font-semibold">{t('Pelanggan')}</th>
                      <th className="py-2 pr-3 font-semibold text-right">{t('Total')}</th>
                      <th className="py-2 pr-3 font-semibold">{t('Bayar')}</th>
                      <th className="py-2 font-semibold">{t('Status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.orders.map((o) => (
                      <tr key={o.id} className="border-b border-forest-800 last:border-0">
                        <td className="py-2.5 pr-3 font-bold">{o.kode}</td>
                        <td className="py-2.5 pr-3 text-moss text-xs whitespace-nowrap">{jakartaDateTime(o.dibuat)}</td>
                        <td className="py-2.5 pr-3 text-cream-dim">{o.nama} <span className="text-moss text-xs">· {o.meja}</span></td>
                        <td className="py-2.5 pr-3 text-right tabular-nums font-semibold text-wood-300">{rupiah(o.total)}</td>
                        <td className="py-2.5 pr-3"><PayStatusBadge status={o.statusBayar} /></td>
                        <td className="py-2.5"><OrderStatusBadge status={o.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, highlight = false }: {
  icon: React.ComponentType<{ size?: number | string; className?: string; 'aria-hidden'?: boolean }>;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`card p-4 ${highlight ? 'border-wood-400/50' : ''}`}>
      <div className="flex items-center gap-2 text-moss mb-1.5">
        <Icon size={14} aria-hidden />
        <p className="text-xs">{label}</p>
      </div>
      <p className={`font-display font-bold text-lg sm:text-xl ${highlight ? 'text-wood-300' : ''}`}>{value}</p>
      {sub && <p className="text-xs text-moss mt-0.5">{sub}</p>}
    </div>
  );
}

function DailyChart({ report }: { report: Report }) {
  const { t } = useI18n();
  const max = Math.max(...report.daily.map((d) => d.revenue), 1);
  const allZero = report.daily.every((d) => d.revenue === 0);
  if (allZero) return <p className="text-sm text-moss">{t('Belum ada pendapatan lunas di periode ini.')}</p>;
  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-1.5 h-44 min-w-full" style={{ width: report.daily.length > 14 ? report.daily.length * 34 : undefined }} role="img" aria-label={t('Grafik pendapatan harian')}>
        {report.daily.map((d) => (
          <div key={d.date} className="flex flex-col items-center gap-1 flex-1 min-w-[26px] h-full" title={t('{date}: {total} ({n} pesanan)', { date: jakartaDateShort(d.date), total: rupiah(d.revenue), n: d.orders })}>
            <span className="text-[9px] text-moss tabular-nums shrink-0">{d.revenue > 0 ? `${Math.round(d.revenue / 1000)}k` : ''}</span>
            <div className="w-full flex-1 flex items-end">
              <div
                className={`w-full rounded-t ${d.revenue > 0 ? 'bg-forest-500' : 'bg-forest-800'}`}
                style={{ height: `${Math.max((d.revenue / max) * 100, d.revenue > 0 ? 4 : 2)}%` }}
              />
            </div>
            <span className="text-[9px] text-moss whitespace-nowrap shrink-0">{jakartaDateShort(d.date)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}