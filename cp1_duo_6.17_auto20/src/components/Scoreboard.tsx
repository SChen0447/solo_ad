import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface ScoreboardProps {
  playerId?: string;
  showLeft?: boolean;
  showRight?: boolean;
  playerWins?: number;
  playerLosses?: number;
  enemyWins?: number;
  enemyLosses?: number;
}

const Scoreboard: React.FC<ScoreboardProps> = ({
  playerId,
  showLeft = true,
  showRight = true,
  playerWins = 0,
  playerLosses = 0,
  enemyWins = 0,
  enemyLosses = 0
}) => {
  const [stats, setStats] = useState({ wins: playerWins, losses: playerLosses });
  const [enemyStats, setEnemyStats] = useState({ wins: enemyWins, losses: enemyLosses });

  useEffect(() => {
    if (playerId) {
      fetchStats(playerId);
    }
  }, [playerId]);

  useEffect(() => {
    setStats({ wins: playerWins, losses: playerLosses });
  }, [playerWins, playerLosses]);

  useEffect(() => {
    setEnemyStats({ wins: enemyWins, losses: enemyLosses });
  }, [enemyWins, enemyLosses]);

  const fetchStats = async (id: string) => {
    try {
      const response = await axios.get('/api/scoreboard', {
        params: { player_id: id }
      });
      if (response.data.success) {
        setStats({
          wins: response.data.wins,
          losses: response.data.losses
        });
      }
    } catch (error) {
      console.error('Failed to fetch scoreboard:', error);
    }
  };

  const winRate = (wins: number, losses: number) => {
    const total = wins + losses;
    if (total === 0) return 0;
    return Math.round((wins / total) * 100);
  };

  return (
    <div className="scoreboard">
      {showLeft && (
        <div className="score-panel parchment-texture">
          <h3>我方战绩</h3>
          <div className="win-loss">
            <span className="wins">胜: {stats.wins}</span>
            <span className="losses">负: {stats.losses}</span>
          </div>
          <div style={{ marginTop: '4px', fontSize: '0.8rem', color: '#c9a847' }}>
            胜率: {winRate(stats.wins, stats.losses)}%
          </div>
        </div>
      )}
      
      {showRight && (
        <div className="score-panel parchment-texture">
          <h3>对手战绩</h3>
          <div className="win-loss">
            <span className="wins">胜: {enemyStats.wins}</span>
            <span className="losses">负: {enemyStats.losses}</span>
          </div>
          <div style={{ marginTop: '4px', fontSize: '0.8rem', color: '#c9a847' }}>
            胜率: {winRate(enemyStats.wins, enemyStats.losses)}%
          </div>
        </div>
      )}
    </div>
  );
};

export default Scoreboard;
