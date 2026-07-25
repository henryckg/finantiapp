import { useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { useDataStore } from '../store/data';
import { TRANSACTION_TYPE_LABELS, type Transaction, type TransactionType } from '../types';
import { formatMoney, toDateInputValue, fromDateInputValue } from '../lib/format';
import { isExpenseType } from '../lib/profitability';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Field';
import { MetricCard, Panel, Spinner } from '../components/ui/Primitives';
import { TransactionTable } from '../components/transactions/TransactionTable';
import { TransactionSheet } from '../components/transactions/TransactionSheet';

export default function Transactions() {
  const { ready, transactions, accounts, categories } = useAppData();
  const deleteTransaction = useDataStore((state) => state.deleteTransaction);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | undefined>();
  const [type, setType] = useState<TransactionType | ''>('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const fromTs = from ? fromDateInputValue(from) : null;
    const toTs = to ? fromDateInputValue(to) + 86_399_999 : null;

    return [...transactions]
      .filter((tx) => {
        if (type && tx.type !== type) return false;
        if (accountId && tx.accountId !== accountId && tx.toAccountId !== accountId) return false;
        if (categoryId && tx.categoryId !== categoryId) return false;
        if (fromTs && tx.date < fromTs) return false;
        if (toTs && tx.date > toTs) return false;
        if (term) {
          const haystack = `${tx.description ?? ''} ${tx.notes ?? ''}`.toLowerCase();
          if (!haystack.includes(term)) return false;
        }
        return true;
      })
      .sort((a, b) => b.date - a.date);
  }, [transactions, type, accountId, categoryId, search, from, to]);

  const totals = useMemo(() => {
    const income = filtered.filter((tx) => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
    const expense = filtered
      .filter((tx) => isExpenseType(tx.type))
      .reduce((sum, tx) => sum + tx.amount, 0);
    return { income, expense, net: income - expense, count: filtered.length };
  }, [filtered]);

  const hasFilters = Boolean(type || accountId || categoryId || search || from || to);

  const clearFilters = () => {
    setType('');
    setAccountId('');
    setCategoryId('');
    setSearch('');
    setFrom('');
    setTo('');
  };

  if (!ready) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="size-6" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        <MetricCard label="Ingresos" value={formatMoney(totals.income)} tone="positive" />
        <MetricCard label="Gastos" value={formatMoney(totals.expense)} tone="negative" />
        <MetricCard
          label="Neto"
          value={formatMoney(totals.net)}
          tone={totals.net >= 0 ? 'positive' : 'negative'}
          hint={`${totals.count} movimientos`}
        />
      </div>

      <Panel
        title="Filtros"
        action={
          hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="text-text-secondary hover:text-text-primary inline-flex items-center gap-1 text-xs"
            >
              <X className="size-3" />
              Limpiar
            </button>
          ) : undefined
        }
        bodyClassName="grid gap-2.5 p-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div className="relative sm:col-span-2 lg:col-span-3">
          <Search className="text-text-tertiary pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por descripción o notas"
            className="pl-9"
          />
        </div>

        <Select value={type} onChange={(event) => setType(event.target.value as TransactionType | '')}>
          <option value="">Todos los tipos</option>
          {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>

        <Select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
          <option value="">Todas las cuentas</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </Select>

        <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="">Todas las categorías</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>

        <Input
          type="date"
          value={from}
          max={to || undefined}
          onChange={(event) => setFrom(event.target.value)}
          aria-label="Desde"
        />
        <Input
          type="date"
          value={to}
          min={from || undefined}
          max={toDateInputValue(Date.now())}
          onChange={(event) => setTo(event.target.value)}
          aria-label="Hasta"
        />
      </Panel>

      <Panel
        title="Movimientos"
        action={
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setEditing(undefined);
              setSheetOpen(true);
            }}
          >
            <Plus className="size-3.5" />
            Nuevo
          </Button>
        }
      >
        <TransactionTable
          transactions={filtered}
          onEdit={(transaction) => {
            setEditing(transaction);
            setSheetOpen(true);
          }}
          onDelete={(transaction) => {
            if (confirm(`¿Eliminar el movimiento "${transaction.description ?? 'sin descripción'}"?`)) {
              void deleteTransaction(transaction.id);
            }
          }}
          emptyMessage={
            hasFilters
              ? 'Ningún movimiento coincide con los filtros aplicados.'
              : 'Registra tu primer movimiento.'
          }
        />
      </Panel>

      <TransactionSheet
        open={sheetOpen}
        transaction={editing}
        onClose={() => {
          setSheetOpen(false);
          setEditing(undefined);
        }}
      />
    </div>
  );
}
