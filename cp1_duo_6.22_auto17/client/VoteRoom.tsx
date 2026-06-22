import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { Vote } from './types';

interface VoteRoomProps {
  vote: Vote;
  onBack: () => void;
  voterId: string;
  creatorId?: string;
  socket: Socket | null;
}

const VoteRoom = ({ vote, onBack, voterId, creatorId, socket }: VoteRoomProps) => {
  const [currentVote, setCurrentVote] = useState<Vote>(vote);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [previousVotes, setPreviousVotes] = useState<Record<string, number>>({});
  const [displayVotes, setDisplayVotes] = useState<Record<string, number>>({});

  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const voted = localStorage.getItem(`flashvote_voted_${vote.id}`);
    if (voted) {
      setHasVoted(true);
      setSelectedOption(voted);
    }

    const initialVotes: Record<string, number> = {};
    vote.options.forEach(opt => {
      initialVotes[opt.id] = opt.votes;
    });
    setPreviousVotes(initialVotes);
    setDisplayVotes(initialVotes);

    if (socket) {
      socket.emit('joinRoom', vote.id);
    }

    return () => {
      if (socket) {
        socket.emit('leaveRoom', vote.id);
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [vote.id, vote.options, socket]);

  useEffect(() => {
    setCurrentVote(vote);
  }, [vote]);

  useEffect(() => {
    const newVotes: Record<string, number> = {};
    currentVote.options.forEach(opt => {
      newVotes[opt.id] = opt.votes;
    });

    Object.keys(newVotes).forEach(optId => {
      const oldVal = previousVotes[optId] ?? 0;
      const newVal = newVotes[optId];
      if (oldVal !== newVal) {
        animateNumber(optId, oldVal, newVal);
      }
    });

    setPreviousVotes(newVotes);
  }, [currentVote]);

  const animateNumber = useCallback((optId: string, from: number, to: number) => {
    const duration = 500;
    const startTime = performance.now();
    const diff = to - from;

    const update = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(from + diff * easeProgress);

      setDisplayVotes(prev => ({
        ...prev,
        [optId]: currentValue
      }));

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(update);
      }
    };

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    animFrameRef.current = requestAnimationFrame(update);
  }, []);

  const handleVote = useCallback(async (optionId: string) => {
    if (hasVoted || currentVote.isClosed) return;

    setVoteError(null);

    try {
      const res = await fetch(`/api/votes/${currentVote.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          optionId,
          voterId
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '投票失败');
      }

      setSelectedOption(optionId);
      setHasVoted(true);
      localStorage.setItem(`flashvote_voted_${currentVote.id}`, optionId);
    } catch (err) {
      setVoteError(err instanceof Error ? err.message : '投票失败');
    }
  }, [hasVoted, currentVote.id, currentVote.isClosed, voterId]);

  const handleCloseVote = useCallback(async () => {
    if (!creatorId) return;

    try {
      const res = await fetch(`/api/votes/${currentVote.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '关闭投票失败');
      }
    } catch (err) {
      console.error('关闭投票失败:', err);
    }
  }, [creatorId, currentVote.id]);

  const handleCopyLink = useCallback(async () => {
    try {
      const url = `${window.location.origin}${window.location.pathname}#${currentVote.id}`;
      await navigator.clipboard.writeText(url);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 1500);
    } catch (err) {
      console.error('复制失败:', err);
    }
  }, [currentVote.id]);

  const totalVotes = currentVote.options.reduce((sum, opt) => sum + opt.votes, 0);
  const displayTotalVotes = currentVote.options.reduce(
    (sum, opt) => sum + (displayVotes[opt.id] ?? opt.votes),
    0
  );

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPercentage = (votes: number) => {
    if (totalVotes === 0) return 0;
    return (votes / totalVotes) * 100;
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <button className="back-btn" onClick={onBack}>
          ← 返回
        </button>
        <h1 className="app-title">
          <span className="logo-icon">⚡</span>
          FlashVote
        </h1>
        <div style={{ width: '80px' }}></div>
      </header>

      <main className="main-content">
        <div className="vote-room-card">
          <div className="vote-room-header">
            <div className="vote-room-title-row">
              <h2 className="vote-room-title">{currentVote.title}</h2>
              <span className={`status-badge ${currentVote.isClosed ? 'closed' : 'active'}`}>
                {currentVote.isClosed ? '已结束' : '进行中'}
              </span>
            </div>
            {currentVote.description && (
              <p className="vote-room-desc">{currentVote.description}</p>
            )}
            <div className="vote-room-meta">
              <span>创建于 {formatDate(currentVote.createdAt)}</span>
              <span className="total-votes">
                <span className="number-animate">{displayTotalVotes}</span> 人参与
              </span>
            </div>
          </div>

          <div className="vote-actions-bar">
            <button className="copy-link-btn" onClick={handleCopyLink}>
              🔗 复制链接
            </button>
            {showCopied && <span className="copied-toast">已复制！</span>}
            {creatorId && !currentVote.isClosed && (
              <button className="close-vote-btn" onClick={handleCloseVote}>
                结束投票
              </button>
            )}
          </div>

          {voteError && <div className="error-message">{voteError}</div>}

          {hasVoted && !currentVote.isClosed && (
            <div className="info-message">感谢您的投票！您可以继续查看实时结果。</div>
          )}

          {currentVote.isClosed && (
            <div className="info-message">投票已结束，以下是最终结果。</div>
          )}

          <div className="options-list">
            {currentVote.options.map((option, index) => {
              const percentage = getPercentage(option.votes);
              const displayVoteCount = displayVotes[option.id] ?? option.votes;
              const isSelected = selectedOption === option.id;
              const isDisabled = hasVoted || currentVote.isClosed;

              const colorStart = { r: 74, g: 144, b: 217 };
              const colorEnd = { r: 80, g: 227, b: 194 };
              const ratio = percentage / 100;
              const r = Math.round(colorStart.r + (colorEnd.r - colorStart.r) * ratio);
              const g = Math.round(colorStart.g + (colorEnd.g - colorStart.g) * ratio);
              const b = Math.round(colorStart.b + (colorEnd.b - colorStart.b) * ratio);
              const barColor = `rgb(${r}, ${g}, ${b})`;

              return (
                <div
                  key={option.id}
                  className={`option-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                  onClick={() => !isDisabled && handleVote(option.id)}
                >
                  <div className="option-header">
                    <div className="option-left">
                      <span className="option-index">{index + 1}</span>
                      <span className="option-text">{option.text}</span>
                    </div>
                    <div className="option-votes">
                      <span className="vote-count number-animate">{displayVoteCount}</span>
                      <span className="vote-percentage">({percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: barColor
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {creatorId && (
            <div className="creator-info">
              <span className="creator-badge">👑 您是此投票的创建者</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default VoteRoom;
