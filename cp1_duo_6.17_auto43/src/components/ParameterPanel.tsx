import React, { useCallback, useMemo } from 'react';
import { IParams } from '../types';
import { useGoogleFonts } from '../hooks/useGoogleFonts';

interface ParameterPanelProps {
  params: IParams;
  onParamsChange: (params: IParams) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const alignOptions = [
  { name: '左对齐', value: 'left' as const },
  { name: '居中', value: 'center' as const },
  { name: '右对齐', value: 'right' as const },
  { name: '两端', value: 'justify' as const }
];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 };
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

const ParameterPanel: React.FC<ParameterPanelProps> = ({
  params,
  onParamsChange,
  collapsed,
  onToggleCollapse
}) => {
  const { fontOptions, loadingFont, loadFont, isFontLoaded } = useGoogleFonts();

  const chineseFonts = useMemo(() => fontOptions.filter(f => f.category === 'chinese'), [fontOptions]);
  const englishFonts = useMemo(() => fontOptions.filter(f => f.category === 'english'), [fontOptions]);

  const updateParam = useCallback((key: keyof IParams, value: string | number) => {
    const newParams = { ...params, [key]: value };
    onParamsChange(newParams);
  }, [params, onParamsChange]);

  const handleFontChange = useCallback((fontFamily: string) => {
    updateParam('fontFamily', fontFamily);
    loadFont(fontFamily);
  }, [updateParam, loadFont]);

  const getSliderGradient = useCallback((type: 'fontSize' | 'lineHeight' | 'letterSpacing' | 'containerWidth') => {
    let value = 0;
    let min = 0;
    let max = 1;
    let startColor = '#e94560';
    let endColor = '#e94560';

    switch (type) {
      case 'fontSize':
        value = params.fontSize;
        min = 12;
        max = 80;
        startColor = '#4ea8de';
        endColor = '#e94560';
        break;
      case 'lineHeight':
        value = params.lineHeight;
        min = 1.0;
        max = 2.5;
        startColor = '#5390d9';
        endColor = '#80ed99';
        break;
      case 'letterSpacing':
        value = params.letterSpacing;
        min = -0.1;
        max = 0.5;
        startColor = '#ff6b6b';
        endColor = '#4ecdc4';
        break;
      case 'containerWidth':
        value = params.containerWidth;
        min = 320;
        max = 1280;
        startColor = '#7209b7';
        endColor = '#f72585';
        break;
    }

    const percentage = ((value - min) / (max - min)) * 100;
    const trackColor = lerpColor(startColor, endColor, (value - min) / (max - min));

    return {
      background: `linear-gradient(to right, ${trackColor} 0%, ${trackColor} ${percentage}%, #0f3460 ${percentage}%, #0f3460 100%)`,
      thumbColor: trackColor
    };
  }, [params.fontSize, params.lineHeight, params.letterSpacing, params.containerWidth]);

  const fontSizeStyle = useMemo(() => getSliderGradient('fontSize'), [getSliderGradient]);
  const lineHeightStyle = useMemo(() => getSliderGradient('lineHeight'), [getSliderGradient]);
  const letterSpacingStyle = useMemo(() => getSliderGradient('letterSpacing'), [getSliderGradient]);
  const containerWidthStyle = useMemo(() => getSliderGradient('containerWidth'), [getSliderGradient]);

  const renderFontButton = (font: typeof fontOptions[0]) => {
    const isSelected = params.fontFamily === font.value;
    const isLoading = loadingFont === font.value;
    const loaded = isFontLoaded(font.value);

    return (
      <button
        key={font.value}
        onClick={() => handleFontChange(font.value)}
        style={{
          position: 'relative' as const,
          padding: '10px 12px',
          borderRadius: '8px',
          border: isSelected ? '2px solid #e94560' : '2px solid transparent',
          backgroundColor: '#0f3460',
          color: '#eaeaea',
          cursor: 'pointer',
          fontSize: '13px',
          fontFamily: loaded ? `'${font.value}', sans-serif` : 'system-ui, sans-serif',
          transition: 'all 0.3s ease',
          boxShadow: isSelected ? '0 2px 8px rgba(233, 69, 96, 0.3)' : 'none',
          opacity: isLoading ? 0.7 : 1,
          overflow: 'hidden'
        }}
      >
        {isLoading && (
          <span
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: '30%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
              animation: 'shimmer 1s infinite',
              pointerEvents: 'none'
            }}
          />
        )}
        <span style={{ position: 'relative', zIndex: 1 }}>{font.name}</span>
      </button>
    );
  };

  return (
    <div className="parameter-panel" style={{
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#16213e',
      height: '100%',
      overflow: 'hidden',
      transition: 'width 0.3s ease',
      width: collapsed ? '0px' : '320px',
      flexShrink: 0
    }}>
      <div style={{
        display: collapsed ? 'none' : 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid #0f3460',
        color: '#eaeaea',
        fontSize: '16px',
        fontWeight: 600
      }}>
        <span>参数控制</span>
        <button
          onClick={onToggleCollapse}
          style={{
            background: 'none',
            border: 'none',
            color: '#eaeaea',
            cursor: 'pointer',
            fontSize: '20px',
            padding: '4px 8px',
            borderRadius: '4px',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0f3460'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          ×
        </button>
      </div>

      <div style={{
        display: collapsed ? 'none' : 'block',
        overflowY: 'auto',
        padding: '20px',
        flex: 1
      }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            color: '#eaeaea',
            fontSize: '14px',
            marginBottom: '10px',
            fontWeight: 500
          }}>
            中文字体
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {chineseFonts.map(renderFontButton)}
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            color: '#eaeaea',
            fontSize: '14px',
            marginBottom: '10px',
            fontWeight: 500
          }}>
            英文字体
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {englishFonts.map(renderFontButton)}
          </div>
          {loadingFont && (
            <div style={{
              marginTop: '8px',
              fontSize: '12px',
              color: '#8892b0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                border: '2px solid #0f3460',
                borderTopColor: '#e94560',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              正在加载 {loadingFont}...
            </div>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <label style={{ color: '#eaeaea', fontSize: '14px', fontWeight: 500 }}>字号</label>
            <span style={{ color: '#e94560', fontSize: '14px', fontWeight: 600 }}>{params.fontSize}px</span>
          </div>
          <input
            type="range"
            min="12"
            max="80"
            step="1"
            value={params.fontSize}
            onChange={(e) => updateParam('fontSize', Number(e.target.value))}
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: fontSizeStyle.background,
              appearance: 'none',
              outline: 'none',
              cursor: 'pointer'
            }}
            className="slider-font-size"
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ color: '#8892b0', fontSize: '11px' }}>12px</span>
            <span style={{ color: '#8892b0', fontSize: '11px' }}>80px</span>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <label style={{ color: '#eaeaea', fontSize: '14px', fontWeight: 500 }}>行高</label>
            <span style={{ color: '#80ed99', fontSize: '14px', fontWeight: 600 }}>{params.lineHeight.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="1.0"
            max="2.5"
            step="0.1"
            value={params.lineHeight}
            onChange={(e) => updateParam('lineHeight', Number(e.target.value))}
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: lineHeightStyle.background,
              appearance: 'none',
              outline: 'none',
              cursor: 'pointer'
            }}
            className="slider-line-height"
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ color: '#8892b0', fontSize: '11px' }}>1.0</span>
            <span style={{ color: '#8892b0', fontSize: '11px' }}>2.5</span>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <label style={{ color: '#eaeaea', fontSize: '14px', fontWeight: 500 }}>字间距</label>
            <span style={{ color: '#4ecdc4', fontSize: '14px', fontWeight: 600 }}>{params.letterSpacing.toFixed(2)}em</span>
          </div>
          <input
            type="range"
            min="-0.1"
            max="0.5"
            step="0.01"
            value={params.letterSpacing}
            onChange={(e) => updateParam('letterSpacing', Number(e.target.value))}
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: letterSpacingStyle.background,
              appearance: 'none',
              outline: 'none',
              cursor: 'pointer'
            }}
            className="slider-letter-spacing"
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ color: '#8892b0', fontSize: '11px' }}>-0.1em</span>
            <span style={{ color: '#8892b0', fontSize: '11px' }}>0.5em</span>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            color: '#eaeaea',
            fontSize: '14px',
            marginBottom: '10px',
            fontWeight: 500
          }}>
            对齐方式
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {alignOptions.map((align) => (
              <button
                key={align.value}
                onClick={() => updateParam('textAlign', align.value)}
                style={{
                  padding: '8px 6px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: params.textAlign === align.value ? '#e94560' : '#0f3460',
                  color: '#eaeaea',
                  cursor: 'pointer',
                  fontSize: '12px',
                  transition: 'all 0.2s ease'
                }}
              >
                {align.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <label style={{ color: '#eaeaea', fontSize: '14px', fontWeight: 500 }}>容器宽度</label>
            <span style={{ color: '#f72585', fontSize: '14px', fontWeight: 600 }}>{params.containerWidth}px</span>
          </div>
          <input
            type="range"
            min="320"
            max="1280"
            step="1"
            value={params.containerWidth}
            onChange={(e) => updateParam('containerWidth', Number(e.target.value))}
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: containerWidthStyle.background,
              appearance: 'none',
              outline: 'none',
              cursor: 'pointer'
            }}
            className="slider-container-width"
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ color: '#8892b0', fontSize: '11px' }}>320px</span>
            <span style={{ color: '#8892b0', fontSize: '11px' }}>1280px</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #eaeaea;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          transition: transform 0.15s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #eaeaea;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }
        .parameter-panel ::-webkit-scrollbar {
          width: 6px;
        }
        .parameter-panel ::-webkit-scrollbar-track {
          background: #16213e;
        }
        .parameter-panel ::-webkit-scrollbar-thumb {
          background: #0f3460;
          border-radius: 3px;
        }
        .parameter-panel ::-webkit-scrollbar-thumb:hover {
          background: #e94560;
        }
      `}</style>
    </div>
  );
};

export default ParameterPanel;
