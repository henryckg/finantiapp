import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { centsToUnits, formatMoney, formatPercent } from '../../lib/format';
import { AXIS_STYLE, GRID_COLOR, TOOLTIP_LABEL_STYLE, TOOLTIP_STYLE } from './chartTheme';
import { EmptyState } from '../ui/Primitives';

export interface ValuePoint {
  label: string;
  value: number;
}

export function InvestmentEvolutionChart({ data }: { data: ValuePoint[] }) {
  if (data.length === 0) {
    return <EmptyState title="Sin historial" description="Actualiza el valor para ver la curva." />;
  }

  return (
    <div className="h-48 w-full p-3 pr-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <CartesianGrid stroke={GRID_COLOR} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
          <YAxis
            tick={AXIS_STYLE}
            tickLine={false}
            axisLine={false}
            width={52}
            domain={['auto', 'auto']}
            tickFormatter={(value: number) => `${Math.round(centsToUnits(value) / 1000)}k`}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            formatter={(value) => [formatMoney(Number(value)), 'Valor']}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#5E6AD2"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface ProfitabilityBar {
  name: string;
  returnPct: number;
}

export function ProfitabilityComparisonChart({ data }: { data: ProfitabilityBar[] }) {
  if (data.length === 0) {
    return <EmptyState title="Sin inversiones" description="Agrega activos para comparar." />;
  }

  return (
    <div className="h-56 w-full p-3 pr-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 12, bottom: 0, left: 4 }}
        >
          <CartesianGrid stroke={GRID_COLOR} horizontal={false} />
          <XAxis
            type="number"
            tick={AXIS_STYLE}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => `${value.toFixed(0)}%`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={AXIS_STYLE}
            tickLine={false}
            axisLine={false}
            width={104}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            formatter={(value) => [formatPercent(Number(value)), 'Rentabilidad']}
          />
          <Bar dataKey="returnPct" radius={[0, 3, 3, 0]} maxBarSize={16}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.returnPct >= 0 ? '#4CC38A' : '#F0654A'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
