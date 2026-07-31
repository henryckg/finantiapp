import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAppData, useAccountBalances } from '../hooks/useAppData';
import { useDataStore } from '../store/data';
import { ACCOUNT_TYPE_LABELS, type Account, type AccountType } from '../types';
import { formatMoney } from '../lib/format';
import { sortAccounts, sortTransactions } from '../lib/sort';
import { Badge, EmptyState, MetricCard, Panel, Spinner } from '../components/ui/Primitives';
import { Button } from '../components/ui/Button';
import { FieldRow, Input, Select } from '../components/ui/Field';
import { Sheet } from '../components/ui/Sheet';
import { TransactionTable } from '../components/transactions/TransactionTable';
import { cn } from '../lib/utils';

const COLORS = ['#5E6AD2', '#4CC38A', '#F0654A', '#E5A050', '#4A9CF0', '#C061CB'];

export default function Accounts() {
  const { ready, accounts, transactions } = useAppData();
  const balances = useAccountBalances();
  const createAccount = useDataStore((state) => state.createAccount);
  const updateAccount = useDataStore((state) => state.updateAccount);
  const deleteAccount = useDataStore((state) => state.deleteAccount);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | undefined>();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [color, setColor] = useState(COLORS[0]!);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('cuenta');
    if (param) setSelectedId(param);
  }, []);

  const total = useMemo(
    () => accounts.reduce((sum, account) => sum + (balances[account.id] ?? 0), 0),
    [accounts, balances],
  );

  const sortedAccounts = useMemo(() => sortAccounts(accounts), [accounts]);

  const selected = accounts.find((account) => account.id === selectedId);

  const selectedTransactions = useMemo(() => {
    if (!selected) return [];
    return sortTransactions(
      transactions.filter((tx) => tx.accountId === selected.id || tx.toAccountId === selected.id),
    ).slice(0, 40);
  }, [selected, transactions]);

  const openCreate = () => {
    setEditing(undefined);
    setName('');
    setType('bank');
    setColor(COLORS[0]!);
    setError(null);
    setFormOpen(true);
  };

  const openEdit = (account: Account) => {
    setEditing(account);
    setName(account.name);
    setType(account.type);
    setColor(account.color ?? COLORS[0]!);
    setError(null);
    setFormOpen(true);
  };

  const submit = async () => {
    if (!name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    if (editing) {
      await updateAccount(editing.id, { name: name.trim(), type, color });
    } else {
      await createAccount({
        name: name.trim(),
        type,
        currency: 'CLP',
        balance: 0,
        color,
        icon: null,
        isActive: true,
      });
    }
    setFormOpen(false);
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
      <MetricCard label="Saldo total" value={formatMoney(total)} hint={`${accounts.length} cuentas`} />

      <Panel
        title="Cuentas"
        action={
          <Button size="sm" variant="primary" onClick={openCreate}>
            <Plus className="size-3.5" />
            Agregar
          </Button>
        }
      >
        {accounts.length === 0 ? (
          <EmptyState
            title="Sin cuentas"
            description="Agrega tu primera cuenta bancaria, billetera digital o efectivo."
          />
        ) : (
          <ul className="divide-border-subtle/70 divide-y">
            {sortedAccounts.map((account) => {
              const balance = balances[account.id] ?? 0;
              return (
                <li key={account.id} className="row-hover flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setSelectedId(account.id === selectedId ? null : account.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: account.color ?? '#5E6AD2' }}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{account.name}</span>
                      <span className="text-text-tertiary block text-xs">
                        {ACCOUNT_TYPE_LABELS[account.type]}
                      </span>
                    </span>
                  </button>
                  <span
                    className={cn(
                      'num shrink-0 text-sm',
                      balance < 0 ? 'text-negative' : 'text-text-primary',
                    )}
                  >
                    {formatMoney(balance)}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label="Editar cuenta"
                      onClick={() => openEdit(account)}
                      className="text-text-tertiary hover:text-text-primary rounded p-1 transition-colors hover:bg-white/5"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Eliminar cuenta"
                      onClick={() => {
                        if (confirm(`¿Eliminar la cuenta "${account.name}"?`)) {
                          void deleteAccount(account.id);
                          if (selectedId === account.id) setSelectedId(null);
                        }
                      }}
                      className="text-text-tertiary hover:text-negative rounded p-1 transition-colors hover:bg-white/5"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {selected && (
        <Panel
          title={`Historial · ${selected.name}`}
          action={<Badge tone="neutral">{formatMoney(balances[selected.id] ?? 0)}</Badge>}
        >
          <TransactionTable transactions={selectedTransactions} compact />
        </Panel>
      )}

      <Sheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar cuenta' : 'Nueva cuenta'}
        description="El saldo se calcula automáticamente desde los movimientos."
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => void submit()}>
              {editing ? 'Guardar' : 'Crear cuenta'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3.5">
          <FieldRow label="Nombre" error={error ?? undefined}>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="BCI Cuenta Corriente"
            />
          </FieldRow>

          <FieldRow label="Tipo">
            <Select value={type} onChange={(event) => setType(event.target.value as AccountType)}>
              {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FieldRow>

          <FieldRow label="Color">
            <div className="flex flex-wrap gap-2">
              {COLORS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-label={`Color ${option}`}
                  onClick={() => setColor(option)}
                  className={cn(
                    'size-7 rounded-md border transition-transform',
                    color === option ? 'border-text-primary scale-105' : 'border-transparent',
                  )}
                  style={{ backgroundColor: option }}
                />
              ))}
            </div>
          </FieldRow>
        </div>
      </Sheet>
    </div>
  );
}
