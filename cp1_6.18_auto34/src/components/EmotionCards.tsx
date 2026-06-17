import React from 'react';
import { useFeedbackStore } from '../stores/feedbackStore';
import { useCounter } from '../hooks/useCounter';

const glassCardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.08)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '12px',
  padding: '24px',
  backdropFilter: 'blur(10px)',
  display: 'flex',
  alignItems: 'center',
  gap: '20px',
  transition: 'all 0.3s ease-out',
};

const titleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: 'rgba(255, 255, 255, 0.6)',
  marginBottom: '8px',
  fontWeight: 500,
};

const numberStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: 700,
  fontFamily: 'monospace',
  lineHeight: 1.2,
};

function ArcProgress({
  percentage,
  color,
  size = 100,
  strokeWidth = 10,
}: {
  percentage: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  const animatedPercentage = useCounter(percentage, 500);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI;
  const offset = circumference - (animatedPercentage / 100) * circumference;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255, 255, 255, 0.1)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
      />
    </svg>
  );
}

export const EmotionCards: React.FC = () => {
  const emotionStats = useFeedbackStore((state) => state.emotionStats);

  const positiveRate = useCounter(emotionStats.positiveRate, 500);
  const negativeRate = useCounter(emotionStats.negativeRate, 500);
  const totalCount = useCounter(emotionStats.total, 500);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px',
        marginBottom: '24px',
      }}
    >
      <div style={glassCardStyle}>
        <ArcProgress percentage={emotionStats.positiveRate} color="#00d4aa" />
        <div style={{ flex: 1 }}>
          <div style={titleStyle}>正面率</div>
          <div style={{ ...numberStyle, color: '#00d4aa' }}>
            {positiveRate}%
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
            {emotionStats.positive} 条正面反馈
          </div>
        </div>
      </div>

      <div style={glassCardStyle}>
        <ArcProgress percentage={emotionStats.negativeRate} color="#ff6b35" />
        <div style={{ flex: 1 }}>
          <div style={titleStyle}>负面率</div>
          <div style={{ ...numberStyle, color: '#ff6b35' }}>
            {negativeRate}%
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
            {emotionStats.negative} 条负面反馈
          </div>
        </div>
      </div>

      <div style={{ ...glassCardStyle, justifyContent: 'center', textAlign: 'center' }}>
        <div>
          <div style={titleStyle}>总反馈数</div>
          <div
            style={{
              ...numberStyle,
              color: '#0099ff',
              fontSize: '48px',
              animation: 'slideUp 0.5s ease-out',
            }}
          >
            {totalCount}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
            {emotionStats.neutral} 条中性反馈
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
