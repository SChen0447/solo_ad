import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ChartRealtime } from './ChartRealtime';
import { voteApi } from '../api/voteApi';
import { socketService } from '../services/socketService';
import { useVoteContext } from '../App';
import type { Vote, VoteOption } from '../types';

export const VoteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentVote, setCurrentVote, updateVote } = useVoteContext();

  const [vote, setVote] = useState<Vote | null>(currentVote);
  const [loading, setLoading] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [hasVoted, setHasVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'options' | 'chart'>('options');

  useEffect(() => {
    socketService.connect();
    return () => {
      if (id) {
        socketService.leaveRoom(id);
      }
    };
  }, [id]);

  useEffect(() => {
    if (id && socketService.isConnected()) {
      socketService.joinRoom(id);
    }
  }, [id]);

  useEffect(() => {
    const handleUpdate = (data: Vote) => {
      setVote(data);
      updateVote(data);
    };

    socketService.on('update', handleUpdate);
    return () => socketService.off('update', handleUpdate);
  }, [updateVote]);

  useEffect(() => {
    const fetchVote = async () => {
      if (!id) return;

      try {
        const data = await voteApi.getVote(id);
        setVote(data);
        setCurrentVote(data);
        setLoading(false);
      } catch (error) {
        console.error('获取投票详情失败:', error);
        setLoading(false);
      }
    };

    if (!currentVote || currentVote.id !== id) {
      fetchVote();
    } else {
      setLoading(false);
    }
  }, [id, currentVote, setCurrentVote]);

  const handleOptionClick = useCallback((optionId: string) => {
    if (!vote || vote.status !== 'active' || hasVoted) return;

    if (vote.type === 'single') {
      setSelectedOptions([optionId]);
    } else if (vote.type === 'multiple') {
      setSelectedOptions(prev =>
        prev.includes(optionId)
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      );
    }
  }, [vote, hasVoted]);

  const handleRatingChange = useCallback((optionId: string, rating: number) => {
    if (!vote || vote.status !== 'active' || hasVoted) return;
    setRatings(prev => ({ ...prev, [optionId]: rating }));
  }, [vote, hasVoted]);

  const handleSubmit = async () => {
    if (!vote || isSubmitting) return;

    if (vote.type !== 'rating' && selectedOptions.length === 0) {
      alert('请至少选择一个选项');
      return;
    }

    if (vote.type === 'rating') {
      const allRated = vote.options.every(opt => ratings[opt.id] !== undefined);
      if (!allRated) {
        alert('请为所有选项评分');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await voteApi.submitVote({
        voteId: vote.id,
        optionIds: selectedOptions,
        ratings: vote.type === 'rating' ? ratings : undefined
      });
      setHasVoted(true);
    } catch (error) {
      console.error('提交投票失败:', error);
      alert('提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndVote = async () => {
    if (!vote) return;

    if (!confirm('确定要结束此投票吗？结束后将无法继续投票。')) {
      return;
    }

    try {
      const updated = await voteApi.endVote(vote.id);
      setVote(updated);
      updateVote(updated);
    } catch (error) {
      console.error('结束投票失败:', error);
      alert('操作失败，请重试');
    }
  };

  const calculatePercentage = (option: VoteOption) => {
    if (!vote || vote.totalVotes === 0) return 0;
    if (vote.type === 'rating') {
      return (option.rating || 0) * 20;
    }
    return Math.round((option.votes / vote.totalVotes) * 100);
  };

  if (loading) {
    return (
      <div className="vote-detail-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (!vote) {
    return (
      <div className="vote-detail-container">
        <div className="empty-state">
          <div className="empty-icon">❓</div>
          <h3>投票不存在</h3>
          <p>该投票可能已被删除或链接无效</p>
        </div>
      </div>
    );
  }

  const statusText = {
    pending: '未开始',
    active: '进行中',
    ended: '已结束'
  };

  const statusColor = {
    pending: '#a29bfe',
    active: '#00d2ff',
    ended: '#636e72'
  };

  return (
    <div className="vote-detail-container">
      <div className="detail-header">
        <div>
          <h2 className="vote-title">{vote.title}</h2>
          {vote.description && (
            <p className="vote-description">{vote.description}</p>
          )}
        </div>
        <div className="header-actions">
          <span
            className="status-badge"
            style={{ backgroundColor: `${statusColor[vote.status]}20`, color: statusColor[vote.status] }}
          >
            {statusText[vote.status]}
          </span>
          {vote.status === 'active' && (
            <button className="btn btn-danger" onClick={handleEndVote}>
              结束投票
            </button>
          )}
        </div>
      </div>

      <div className="detail-stats">
        <div className="stat-item">
          <span className="stat-value">{vote.totalVotes}</span>
          <span className="stat-label">参与人数</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{vote.options.length}</span>
          <span className="stat-label">选项数量</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">
            {new Date(vote.endTime).toLocaleDateString('zh-CN')}
          </span>
          <span className="stat-label">截止日期</span>
        </div>
      </div>

      <div className="detail-tabs mobile-only">
        <button
          className={`tab-btn ${activeTab === 'options' ? 'active' : ''}`}
          onClick={() => setActiveTab('options')}
        >
          投票选项
        </button>
        <button
          className={`tab-btn ${activeTab === 'chart' ? 'active' : ''}`}
          onClick={() => setActiveTab('chart')}
        >
          实时图表
        </button>
      </div>

      <div className="detail-content">
        <div className={`options-section ${activeTab === 'options' ? 'show' : ''}`}>
          <div className="section-header">
            <h3>投票选项</h3>
            {hasVoted && <span className="voted-badge">已投票</span>}
          </div>

          <div className="options-list-detail">
            {vote.options.map((option, index) => {
              const percentage = calculatePercentage(option);
              const isSelected = selectedOptions.includes(option.id);
              const rating = ratings[option.id] || 0;

              return (
                <div
                  key={option.id}
                  className={`option-card ${isSelected ? 'selected' : ''} ${vote.status !== 'active' || hasVoted ? 'disabled' : ''}`}
                  onClick={() => vote.type !== 'rating' && handleOptionClick(option.id)}
                >
                  <div className="option-card-header">
                    <span className="option-index-badge" style={{ animationDelay: `${index * 0.1}s` }}>
                      {index + 1}
                    </span>
                    <span className="option-text">{option.text}</span>
                    {(vote.status !== 'active' || hasVoted) && vote.type !== 'rating' && (
                      <span className="option-count">
                        {option.votes} 票 ({percentage}%)
                      </span>
                    )}
                  </div>

                  {vote.type === 'rating' ? (
                    <div className="rating-stars" onClick={e => e.stopPropagation()}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <span
                          key={star}
                          className={`star ${star <= rating ? 'filled' : ''}`}
                          onClick={() => handleRatingChange(option.id, star)}
                        >
                          ★
                        </span>
                      ))}
                      {rating > 0 && <span className="rating-value">{rating}.0</span>}
                    </div>
                  ) : (
                    <div className="option-progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${percentage}%`, transition: 'width 0.5s ease' }}
                      ></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {vote.status === 'active' && !hasVoted && (
            <button
              className="btn btn-primary submit-vote-btn"
              onClick={handleSubmit}
              disabled={isSubmitting || (vote.type !== 'rating' && selectedOptions.length === 0)}
            >
              {isSubmitting ? '提交中...' : '提交投票'}
            </button>
          )}

          {hasVoted && (
            <div className="voted-notice">
              <span className="check-icon">✓</span>
              感谢您的参与！结果正在实时更新中...
            </div>
          )}
        </div>

        <div className={`chart-section glass-panel ${activeTab === 'chart' ? 'show' : ''}`}>
          <div className="section-header">
            <h3>实时结果</h3>
            <span className="live-indicator">
              <span className="live-dot"></span>
              实时更新
            </span>
          </div>
          <ChartRealtime vote={vote} />
        </div>
      </div>
    </div>
  );
};

export default VoteDetail;
