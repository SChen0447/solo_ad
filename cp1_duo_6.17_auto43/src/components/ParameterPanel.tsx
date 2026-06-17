import React, { useCallback } from 'react';
import { TypographyParams } from '../utils/generateCode';

interface ParameterPanelProps {
  params: TypographyParams;
  onParamsChange: (params: TypographyParams) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const fontOptions = [
  { name: 'Roboto', value: 'Roboto' },
  { name: 'Noto Sans SC', value: 'Noto Sans SC' },
  { name: 'Playfair Display', value: 'Playfair Display' },
  { name: 'Source Code Pro', value: 'Source Code Pro' },
  { name: '系统默认', value: 'system-ui' }
];

const alignOptions = [
  { name: '左对齐', value: 'left' as const },
  { name: '居中', value: 'center' as const },
  { name: '右对齐', value: 'right' as const },
  { name: '两端', value: 'justify' as const }
];

const ParameterPanel: React.FC<ParameterPanelProps> = ({
  params,
  onParamsChange,
  collapsed,
  onToggleCollapse
}) => {
  const updateParam = useCallback((key: keyof TypographyParams, value: string | number) => {
    onParamsChange({ ...params, [key]: value });
  }, [params, onParamsChange]);

  const getSliderBackground = (value: number, min: number, max: number) => {
    const percentage = ((value - min) / (max - min)) * 100;
    return `linear-gradient(to right, #e94560 0%, #e94560 ${percentage}%, #0f3460 ${percentage}%, #0f3460 100%)`;
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
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            color: '#eaeaea',
            fontSize: '14px',
            marginBottom: '10px',
            fontWeight: 500
          }}>
            字体选择
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {fontOptions.map((font) => (
              <button
                key={font.value}
                onClick={() => updateParam('fontFamily', font.value)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: params.fontFamily === font.value ? '2px solid #e94560' : '2px solid transparent',
                  backgroundColor: '#0f3460',
                  color: '#eaeaea',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontFamily: font.value === 'system-ui' ? 'system-ui' : `'${font.value}', sans-serif`,
                  transition: 'all 0.3s ease',
                  boxShadow: params.fontFamily === font.value ? '0 2px 8px rgba(233, 69, 96, 0.3)' : 'none'
                }}
              >
                {font.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
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
              background: getSliderBackground(params.fontSize, 12, 80),
              appearance: 'none',
              outline: 'none',
              cursor: 'pointer'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ color: '#8892b0', fontSize: '11px' }}>12px</span>
            <span style={{ color: '#8892b0', fontSize: '11px' }}>80px</span>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <label style={{ color: '#eaeaea', fontSize: '14px', fontWeight: 500 }}>行高</label>
            <span style={{ color: '#e94560', fontSize: '14px', fontWeight: 600 }}>{params.lineHeight.toFixed(1)}</span>
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
              background: getSliderBackground(params.lineHeight, 1.0, 2.5),
              appearance: 'none',
              outline: 'none',
              cursor: 'pointer'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ color: '#8892b0', fontSize: '11px' }}>1.0</span>
            <span style={{ color: '#8892b0', fontSize: '11px' }}>2.5</span>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <label style={{ color: '#eaeaea', fontSize: '14px', fontWeight: 500 }}>字间距</label>
            <span style={{ color: '#e94560', fontSize: '14px', fontWeight: 600 }}>{params.letterSpacing.toFixed(2)}em</span>
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
              background: getSliderBackground(params.letterSpacing, -0.1, 0.5),
              appearance: 'none',
              outline: 'none',
              cursor: 'pointer'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ color: '#8892b0', fontSize: '11px' }}>-0.1em</span>
            <span style={{ color: '#8892b0', fontSize: '11px' }}>0.5em</span>
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

        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <label style={{ color: '#eaeaea', fontSize: '14px', fontWeight: 500 }}>容器宽度</label>
            <span style={{ color: '#e94560', fontSize: '14px', fontWeight: 600 }}>{params.containerWidth}px</span>
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
              background: getSliderBackground(params.containerWidth, 320, 1280),
              appearance: 'none',
              outline: 'none',
              cursor: 'pointer'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ color: '#8892b0', fontSize: '11px' }}>320px</span>
            <span style={{ color: '#8892b0', fontSize: '11px' }}>1280px</span>
          </div>
        </div>
      </div>

      <style>{`
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
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #16213e;
        }
        ::-webkit-scrollbar-thumb {
          background: #0f3460;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #e94560;
        }
      `}</style>
    </div>
  );
};

export default ParameterPanel;
