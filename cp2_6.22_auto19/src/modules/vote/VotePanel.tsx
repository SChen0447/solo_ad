import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Song, VoteSession, voteApi, playlistApi } from '@/api/apiClient';
import './VotePanel.css';

const VOTE_COOLDOWN = 30000;
const POLL_INTERVAL = 30000;

const VotePanel: React.FC = () => {
  const [voteSession, setVoteSession] = useState<VoteSession | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [showStartForm, setShowStartForm] = useState(false);
  const [voteTopic, setVoteTopic] = useState('返场曲目投票');
  const [hasVoted, setHasVoted] = useState(false);
  const [lastVoteTime, setLastVoteTime] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [voterId, setVoterId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const cooldownTimerRef = useRef<number | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const storedVoterId = localStorage.getItem('voterId');
    if (storedVoterId) {
      setVoterId(storedVoterId);
    }

    const storedLastVote = localStorage.getItem('lastVoteTime');
    if (storedLastVote) {
      const lastVote = parseInt(storedLastVote, 10);
      const elapsed = Date.now() - lastVote;
      if (elapsed < VOTE_COOLDOWN) {
        setHasVoted(true);
        setLastVoteTime(lastVote);
      }
    }

    loadInitialData();
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [voteData, playlistData] = await Promise.all([
        voteApi.getVoteStatus(),
        playlistApi.getPlaylist(),
      ]);
      setVoteSession(voteData);
      setSongs(playlistData);

      if (voteData.active) {
        startPolling();
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(async () => {
      try {
        const data = await voteApi.getVoteStatus();
        setVoteSession(data);
      } catch (error) {
        console.error('获取投票结果失败:', error);
      }
    }, POLL_INTERVAL);
  }, []);

  const startCooldownTimer = useCallback(() => {
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    const updateRemaining = () => {
      const remaining = Math.max(0, VOTE_COOLDOWN - (Date.now() - lastVoteTime));
      setCooldownRemaining(Math.ceil(remaining / 1000));
      if (remaining <= 0) {
        setHasVoted(false);
        if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
      }
    };
    updateRemaining();
    cooldownTimerRef.current = setInterval(updateRemaining, 1000);
  }, [lastVoteTime]);

  useEffect(() => {
    if (hasVoted && lastVoteTime > 0) {
      startCooldownTimer();
    }
  }, [hasVoted, lastVoteTime, startCooldownTimer]);

  const handleCandidateToggle = (songId: string) => {
    setSelectedCandidates((prev) => {
      if (prev.includes(songId)) {
        return prev.filter((id) => id !== songId);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, songId];
    });
  };

  const handleStartVote = async () => {
    if (selectedCandidates.length === 0) return;
    try {
      const newSession = await voteApi.startVote(voteTopic, selectedCandidates);
      setVoteSession(newSession as unknown as VoteSession);
      setShowStartForm(false);
      setSelectedCandidates([]);
      setVoteTopic('返场曲目投票');
      startPolling();
    } catch (error) {
      console.error('发起投票失败:', error);
    }
  };

  const handleVote = async (candidateId: string) => {
    if (hasVoted) return;
    try {
      const result = await voteApi.castVote(candidateId, voterId || '');
      if (!voterId) {
        setVoterId(result.voterId);
        localStorage.setItem('voterId', result.voterId);
      }
      const now = Date.now();
      setLastVoteTime(now);
      localStorage.setItem('lastVoteTime', now.toString());
      setHasVoted(true);

      const updated = await voteApi.getVoteStatus();
      setVoteSession(updated);
    } catch (error) {
      console.error('投票失败:', error);
    }
  };

  const handleEndVote = async () => {
    try {
      await voteApi.endVote();
      setVoteSession({ active: false });
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    } catch (error) {
      console.error('结束投票失败:', error);
    }
  };

  const calculatePercentage = (votes: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((votes / total) * 100);
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="vote-panel">
      <div className="vote-header">
        <h2>返场投票</h2>
        {!voteSession?.active && (
          <button className="btn-primary" onClick={() => setShowStartForm(true)}>
            + 发起投票
          </button>
        )}
        {voteSession?.active && (
          <button className="btn-secondary" onClick={handleEndVote}>
            结束投票
          </button>
        )}
      </div>

      {showStartForm && (
        <div className="start-vote-form">
          <h3>发起新投票</h3>
          <div className="form-group">
            <label>投票主题</label>
            <input
              type="text"
              value={voteTopic}
              onChange={(e) => setVoteTopic(e.target.value)}
              placeholder="请输入投票主题"
            />
          </div>
          <div className="form-group">
            <label>选择候选曲目（最多3首）</label>
            <div className="candidate-list">
              {songs.map((song) => (
                <div
                  key={song.id}
                  className={`candidate-item ${selectedCandidates.includes(song.id) ? 'selected' : ''}`}
                  onClick={() => handleCandidateToggle(song.id)}
                >
                  <div className="candidate-checkbox">
                    {selectedCandidates.includes(song.id) && <span>✓</span>}
                  </div>
                  <div className="candidate-info">
                    <div className="candidate-name">{song.name}</div>
                    <div className="candidate-artist">{song.artist}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setShowStartForm(false)}>
              取消
            </button>
            <button
              className="btn-primary"
              onClick={handleStartVote}
              disabled={selectedCandidates.length === 0}
            >
              开始投票
            </button>
          </div>
        </div>
      )}

      {voteSession?.active && voteSession.candidates && (
        <div className="vote-active-section">
          <div className="vote-topic">
            <h3>{voteSession.topic}</h3>
            <span className="vote-total">总票数: {voteSession.totalVotes || 0}</span>
          </div>

          <div className="vote-bars">
            {voteSession.candidates.map((candidate) => {
              const percentage = calculatePercentage(
                candidate.votes,
                voteSession.totalVotes || 0
              );
              return (
                <div key={candidate.id} className="vote-bar-item">
                  <div className="vote-bar-label">{candidate.name}</div>
                  <div className="vote-bar-container">
                    <div
                      className="vote-bar-fill"
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="vote-bar-info">
                      <span className="vote-count">{candidate.votes} 票</span>
                      <span className="vote-percent">{percentage}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="vote-actions">
            <p className="vote-hint">
              {hasVoted
                ? `冷却中，${cooldownRemaining}秒后可再次投票`
                : '选择你想听的返场曲目，每30秒可投一票'}
            </p>
            <div className="vote-buttons">
              {voteSession.candidates.map((candidate) => (
                <button
                  key={candidate.id}
                  className={`vote-btn ${hasVoted ? 'voted' : ''}`}
                  onClick={() => handleVote(candidate.id)}
                  disabled={hasVoted}
                >
                  {hasVoted ? '已投' : '投票'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!voteSession?.active && !showStartForm && (
        <div className="vote-empty">
          <div className="vote-empty-icon">🎵</div>
          <p>暂无进行中的投票</p>
          <p className="vote-empty-hint">点击上方"发起投票"按钮开始一轮投票</p>
        </div>
      )}
    </div>
  );
};

export default VotePanel;
