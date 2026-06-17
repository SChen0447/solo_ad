import React, { useState, useEffect } from 'react';
import Scoreboard from './Scoreboard';

interface ScorePageProps {
  playerId?: string;
  onBack?: () => void;
}

const ScorePage: React.FC<ScorePageProps> = ({ playerId = 'default', onBack }) => {
  const [stats, setStats] = useState({ wins: 0, losses: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedStats = localStorage.getItem('rune_alchemy_stats');
    if (savedStats) {
      setStats(JSON.parse(savedStats));
    }
    setLoading(false);
  }, []);

  const winRate = stats.wins + stats.losses > 0
    ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100)
    : 0;

  return (
    <div className="score-page parchment-texture">
      <h2>战绩统计</h2>
      
      {loading ? (
        <p>加载中...</p>
      ) : (
        <>
          <div className="stats-container">
            <div className="stat-box">
              <div className="stat-number wins">{stats.wins}</div>
              <div className="stat-label">胜利</div>
            </div>
            <div className="stat-box">
              <div className="stat-number losses">{stats.losses}</div>
              <div className="stat-label">失败</div>
            </div>
            <div className="stat-box">
              <div className="stat-number winrate">{winRate}%</div>
              <div className="stat-label">胜率</div>
            </div>
          </div>
          
          <div style={{ marginTop: '1rem', color: '#a89880', fontSize: '0.9rem' }}>
            总场次: {stats.wins + stats.losses}
          </div>
        </>
      )}
      
      <button className="back-button" onClick={onBack}>
        返回主菜单
      </button>
    </div>
  );
};

export default ScorePage;
