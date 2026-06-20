import React, { useState, useCallback } from 'react';
import { ForceParams, clamp } from '../utils/vectorField';

interface ForceControllerProps {
  forces: ForceParams;
  onChange: (forces: ForceParams) => void;
  isMobile?: boolean;
}

const ForceController: React.FC<ForceControllerProps> = ({ forces, onChange, isMobile }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSliderChange = useCallback((axis: keyof ForceParams, value: number) => {
    onChange({ ...forces, [axis]: clamp(value, -2, 2) });
  }, [forces, onChange]);

  const handleInputChange = useCallback((axis: keyof ForceParams, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      onChange({ ...forces, [axis]: clamp(num, -2, 2) });
    }
  }, [forces, onChange]);

  const SliderControl = ({ label, axis, value }: { label: string; axis: keyof ForceParams; value: number }) => (
    <div style={styles.sliderGroup}>
      <div style={styles.sliderLabelRow}>
        <span style={styles.sliderLabel}>{label}</span>
        <span style={styles.sliderValue}>{value.toFixed(2)}</span>
      </div>
      <div style={styles.sliderTrack}>
        <div
          style={{
            ...styles.sliderFill,
            height: `${((value + 2) / 4) * 100}%`
          }}
        />
        <input
          type="range"
          min="-2"
          max="2"
          step="0.01"
          value={value}
          onChange={(e) => handleSliderChange(axis, parseFloat(e.target.value))}
          style={styles.sliderInput}
        />
        <div
          style={{
            ...styles.sliderThumb,
            bottom: `calc(${((value + 2) / 4) * 100}% - 10px)`
          }}
        />
      </div>
      <input
        type="number"
        min="-2"
        max="2"
        step="0.01"
        value={value.toFixed(2)}
        onChange={(e) => handleInputChange(axis, e.target.value)}
        style={styles.numberInput}
      />
    </div>
  );

  const panelContent = (
    <div style={styles.panelContent}>
      <h3 style={styles.panelTitle}>向量场控制</h3>
      <div style={styles.slidersContainer}>
        <SliderControl label="X 轴" axis="x" value={forces.x} />
        <SliderControl label="Y 轴" axis="y" value={forces.y} />
        <SliderControl label="Z 轴" axis="z" value={forces.z} />
        <SliderControl label="扰动" axis="turbulence" value={forces.turbulence} />
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            ...styles.mobileToggle,
            ...(isExpanded ? styles.mobileToggleActive : {})
          }}
        >
          {isExpanded ? '收起控制面板' : '展开力场控制'}
        </button>
        <div
          style={{
            ...styles.mobilePanel,
            transform: isExpanded ? 'translateY(0)' : 'translateY(100%)',
            opacity: isExpanded ? 1 : 0
          }}
        >
          {panelContent}
        </div>
      </>
    );
  }

  return <div style={styles.desktopPanel}>{panelContent}</div>;
};

const styles: { [key: string]: React.CSSProperties } = {
  desktopPanel: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 280,
    background: 'rgba(26, 26, 46, 0.85)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    borderRadius: 12,
    padding: 20,
    border: '1px solid rgba(124, 58, 237, 0.3)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    zIndex: 100,
    transition: 'transform 0.2s ease'
  },
  mobilePanel: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    background: 'rgba(15, 15, 35, 0.95)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    borderTop: '1px solid rgba(124, 58, 237, 0.3)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    zIndex: 100,
    transition: 'transform 0.3s ease, opacity 0.3s ease'
  },
  mobileToggle: {
    position: 'fixed',
    bottom: 20,
    right: 20,
    padding: '10px 20px',
    background: 'rgba(124, 58, 237, 0.9)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
    zIndex: 101,
    transition: 'all 0.2s ease'
  },
  mobileToggleActive: {
    bottom: 320
  },
  panelContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  panelTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
    margin: 0,
    textAlign: 'center',
    marginBottom: 8
  },
  slidersContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10
  },
  sliderGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  sliderLabelRow: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2
  },
  sliderLabel: {
    color: '#a0a0c0',
    fontSize: 12,
    fontWeight: 500
  },
  sliderValue: {
    color: '#7c3aed',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: 600
  },
  sliderTrack: {
    position: 'relative',
    width: 6,
    height: 200,
    background: '#2a2a3e',
    borderRadius: 3,
    cursor: 'pointer'
  },
  sliderFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(to top, #7c3aed, #a78bfa)',
    borderRadius: 3,
    transition: 'height 0.05s ease'
  },
  sliderThumb: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 20,
    height: 20,
    background: '#7c3aed',
    borderRadius: '50%',
    boxShadow: '0 2px 8px rgba(124, 58, 237, 0.5)',
    transition: 'bottom 0.05s ease, background 0.15s ease',
    pointerEvents: 'none',
    zIndex: 2
  },
  sliderInput: {
    position: 'absolute',
    top: 0,
    left: -10,
    right: -10,
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
    writingMode: 'vertical-lr',
    direction: 'rtl',
    appearance: 'none',
    WebkitAppearance: 'none',
    width: 'auto',
    margin: 0
  },
  numberInput: {
    width: '100%',
    padding: '6px 8px',
    background: 'rgba(42, 42, 62, 0.8)',
    border: '1px solid rgba(124, 58, 237, 0.3)',
    borderRadius: 6,
    color: '#fff',
    fontSize: 12,
    fontFamily: 'monospace',
    textAlign: 'center',
    outline: 'none',
    transition: 'border-color 0.2s ease'
  }
};

export default ForceController;
