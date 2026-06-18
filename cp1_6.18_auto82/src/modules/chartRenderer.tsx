import type { ChartType, ChartDataPoint } from '@/types';

interface ChartRenderOptions {
  width: number;
  height: number;
  data: ChartDataPoint[];
  chartType: ChartType;
  onBarClick?: (key: string) => void;
  onPieClick?: (key: string) => void;
  animating?: boolean;
}

const PADDING = { top: 30, right: 30, bottom: 50, left: 60 };
const COLORS = [
  '#2d7bff', '#4facfe', '#00f2fe', '#43e97b', '#f7971e',
  '#e44d26', '#a855f7', '#06b6d4', '#f59e0b', '#10b981',
];
const GRAY = '#d1d5db';
const HIGHLIGHT_COLOR = '#2d7bff';

function getBarColor(index: number, highlighted: boolean): string {
  return highlighted ? COLORS[index % COLORS.length] : GRAY;
}

export function renderBarChart(options: ChartRenderOptions): JSX.Element {
  const { width, height, data, onBarClick, animating } = options;
  const chartW = width - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;

  if (data.length === 0) return renderEmpty(width, height);

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barWidth = Math.max(chartW / data.length * 0.6, 4);
  const barGap = chartW / data.length;

  const yTicks = 5;
  const yScale = (v: number) => chartH - (v / maxVal) * chartH;

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <g transform={`translate(${PADDING.left},${PADDING.top})`}>
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const val = Math.round(maxVal * i / yTicks);
          const y = yScale(val);
          return (
            <g key={`ytick-${i}`}>
              <line x1={0} y1={y} x2={chartW} y2={y} stroke="#e5e7eb" strokeWidth={1} />
              <text x={-10} y={y + 4} textAnchor="end" fontSize={11} fill="#6b7280">
                {val.toLocaleString()}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const barH = (d.value / maxVal) * chartH;
          const x = i * barGap + (barGap - barWidth) / 2;
          const y = chartH - barH;
          const color = getBarColor(i, d.highlighted);
          return (
            <g
              key={d.key}
              onClick={() => onBarClick?.(d.key)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                fill={color}
                rx={4}
                ry={4}
                style={{
                  transition: 'all 0.3s ease',
                  opacity: animating ? 0 : 1,
                  animation: animating ? `barSlideIn 0.4s ease ${i * 0.05}s forwards` : 'none',
                }}
              />
              <text
                x={x + barWidth / 2}
                y={chartH + 16}
                textAnchor="middle"
                fontSize={10}
                fill="#6b7280"
                transform={`rotate(-30, ${x + barWidth / 2}, ${chartH + 16})`}
              >
                {d.label.length > 6 ? d.label.slice(0, 6) + '…' : d.label}
              </text>
            </g>
          );
        })}
        <line x1={0} y1={chartH} x2={chartW} y2={chartH} stroke="#9ca3af" strokeWidth={1} />
      </g>
    </svg>
  );
}

export function renderLineChart(options: ChartRenderOptions): JSX.Element {
  const { width, height, data, onBarClick, animating } = options;
  const chartW = width - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;

  if (data.length === 0) return renderEmpty(width, height);

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const yScale = (v: number) => chartH - (v / maxVal) * chartH;
  const xStep = data.length > 1 ? chartW / (data.length - 1) : chartW;

  const points = data.map((d, i) => ({
    x: i * xStep,
    y: yScale(d.value),
    ...d,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  const areaD = pathD + ` L ${points[points.length - 1].x} ${chartH} L ${points[0].x} ${chartH} Z`;

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <g transform={`translate(${PADDING.left},${PADDING.top})`}>
        {Array.from({ length: 6 }, (_, i) => {
          const val = Math.round(maxVal * i / 5);
          const y = yScale(val);
          return (
            <g key={`ytick-${i}`}>
              <line x1={0} y1={y} x2={chartW} y2={y} stroke="#e5e7eb" strokeWidth={1} />
              <text x={-10} y={y + 4} textAnchor="end" fontSize={11} fill="#6b7280">
                {val.toLocaleString()}
              </text>
            </g>
          );
        })}
        <path
          d={areaD}
          fill="rgba(45,123,255,0.08)"
          style={{
            transition: 'all 0.3s ease',
            opacity: animating ? 0 : 1,
          }}
        />
        <path
          d={pathD}
          fill="none"
          stroke={HIGHLIGHT_COLOR}
          strokeWidth={2.5}
          strokeLinejoin="round"
          style={{
            transition: 'all 0.3s ease',
            opacity: animating ? 0 : 1,
          }}
        />
        {points.map((p, i) => (
          <g
            key={p.key}
            onClick={() => onBarClick?.(p.key)}
            style={{ cursor: 'pointer' }}
          >
            <circle
              cx={p.x}
              cy={p.y}
              r={p.highlighted ? 5 : 4}
              fill={p.highlighted ? HIGHLIGHT_COLOR : GRAY}
              stroke="#fff"
              strokeWidth={2}
              style={{
                transition: 'all 0.3s ease',
                opacity: animating ? 0 : 1,
                animation: animating ? `barSlideIn 0.3s ease ${i * 0.05}s forwards` : 'none',
              }}
            />
            <text
              x={p.x}
              y={chartH + 16}
              textAnchor="middle"
              fontSize={10}
              fill="#6b7280"
              transform={`rotate(-30, ${p.x}, ${chartH + 16})`}
            >
              {p.label.length > 6 ? p.label.slice(0, 6) + '…' : p.label}
            </text>
          </g>
        ))}
        <line x1={0} y1={chartH} x2={chartW} y2={chartH} stroke="#9ca3af" strokeWidth={1} />
      </g>
    </svg>
  );
}

export function renderPieChart(options: ChartRenderOptions): JSX.Element {
  const { width, height, data, onPieClick, animating } = options;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 40;

  if (data.length === 0) return renderEmpty(width, height);

  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let currentAngle = -Math.PI / 2;

  const slices = data.map((d, i) => {
    const angle = (d.value / total) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;

    const midAngle = (startAngle + endAngle) / 2;
    const labelR = radius * 0.65;
    const labelX = cx + labelR * Math.cos(midAngle);
    const labelY = cy + labelR * Math.sin(midAngle);

    const pathD = [
      `M ${cx} ${cy}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ');

    return {
      key: d.key,
      label: d.label,
      value: d.value,
      pathD,
      color: d.highlighted ? COLORS[i % COLORS.length] : GRAY,
      percent: ((d.value / total) * 100).toFixed(1),
      labelX,
      labelY,
    };
  });

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      {slices.map((s, i) => (
        <g
          key={s.key}
          onClick={() => onPieClick?.(s.key)}
          style={{ cursor: 'pointer' }}
        >
          <path
            d={s.pathD}
            fill={s.color}
            stroke="#fff"
            strokeWidth={2}
            style={{
              transition: 'all 0.3s ease',
              opacity: animating ? 0 : 1,
              animation: animating ? `barSlideIn 0.3s ease ${i * 0.05}s forwards` : 'none',
              transformOrigin: `${cx}px ${cy}px`,
            }}
          />
          {s.highlighted && (
            <text
              x={s.labelX}
              y={s.labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={10}
              fill="#fff"
              fontWeight={600}
            >
              {s.percent}%
            </text>
          )}
        </g>
      ))}
      {data.length > 0 && (
        <g transform={`translate(${width - 130}, 10)`}>
          {slices.map((s, i) => (
            <g key={`legend-${s.key}`} transform={`translate(0, ${i * 18})`}>
              <rect x={0} y={0} width={12} height={12} rx={2} fill={COLORS[i % COLORS.length]} />
              <text x={16} y={10} fontSize={10} fill="#6b7280">
                {s.label.length > 8 ? s.label.slice(0, 8) + '…' : s.label}
              </text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}

function renderEmpty(width: number, height: number): JSX.Element {
  const cx = width / 2;
  const cy = height / 2;
  const r = 40;

  return (
    <svg width={width} height={height}>
      <g transform={`translate(${cx}, ${cy})`}>
        <circle
          cx={0}
          cy={0}
          r={r}
          fill="none"
          stroke="#9ca3af"
          strokeWidth={2}
          strokeDasharray="8 4"
          style={{
            animation: 'emptySpin 2s linear infinite',
            transformOrigin: '0px 0px',
          }}
        />
        <text x={0} y={r + 24} textAnchor="middle" fontSize={13} fill="#9ca3af">
          点击表格数据以生成图表
        </text>
      </g>
    </svg>
  );
}

export function renderChart(options: ChartRenderOptions): JSX.Element {
  switch (options.chartType) {
    case 'bar':
      return renderBarChart(options);
    case 'line':
      return renderLineChart(options);
    case 'pie':
      return renderPieChart(options);
    default:
      return renderBarChart(options);
  }
}
