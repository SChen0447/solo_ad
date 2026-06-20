import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { voteApi } from '../api/voteApi';
import { useVoteContext } from '../App';
import type { Vote, VoteStatus } from '../types';

const statusConfig: Record<VoteStatus, { label: string; color: string }> = {
  pending: { label: '未开始', color: '#a29bfe' },
  active: { label: '进行中', color: '#00d2ff' },
  ended: { label: '已结束', color: '#636e72' }
};

export const VoteList: React.FC = () => {
  const navigate = useNavigate();
  const { votes, setVotes, setCurrentVote } = useVoteContext();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVotes = async () => {
      try {
        const data = await voteApi.getVoteList();
        setVotes(data);
        setLoading(false);
      } catch (error) {
        console.error('获取投票列表失败:', error);
        setLoading(false);
      }
    };

    fetchVotes();
  }, [setVotes]);

  const handleVoteClick = (vote: Vote) => {
    setCurrentVote(vote);
    navigate(`/vote/${vote.id}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="vote-list-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="vote-list-container">
      <div className="list-header">
        <h2>投票列表</h2>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/create')}
        >
          + 创建投票
        </button>
      </div>

      {votes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>暂无投票</h3>
          <p>点击上方按钮创建你的第一个投票</p>
        </div>
      ) : (
        <div className="vote-grid">
          {votes.map(vote => (
            <div
              key={vote.id}
              className="vote-card card"
              onClick={() => handleVoteClick(vote)}
            >
              <div className="vote-card-header">
                <h3 className="vote-title">{vote.title}</h3>
                <span
                  className="vote-status"
                  style={{ color: statusConfig[vote.status].color, borderColor: statusConfig[vote.status].color }}
                >
                  {statusConfig[vote.status].label}
                </span>
              </div>

              {vote.description && (
                <p className="vote-description">{vote.description}</p>
              )}

              <div className="vote-meta">
                <div className="meta-item">
                  <span className="meta-icon">👥</span>
                  <span>{vote.totalVotes} 人参与</span>
                </div>
                <div className="meta-item">
                  <span className="meta-icon">📋</span>
                  <span>{vote.options.length} 个选项</span>
                </div>
              </div>

              <div className="vote-card-footer">
                <span className="end-time">
                  截止: {formatDate(vote.endTime)}
                </span>
                <span className="view-detail">查看详情 →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VoteList;
