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

function GoldMedalIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="13" r="8" fill="url(#goldGradient)" stroke="#B8860B" strokeWidth="2"/>
      <path d="M12 8L14 11L17 11.5L15 14L15.5 17L12 15.5L8.5 17L9 14L7 11.5L10 11L12 8Z" fill="#FFD700" stroke="#B8860B" strokeWidth="0.5"/>
      <path d="M7 2L9 5H15L17 2" stroke="#B8860B" strokeWidth="2" strokeLinecap="round"/>
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD700"/>
          <stop offset="50%" stopColor="#FFA500"/>
          <stop offset="100%" stopColor="#FFD700"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

function SilverMedalIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="13" r="8" fill="url(#silverGradient)" stroke="#808080" strokeWidth="2"/>
      <path d="M12 8L14 11L17 11.5L15 14L15.5 17L12 15.5L8.5 17L9 14L7 11.5L10 11L12 8Z" fill="#C0C0C0" stroke="#808080" strokeWidth="0.5"/>
      <path d="M7 2L9 5H15L17 2" stroke="#808080" strokeWidth="2" strokeLinecap="round"/>
      <defs>
        <linearGradient id="silverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E8E8E8"/>
          <stop offset="50%" stopColor="#A0A0A0"/>
          <stop offset="100%" stopColor="#C0C0C0"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

function BronzeMedalIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="13" r="8" fill="url(#bronzeGradient)" stroke="#8B4513" strokeWidth="2"/>
      <path d="M12 8L14 11L17 11.5L15 14L15.5 17L12 15.5L8.5 17L9 14L7 11.5L10 11L12 8Z" fill="#CD7F32" stroke="#8B4513" strokeWidth="0.5"/>
      <path d="M7 2L9 5H15L17 2" stroke="#8B4513" strokeWidth="2" strokeLinecap="round"/>
      <defs>
        <linearGradient id="bronzeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#CD7F32"/>
          <stop offset="50%" stopColor="#8B4513"/>
          <stop offset="100%" stopColor="#CD7F32"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

function getMedalIcon(rank: number) {
  switch (rank) {
    case 1: return <GoldMedalIcon />;
    case 2: return <SilverMedalIcon />;
    case 3: return <BronzeMedalIcon />;
    default: return null;
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
          width: 100%;
          box-sizing: border-box;
        }
        @media (min-width: 768px) and (max-width: 1023px) {
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
          width: 100%;
          box-sizing: border-box;
        }
        .card h2 {
          color: #1E3A5F;
          margin: 0 0 16px 0;
          font-size: 20px;
        }
        .scoreboard-header {
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #BFDBFE;
        }
        .scoreboard-title {
          color: #1E3A5F;
          font-size: 22px;
          font-weight: bold;
          margin: 0;
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
          width: 100%;
          box-sizing: border-box;
        }
        .leaderboard-item:hover {
          transform: translateX(4px);
          box-shadow: 0 2px 8px rgba(30, 58, 95, 0.1);
        }
        .leaderboard-rank {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .leaderboard-rank-number {
          color: #6B7280;
          font-size: 16px;
          font-weight: 600;
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
          font-family: 'Courier New', 'Consolas', 'Monaco', monospace;
          font-size: 24px;
          font-weight: bold;
          color: #1E3A5F;
          min-width: 80px;
          text-align: right;
          font-variant-numeric: tabular-nums;
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
          width: 100%;
          box-sizing: border-box;
        }
        .history-timestamp {
          font-size: 14px;
          color: #9CA3AF;
          white-space: nowrap;
          font-family: 'Courier New', 'Consolas', 'Monaco', monospace;
          padding-top: 2px;
          flex-shrink: 0;
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
          flex-wrap: wrap;
        }
        .history-word {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 2px;
          flex-wrap: wrap;
        }
        .history-word-text {
          color: #374151;
          font-family: 'Courier New', 'Consolas', 'Monaco', monospace;
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
          flex-wrap: wrap;
          gap: 8px;
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
          width: 100%;
          box-sizing: border-box;
        }
        .total-score-name {
          color: #374151;
          font-size: 14px;
        }
        .total-score-value {
          font-family: 'Courier New', 'Consolas', 'Monaco', monospace;
          font-weight: bold;
          color: #1E3A5F;
        }
      `}</style>

      <div className="card">
        <div className="scoreboard-header">
          <h2 className="scoreboard-title">{roomState.name}</h2>
        </div>
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
                    {getMedalIcon(index + 1) || (
                      <span className="leaderboard-rank-number">#{index + 1}</span>
                    )}
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
