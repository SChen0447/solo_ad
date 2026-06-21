import React from 'react';
import type { VoteResult } from '../../shared/types';

const COLORS = [
  '#e53e3e',
  '#ed8936',
  '#38a169',
  '#3182ce',
  '#805ad5',
  '#319795',
  '#d53f8c',
  '#d69e2e',
];

interface Props {
  data: VoteResult[];
  showWeightedScore?: boolean;
}

const ChartBar: React.FC<Props> = ({ data, showWeightedScore = false }) => {
  const maxValue = Math.max(
    1,
    ...data.map((d) => (showWeightedScore ? d.weightedScore || 0 : d.count))
  );

  return (
    <div className="chart-bar-container" style={{ width: '100%' }}>
      {data.map((item, index) => {
        const value = showWeightedScore ? item.weightedScore || 0 : item.count;
        const width = (value / maxValue) * 100;
        const color = COLORS[index % COLORS.length];
        return (
          <div
            key={item.optionIndex}
            className="bar-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px',
              gap: '12px',
            }}
          >
            <div
              className="bar-label desktop-only"
              style={{
                width: '120px',
                color: '#e2e8f0',
                fontSize: '14px',
                textAlign: 'right',
                flexShrink: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.optionText}
            </div>
            <div
              className="bar-track"
              style={{
                flex: 1,
                height: '36px',
                backgroundColor: '#4a5568',
                borderRadius: '8px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                className="bar-fill"
                style={{
                  height: '100%',
                  width: `${width}%`,
                  backgroundColor: color,
                  borderRadius: '8px',
                  transition: 'width 0.5s ease-out',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: '10px',
                  minWidth: value > 0 ? '40px' : '0',
                }}
              >
                <span
                  style={{
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {showWeightedScore
                    ? `${value}分`
                    : `${value}票 (${item.percentage}%)`}
                </span>
              </div>
              <span
                className="mobile-label"
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 500,
                  display: 'none',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '50%',
                }}
              >
                {item.optionText}
              </span>
            </div>
          </div>
        );
      })}
      <style>{`
        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
          .mobile-label { display: block !important; }
          .bar-row { margin-bottom: 12px !important; }
        }
      `}</style>
    </div>
  );
};

export default ChartBar;
