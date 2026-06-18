import React, { useState, useEffect, useCallback } from 'react';
import type { DistributionType, DistributionParams } from './DistributionEngine';
import { distributionNames, getDefaultParams, isDiscreteDistribution } from './DistributionEngine';

interface SliderConfig {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  format?: (value: number) => string;
}

const distributionSliderConfigs: Record<DistributionType, SliderConfig[]> = {
  normal: [
    { key: 'mean', label: '均值 μ', min: -3, max: 3, step: 0.1, default: 0 },
    { key: 'std', label: '标准差 σ', min: 0.3, max: 3, step: 0.1, default: 1 }
  ],
  uniform: [
    { key: 'a', label: '下限 a', min: -4, max: 0, step: 0.1, default: -2 },
    { key: 'b', label: '上限 b', min: 0, max: 4, step: 0.1, default: 2 }
  ],
  exponential: [
    { key: 'lambda', label: 'λ', min: 0.5, max: 5, step: 0.1, default: 1, format: (v) => v.toFixed(1) }
  ],
  poisson: [
    { key: 'mu', label: 'μ', min: 1, max: 15, step: 1, default: 5 }
  ],
  binomial: [
    { key: 'n', label: 'n', min: 5, max: 30, step: 1, default: 10 },
    { key: 'p', label: 'p', min: 0.05, max: 0.95, step: 0.05, default: 0.5, format: (v) => v.toFixed(2) }
  ]
};

interface ControlPanelProps {
  primaryType: DistributionType;
  primaryParams: DistributionParams[DistributionType];
  secondaryType: DistributionType;
  secondaryParams: DistributionParams[DistributionType];
  comparisonMode: boolean;
  onPrimaryTypeChange: (type: DistributionType) => void;
  onPrimaryParamsChange: (params: DistributionParams[DistributionType]) => void;
  onSecondaryTypeChange: (type: DistributionType) => void;
  onSecondaryParamsChange: (params: DistributionParams[DistributionType]) => void;
  onComparisonModeChange: (enabled: boolean) => void;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}

const Slider: React.FC<SliderProps> = ({ label, value, min, max, step, onChange, formatValue }) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '6px'
      }}>
        <span style={{
          color: '#e6edf3',
          fontSize: '13px',
          fontWeight: 400
        }}>
          {label}
        </span>
        <span style={{
          color: '#e6edf3',
          fontSize: '13px',
          fontWeight: 500,
          fontFamily: 'monospace',
          backgroundColor: 'rgba(255,255,255,0.08)',
          padding: '2px 8px',
          borderRadius: '4px'
        }}>
          {formatValue ? formatValue(value) : value}
        </span>
      </div>
      <div style={{ position: 'relative', height: '20px' }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            width: '100%',
            height: '4px',
            borderRadius: '2px',
            background: `linear-gradient(to right, #58a6ff 0%, #58a6ff ${percentage}%, #30363d ${percentage}%, #30363d 100%)`,
            appearance: 'none',
            WebkitAppearance: 'none',
            outline: 'none',
            cursor: 'pointer',
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)'
          }}
        />
        <style>{`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #58a6ff;
            cursor: pointer;
            box-shadow: 0 0 8px rgba(88, 166, 255, 0.5);
            border: 2px solid #fff;
            transition: transform 0.1s;
          }
          input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.15);
          }
          input[type="range"]::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #58a6ff;
            cursor: pointer;
            box-shadow: 0 0 8px rgba(88, 166, 255, 0.5);
            border: 2px solid #fff;
          }
        `}</style>
      </div>
    </div>
  );
};

interface DistributionControlsProps {
  title: string;
  color: string;
  distributionType: DistributionType;
  params: DistributionParams[DistributionType];
  onTypeChange: (type: DistributionType) => void;
  onParamsChange: (params: DistributionParams[DistributionType]) => void;
  compact?: boolean;
}

const DistributionControls: React.FC<DistributionControlsProps> = ({
  title,
  color,
  distributionType,
  params,
  onTypeChange,
  onParamsChange,
  compact = false
}) => {
  const sliders = distributionSliderConfigs[distributionType];

  const handleSliderChange = (key: string, value: number) => {
    onParamsChange({
      ...params,
      [key]: value
    } as DistributionParams[DistributionType]);
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: compact ? '6px 10px' : '8px 12px',
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: '#e6edf3',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '6px',
    fontSize: compact ? '12px' : '13px',
    cursor: 'pointer',
    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23e6edf3' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    paddingRight: '32px'
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: compact ? '8px' : '12px'
      }}>
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: color,
          boxShadow: `0 0 8px ${color}80`
        }} />
        <span style={{
          color: '#e6edf3',
          fontSize: compact ? '12px' : '14px',
          fontWeight: 600
        }}>
          {title}
        </span>
      </div>

      <select
        value={distributionType}
        onChange={(e) => onTypeChange(e.target.value as DistributionType)}
        style={selectStyle}
      >
        {Object.entries(distributionNames).map(([key, name]) => (
          <option key={key} value={key} style={{ backgroundColor: '#161b22' }}>
            {name}
          </option>
        ))}
      </select>

      <div style={{
        marginTop: compact ? '10px' : '14px',
        maxHeight: compact ? 'none' : 'none',
        overflow: 'hidden',
        transition: 'all 0.3s ease-in-out'
      }}>
        {sliders.map((slider) => (
          <Slider
            key={slider.key}
            label={slider.label}
            value={(params as Record<string, number>)[slider.key]}
            min={slider.min}
            max={slider.max}
            step={slider.step}
            onChange={(value) => handleSliderChange(slider.key, value)}
            formatValue={slider.format}
          />
        ))}
      </div>

      <div style={{
        marginTop: '8px',
        padding: '6px 10px',
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: '6px',
        fontSize: '11px',
        color: '#8b949e',
        fontStyle: 'italic'
      }}>
        {isDiscreteDistribution(distributionType) ? '离散分布 · 柱状图' : '连续分布 · 曲面图'}
      </div>
    </div>
  );
};

const ControlPanel: React.FC<ControlPanelProps> = ({
  primaryType,
  primaryParams,
  secondaryType,
  secondaryParams,
  comparisonMode,
  onPrimaryTypeChange,
  onPrimaryParamsChange,
  onSecondaryTypeChange,
  onSecondaryParamsChange,
  onComparisonModeChange
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handlePrimaryTypeChange = useCallback((type: DistributionType) => {
    onPrimaryTypeChange(type);
    onPrimaryParamsChange(getDefaultParams(type));
  }, [onPrimaryTypeChange, onPrimaryParamsChange]);

  const handleSecondaryTypeChange = useCallback((type: DistributionType) => {
    onSecondaryTypeChange(type);
    onSecondaryParamsChange(getDefaultParams(type));
  }, [onSecondaryTypeChange, onSecondaryParamsChange]);

  if (isMobile) {
    return (
      <>
        {mobileExpanded && (
          <div
            onClick={() => setMobileExpanded(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 99
            }}
          />
        )}
        <div style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: mobileExpanded ? 0 : 'auto',
          top: mobileExpanded ? 'auto' : 0,
          height: mobileExpanded ? 'auto' : '60px',
          maxHeight: mobileExpanded ? '70vh' : '60px',
          backgroundColor: 'rgba(13, 17, 23, 0.9)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderTop: mobileExpanded ? 'none' : '1px solid rgba(255,255,255,0.15)',
          borderRadius: mobileExpanded ? '16px 16px 0 0' : 0,
          zIndex: 100,
          overflow: 'hidden',
          transition: 'all 0.3s ease-in-out',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div
            onClick={() => setMobileExpanded(!mobileExpanded)}
            style={{
              height: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <div style={{
              width: '40px',
              height: '4px',
              backgroundColor: 'rgba(255,255,255,0.3)',
              borderRadius: '2px'
            }} />
          </div>
          {mobileExpanded && (
            <div style={{
              padding: '0 20px 20px 20px',
              overflowY: 'auto',
              flex: 1
            }}>
              <DistributionControls
                title="分布 1"
                color="#2196f3"
                distributionType={primaryType}
                params={primaryParams}
                onTypeChange={handlePrimaryTypeChange}
                onParamsChange={onPrimaryParamsChange}
              />

              <div style={{
                margin: '20px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px'
              }}>
                <span style={{ color: '#e6edf3', fontSize: '13px' }}>叠加对比</span>
                <button
                  onClick={() => onComparisonModeChange(!comparisonMode)}
                  style={{
                    width: '48px',
                    height: '26px',
                    borderRadius: '13px',
                    backgroundColor: comparisonMode ? '#00bcd4' : '#30363d',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background-color 0.3s',
                    outline: 'none'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '3px',
                    left: comparisonMode ? '25px' : '3px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#fff',
                    transition: 'left 0.3s ease-in-out',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </button>
              </div>

              {comparisonMode && (
                <div style={{
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <DistributionControls
                    title="分布 2"
                    color="#ff9800"
                    distributionType={secondaryType}
                    params={secondaryParams}
                    onTypeChange={handleSecondaryTypeChange}
                    onParamsChange={onSecondaryParamsChange}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '20px',
      width: '240px',
      padding: '18px',
      backgroundColor: 'rgba(22, 27, 34, 0.75)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.2)',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      zIndex: 100,
      maxHeight: 'calc(100vh - 40px)',
      overflowY: 'auto',
      transition: 'all 0.3s ease-in-out'
    }}>
      <div style={{
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h2 style={{
          color: '#e6edf3',
          fontSize: '15px',
          fontWeight: 600,
          marginBottom: '4px'
        }}>
          分布参数控制
        </h2>
        <p style={{
          color: '#8b949e',
          fontSize: '11px',
          margin: 0
        }}>
          调整参数实时查看变化
        </p>
      </div>

      <div style={{
        transition: 'all 0.3s ease-in-out',
        overflow: 'hidden',
        maxHeight: comparisonMode ? 'none' : 'none'
      }}>
        <DistributionControls
          title="分布 1"
          color="#2196f3"
          distributionType={primaryType}
          params={primaryParams}
          onTypeChange={handlePrimaryTypeChange}
          onParamsChange={onPrimaryParamsChange}
          compact={comparisonMode}
        />
      </div>

      {comparisonMode && (
        <div style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          animation: 'slideDown 0.3s ease-in-out'
        }}>
          <DistributionControls
            title="分布 2"
            color="#ff9800"
            distributionType={secondaryType}
            params={secondaryParams}
            onTypeChange={handleSecondaryTypeChange}
            onParamsChange={onSecondaryParamsChange}
            compact={true}
          />
        </div>
      )}

      <div style={{
        marginTop: '20px',
        paddingTop: '14px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{
          color: '#e6edf3',
          fontSize: '12px',
          fontWeight: 500
        }}>
          叠加对比
        </span>
        <button
          onClick={() => onComparisonModeChange(!comparisonMode)}
          style={{
            width: '44px',
            height: '24px',
            borderRadius: '12px',
            backgroundColor: comparisonMode ? '#00bcd4' : '#30363d',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background-color 0.3s',
            outline: 'none'
          }}
        >
          <div style={{
            position: 'absolute',
            top: '2px',
            left: comparisonMode ? '22px' : '2px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: '#fff',
            transition: 'left 0.3s ease-in-out',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }} />
        </button>
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.3);
        }
      `}</style>
    </div>
  );
};

export default ControlPanel;
