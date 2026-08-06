import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { useDataStore } from '../store/data';
import { GOAL_STATUS_LABELS, type Goal, type GoalStatus } from '../types';
import {
  centsToUnits,
  formatDate,
  formatMoney,
  fromDateInputValue,
  toDateInputValue,
  unitsToCents,
} from '../lib/format';
import { goalProgress } from '../lib/profitability';
import { sortAccounts, sortGoalAllocations, sortGoals, sortInvestments } from '../lib/sort';
import {
  Badge,
  EmptyState,
  MetricCard,
  Panel,
  ProgressBar,
  Spinner,
} from '../components/ui/Primitives';
import { Button } from '../components/ui/Button';
import { FieldRow, Input, MoneyInput, Select, Textarea } from '../components/ui/Field';
import { Sheet } from '../components/ui/Sheet';

export default function Goals() {
  const { ready, goals, goalAllocations, transactions, accounts, investments } = useAppData();
  const createGoal = useDataStore((state) => state.createGoal);
  const updateGoal = useDataStore((state) => state.updateGoal);
  const deleteGoal = useDataStore((state) => state.deleteGoal);
  const createGoalAllocation = useDataStore((state) => state.createGoalAllocation);
  const deleteGoalAllocation = useDataStore((state) => state.deleteGoalAllocation);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [allocOpen, setAllocOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | undefined>();
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [status, setStatus] = useState<GoalStatus>('active');
  const [notes, setNotes] = useState('');
  const [allocGoalId, setAllocGoalId] = useState('');
  const [allocDestination, setAllocDestination] = useState('');
  const [allocAmount, setAllocAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('objetivo');
    if (param) setExpandedId(param);
  }, []);

  const sortedGoals = useMemo(() => sortGoals(goals), [goals]);

  const sortedAllocations = useMemo(() => sortGoalAllocations(goalAllocations), [goalAllocations]);

  const sortedInvestments = useMemo(() => sortInvestments(investments), [investments]);

  const sortedAccounts = useMemo(() => sortAccounts(accounts), [accounts]);

  const progressByGoal = useMemo(
    () =>
      Object.fromEntries(
        sortedGoals.map((goal) => [
          goal.id,
          goalProgress(goal, sortedAllocations, transactions, accounts, investments),
        ]),
      ),
    [sortedGoals, sortedAllocations, transactions, accounts, investments],
  );

  const totals = useMemo(() => {
    const active = goals.filter((goal) => goal.status === 'active');
    const target = active.reduce((sum, goal) => sum + goal.targetAmount, 0);
    const progress = active.reduce(
      (sum, goal) => sum + (progressByGoal[goal.id]?.progress ?? 0),
      0,
    );
    return { target, progress, remaining: Math.max(target - progress, 0) };
  }, [goals, progressByGoal]);

  const openCreate = () => {
    setEditing(undefined);
    setName('');
    setTarget('');
    setTargetDate('');
    setStatus('active');
    setNotes('');
    setError(null);
    setFormOpen(true);
  };

  const openEdit = (goal: Goal) => {
    setEditing(goal);
    setName(goal.name);
    setTarget(String(centsToUnits(goal.targetAmount)));
    setTargetDate(goal.targetDate ? toDateInputValue(goal.targetDate) : '');
    setStatus(goal.status);
    setNotes(goal.notes ?? '');
    setError(null);
    setFormOpen(true);
  };

  const submit = async () => {
    const parsed = Number(target);
    if (!name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Ingresa un monto objetivo mayor a 0');
      return;
    }
    const payload = {
      name: name.trim(),
      targetAmount: unitsToCents(parsed),
      targetDate: targetDate ? fromDateInputValue(targetDate) : null,
      status,
      notes: notes.trim() ? notes.trim() : null,
    };
    if (editing) {
      await updateGoal(editing.id, payload);
    } else {
      await createGoal(payload);
    }
    setFormOpen(false);
  };

  const openAllocation = (goalId: string) => {
    setAllocGoalId(goalId);
    setAllocDestination('');
    setAllocAmount('');
    setError(null);
    setAllocOpen(true);
  };

  const submitAllocation = async () => {
    const parsed = Number(allocAmount);
    if (!allocDestination) {
      setError('Selecciona un destino');
      return;
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Ingresa un monto mayor a 0');
      return;
    }
    const [kind, id] = allocDestination.split(':');
    await createGoalAllocation({
      goalId: allocGoalId,
      investmentId: kind === 'inv' ? (id ?? null) : null,
      accountId: kind === 'acc' ? (id ?? null) : null,
      targetAmount: unitsToCents(parsed),
    });
    setAllocOpen(false);
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
      <div className="grid grid-cols-3 gap-2.5">
        <MetricCard label="Meta total" value={formatMoney(totals.target)} />
        <MetricCard label="Avance" value={formatMoney(totals.progress)} tone="positive" />
        <MetricCard label="Restante" value={formatMoney(totals.remaining)} />
      </div>

      <Panel
        title="Objetivos"
        action={
          <Button size="sm" variant="primary" onClick={openCreate}>
            <Plus className="size-3.5" />
            Agregar
          </Button>
        }
      >
        {sortedGoals.length === 0 ? (
          <EmptyState title="Sin objetivos" description="Define tu primera meta de ahorro o inversión." />
        ) : (
          <ul className="divide-border-subtle/70 divide-y">
            {sortedGoals.map((goal) => {
              const progress = progressByGoal[goal.id]!;
              const expanded = expandedId === goal.id;
              return (
                <li key={goal.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : goal.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm">{goal.name}</p>
                        <Badge tone={goal.status === 'active' ? 'accent' : 'neutral'}>
                          {GOAL_STATUS_LABELS[goal.status]}
                        </Badge>
                      </div>
                      <p className="text-text-tertiary mt-0.5 text-xs">
                        {goal.targetDate ? `Meta: ${formatDate(goal.targetDate)}` : 'Sin fecha límite'}
                      </p>
                    </button>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label="Editar objetivo"
                        onClick={() => openEdit(goal)}
                        className="text-text-tertiary hover:text-text-primary rounded p-1 transition-colors hover:bg-white/5"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Eliminar objetivo"
                        onClick={() => {
                          if (confirm(`¿Eliminar el objetivo "${goal.name}"?`)) {
                            void deleteGoal(goal.id);
                          }
                        }}
                        className="text-text-tertiary hover:text-negative rounded p-1 transition-colors hover:bg-white/5"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center gap-3">
                    <ProgressBar value={progress.progressPct} className="flex-1" />
                    <span className="num text-text-secondary shrink-0 text-xs">
                      {progress.progressPct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-text-tertiary mt-1.5 flex justify-between text-xs">
                    <span className="num">{formatMoney(progress.progress)}</span>
                    <span className="num">Restan {formatMoney(progress.remaining)}</span>
                    <span className="num">{formatMoney(goal.targetAmount)}</span>
                  </div>

                  {expanded && (
                    <div className="border-border-subtle/70 mt-3 border-t pt-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="label-xs">Distribución</p>
                        <Button size="sm" variant="ghost" onClick={() => openAllocation(goal.id)}>
                          <Plus className="size-3" />
                          Destino
                        </Button>
                      </div>
                      {progress.allocations.length === 0 ? (
                        <p className="text-text-tertiary text-xs">
                          Sin destinos. Agrega cuentas o inversiones para repartir la meta.
                        </p>
                      ) : (
                        <ul className="flex flex-col gap-2.5">
                          {progress.allocations.map((allocation) => (
                            <li key={allocation.allocationId}>
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="truncate">{allocation.label}</span>
                                <span className="num text-text-secondary flex shrink-0 items-center gap-2">
                                  {formatMoney(allocation.progress)} /{' '}
                                  {formatMoney(allocation.targetAmount)}
                                  <button
                                    type="button"
                                    aria-label="Quitar destino"
                                    onClick={() =>
                                      void deleteGoalAllocation(allocation.allocationId)
                                    }
                                    className="text-text-tertiary hover:text-negative rounded p-0.5 transition-colors"
                                  >
                                    <X className="size-3" />
                                  </button>
                                </span>
                              </div>
                              <ProgressBar
                                value={allocation.progressPct}
                                tone="positive"
                                className="mt-1"
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Sheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar objetivo' : 'Nuevo objetivo'}
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
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Invertir $785.000"
            />
          </FieldRow>
          <FieldRow label="Monto objetivo">
            <MoneyInput value={target} onChange={(event) => setTarget(event.target.value)} />
          </FieldRow>
          <FieldRow label="Fecha objetivo">
            <Input
              type="date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
            />
          </FieldRow>
          <FieldRow label="Estado">
            <Select value={status} onChange={(event) => setStatus(event.target.value as GoalStatus)}>
              {Object.entries(GOAL_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
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
        open={allocOpen}
        onClose={() => setAllocOpen(false)}
        title="Agregar destino"
        description="El avance se calcula desde los aportes reales al destino."
        footer={
          <>
            <Button variant="ghost" onClick={() => setAllocOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => void submitAllocation()}>
              Agregar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3.5">
          <FieldRow label="Destino" error={error ?? undefined}>
            <Select
              value={allocDestination}
              onChange={(event) => setAllocDestination(event.target.value)}
            >
              <option value="">Selecciona…</option>
              <optgroup label="Inversiones">
                {sortedInvestments.map((investment) => (
                  <option key={investment.id} value={`inv:${investment.id}`}>
                    {investment.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Cuentas">
                {sortedAccounts.map((account) => (
                  <option key={account.id} value={`acc:${account.id}`}>
                    {account.name}
                  </option>
                ))}
              </optgroup>
            </Select>
          </FieldRow>
          <FieldRow label="Monto asignado">
            <MoneyInput value={allocAmount} onChange={(event) => setAllocAmount(event.target.value)} />
          </FieldRow>
        </div>
      </Sheet>
    </div>
  );
}
