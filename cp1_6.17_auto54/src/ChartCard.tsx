import { useState } from 'react';
import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { type Theme, type ChartData, type ChartConfig, chartNames } from './utils';

interface ChartCardProps {
  chartId: string;
  theme: Theme;
  font: string;
  chartData: ChartData;
  config: ChartConfig;
  onConfigChange: (config: ChartConfig) => void;
}

function ChartCard({ chartId, theme, font, chartData, config, onConfigChange }: ChartCardProps) {
  const [showSettings, setShowSettings] = useState(false);

  const renderChart = () => {
    const commonAxisStyle = {
      tick: { fill: theme.text, fontSize: 12, fontFamily: font },
      axisLine: { stroke: theme.text, opacity: 0.3 },
      tickLine: { stroke: theme.text, opacity: 0.3 }
    };

    const yAxisProps = config.yAxisAuto
      ? {}
      : { domain: [config.yAxisMin || 0, config.yAxisMax || 100] };

    switch (config.type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData.lineData} margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.text} opacity={0.1} />
              <XAxis dataKey="name" {...commonAxisStyle} />
              <YAxis {...commonAxisStyle} {...yAxisProps} />
              <Tooltip
                contentStyle={{ background: theme.cardBg, border: `1px solid ${theme.primary}33`, borderRadius: 8, fontFamily: font, color: theme.text }}
                labelStyle={{ color: theme.text }}
              />
              <Legend wrapperStyle={{ fontFamily: font, color: theme.text }} />
              <Line
                type={config.smoothCurve ? 'monotone' : 'linear'}
                dataKey="value"
                stroke={theme.colors[0]}
                strokeWidth={3}
                dot={{ fill: theme.colors[0], strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                isAnimationActive={true}
                animationDuration={300}
                animationEasing="ease-out"
                label={config.showLabel ? { position: 'top', fill: theme.text, fontSize: 11, fontFamily: font } : undefined}
              />
              <Line
                type={config.smoothCurve ? 'monotone' : 'linear'}
                dataKey="value2"
                stroke={theme.colors[1]}
                strokeWidth={3}
                dot={{ fill: theme.colors[1], strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                isAnimationActive={true}
                animationDuration={300}
                animationEasing="ease-out"
                label={config.showLabel ? { position: 'top', fill: theme.text, fontSize: 11, fontFamily: font } : undefined}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData.barData} margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.text} opacity={0.1} />
              <XAxis dataKey="name" {...commonAxisStyle} />
              <YAxis {...commonAxisStyle} {...yAxisProps} />
              <Tooltip
                contentStyle={{ background: theme.cardBg, border: `1px solid ${theme.primary}33`, borderRadius: 8, fontFamily: font, color: theme.text }}
                labelStyle={{ color: theme.text }}
              />
              <Legend wrapperStyle={{ fontFamily: font, color: theme.text }} />
              <Bar
                dataKey="value"
                fill={theme.colors[0]}
                radius={[4, 4, 0, 0]}
                isAnimationActive={true}
                animationDuration={300}
                animationEasing="ease-out"
                label={config.showLabel ? { position: 'top', fill: theme.text, fontSize: 11, fontFamily: font } : undefined}
              />
              <Bar
                dataKey="value2"
                fill={theme.colors[1]}
                radius={[4, 4, 0, 0]}
                isAnimationActive={true}
                animationDuration={300}
                animationEasing="ease-out"
                label={config.showLabel ? { position: 'top', fill: theme.text, fontSize: 11, fontFamily: font } : undefined}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData.pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
                dataKey="value"
                isAnimationActive={true}
                animationDuration={300}
                animationEasing="ease-out"
                label={config.showLabel ? ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%` : undefined}
                labelLine={config.showLabel}
              >
                {chartData.pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={theme.colors[index % theme.colors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: theme.cardBg, border: `1px solid ${theme.primary}33`, borderRadius: 8, fontFamily: font, color: theme.text }}
                labelStyle={{ color: theme.text }}
              />
              <Legend wrapperStyle={{ fontFamily: font, color: theme.text, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData.radarData}>
              <PolarGrid stroke={theme.text} opacity={0.2} />
              <PolarAngleAxis dataKey="subject" tick={{ fill: theme.text, fontSize: 12, fontFamily: font }} />
              <PolarRadiusAxis tick={{ fill: theme.text, fontSize: 10, fontFamily: font }} {...yAxisProps} />
              <Radar
                name="本期"
                dataKey="A"
                stroke={theme.colors[0]}
                fill={theme.colors[0]}
                fillOpacity={0.5}
                isAnimationActive={true}
                animationDuration={300}
                animationEasing="ease-out"
                label={config.showLabel ? { fill: theme.text, fontSize: 10, fontFamily: font } : undefined}
              />
              <Radar
                name="上期"
                dataKey="B"
                stroke={theme.colors[1]}
                fill={theme.colors[1]}
                fillOpacity={0.3}
                isAnimationActive={true}
                animationDuration={300}
                animationEasing="ease-out"
                label={config.showLabel ? { fill: theme.text, fontSize: 10, fontFamily: font } : undefined}
              />
              <Legend wrapperStyle={{ fontFamily: font, color: theme.text }} />
              <Tooltip
                contentStyle={{ background: theme.cardBg, border: `1px solid ${theme.primary}33`, borderRadius: 8, fontFamily: font, color: theme.text }}
                labelStyle={{ color: theme.text }}
              />
            </RadarChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: theme.cardBg,
        borderRadius: 10,
        boxShadow: `0 2px 12px rgba(0,0,0,0.08)`,
        padding: 12,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: font
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
          flexShrink: 0
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: theme.primary,
            letterSpacing: 0.3
          }}
        >
          {chartNames[chartId] || chartId}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowSettings(!showSettings);
          }}
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '6px 10px',
            borderRadius: 6,
            border: 'none',
            background: `linear-gradient(135deg, ${theme.primary}cc, ${theme.secondary}cc)`,
            color: '#fff',
            fontSize: 12,
            cursor: 'pointer',
            transition: 'filter 0.2s, transform 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontWeight: 500
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = 'brightness(1.1)';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = 'brightness(1)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ⚙ 设置
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, transition: 'all 0.3s ease-out' }}>
        {renderChart()}
      </div>

      {showSettings && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 40,
            right: 12,
            width: 240,
            background: theme.cardBg,
            borderRadius: 10,
            boxShadow: `0 8px 32px rgba(0,0,0,0.25), 0 0 0 1px ${theme.primary}33`,
            padding: 16,
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>图表配置</span>
            <button
              onClick={() => setShowSettings(false)}
              style={{ background: 'none', border: 'none', color: theme.text, opacity: 0.6, cursor: 'pointer', fontSize: 16 }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, color: theme.text, opacity: 0.7 }}>图表类型</label>
            <select
              value={config.type}
              onChange={(e) => onConfigChange({ ...config, type: e.target.value as ChartConfig['type'] })}
              style={{
                padding: '8px 10px',
                borderRadius: 6,
                border: `1px solid ${theme.primary}44`,
                background: theme.bg,
                color: theme.text,
                fontSize: 13,
                fontFamily: 'inherit',
                outline: 'none'
              }}
            >
              <option value="line">折线图</option>
              <option value="bar">柱状图</option>
              <option value="pie">饼图</option>
              <option value="radar">雷达图</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ fontSize: 12, color: theme.text, opacity: 0.7 }}>显示数据标签</label>
            <label style={{ position: 'relative', display: 'inline-block', width: 40, height: 22 }}>
              <input
                type="checkbox"
                checked={config.showLabel}
                onChange={(e) => onConfigChange({ ...config, showLabel: e.target.checked })}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span
                style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: config.showLabel ? theme.primary : '#555',
                  borderRadius: 22,
                  transition: '0.2s'
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    content: '""',
                    height: 16,
                    width: 16,
                    left: config.showLabel ? 22 : 3,
                    bottom: 3,
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: '0.2s'
                  }}
                />
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ fontSize: 12, color: theme.text, opacity: 0.7 }}>Y轴自动范围</label>
            <label style={{ position: 'relative', display: 'inline-block', width: 40, height: 22 }}>
              <input
                type="checkbox"
                checked={config.yAxisAuto}
                onChange={(e) => onConfigChange({ ...config, yAxisAuto: e.target.checked })}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span
                style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: config.yAxisAuto ? theme.primary : '#555',
                  borderRadius: 22,
                  transition: '0.2s'
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    content: '""',
                    height: 16,
                    width: 16,
                    left: config.yAxisAuto ? 22 : 3,
                    bottom: 3,
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: '0.2s'
                  }}
                />
              </span>
            </label>
          </div>

          {!config.yAxisAuto && (config.type === 'line' || config.type === 'bar' || config.type === 'radar') && (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: theme.text, opacity: 0.7 }}>最小值</label>
                <input
                  type="number"
                  value={config.yAxisMin ?? 0}
                  onChange={(e) => onConfigChange({ ...config, yAxisMin: Number(e.target.value) })}
                  style={{
                    padding: '6px 8px',
                    borderRadius: 6,
                    border: `1px solid ${theme.primary}44`,
                    background: theme.bg,
                    color: theme.text,
                    fontSize: 12,
                    fontFamily: 'inherit',
                    outline: 'none',
                    width: '100%'
                  }}
                />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: theme.text, opacity: 0.7 }}>最大值</label>
                <input
                  type="number"
                  value={config.yAxisMax ?? 100}
                  onChange={(e) => onConfigChange({ ...config, yAxisMax: Number(e.target.value) })}
                  style={{
                    padding: '6px 8px',
                    borderRadius: 6,
                    border: `1px solid ${theme.primary}44`,
                    background: theme.bg,
                    color: theme.text,
                    fontSize: 12,
                    fontFamily: 'inherit',
                    outline: 'none',
                    width: '100%'
                  }}
                />
              </div>
            </div>
          )}

          {config.type === 'line' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: 12, color: theme.text, opacity: 0.7 }}>平滑曲线</label>
              <label style={{ position: 'relative', display: 'inline-block', width: 40, height: 22 }}>
                <input
                  type="checkbox"
                  checked={config.smoothCurve ?? false}
                  onChange={(e) => onConfigChange({ ...config, smoothCurve: e.target.checked })}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: config.smoothCurve ? theme.primary : '#555',
                    borderRadius: 22,
                    transition: '0.2s'
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      content: '""',
                      height: 16,
                      width: 16,
                      left: config.smoothCurve ? 22 : 3,
                      bottom: 3,
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '0.2s'
                    }}
                  />
                </span>
              </label>
            </div>
          )}

          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(-8px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

export default ChartCard;
