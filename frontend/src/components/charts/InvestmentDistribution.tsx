import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatMoney } from '../../lib/format';
import { colorAt, TOOLTIP_LABEL_STYLE, TOOLTIP_STYLE } from './chartTheme';
import { EmptyState } from '../ui/Primitives';

export interface DistributionSlice {
  name: string;
  value: number;
}

export function InvestmentDistribution({ data }: { data: DistributionSlice[] }) {
  if (data.length === 0) {
    return <EmptyState title="Sin inversiones" description="Agrega tu primer activo." />;
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
      <div className="h-44 w-full sm:w-1/2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="55%"
              outerRadius="88%"
              paddingAngle={2}
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={colorAt(index)} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              formatter={(value, name) => [formatMoney(Number(value)), String(name)]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex w-full flex-col gap-1.5 sm:w-1/2">
        {data.map((item, index) => (
          <li key={item.name} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: colorAt(index) }}
              />
              <span className="truncate">{item.name}</span>
            </span>
            <span className="num text-text-secondary shrink-0">
              {formatMoney(item.value)}
              <span className="text-text-tertiary ml-1.5">
                {total > 0 ? `${((item.value / total) * 100).toFixed(0)}%` : ''}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
