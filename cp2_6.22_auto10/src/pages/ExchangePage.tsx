import React, { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MatchSuggestion } from '../types';
import { api } from '../utils/api';
import './ExchangePage.css';

const MatchCard: React.FC<{
  suggestion: MatchSuggestion;
  onConfirm: (suggestion: MatchSuggestion) => void;
  confirming: boolean;
}> = memo(({ suggestion, onConfirm, confirming }) => {
  const navigate = useNavigate();

  return (
    <div className="match-card">
      <div className="match-header">
        <span className="match-score">匹配度 {suggestion.matchScore}%</span>
      </div>

      <div className="match-gifts">
        <div
          className="match-gift"
          onClick={() => navigate(`/gift/${suggestion.gift1.id}`)}
        >
          <img src={suggestion.gift1.photoUrl} alt={suggestion.gift1.name} />
          <div className="match-gift-info">
            <p className="match-gift-name">{suggestion.gift1.name}</p>
            <p className="match-gift-city">📍 {suggestion.gift1.city}</p>
          </div>
        </div>

        <div className="match-icon">
          <span>🤝</span>
        </div>

        <div
          className="match-gift"
          onClick={() => navigate(`/gift/${suggestion.gift2.id}`)}
        >
          <img src={suggestion.gift2.photoUrl} alt={suggestion.gift2.name} />
          <div className="match-gift-info">
            <p className="match-gift-name">{suggestion.gift2.name}</p>
            <p className="match-gift-city">📍 {suggestion.gift2.city}</p>
          </div>
        </div>
      </div>

      <div className="match-reasons">
        {suggestion.reasons.map((reason, index) => (
          <span key={index} className="match-reason-tag">
            {reason}
          </span>
        ))}
      </div>

      <button
        className="confirm-btn"
        onClick={() => onConfirm(suggestion)}
        disabled={confirming}
      >
        {confirming ? '确认中...' : '同意交换'}
      </button>
    </div>
  );
});

MatchCard.displayName = 'MatchCard';

const ExchangePage: React.FC = () => {
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getMatches();
      setSuggestions(data);
    } catch (err) {
      console.error('Failed to fetch matches:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSuggestions = useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await api.getMatches();
      setSuggestions(data);
    } catch (err) {
      console.error('Failed to refresh matches:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const handleConfirm = useCallback(
    async (suggestion: MatchSuggestion) => {
      setConfirmingId(suggestion.id);
      try {
        await api.confirmMatch(
          suggestion.id,
          suggestion.gift1.id,
          suggestion.gift2.id
        );
        setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
      } catch (err) {
        console.error('Failed to confirm match:', err);
        alert('确认交换失败，请重试');
      } finally {
        setConfirmingId(null);
      }
    },
    []
  );

  return (
    <div className="exchange-page">
      <div className="page-header">
        <h1>交换匹配</h1>
        <button
          className="refresh-btn"
          onClick={refreshSuggestions}
          disabled={refreshing || loading}
        >
          {refreshing ? '刷新中...' : '🔄 刷新匹配'}
        </button>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : suggestions.length === 0 ? (
        <div className="empty-matches">
          <div className="empty-icon">🎁</div>
          <h3>暂无匹配建议</h3>
          <p>当前待交换礼物不足，快去登记更多礼物吧！</p>
        </div>
      ) : (
        <div className="match-list">
          {suggestions.map((suggestion) => (
            <MatchCard
              key={suggestion.id}
              suggestion={suggestion}
              onConfirm={handleConfirm}
              confirming={confirmingId === suggestion.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ExchangePage;
