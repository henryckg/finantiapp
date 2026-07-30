const clpFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const shortDateFormatter = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit',
  month: 'short',
});

const monthFormatter = new Intl.DateTimeFormat('es-CL', {
  month: 'short',
  year: '2-digit',
});

const longMonthFormatter = new Intl.DateTimeFormat('es-CL', {
  month: 'long',
  year: 'numeric',
});

export function centsToUnits(cents: number): number {
  return cents / 100;
}

export function unitsToCents(units: number): number {
  return Math.round(units * 100);
}

export function formatMoney(cents: number): string {
  return clpFormatter.format(centsToUnits(cents)).replace(/\s/g, ' ');
}

export function formatMoneySigned(cents: number): string {
  const sign = cents > 0 ? '+' : cents < 0 ? '-' : '';
  return `${sign}${formatMoney(Math.abs(cents))}`;
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatPercent(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${value >= 0 ? '' : '-'}${Math.abs(value).toFixed(digits)}%`;
}

export function formatDate(timestamp: number): string {
  return dateFormatter.format(new Date(timestamp));
}

export function formatShortDate(timestamp: number): string {
  return shortDateFormatter.format(new Date(timestamp));
}

export function formatMonth(timestamp: number): string {
  return monthFormatter.format(new Date(timestamp));
}

export function formatLongMonth(timestamp: number): string {
  return longMonthFormatter.format(new Date(timestamp));
}

export function toDateInputValue(timestamp: number): string {
  const date = new Date(timestamp);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function fromDateInputValue(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, 12, 0, 0, 0).getTime();
}

export function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function startOfMonth(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

export function endOfMonth(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
}

export function startOfYear(timestamp: number): number {
  return new Date(new Date(timestamp).getFullYear(), 0, 1).getTime();
}

export function addMonths(timestamp: number, months: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate()).getTime();
}

export function relativeDayLabel(timestamp: number): string {
  const today = new Date();
  const target = new Date(timestamp);
  const diffDays = Math.round(
    (new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime() -
      new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
      86_400_000,
  );
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Mañana';
  if (diffDays === -1) return 'Ayer';
  if (diffDays > 1) return `En ${diffDays} días`;
  return `Hace ${Math.abs(diffDays)} días`;
}
