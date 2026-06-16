import { useState, useEffect, useRef } from 'react';
import ConfigPanel from './ConfigPanel';
import Dashboard from './Dashboard';
import { themes, fonts, generateDefaultData, defaultChartConfigs, type Theme, type ChartData, type ChartConfig } from './utils';

interface DashboardConfig {
  title: string;
  theme: Theme;
  font: string;
  chartData: ChartData;
  chartConfigs: Record<string, ChartConfig>;
  generated: boolean;
}

function App() {
  const [config, setConfig] = useState<DashboardConfig>({
    title: '数据仪表盘',
    theme: themes[4],
    font: fonts[0].value,
    chartData: generateDefaultData(),
    chartConfigs: { ...defaultChartConfigs },
    generated: false
  });

  const [fps, setFps] = useState(60);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useEffect(() => {
    let animationId: number;
    const measureFps = () => {
      frameCount.current++;
      const currentTime = performance.now();
      if (currentTime - lastTime.current >= 1000) {
        setFps(Math.round((frameCount.current * 1000) / (currentTime - lastTime.current)));
        frameCount.current = 0;
        lastTime.current = currentTime;
      }
      animationId = requestAnimationFrame(measureFps);
    };
    animationId = requestAnimationFrame(measureFps);
    return () => cancelAnimationFrame(animationId);
  }, []);

  const handleGenerate = (title: string, themeIndex: number, fontIndex: number) => {
    setConfig({
      title,
      theme: themes[themeIndex],
      font: fonts[fontIndex].value,
      chartData: generateDefaultData(),
      chartConfigs: { ...defaultChartConfigs },
      generated: true
    });
  };

  const handleChartConfigChange = (chartId: string, newConfig: ChartConfig) => {
    setConfig(prev => ({
      ...prev,
      chartConfigs: {
        ...prev.chartConfigs,
        [chartId]: newConfig
      }
    }));
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: config.font }}>
      <ConfigPanel
        onGenerate={handleGenerate}
        initialTitle={config.title}
        initialThemeIndex={themes.findIndex(t => t.name === config.theme.name)}
        initialFontIndex={fonts.findIndex(f => f.value === config.font)}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Dashboard
          config={config}
          onChartConfigChange={handleChartConfigChange}
        />
        <div
          style={{
            position: 'fixed',
            bottom: 12,
            right: 20,
            padding: '6px 14px',
            background: fps >= 45 ? 'rgba(45, 180, 0, 0.9)' : 'rgba(255, 80, 80, 0.9)',
            color: '#fff',
            borderRadius: 16,
            fontSize: 13,
            fontWeight: 600,
            zIndex: 9999,
            fontFamily: "'Roboto', sans-serif",
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          FPS: {fps}
        </div>
      </div>
    </div>
  );
}

export default App;
