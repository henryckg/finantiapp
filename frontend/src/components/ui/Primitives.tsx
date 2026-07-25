import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface PanelProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function Panel({ title, action, children, className, bodyClassName }: PanelProps) {
  return (
    <section className={cn('panel overflow-hidden', className)}>
      {(title || action) && (
        <header className="border-border-subtle flex items-center justify-between gap-2 border-b px-4 py-2.5">
          {title && <h2 className="text-[0.8125rem] font-semibold">{title}</h2>}
          {action}
        </header>
      )}
      <div className={cn(bodyClassName)}>{children}</div>
    </section>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'positive' | 'negative';
  icon?: ReactNode;
}

export function MetricCard({ label, value, hint, tone = 'neutral', icon }: MetricCardProps) {
  return (
    <div className="panel flex flex-col gap-1 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="label-xs">{label}</span>
        {icon && <span className="text-text-tertiary">{icon}</span>}
      </div>
      <span
        className={cn(
          'num text-[1.375rem] leading-tight font-semibold',
          tone === 'positive' && 'text-positive',
          tone === 'negative' && 'text-negative',
        )}
      >
        {value}
      </span>
      {hint && <span className="text-text-tertiary text-xs">{hint}</span>}
    </div>
  );
}

type BadgeTone = 'neutral' | 'accent' | 'positive' | 'negative' | 'warning';

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-white/5 text-text-secondary border-border-subtle',
  accent: 'bg-accent/15 text-accent border-accent/30',
  positive: 'bg-positive/10 text-positive border-positive/30',
  negative: 'bg-negative/10 text-negative border-negative/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[0.6875rem] font-medium whitespace-nowrap',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  tone = 'accent',
  className,
}: {
  value: number;
  tone?: 'accent' | 'positive';
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-white/8', className)}>
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-300',
          tone === 'accent' ? 'bg-accent' : 'bg-positive',
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-text-secondary max-w-xs text-xs">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'border-border-subtle bg-bg-secondary scrollbar-none inline-flex gap-0.5 overflow-x-auto rounded-md border p-0.5',
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors',
            option.value === value
              ? 'bg-bg-elevated text-text-primary'
              : 'text-text-secondary hover:text-text-primary',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'border-border-strong border-t-accent size-4 animate-spin rounded-full border-2',
        className,
      )}
    />
  );
}
