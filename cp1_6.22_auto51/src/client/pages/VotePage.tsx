import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Room, VoteType } from '../../shared/types';

function getVoterId(): string {
  const key = 'quickvote_voter_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = 'v_' + Math.random().toString(36).substring(2, 14);
    localStorage.setItem(key, id);
  }
  return id;
}

const VotePage: React.FC = () => {
  const { code = '' } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selections, setSelections] = useState<number[]>([]);
  const [canSubmit, setCanSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [voterName, setVoterName] = useState('');
  const submitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/room/${code}`);
        if (!res.ok) throw new Error('房间不存在');
        const data: Room = await res.json();
        setRoom(data);
      } catch (err) {
        setError('房间不存在或已失效');
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  useEffect(() => {
    return () => {
      if (submitTimerRef.current) window.clearTimeout(submitTimerRef.current);
    };
  }, []);

  const triggerSubmitTimer = () => {
    if (submitTimerRef.current) window.clearTimeout(submitTimerRef.current);
    setCanSubmit(false);
    submitTimerRef.current = window.setTimeout(() => {
      setCanSubmit(true);
    }, 500);
  };

  const handleSelectSingle = (idx: number) => {
    setSelections([idx]);
    triggerSubmitTimer();
  };

  const handleSelectMultiple = (idx: number) => {
    setSelections((prev) => {
      if (prev.includes(idx)) return prev.filter((i) => i !== idx);
      return [...prev, idx];
    });
    triggerSubmitTimer();
  };

  const handleSelectRanking = (idx: number) => {
    if (!room) return;
    setSelections((prev) => {
      if (prev.includes(idx)) {
        return prev.filter((i) => i !== idx);
      }
      if (prev.length >= room.options.length) return prev;
      return [...prev, idx];
    });
    triggerSubmitTimer();
  };

  const handleRemoveRanking = (idx: number) => {
    setSelections((prev) => prev.filter((_, i) => i !== idx));
    triggerSubmitTimer();
  };

  const handleSubmit = async () => {
    if (!room || !canSubmit || submitting) return;
    if (selections.length === 0) return;
    if (room.voteType === 'ranking' && selections.length !== room.options.length) return;

    setSubmitting(true);
    try {
      const voterId = getVoterId();
      const res = await fetch(`/api/room/${code}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voterId,
          voterName: voterName.trim() || undefined,
          selections,
        }),
      });
      if (!res.ok) throw new Error('提交失败');
      navigate(`/result/${code}`);
    } catch (err) {
      setError('提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const isSelected = (idx: number) => selections.includes(idx);
  const rankOf = (idx: number) => selections.indexOf(idx);

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ color: '#a0aec0', textAlign: 'center', padding: '40px' }}>加载中...</div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div style={containerStyle}>
        <div
          style={{
            backgroundColor: '#2d3748',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '420px',
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '48px',
              marginBottom: '12px',
            }}
          >
            😕
          </div>
          <div style={{ color: '#fc8181', fontSize: '18px', marginBottom: '16px' }}>
            {error || '房间不存在'}
          </div>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#6b46c1',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: 600,
            }}
          >
            返回大厅
          </button>
        </div>
      </div>
    );
  }

  const voteTypeLabels: Record<VoteType, string> = {
    single: '单选',
    multiple: '多选',
    ranking: '排序',
  };

  return (
    <div style={containerStyle}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '12px' }}>
            <span
              style={{
                padding: '4px 12px',
                backgroundColor: 'rgba(107, 70, 193, 0.25)',
                color: '#b794f4',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {voteTypeLabels[room.voteType]}
            </span>
            {room.isEnded && (
              <span
                style={{
                  padding: '4px 12px',
                  backgroundColor: 'rgba(229, 62, 62, 0.2)',
                  color: '#fc8181',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                已结束
              </span>
            )}
            <span
              style={{
                padding: '4px 12px',
                backgroundColor: '#2d3748',
                color: '#a0aec0',
                borderRadius: '20px',
                fontSize: '13px',
                fontFamily: 'monospace',
                letterSpacing: '2px',
              }}
            >
              房间 {room.code}
            </span>
          </div>
          <h1 style={{ color: '#e2e8f0', fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
            {room.title}
          </h1>
          {room.description && (
            <p style={{ color: '#a0aec0', fontSize: '15px', margin: 0 }}>{room.description}</p>
          )}
        </div>

        {room.voteType === 'ranking' && (
          <div
            style={{
              backgroundColor: 'rgba(49, 151, 149, 0.1)',
              border: '1px solid rgba(49, 151, 149, 0.3)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '24px',
              color: '#4fd1c5',
              fontSize: '14px',
            }}
          >
            排序模式：按偏好顺序点击选项（{selections.length}/{room.options.length}），数字越大优先级越高
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: '28px',
          }}
          className="options-grid"
        >
          {room.options.map((opt, idx) => {
            const selected = isSelected(idx);
            const rank = rankOf(idx);
            const handleClick =
              room.voteType === 'single'
                ? () => handleSelectSingle(idx)
                : room.voteType === 'multiple'
                ? () => handleSelectMultiple(idx)
                : () => handleSelectRanking(idx);

            return (
              <div
                key={idx}
                onClick={!room.isEnded ? handleClick : undefined}
                style={{
                  backgroundColor: selected ? '#6b46c1' : '#edf2f7',
                  color: selected ? '#fff' : '#2d3748',
                  borderRadius: '16px',
                  padding: '24px 16px',
                  cursor: room.isEnded ? 'not-allowed' : 'pointer',
                  position: 'relative',
                  minHeight: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  fontSize: '16px',
                  fontWeight: 600,
                  boxShadow: selected
                    ? '0 8px 24px rgba(107, 70, 193, 0.4)'
                    : '0 4px 12px rgba(0,0,0,0.1)',
                  transform: selected ? 'scale(1.03)' : 'scale(1)',
                  transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  userSelect: 'none',
                }}
                className="option-card"
              >
                <span style={{ wordBreak: 'break-word' }}>{opt}</span>
                {selected && room.voteType === 'ranking' && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '10px',
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: '#fff',
                      color: '#6b46c1',
                      fontSize: '14px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {room.options.length - rank}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {room.voteType === 'ranking' && selections.length > 0 && (
          <div
            style={{
              backgroundColor: '#2d3748',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}
          >
            <div style={{ color: '#a0aec0', fontSize: '13px', marginBottom: '10px' }}>
              当前排序（点击可移除）：
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {selections.map((optIdx, rankIdx) => (
                <span
                  key={rankIdx}
                  onClick={() => handleRemoveRanking(rankIdx)}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: '#6b46c1',
                    color: '#fff',
                    borderRadius: '20px',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {room.options.length - rankIdx}. {room.options[optIdx]} ×
                </span>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            backgroundColor: '#2d3748',
            borderRadius: '16px',
            padding: '20px 24px',
            marginBottom: '24px',
          }}
        >
          <div style={{ color: '#a0aec0', fontSize: '13px', marginBottom: '8px' }}>
            昵称（可选，将显示在投票结果中，留空则匿名）
          </div>
          <input
            type="text"
            value={voterName}
            onChange={(e) => setVoterName(e.target.value)}
            placeholder="输入你的昵称..."
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '2px solid #4a5568',
              backgroundColor: '#1a202c',
              color: '#e2e8f0',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            maxLength={20}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 28px',
              borderRadius: '10px',
              border: '2px solid #4a5568',
              backgroundColor: 'transparent',
              color: '#e2e8f0',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            返回
          </button>
          <button
            onClick={() => navigate(`/result/${code}`)}
            style={{
              padding: '12px 28px',
              borderRadius: '10px',
              border: '2px solid #4a5568',
              backgroundColor: 'transparent',
              color: '#e2e8f0',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            查看结果
          </button>
          {!room.isEnded && (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || selections.length === 0 || submitting || (room.voteType === 'ranking' && selections.length !== room.options.length)}
              style={{
                padding: '12px 36px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor:
                  canSubmit && selections.length > 0 && !(room.voteType === 'ranking' && selections.length !== room.options.length)
                    ? '#6b46c1'
                    : '#4a5568',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 600,
                cursor:
                  canSubmit && selections.length > 0 && !(room.voteType === 'ranking' && selections.length !== room.options.length) && !submitting
                    ? 'pointer'
                    : 'not-allowed',
                transition: 'background-color 0.2s',
              }}
            >
              {submitting ? '提交中...' : canSubmit ? '提交投票' : '请稍候...'}
            </button>
          )}
        </div>
      </div>

      <style>{`
        .option-card:hover:not([style*="not-allowed"]) {
          transform: translateY(-2px) scale(1.01);
          transition: all 0.15s ease-out;
        }
        @media (max-width: 1023px) and (min-width: 768px) {
          .options-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 767px) {
          .options-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  padding: '32px 24px',
  minHeight: '100vh',
  boxSizing: 'border-box',
};

export default VotePage;
