import React, { useState, useCallback, useEffect } from 'react';
import type { MatchSuggestion } from '@/types';
import { fetchMatches, confirmExchange } from '@/utils/storage';

const ExchangePage: React.FC = React.memo(() => {
  const [matches, setMatches] = useState<MatchSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const loadMatches = useCallback(async () => {
    try {
      const data = await fetchMatches();
      setMatches(data);
    } catch {
      setMessage('加载匹配建议失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const handleConfirm = useCallback(
    async (giftAId: string, giftBId: string, matchId: string) => {
      setConfirming(matchId);
      try {
        await confirmExchange(giftAId, giftBId);
        setMessage('交换成功！🎉');
        setMatches((prev) => prev.filter((m) => m.giftA.id !== giftAId && m.giftB.id !== giftBId));
      } catch {
        setMessage('交换确认失败，请重试');
      } finally {
        setConfirming(null);
        setTimeout(() => setMessage(''), 3000);
      }
    },
    []
  );

  const handleRefresh = useCallback(() => {
    setLoading(true);
    loadMatches();
  }, [loadMatches]);

  if (loading) return <div className="page-loading">加载匹配建议中...</div>;

  return (
    <div className="exchange-page">
      <div className="exchange-page__header">
        <h2>🔄 交换匹配</h2>
        <button className="exchange-page__refresh" onClick={handleRefresh}>
          刷新建议
        </button>
      </div>

      {message && <div className="exchange-page__message">{message}</div>}

      {matches.length === 0 ? (
        <div className="exchange-page__empty">
          <p>暂无匹配建议。请确保有不同城市的同类别礼物，且价值相近。</p>
        </div>
      ) : (
        <div className="exchange-page__list">
          {matches.map((match) => (
            <div key={`${match.giftA.id}-${match.giftB.id}`} className="match-card">
              <div className="match-card__pair">
                <div className="match-card__gift">
                  <img
                    src={match.giftA.photoUrl}
                    alt={match.giftA.name}
                    className="match-card__thumb"
                  />
                  <div className="match-card__gift-info">
                    <span className="match-card__gift-name">{match.giftA.name}</span>
                    <span className="match-card__gift-city">📍 {match.giftA.city}</span>
                    <span className="match-card__gift-value">¥{match.giftA.value}</span>
                  </div>
                </div>

                <div className="match-card__arrow">⇄</div>

                <div className="match-card__gift">
                  <img
                    src={match.giftB.photoUrl}
                    alt={match.giftB.name}
                    className="match-card__thumb"
                  />
                  <div className="match-card__gift-info">
                    <span className="match-card__gift-name">{match.giftB.name}</span>
                    <span className="match-card__gift-city">📍 {match.giftB.city}</span>
                    <span className="match-card__gift-value">¥{match.giftB.value}</span>
                  </div>
                </div>
              </div>

              <div className="match-card__footer">
                <span className="match-card__score">
                  匹配度 {Math.round(match.score * 100)}% · {match.giftA.category}
                </span>
                <button
                  className="match-card__confirm"
                  onClick={() =>
                    handleConfirm(
                      match.giftA.id,
                      match.giftB.id,
                      `${match.giftA.id}-${match.giftB.id}`
                    )
                  }
                  disabled={confirming === `${match.giftA.id}-${match.giftB.id}`}
                >
                  {confirming === `${match.giftA.id}-${match.giftB.id}`
                    ? '确认中...'
                    : '同意交换'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

ExchangePage.displayName = 'ExchangePage';

export default ExchangePage;
