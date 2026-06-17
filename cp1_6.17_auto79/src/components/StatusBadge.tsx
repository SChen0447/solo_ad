import React from 'react';

interface StatusBadgeProps {
  status: 'normal' | 'warning' | 'fault';
  size?: number;
  showLabel?: boolean;
}

const statusConfig = {
  normal: { color: '#4caf50', label: '正常', glowColor: 'rgba(76, 175, 80, 0.6)' },
  warning: { color: '#ff9800', label: '警告', glowColor: 'rgba(255, 152, 0, 0.6)' },
  fault: { color: '#f44336', label: '故障', glowColor: 'rgba(244, 67, 54, 0.6)' },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 12, showLabel = true }) => {
  const config = statusConfig[status];
  const isWarning = status === 'warning';
  const isFault = status === 'fault';

  const keyframesStyle = `
    @keyframes pulse-normal {
      0%, 100% { box-shadow: 0 0 ${size}px ${config.glowColor}; }
      50% { box-shadow: 0 0 ${size * 2}px ${config.glowColor}; }
    }
    @keyframes pulse-warning {
      0%, 100% { opacity: 1; box-shadow: 0 0 ${size}px ${config.glowColor}; }
      50% { opacity: 0.4; box-shadow: 0 0 ${size * 0.5}px ${config.glowColor}; }
    }
    @keyframes pulse-fault {
      0%, 100% { opacity: 1; box-shadow: 0 0 ${size * 1.5}px ${config.glowColor}; }
      50% { opacity: 0.2; box-shadow: 0 0 ${size * 0.3}px ${config.glowColor}; }
    }
  `;

  const animationName = isFault ? 'pulse-fault' : isWarning ? 'pulse-warning' : 'pulse-normal';
  const animationDuration = isFault ? '0.5s' : isWarning ? '1.5s' : '2s';

  return (
    <>
      <style>{keyframesStyle}</style>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: `radial-gradient(circle at 30% 30%, ${config.color}, ${config.color}cc, ${config.color}88)`,
            display: 'inline-block',
            animation: `${animationName} ${animationDuration} ease-in-out infinite`,
          }}
        />
        {showLabel && (
          <span style={{ color: config.color, fontSize: 12, fontWeight: 500 }}>{config.label}</span>
        )}
      </span>
    </>
  );
};

export default StatusBadge;
