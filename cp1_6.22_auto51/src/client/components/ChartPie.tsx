import React, { useState } from 'react';
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
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
}

const ChartPie: React.FC<Props> = ({ data }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const r = 120;

  const total = data.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '320px',
          color: '#a0aec0',
          fontSize: '16px',
        }}
      >
        暂无投票数据
      </div>
    );
  }

  let cumulative = 0;
  const slices = data.map((item, index) => {
    const startAngle = (cumulative / total) * 360;
    cumulative += item.count;
    const endAngle = (cumulative / total) * 360;
    const midAngle = (startAngle + endAngle) / 2;
    const labelPos = polarToCartesian(cx, cy, r * 0.65, midAngle);
    return {
      item,
      index,
      startAngle,
      endAngle,
      midAngle,
      labelPos,
      color: COLORS[index % COLORS.length],
      path:
        endAngle - startAngle >= 360
          ? describeArc(cx, cy, r, 0, 359.999)
          : describeArc(cx, cy, r, startAngle, endAngle),
    };
  });

  const selectedItem = selected !== null ? data[selected] : null;
  const namedVoters =
    selectedItem?.voters.filter((v) => v.voterName && v.voterName.trim()) || [];
  const anonymousCount =
    selectedItem !== null ? selectedItem.voters.length - namedVoters.length : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: '100%' }}>
        {slices.map((s) => (
          <path
            key={s.item.optionIndex}
            d={s.path}
            fill={s.color}
            stroke="#1a202c"
            strokeWidth="2"
            style={{
              cursor: 'pointer',
              transform:
                selected === s.index ? `translate(0, 0) scale(1.04)` : 'scale(1)',
              transformOrigin: `${cx}px ${cy}px`,
              transition: 'transform 0.2s ease-out',
              opacity: selected === null || selected === s.index ? 1 : 0.5,
            }}
            onClick={() => setSelected(selected === s.index ? null : s.index)}
          />
        ))}
        {slices.map(
          (s) =>
            s.item.percentage >= 5 && (
              <text
                key={`lbl-${s.item.optionIndex}`}
                x={s.labelPos.x}
                y={s.labelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize="13"
                fontWeight={600}
                style={{ pointerEvents: 'none' }}
              >
                {s.item.percentage}%
              </text>
            )
        )}
      </svg>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px 16px',
          marginTop: '16px',
          justifyContent: 'center',
        }}
      >
        {slices.map((s) => (
          <div
            key={`lg-${s.item.optionIndex}`}
            onClick={() => setSelected(selected === s.index ? null : s.index)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#e2e8f0',
              padding: '4px 8px',
              borderRadius: '6px',
              backgroundColor: selected === s.index ? 'rgba(107, 70, 193, 0.2)' : 'transparent',
              transition: 'background-color 0.2s',
            }}
          >
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '3px',
                backgroundColor: s.color,
                display: 'inline-block',
              }}
            />
            <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.item.optionText}
            </span>
          </div>
        ))}
      </div>

      {selectedItem && (
        <div
          style={{
            marginTop: '20px',
            padding: '16px',
            backgroundColor: '#2d3748',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '400px',
          }}
        >
          <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '10px' }}>
            {selectedItem.optionText} - {selectedItem.count}票 ({selectedItem.percentage}%)
          </div>
          {namedVoters.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ color: '#a0aec0', fontSize: '13px', marginBottom: '4px' }}>
                投票者：
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {namedVoters.map((v) => (
                  <span
                    key={v.voterId}
                    style={{
                      padding: '3px 10px',
                      backgroundColor: '#4a5568',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#e2e8f0',
                    }}
                  >
                    {v.voterName}
                  </span>
                ))}
              </div>
            </div>
          )}
          {anonymousCount > 0 && (
            <div style={{ color: '#a0aec0', fontSize: '13px' }}>
              另有 {anonymousCount} 位匿名用户
            </div>
          )}
          {namedVoters.length === 0 && anonymousCount === 0 && (
            <div style={{ color: '#a0aec0', fontSize: '13px' }}>暂无投票者信息</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChartPie;
