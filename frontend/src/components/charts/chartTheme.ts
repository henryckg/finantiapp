export const CHART_COLORS = [
  '#5E6AD2',
  '#4CC38A',
  '#F0654A',
  '#E5A050',
  '#4A9CF0',
  '#C061CB',
  '#57C7B8',
  '#D9739B',
  '#7C89E8',
  '#9B9BA3',
];

export const AXIS_STYLE = {
  fontSize: 11,
  fill: '#5C5C63',
  fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
};

export const GRID_COLOR = '#27272A';

export const TOOLTIP_STYLE = {
  backgroundColor: '#1C1C1F',
  border: '1px solid #27272A',
  borderRadius: 8,
  fontSize: 12,
  color: '#EDEDEF',
  padding: '8px 10px',
};

export const TOOLTIP_LABEL_STYLE = {
  color: '#9B9BA3',
  fontSize: 11,
  marginBottom: 4,
};

export function colorAt(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length]!;
}
