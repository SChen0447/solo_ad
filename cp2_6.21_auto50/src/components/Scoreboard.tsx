import React from 'react';
import { RoomState, RoundHistory, Player } from '../types';

interface ScoreboardProps {
  roomState: RoomState;
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function getMedalEmoji(rank: number): string {
  switch (rank) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return '';
  }
}

const Scoreboard: React.FC<ScoreboardProps> = ({ roomState }) => {
  const sortedPlayers = [...roomState.players].sort((a, b) => b.score - a.score);
  const sortedHistory = [...roomState.roundHistory].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="scoreboard-container">
      <style>{`
        .scoreboard-container {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }
        @media (min-width: 768px) and (max-width: 1024px) {
          .scoreboard-container {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (min-width: 1024px) {
          .scoreboard-container {
            grid-template-columns: 1fr 1fr;
          }
        }
        .card {
          background: #E0F2FE;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .card h2 {
          color: #1E3A5F;
          margin: 0 0 16px 0;
          font-size: 20px;
        }
        .leaderboard {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .leaderboard-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 12px;
          background: linear-gradient(90deg, #FFFFFF 0%, #F0F9FF 100%);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .leaderboard-item:hover {
          transform: translateX(4px);
          box-shadow: 0 2px 8px rgba(30, 58, 95, 0.1);
        }
        .leaderboard-rank {
          width: 32px;
          text-align: center;
          font-size: 20px;
        }
        .leaderboard-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #FFDAB9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          color: #1E3A5F;
          font-size: 14px;
          flex-shrink: 0;
        }
        .leaderboard-info {
          flex: 1;
          min-width: 0;
        }
        .leaderboard-name {
          font-weight: 600;
          color: #1E3A5F;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .leaderboard-score {
          font-family: 'Courier New', 'Consolas', monospace;
          font-size: 24px;
          font-weight: bold;
          color: #1E3A5F;
          min-width: 80px;
          text-align: right;
        }
        .host-tag {
          display: inline-block;
          background: #FEF3C7;
          color: #D97706;
          padding: 2px 8px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 500;
          margin-left: 6px;
        }
        .history-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 500px;
          overflow-y: auto;
        }
        .history-item {
          display: flex;
          gap: 12px;
          padding: 12px;
          background: white;
          border-radius: 10px;
          align-items: flex-start;
        }
        .history-timestamp {
          font-size: 14px;
          color: #9CA3AF;
          white-space: nowrap;
          font-family: 'Courier New', 'Consolas', monospace;
          padding-top: 2px;
        }
        .history-content {
          flex: 1;
          min-width: 0;
        }
        .history-player {
          font-weight: 600;
          color: #1E3A5F;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .history-word {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 2px;
        }
        .history-word-text {
          color: #374151;
          font-family: 'Courier New', 'Consolas', monospace;
        }
        .history-result {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .result-correct {
          color: #10B981;
          font-weight: 600;
        }
        .result-wrong {
          color: #EF4444;
          font-weight: 600;
        }
        .history-bonus {
          display: inline-block;
          background: #FEF3C7;
          color: #D97706;
          padding: 1px 6px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
        }
        .round-tag {
          display: inline-block;
          background: #E0E7FF;
          color: #4338CA;
          padding: 1px 6px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 500;
        }
        .empty-state {
          text-align: center;
          color: #9CA3AF;
          padding: 32px 0;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .round-info {
          background: #DBEAFE;
          color: #1E40AF;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
        }
        .total-scores {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #BFDBFE;
        }
        .total-score-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
        }
        .total-score-name {
          color: #374151;
          font-size: 14px;
        }
        .total-score-value {
          font-family: 'Courier New', 'Consolas', monospace;
          font-weight: bold;
          color: #1E3A5F;
        }
      `}</style>

      <div className="card">
        <div className="section-header">
          <h2>🏆 积分排行榜</h2>
          {roomState.currentRound > 0 && (
            <span className="round-info">第 {roomState.currentRound} 轮</span>
          )}
        </div>

        {sortedPlayers.length === 0 ? (
          <div className="empty-state">暂无玩家数据</div>
        ) : (
          <>
            <div className="leaderboard">
              {sortedPlayers.map((player: Player, index: number) => (
                <div key={player.id} className="leaderboard-item">
                  <div className="leaderboard-rank">
                    {getMedalEmoji(index + 1) || <span style={{ color: '#6B7280', fontSize: 16 }}>#{index + 1}</span>}
                  </div>
                  <div className="leaderboard-avatar">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="leaderboard-info">
                    <div className="leaderboard-name">
                      {player.name}
                      {player.isHost && <span className="host-tag">房主</span>}
                    </div>
                  </div>
                  <div className="leaderboard-score">{player.score}</div>
                </div>
              ))}
            </div>

            <div className="total-scores">
              <h3 style={{ color: '#1E3A5F', fontSize: 16, margin: '0 0 12px 0' }}>📊 积分说明</h3>
              <div className="total-score-item">
                <span className="total-score-name">猜对答案</span>
                <span className="total-score-value">+100 分</span>
              </div>
              <div className="total-score-item">
                <span className="total-score-name">抢答正确（第一个答对）</span>
                <span className="total-score-value">+50 分</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h2>📜 答题历史记录</h2>

        {sortedHistory.length === 0 ? (
          <div className="empty-state">暂无答题记录</div>
        ) : (
          <div className="history-list">
            {sortedHistory.map((item: RoundHistory) => (
              <div key={item.id} className="history-item">
                <div className="history-timestamp">
                  {formatTimestamp(item.timestamp)}
                </div>
                <div className="history-content">
                  <div className="history-player">
                    {item.playerName}
                    <span className="round-tag">第{item.roundNumber}轮</span>
                    {item.isFirst && <span className="history-bonus">🏆 抢答</span>}
                  </div>
                  <div className="history-word">
                    <span className="history-word-text">"{item.word}"</span>
                    <span className="history-result">
                      {item.isCorrect ? (
                        <span className="result-correct">✓ 正确 +{item.isFirst ? '150' : '100'}</span>
                      ) : (
                        <span className="result-wrong">✗ 错误</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Scoreboard;
