import { useEffect, useState, useRef } from 'react';
import type { Stage, Comment } from '../types';
import VoteForm from '../components/VoteForm';
import AdminPanel from './AdminPanel';
import '../styles/LiveDashboard.css';

const LiveDashboard = () => {
  const [stages, setStages] = useState<Stage[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const lastCommentTime = useRef<number>(0);
  const [currentView, setCurrentView] = useState<'dashboard' | 'vote' | 'admin'>('dashboard');

  useEffect(() => {
    fetchStages();
    fetchComments();

    const stagesInterval = setInterval(fetchStages, 5000);
    const commentsInterval = setInterval(fetchNewComments, 3000);

    return () => {
      clearInterval(stagesInterval);
      clearInterval(commentsInterval);
    };
  }, []);

  const fetchStages = async () => {
    try {
      const res = await fetch('/api/stages');
      const data = await res.json();
      setStages(data);
    } catch (err) {
      console.error('获取舞台数据失败:', err);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await fetch('/api/comments');
      const data = await res.json();
      setComments(data);
      if (data.length > 0) {
        lastCommentTime.current = data[0].createdAt;
      }
    } catch (err) {
      console.error('获取评论失败:', err);
    }
  };

  const fetchNewComments = async () => {
    try {
      const res = await fetch(`/api/comments?since=${lastCommentTime.current}`);
      const data = await res.json();
      if (data.length > 0) {
        setComments((prev) => {
          const newComments = [...data, ...prev].slice(0, 200);
          return newComments;
        });
        lastCommentTime.current = data[0].createdAt;
      }
    } catch (err) {
      console.error('获取新评论失败:', err);
    }
  };

  const getHeatColor = (average: number): string => {
    if (average === 0) return 'rgba(255,255,255,0.1)';
    if (average <= 2) return '#ff4d4f';
    if (average <= 3.5) return '#fadb14';
    return '#52c41a';
  };

  const renderStars = (rating: number, size: number = 14) => {
    return (
      <div className="stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${star <= rating ? 'filled' : ''}`}
            style={{ fontSize: `${size}px` }}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <h1 className="dashboard-title">🎵 音乐节互动看板</h1>
        <div className="nav-buttons">
          <button
            className={`nav-btn ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('dashboard')}
          >
            主看板
          </button>
          <button
            className={`nav-btn ${currentView === 'vote' ? 'active' : ''}`}
            onClick={() => setCurrentView('vote')}
          >
            我要投票
          </button>
          <button
            className={`nav-btn ${currentView === 'admin' ? 'active' : ''}`}
            onClick={() => setCurrentView('admin')}
          >
            后台管理
          </button>
        </div>
      </nav>

      {currentView === 'dashboard' && (
        <div className="dashboard-content">
          <section className="heatmap-section">
            <h2 className="section-title">🔥 实时热力图</h2>
            <div className="heatmap-grid">
              {stages.length === 0 ? (
                <div className="empty-state">暂无舞台数据</div>
              ) : (
                stages.map((stage) => (
                  <div
                    key={stage.id}
                    className="stage-card"
                    style={{ backgroundColor: getHeatColor(stage.average) }}
                  >
                    <div className="stage-card-header">
                      <span className="stage-code">#{stage.code}</span>
                      <span className={`vote-status ${stage.votingEnabled ? 'on' : 'off'}`}>
                        {stage.votingEnabled ? '投票中' : '已关闭'}
                      </span>
                    </div>
                    <h3 className="stage-name">{stage.name}</h3>
                    <div className="stage-stats">
                      <div className="stat-item">
                        <span className="stat-value">{stage.average.toFixed(1)}</span>
                        <span className="stat-label">平均分</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-value">{stage.count}</span>
                        <span className="stat-label">投票数</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-value">{stage.max}</span>
                        <span className="stat-label">最高分</span>
                      </div>
                    </div>
                    <div className="stage-time">开始时间: {stage.startTime}</div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="comments-section">
            <h2 className="section-title">💬 实时评论墙</h2>
            <div className="comments-wall">
              {comments.length === 0 ? (
                <div className="empty-state">暂无评论</div>
              ) : (
                comments.map((comment, index) => (
                  <div
                    key={comment.id}
                    className="comment-item"
                    style={{
                      animation: index === 0 ? 'fadeIn 0.3s ease' : 'none',
                    }}
                  >
                    <div
                      className="comment-avatar"
                      style={{ background: comment.avatar }}
                    >
                      {comment.nickname.charAt(0).toUpperCase()}
                    </div>
                    <div className="comment-content">
                      <div className="comment-header">
                        <span className="comment-nickname">{comment.nickname}</span>
                        <span className="comment-seat">{comment.seatNumber}</span>
                        <span className="comment-stage">{comment.stageName}</span>
                      </div>
                      <div className="comment-rating">{renderStars(comment.rating)}</div>
                      <p className="comment-text">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {currentView === 'vote' && <VoteForm onSuccess={fetchComments} />}
      {currentView === 'admin' && <AdminPanel onStageChange={fetchStages} />}
    </div>
  );
};

export default LiveDashboard;
