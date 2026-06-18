import React, { useState, useEffect, useCallback } from 'react';
import { useStore, COLOR_SCHEMES } from '../store/useStore';
import { generateNebulaData } from '../nebula/NebulaSystem';

const sliderStyles = (accentColor: string): React.CSSProperties => ({
  width: '100%',
  appearance: 'none' as any,
  height: '4px',
  borderRadius: '2px',
  background: `linear-gradient(90deg, ${accentColor}44, ${accentColor})`,
  outline: 'none',
  cursor: 'pointer',
});

const sliderThumbCSS = (accentColor: string) => `
  .nebula-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: ${accentColor};
    cursor: pointer;
    box-shadow: 0 0 8px ${accentColor}88;
    border: 2px solid rgba(255,255,255,0.3);
  }
  .nebula-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: ${accentColor};
    cursor: pointer;
    box-shadow: 0 0 8px ${accentColor}88;
    border: 2px solid rgba(255,255,255,0.3);
  }
`;

function getAccentColor(colorScheme: number): string {
  const scheme = COLOR_SCHEMES[colorScheme];
  const c = scheme.colors[0];
  const r = Math.round(c[0] * 255);
  const g = Math.round(c[1] * 255);
  const b = Math.round(c[2] * 255);
  return `rgb(${r},${g},${b})`;
}

export const ControlPanel: React.FC = () => {
  const parameters = useStore((s) => s.parameters);
  const setParameter = useStore((s) => s.setParameter);
  const setParticleData = useStore((s) => s.setParticleData);
  const setGenerating = useStore((s) => s.setGenerating);
  const setGenerated = useStore((s) => s.setGenerated);
  const fps = useStore((s) => s.fps);
  const activeParticleCount = useStore((s) => s.activeParticleCount);
  const adaptiveEnabled = useStore((s) => s.adaptiveEnabled);
  const setAdaptiveEnabled = useStore((s) => s.setAdaptiveEnabled);
  const autoCruise = useStore((s) => s.autoCruise);
  const setAutoCruise = useStore((s) => s.setAutoCruise);
  const isGenerating = useStore((s) => s.isGenerating);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const accent = getAccentColor(parameters.colorScheme);

  const handleGenerate = useCallback(() => {
    setGenerating(true);
    requestAnimationFrame(() => {
      const data = generateNebulaData(parameters);
      setParticleData(data);
      setGenerating(false);
      setGenerated(true);
    });
  }, [parameters, setParticleData, setGenerating, setGenerated]);

  const handleColorScheme = useCallback(
    (idx: number) => {
      setParameter('colorScheme', idx);
    },
    [setParameter]
  );

  const panelContent = (
    <>
      <style>{sliderThumbCSS(accent)}</style>

      <div
        style={{
          fontFamily: "'Segoe UI', 'Helvetica Neue', sans-serif",
          color: '#ccc',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          height: '100%',
          overflowY: 'auto',
        }}
      >
        <h1
          style={{
            fontSize: '22px',
            fontWeight: 200,
            letterSpacing: '6px',
            color: '#e0e0e0',
            textAlign: 'center',
            margin: '0 0 4px 0',
            textTransform: 'uppercase',
          }}
        >
          星云工坊
        </h1>
        <div
          style={{
            width: '60%',
            margin: '0 auto 8px',
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${accent}88, transparent)`,
          }}
        />

        <div>
          <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '6px' }}>
            星云密度: {parameters.density}
          </label>
          <input
            type="range"
            className="nebula-slider"
            min={500}
            max={5000}
            step={100}
            value={parameters.density}
            onChange={(e) => setParameter('density', Number(e.target.value))}
            style={sliderStyles(accent)}
          />
        </div>

        <div>
          <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '8px' }}>
            颜色方案
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {COLOR_SCHEMES.map((scheme, idx) => {
              const c = scheme.colors[0];
              const colorStr = `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;
              const c2 = scheme.colors[scheme.colors.length - 1];
              const colorStr2 = `rgb(${Math.round(c2[0] * 255)},${Math.round(c2[1] * 255)},${Math.round(c2[2] * 255)})`;
              return (
                <button
                  key={idx}
                  onClick={() => handleColorScheme(idx)}
                  style={{
                    width: '40px',
                    height: '28px',
                    borderRadius: '4px',
                    border: parameters.colorScheme === idx ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                    background: `linear-gradient(135deg, ${colorStr}, ${colorStr2})`,
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  title={scheme.name}
                />
              );
            })}
          </div>
        </div>

        <div>
          <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '6px' }}>
            旋转速度: {parameters.rotationSpeed.toFixed(1)}°/s
          </label>
          <input
            type="range"
            className="nebula-slider"
            min={0}
            max={2}
            step={0.1}
            value={parameters.rotationSpeed}
            onChange={(e) => setParameter('rotationSpeed', Number(e.target.value))}
            style={sliderStyles(accent)}
          />
        </div>

        <div>
          <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '6px' }}>
            粒子大小: {parameters.particleSize}
          </label>
          <input
            type="range"
            className="nebula-slider"
            min={1}
            max={10}
            step={0.5}
            value={parameters.particleSize}
            onChange={(e) => setParameter('particleSize', Number(e.target.value))}
            style={sliderStyles(accent)}
          />
        </div>

        <div>
          <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '6px' }}>
            扩散程度: {parameters.spread.toFixed(1)}x
          </label>
          <input
            type="range"
            className="nebula-slider"
            min={0.5}
            max={2.0}
            step={0.1}
            value={parameters.spread}
            onChange={(e) => setParameter('spread', Number(e.target.value))}
            style={sliderStyles(accent)}
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          style={{
            width: '100%',
            padding: '12px',
            border: 'none',
            borderRadius: '6px',
            background: `linear-gradient(135deg, ${accent}cc, ${accent}88)`,
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            letterSpacing: '4px',
            cursor: isGenerating ? 'wait' : 'pointer',
            position: 'relative',
            overflow: 'hidden',
            transition: 'filter 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(0.8)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)';
          }}
        >
          {isGenerating ? '生成中...' : '生成星云'}
          <span
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '100%',
              height: '100%',
              transform: 'translate(-50%, -50%)',
              borderRadius: '6px',
              background: `${accent}33`,
              animation: 'pulse-glow 2s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />
        </button>

        <button
          onClick={() => setAutoCruise(!autoCruise)}
          style={{
            width: '100%',
            padding: '10px',
            border: `1px solid ${accent}66`,
            borderRadius: '6px',
            background: autoCruise ? `${accent}33` : 'transparent',
            color: '#ccc',
            fontSize: '13px',
            letterSpacing: '2px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {autoCruise ? '停止漫游' : '自动漫游'}
        </button>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            color: '#888',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: '12px',
          }}
        >
          <span>FPS: <span style={{ color: fps >= 30 ? '#8f8' : '#f88' }}>{fps}</span></span>
          <span>粒子: {activeParticleCount}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: '#999', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="checkbox"
              checked={adaptiveEnabled}
              onChange={(e) => setAdaptiveEnabled(e.target.checked)}
              style={{ accentColor: accent }}
            />
            性能自适应
          </label>
        </div>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        <style>{`
          @keyframes pulse-glow {
            0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
            50% { transform: translate(-50%, -50%) scale(1.05); opacity: 0.6; }
          }
        `}</style>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            position: 'fixed',
            top: '12px',
            right: '12px',
            zIndex: 1001,
            background: 'rgba(30,30,40,0.9)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '6px',
            color: '#ccc',
            padding: '8px 12px',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            fontSize: '14px',
          }}
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
        <div
          style={{
            position: 'fixed',
            bottom: mobileOpen ? 0 : '-100%',
            left: 0,
            right: 0,
            height: 'auto',
            maxHeight: '70vh',
            background: 'rgba(30,30,40,0.95)',
            backdropFilter: 'blur(8px)',
            borderTop: '1px solid rgba(255,255,255,0.2)',
            transition: 'bottom 0.3s ease',
            zIndex: 1000,
            overflowY: 'auto',
            borderRadius: '16px 16px 0 0',
          }}
        >
          {panelContent}
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
          50% { transform: translate(-50%, -50%) scale(1.05); opacity: 0.6; }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '300px',
          height: '100%',
          background: 'rgba(30,30,40,0.9)',
          backdropFilter: 'blur(8px)',
          borderLeft: '1px solid rgba(255,255,255,0.2)',
          zIndex: 100,
          overflowY: 'auto',
        }}
      >
        {panelContent}
      </div>
    </>
  );
};
