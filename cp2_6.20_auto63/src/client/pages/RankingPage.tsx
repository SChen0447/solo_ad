import { useState, useEffect } from 'react';
import { userApi } from '../api';
import { RankUser } from '../types';
import { getCertificationBorderColor } from '../utils/colors';

function RankingPage() {
  const [rankings, setRankings] = useState<RankUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRankings();
  }, []);

  const loadRankings = async () => {
    try {
      const data = await userApi.getRanking();
      setRankings(data);
    } catch (error) {
      console.error('加载排行榜失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const topThree = rankings.slice(0, 3);
  const rest = rankings.slice(3);

  const getTrophyEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🏆';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '';
    }
  };

  const getMedalClass = (rank: number) => {
    switch (rank) {
      case 1: return 'gold';
      case 2: return 'silver';
      case 3: return 'bronze';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="ranking-container">
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <p className="empty-state-text">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ranking-container">
      <h1 className="ranking-title">🏆 服务时长排行榜</h1>

      {rankings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <p className="empty-state-text">暂无排名数据</p>
        </div>
      ) : (
        <>
          <div className="ranking-podium">
            {topThree.length >= 2 && (
              <div className="podium-item">
                <div className={`podium-trophy ${getMedalClass(2)}`}>
                  {getTrophyEmoji(2)}
                </div>
                <div 
                  className="podium-avatar"
                  style={{ 
                    borderColor: getCertificationBorderColor(topThree[1].certificationLevel),
                    background: `linear-gradient(135deg, #F59E0B, ${getCertificationBorderColor(topThree[1].certificationLevel)})`
                  }}
                >
                  {topThree[1].nickname.charAt(0)}
                </div>
                <div className="podium-name">{topThree[1].nickname}</div>
                <div className="podium-hours">{topThree[1].totalHours} 小时</div>
                <div className={`podium-stand ${getMedalClass(2)}`}>2</div>
              </div>
            )}

            {topThree.length >= 1 && (
              <div className="podium-item">
                <div className={`podium-trophy ${getMedalClass(1)}`}>
                  {getTrophyEmoji(1)}
                </div>
                <div 
                  className="podium-avatar"
                  style={{ 
                    borderColor: getCertificationBorderColor(topThree[0].certificationLevel),
                    background: `linear-gradient(135deg, #F59E0B, ${getCertificationBorderColor(topThree[0].certificationLevel)})`
                  }}
                >
                  {topThree[0].nickname.charAt(0)}
                </div>
                <div className="podium-name">{topThree[0].nickname}</div>
                <div className="podium-hours">{topThree[0].totalHours} 小时</div>
                <div className={`podium-stand ${getMedalClass(1)}`}>1</div>
              </div>
            )}

            {topThree.length >= 3 && (
              <div className="podium-item">
                <div className={`podium-trophy ${getMedalClass(3)}`}>
                  {getTrophyEmoji(3)}
                </div>
                <div 
                  className="podium-avatar"
                  style={{ 
                    borderColor: getCertificationBorderColor(topThree[2].certificationLevel),
                    background: `linear-gradient(135deg, #F59E0B, ${getCertificationBorderColor(topThree[2].certificationLevel)})`
                  }}
                >
                  {topThree[2].nickname.charAt(0)}
                </div>
                <div className="podium-name">{topThree[2].nickname}</div>
                <div className="podium-hours">{topThree[2].totalHours} 小时</div>
                <div className={`podium-stand ${getMedalClass(3)}`}>3</div>
              </div>
            )}
          </div>

          {rest.length > 0 && (
            <div className="ranking-list">
              {rest.map((user, index) => (
                <div 
                  key={user.id} 
                  className="ranking-list-item fade-in-up-item"
                  style={{ animationDelay: `${0.05 * index}s` }}
                >
                  <div className="ranking-list-rank">{user.rank}</div>
                  <div 
                    className="ranking-list-avatar"
                    style={{ 
                      borderColor: getCertificationBorderColor(user.certificationLevel),
                      background: `linear-gradient(135deg, #F59E0B, ${getCertificationBorderColor(user.certificationLevel)})`
                    }}
                  >
                    {user.nickname.charAt(0)}
                  </div>
                  <div className="ranking-list-info">
                    <div className="ranking-list-name">{user.nickname}</div>
                  </div>
                  <div className="ranking-list-hours">{user.totalHours} 小时</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default RankingPage;
