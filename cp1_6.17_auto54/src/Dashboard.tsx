import { useState, useEffect, useRef } from 'react';
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import ChartCard from './ChartCard';
import 'react-grid-layout/css/styles.css';
import 'react-grid-layout/css/styles.css';
import {
  type Theme,
  type ChartData,
  type ChartConfig,
  defaultChartConfigs,
  chartNames,
  generateDefaultData
} from './utils';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardProps {
  config: {
    title: string;
    theme: Theme;
    font: string;
    chartData: ChartData;
    chartConfigs: Record<string, ChartConfig>;
    generated: boolean;
  };
  onChartConfigChange: (chartId: string, config: ChartConfig) => void;
}

const STORAGE_KEY = 'dashboard-layout';

const defaultLayouts: Layout[] = [
  { i: 'chart1', x: 0, y: 0, w: 3, h: 1, minW: 2, maxW: 6 },
  { i: 'chart2', x: 3, y: 0, w: 3, h: 1, minW: 2, maxW: 6 },
  { i: 'chart3', x: 0, y: 1, w: 3, h: 1, minW: 2, maxW: 6 },
  { i: 'chart4', x: 3, y: 1, w: 3, h: 1, minW: 2, maxW: 6 }
];

function Dashboard({ config, onChartConfigChange }: DashboardProps) {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [layouts, setLayouts] = useState<Layout[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return defaultLayouts;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
    } catch (e) {
      // ignore
    }
  }, [layouts]);

  const handleLayoutChange = (currentLayout: Layout[]) => {
    setLayouts(currentLayout);
  };

  const handleRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(255, 255, 255, 0.5);
      transform: scale(0);
      animation: ripple-animation 0.6s ease-out;
      pointer-events: none;
    `;
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  };

  const exportToPNG = async () => {
    if (!dashboardRef.current) return;
    setShowExportMenu(false);
    try {
      const canvas = await html2canvas(dashboardRef.current, {
        backgroundColor: config.theme.cardBg,
        scale: 2,
        useCORS: true
      });
      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, `${config.title || 'dashboard'}.png`);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const exportToHTML = () => {
    setShowExportMenu(false);
    const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Noto+Sans+SC:wght@400;500;700&family=Playfair+Display:wght@400;500;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/prop-types@15.8.1/prop-types.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/recharts@2.10.0/umd/Recharts.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: ${config.font};
      background: ${config.theme.bg};
      color: ${config.theme.text};
      padding: 30px;
      min-height: 100vh;
    }
    .dashboard-container {
      max-width: 1400px;
      margin: 0 auto;
      background: ${config.theme.cardBg};
      border-radius: 12px;
      padding: 25px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
    }
    .dashboard-title {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 25px;
      color: ${config.theme.primary};
      text-align: center;
      background: linear-gradient(135deg, ${config.theme.primary}, ${config.theme.secondary});
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .chart-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .chart-card {
      background: ${config.theme.cardBg};
      border-radius: 10px;
      padding: 15px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      border: 1px solid ${config.theme.primary}22;
      height: 320px;
    }
    .chart-name {
      font-size: 14px;
      font-weight: 700;
      color: ${config.theme.primary};
      margin-bottom: 8px;
    }
    @media (max-width: 768px) {
      .chart-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="dashboard-container">
    <h1 class="dashboard-title">${config.title}</h1>
    <div id="charts" class="chart-grid"></div>
  </div>
  <script type="text/babel">
    const { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = Recharts;
    
    const chartData = ${JSON.stringify(config.chartData)};
    const chartConfigs = ${JSON.stringify(config.chartConfigs)};
    const chartNames = ${JSON.stringify(chartNames)};
    const theme = ${JSON.stringify(config.theme)};
    const font = ${JSON.stringify(config.font)};

    const renderChart = (chartId) => {
      const cfg = chartConfigs[chartId];
      const axisStyle = {
        tick: { fill: theme.text, fontSize: 12, fontFamily: font },
        axisLine: { stroke: theme.text, opacity: 0.3 },
        tickLine: { stroke: theme.text, opacity: 0.3 }
      };
      const yProps = cfg.yAxisAuto ? {} : { domain: [cfg.yAxisMin || 0, cfg.yAxisMax || 100] };

      if (cfg.type === 'line') {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData.lineData} margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.text} opacity={0.1} />
              <XAxis dataKey="name" {...axisStyle} />
              <YAxis {...axisStyle} {...yProps} />
              <Tooltip contentStyle={{ background: theme.cardBg, border: '1px solid ' + theme.primary + '33', borderRadius: 8, fontFamily: font, color: theme.text }} />
              <Legend wrapperStyle={{ fontFamily: font, color: theme.text }} />
              <Line type={cfg.smoothCurve ? 'monotone' : 'linear'} dataKey="value" stroke={theme.colors[0]} strokeWidth={3} dot={{ fill: theme.colors[0], r: 4 }}
                label={cfg.showLabel ? { position: 'top', fill: theme.text, fontSize: 11, fontFamily: font } : undefined} />
              <Line type={cfg.smoothCurve ? 'monotone' : 'linear'} dataKey="value2" stroke={theme.colors[1]} strokeWidth={3} dot={{ fill: theme.colors[1], r: 4 }}
                label={cfg.showLabel ? { position: 'top', fill: theme.text, fontSize: 11, fontFamily: font } : undefined} />
            </LineChart>
          </ResponsiveContainer>
        );
      } else if (cfg.type === 'bar') {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData.barData} margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.text} opacity={0.1} />
              <XAxis dataKey="name" {...axisStyle} />
              <YAxis {...axisStyle} {...yProps} />
              <Tooltip contentStyle={{ background: theme.cardBg, border: '1px solid ' + theme.primary + '33', borderRadius: 8, fontFamily: font, color: theme.text }} />
              <Legend wrapperStyle={{ fontFamily: font, color: theme.text }} />
              <Bar dataKey="value" fill={theme.colors[0]} radius={[4,4,0,0]} label={cfg.showLabel ? { position: 'top', fill: theme.text, fontSize: 11, fontFamily: font } : undefined} />
              <Bar dataKey="value2" fill={theme.colors[1]} radius={[4,4,0,0]} label={cfg.showLabel ? { position: 'top', fill: theme.text, fontSize: 11, fontFamily: font } : undefined} />
            </BarChart>
          </ResponsiveContainer>
        );
      } else if (cfg.type === 'pie') {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData.pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2} dataKey="value"
                label={cfg.showLabel ? ({ name, percent }) => name + ' ' + (percent * 100).toFixed(0) + '%' : undefined}>
                {chartData.pieData.map((_, i) => <Cell key={i} fill={theme.colors[i % theme.colors.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: theme.cardBg, border: '1px solid ' + theme.primary + '33', borderRadius: 8, fontFamily: font, color: theme.text }} />
              <Legend wrapperStyle={{ fontFamily: font, color: theme.text, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        );
      } else if (cfg.type === 'radar') {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData.radarData}>
              <PolarGrid stroke={theme.text} opacity={0.2} />
              <PolarAngleAxis dataKey="subject" tick={{ fill: theme.text, fontSize: 12, fontFamily: font }} />
              <PolarRadiusAxis tick={{ fill: theme.text, fontSize: 10, fontFamily: font }} {...yProps} />
              <Radar name="本期" dataKey="A" stroke={theme.colors[0]} fill={theme.colors[0]} fillOpacity={0.5} />
              <Radar name="上期" dataKey="B" stroke={theme.colors[1]} fill={theme.colors[1]} fillOpacity={0.3} />
              <Legend wrapperStyle={{ fontFamily: font, color: theme.text }} />
              <Tooltip contentStyle={{ background: theme.cardBg, border: '1px solid ' + theme.primary + '33', borderRadius: 8, fontFamily: font, color: theme.text }} />
            </RadarChart>
          </ResponsiveContainer>
        );
      }
    };

    const ChartCard = ({ chartId }) => (
      <div className="chart-card">
        <div className="chart-name">{chartNames[chartId]}</div>
        <div style={{ height: 'calc(100% - 28px)' }}>{renderChart(chartId)}</div>
      </div>
    );

    const App = () => (
      <React.Fragment>
        <ChartCard chartId="chart1" />
        <ChartCard chartId="chart2" />
        <ChartCard chartId="chart3" />
        <ChartCard chartId="chart4" />
      </React.Fragment>
    );

    const root = ReactDOM.createRoot(document.getElementById('charts'));
    root.render(<App />);
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    saveAs(blob, `${config.title || 'dashboard'}.html`);
  };

  const chartIds = ['chart1', 'chart2', 'chart3', 'chart4'];

  return (
    <div
      style={{
        flex: 1,
        background: '#f5f5f5',
        padding: 16,
        paddingLeft: 0,
        overflowY: 'auto',
        position: 'relative'
      }}
    >
      <div
        ref={dashboardRef}
        style={{
          background: config.theme.cardBg,
          borderRadius: 12,
          padding: 15,
          boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
          minHeight: 'calc(100vh - 32px)',
          position: 'relative'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 15
          }}
        >
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              background: `linear-gradient(135deg, ${config.theme.primary}, ${config.theme.secondary})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontFamily: config.font
            }}
          >
            {config.title}
          </h1>
          <div style={{ position: 'relative' }}>
            <button
              onClick={(e) => {
                handleRipple(e);
                setShowExportMenu(!showExportMenu);
              }}
              style={{
                position: 'relative',
                overflow: 'hidden',
                padding: '10px 22px',
                borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'filter 0.2s, transform 0.2s',
                fontFamily: config.font,
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: 6
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
              📤 导出
            </button>
            {showExportMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 8,
                  background: '#fff',
                  borderRadius: 10,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                  overflow: 'hidden',
                  zIndex: 1000,
                  minWidth: 160,
                  animation: 'fadeIn 0.2s ease-out'
                }}
              >
                <button
                  onClick={exportToPNG}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '12px 18px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: '#333',
                    fontFamily: config.font,
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0f0')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  🖼️ 导出为 PNG 图片
                </button>
                <button
                  onClick={exportToHTML}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '12px 18px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: '#333',
                    fontFamily: config.font,
                    transition: 'background 0.15s',
                    borderTop: '1px solid #eee'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0f0')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  📄 导出为 HTML 页面
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ height: 580 }}>
          <ResponsiveGridLayout
            className="layout"
            layouts={{ lg: layouts }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 6, md: 6, sm: 4, xs: 2, xxs: 2 }}
            rowHeight={280}
            onLayoutChange={handleLayoutChange}
            isResizable={true}
            isDraggable={true}
            draggableHandle=".drag-handle"
            compactType="vertical"
            margin={[15, 15]}
          >
            {chartIds.map((chartId) => (
              <div key={chartId} style={{ height: '100%' }}>
                <div
                  className="drag-handle"
                  style={{
                    cursor: 'move',
                    width: '100%',
                    height: '100%'
                  }}
                >
                  <ChartCard
                    chartId={chartId}
                    theme={config.theme}
                    font={config.font}
                    chartData={config.chartData}
                    config={config.chartConfigs[chartId] || defaultChartConfigs[chartId]}
                    onConfigChange={(cfg) => onChartConfigChange(chartId, cfg)}
                  />
                </div>
              </div>
            ))}
          </ResponsiveGridLayout>
        </div>

        {!config.generated && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(245, 245, 245, 0.85)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              backdropFilter: 'blur(2px)'
            }}
          >
            <div style={{ fontSize: 64, marginBottom: 16 }}>📊</div>
            <p style={{ fontSize: 18, color: '#666', fontFamily: config.font }}>
              在左侧配置面板设置参数后，点击"生成仪表盘"
            </p>
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ripple-animation {
          from { transform: scale(0); opacity: 0.5; }
          to { transform: scale(4); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default Dashboard;
