import React, { useCallback } from 'react';
import { useCaveStore } from '../stores/caveStore';

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  left: 0,
  top: 0,
  bottom: 0,
  width: '280px',
  background: 'rgba(26,26,46,0.85)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderRadius: '0 10px 10px 0',
  border: '1px solid #4a4a6a',
  borderLeft: 'none',
  padding: '24px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  zIndex: 100,
  transition: 'all 0.2s ease',
  overflowY: 'auto',
  color: '#c8c8e0',
  fontFamily: "'Segoe UI', system-ui, sans-serif",
};

const collapsedPanelStyle: React.CSSProperties = {
  ...panelStyle,
  width: '56px',
  padding: '16px 8px',
  alignItems: 'center',
};

const sliderContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#9898b8',
  letterSpacing: '0.5px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '4px',
  WebkitAppearance: 'none',
  appearance: 'none',
  background: '#3d3d5c',
  borderRadius: '2px',
  outline: 'none',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  background: 'linear-gradient(135deg, #3355aa, #2244aa)',
  color: '#e0e8ff',
  border: '1px solid #4466cc',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  letterSpacing: '1px',
  transition: 'all 0.2s ease',
};

const titleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 700,
  color: '#8888cc',
  letterSpacing: '1px',
  borderBottom: '1px solid #4a4a6a',
  paddingBottom: '12px',
  marginBottom: '4px',
};

const iconButtonStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(51,85,170,0.3)',
  border: '1px solid #4466cc',
  borderRadius: '8px',
  color: '#8899cc',
  cursor: 'pointer',
  fontSize: '18px',
  transition: 'all 0.2s ease',
};

const hintStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#6a6a8a',
  lineHeight: '1.6',
  marginTop: '4px',
  padding: '8px',
  background: 'rgba(61,61,92,0.3)',
  borderRadius: '6px',
};

export default function ControlPanel() {
  const complexity = useCaveStore((s) => s.complexity);
  const branchDensity = useCaveStore((s) => s.branchDensity);
  const stalactiteDensity = useCaveStore((s) => s.stalactiteDensity);
  const isGenerating = useCaveStore((s) => s.isGenerating);
  const generationProgress = useCaveStore((s) => s.generationProgress);
  const panelCollapsed = useCaveStore((s) => s.panelCollapsed);
  const setComplexity = useCaveStore((s) => s.setComplexity);
  const setBranchDensity = useCaveStore((s) => s.setBranchDensity);
  const setStalactiteDensity = useCaveStore((s) => s.setStalactiteDensity);
  const generateCave = useCaveStore((s) => s.generateCave);
  const setPanelCollapsed = useCaveStore((s) => s.setPanelCollapsed);

  const handleGenerate = useCallback(() => {
    if (!isGenerating) {
      generateCave();
    }
  }, [isGenerating, generateCave]);

  const currentStyle = panelCollapsed ? collapsedPanelStyle : panelStyle;

  return (
    <div style={currentStyle}>
      {panelCollapsed ? (
        <>
          <button
            style={iconButtonStyle}
            onClick={() => setPanelCollapsed(false)}
            title="展开面板"
          >
            ▶
          </button>
          <button
            style={iconButtonStyle}
            onClick={handleGenerate}
            title="生成洞穴"
            disabled={isGenerating}
          >
            ⛏
          </button>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={titleStyle}>洞穴参数</span>
            <button
              style={{ ...iconButtonStyle, width: '28px', height: '28px', fontSize: '14px' }}
              onClick={() => setPanelCollapsed(true)}
              title="折叠面板"
            >
              ◀
            </button>
          </div>

          <div style={sliderContainerStyle}>
            <div style={labelStyle}>
              <span>洞穴复杂度</span>
              <span style={{ color: '#6688cc', fontWeight: 600 }}>{complexity}</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={complexity}
              onChange={(e) => setComplexity(Number(e.target.value))}
              style={sliderStyle}
            />
          </div>

          <div style={sliderContainerStyle}>
            <div style={labelStyle}>
              <span>分支密度</span>
              <span style={{ color: '#6688cc', fontWeight: 600 }}>{branchDensity}</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={branchDensity}
              onChange={(e) => setBranchDensity(Number(e.target.value))}
              style={sliderStyle}
            />
          </div>

          <div style={sliderContainerStyle}>
            <div style={labelStyle}>
              <span>钟乳石密度</span>
              <span style={{ color: '#6688cc', fontWeight: 600 }}>{stalactiteDensity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={stalactiteDensity}
              onChange={(e) => setStalactiteDensity(Number(e.target.value))}
              style={sliderStyle}
            />
          </div>

          <button
            style={{
              ...buttonStyle,
              opacity: isGenerating ? 0.6 : 1,
              cursor: isGenerating ? 'wait' : 'pointer',
            }}
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? `生成中... ${Math.round(generationProgress * 100)}%` : '⛏ 生成洞穴网络'}
          </button>

          {isGenerating && (
            <div
              style={{
                height: '4px',
                background: '#3d3d5c',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${generationProgress * 100}%`,
                  background: 'linear-gradient(90deg, #3355aa, #5588ff)',
                  borderRadius: '2px',
                  transition: 'width 0.1s ease',
                }}
              />
            </div>
          )}

          <div style={hintStyle}>
            <div>🎮 WASD - 前后左右移动</div>
            <div>🖱 拖拽 - 旋转视角</div>
            <div>🔵 点击光点 - 飞行至节点</div>
            <div>⇧ Shift+拖拽 - 绘制截面线</div>
          </div>
        </>
      )}
    </div>
  );
}
