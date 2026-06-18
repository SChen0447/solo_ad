import { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import type { User, Vote, VoteType } from '../../types';
import { STYLES, ANIMATION } from '../../utils/constants';
import { v4 as uuidv4 } from 'uuid';

interface ApproveStats {
  type: 'approve';
  approves: number;
  rejects: number;
  count: number;
}

interface AvgStats {
  type: 'stars' | 'priority';
  avg: number;
  count: number;
}

type VoteStats = ApproveStats | AvgStats | { count: number } | null;

interface VotePanelProps {
  noteId: string;
  currentUser: User;
  onVote: (vote: Vote) => void;
  onClose: () => void;
}

export default function VotePanel({ noteId, currentUser, onVote, onClose }: VotePanelProps) {
  const { room } = useAppStore();
  const note = room?.notes.find((n) => n.id === noteId);
  const [voteType, setVoteType] = useState<VoteType | null>(note?.vote?.type || null);
  const [myVote, setMyVote] = useState<number>(0);

  const existingVote = note?.vote;

  const stats = useMemo<VoteStats>(() => {
    if (!existingVote) return null;
    const values = Object.values(existingVote.votes);
    const count = values.length;
    if (existingVote.type === 'approve') {
      return {
        type: 'approve',
        approves: values.filter((v) => v === 1).length,
        rejects: values.filter((v) => v === -1).length,
        count,
      };
    }
    if (existingVote.type === 'stars' || existingVote.type === 'priority') {
      const avg = count > 0 ? values.reduce((a, b) => a + b, 0) / count : 0;
      return { type: existingVote.type, avg, count };
    }
    return { count };
  }, [existingVote]);

  const submitVote = (value: number) => {
    if (!note) return;
    const currentVotes = existingVote?.votes || {};
    const vote: Vote = {
      id: existingVote?.id || uuidv4(),
      type: voteType!,
      noteId: note.id,
      votes: { ...currentVotes, [currentUser.id]: value },
      createdAt: existingVote?.createdAt || Date.now(),
    };
    setMyVote(value);
    onVote(vote);
  };

  if (!note) return null;

  const canChooseType = !existingVote;
  const myCurrentVote = existingVote?.votes[currentUser.id];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: STYLES.BG_CARD,
          borderRadius: 16,
          padding: 24,
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ color: STYLES.TEXT_PRIMARY, fontSize: 18 }}>投票</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: STYLES.TEXT_PRIMARY,
              cursor: 'pointer',
              fontSize: 20,
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            background: note.color,
            padding: 12,
            borderRadius: 8,
            marginBottom: 20,
            color: '#1a1a2e',
            fontSize: 13,
            lineHeight: 1.5,
            minHeight: 40,
          }}
        >
          {note.text || '(空)'}
        </div>

        {canChooseType ? (
          <>
            <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 12 }}>选择投票类型：</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {(
                [
                  { type: 'approve' as VoteType, label: '👍 赞成 / 👎 反对', desc: '二元选择投票' },
                  { type: 'stars' as VoteType, label: '⭐ 五星评分', desc: '1-5星评价' },
                  { type: 'priority' as VoteType, label: '📊 优先级排序', desc: '1-5分优先级' },
                ]
              ).map(({ type, label, desc }) => (
                <button
                  key={type}
                  onClick={() => setVoteType(type)}
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    background: voteType === type ? STYLES.BG_NAV : 'rgba(44, 62, 80, 0.5)',
                    border: voteType === type ? `1px solid ${STYLES.SELECTED_BORDER}` : '1px solid transparent',
                    color: STYLES.TEXT_PRIMARY,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: 14,
                    transition: `all ${ANIMATION.HOVER_DURATION}ms`,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{desc}</div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 12 }}>
              当前投票类型：
              <strong style={{ color: STYLES.TEXT_PRIMARY }}>
                {existingVote?.type === 'approve' && '赞成/反对'}
                {existingVote?.type === 'stars' && '五星评分'}
                {existingVote?.type === 'priority' && '优先级排序'}
              </strong>
            </div>
          </div>
        )}

        {voteType && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 12 }}>
              你的投票：
              {myCurrentVote !== undefined && (
                <span style={{ color: '#27ae60', marginLeft: 8 }}>(已投票)</span>
              )}
            </div>

            {voteType === 'approve' && (
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => submitVote(1)}
                  style={{
                    flex: 1,
                    padding: 16,
                    borderRadius: 10,
                    background: myCurrentVote === 1 ? '#27ae60' : 'rgba(39, 174, 96, 0.2)',
                    border: myCurrentVote === 1 ? '2px solid #27ae60' : '2px solid transparent',
                    color: STYLES.TEXT_PRIMARY,
                    cursor: 'pointer',
                    fontSize: 24,
                    transition: `all ${ANIMATION.HOVER_DURATION}ms`,
                  }}
                >
                  👍
                  <div style={{ fontSize: 12, marginTop: 4 }}>赞成</div>
                </button>
                <button
                  onClick={() => submitVote(-1)}
                  style={{
                    flex: 1,
                    padding: 16,
                    borderRadius: 10,
                    background: myCurrentVote === -1 ? '#e74c3c' : 'rgba(231, 76, 60, 0.2)',
                    border: myCurrentVote === -1 ? '2px solid #e74c3c' : '2px solid transparent',
                    color: STYLES.TEXT_PRIMARY,
                    cursor: 'pointer',
                    fontSize: 24,
                    transition: `all ${ANIMATION.HOVER_DURATION}ms`,
                  }}
                >
                  👎
                  <div style={{ fontSize: 12, marginTop: 4 }}>反对</div>
                </button>
              </div>
            )}

            {(voteType === 'stars' || voteType === 'priority') && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    onClick={() => submitVote(v)}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 10,
                      background:
                        (myCurrentVote || myVote) >= v
                          ? voteType === 'stars'
                            ? '#f39c12'
                            : '#3498db'
                          : 'rgba(44, 62, 80, 0.5)',
                      border:
                        (myCurrentVote || myVote) === v
                          ? `2px solid ${voteType === 'stars' ? '#f39c12' : '#3498db'}`
                          : '2px solid transparent',
                      color: STYLES.TEXT_PRIMARY,
                      cursor: 'pointer',
                      fontSize: voteType === 'stars' ? 24 : 18,
                      fontWeight: 700,
                      transition: `all ${ANIMATION.HOVER_DURATION}ms`,
                    }}
                  >
                    {voteType === 'stars' ? '★' : v}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {stats && (
          <div
            style={{
              padding: 16,
              background: 'rgba(44, 62, 80, 0.3)',
              borderRadius: 10,
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
              实时结果 ({stats.count} 人已投票)
            </div>
            {stats && 'type' in stats && stats.type === 'approve' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: '#27ae60' }}>👍 赞成 {stats.approves}</span>
                  <span style={{ color: '#e74c3c' }}>👎 反对 {stats.rejects}</span>
                </div>
                <div style={{ height: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 4, display: 'flex', overflow: 'hidden' }}>
                  <div
                    style={{
                      background: '#27ae60',
                      width: `${(stats.approves / Math.max(1, stats.count)) * 100}%`,
                      transition: `width ${ANIMATION.VOTE_UPDATE_DURATION}ms`,
                    }}
                  />
                  <div
                    style={{
                      background: '#e74c3c',
                      width: `${(stats.rejects / Math.max(1, stats.count)) * 100}%`,
                      transition: `width ${ANIMATION.VOTE_UPDATE_DURATION}ms`,
                    }}
                  />
                </div>
              </>
            )}
            {stats && 'type' in stats && (stats.type === 'stars' || stats.type === 'priority') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: STYLES.TEXT_PRIMARY }}>
                  {stats.avg.toFixed(1)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: voteType === 'stars' ? 20 : 14, letterSpacing: 2 }}>
                    {voteType === 'stars'
                      ? [1, 2, 3, 4, 5].map((i) => (
                          <span key={i} style={{ color: i <= Math.round(stats.avg) ? '#f39c12' : 'rgba(255,255,255,0.2)' }}>
                            ★
                          </span>
                        ))
                      : `${Math.round(stats.avg)}/5 分`}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 8,
              background: 'transparent',
              border: `1px solid ${STYLES.BORDER_DIVIDER}`,
              color: STYLES.TEXT_PRIMARY,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
