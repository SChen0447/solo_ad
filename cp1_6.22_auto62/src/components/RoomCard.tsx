import { useState, useEffect } from 'react';

interface Member {
  id: string;
  name: string;
  color: string;
}

interface RoomCardProps {
  members: Member[];
  evaluatedByMe: string[];
  memberEvalCount: Record<string, number>;
  currentMemberId: string;
  onMemberClick: (memberId: string) => void;
}

export default function RoomCard({
  members,
  evaluatedByMe,
  memberEvalCount,
  currentMemberId,
  onMemberClick
}: RoomCardProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const memberCount = members.length;
  const centerX = 300;
  const centerY = 300;
  const radius = memberCount <= 6 ? 160 : memberCount <= 10 ? 200 : 240;

  const getPosition = (index: number) => {
    const angle = (2 * Math.PI * index) / memberCount - Math.PI / 2;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  };

  if (isMobile) {
    return (
      <div style={{
        background: '#fff',
        padding: 20,
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
      }}>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#2d3748',
          marginBottom: 16
        }}>
          成员列表（点击卡片进行评价）
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {members.map((member) => {
            const isSelf = member.id === currentMemberId;
            const isEvaluated = evaluatedByMe.includes(member.id);
            const count = memberEvalCount[member.id] || 0;

            return (
              <div
                key={member.id}
                onClick={() => !isSelf && !isEvaluated && onMemberClick(member.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: 14,
                  borderRadius: 12,
                  background: isEvaluated ? '#f0fff4' : isSelf ? '#f7fafc' : '#fff',
                  border: `1px solid ${isEvaluated ? '#c6f6d5' : '#e2e8f0'}`,
                  cursor: isSelf || isEvaluated ? 'not-allowed' : 'pointer',
                  opacity: isSelf ? 0.6 : 1,
                  transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out'
                }}
                onMouseEnter={(e) => {
                  if (!isSelf && !isEvaluated) {
                    e.currentTarget.style.transform = 'translateY(-6px) scale(1.03)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: member.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 18,
                  fontWeight: 700,
                  flexShrink: 0
                }}>
                  {member.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#2d3748'
                  }}>
                    {member.name}
                    {isSelf && (
                      <span style={{
                        fontSize: 11,
                        marginLeft: 8,
                        color: '#718096',
                        background: '#edf2f7',
                        padding: '2px 8px',
                        borderRadius: 4
                      }}>
                        我
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: '#718096',
                    marginTop: 2
                  }}>
                    已收到 {count} 条评价
                  </div>
                </div>
                <div>
                  {isEvaluated ? (
                    <span style={{
                      fontSize: 12,
                      padding: '4px 10px',
                      background: '#c6f6d5',
                      color: '#2f855a',
                      borderRadius: 6,
                      fontWeight: 600
                    }}>
                      ✓ 已评价
                    </span>
                  ) : isSelf ? (
                    <span style={{
                      fontSize: 12,
                      padding: '4px 10px',
                      background: '#edf2f7',
                      color: '#718096',
                      borderRadius: 6
                    }}>
                      自己
                    </span>
                  ) : (
                    <span style={{
                      fontSize: 12,
                      padding: '4px 10px',
                      background: '#ed8936',
                      color: '#fff',
                      borderRadius: 6,
                      fontWeight: 600
                    }}>
                      去评价
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#fff',
      padding: 20,
      borderRadius: 12,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      overflow: 'auto'
    }}>
      <div style={{
        fontSize: 14,
        fontWeight: 600,
        color: '#2d3748',
        marginBottom: 12,
        textAlign: 'center'
      }}>
        成员环形图（点击头像进行评价）
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <svg
          width={600}
          height={600}
          viewBox="0 0 600 600"
          style={{ maxWidth: '100%', height: 'auto' }}
        >
          {members.map((_, i) => {
            const pos1 = getPosition(i);
            const pos2 = getPosition((i + 1) % memberCount);
            return (
              <line
                key={`line-${i}`}
                x1={pos1.x}
                y1={pos1.y}
                x2={pos2.x}
                y2={pos2.y}
                stroke="#cbd5e0"
                strokeWidth={1}
                strokeDasharray="6 4"
              />
            );
          })}

          {members.map((member) => {
            const isSelf = member.id === currentMemberId;
            const isEvaluated = evaluatedByMe.includes(member.id);
            const count = memberEvalCount[member.id] || 0;
            return (
              <g
                key={member.id}
                onClick={() => !isSelf && !isEvaluated && onMemberClick(member.id)}
                style={{ cursor: isSelf || isEvaluated ? 'not-allowed' : 'pointer' }}
              >
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={1}
                  fill="transparent"
                />
              </g>
            );
          })}

          {members.map((member, index) => {
            const pos = getPosition(index);
            const isSelf = member.id === currentMemberId;
            const isEvaluated = evaluatedByMe.includes(member.id);
            const count = memberEvalCount[member.id] || 0;

            return (
              <g
                key={`avatar-${member.id}`}
                onClick={() => !isSelf && !isEvaluated && onMemberClick(member.id)}
                style={{ cursor: isSelf || isEvaluated ? 'not-allowed' : 'pointer' }}
                transform={`translate(${pos.x}, ${pos.y})`}
              >
                {isEvaluated && (
                  <circle
                    r={34}
                    fill="#c6f6d5"
                    opacity={0.5}
                  />
                )}
                <circle
                  r={28}
                  fill={member.color}
                  opacity={isSelf ? 0.5 : 1}
                  style={{
                    transition: 'filter 0.2s ease'
                  }}
                />
                <text
                  textAnchor="middle"
                  dy="0.35em"
                  fill="#fff"
                  fontSize={18}
                  fontWeight={700}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {member.name.charAt(0)}
                </text>
                <text
                  textAnchor="middle"
                  y={50}
                  fill="#2d3748"
                  fontSize={13}
                  fontWeight={600}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {member.name}
                  {isSelf && ' (我)'}
                </text>
                {count > 0 && (
                  <text
                    textAnchor="middle"
                    y={66}
                    fill="#718096"
                    fontSize={11}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    收到 {count} 条
                  </text>
                )}
                {isEvaluated && (
                  <text
                    textAnchor="middle"
                    y={-36}
                    fill="#2f855a"
                    fontSize={11}
                    fontWeight={600}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    ✓ 已评价
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 20,
        marginTop: 8,
        fontSize: 12,
        color: '#718096'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, background: '#c6f6d5', borderRadius: 3 }} />
          <span>已评价完成</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, background: '#ed8936', borderRadius: 3 }} />
          <span>待评价</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, background: '#cbd5e0', borderRadius: 3 }} />
          <span>自己（不能评价）</span>
        </div>
      </div>
    </div>
  );
}
