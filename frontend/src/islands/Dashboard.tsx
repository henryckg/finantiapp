import { useMemo, useState } from 'react';
import { Plus, ArrowRight } from 'lucide-react';
import { useAppData, usePortfolio } from '../hooks/useAppData';
import { formatLongMonth, formatMoney, formatPercent, relativeDayLabel } from '../lib/format';
import { goalProgress, liquidTotal } from '../lib/profitability';
import { expensesByCategory, monthSummary } from '../lib/reports';
import { sortTransactions, sortInvestments } from '../lib/sort';
import { Badge, MetricCard, Panel, ProgressBar, Spinner } from '../components/ui/Primitives';
import { Button } from '../components/ui/Button';
import { TransactionTable } from '../components/transactions/TransactionTable';
import { TransactionSheet } from '../components/transactions/TransactionSheet';
import { ExpensesByCategory } from '../components/charts/ExpensesByCategory';
import { InvestmentDistribution } from '../components/charts/InvestmentDistribution';

export default function Dashboard() {
  const { ready, accounts, transactions, investments, scheduledExpenses, categories, goals, goalAllocations } = useAppData();
  const portfolio = usePortfolio();
  const [sheetOpen, setSheetOpen] = useState(false);

  const now = Date.now();

  const available = useMemo(() => liquidTotal(accounts, transactions), [accounts, transactions]);
  const summary = useMemo(() => monthSummary(transactions, now), [transactions, now]);

  const recentTransactions = useMemo(
    () => sortTransactions(transactions).slice(0, 6),
    [transactions],
  );

  const upcoming = useMemo(
    () =>
      scheduledExpenses
        .filter((expense) => expense.status === 'pending')
        .sort((a, b) => a.estimatedDate - b.estimatedDate)
        .slice(0, 4),
    [scheduledExpenses],
  );

  const categorySlices = useMemo(
    () =>
      expensesByCategory(transactions, categories, summary.from, now)
        .slice(0, 8)
        .map((item) => ({ name: item.name, value: item.value })),
    [transactions, categories, summary.from, now],
  );

  const distribution = useMemo(
    () =>
      sortInvestments(investments).map((investment) => ({
        name: investment.name,
        value: investment.currentValue,
      })),
    [investments],
  );

  const goalSummaries = useMemo(
    () =>
      goals
        .filter((goal) => goal.status === 'active')
        .map((goal) => goalProgress(goal, goalAllocations, transactions, accounts, investments))
        .sort((a, b) => a.progressPct - b.progressPct)
        .slice(0, 4),
    [goals, goalAllocations, transactions, accounts, investments],
  );

  if (!ready) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="size-6" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <MetricCard
          label="Patrimonio total"
          value={formatMoney(available + portfolio.totalValue)}
          hint="Cuentas + inversiones"
        />
        <MetricCard label="Disponible" value={formatMoney(available)} hint="Cuentas líquidas" />
        <MetricCard
          label="Total invertido"
          value={formatMoney(portfolio.totalCapital)}
          hint="Capital aportado neto"
        />
        <MetricCard
          label="Rentabilidad acum."
          value={formatPercent(portfolio.totalReturnPct)}
          tone={(portfolio.totalReturnPct ?? 0) >= 0 ? 'positive' : 'negative'}
          hint={formatMoney(portfolio.totalGain)}
        />
        <MetricCard
          label="Rentabilidad mensual"
          value={formatPercent(portfolio.monthlyReturnPct)}
          tone={(portfolio.monthlyReturnPct ?? 0) >= 0 ? 'positive' : 'negative'}
          hint={formatLongMonth(now)}
        />
        <MetricCard
          label="Balance del mes"
          value={formatMoney(summary.net)}
          tone={summary.net >= 0 ? 'positive' : 'negative'}
          hint={`Ingresos ${formatMoney(summary.income)}`}
        />
      </div>

      <div className="flex gap-2">
        <Button variant="primary" onClick={() => setSheetOpen(true)} className="flex-1 sm:flex-none">
          <Plus className="size-4" />
          Nuevo movimiento
        </Button>
        <Button variant="secondary" onClick={() => (window.location.href = '/movimientos')}>
          Ver movimientos
          <ArrowRight className="size-3.5" />
        </Button>
      </div>

      <Panel
        title="Últimos movimientos"
        action={
          <a href="/movimientos" className="text-text-secondary hover:text-text-primary text-xs">
            Ver todos
          </a>
        }
      >
        <TransactionTable transactions={recentTransactions} compact />
      </Panel>

      <Panel
        title="Gastos próximos"
        action={
          <a
            href="/gastos-programados"
            className="text-text-secondary hover:text-text-primary text-xs"
          >
            Gestionar
          </a>
        }
      >
        {upcoming.length === 0 ? (
          <p className="text-text-secondary px-4 py-6 text-center text-xs">
            No tienes gastos programados pendientes.
          </p>
        ) : (
          <ul className="divide-border-subtle/70 divide-y">
            {upcoming.map((expense) => (
              <li key={expense.id} className="row-hover flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm">{expense.name}</p>
                  <p className="text-text-tertiary text-xs">
                    {relativeDayLabel(expense.estimatedDate)}
                  </p>
                </div>
                <span className="num text-sm whitespace-nowrap">{formatMoney(expense.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Objetivos"
        action={
          <a href="/objetivos" className="text-text-secondary hover:text-text-primary text-xs">
            Gestionar
          </a>
        }
      >
        {goalSummaries.length === 0 ? (
          <p className="text-text-secondary px-4 py-6 text-center text-xs">
            No tienes objetivos activos.
          </p>
        ) : (
          <ul className="divide-border-subtle/70 divide-y">
            {goalSummaries.map((goal) => (
              <li key={goal.goalId} className="flex flex-col gap-1.5 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm">{goals.find((g) => g.id === goal.goalId)?.name ?? 'Objetivo'}</span>
                  <span className="num text-xs whitespace-nowrap text-text-secondary">
                    {formatMoney(goal.progress)} / {formatMoney(goal.targetAmount)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ProgressBar value={goal.progressPct} className="flex-1" />
                  <span className="num text-text-tertiary w-10 text-right text-[0.625rem]">
                    {formatPercent(goal.progressPct)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={`Gastos por categoría · ${formatLongMonth(now)}`}>
          <ExpensesByCategory data={categorySlices} />
        </Panel>

        <Panel
          title="Distribución de inversiones"
          action={
            <Badge tone="accent">{formatMoney(portfolio.totalValue)}</Badge>
          }
        >
          <InvestmentDistribution data={distribution} />
        </Panel>
      </div>

      <TransactionSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  );
}
