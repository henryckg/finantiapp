import { useMemo, useState } from 'react';
import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { useDataStore } from '../store/data';
import {
  SCHEDULED_EXPENSE_STATUS_LABELS,
  type ScheduledExpense,
  type ScheduledExpenseStatus,
} from '../types';
import {
  centsToUnits,
  formatDate,
  formatMoney,
  fromDateInputValue,
  relativeDayLabel,
  toDateInputValue,
  unitsToCents,
} from '../lib/format';
import {
  Badge,
  EmptyState,
  MetricCard,
  Panel,
  SegmentedControl,
  Spinner,
} from '../components/ui/Primitives';
import { Button } from '../components/ui/Button';
import { FieldRow, Input, MoneyInput, Select, Textarea } from '../components/ui/Field';
import { Sheet } from '../components/ui/Sheet';

type Filter = ScheduledExpenseStatus | 'all';

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'pending', label: 'Pendientes' },
  { value: 'paid', label: 'Pagados' },
  { value: 'cancelled', label: 'Cancelados' },
  { value: 'all', label: 'Todos' },
];

export default function ScheduledExpenses() {
  const { ready, scheduledExpenses, categories, accounts } = useAppData();
  const createScheduledExpense = useDataStore((state) => state.createScheduledExpense);
  const updateScheduledExpense = useDataStore((state) => state.updateScheduledExpense);
  const deleteScheduledExpense = useDataStore((state) => state.deleteScheduledExpense);
  const markPaid = useDataStore((state) => state.markScheduledExpensePaid);

  const [filter, setFilter] = useState<Filter>('pending');
  const [formOpen, setFormOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduledExpense | undefined>();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(toDateInputValue(Date.now()));
  const [categoryId, setCategoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [payAccountId, setPayAccountId] = useState('');
  const [payDate, setPayDate] = useState(toDateInputValue(Date.now()));
  const [error, setError] = useState<string | null>(null);

  const expenseCategories = categories.filter(
    (category) => category.type === 'expense' || category.type === 'both',
  );

  const filtered = useMemo(
    () =>
      scheduledExpenses
        .filter((expense) => filter === 'all' || expense.status === filter)
        .sort((a, b) => a.estimatedDate - b.estimatedDate),
    [scheduledExpenses, filter],
  );

  const pendingTotal = useMemo(
    () =>
      scheduledExpenses
        .filter((expense) => expense.status === 'pending')
        .reduce((sum, expense) => sum + expense.amount, 0),
    [scheduledExpenses],
  );

  const next30 = useMemo(() => {
    const limit = Date.now() + 30 * 86_400_000;
    return scheduledExpenses
      .filter((expense) => expense.status === 'pending' && expense.estimatedDate <= limit)
      .reduce((sum, expense) => sum + expense.amount, 0);
  }, [scheduledExpenses]);

  const openCreate = () => {
    setEditing(undefined);
    setName('');
    setAmount('');
    setDate(toDateInputValue(Date.now()));
    setCategoryId('');
    setNotes('');
    setError(null);
    setFormOpen(true);
  };

  const openEdit = (expense: ScheduledExpense) => {
    setEditing(expense);
    setName(expense.name);
    setAmount(String(centsToUnits(expense.amount)));
    setDate(toDateInputValue(expense.estimatedDate));
    setCategoryId(expense.categoryId ?? '');
    setNotes(expense.notes ?? '');
    setError(null);
    setFormOpen(true);
  };

  const submit = async () => {
    const parsed = Number(amount);
    if (!name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Ingresa un monto mayor a 0');
      return;
    }
    const payload = {
      name: name.trim(),
      amount: unitsToCents(parsed),
      status: editing?.status ?? ('pending' as ScheduledExpenseStatus),
      estimatedDate: fromDateInputValue(date),
      categoryId: categoryId || null,
      linkedTransactionId: editing?.linkedTransactionId ?? null,
      notes: notes.trim() ? notes.trim() : null,
    };
    if (editing) {
      await updateScheduledExpense(editing.id, payload);
    } else {
      await createScheduledExpense(payload);
    }
    setFormOpen(false);
  };

  const openPay = (expense: ScheduledExpense) => {
    setEditing(expense);
    setPayAccountId(accounts[0]?.id ?? '');
    setPayDate(toDateInputValue(Date.now()));
    setError(null);
    setPayOpen(true);
  };

  const submitPay = async () => {
    if (!editing) return;
    if (!payAccountId) {
      setError('Selecciona la cuenta de pago');
      return;
    }
    await markPaid(editing.id, payAccountId, fromDateInputValue(payDate));
    setPayOpen(false);
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
      <div className="grid grid-cols-2 gap-2.5">
        <MetricCard label="Total pendiente" value={formatMoney(pendingTotal)} />
        <MetricCard label="Próximos 30 días" value={formatMoney(next30)} tone="negative" />
      </div>

      <div className="flex items-center justify-between gap-2">
        <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} />
        <Button size="sm" variant="primary" onClick={openCreate}>
          <Plus className="size-3.5" />
          Agregar
        </Button>
      </div>

      <Panel title="Gastos programados">
        {filtered.length === 0 ? (
          <EmptyState
            title="Nada por aquí"
            description="Agrega un gasto futuro para planificarlo."
          />
        ) : (
          <ul className="divide-border-subtle/70 divide-y">
            {filtered.map((expense) => {
              const category = categories.find((item) => item.id === expense.categoryId);
              return (
                <li key={expense.id} className="row-hover flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm">{expense.name}</p>
                      <Badge
                        tone={
                          expense.status === 'paid'
                            ? 'positive'
                            : expense.status === 'cancelled'
                              ? 'neutral'
                              : 'warning'
                        }
                      >
                        {SCHEDULED_EXPENSE_STATUS_LABELS[expense.status]}
                      </Badge>
                    </div>
                    <p className="text-text-tertiary text-xs">
                      {formatDate(expense.estimatedDate)}
                      {expense.status === 'pending' && ` · ${relativeDayLabel(expense.estimatedDate)}`}
                      {category ? ` · ${category.name}` : ''}
                    </p>
                  </div>

                  <span className="num shrink-0 text-sm">{formatMoney(expense.amount)}</span>

                  <div className="flex shrink-0 items-center gap-1">
                    {expense.status === 'pending' && (
                      <button
                        type="button"
                        aria-label="Marcar como pagado"
                        onClick={() => openPay(expense)}
                        className="text-text-tertiary hover:text-positive rounded p-1 transition-colors hover:bg-white/5"
                      >
                        <Check className="size-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label="Editar gasto programado"
                      onClick={() => openEdit(expense)}
                      className="text-text-tertiary hover:text-text-primary rounded p-1 transition-colors hover:bg-white/5"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Eliminar gasto programado"
                      onClick={() => {
                        if (confirm(`¿Eliminar "${expense.name}"?`)) {
                          void deleteScheduledExpense(expense.id);
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

      <Sheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar gasto programado' : 'Nuevo gasto programado'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => void submit()}>
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3.5">
          <FieldRow label="Nombre" error={error ?? undefined}>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Sofá" />
          </FieldRow>
          <FieldRow label="Monto">
            <MoneyInput value={amount} onChange={(event) => setAmount(event.target.value)} />
          </FieldRow>
          <FieldRow label="Fecha estimada">
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </FieldRow>
          <FieldRow label="Categoría">
            <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="">Sin categoría</option>
              {expenseCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </FieldRow>
          <FieldRow label="Notas">
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Opcional"
            />
          </FieldRow>
        </div>
      </Sheet>

      <Sheet
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Marcar como pagado"
        description="Se creará un movimiento de gasto vinculado."
        footer={
          <>
            <Button variant="ghost" onClick={() => setPayOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => void submitPay()}>
              Confirmar pago
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3.5">
          <FieldRow label="Monto">
            <Input value={editing ? formatMoney(editing.amount) : ''} readOnly disabled />
          </FieldRow>
          <FieldRow label="Cuenta" error={error ?? undefined}>
            <Select value={payAccountId} onChange={(event) => setPayAccountId(event.target.value)}>
              <option value="">Selecciona…</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </FieldRow>
          <FieldRow label="Fecha de pago">
            <Input type="date" value={payDate} onChange={(event) => setPayDate(event.target.value)} />
          </FieldRow>
        </div>
      </Sheet>
    </div>
  );
}
