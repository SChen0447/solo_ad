import React, { useState, useEffect, useCallback } from 'react';
import { getIdeas, voteIdea, getUserVotes } from '../api/ideas';
import type { Idea } from '../api/ideas';
import { useAppContext } from '../App';
import IdeaCard from '../components/IdeaCard';

export default function VotingPage() {
  const { currentUser, showToast } = useAppContext();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [votesRemaining, setVotesRemaining] = useState(5);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [ideasData, voteData] = await Promise.all([getIdeas(), getUserVotes(currentUser)]);
      setIdeas(ideasData);
      setVotesRemaining(voteData.votesRemaining);
    } catch {
      showToast('加载数据失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleVote = async (id: string) => {
    if (votesRemaining <= 0) return;
    try {
      const result = await voteIdea(id, currentUser);
      setIdeas((prev) =>
        prev.map((idea) => (idea.id === id ? result.idea : idea))
      );
      setVotesRemaining(result.votesRemaining);
    } catch (err: any) {
      showToast(err.message || '投票失败', 'error');
    }
  };

  const barWidth = (votesRemaining / 5) * 100;

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseRed {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
      `}</style>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
      }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1F2937' }}>
          🗳️ 投票区
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 14, color: '#6B7280' }}>
            剩余票数: <strong style={{ color: votesRemaining > 0 ? '#6366F1' : '#EF4444' }}>{votesRemaining}</strong>/5
          </span>
        </div>
      </div>

      <div style={{
        width: '100%',
        height: 8,
        borderRadius: 4,
        background: '#E5E7EB',
        marginBottom: 32,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${barWidth}%`,
          height: '100%',
          borderRadius: 4,
          background: votesRemaining > 0
            ? 'linear-gradient(90deg, #10B981, #34D399)'
            : '#EF4444',
          transition: 'width 0.3s ease, background 0.3s ease',
          animation: votesRemaining === 0 ? 'pulseRed 1s ease infinite' : 'none',
        }} />
      </div>

      {votesRemaining === 0 && (
        <div style={{
          padding: '10px 16px',
          borderRadius: 10,
          background: '#FEF2F2',
          color: '#EF4444',
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 24,
          textAlign: 'center',
          animation: 'pulseRed 1s ease infinite',
        }}>
          ⚠️ 您已用完所有5票！
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', color: '#9CA3AF', padding: 48 }}>
          加载中...
        </div>
      ) : ideas.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#9CA3AF', padding: 48 }}>
          暂无创意，请先提交创意
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, 320px)',
          gap: 20,
          justifyContent: 'center',
        }}>
          {ideas.map((idea, i) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onVote={handleVote}
              votesRemaining={votesRemaining}
              showVoteButton={true}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}
