import React from 'react'
import { useStarStore } from '../store'

export const PerformanceWarning: React.FC = () => {
  const performanceLow = useStarStore((state) => state.performanceLow)
  const fps = useStarStore((state) => state.fps)

  if (!performanceLow) return null

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(231, 76, 60, 0.15)',
        border: '1px solid rgba(231, 76, 60, 0.3)',
        borderRadius: '8px',
        padding: '12px 20px',
        color: '#e74c3c',
        fontSize: '0.9rem',
        animation: 'fadeIn 0.5s ease-in-out',
        zIndex: 1000,
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      <span style={{ fontSize: '1.2rem' }}>⚠</span>
      <div>
        <div style={{ fontWeight: 600, marginBottom: '2px' }}>性能较低</div>
        <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
          当前帧率: {fps.toFixed(0)} FPS，建议降低星星数量或轨迹长度
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
