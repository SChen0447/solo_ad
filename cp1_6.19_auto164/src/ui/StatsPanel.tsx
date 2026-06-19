import React from 'react';

interface StatsPanelProps {
  particleCount: number;
  averageHeight: number;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ particleCount, averageHeight }) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        background: 'rgba(20, 30, 45, 0.75)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(74, 144, 217, 0.25)',
        borderRadius: '12px',
        padding: '16px 20px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
        zIndex: 50,
        minWidth: '160px',
      }}
    >
      <div
        style={{
          color: '#8FA8C0',
          fontSize: '12px',
          marginBottom: '6px',
        }}
      >
        颗粒总数
      </div>
      <div
        style={{
          color: '#E8F0FA',
          fontSize: '28px',
          fontWeight: 'bold',
          fontFamily: 'monospace',
          marginBottom: '12px',
        }}
      >
        {particleCount}
      </div>
      <div
        style={{
          color: '#8FA8C0',
          fontSize: '12px',
          marginBottom: '6px',
        }}
      >
        平均堆积高度
      </div>
      <div
        style={{
          color: '#6AB0FF',
          fontSize: '24px',
          fontWeight: 'bold',
          fontFamily: 'monospace',
        }}
      >
        {averageHeight.toFixed(2)} <span style={{ fontSize: '14px', color: '#8FA8C0' }}>单位</span>
      </div>
    </div>
  );
};

export default StatsPanel;
