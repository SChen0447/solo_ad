import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { UserVoteHistory } from '../types';
import { api } from '../services/api';
import { formatDate } from '../utils';

interface HistoryProps {
  userId: string;
}

export default function History({ userId }: HistoryProps) {
  const [history, setHistory] = useState<UserVoteHistory[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<UserVoteHistory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const data = await api.getUserHistory(userId);
        setHistory(data);
        setFilteredHistory(data);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [userId]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredHistory(history);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = history.filter((item) =>
      item.activityTitle.toLowerCase().includes(query)
    );
    setFilteredHistory(filtered);
  }, [searchQuery, history]);

  if (loading) {
    return (
      <div className="page history-page">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="page history-page">
      <div className="page-header">
        <h1>我的投票</h1>
        <p>查看你参与过的所有投票活动</p>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="🔍 搜索活动名称..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="history-list">
        {filteredHistory.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3>暂无投票记录</h3>
            <p>
              {searchQuery ? '没有找到匹配的活动' : '你还没有参与过任何投票活动'}
            </p>
            <Link to="/" className="primary-btn">
              去看看
            </Link>
          </div>
        ) : (
          filteredHistory.map((item) => (
            <Link
              key={`${item.activityId}-${item.votedAt}`}
              to={`/activity/${item.activityId}`}
              className="history-card"
            >
              <div className="history-icon">
                <span>✅</span>
              </div>

              <div className="history-content">
                <h3 className="history-title">{item.activityTitle}</h3>
                <div className="history-vote-info">
                  <span className="vote-label">你的选择:</span>
                  <span className="vote-option-text">{item.optionText}</span>
                </div>
                <div className="history-time">
                  🕐 {formatDate(item.votedAt)}
                </div>
              </div>

              <div className="history-arrow">→</div>
            </Link>
          ))
        )}
      </div>

      {history.length > 0 && (
        <div className="history-stats">
          共 {history.length} 条投票记录
          {searchQuery && filteredHistory.length !== history.length && (
            <span className="search-result">，找到 {filteredHistory.length} 条</span>
          )}
        </div>
      )}
    </div>
  );
}
