import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Project, TimeLog, PROJECT_CHART_COLORS } from '../types';

interface Props {
  projects: Project[];
  timeLogs: TimeLog[];
}

interface ChartData {
  month: string;
  monthKey: string;
  total: number;
  [projectName: string]: string | number;
}

export default function IncomeChart({ projects, timeLogs }: Props) {
  const chartData = useMemo(() => {
    const months: ChartData[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthKey = format(monthDate, 'yyyy-MM');
      const monthLabel = format(monthDate, 'M月', { locale: zhCN });

      const entry: ChartData = {
        month: monthLabel,
        monthKey,
        total: 0,
      };

      let monthTotal = 0;
      projects.forEach((project) => {
        const projectLogs = timeLogs.filter(
          (t) =>
            t.projectId === project.id &&
            isWithinInterval(new Date(t.date), { start: monthStart, end: monthEnd })
        );
        const income = projectLogs.reduce((sum, t) => sum + t.hours * project.hourlyRate, 0);
        entry[project.name] = Math.round(income * 100) / 100;
        monthTotal += income;
      });
      entry.total = Math.round(monthTotal);

      months.push(entry);
    }

    return months;
  }, [projects, timeLogs]);

  const projectNames = projects.map((p) => p.name);
  const lastIdx = projectNames.length - 1;

  function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload || !payload.length) return null;
    return (
      <div
        style={{
          background: '#1F2937',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          border: '1px solid #4B5563',
        }}
      >
        <p style={{ fontWeight: 600, marginBottom: '8px', color: '#F9FAFB', fontSize: '0.9rem' }}>
          {label}
        </p>
        {payload.map((item: any, idx: number) => (
          <p key={idx} style={{ color: item.color, fontSize: '0.8rem', marginBottom: '2px' }}>
            {item.name}: ¥{item.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: '#1F2937' }}>
        月度收入对比
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 30, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 12 }} />
          <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} tickFormatter={(v) => `¥${v}`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '0.8rem', paddingTop: '8px' }}
            formatter={(value: string) => <span style={{ color: '#374151' }}>{value}</span>}
          />
          {projectNames.map((name, idx) => (
            <Bar
              key={name}
              dataKey={name}
              stackId="income"
              fill={PROJECT_CHART_COLORS[idx % PROJECT_CHART_COLORS.length]}
              radius={idx === lastIdx ? [4, 4, 0, 0] : undefined}
            >
              {idx === lastIdx && (
                <LabelList
                  dataKey="total"
                  position="top"
                  formatter={(v: number) => (v > 0 ? `¥${v.toLocaleString()}` : '')}
                  style={{ fill: '#374151', fontSize: 11, fontWeight: 600 }}
                />
              )}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: '12px',
  padding: '24px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
};
