import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { fetchWeeklyReport } from '../../api';
import type { DailyEmotionData, WordFrequency } from '../../api';

const EMOTION_COLORS: Record<string, string> = {
  happy: '#facc15',
  sad: '#6366f1',
  anxious: '#f97316',
  calm: '#34d399',
  excited: '#f472b6',
};

const WORD_COLORS = ['#a78bfa', '#f472b6', '#34d399', '#fbbf24'];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const emotionLabels: Record<string, string> = {
    happy: '快乐',
    sad: '悲伤',
    anxious: '焦虑',
    calm: '平静',
    excited: '兴奋',
  };

  return (
    <div className="report-tooltip">
      <p className="tooltip-date">{label}</p>
      {payload.map((item, i) => (
        <p key={i} className="tooltip-item">
          <span className="tooltip-dot" style={{ background: item.color }} />
          {emotionLabels[item.name] || item.name}: {item.value}
        </p>
      ))}
    </div>
  );
}

export default function ReportPage() {
  const [dailyData, setDailyData] = useState<DailyEmotionData[]>([]);
  const [wordFrequency, setWordFrequency] = useState<WordFrequency[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadReport() {
      try {
        setLoading(true);
        const report = await fetchWeeklyReport();
        setDailyData(report.dailyData);
        setWordFrequency(report.wordFrequency);
      } catch (err) {
        console.error('Failed to load weekly report:', err);
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, []);

  const maxCount = Math.max(
    ...wordFrequency.map((w) => w.count),
    1
  );

  const handleWordClick = (word: string) => {
    navigate(`/records?search=${encodeURIComponent(word)}`);
  };

  if (loading) {
    return (
      <div className="loading-state">
        <i className="fas fa-spinner fa-spin"></i>
        <span>加载中...</span>
      </div>
    );
  }

  return (
    <div className="report-page">
      <h2 className="page-title">
        <i className="fas fa-chart-area" style={{ color: '#8b5cf6', marginRight: '8px' }}></i>
        本周情绪报告
      </h2>

      <div className="chart-section">
        <h3 className="section-title">情绪变化趋势</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={dailyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradientHappy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#facc15" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#facc15" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gradientSad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gradientAnxious" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gradientCalm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gradientExcited" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f472b6" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#f472b6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickFormatter={(val: string) => {
                  const d = new Date(val);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="happy"
                stackId="1"
                stroke="#facc15"
                fill="url(#gradientHappy)"
              />
              <Area
                type="monotone"
                dataKey="sad"
                stackId="1"
                stroke="#6366f1"
                fill="url(#gradientSad)"
              />
              <Area
                type="monotone"
                dataKey="anxious"
                stackId="1"
                stroke="#f97316"
                fill="url(#gradientAnxious)"
              />
              <Area
                type="monotone"
                dataKey="calm"
                stackId="1"
                stroke="#34d399"
                fill="url(#gradientCalm)"
              />
              <Area
                type="monotone"
                dataKey="excited"
                stackId="1"
                stroke="#f472b6"
                fill="url(#gradientExcited)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-legend">
          {Object.entries(EMOTION_COLORS).map(([key, color]) => {
            const labels: Record<string, string> = {
              happy: '快乐', sad: '悲伤', anxious: '焦虑', calm: '平静', excited: '兴奋',
            };
            return (
              <span key={key} className="legend-item">
                <span className="legend-dot" style={{ background: color }} />
                {labels[key]}
              </span>
            );
          })}
        </div>
      </div>

      <div className="wordcloud-section">
        <h3 className="section-title">高频词云</h3>
        <div className="wordcloud-container">
          {wordFrequency.map((wf, i) => {
            const fontSize = 14 + ((wf.count / maxCount) * 22);
            const color = WORD_COLORS[i % WORD_COLORS.length];
            return (
              <span
                key={wf.word}
                className="wordcloud-word"
                style={{ fontSize: `${fontSize}px`, color }}
                onClick={() => handleWordClick(wf.word)}
              >
                {wf.word}
              </span>
            );
          })}
        </div>
      </div>

      <style>{`
        .report-page {
          position: relative;
        }
        .page-title {
          font-size: 22px;
          font-weight: 700;
          color: #e2e8f0;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
        }
        .chart-section {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #e2e8f0;
          margin-bottom: 16px;
        }
        .chart-container {
          width: 100%;
        }
        .chart-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-top: 12px;
          justify-content: center;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #94a3b8;
        }
        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }
        .report-tooltip {
          background: rgba(30, 41, 59, 0.9);
          border: 1px solid #475569;
          border-radius: 8px;
          padding: 10px 14px;
        }
        .tooltip-date {
          font-size: 13px;
          color: #e2e8f0;
          font-weight: 600;
          margin-bottom: 6px;
        }
        .tooltip-item {
          font-size: 12px;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 6px;
          margin: 2px 0;
        }
        .tooltip-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          display: inline-block;
        }
        .wordcloud-section {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 24px;
        }
        .wordcloud-container {
          display: flex;
          flex-wrap: wrap;
          gap: 12px 16px;
          align-items: center;
          justify-content: center;
          min-height: 120px;
        }
        .wordcloud-word {
          cursor: pointer;
          display: inline-block;
          transition: transform 0.2s, font-weight 0.2s;
          line-height: 1.4;
        }
        .wordcloud-word:hover {
          transform: scale(1.1);
          font-weight: 700;
        }
        .wordcloud-word:active {
          animation: word-shake 0.3s ease;
        }
        @keyframes word-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 0;
          gap: 12px;
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
}
