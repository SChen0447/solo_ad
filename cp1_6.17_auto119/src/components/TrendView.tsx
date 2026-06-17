import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Scatter,
  ZAxis,
  ScatterChart,
} from 'recharts';
import cloud from 'd3-cloud';
import type { MoodRecord, MoodType } from '../types';
import { MOOD_CONFIGS, getMoodConfig } from '../types';

interface TrendViewProps {
  records: MoodRecord[];
}

interface DailyPoint {
  date: string;
  dateLabel: string;
  dateKey: string;
  energy: number;
  mood: MoodType;
  moodName: string;
  moodColor: string;
  solidColor: string;
  emoji: string;
}

interface WordItem {
  text: string;
  value: number;
  color: string;
  emoji: string;
}

function getLastNDays(n: number): { key: string; label: string }[] {
  const result: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    result.push({
      key: `${y}-${m}-${day}`,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
    });
  }
  return result;
}

function computeDailyPoints(records: MoodRecord[]): DailyPoint[] {
  const days = getLastNDays(30);
  const byDate = new Map<string, MoodRecord[]>();
  records.forEach((r) => {
    const arr = byDate.get(r.dateKey) || [];
    arr.push(r);
    byDate.set(r.dateKey, arr);
  });

  return days.map((d) => {
    const list = byDate.get(d.key);
    if (!list || list.length === 0) {
      return {
        date: d.label,
        dateLabel: d.label,
        dateKey: d.key,
        energy: 0,
        mood: 'calm' as MoodType,
        moodName: '—',
        moodColor: 'rgba(163, 242, 208, 0.2)',
        solidColor: '#D5CFE0',
        emoji: '•',
      };
    }
    const avgEnergy =
      list.reduce((s, r) => s + r.energy, 0) / list.length;
    const freq = new Map<MoodType, number>();
    for (const r of list) freq.set(r.mood, (freq.get(r.mood) || 0) + 1);
    let dominant: MoodType = list[0].mood;
    let maxC = 0;
    freq.forEach((c, m) => {
      if (c > maxC) {
        maxC = c;
        dominant = m;
      }
    });
    const cfg = getMoodConfig(dominant);
    return {
      date: d.label,
      dateLabel: d.label,
      dateKey: d.key,
      energy: Math.round(avgEnergy * 10) / 10,
      mood: dominant,
      moodName: cfg.name,
      moodColor: cfg.solidColor,
      solidColor: cfg.solidColor,
      emoji: cfg.emoji,
    };
  });
}

function computeSummary(
  points: DailyPoint[]
): {
  avg7: string;
  avg30: string;
  fluctuation: string;
  dominant: string;
  trend: string;
  trendEmoji: string;
  activeDays: number;
} {
  const valid30 = points.filter((p) => p.energy > 0);
  const valid7 = valid30.slice(-7);
  const avg7 =
    valid7.length > 0
      ? (valid7.reduce((s, p) => s + p.energy, 0) / valid7.length).toFixed(1)
      : '—';
  const avg30 =
    valid30.length > 0
      ? (valid30.reduce((s, p) => s + p.energy, 0) / valid30.length).toFixed(1)
      : '—';

  const energies = valid30.map((p) => p.energy);
  let fluctuation = '数据不足';
  if (energies.length >= 3) {
    const mean = energies.reduce((a, b) => a + b, 0) / energies.length;
    const variance =
      energies.reduce((s, e) => s + (e - mean) ** 2, 0) / energies.length;
    const std = Math.sqrt(variance);
    if (std < 0.8) fluctuation = '波动较小，状态平稳';
    else if (std < 1.6) fluctuation = '波动适中，有起伏';
    else fluctuation = '波动较大，情绪起伏明显';
  }

  const freq = new Map<MoodType, number>();
  valid30.forEach((p) => freq.set(p.mood, (freq.get(p.mood) || 0) + 1));
  let dominant = '无';
  let maxC = 0;
  freq.forEach((c, m) => {
    if (c > maxC) {
      maxC = c;
      dominant = getMoodConfig(m).name;
    }
  });

  let trend = '持平';
  let trendEmoji = '➡️';
  if (valid7.length >= 2) {
    const first3 = valid7.slice(0, 3);
    const last3 = valid7.slice(-3);
    if (first3.length >= 2 && last3.length >= 2) {
      const fAvg = first3.reduce((s, p) => s + p.energy, 0) / first3.length;
      const lAvg = last3.reduce((s, p) => s + p.energy, 0) / last3.length;
      const diff = lAvg - fAvg;
      if (diff > 0.3) {
        trend = '上升趋势';
        trendEmoji = '📈';
      } else if (diff < -0.3) {
        trend = '下降趋势';
        trendEmoji = '📉';
      }
    }
  }

  return {
    avg7,
    avg30,
    fluctuation,
    dominant,
    trend,
    trendEmoji,
    activeDays: valid30.length,
  };
}

function computeWords(records: MoodRecord[], days = 30): WordItem[] {
  const threshold = Date.now() - days * 86400000;
  const freq = new Map<MoodType, number>();
  for (const r of records) {
    if (r.timestamp >= threshold) {
      freq.set(r.mood, (freq.get(r.mood) || 0) + 1);
    }
  }
  const items: WordItem[] = [];
  freq.forEach((count, mood) => {
    const cfg = getMoodConfig(mood);
    items.push({
      text: cfg.name,
      value: count,
      color: cfg.solidColor,
      emoji: cfg.emoji,
    });
  });
  return items.sort((a, b) => b.value - a.value);
}

interface ComputedWord {
  text: string;
  x: number;
  y: number;
  rotate: number;
  size: number;
  color: string;
  emoji: string;
  value: number;
}

function useWordCloud(
  words: WordItem[],
  width: number,
  height: number
): { layout: ComputedWord[]; maxValue: number } {
  const [layout, setLayout] = useState<ComputedWord[]>([]);
  const maxValue = words.length > 0 ? Math.max(...words.map((w) => w.value)) : 1;

  useEffect(() => {
    if (words.length === 0) {
      setLayout([]);
      return;
    }
    let cancelled = false;
    const maxVal = Math.max(...words.map((w) => w.value));
    const minSize = 14;
    const maxSize = Math.min(56, Math.max(28, width / 8));
    const layoutWords = words.map((w) => ({
      text: `${w.emoji} ${w.text}`,
      value: w.value,
      color: w.color,
      emoji: w.emoji,
      size:
        w.value === maxVal
          ? maxSize
          : Math.round(
              minSize + ((w.value - 1) / Math.max(1, maxVal - 1)) * (maxSize - minSize)
            ),
    }));

    const layoutInst = cloud()
      .size([width, height])
      .words(layoutWords as unknown as d3.Word[])
      .padding(6)
      .rotate(() => (Math.random() > 0.7 ? (Math.random() > 0.5 ? 90 : -90) : 0))
      .font('"PingFang SC", "Microsoft YaHei", system-ui, sans-serif')
      .fontSize((d: any) => d.size)
      .random(() => 0.42 + Math.random() * 0.16)
      .on('end', (computed: any[]) => {
        if (cancelled) return;
        const result: ComputedWord[] = computed.map((w) => ({
          text: (w as any).text.replace(/^[^\u4e00-\u9fa5a-zA-Z]+\s*/, ''),
          x: (w.x || 0) + width / 2,
          y: (w.y || 0) + height / 2,
          rotate: w.rotate || 0,
          size: (w as any).size,
          color: (w as any).color,
          emoji: (w as any).emoji,
          value: (w as any).value,
        }));
        setLayout(result);
      });

    try {
      layoutInst.start();
    } catch (e) {
      if (!cancelled) {
        const fallback: ComputedWord[] = layoutWords.map((w, i) => ({
          text: w.text.replace(/^[^\u4e00-\u9fa5a-zA-Z]+\s*/, ''),
          x: width / 2 + (i % 2 === 0 ? -60 : 60) * (i + 1),
          y: height / 2 + (i - layoutWords.length / 2) * 40,
          rotate: 0,
          size: w.size,
          color: w.color,
          emoji: w.emoji,
          value: w.value,
        }));
        setLayout(fallback);
      }
    }
    return () => {
      cancelled = true;
      layoutInst.stop();
    };
  }, [words, width, height]);

  return { layout, maxValue };
}

interface TooltipPayload {
  active?: boolean;
  payload?: Array<{ payload: DailyPoint }>;
}

const CustomTooltip: React.FC<TooltipPayload> = memo(({ active, payload }) => {
  if (!active || !payload || !payload[0]) return null;
  const p = payload[0].payload as DailyPoint;
  if (p.energy === 0) return null;
  return (
    <div
      style={{
        padding: '12px 16px',
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(12px)',
        borderRadius: 14,
        border: '1px solid rgba(107,91,138,0.15)',
        boxShadow: '0 10px 30px rgba(74,58,92,0.18)',
        minWidth: 160,
      }}
    >
      <div style={styles.ttRow}>
        <span style={{ fontSize: 22 }}>{p.emoji}</span>
        <span
          style={{
            ...styles.ttMood,
            color: p.solidColor,
            textShadow: `0 1px 0 rgba(255,255,255,0.8)`,
          }}
        >
          {p.moodName}
        </span>
      </div>
      <div style={styles.ttDivider} />
      <div style={styles.ttRow}>
        <span style={styles.ttLabel}>📅 日期</span>
        <span style={styles.ttValue}>{p.dateKey}</span>
      </div>
      <div style={styles.ttRow}>
        <span style={styles.ttLabel}>⚡ 能量</span>
        <span style={{ ...styles.ttValue, color: p.solidColor, fontWeight: 800 }}>
          {p.energy} / 10
        </span>
      </div>
    </div>
  );
});
CustomTooltip.displayName = 'CustomTooltip';

const TrendView: React.FC<TrendViewProps> = memo(({ records }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [wcWidth, setWcWidth] = useState(480);
  const [wcHeight, setWcHeight] = useState(360);

  const dailyPoints = useMemo(() => computeDailyPoints(records), [records]);
  const summary = useMemo(() => computeSummary(dailyPoints), [dailyPoints]);
  const words = useMemo(() => computeWords(records, 30), [records]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        setWcWidth(Math.min(w, 640));
        setWcHeight(Math.min(420, Math.max(280, Math.round(w * 0.7))));
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const { layout: wcLayout, maxValue: wcMax } = useWordCloud(
    words,
    wcWidth,
    wcHeight
  );

  const lineData = dailyPoints.map((p) => ({
    ...p,
    displayEnergy: p.energy > 0 ? p.energy : null,
  }));

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.pageTitle}>
            <span style={styles.titleIcon}>📊</span>
            趋势洞察
          </h2>
          <p style={styles.pageSubtitle}>
            最近30天能量流曲线与情绪频率分布
          </p>
        </div>
        <div style={styles.statsRow}>
          {[
            { label: '近7日均值', value: summary.avg7, icon: '🌤️', color: '#FFB347' },
            { label: '近30日均值', value: summary.avg30, icon: '🌙', color: '#5B96D0' },
            { label: '活跃天数', value: summary.activeDays, icon: '✅', color: '#A3F2D0' },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                ...styles.statPill,
                borderColor: `${s.color}55`,
                background: `linear-gradient(135deg, ${s.color}22, rgba(255,255,255,0.6))`,
              }}
            >
              <span style={{ fontSize: 16 }}>{s.icon}</span>
              <div style={styles.statContent}>
                <span style={{ ...styles.statValue, color: s.color }}>
                  {s.value}
                </span>
                <span style={styles.statLabel}>{s.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.chartPanel}>
        <div style={styles.chartHeader}>
          <h3 style={styles.panelTitle}>
            <span style={styles.panelIcon}>⚡</span>
            能量流曲线
          </h3>
          <div
            style={{
              ...styles.trendBadge,
              background:
                summary.trend === '上升趋势'
                  ? 'linear-gradient(135deg, #A3F2D0, #98FB98)'
                  : summary.trend === '下降趋势'
                  ? 'linear-gradient(135deg, #FFB3B3, #FFD0D0)'
                  : 'linear-gradient(135deg, #E8E0F0, #F5F0FA)',
            }}
          >
            <span>{summary.trendEmoji}</span>
            <span style={styles.trendText}>{summary.trend}</span>
          </div>
        </div>

        <div style={styles.chartContainer}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 16, right: 16, bottom: 8, left: -10 }}
            >
              <defs>
                <linearGradient id="energyFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6B5B8A" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#6B5B8A" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="4 6"
                stroke="rgba(107,91,138,0.12)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                type="category"
                tick={{
                  fontSize: 11,
                  fill: '#8A7DA3',
                  fontWeight: 500,
                }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(107,91,138,0.15)' }}
                interval={4}
                dy={8}
              />
              <YAxis
                domain={[0, 10]}
                ticks={[0, 2, 4, 6, 8, 10]}
                tick={{
                  fontSize: 11,
                  fill: '#8A7DA3',
                  fontWeight: 500,
                }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <ZAxis range={[0, 0]} />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Area
                data={lineData}
                dataKey="displayEnergy"
                type="monotone"
                stroke="#6B5B8A"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="url(#energyFill)"
                dot={false}
                activeDot={false}
                isAnimationActive={true}
                animationDuration={800}
              />
              <Scatter data={lineData.filter((p) => p.energy > 0)}>
                {lineData
                  .filter((p) => p.energy > 0)
                  .map((p, idx) => (
                    <circle
                      key={idx}
                      cx={0}
                      cy={0}
                      r={6}
                      fill={p.solidColor}
                      stroke="#ffffff"
                      strokeWidth={2.5}
                      style={{
                        filter: `drop-shadow(0 2px 4px ${p.moodColor}aa)`,
                        transition: 'all 0.2s',
                      }}
                    />
                  ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.summaryBox}>
          <span style={styles.summaryIcon}>💫</span>
          <p style={styles.summaryText}>
            过去 <strong>7 天</strong> 你的平均能量分
            <strong style={{ color: '#FFB347', margin: '0 4px' }}>{summary.avg7}</strong>
            ，<strong style={{ color: '#6B5B8A' }}>{summary.fluctuation}</strong>
            ，主导情绪为
            <strong
              style={{
                color: MOOD_CONFIGS.find((m) => m.name === summary.dominant)?.solidColor || '#4A3A5C',
                margin: '0 4px',
              }}
            >
              {summary.dominant}
            </strong>
            。整体呈现<strong style={{ margin: '0 4px' }}>{summary.trend}</strong>
            {summary.trend === '上升趋势' ? '，继续保持这个良好状态呀！ 🌟' : summary.trend === '下降趋势' ? '，给自己一些温柔的照顾吧 🤗' : '，维持着稳定的节奏 ✨'}
          </p>
        </div>
      </div>

      <div ref={containerRef} style={styles.wcPanel}>
        <div style={styles.chartHeader}>
          <h3 style={styles.panelTitle}>
            <span style={styles.panelIcon}>🌈</span>
            情绪词云
          </h3>
          <span style={styles.wcSub}>近30天情绪频率分布 · 字号越大频率越高</span>
        </div>

        <div style={styles.wcContainer}>
          {words.length === 0 ? (
            <div style={styles.wcEmpty}>
              <div style={{ fontSize: 52 }}>🔮</div>
              <p style={{ margin: '12px 0 4px', color: '#6B5B8A', fontWeight: 700 }}>
                还没有足够的数据
              </p>
              <p style={{ margin: 0, color: '#9A8DB5', fontSize: 13 }}>
                多记录几天情绪，这里就会生成漂亮的词云哦
              </p>
            </div>
          ) : (
            <svg
              width="100%"
              height={wcHeight}
              viewBox={`0 0 ${wcWidth} ${wcHeight}`}
              style={{ display: 'block', willChange: 'transform' }}
            >
              <defs>
                <radialGradient id="wcBg" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0.55} />
                </radialGradient>
                <filter id="wcShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow
                    dx="0"
                    dy="6"
                    stdDeviation="12"
                    floodColor="#4A3A5C"
                    floodOpacity="0.1"
                  />
                </filter>
              </defs>
              <circle
                cx={wcWidth / 2}
                cy={wcHeight / 2}
                r={Math.min(wcWidth, wcHeight) / 2 - 8}
                fill="url(#wcBg)"
                filter="url(#wcShadow)"
              />
              {wcLayout.map((w, idx) => (
                <g
                  key={idx}
                  transform={`translate(${w.x}, ${w.y}) rotate(${w.rotate})`}
                  style={{
                    animation: `wcFadeIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 0.03}s both`,
                  }}
                >
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={w.size}
                    fontWeight={Math.round(500 + (w.value / wcMax) * 300)}
                    fill={w.color}
                    style={{
                      fontFamily:
                        '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
                      letterSpacing: '0.5px',
                      paintOrder: 'stroke',
                      stroke: 'rgba(255,255,255,0.9)',
                      strokeWidth: Math.max(1, w.size * 0.06),
                      strokeLinejoin: 'round',
                      cursor: 'default',
                      transition: 'transform 0.2s',
                    }}
                  >
                    {w.emoji} {w.text}
                  </text>
                </g>
              ))}
            </svg>
          )}
        </div>

        {words.length > 0 && (
          <div style={styles.legends}>
            {words.slice(0, 8).map((w) => (
              <div key={w.text} style={styles.legendItem}>
                <div
                  style={{
                    ...styles.legendDot,
                    background: w.color,
                    boxShadow: `0 2px 6px ${w.color}55`,
                  }}
                />
                <span style={styles.legendEmoji}>{w.emoji}</span>
                <span style={styles.legendText}>{w.text}</span>
                <span style={styles.legendCount}>{w.value}次</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

TrendView.displayName = 'TrendView';

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    width: '100%',
    height: '100%',
    minHeight: 0,
    overflowY: 'auto',
    paddingRight: 4,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  pageTitle: {
    margin: 0,
    fontSize: 26,
    fontWeight: 800,
    color: '#3D2F52',
    letterSpacing: '2px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  titleIcon: { fontSize: 28 },
  pageSubtitle: {
    margin: '6px 0 0',
    fontSize: 13,
    color: '#8A7DA3',
    letterSpacing: '0.5px',
  },
  statsRow: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
  },
  statPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 16px',
    borderRadius: 16,
    border: '1.5px solid',
    minWidth: 128,
    backdropFilter: 'blur(8px)',
  },
  statContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: '1px',
  },
  statLabel: {
    fontSize: 11,
    color: '#8A7DA3',
    fontWeight: 600,
  },
  chartPanel: {
    padding: 20,
    background: 'rgba(255,255,255,0.75)',
    backdropFilter: 'blur(16px)',
    borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.85)',
    boxShadow: '0 10px 32px rgba(74, 58, 92, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  wcPanel: {
    padding: 20,
    background: 'rgba(255,255,255,0.75)',
    backdropFilter: 'blur(16px)',
    borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.85)',
    boxShadow: '0 10px 32px rgba(74, 58, 92, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  chartHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  panelTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 800,
    color: '#3D2F52',
    letterSpacing: '1.5px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  panelIcon: { fontSize: 18 },
  trendBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 700,
    color: '#3D2F52',
  },
  trendText: { letterSpacing: '1px' },
  chartContainer: {
    width: '100%',
    height: 280,
    minHeight: 220,
  },
  summaryBox: {
    display: 'flex',
    gap: 14,
    alignItems: 'flex-start',
    padding: '14px 18px',
    background:
      'linear-gradient(135deg, rgba(232,224,240,0.65), rgba(245,240,250,0.4))',
    borderRadius: 16,
    border: '1px solid rgba(107,91,138,0.12)',
  },
  summaryIcon: {
    fontSize: 26,
    flexShrink: 0,
    lineHeight: 1.4,
  },
  summaryText: {
    margin: 0,
    fontSize: 13.5,
    lineHeight: 1.9,
    color: '#4A3A5C',
    letterSpacing: '0.3px',
  },
  wcSub: {
    fontSize: 12,
    color: '#9A8DB5',
    fontWeight: 600,
  },
  wcContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 300,
    overflow: 'hidden',
  },
  wcEmpty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '40px 20px',
  },
  legends: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px 14px',
    paddingTop: 10,
    borderTop: '1px dashed rgba(107,91,138,0.15)',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '4px 10px',
    background: 'rgba(232,224,240,0.5)',
    borderRadius: 999,
    fontSize: 12,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
  },
  legendEmoji: { fontSize: 13 },
  legendText: {
    fontWeight: 700,
    color: '#3D2F52',
  },
  legendCount: {
    color: '#8A7DA3',
    fontWeight: 600,
  },
  ttRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  ttMood: {
    fontSize: 16,
    fontWeight: 800,
    letterSpacing: '1.5px',
  },
  ttDivider: {
    height: 1,
    background: 'linear-gradient(90deg, rgba(107,91,138,0), rgba(107,91,138,0.2), rgba(107,91,138,0))',
    margin: '8px 0',
  },
  ttLabel: {
    flex: 1,
    fontSize: 12,
    color: '#8A7DA3',
    fontWeight: 600,
  },
  ttValue: {
    fontSize: 12,
    fontWeight: 700,
    color: '#3D2F52',
  },
};

export default TrendView;
