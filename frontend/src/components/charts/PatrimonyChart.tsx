import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { centsToUnits, formatMoney } from '../../lib/format';
import { AXIS_STYLE, GRID_COLOR, TOOLTIP_LABEL_STYLE, TOOLTIP_STYLE } from './chartTheme';
import { EmptyState } from '../ui/Primitives';

export interface PatrimonyPoint {
  label: string;
  total: number;
  liquid: number;
  invested: number;
}

export function PatrimonyChart({ data }: { data: PatrimonyPoint[] }) {
  if (data.length === 0) {
    return <EmptyState title="Sin datos" description="Aún no hay historial suficiente." />;
  }

  return (
    <div className="h-56 w-full p-3 pr-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="patrimonyFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5E6AD2" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#5E6AD2" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            formatter={(value, name) => [
              formatMoney(Number(value)),
              name === 'total' ? 'Patrimonio' : name === 'liquid' ? 'Disponible' : 'Invertido',
            ]}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#5E6AD2"
            strokeWidth={2}
            fill="url(#patrimonyFill)"
          />
          <Area
            type="monotone"
            dataKey="invested"
            stroke="#4CC38A"
            strokeWidth={1.5}
            fill="transparent"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
