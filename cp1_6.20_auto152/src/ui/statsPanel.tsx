import type { MagnitudeStats } from '@/types';
import { DEPTH_COLORS } from '@/utils/constants';

interface StatsPanelProps {
  total: number;
  stats: MagnitudeStats;
}

const BAR_COLORS = ['#ff4500', '#ffa500', '#ffd700', '#00bfff'];
const RANGES: Array<keyof MagnitudeStats> = ['1-3', '3-5', '5-7', '7-9'];

export function StatsPanel({ total, stats }: StatsPanelProps) {
  const maxCount = Math.max(...Object.values(stats), 1);

  return (
    <div className="stats-panel">
      <h3>地震统计</h3>
      <div className="stats-total">
        总事件数: <span>{total}</span>
      </div>
      {RANGES.map((range, i) => {
        const count = stats[range];
        const width = (count / maxCount) * 100;
        return (
          <div className="bar-item" key={range}>
            <div className="bar-label">
              <span>M {range}</span>
              <span>{count}</span>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${width}%`,
                  background: `linear-gradient(90deg, ${BAR_COLORS[i]}, ${BAR_COLORS[Math.min(i + 1, BAR_COLORS.length - 1)]})`,
                }}
              />
            </div>
          </div>
        );
      })}
      <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>深度图例</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: DEPTH_COLORS.shallow, display: 'inline-block' }} />
            <span style={{ color: '#aaa' }}>0-30 km 浅源</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: DEPTH_COLORS.moderate, display: 'inline-block' }} />
            <span style={{ color: '#aaa' }}>30-100 km 中源</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: DEPTH_COLORS.deep, display: 'inline-block' }} />
            <span style={{ color: '#aaa' }}>100-300 km 深源</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: DEPTH_COLORS.verydeep, display: 'inline-block' }} />
            <span style={{ color: '#aaa' }}>300+ km 超深源</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatsPanel;
