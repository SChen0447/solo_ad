import React, { useState, useEffect } from 'react';
import CurveEditor from './CurveEditor';
import AnimationPreview from './AnimationPreview';
import CodeExport from './CodeExport';
import { BezierCurve, AnimationType, PRESET_CURVES } from './types';

const App: React.FC = () => {
  const [curve, setCurve] = useState<BezierCurve>(PRESET_CURVES[0].curve);
  const [animationType, setAnimationType] = useState<AnimationType>('translate');
  const [selectedPreset, setSelectedPreset] = useState<string>('ease');
  const [isMobile, setIsMobile] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAutoPlay(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleCurveChange = (newCurve: BezierCurve) => {
    setCurve(newCurve);
    setSelectedPreset('custom');
  };

  const handlePresetClick = (presetName: string) => {
    const preset = PRESET_CURVES.find(p => p.name === presetName);
    if (preset) {
      setCurve(preset.curve);
      setSelectedPreset(presetName);
      setAutoPlay(false);
      setTimeout(() => setAutoPlay(true), 50);
    }
  };

  const handleAnimationTypeChange = (type: AnimationType) => {
    setAnimationType(type);
    setAutoPlay(false);
    setTimeout(() => setAutoPlay(true), 50);
  };

  const animationTypes: { type: AnimationType; label: string }[] = [
    { type: 'translate', label: '平移' },
    { type: 'scale', label: '缩放' },
    { type: 'rotate', label: '旋转' },
    { type: 'opacity', label: '透明度' }
  ];

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.title}>CSS动画时序曲线编辑器</h1>
        <p style={styles.subtitle}>可视化编辑贝塞尔曲线，实时预览动画效果</p>
      </header>

      <div style={{
        ...styles.mainContent,
        ...(isMobile ? styles.mainContentMobile : {})
      }}>
        <div style={{
          ...styles.panel,
          ...styles.leftPanel,
          ...(isMobile ? styles.panelMobile : {})
        }}>
          <CurveEditor curve={curve} onChange={handleCurveChange} />

          <div style={styles.presetsSection}>
            <h3 style={styles.sectionTitle}>预设曲线</h3>
            <div style={styles.presetsGrid}>
              {PRESET_CURVES.map((preset) => (
                <button
                  key={preset.name}
                  style={{
                    ...styles.presetCard,
                    ...(selectedPreset === preset.name ? styles.presetCardActive : {})
                  }}
                  onClick={() => handlePresetClick(preset.name)}
                >
                  <PresetIcon curve={preset.curve} active={selectedPreset === preset.name} />
                  <span style={styles.presetLabel}>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={styles.divider} />

        <div style={{
          ...styles.panel,
          ...styles.middlePanel,
          ...(isMobile ? styles.panelMobile : {})
        }}>
          <div style={styles.animationTypeSelector}>
            <h3 style={styles.sectionTitle}>动画类型</h3>
            <div style={styles.typeButtons}>
              {animationTypes.map(({ type, label }) => (
                <button
                  key={type}
                  style={{
                    ...styles.typeButton,
                    ...(animationType === type ? styles.typeButtonActive : {})
                  }}
                  onClick={() => handleAnimationTypeChange(type)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <AnimationPreview
            curve={curve}
            animationType={animationType}
            autoPlay={autoPlay}
          />
        </div>

        <div style={styles.divider} />

        <div style={{
          ...styles.panel,
          ...styles.rightPanel,
          ...(isMobile ? styles.panelMobile : {})
        }}>
          <CodeExport curve={curve} animationType={animationType} />
        </div>
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
          20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
        }
        button:hover {
          filter: brightness(1.1);
        }
        button:active {
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.3);
          transform: translateY(1px);
        }
        .preset-card:hover {
          filter: brightness(1.1);
        }
        .preset-card:active {
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
};

const PresetIcon: React.FC<{ curve: BezierCurve; active: boolean }> = ({ curve, active }) => {
  const size = 40;
  const padding = 4;
  const graphSize = size - padding * 2;

  const toCanvas = (x: number, y: number) => ({
    x: padding + x * graphSize,
    y: padding + (1 - y) * graphSize
  });

  const p0 = toCanvas(0, 0);
  const p1 = toCanvas(curve.p1x, curve.p1y);
  const p2 = toCanvas(curve.p2x, curve.p2y);
  const p3 = toCanvas(1, 1);

  const pathD = `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`;

  return (
    <svg width={size} height={size} style={styles.presetIcon}>
      <rect
        x={padding}
        y={padding}
        width={graphSize}
        height={graphSize}
        fill="none"
        stroke="#2a2a4e"
        strokeWidth="1"
      />
      <path
        d={pathD}
        fill="none"
        stroke={active ? '#764ba2' : '#667eea'}
        strokeWidth="2"
      />
    </svg>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    overflow: 'auto'
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#a0a0c0'
  },
  mainContent: {
    display: 'flex',
    alignItems: 'stretch',
    gap: 0,
    backgroundColor: '#16213e',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    overflow: 'hidden'
  },
  mainContentMobile: {
    flexDirection: 'column'
  },
  panel: {
    height: '600px',
    overflow: 'auto'
  },
  panelMobile: {
    width: '100%',
    height: 'auto',
    minHeight: '400px'
  },
  leftPanel: {
    width: '320px',
    display: 'flex',
    flexDirection: 'column'
  },
  middlePanel: {
    width: '500px',
    display: 'flex',
    flexDirection: 'column'
  },
  rightPanel: {
    width: '320px',
    display: 'flex',
    flexDirection: 'column'
  },
  divider: {
    width: '2px',
    backgroundColor: '#2a2a4e',
    flexShrink: 0
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#e0e0e0',
    marginBottom: '12px'
  },
  presetsSection: {
    padding: '0 20px 20px 20px'
  },
  presetsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px'
  },
  presetCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 8px',
    backgroundColor: '#0f0f23',
    border: '1px solid #2a2a4e',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  presetCardActive: {
    borderColor: '#667eea',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    transform: 'scale(1.05)'
  },
  presetIcon: {
    display: 'block'
  },
  presetLabel: {
    fontSize: '11px',
    color: '#a0a0c0'
  },
  animationTypeSelector: {
    padding: '20px 20px 0 20px'
  },
  typeButtons: {
    display: 'flex',
    gap: '8px'
  },
  typeButton: {
    flex: 1,
    padding: '10px 0',
    backgroundColor: '#0f0f23',
    border: '1px solid #2a2a4e',
    borderRadius: '6px',
    color: '#a0a0c0',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  typeButtonActive: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderColor: 'transparent',
    color: '#fff'
  }
};

export default App;
