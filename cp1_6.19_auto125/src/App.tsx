import React, { useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { GameMap } from './components/GameMap';
import { UIPanel } from './components/UIPanel';
import { Base } from './types';

const App: React.FC = () => {
  const { gameState, playerId, connected, joinRoom, buildMiner, buildTower, upgradeBase } = useWebSocket();
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('room1');
  const [selectedBase, setSelectedBase] = useState<Base | null>(null);
  const [showVictoryParticles, setShowVictoryParticles] = useState(false);

  const handleJoin = () => {
    if (playerName.trim() && roomId.trim()) {
      joinRoom(roomId.trim(), playerName.trim());
    }
  };

  const handleBaseClick = (base: Base) => {
    setSelectedBase(base);
  };

  const handleCloseMenu = () => {
    setSelectedBase(null);
  };

  const handleBuildMiner = () => {
    buildMiner();
    setSelectedBase(null);
  };

  const handleBuildTower = () => {
    buildTower();
    setSelectedBase(null);
  };

  const handleUpgradeBase = () => {
    upgradeBase();
    setSelectedBase(null);
  };

  const isWinner = gameState?.status === 'finished' && gameState.winner === playerId;
  const isLoser = gameState?.status === 'finished' && gameState.winner && gameState.winner !== playerId;
  const winnerName = gameState?.winner ? gameState.players[gameState.winner]?.name : '';

  if ((isWinner || isLoser) && !showVictoryParticles) {
    setTimeout(() => setShowVictoryParticles(true), 100);
  }

  if (!connected) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="loading-spinner" />
          <h1>正在连接服务器...</h1>
        </div>
      </div>
    );
  }

  if (!playerId) {
    return (
      <div className="app">
        <div className="join-screen">
          <div className="join-container">
            <h1 className="game-title">⭐ 星际矿场争夺战 ⭐</h1>
            <p className="game-subtitle">Stellar Mine Warfare</p>
            <div className="join-form">
              <div className="form-group">
                <label>玩家昵称</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  placeholder="输入你的名字"
                  maxLength={20}
                />
              </div>
              <div className="form-group">
                <label>房间号</label>
                <input
                  type="text"
                  value={roomId}
                  onChange={e => setRoomId(e.target.value)}
                  placeholder="输入房间号"
                  maxLength={20}
                />
              </div>
              <button className="join-button" onClick={handleJoin} disabled={!playerName.trim() || !roomId.trim()}>
                进入战场
              </button>
            </div>
            <div className="game-tips">
              <p>🎮 游戏说明：</p>
              <ul>
                <li>派遣采矿船采集金矿获取金币</li>
                <li>建造防御塔保护基地和进攻敌方</li>
                <li>升级基地增强防御力</li>
                <li>摧毁敌方基地或占领所有金矿30秒即可获胜</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState?.status === 'waiting') {
    return (
      <div className="app">
        <div className="waiting-screen">
          <h1>等待对手加入...</h1>
          <div className="waiting-room-info">
            <p>房间号: <strong>{roomId}</strong></p>
            <p>当前玩家: {Object.keys(gameState.players).length} / 2</p>
          </div>
          <div className="waiting-spinner" />
          <p className="waiting-hint">分享房间号给好友一起战斗！</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {(isWinner || isLoser) && (
        <div className="victory-overlay">
          {showVictoryParticles && (
            <>
              {Array.from({ length: 50 }).map((_, i) => (
                <div
                  key={i}
                  className="victory-particle"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96E6A1'][Math.floor(Math.random() * 5)],
                  }}
                />
              ))}
            </>
          )}
          <div className={`victory-banner ${isWinner ? 'winner' : 'loser'}`}>
            <h1>
              {isWinner ? '🎉 胜利！' : '💀 失败'}
            </h1>
            {isWinner && <p className="victory-subtitle">你征服了星海！</p>}
            {isLoser && <p className="victory-subtitle">{winnerName} 获得了胜利</p>}
          </div>
        </div>
      )}

      <GameMap
        gameState={gameState}
        playerId={playerId}
        onBaseClick={handleBaseClick}
        selectedBaseId={selectedBase?.id || null}
      />

      <UIPanel
        gameState={gameState}
        playerId={playerId}
        selectedBase={selectedBase}
        onBuildMiner={handleBuildMiner}
        onBuildTower={handleBuildTower}
        onUpgradeBase={handleUpgradeBase}
        onCloseMenu={handleCloseMenu}
      />
    </div>
  );
};

export default App;
