import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { centsToUnits, formatMoney } from '../../lib/format';
import { AXIS_STYLE, GRID_COLOR, TOOLTIP_LABEL_STYLE, TOOLTIP_STYLE } from './chartTheme';
import { EmptyState } from '../ui/Primitives';

export interface MonthlyFlow {
  label: string;
  income: number;
  expense: number;
}

export function IncomeExpenseChart({ data }: { data: MonthlyFlow[] }) {
  if (data.length === 0) {
    return <EmptyState title="Sin datos" description="No hay movimientos en el rango." />;
  }

  return (
    <div className="h-56 w-full p-3 pr-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }} barGap={2}>
          <CartesianGrid stroke={GRID_COLOR} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
          <YAxis
            tick={AXIS_STYLE}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(value: number) => `${Math.round(centsToUnits(value) / 1000)}k`}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            formatter={(value, name) => [
              formatMoney(Number(value)),
              name === 'income' ? 'Ingresos' : 'Gastos',
            ]}
          />
          <Bar dataKey="income" fill="#4CC38A" radius={[3, 3, 0, 0]} maxBarSize={18} />
          <Bar dataKey="expense" fill="#F0654A" radius={[3, 3, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
