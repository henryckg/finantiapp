import type {
  Account,
  Category,
  Investment,
  InvestmentValueSnapshot,
  Transaction,
} from '../types';
import { formatMonth, startOfMonth } from './format';
import { isExpenseType, liquidTotal } from './profitability';

export type RangeKey = 'week' | 'month' | 'year' | 'all';

export const RANGE_OPTIONS: Array<{ value: RangeKey; label: string }> = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'year', label: 'Año' },
  { value: 'all', label: 'Todo' },
];

export function rangeStart(range: RangeKey, now = Date.now()): number {
  const date = new Date(now);
  switch (range) {
    case 'week':
      return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 6).getTime();
    case 'month':
      return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
    case 'year':
      return new Date(date.getFullYear(), 0, 1).getTime();
    case 'all':
      return 0;
  }
}

export interface CategoryTotal {
  categoryId: string | null;
  name: string;
  value: number;
  share: number;
}

export function expensesByCategory(
  transactions: Transaction[],
  categories: Category[],
  from: number,
  to: number = Date.now(),
): CategoryTotal[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const totals = new Map<string, number>();

  for (const tx of transactions) {
    if (!isExpenseType(tx.type)) continue;
    if (tx.date < from || tx.date > to) continue;
    const key = tx.categoryId ?? 'sin-categoria';
    totals.set(key, (totals.get(key) ?? 0) + tx.amount);
  }

  const total = [...totals.values()].reduce((sum, value) => sum + value, 0);

  return [...totals.entries()]
    .map(([key, value]) => ({
      categoryId: key === 'sin-categoria' ? null : key,
      name: byId.get(key)?.name ?? 'Sin categoría',
      value,
      share: total > 0 ? (value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

export interface MonthlyFlowPoint {
  label: string;
  timestamp: number;
  income: number;
  expense: number;
}

export function monthlyFlows(transactions: Transaction[], months = 6): MonthlyFlowPoint[] {
  const now = new Date();
  const points: MonthlyFlowPoint[] = [];

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0, 23, 59, 59, 999);
    const inRange = transactions.filter((tx) => tx.date >= start.getTime() && tx.date <= end.getTime());

    points.push({
      label: formatMonth(start.getTime()),
      timestamp: start.getTime(),
      income: inRange
        .filter((tx) => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0),
      expense: inRange.filter((tx) => isExpenseType(tx.type)).reduce((sum, tx) => sum + tx.amount, 0),
    });
  }

  return points;
}

export interface PatrimonySeriesPoint {
  label: string;
  timestamp: number;
  liquid: number;
  invested: number;
  total: number;
}

function investedValueAt(
  investments: Investment[],
  snapshots: InvestmentValueSnapshot[],
  boundary: number,
): number {
  return investments.reduce((sum, investment) => {
    if (investment.createdAt > boundary) return sum;
    const candidates = snapshots
      .filter((snap) => snap.investmentId === investment.id && snap.date <= boundary)
      .sort((a, b) => b.date - a.date);
    return sum + (candidates[0]?.value ?? 0);
  }, 0);
}

export function patrimonySeries(
  accounts: Account[],
  investments: Investment[],
  transactions: Transaction[],
  snapshots: InvestmentValueSnapshot[],
  range: RangeKey,
  now = Date.now(),
): PatrimonySeriesPoint[] {
  const buckets: number[] = [];
  const today = new Date(now);

  if (range === 'week') {
    for (let offset = 6; offset >= 0; offset -= 1) {
      buckets.push(
        new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset, 23, 59, 59).getTime(),
      );
    }
  } else if (range === 'month') {
    const daysInMonth = today.getDate();
    const step = Math.max(1, Math.ceil(daysInMonth / 8));
    for (let day = 1; day <= daysInMonth; day += step) {
      buckets.push(new Date(today.getFullYear(), today.getMonth(), day, 23, 59, 59).getTime());
    }
    buckets.push(now);
  } else {
    const monthCount = range === 'year' ? today.getMonth() + 1 : 12;
    for (let offset = monthCount - 1; offset >= 0; offset -= 1) {
      const date = new Date(today.getFullYear(), today.getMonth() - offset + 1, 0, 23, 59, 59);
      buckets.push(Math.min(date.getTime(), now));
    }
  }

  return buckets.map((boundary) => {
    const txUntil = transactions.filter((tx) => tx.date <= boundary);
    const liquid = liquidTotal(accounts, txUntil);
    const invested = investedValueAt(investments, snapshots, boundary);
    return {
      label:
        range === 'week' || range === 'month'
          ? new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short' }).format(boundary)
          : formatMonth(boundary),
      timestamp: boundary,
      liquid,
      invested,
      total: liquid + invested,
    };
  });
}

export function monthSummary(transactions: Transaction[], now = Date.now()) {
  const from = startOfMonth(now);
  const inMonth = transactions.filter((tx) => tx.date >= from && tx.date <= now);
  const income = inMonth.filter((tx) => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
  const expense = inMonth
    .filter((tx) => isExpenseType(tx.type))
    .reduce((sum, tx) => sum + tx.amount, 0);
  return { income, expense, net: income - expense, from, to: now };
}
