import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  Area,
  ComposedChart,
} from 'recharts';
import type { StatsItem } from './types';
import { EMOTIONS, getEmotionMeta } from './types';

type Props = {
  data: StatsItem[];
  range: '7' | '30';
};

const emotionOrder = ['快乐', '悲伤', '愤怒', '平静', '焦虑', '惊喜'];

function formatDateAxis(dateStr: string, range: '7' | '30'): string {
  const [, m, d] = dateStr.split('-');
  if (range === '7') return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
  if (range === '30') {
    const day = parseInt(d, 10);
    if (day % 5 === 0 || day === 1) return `${parseInt(m, 10)}/${d}`;
    return '';
  }
  return d;
}

const PrimaryColor = '#9f7a7a';

export default function StatsChart({ data, range }: Props) {
  const processed = useMemo(() => {
    return data.map((item) => ({
      ...item,
      axisLabel: formatDateAxis(item.date, range),
      primaryIndex:
        item.primary !== '-'
          ? emotionOrder.indexOf(item.primary)
          : -1,
    }));
  }, [data, range]);

  const summary = useMemo(() => {
    const totals: Record<string, number> = {};
    emotionOrder.forEach((k) => (totals[k] = 0));
    for (const d of data) {
      const record = d as unknown as Record<string, number>;
      emotionOrder.forEach((k) => {
        totals[k] += record[k] || 0;
      });
    }
    return { totals };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-emoji">📈</div>
        <div>暂无数据，快记录第一篇日记吧</div>
      </div>
    );
  }

  return (
    <div className="stats-section">
      <div style={{
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        {EMOTIONS.map((em) => {
          const val = summary.totals[em.type] || 0;
          return (
            <div
              key={em.type}
              style={{
                flex: 1,
                minWidth: 100,
                background: em.bg,
                borderRadius: 12,
                padding: '10px 12px',
                transition: 'all 0.3s ease',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                color: em.color,
                fontWeight: 600,
                marginBottom: 4,
              }}>
                <span style={{ fontSize: 14 }}>{em.emoji}</span>
                {em.type}
              </div>
              <div style={{
                fontSize: 22,
                fontWeight: 700,
                color: em.color,
                lineHeight: 1,
              }}>
                {val}
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#7c5a5a',
          marginBottom: 10,
        }}>
          📊 每日情绪强度分布（堆叠柱状图）
        </div>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={processed}
              margin={{ top: 10, right: 12, left: -10, bottom: 2 }}
              barCategoryGap="20%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f5d5d5"
                opacity={0.6}
                vertical={false}
              />
              <XAxis
                dataKey="axisLabel"
                tick={{ fill: '#b89494', fontSize: 11 }}
                axisLine={{ stroke: '#f0dada' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#b89494', fontSize: 11 }}
                axisLine={{ stroke: '#f0dada' }}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(255,255,255,0.95)',
                  border: '1px solid #f5d5d5',
                  borderRadius: 12,
                  boxShadow: '0 8px 24px rgba(204,153,153,0.15)',
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) => {
                  const meta = getEmotionMeta(name);
                  return [value, `${meta?.emoji || ''} ${name}`];
                }}
                labelFormatter={(label) => `日期：${label}`}
                cursor={{ fill: 'rgba(246,168,168,0.05)' }}
              />
              <Legend
                formatter={(value) => {
                  const meta = getEmotionMeta(value);
                  return <span style={{ fontSize: 12, color: '#7c5a5a' }}>{meta?.emoji} {value}</span>;
                }}
                wrapperStyle={{ fontSize: 12 }}
                iconSize={10}
              />
              {emotionOrder.map((key) => {
                const meta = getEmotionMeta(key);
                return (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="a"
                    fill={meta?.color}
                    radius={[3, 3, 0, 0]}
                    animationDuration={450}
                    animationEasing="ease-out"
                  />
                );
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#7c5a5a',
          marginBottom: 10,
        }}>
          📉 每日主要情绪变化（折线图）
        </div>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={processed}
              margin={{ top: 10, right: 12, left: -10, bottom: 2 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f5d5d5"
                opacity={0.6}
                vertical={false}
              />
              <XAxis
                dataKey="axisLabel"
                tick={{ fill: '#b89494', fontSize: 11 }}
                axisLine={{ stroke: '#f0dada' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#b89494', fontSize: 11 }}
                axisLine={{ stroke: '#f0dada' }}
                tickLine={false}
                domain={[-1, 6]}
                ticks={[0, 1, 2, 3, 4, 5]}
                tickFormatter={(v) => {
                  if (v < 0 || v > 5) return '';
                  return String(v);
                }}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(255,255,255,0.95)',
                  border: '1px solid #f5d5d5',
                  borderRadius: 12,
                  boxShadow: '0 8px 24px rgba(204,153,153,0.15)',
                  fontSize: 12,
                }}
                formatter={(_value: unknown, _name: string, props: { payload?: StatsItem }) => {
                  const p = props.payload;
                  if (!p) return [];
                  const record = p as unknown as Record<string, number>;
                  const items = emotionOrder.map((k) => {
                    const meta = getEmotionMeta(k);
                    return `${meta?.emoji} ${k}：${record[k] || 0}`;
                  });
                  return [
                    <div key="tt" style={{ lineHeight: 1.8 }}>
                      <div style={{ fontWeight: 700, color: PrimaryColor, marginBottom: 4 }}>
                        主要情绪：{p.primary !== '-' ? (() => {
                          const m = getEmotionMeta(p.primary);
                          return `${m?.emoji} ${p.primary}`;
                        })() : '无'}
                      </div>
                      {items.map((it, i) => (
                        <div key={i} style={{ color: '#5e4a4a', fontSize: 11 }}>{it}</div>
                      ))}
                    </div>,
                    '',
                  ];
                }}
                labelFormatter={(label) => `📅 ${label}`}
                cursor={{ stroke: '#f6a8a8', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area
                type="monotone"
                dataKey="primaryIndex"
                fill="rgba(246,168,168,0.08)"
                stroke="none"
                animationDuration={450}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="primaryIndex"
                name="主要情绪"
                stroke="#f6a8a8"
                strokeWidth={2.5}
                dot={(props: { cx?: number; cy?: number; index?: number; payload?: StatsItem }) => {
                  const { cx, cy, payload, index } = props;
                  const x = cx ?? 0;
                  const y = cy ?? 0;
                  if (!payload || cx === undefined || cy === undefined) {
                    return <circle key={`dot-${index}`} cx={x} cy={y} r={0} fill="transparent" />;
                  }
                  if (payload.primary === '-') {
                    return (
                      <circle
                        key={`dot-${index}`}
                        cx={x}
                        cy={y}
                        r={4}
                        fill="white"
                        stroke="#d4b4b4"
                        strokeWidth={1.5}
                      />
                    );
                  }
                  const meta = getEmotionMeta(payload.primary);
                  return (
                    <circle
                      key={`dot-${index}`}
                      cx={x}
                      cy={y}
                      r={6}
                      fill={meta?.color || PrimaryColor}
                      stroke="white"
                      strokeWidth={2}
                      style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                    />
                  );
                }}
                activeDot={{ r: 8, stroke: 'white', strokeWidth: 2 }}
                animationDuration={450}
                animationEasing="ease-out"
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 10,
          flexWrap: 'wrap',
          marginTop: 8,
        }}>
          {emotionOrder.map((k, i) => {
            const meta = getEmotionMeta(k);
            return (
              <div
                key={k}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: '#9f7a7a',
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: meta?.color,
                    display: 'inline-block',
                  }}
                />
                {meta?.emoji} {k} = {i}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
