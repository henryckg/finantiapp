import { Pencil, Trash2 } from 'lucide-react';
import type { Transaction } from '../../types';
import { TRANSACTION_TYPE_LABELS } from '../../types';
import { formatMoneySigned, formatShortDate } from '../../lib/format';
import { signedAmount } from '../../lib/profitability';
import { useAccountMap, useCategoryMap, useInvestmentMap } from '../../hooks/useAppData';
import { Badge, EmptyState } from '../ui/Primitives';
import { cn } from '../../lib/utils';

interface Props {
  transactions: Transaction[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  compact?: boolean;
  emptyMessage?: string;
}

export function TransactionTable({
  transactions,
  onEdit,
  onDelete,
  compact = false,
  emptyMessage = 'Aún no hay movimientos registrados.',
}: Props) {
  const categories = useCategoryMap();
  const accounts = useAccountMap();
  const investments = useInvestmentMap();

  if (transactions.length === 0) {
    return <EmptyState title="Sin movimientos" description={emptyMessage} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-border-subtle text-text-tertiary border-b text-left">
            <th className="px-3 py-2 text-[0.6875rem] font-medium tracking-wide uppercase">
              Fecha
            </th>
            {!compact && (
              <th className="px-3 py-2 text-[0.6875rem] font-medium tracking-wide uppercase">
                Tipo
              </th>
            )}
            <th className="px-3 py-2 text-[0.6875rem] font-medium tracking-wide uppercase">
              Detalle
            </th>
            {!compact && (
              <th className="hidden px-3 py-2 text-[0.6875rem] font-medium tracking-wide uppercase sm:table-cell">
                Cuenta
              </th>
            )}
            <th className="px-3 py-2 text-right text-[0.6875rem] font-medium tracking-wide uppercase">
              Monto
            </th>
            {(onEdit || onDelete) && <th className="w-16 px-3 py-2" />}
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => {
            const amount = signedAmount(transaction);
            const category = transaction.categoryId
              ? categories[transaction.categoryId]
              : undefined;
            const account = accounts[transaction.accountId];
            const toAccount = transaction.toAccountId
              ? accounts[transaction.toAccountId]
              : undefined;
            const investment = transaction.investmentId
              ? investments[transaction.investmentId]
              : undefined;

            const detail =
              transaction.description ??
              category?.name ??
              investment?.name ??
              TRANSACTION_TYPE_LABELS[transaction.type];

            const secondary = [
              category?.name,
              investment?.name,
              transaction.type === 'transfer' && toAccount ? `→ ${toAccount.name}` : null,
            ]
              .filter(Boolean)
              .join(' · ');

            return (
              <tr key={transaction.id} className="border-border-subtle/70 row-hover border-b">
                <td className="num text-text-secondary px-3 py-2 text-xs whitespace-nowrap">
                  {formatShortDate(transaction.date)}
                </td>
                {!compact && (
                  <td className="px-3 py-2">
                    <Badge
                      tone={
                        transaction.type === 'income'
                          ? 'positive'
                          : transaction.type === 'transfer'
                            ? 'neutral'
                            : transaction.type === 'investment_contribution' ||
                                transaction.type === 'investment_withdrawal'
                              ? 'accent'
                              : 'negative'
                      }
                    >
                      {TRANSACTION_TYPE_LABELS[transaction.type]}
                    </Badge>
                  </td>
                )}
                <td className="max-w-56 px-3 py-2">
                  <p className="truncate">{detail}</p>
                  {secondary && (
                    <p className="text-text-tertiary truncate text-xs">{secondary}</p>
                  )}
                </td>
                {!compact && (
                  <td className="text-text-secondary hidden px-3 py-2 text-xs sm:table-cell">
                    {account?.name ?? '—'}
                  </td>
                )}
                <td
                  className={cn(
                    'num px-3 py-2 text-right whitespace-nowrap',
                    amount > 0 && 'text-positive',
                    amount < 0 && 'text-negative',
                    amount === 0 && 'text-text-secondary',
                  )}
                >
                  {amount === 0
                    ? formatMoneySigned(transaction.amount).replace('+', '')
                    : formatMoneySigned(amount)}
                </td>
                {(onEdit || onDelete) && (
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      {onEdit && (
                        <button
                          type="button"
                          aria-label="Editar movimiento"
                          onClick={() => onEdit(transaction)}
                          className="text-text-tertiary hover:text-text-primary rounded p-1 transition-colors hover:bg-white/5"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          aria-label="Eliminar movimiento"
                          onClick={() => onDelete(transaction)}
                          className="text-text-tertiary hover:text-negative rounded p-1 transition-colors hover:bg-white/5"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
