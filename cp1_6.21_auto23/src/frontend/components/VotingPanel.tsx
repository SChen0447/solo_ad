import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Activity, VoteOption } from '../types';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { getUserId, formatDate } from '../utils';

export default function VotingPanel() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [userVoteId, setUserVoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [animatingOption, setAnimatingOption] = useState<string | null>(null);
  const userIdRef = useRef(getUserId());
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        const [act, vote] = await Promise.all([
          api.getActivity(id),
          api.getUserVote(id, userIdRef.current),
        ]);
        setActivity(act);
        setUserVoteId(vote ? vote.optionId : null);
      } catch (err) {
        console.error('Failed to load activity:', err);
      } finally {
        setLoading(false);
        hasLoadedRef.current = true;
      }
    };

    loadData();

    const socket = getSocket();
    const handleVoteUpdated = (data: { activityId: string; activity: Activity }) => {
      if (data.activityId === id) {
        setActivity(data.activity);
      }
    };

    socket.on('vote:updated', handleVoteUpdated);

    return () => {
      socket.off('vote:updated', handleVoteUpdated);
    };
  }, [id]);

  const handleVote = async (optionId: string) => {
    if (!activity || voting) return;

    setVoting(true);
    setAnimatingOption(optionId);

    try {
      if (userVoteId === optionId) {
        await api.unvote(activity.id, userIdRef.current);
        setUserVoteId(null);
      } else {
        await api.vote(activity.id, optionId, userIdRef.current);
        setUserVoteId(optionId);
      }
    } catch (err) {
      console.error('Vote failed:', err);
    } finally {
      setTimeout(() => {
        setAnimatingOption(null);
        setVoting(false);
      }, 300);
    }
  };

  const copyShareLink = () => {
    if (!activity) return;
    const url = `${window.location.origin}/activity/${activity.id}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('分享链接已复制到剪贴板！');
    });
  };

  const getSortedOptions = (): VoteOption[] => {
    if (!activity) return [];
    return [...activity.options].sort((a, b) => {
      if (b.votes !== a.votes) return b.votes - a.votes;
      return a.id.localeCompare(b.id);
    });
  };

  const getRank = (optionId: string): number => {
    const sorted = getSortedOptions();
    return sorted.findIndex((o) => o.id === optionId) + 1;
  };

  const maxVotes = activity ? Math.max(...activity.options.map((o) => o.votes), 1) : 1;

  if (loading) {
    return (
      <div className="page voting-page">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="page voting-page">
        <div className="error-state">
          <h2>活动不存在</h2>
          <button onClick={() => navigate('/')} className="primary-btn">
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const sortedOptions = getSortedOptions();

  return (
    <div className="page voting-page">
      <div className="voting-header">
        <button onClick={() => navigate('/')} className="back-btn">
          ← 返回
        </button>
        <button onClick={copyShareLink} className="share-btn">
          📤 分享
        </button>
      </div>

      <div className="voting-info-card">
        <h1 className="activity-title">{activity.title}</h1>
        {activity.description && (
          <p className="activity-description">{activity.description}</p>
        )}
        <div className="activity-meta">
          <span className="meta-item">
            📊 总票数: <strong>{activity.totalVotes}</strong>
          </span>
          <span className="meta-item">
            🕐 创建于: {formatDate(activity.createdAt)}
          </span>
          {activity.deadline && (
            <span className="meta-item">
              ⏰ 截止: {formatDate(activity.deadline)}
            </span>
          )}
        </div>
      </div>

      <div className="options-container">
        {sortedOptions.map((option, index) => {
          const isVoted = userVoteId === option.id;
          const isAnimating = animatingOption === option.id;
          const rank = index + 1;
          const percentage = activity.totalVotes > 0
            ? (option.votes / activity.totalVotes) * 100
            : 0;

          return (
            <div
              key={option.id}
              className={`vote-option-card ${isVoted ? 'voted' : ''} ${isAnimating ? 'animating' : ''} rank-${rank}`}
            >
              <div className="option-rank">
                <span className={`rank-badge rank-${rank}`}>{rank}</span>
              </div>

              <div className="option-content">
                <div className="option-header">
                  <span className="option-text">{option.text}</span>
                  <span className="option-votes">
                    {option.votes} 票
                  </span>
                </div>

                <div className="progress-bar-container">
                  <div
                    className={`progress-bar ${rank === 1 ? 'first' : ''}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              <button
                onClick={() => handleVote(option.id)}
                className={`vote-btn ${isVoted ? 'voted' : ''}`}
                disabled={voting}
              >
                <span className="vote-icon">{isVoted ? '❤️' : '🤍'}</span>
                <span className="vote-text">{isVoted ? '已投票' : '投票'}</span>
              </button>
            </div>
          );
        })}
      </div>

      <div className="voting-tip">
        💡 提示：每个活动只能投一票，但可以随时改投其他选项
      </div>
    </div>
  );
}
