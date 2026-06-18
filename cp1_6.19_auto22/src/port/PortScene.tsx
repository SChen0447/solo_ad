import React, { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import ShipCard from './ShipCard';

const PortScene: React.FC = () => {
  const {
    gold,
    ships,
    selectedShipId,
    selectShip,
    buildShip,
    upgradeShip,
    repairShip,
    startBattle,
    lastBattleResult,
    resetGame,
  } = useGameStore();

  const [showSettings, setShowSettings] = useState(false);
  const [buildCost] = useState(200);
  const [buildExtraCost] = useState(20);

  const selectedShip = ships.find(s => s.id === selectedShipId) || null;

  const actualBuildCost = buildCost + buildExtraCost * ships.length;

  const handleBuild = () => {
    if (ships.length >= 5) {
      alert('最多只能拥有5艘船！');
      return;
    }
    if (gold < actualBuildCost) {
      alert('金币不足！');
      return;
    }
    const success = buildShip();
    if (success && ships.length === 0) {
      const newShips = useGameStore.getState().ships;
      if (newShips.length > 0) {
        selectShip(newShips[newShips.length - 1].id);
      }
    }
  };

  const handleUpgrade = () => {
    if (!selectedShip) return;
    if (selectedShip.level >= 5) {
      alert('船只已达最高等级！');
      return;
    }
    const cost = 100 * selectedShip.level;
    if (gold < cost) {
      alert('金币不足！');
      return;
    }
    upgradeShip(selectedShip.id);
  };

  const handleRepair = () => {
    if (!selectedShip) return;
    if (selectedShip.currentDurability >= selectedShip.maxDurability) {
      alert('船只已满耐久度，无需维修！');
      return;
    }
    if (gold < 50) {
      alert('金币不足！');
      return;
    }
    repairShip(selectedShip.id);
  };

  const handleSail = () => {
    if (!selectedShip) {
      alert('请先选择一艘船！');
      return;
    }
    if (selectedShip.currentDurability <= 0 || selectedShip.isDamaged) {
      alert('该船只已损坏，需要先维修！');
      return;
    }
    startBattle(selectedShip.id);
  };

  const handleReset = () => {
    if (confirm('确定要重置游戏吗？所有进度将丢失！')) {
      resetGame();
      setShowSettings(false);
    }
  };

  useEffect(() => {
    if (lastBattleResult && ships.length > 0 && !selectedShipId) {
      selectShip(ships[0].id);
    }
  }, [ships, selectedShipId, lastBattleResult, selectShip]);

  const upgradeCost = selectedShip ? 100 * selectedShip.level : 0;

  return (
    <div className="port-scene">
      <header className="port-header">
        <div className="port-title">浪涌之战</div>
        <div className="header-right">
          <div className="gold-display">
            <span className="gold-icon">💰</span>
            <span className="gold-amount">{gold}</span>
          </div>
          <button
            className="settings-btn"
            onClick={() => setShowSettings(true)}
            aria-label="设置"
          >
            <Settings size={24} />
          </button>
        </div>
      </header>

      {lastBattleResult && (
        <div className={`battle-result ${lastBattleResult.victory ? 'victory' : 'defeat'}`}>
          {lastBattleResult.victory ? '🎉 战斗胜利！' : '💀 战斗失败'}
          <span className="result-gold">获得 {lastBattleResult.goldEarned} 金币</span>
          <span className="result-detail">
            击毁敌舰 {lastBattleResult.enemiesDestroyed} 艘 | 承受攻击 {lastBattleResult.hitsTaken} 次 | 用时 {Math.round(lastBattleResult.battleTime)}秒
          </span>
        </div>
      )}

      <div className="port-content">
        <div className="ships-section">
          <div className="section-header">
            <h2>我的舰队</h2>
            <span className="ship-count">{ships.length}/5</span>
          </div>

          <div className="ship-list">
            {ships.map(ship => (
              <ShipCard
                key={ship.id}
                ship={ship}
                selected={selectedShipId === ship.id}
                onClick={() => selectShip(ship.id)}
              />
            ))}
            {ships.length < 5 && (
              <div className="ship-card build-slot" onClick={handleBuild}>
                <div className="build-icon">+</div>
                <div className="build-text">建造新船</div>
                <div className="build-cost">{actualBuildCost} 金币</div>
              </div>
            )}
          </div>
        </div>

        <div className="detail-panel">
          <div className="detail-card">
            <h2>船只详情</h2>
            {selectedShip ? (
              <>
                <div className="detail-name">{selectedShip.name}</div>
                <div className="detail-stats">
                  <div className="detail-stat">
                    <span>等级</span>
                    <strong>{selectedShip.level} / 5</strong>
                  </div>
                  <div className="detail-stat">
                    <span>最大耐久度</span>
                    <strong>{selectedShip.maxDurability}</strong>
                  </div>
                  <div className="detail-stat">
                    <span>当前耐久度</span>
                    <strong>{selectedShip.currentDurability}</strong>
                  </div>
                  <div className="detail-stat">
                    <span>火炮等级</span>
                    <strong>{selectedShip.cannonLevel} / 3</strong>
                  </div>
                  <div className="detail-stat">
                    <span>状态</span>
                    <strong className={selectedShip.isDamaged ? 'status-bad' : 'status-good'}>
                      {selectedShip.isDamaged ? '已损坏' : '良好'}
                    </strong>
                  </div>
                </div>

                <div className="action-buttons">
                  <button
                    className="action-btn upgrade-btn"
                    onClick={handleUpgrade}
                    disabled={selectedShip.level >= 5 || gold < upgradeCost}
                  >
                    升级
                    <span className="btn-cost">{upgradeCost} 金币</span>
                  </button>
                  <button
                    className="action-btn repair-btn"
                    onClick={handleRepair}
                    disabled={selectedShip.currentDurability >= selectedShip.maxDurability || gold < 50}
                  >
                    维修
                    <span className="btn-cost">50 金币</span>
                  </button>
                  <button
                    className="action-btn sail-btn"
                    onClick={handleSail}
                    disabled={selectedShip.currentDurability <= 0 || selectedShip.isDamaged}
                  >
                    ⚓ 出航战斗
                  </button>
                </div>
              </>
            ) : (
              <div className="no-selection">请选择一艘船查看详情</div>
            )}
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>设置</h2>
            <button className="reset-btn" onClick={handleReset}>
              重置存档
            </button>
            <p className="reset-warning">警告：重置将清除所有游戏进度！</p>
            <button className="close-btn" onClick={() => setShowSettings(false)}>
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortScene;
