import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Rectangle,
} from 'recharts';
import websocketService, { type BidUpdate } from '../services/websocket';

interface ChartDashboardProps {
  itemId: string;
}

interface BidRecord {
  id: string;
  bidder: string;
  amount: number;
  timestamp: number;
}

interface LineDataPoint {
  time: string;
  timeKey: number;
  amount: number;
}

interface HeatmapCell {
  window: string;
  windowStart: number;
  count: number;
  row: number;
  col: number;
}

function formatMMSS(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

function formatTimeRange(start: number, end: number): string {
  return `${formatMMSS(start)} - ${formatMMSS(end)}`;
}

function getHeatmapColor(count: number, maxCount: number): string {
  if (maxCount === 0) return 'rgba(255, 248, 220, 0.3)';
  const ratio = Math.min(count / maxCount, 1);
  const r = Math.round(255 + (139 - 255) * ratio);
  const g = Math.round(248 + (0 - 248) * ratio);
  const b = Math.round(220 + (0 - 220) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

const CustomLineTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <div className="custom-tooltip-label">时间: {label}</div>
        <div className="custom-tooltip-value">
          出价: ¥{payload[0].value.toLocaleString('zh-CN')}
        </div>
      </div>
    );
  }
  return null;
};

const CustomHeatmapTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip">
        <div className="custom-tooltip-label">时段: {data.window}</div>
        <div className="custom-tooltip-value">出价次数: {data.count}</div>
      </div>
    );
  }
  return null;
};

function ChartDashboard({ itemId }: ChartDashboardProps) {
  const [bidHistory, setBidHistory] = useState<BidRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setBidHistory([]);
    setLoading(true);

    const fetchHistory = async () => {
      try {
        const response = await axios.get<BidRecord[]>(`/api/items/${itemId}/history`);
        setBidHistory(response.data);
      } catch (e) {
        console.error('Failed to fetch chart history:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [itemId]);

  useEffect(() => {
    const unsubscribe = websocketService.onBidUpdate((update: BidUpdate) => {
      if (update.id !== itemId) return;
      setBidHistory((prev) => [
        ...prev,
        {
          id: `bid_${update.timestamp}_${Math.random()}`,
          bidder: update.currentBidder,
          amount: update.currentPrice,
          timestamp: update.timestamp,
        },
      ]);
    });
    return () => unsubscribe();
  }, [itemId]);

  const lineData = useMemo<LineDataPoint[]>(() => {
    if (bidHistory.length === 0) return [];
    const recent = bidHistory.slice(-20);
    return recent.map((record) => ({
      time: formatMMSS(record.timestamp),
      timeKey: record.timestamp,
      amount: record.amount,
    }));
  }, [bidHistory]);

  const heatmapData = useMemo<HeatmapCell[]>(() => {
    if (bidHistory.length === 0) return [];

    const WINDOW_SIZE = 5000;
    const timestamps = bidHistory.map((r) => r.timestamp);
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);

    const startWindow = Math.floor(minTime / WINDOW_SIZE) * WINDOW_SIZE;
    const endWindow = Math.floor(maxTime / WINDOW_SIZE) * WINDOW_SIZE;
    const totalWindows = Math.max(1, Math.floor((endWindow - startWindow) / WINDOW_SIZE) + 1);

    const counts: Record<number, number> = {};
    for (let t = startWindow; t <= endWindow; t += WINDOW_SIZE) {
      counts[t] = 0;
    }
    timestamps.forEach((ts) => {
      const windowStart = Math.floor(ts / WINDOW_SIZE) * WINDOW_SIZE;
      counts[windowStart] = (counts[windowStart] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(counts));
    const COLS = Math.min(12, totalWindows);
    const ROWS = Math.max(1, Math.ceil(totalWindows / COLS));

    const cells: HeatmapCell[] = [];
    let idx = 0;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (idx >= totalWindows) break;
        const windowStart = startWindow + idx * WINDOW_SIZE;
        cells.push({
          window: formatTimeRange(windowStart, windowStart + WINDOW_SIZE - 1),
          windowStart,
          count: counts[windowStart] || 0,
          row,
          col,
        });
        idx++;
      }
    }
    cells.forEach((c) => {
      (c as any).color = getHeatmapColor(c.count, maxCount);
    });
    return cells;
  }, [bidHistory]);

  const chartWidth = 400;
  const chartHeight = 240;
  const heatmapCellWidth = heatmapData.length > 0
    ? (chartWidth - 40) / Math.min(12, Math.max(...heatmapData.map((c) => c.col)) + 1) - 6
    : 30;
  const heatmapCellHeight = 36;

  if (loading) {
    return (
      <div className="glass-card chart-card chart-dashboard">
        <div className="section-title">图表看板</div>
        <div className="loading">
          <div className="spinner"></div>
          <span>正在加载图表数据...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-dashboard">
      <div className="charts-grid">
        <div className="glass-card chart-card">
          <div className="section-title">
            <span>竞价历史</span>
            <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)' }}>
              最近{lineData.length}次出价
            </span>
          </div>
          <div className="chart-container">
            {lineData.length < 2 ? (
              <div className="empty-chart">数据不足，需要至少2次出价才能显示折线图</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <defs>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#1a73e8" />
                      <stop offset="100%" stopColor="#9c27b0" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(58, 58, 92, 0.4)" />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: '#b0b0d0', fontSize: 11 }}
                    stroke="#3a3a5c"
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#b0b0d0', fontSize: 11 }}
                    stroke="#3a3a5c"
                    tickLine={false}
                    tickFormatter={(v) => `¥${(v / 1000).toFixed(1)}k`}
                    width={60}
                  />
                  <Tooltip content={<CustomLineTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="url(#lineGradient)"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#4fc3f7', stroke: '#1a73e8', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#4fc3f7', stroke: '#fff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glass-card chart-card">
          <div className="section-title">
            <span>出价频率热力图</span>
            <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)' }}>
              5秒窗口
            </span>
          </div>
          <div className="chart-container">
            {heatmapData.length === 0 ? (
              <div className="empty-chart">暂无出价数据</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart margin={{ top: 20, right: 20, left: 10, bottom: 10 }} data={heatmapData}>
                  <Tooltip content={<CustomHeatmapTooltip />} cursor={false} />
                  {heatmapData.map((cell) => (
                    <Rectangle
                      key={`${cell.row}-${cell.col}`}
                      className="heatmap-cell"
                      x={30 + cell.col * (heatmapCellWidth + 6)}
                      y={20 + cell.row * (heatmapCellHeight + 6)}
                      width={heatmapCellWidth}
                      height={heatmapCellHeight}
                      radius={[6, 6, 6, 6]}
                      fill={(cell as any).color || 'rgba(255,248,220,0.3)'}
                      stroke="rgba(58, 58, 92, 0.3)"
                      strokeWidth={1}
                      payload={cell}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
            {heatmapData.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: 'rgba(255, 248, 220, 0.5)', border: '1px solid var(--border-color)' }}></div>
                  <span>低频</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: 'rgb(255, 140, 60)', border: '1px solid var(--border-color)' }}></div>
                  <span>中频</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: 'rgb(139, 0, 0)', border: '1px solid var(--border-color)' }}></div>
                  <span>高频</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChartDashboard;
