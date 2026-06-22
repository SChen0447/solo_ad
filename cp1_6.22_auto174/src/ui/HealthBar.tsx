import React from 'react';

interface HealthBarProps {
  currentHealth: number;
  maxHealth: number;
  comboCount: number;
  comboScale: number;
}

export const HealthBar: React.FC<HealthBarProps> = ({
  currentHealth,
  maxHealth,
  comboCount,
  comboScale
}) => {
  const healthPercent = Math.max(0, Math.min(100, (currentHealth / maxHealth) * 100));

  const getHealthGradient = (percent: number): string => {
    if (percent > 50) {
      const t = (100 - percent) / 50;
      const r = Math.round(34 + (239 - 34) * t);
      const g = Math.round(197 + (68 - 197) * t);
      const b = Math.round(94 + (68 - 94) * t);
      return `rgb(${r}, ${g}, ${b})`;
    } else if (percent > 25) {
      const t = (50 - percent) / 25;
      const r = Math.round(234 + (239 - 234) * t);
      const g = Math.round(179 + (68 - 179) * t);
      const b = Math.round(8 + (68 - 8) * t);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      return '#ef4444';
    }
  };

  const isGoldenCombo = comboCount > 10;

  return (
    <div style={styles.container}>
      <div style={styles.healthBarContainer}>
        <div style={styles.healthBarBackground}>
          <div
            style={{
              ...styles.healthBarFill,
              width: `${healthPercent}%`,
              backgroundColor: getHealthGradient(healthPercent)
            }}
          />
          <div style={styles.healthText}>
            {currentHealth} / {maxHealth}
          </div>
        </div>
      </div>

      <div
        style={{
          ...styles.comboContainer,
          transform: `scale(${comboScale})`,
          transition: 'transform 0.1s ease-out'
        }}
      >
        <div
          style={{
            ...styles.comboCounter,
            color: isGoldenCombo ? '#ffd700' : '#ffffff',
            textShadow: isGoldenCombo ? '0 0 10px rgba(255, 215, 0, 0.8)' : 'none'
          }}
        >
          {comboCount > 0 ? `${comboCount} COMBO` : ''}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    pointerEvents: 'none',
    zIndex: 10
  },
  healthBarContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  healthBarBackground: {
    width: 200,
    height: 20,
    backgroundColor: '#333333',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
  },
  healthBarFill: {
    height: '100%',
    transition: 'width 0.2s ease-out, background-color 0.2s ease-out',
    borderRadius: 4
  },
  healthText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontFamily: 'monospace',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#ffffff',
    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
  },
  comboContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  comboCounter: {
    fontFamily: 'monospace',
    fontSize: '24px',
    fontWeight: 'bold',
    transition: 'color 0.2s ease-out'
  }
};
