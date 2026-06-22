import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface RadarDataItem {
  dimension: string;
  value: number;
  fullMark: number;
}

interface RiskRadarProps {
  data: RadarDataItem[];
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
  concentration: number;
}

export default function RiskRadar({ data, sharpeRatio, maxDrawdown, volatility, concentration }: RiskRadarProps) {
  return (
    <div style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#F1F5F9', marginBottom: '20px' }}>风险评估报告</h2>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{
          background: '#0F172A',
          borderRadius: '12px',
          padding: '24px',
          flex: '1 1 400px',
          minWidth: '300px',
        }}>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fill: '#94A3B8', fontSize: 13 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fill: '#64748B', fontSize: 11 }}
                axisLine={false}
              />
              <Radar
                name="风险评估"
                dataKey="value"
                stroke="#2563EB"
                strokeWidth={2}
                fill="#3B82F6"
                fillOpacity={0.3}
                dot={{ r: 4, fill: '#FFFFFF', stroke: '#2563EB', strokeWidth: 2 }}
                animationDuration={500}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div style={{
          background: '#0F172A',
          borderRadius: '12px',
          padding: '24px',
          flex: '1 1 280px',
          minWidth: '240px',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F1F5F9', marginBottom: '20px' }}>核心指标</h3>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '4px' }}>夏普比率</div>
            <div className="value-pulse" style={{ fontSize: '28px', fontWeight: 700, color: '#3B82F6' }}>
              {sharpeRatio.toFixed(3)}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '4px' }}>最大回撤</div>
            <div className="value-pulse" style={{ fontSize: '28px', fontWeight: 700, color: '#EF4444' }}>
              -{maxDrawdown.toFixed(2)}%
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '4px' }}>波动率</div>
            <div className="value-pulse" style={{ fontSize: '28px', fontWeight: 700, color: '#FBBF24' }}>
              {volatility.toFixed(2)}%
            </div>
          </div>

          <div>
            <div style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '4px' }}>集中度 (HHI)</div>
            <div className="value-pulse" style={{ fontSize: '28px', fontWeight: 700, color: '#8B5CF6' }}>
              {concentration.toFixed(3)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
