import { useState } from 'react';

interface VoteOption {
  id: string;
  text: string;
  voteCount: number;
  voters?: string[];
}

interface VoteCardProps {
  options: VoteOption[];
  isClosed: boolean;
  hasVoted: boolean;
  votedOptionId: string | null;
  totalVotes: number;
  onVote: (optionId: string) => void;
  showVoters: boolean;
}

function getOptionColor(index: number, total: number): string {
  const startH = 250;
  const endH = 280;
  const h = total <= 1 ? startH : startH + ((endH - startH) * index) / (total - 1);
  return `hsl(${h}, 80%, 65%)`;
}

export default function VoteCard({
  options,
  isClosed,
  hasVoted,
  votedOptionId,
  totalVotes,
  onVote,
  showVoters,
}: VoteCardProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div
      style={{
        padding: 24,
        backgroundColor: 'rgba(30, 30, 30, 0.8)',
        backdropFilter: 'blur(12px)',
        borderRadius: 16,
        border: hasVoted
          ? '1px solid rgba(76, 175, 80, 0.3)'
          : isClosed
          ? '1px solid rgba(255, 82, 82, 0.3)'
          : '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: hasVoted
          ? '0 4px 24px rgba(76, 175, 80, 0.15)'
          : '0 4px 24px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.3s ease-out',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#FFF' }}>
            {hasVoted ? '✅ 投票完成' : isClosed ? '🔒 投票已关闭' : '🗳️ 选择你的选项'}
          </h3>
        </div>
        {hasVoted && !isClosed && (
          <span style={{
            fontSize: 11,
            color: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.15)',
            padding: '4px 10px',
            borderRadius: 6,
            fontWeight: 600,
            border: '1px solid rgba(76, 175, 80, 0.3)',
          }}>
            ✓ 你的选择已记录
          </span>
        )}
      </div>

      {hasVoted && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            border: '1px solid rgba(76, 175, 80, 0.2)',
            borderRadius: 10,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 16 }}>👤</span>
          <div>
            <p style={{ fontSize: 12, color: '#4CAF50', fontWeight: 500, marginBottom: 2 }}>
              你已成功投票
            </p>
            <p style={{ fontSize: 11, color: '#888' }}>
              你选择了：
              <span style={{ color: '#BB86FC', fontWeight: 600, marginLeft: 4 }}>
                {options.find(o => o.id === votedOptionId)?.text}
              </span>
            </p>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {options.map((opt, idx) => {
          const isSelected = votedOptionId === opt.id;
          const isHovered = hoveredId === opt.id;
          const percentage = totalVotes > 0 ? (opt.voteCount / totalVotes) * 100 : 0;
          const color = getOptionColor(idx, options.length);
          const canInteract = !isClosed && !hasVoted;
          const isOtherOption = hasVoted && !isSelected;
          const fullyDisabled = !canInteract && !isSelected;

          return (
            <div key={opt.id} style={{ pointerEvents: isOtherOption ? 'none' : 'auto' }}>
              <button
                onClick={canInteract ? () => onVote(opt.id) : undefined}
                onMouseEnter={canInteract ? () => setHoveredId(opt.id) : undefined}
                onMouseLeave={canInteract ? () => setHoveredId(null) : undefined}
                disabled={!canInteract}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  backgroundColor: isSelected
                    ? '#BB86FC'
                    : isHovered && canInteract
                    ? 'rgba(187, 134, 252, 0.15)'
                    : 'rgba(255, 255, 255, 0.04)',
                  border: isSelected
                    ? '2px solid #BB86FC'
                    : isOtherOption
                    ? '2px solid rgba(255, 255, 255, 0.03)'
                    : '2px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 12,
                  cursor: canInteract ? 'pointer' : isSelected ? 'default' : 'not-allowed',
                  position: 'relative',
                  overflow: 'hidden',
                  transform: isHovered && canInteract ? 'scale(1.05)' : 'scale(1)',
                  transition: 'all 0.2s ease-out',
                  opacity: isOtherOption ? 0.45 : fullyDisabled ? 0.6 : 1,
                  filter: isOtherOption ? 'grayscale(30%)' : 'none',
                  pointerEvents: isOtherOption ? 'none' : 'auto',
                }}
              >
                {(hasVoted || totalVotes > 0) && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${percentage}%`,
                      backgroundColor: isSelected
                        ? 'rgba(255, 255, 255, 0.15)'
                        : `${color}33`,
                      transition: 'width 0.3s ease-out',
                      zIndex: 0,
                    }}
                  />
                )}

                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: color,
                        flexShrink: 0,
                        boxShadow: isSelected ? `0 0 10px ${color}` : 'none',
                        transition: 'box-shadow 0.3s',
                      }}
                    />
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: isSelected ? 600 : 500,
                        color: isSelected ? '#121212' : '#FFF',
                        textAlign: 'left',
                      }}
                    >
                      {opt.text}
                      {isSelected && (
                        <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.8 }}>
                          （你的选择）
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          backgroundColor: '#121212',
                          color: '#4CAF50',
                          fontSize: 12,
                          fontWeight: 700,
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {(hasVoted || totalVotes > 0) && (
                      <span
                        style={{
                          fontSize: 13,
                          color: isSelected ? 'rgba(18, 18, 18, 0.7)' : '#888',
                          fontWeight: 500,
                        }}
                      >
                        {percentage.toFixed(0)}%
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 13,
                        color: isSelected ? '#121212' : '#AAA',
                        fontWeight: 600,
                        backgroundColor: isSelected ? 'rgba(18, 18, 18, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                        padding: '2px 10px',
                        borderRadius: 6,
                        minWidth: 42,
                        textAlign: 'center',
                      }}
                    >
                      {opt.voteCount} 票
                    </span>
                  </div>
                </div>
              </button>

              {showVoters && opt.voters && opt.voters.length > 0 && (
                <div
                  style={{
                    marginTop: 6,
                    padding: '8px 12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 8,
                    marginLeft: 8,
                  }}
                >
                  <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>投票者：</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {opt.voters.map((v, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          backgroundColor: 'rgba(187, 134, 252, 0.15)',
                          color: '#BB86FC',
                          borderRadius: 4,
                        }}
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
