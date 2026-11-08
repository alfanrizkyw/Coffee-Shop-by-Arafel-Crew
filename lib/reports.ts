import { jakartaDateKey } from './money';
import { Order, OrderStatus, PayMethod, Review, ReviewSummary } from './types';

export interface DailyPoint { date: string; revenue: number; orders: number }
export interface TopItem { nama: string; qty: number; revenue: number }

export interface Report {
  rangeDays: number;
  summary: {
    revenue: number;
    paidOrders: number;
    totalOrders: number;
    avgOrder: number;
    itemsSold: number;
    todayRevenue: number;
    todayOrders: number;
  };
  daily: DailyPoint[];
  topItems: TopItem[];
  methods: Record<PayMethod, { count: number; revenue: number }>;
  statusCounts: Record<OrderStatus, number>;
  orders: Order[];
  reviews: Review[];
  reviewSummary: ReviewSummary;
}

function isRevenue(o: Order): boolean {
  return o.statusBayar === 'lunas' && o.status !== 'batal';
}

export function buildReport(orders: Order[], rangeDays: number, reviews: Review[] = [], now = new Date()): Report {
  const todayKey = jakartaDateKey(now);
  const dailyMap = new Map<string, DailyPoint>();
  for (let i = rangeDays - 1; i >= 0; i--) {
    const key = jakartaDateKey(new Date(now.getTime() - i * 86400000));
    dailyMap.set(key, { date: key, revenue: 0, orders: 0 });
  }
  const firstKey = dailyMap.keys().next().value as string;
  const inRange = orders.filter((o) => {
    const key = jakartaDateKey(o.dibuat);
    return key >= firstKey && key <= todayKey;
  });

  const itemMap = new Map<string, TopItem>();
  const methods: Report['methods'] = { qris: { count: 0, revenue: 0 }, tunai: { count: 0, revenue: 0 } };
  const statusCounts: Report['statusCounts'] = { baru: 0, diproses: 0, siap: 0, selesai: 0, batal: 0 };

  let revenue = 0, paidOrders = 0, itemsSold = 0, todayRevenue = 0, todayOrders = 0;

  for (const o of inRange) {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    const key = jakartaDateKey(o.dibuat);
    const paid = isRevenue(o);
    if (paid) {
      revenue += o.total;
      paidOrders++;
      methods[o.metode].count++;
      methods[o.metode].revenue += o.total;
      const point = dailyMap.get(key);
      if (point) { point.revenue += o.total; point.orders++; }
      if (key === todayKey) { todayRevenue += o.total; todayOrders++; }
      for (const it of o.items) {
        itemsSold += it.qty;
        const cur = itemMap.get(it.nama) || { nama: it.nama, qty: 0, revenue: 0 };
        cur.qty += it.qty;
        cur.revenue += it.harga * it.qty;
        itemMap.set(it.nama, cur);
      }
    }
  }

  const topItems = [...itemMap.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).slice(0, 10);

  const inRangeReviews = reviews
    .filter((r) => { const k = jakartaDateKey(r.dibuat); return k >= firstKey && k <= todayKey; })
    .sort((a, b) => b.dibuat.localeCompare(a.dibuat));
  const dist = [0, 0, 0, 0, 0];
  let ratingSum = 0;
  for (const r of inRangeReviews) {
    const idx = Math.min(Math.max(Math.round(r.rating) - 1, 0), 4);
    dist[idx]++;
    ratingSum += r.rating;
  }
  const reviewSummary: ReviewSummary = {
    count: inRangeReviews.length,
    avg: inRangeReviews.length ? Math.round((ratingSum / inRangeReviews.length) * 10) / 10 : 0,
    dist,
  };

  return {
    rangeDays,
    summary: {
      revenue, paidOrders, totalOrders: inRange.length,
      avgOrder: paidOrders ? Math.round(revenue / paidOrders) : 0,
      itemsSold, todayRevenue, todayOrders,
    },
    daily: [...dailyMap.values()],
    topItems,
    methods,
    statusCounts,
    orders: inRange.sort((a, b) => b.dibuat.localeCompare(a.dibuat)),
    reviews: inRangeReviews,
    reviewSummary,
  };
}