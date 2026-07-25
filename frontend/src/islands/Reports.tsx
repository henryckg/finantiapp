import { useMemo, useState } from 'react';
import { useAppData, usePortfolio } from '../hooks/useAppData';
import { formatMoney, formatMoneySigned, formatPercent } from '../lib/format';
import {
  expensesByCategory,
  monthlyFlows,
  patrimonySeries,
  RANGE_OPTIONS,
  rangeStart,
  type RangeKey,
} from '../lib/reports';
import { MetricCard, Panel, SegmentedControl, Spinner } from '../components/ui/Primitives';
import { PatrimonyChart } from '../components/charts/PatrimonyChart';
import { IncomeExpenseChart } from '../components/charts/IncomeExpenseChart';
import { ExpensesByCategory } from '../components/charts/ExpensesByCategory';
import { ProfitabilityComparisonChart } from '../components/charts/ProfitabilityChart';
import { cn } from '../lib/utils';

export default function Reports() {
  const { ready, accounts, transactions, investments, snapshots, categories } = useAppData();
  const portfolio = usePortfolio();
  const [range, setRange] = useState<RangeKey>('year');

  const series = useMemo(
    () => patrimonySeries(accounts, investments, transactions, snapshots, range),
    [accounts, investments, transactions, snapshots, range],
  );

  const flows = useMemo(() => monthlyFlows(transactions, range === 'week' ? 3 : 6), [
    transactions,
    range,
  ]);

  const categoryTotals = useMemo(
    () => expensesByCategory(transactions, categories, rangeStart(range)),
    [transactions, categories, range],
  );

  const comparison = useMemo(
    () =>
      [...portfolio.perInvestment]
        .map((metric) => ({
          metric,
          investment: investments.find((item) => item.id === metric.investmentId),
        }))
        .filter((item) => item.investment)
        .sort((a, b) => (b.metric.returnPct ?? -Infinity) - (a.metric.returnPct ?? -Infinity)),
    [portfolio.perInvestment, investments],
  );

  if (!ready) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="size-6" />
      </div>
    );
  }

  const last = series.at(-1);

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl options={RANGE_OPTIONS} value={range} onChange={setRange} />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <MetricCard label="Patrimonio" value={formatMoney(last?.total ?? 0)} />
        <MetricCard label="Disponible" value={formatMoney(last?.liquid ?? 0)} />
        <MetricCard
          label="Rentab. total"
          value={formatPercent(portfolio.totalReturnPct)}
          tone={(portfolio.totalReturnPct ?? 0) >= 0 ? 'positive' : 'negative'}
        />
        <MetricCard
          label="Rentab. anual"
          value={formatPercent(portfolio.annualReturnPct)}
          tone={(portfolio.annualReturnPct ?? 0) >= 0 ? 'positive' : 'negative'}
        />
      </div>

      <Panel title="Histórico de patrimonio">
        <PatrimonyChart data={series} />
      </Panel>

      <Panel title="Ingresos vs gastos">
        <IncomeExpenseChart data={flows} />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Gastos por categoría">
          <ExpensesByCategory
            data={categoryTotals.map((item) => ({ name: item.name, value: item.value }))}
          />
        </Panel>

        <Panel title="Comparación de rentabilidad">
          <ProfitabilityComparisonChart
            data={comparison.map((item) => ({
              name: item.investment!.name,
              returnPct: item.metric.returnPct ?? 0,
            }))}
          />
        </Panel>
      </div>

      <Panel title="Detalle por inversión">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-border-subtle text-text-tertiary border-b text-left">
                <th className="px-3 py-2 text-[0.6875rem] font-medium tracking-wide uppercase">
                  Activo
                </th>
                <th className="px-3 py-2 text-right text-[0.6875rem] font-medium tracking-wide uppercase">
                  Capital
                </th>
                <th className="px-3 py-2 text-right text-[0.6875rem] font-medium tracking-wide uppercase">
                  Valor
                </th>
                <th className="px-3 py-2 text-right text-[0.6875rem] font-medium tracking-wide uppercase">
                  Ganancia
                </th>
                <th className="px-3 py-2 text-right text-[0.6875rem] font-medium tracking-wide uppercase">
                  Rentab.
                </th>
              </tr>
            </thead>
            <tbody>
              {comparison.map(({ metric, investment }) => (
                <tr key={metric.investmentId} className="border-border-subtle/70 row-hover border-b">
                  <td className="px-3 py-2">{investment!.name}</td>
                  <td className="num px-3 py-2 text-right">{formatMoney(metric.investedCapital)}</td>
                  <td className="num px-3 py-2 text-right">{formatMoney(metric.currentValue)}</td>
                  <td
                    className={cn(
                      'num px-3 py-2 text-right',
                      metric.gain >= 0 ? 'text-positive' : 'text-negative',
                    )}
                  >
                    {formatMoneySigned(metric.gain)}
                  </td>
                  <td
                    className={cn(
                      'num px-3 py-2 text-right',
                      (metric.returnPct ?? 0) >= 0 ? 'text-positive' : 'text-negative',
                    )}
                  >
                    {formatPercent(metric.returnPct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Resumen por categoría">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-border-subtle text-text-tertiary border-b text-left">
                <th className="px-3 py-2 text-[0.6875rem] font-medium tracking-wide uppercase">
                  Categoría
                </th>
                <th className="px-3 py-2 text-right text-[0.6875rem] font-medium tracking-wide uppercase">
                  Total
                </th>
                <th className="px-3 py-2 text-right text-[0.6875rem] font-medium tracking-wide uppercase">
                  % del total
                </th>
              </tr>
            </thead>
            <tbody>
              {categoryTotals.map((item) => (
                <tr key={item.name} className="border-border-subtle/70 row-hover border-b">
                  <td className="px-3 py-2">{item.name}</td>
                  <td className="num px-3 py-2 text-right">{formatMoney(item.value)}</td>
                  <td className="num text-text-secondary px-3 py-2 text-right">
                    {item.share.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
