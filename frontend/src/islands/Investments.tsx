import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useAppData, usePortfolio } from '../hooks/useAppData';
import { useDataStore } from '../store/data';
import { INVESTMENT_TYPE_LABELS, type Investment, type InvestmentType } from '../types';
import {
  centsToUnits,
  formatMoney,
  formatMoneySigned,
  formatMonth,
  formatPercent,
  fromDateInputValue,
  toDateInputValue,
  unitsToCents,
} from '../lib/format';
import { investmentMetrics } from '../lib/profitability';
import { sortInvestments, sortTransactions } from '../lib/sort';
import { Badge, EmptyState, MetricCard, Panel, Spinner } from '../components/ui/Primitives';
import { Button } from '../components/ui/Button';
import { FieldRow, Input, MoneyInput, Select, Textarea } from '../components/ui/Field';
import { Sheet } from '../components/ui/Sheet';
import { TransactionTable } from '../components/transactions/TransactionTable';
import { InvestmentDistribution } from '../components/charts/InvestmentDistribution';
import { InvestmentEvolutionChart } from '../components/charts/ProfitabilityChart';
import { cn } from '../lib/utils';

export default function Investments() {
  const { ready, investments, transactions, snapshots } = useAppData();
  const portfolio = usePortfolio();
  const createInvestment = useDataStore((state) => state.createInvestment);
  const updateInvestment = useDataStore((state) => state.updateInvestment);
  const deleteInvestment = useDataStore((state) => state.deleteInvestment);
  const updateInvestmentValue = useDataStore((state) => state.updateInvestmentValue);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [valueOpen, setValueOpen] = useState(false);
  const [editing, setEditing] = useState<Investment | undefined>();
  const [name, setName] = useState('');
  const [type, setType] = useState<InvestmentType>('fund');
  const [ticker, setTicker] = useState('');
  const [notes, setNotes] = useState('');
  const [initialValue, setInitialValue] = useState('');
  const [newValue, setNewValue] = useState('');
  const [valueDate, setValueDate] = useState(toDateInputValue(Date.now()));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('inversion');
    if (param) setSelectedId(param);
  }, []);

  const metricsById = useMemo(
    () => Object.fromEntries(portfolio.perInvestment.map((metric) => [metric.investmentId, metric])),
    [portfolio.perInvestment],
  );

  const ranked = useMemo(
    () =>
      [...investments].sort(
        (a, b) =>
          (metricsById[b.id]?.returnPct ?? -Infinity) - (metricsById[a.id]?.returnPct ?? -Infinity),
      ),
    [investments, metricsById],
  );

  const selected = investments.find((investment) => investment.id === selectedId);
  const selectedMetrics = selected
    ? investmentMetrics(selected, transactions, snapshots)
    : undefined;

  const selectedSnapshots = useMemo(() => {
    if (!selected) return [];
    return snapshots
      .filter((snapshot) => snapshot.investmentId === selected.id)
      .sort((a, b) => a.date - b.date)
      .map((snapshot) => ({ label: formatMonth(snapshot.date), value: snapshot.value }));
  }, [selected, snapshots]);

  const selectedMovements = useMemo(() => {
    if (!selected) return [];
    return sortTransactions(
      transactions.filter((tx) => tx.investmentId === selected.id),
    );
  }, [selected, transactions]);

  const distribution = useMemo(
    () =>
      sortInvestments(investments).map((investment) => ({
        name: investment.name,
        value: investment.currentValue,
      })),
    [investments],
  );

  const openCreate = () => {
    setEditing(undefined);
    setName('');
    setType('fund');
    setTicker('');
    setNotes('');
    setInitialValue('');
    setError(null);
    setFormOpen(true);
  };

  const openEdit = (investment: Investment) => {
    setEditing(investment);
    setName(investment.name);
    setType(investment.type);
    setTicker(investment.ticker ?? '');
    setNotes(investment.notes ?? '');
    setError(null);
    setFormOpen(true);
  };

  const submitInvestment = async () => {
    if (!name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    if (editing) {
      await updateInvestment(editing.id, {
        name: name.trim(),
        type,
        ticker: ticker.trim() ? ticker.trim().toUpperCase() : null,
        notes: notes.trim() ? notes.trim() : null,
      });
    } else {
      await createInvestment({
        name: name.trim(),
        type,
        ticker: ticker.trim() ? ticker.trim().toUpperCase() : null,
        currentValue: initialValue ? unitsToCents(Number(initialValue)) : 0,
        currency: 'CLP',
        notes: notes.trim() ? notes.trim() : null,
      });
    }
    setFormOpen(false);
  };

  const openUpdateValue = (investment: Investment) => {
    setEditing(investment);
    setNewValue(String(centsToUnits(investment.currentValue)));
    setValueDate(toDateInputValue(Date.now()));
    setError(null);
    setValueOpen(true);
  };

  const submitValue = async () => {
    if (!editing) return;
    const parsed = Number(newValue);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError('Ingresa un valor válido');
      return;
    }
    await updateInvestmentValue(editing.id, unitsToCents(parsed), fromDateInputValue(valueDate));
    setValueOpen(false);
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
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <MetricCard label="Valor actual" value={formatMoney(portfolio.totalValue)} />
        <MetricCard label="Capital invertido" value={formatMoney(portfolio.totalCapital)} />
        <MetricCard
          label="Ganancia"
          value={formatMoneySigned(portfolio.totalGain)}
          tone={portfolio.totalGain >= 0 ? 'positive' : 'negative'}
        />
        <MetricCard
          label="Rentabilidad"
          value={formatPercent(portfolio.totalReturnPct)}
          tone={(portfolio.totalReturnPct ?? 0) >= 0 ? 'positive' : 'negative'}
          hint={`Mensual ${formatPercent(portfolio.monthlyReturnPct)}`}
        />
      </div>

      <Panel
        title="Activos"
        action={
          <Button size="sm" variant="primary" onClick={openCreate}>
            <Plus className="size-3.5" />
            Agregar
          </Button>
        }
      >
        {ranked.length === 0 ? (
          <EmptyState
            title="Sin inversiones"
            description="Registra un activo y luego sus aportes desde Movimientos."
          />
        ) : (
          <ul className="divide-border-subtle/70 divide-y">
            {ranked.map((investment) => {
              const metrics = metricsById[investment.id];
              const gain = metrics?.gain ?? 0;
              return (
                <li key={investment.id} className="row-hover px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedId(investment.id === selectedId ? null : investment.id)
                      }
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <ChevronRight
                        className={cn(
                          'text-text-tertiary size-3.5 shrink-0 transition-transform',
                          selectedId === investment.id && 'rotate-90',
                        )}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm">{investment.name}</span>
                        <span className="text-text-tertiary block text-xs">
                          {INVESTMENT_TYPE_LABELS[investment.type]}
                          {investment.ticker ? ` · ${investment.ticker}` : ''}
                        </span>
                      </span>
                    </button>

                    <div className="shrink-0 text-right">
                      <p className="num text-sm">{formatMoney(investment.currentValue)}</p>
                      <p
                        className={cn(
                          'num text-xs',
                          gain >= 0 ? 'text-positive' : 'text-negative',
                        )}
                      >
                        {formatMoneySigned(gain)} · {formatPercent(metrics?.returnPct ?? null)}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label="Actualizar valor"
                        onClick={() => openUpdateValue(investment)}
                        className="text-text-tertiary hover:text-accent rounded p-1 transition-colors hover:bg-white/5"
                      >
                        <RefreshCw className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Editar inversión"
                        onClick={() => openEdit(investment)}
                        className="text-text-tertiary hover:text-text-primary rounded p-1 transition-colors hover:bg-white/5"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Eliminar inversión"
                        onClick={() => {
                          if (confirm(`¿Eliminar la inversión "${investment.name}"?`)) {
                            void deleteInvestment(investment.id);
                            if (selectedId === investment.id) setSelectedId(null);
                          }
                        }}
                        className="text-text-tertiary hover:text-negative rounded p-1 transition-colors hover:bg-white/5"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <dl className="text-text-tertiary mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="label-xs">Capital</dt>
                      <dd className="num text-text-secondary">
                        {formatMoney(metrics?.investedCapital ?? 0)}
                      </dd>
                    </div>
                    <div>
                      <dt className="label-xs">Mensual</dt>
                      <dd className="num text-text-secondary">
                        {formatPercent(metrics?.monthlyReturnPct ?? null)}
                      </dd>
                    </div>
                    <div>
                      <dt className="label-xs">Anual</dt>
                      <dd className="num text-text-secondary">
                        {formatPercent(metrics?.annualReturnPct ?? null)}
                      </dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {selected && selectedMetrics && (
        <>
          <Panel
            title={`Evolución · ${selected.name}`}
            action={<Badge tone="accent">{formatPercent(selectedMetrics.returnPct)}</Badge>}
          >
            <InvestmentEvolutionChart data={selectedSnapshots} />
          </Panel>

          <Panel title={`Aportes y retiros · ${selected.name}`}>
            <TransactionTable
              transactions={selectedMovements}
              compact
              emptyMessage="Registra aportes desde Movimientos."
            />
          </Panel>
        </>
      )}

      <Panel title="Distribución del portafolio">
        <InvestmentDistribution data={distribution} />
      </Panel>

      <Sheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar inversión' : 'Nueva inversión'}
        description="La ganancia y rentabilidad se calculan automáticamente."
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => void submitInvestment()}>
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
              placeholder="S&P 500 ETF"
            />
          </FieldRow>
          <FieldRow label="Tipo">
            <Select value={type} onChange={(event) => setType(event.target.value as InvestmentType)}>
              {Object.entries(INVESTMENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FieldRow>
          <FieldRow label="Ticker">
            <Input
              value={ticker}
              onChange={(event) => setTicker(event.target.value)}
              placeholder="Opcional"
            />
          </FieldRow>
          {!editing && (
            <FieldRow label="Valor actual" hint="Puedes actualizarlo después en cualquier momento.">
              <MoneyInput
                value={initialValue}
                onChange={(event) => setInitialValue(event.target.value)}
              />
            </FieldRow>
          )}
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
        open={valueOpen}
        onClose={() => setValueOpen(false)}
        title="Actualizar valor actual"
        description={editing?.name}
        footer={
          <>
            <Button variant="ghost" onClick={() => setValueOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => void submitValue()}>
              Guardar valor
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3.5">
          <FieldRow label="Valor total" error={error ?? undefined}>
            <MoneyInput value={newValue} onChange={(event) => setNewValue(event.target.value)} />
          </FieldRow>
          <FieldRow label="Fecha">
            <Input
              type="date"
              value={valueDate}
              onChange={(event) => setValueDate(event.target.value)}
            />
          </FieldRow>
        </div>
      </Sheet>
    </div>
  );
}
