import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient, Track, VoteSession } from '@/api/apiClient';

interface VotePanelProps {
  tracks: Track[];
}

const VOTER_ID_KEY = 'live_music_voter_id';

function getVoterId(): string {
  let id = localStorage.getItem(VOTER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VOTER_ID_KEY, id);
  }
  return id;
}

const VotePanel: React.FC<VotePanelProps> = ({ tracks }) => {
  const [voteSession, setVoteSession] = useState<VoteSession | null>(null);
  const [showStartForm, setShowStartForm] = useState(false);
  const [voteTitle, setVoteTitle] = useState('');
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voterIdRef = useRef(getVoterId());

  const fetchCurrentVote = useCallback(async () => {
    try {
      const session = await apiClient.vote.getCurrent();
      setVoteSession(session);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchCurrentVote();
  }, [fetchCurrentVote]);

  useEffect(() => {
    if (voteSession?.active) {
      pollRef.current = setInterval(fetchCurrentVote, 30000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [voteSession?.active, fetchCurrentVote]);

  const handleStartVote = useCallback(async () => {
    if (!voteTitle.trim() || selectedCandidates.length === 0) return;
    setLoading(true);
    try {
      const session = await apiClient.vote.start(voteTitle, selectedCandidates);
      setVoteSession(session);
      setShowStartForm(false);
      setVoteTitle('');
      setSelectedCandidates([]);
      setHasVoted(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [voteTitle, selectedCandidates]);

  const handleVote = useCallback(async (trackId: string) => {
    if (hasVoted) return;
    setLoading(true);
    try {
      const session = await apiClient.vote.cast(voterIdRef.current, trackId);
      setVoteSession(session);
      setHasVoted(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [hasVoted]);

  const handleEndVote = useCallback(async () => {
    setLoading(true);
    try {
      const session = await apiClient.vote.end();
      setVoteSession(session);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleCandidate = useCallback((trackId: string) => {
    setSelectedCandidates((prev) => {
      if (prev.includes(trackId)) return prev.filter((id) => id !== trackId);
      if (prev.length >= 3) return prev;
      return [...prev, trackId];
    });
  }, []);

  const maxVotes = voteSession
    ? Math.max(...voteSession.results.map((r) => r.count), 1)
    : 1;

  return (
    <div className="vote-panel">
      <div className="vote-header">
        <h2 style={{ color: '#C084FC', fontSize: '24px', fontWeight: 700, margin: 0 }}>
          🗳️ 返场投票
        </h2>
        {!voteSession?.active && (
          <button
            className="btn-primary ripple"
            onClick={() => setShowStartForm(!showStartForm)}
          >
            {showStartForm ? '取消' : '发起投票'}
          </button>
        )}
        {voteSession?.active && (
          <button className="btn-end ripple" onClick={handleEndVote} disabled={loading}>
            结束投票
          </button>
        )}
      </div>

      {showStartForm && (
        <div className="vote-start-form">
          <input
            placeholder="投票主题 (如：返场曲目投票)"
            value={voteTitle}
            onChange={(e) => setVoteTitle(e.target.value)}
            className="form-input"
          />
          <div className="candidate-select">
            <p style={{ color: '#9CA3AF', fontSize: '14px', margin: '0 0 12px 0' }}>
              选择候选曲目 (最多3个，已选 {selectedCandidates.length}/3)
            </p>
            <div className="candidate-list">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className={`candidate-item ${selectedCandidates.includes(track.id) ? 'selected' : ''}`}
                  onClick={() => toggleCandidate(track.id)}
                >
                  <div className="candidate-check">
                    {selectedCandidates.includes(track.id) ? '✓' : ''}
                  </div>
                  <span style={{ color: '#E5E7EB', fontSize: '14px' }}>{track.name}</span>
                  <span style={{ color: '#6B7280', fontSize: '12px' }}>{track.artist}</span>
                </div>
              ))}
            </div>
          </div>
          <button
            className="btn-primary ripple"
            onClick={handleStartVote}
            disabled={!voteTitle.trim() || selectedCandidates.length === 0 || loading}
          >
            {loading ? '创建中...' : '开始投票'}
          </button>
        </div>
      )}

      {voteSession && (
        <div className="vote-session">
          <div className="vote-title-row">
            <h3 style={{ color: '#E5E7EB', fontSize: '18px', margin: 0 }}>
              {voteSession.title}
            </h3>
            <span className={`vote-status ${voteSession.active ? 'active' : 'ended'}`}>
              {voteSession.active ? '进行中' : '已结束'}
            </span>
          </div>

          <div className="vote-candidates">
            {voteSession.candidates.map((candidate) => {
              const result = voteSession.results.find((r) => r.trackId === candidate.trackId);
              const barWidth = result ? (result.count / maxVotes) * 100 : 0;
              return (
                <div key={candidate.trackId} className="vote-candidate-row">
                  <div className="vote-candidate-label">
                    <span className="vote-candidate-name">{candidate.trackName}</span>
                  </div>
                  <div className="vote-bar-container">
                    <div
                      className="vote-bar"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <div className="vote-stats">
                    <span className="vote-count">{result?.count || 0} 票</span>
                    <span className="vote-percentage">{result?.percentage || 0}%</span>
                  </div>
                  {voteSession.active && !hasVoted && (
                    <button
                      className="btn-vote ripple"
                      onClick={() => handleVote(candidate.trackId)}
                      disabled={loading}
                    >
                      投票
                    </button>
                  )}
                  {voteSession.active && hasVoted && (
                    <button className="btn-voted" disabled>
                      已投
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="vote-total">
            总票数: {voteSession.totalVotes}
          </div>
        </div>
      )}

      {!voteSession && !showStartForm && (
        <div className="empty-state">
          暂无投票，点击"发起投票"开始一轮返场投票
        </div>
      )}

      <style>{`
        .vote-panel {
          width: 100%;
        }
        .vote-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .vote-start-form {
          background: rgba(99, 102, 241, 0.08);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .candidate-select .candidate-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 240px;
          overflow-y: auto;
        }
        .candidate-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: rgba(30, 27, 75, 0.5);
          border: 1px solid rgba(99, 102, 241, 0.15);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .candidate-item:hover {
          border-color: rgba(99, 102, 241, 0.4);
          transform: translateY(-2px);
        }
        .candidate-item.selected {
          border-color: #6366F1;
          background: rgba(99, 102, 241, 0.15);
        }
        .candidate-check {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          border: 2px solid rgba(99, 102, 241, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: #6366F1;
          flex-shrink: 0;
        }
        .candidate-item.selected .candidate-check {
          background: #6366F1;
          color: white;
          border-color: #6366F1;
        }
        .vote-session {
          background: rgba(30, 27, 75, 0.3);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 12px;
          padding: 24px;
        }
        .vote-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .vote-status {
          font-size: 13px;
          padding: 4px 12px;
          border-radius: 12px;
          font-weight: 600;
        }
        .vote-status.active {
          background: rgba(16, 185, 129, 0.15);
          color: #10B981;
        }
        .vote-status.ended {
          background: rgba(107, 114, 128, 0.15);
          color: #9CA3AF;
        }
        .vote-candidates {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .vote-candidate-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .vote-candidate-label {
          min-width: 120px;
        }
        .vote-candidate-name {
          color: #E5E7EB;
          font-size: 15px;
          font-weight: 500;
        }
        .vote-bar-container {
          flex: 1;
          height: 40px;
          background: rgba(30, 27, 75, 0.6);
          border-radius: 8px;
          overflow: hidden;
        }
        .vote-bar {
          height: 40px;
          border-radius: 8px;
          background: linear-gradient(90deg, #3B82F6, #8B5CF6);
          transition: width 0.5s ease;
          min-width: 2px;
        }
        .vote-stats {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          min-width: 80px;
        }
        .vote-count {
          color: #E5E7EB;
          font-size: 14px;
          font-weight: 600;
        }
        .vote-percentage {
          color: #9CA3AF;
          font-size: 12px;
        }
        .btn-vote {
          width: 120px;
          height: 40px;
          border-radius: 20px;
          border: none;
          background: #8B5CF6;
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
        }
        .btn-vote:hover:not(:disabled) {
          background: #7C3AED;
          transform: translateY(-2px);
        }
        .btn-vote:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-voted {
          width: 120px;
          height: 40px;
          border-radius: 20px;
          border: none;
          background: #9CA3AF;
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: not-allowed;
        }
        .btn-end {
          padding: 8px 20px;
          border-radius: 8px;
          border: 1px solid rgba(239, 68, 68, 0.3);
          background: rgba(239, 68, 68, 0.1);
          color: #EF4444;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-end:hover {
          background: rgba(239, 68, 68, 0.2);
        }
        .vote-total {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid rgba(99, 102, 241, 0.15);
          color: #9CA3AF;
          font-size: 14px;
          text-align: right;
        }
      `}</style>
    </div>
  );
};

export default VotePanel;
