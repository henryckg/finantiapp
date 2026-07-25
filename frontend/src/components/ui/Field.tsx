import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { cn } from '../../lib/utils';

export function Label({ className, children, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('text-text-secondary text-xs font-medium', className)} {...props}>
      {children}
    </label>
  );
}

interface FieldRowProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function FieldRow({ label, htmlFor, hint, error, children }: FieldRowProps) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-start gap-3 max-sm:grid-cols-1 max-sm:gap-1.5">
      <Label htmlFor={htmlFor} className="pt-2 max-sm:pt-0">
        {label}
      </Label>
      <div className="min-w-0">
        {children}
        {hint && !error && <p className="text-text-tertiary mt-1 text-xs">{hint}</p>}
        {error && <p className="text-negative mt-1 text-xs">{error}</p>}
      </div>
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('field', className)} {...props} />;
}

export function MoneyInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <span className="text-text-tertiary num pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
        $
      </span>
      <input
        inputMode="numeric"
        className={cn('field num pl-7', className)}
        placeholder="0"
        {...props}
      />
    </div>
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn('field appearance-none pr-8', className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn('field min-h-18 resize-y', className)} {...props} />;
}
