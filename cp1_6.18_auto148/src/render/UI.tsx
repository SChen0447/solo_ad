import { useState, useMemo } from 'react';
import { useGameStore, TowerType, TOWER_COSTS, getUpgradeCost } from '@game/store';
import { enemyManager } from '@game/enemyManager';
import { towerManager } from '@game/towerManager';

const TOWER_COLORS: Record<TowerType, { primary: string; accent: string }> = {
  arrow: { primary: '#d4a24c', accent: '#f4d03f' },
  magic: { primary: '#5b8dd9', accent: '#6ba3ff' },
  stone: { primary: '#9e6b3d', accent: '#c49a6c' },
};

const TOWER_NAMES: Record<TowerType, string> = {
  arrow: '箭塔',
  magic: '魔法塔',
  stone: '投石塔',
};

const TOWER_DESC: Record<TowerType, string> = {
  arrow: '单体高射速\n低造价入门',
  magic: '范围减速\n中造价控场',
  stone: '范围溅射伤害\n高造价攻坚',
};

const RANK_COLORS: Record<string, string> = {
  D: '#9e9e9e',
  C: '#4caf50',
  B: '#2196f3',
  A: '#9c27b0',
  S: '#ffd700',
};

const RANK_LABELS: Record<string, string> = {
  D: 'D级 (基础)',
  C: 'C级 (强化)',
  B: 'B级 (精锐)',
  A: 'A级 (传说)',
  S: 'S级 (神话) ✨',
};

function TopStatusBar() {
  const castleHp = useGameStore(s => s.castleHp);
  const maxCastleHp = useGameStore(s => s.maxCastleHp);
  const currentWave = useGameStore(s => s.currentWave);
  const totalWaves = useGameStore(s => s.totalWaves);
  const kills = useGameStore(s => s.kills);
  const hpPct = (castleHp / maxCastleHp) * 100;
  const wavePct = (currentWave / totalWaves) * 100;

  return (
    <div style={topBarStyle}>
      <div style={hpContainerStyle}>
        <div style={{ ...labelStyle, width: 90 }}>
          <span style={{ color: '#ff6b6b' }}>⚔</span> 城堡
        </div>
        <div style={barOuterStyle}>
          <div
            style={{
              ...barInnerStyle,
              width: `${hpPct}%`,
              background: hpPct > 50
                ? 'linear-gradient(90deg, #c62828, #e53935, #ff6b6b)'
                : hpPct > 25 ? 'linear-gradient(90deg, #e65100, #ff6b35, #ffa726)'
                : 'linear-gradient(90deg, #8b0000, #c62828, #e53935)',
            }}
          />
          <span style={barTextStyle}>{castleHp} / {maxCastleHp}</span>
        </div>
      </div>
      <div style={waveContainerStyle}>
        <div style={{ ...labelStyle, width: 90 }}>
          <span style={{ color: '#ffd700' }}>🌊</span> 波次
        </div>
        <div style={barOuterStyle}>
          <div
            style={{
              ...barInnerStyle,
              width: `${wavePct}%`,
              background: 'linear-gradient(90deg, #b8860b, #d4af37, #ffd700)',
            }}
          />
          <span style={barTextStyle}>{currentWave} / {totalWaves}</span>
        </div>
      </div>
      <div style={{ ...labelStyle, fontSize: 15, color: '#e0d4b8' }}>
        💀 击杀: {kills}
      </div>
    </div>
  );
}

function LeftToolbar() {
  const gold = useGameStore(s => s.gold);
  const phase = useGameStore(s => s.phase);
  const waveIntervalRemaining = useGameStore(s => s.waveIntervalRemaining);
  const waveConfig = useGameStore(s => s.waveConfig);
  const startWave = useGameStore(s => s.startWave);
  const setWaveConfig = useGameStore(s => s.setWaveConfig);
  const [pressed, setPressed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleStartWave = () => {
    setPressed(true);
    setTimeout(() => setPressed(false), 150);
    startWave();
    const s = useGameStore.getState();
    if (s.phase === 'preparing' || s.phase === 'waveInterval') {
      setTimeout(() => {
        const st = useGameStore.getState();
        enemyManager.spawnWave(st.currentWave);
      }, 50);
    }
  };

  const startDisabled = phase === 'waveActive' || phase === 'gameOver' || phase === 'victory';
  const btnLabel =
    phase === 'preparing' ? '开始游戏' :
    phase === 'waveActive' ? '战斗中...' :
    phase === 'waveInterval' ? `下一波 ${Math.ceil(waveIntervalRemaining)}s` :
    phase === 'gameOver' ? '游戏结束' : '胜利!';

  return (
    <div style={leftToolbarStyle}>
      <div style={goldBoxStyle}>
        <div style={{ fontSize: 36, marginRight: 10 }}>💰</div>
        <div>
          <div style={{ color: '#8b7355', fontSize: 12, letterSpacing: 2 }}>金币</div>
          <div style={{ fontSize: 30, fontWeight: 'bold', color: '#ffd700', textShadow: '0 0 8px rgba(255,215,0,0.3)' }}>
            {gold}
          </div>
        </div>
      </div>

      <button
        onClick={handleStartWave}
        disabled={startDisabled}
        style={{
          ...waveButtonStyle,
          transform: pressed ? 'scale(0.94) translateY(2px)' : 'scale(1)',
          background: startDisabled
            ? 'linear-gradient(180deg, #6b5335, #4a3828)'
            : 'linear-gradient(180deg, #c83d3d, #8b2222)',
          cursor: startDisabled ? 'not-allowed' : 'pointer',
          boxShadow: pressed
            ? '0 1px 3px rgba(0,0,0,0.5)'
            : '0 6px 0 #5a1a1a, 0 8px 20px rgba(0,0,0,0.6)',
          transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {btnLabel}
      </button>

      <button
        onClick={() => setShowSettings(!showSettings)}
        style={settingsBtnStyle}
      >
        ⚙ 波次设置
      </button>

      {showSettings && (
        <div style={settingsPanelStyle}>
          <div style={{ fontSize: 12, color: '#e0d4b8', marginBottom: 8, fontWeight: 'bold' }}>敌军数量 (5-30)</div>
          <input
            type="range"
            min={5}
            max={30}
            value={waveConfig.enemyCount}
            onChange={e => setWaveConfig({ enemyCount: parseInt(e.target.value) })}
            style={sliderStyle}
          />
          <div style={{ color: '#ffd700', fontSize: 14, textAlign: 'center', marginBottom: 12 }}>{waveConfig.enemyCount}</div>

          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={waveConfig.isRandom}
              onChange={e => setWaveConfig({ isRandom: e.target.checked })}
              style={{ marginRight: 8 }}
            />
            随机兵种比例
          </label>

          {!waveConfig.isRandom && (
            <>
              <SliderRow label="步兵" ratio="infantryRatio" color="#a8d0a0" />
              <SliderRow label="骑兵" ratio="cavalryRatio" color="#d0a8a8" />
              <SliderRow label="攻城锤" ratio="batteringRamRatio" color="#d0c8a0" />
              <SliderRow label="投石车" ratio="catapultRatio" color="#a0b8d0" />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SliderRow({ label, ratio, color }: { label: string; ratio: string; color: string }) {
  const config = useGameStore(s => s.waveConfig as any);
  const setWaveConfig = useGameStore(s => s.setWaveConfig);
  const value = Math.round(config[ratio] * 100);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#c0b090', marginBottom: 3 }}>
        <span>{label}</span>
        <span style={{ color }}>{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={e => {
          const v = parseInt(e.target.value) / 100;
          setWaveConfig({ [ratio]: v } as any);
        }}
        style={{ ...sliderStyle, accentColor: color }}
      />
    </div>
  );
}

function TowerCard({ type }: { type: TowerType }) {
  const gold = useGameStore(s => s.gold);
  const selected = useGameStore(s => s.selectedTowerType === type);
  const setSelectedTowerType = useGameStore(s => s.setSelectedTowerType);
  const cost = TOWER_COSTS[type];
  const canAfford = gold >= cost;
  const [hovered, setHovered] = useState(false);

  const colors = TOWER_COLORS[type];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => setSelectedTowerType(selected ? null : type)}
      style={{
        ...towerCardStyle,
        borderColor: selected ? '#ffd700' : colors.primary,
        boxShadow: hovered
          ? `0 12px 30px rgba(0,0,0,0.6), 0 0 20px ${selected ? 'rgba(255,215,0,0.4)' : 'rgba(212,162,76,0.25)'}`
          : '0 4px 12px rgba(0,0,0,0.4)',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: canAfford ? 'pointer' : 'not-allowed',
        opacity: canAfford ? 1 : 0.55,
        background: selected
          ? `linear-gradient(180deg, #f8ecc8, #ecd9a8)`
          : undefined,
      }}
    >
      <div style={{
        width: '100%',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        background: `radial-gradient(circle, ${colors.accent}22, transparent 70%)`,
      }}>
        <div style={{
          fontSize: 40,
          filter: `drop-shadow(0 2px 4px ${colors.primary}80)`,
        }}>
          {type === 'arrow' ? '🏹' : type === 'magic' ? '🔮' : '🏰'}
        </div>
      </div>

      <div style={{
        fontSize: 17,
        fontWeight: 'bold',
        color: selected ? '#5a4526' : '#3d2817',
        textAlign: 'center',
        fontFamily: '"Georgia", "Noto Serif SC", serif',
        marginBottom: 6,
        textShadow: selected ? '0 1px 0 rgba(255,255,255,0.5)' : 'none',
      }}>
        {TOWER_NAMES[type]}
      </div>

      <div style={{
        fontSize: 11,
        color: '#6b5335',
        textAlign: 'center',
        lineHeight: 1.4,
        whiteSpace: 'pre-line',
        marginBottom: 10,
        minHeight: 32,
      }}>
        {TOWER_DESC[type]}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px 0',
        borderTop: `1px dashed ${colors.primary}55`,
        gap: 6,
      }}>
        <span style={{ fontSize: 14 }}>💰</span>
        <span style={{
          fontSize: 16,
          fontWeight: 'bold',
          color: canAfford ? '#b8860b' : '#8b3a3a',
        }}>
          {cost}
        </span>
      </div>
    </div>
  );
}

function SelectedTowerPanel() {
  const selectedTowerId = useGameStore(s => s.selectedTowerId);
  const towers = useGameStore(s => s.towers);
  const gold = useGameStore(s => s.gold);
  const upgradeTower = useGameStore(s => s.upgradeTower);

  const tower = useMemo(() => towers.find(t => t.id === selectedTowerId), [towers, selectedTowerId]);

  if (!tower) return null;

  const colors = TOWER_COLORS[tower.type];
  const rankColors = RANK_COLORS[tower.rank];
  const rankLabels = RANK_LABELS[tower.rank];
  const order: string[] = ['D', 'C', 'B', 'A', 'S'];
  const idx = order.indexOf(tower.rank);
  const canUpgrade = idx < order.length - 1;
  const upgradeCost = canUpgrade ? getUpgradeCost(tower.rank as any, tower.type) : 0;
  const canAffordUpgrade = gold >= upgradeCost;

  const nextRank = canUpgrade ? order[idx + 1] : null;
  const nextLabel = nextRank ? RANK_LABELS[nextRank] : '';

  return (
    <div style={selectedPanelStyle}>
      <div style={{
        fontSize: 14,
        color: '#6b5335',
        letterSpacing: 1,
        marginBottom: 6,
        fontFamily: '"Georgia", serif',
      }}>
        {TOWER_NAMES[tower.type]} - 已选中
      </div>

      <div style={{
        fontSize: 16,
        fontWeight: 'bold',
        color: rankColors,
        marginBottom: 10,
        textShadow: tower.rank === 'S' ? '0 0 10px rgba(255,215,0,0.5)' : 'none',
      }}>
        {rankLabels}
      </div>

      <div style={statsRowStyle}>
        <span>攻击</span>
        <span style={{ color: colors.accent, fontWeight: 'bold' }}>{tower.damage}</span>
      </div>
      <div style={statsRowStyle}>
        <span>射程</span>
        <span style={{ color: colors.accent, fontWeight: 'bold' }}>{tower.range.toFixed(1)}</span>
      </div>
      <div style={statsRowStyle}>
        <span>速度</span>
        <span style={{ color: colors.accent, fontWeight: 'bold' }}>{tower.attackSpeed.toFixed(2)}/s</span>
      </div>

      {tower.specialEffect && (
        <div style={{
          background: `${colors.primary}22',
          borderRadius: 6,
          padding: '8px 10px',
          marginTop: 10,
          fontSize: 11,
          color: '#5a4526',
          lineHeight: 1.5,
          border: `1px dashed ${colors.primary}55',
        }}>
          ✨ 特效: {
            tower.specialEffect === 'doubleShot' ? '两连射 (70%伤害)'
            : tower.specialEffect === 'freeze' ? '冰冻减速 (40%, 2秒)'
            : '眩晕控制 (1秒)'
          }
        </div>
      )}

      {canUpgrade ? (
        <button
          onClick={() => upgradeTower(tower.id)}
          disabled={!canAffordUpgrade}
          style={{
            ...upgradeBtnStyle,
            background: canAffordUpgrade
              ? `linear-gradient(180deg, ${colors.primary}, ${colors.accent})`
              : 'linear-gradient(180deg, #6b5335, #4a3828)',
            cursor: canAffordUpgrade ? 'pointer' : 'not-allowed',
            color: canAffordUpgrade ? '#3d2817' : '#888',
          }}
        >
          升级至 {nextLabel}
          <span style={{ marginLeft: 8 }}>💰 {upgradeCost}</span>
        </button>
      ) : (
        <div style={{
          textAlign: 'center',
          color: '#ffd700',
          fontWeight: 'bold',
          marginTop: 12,
          padding: 10,
          border: '2px solid #ffd700',
          borderRadius: 8,
          textShadow: '0 0 10px rgba(255,215,0,0.5)',
        }}>
          🌟 已达最高等级
        </div>
      )}
    </div>
  );
}

function RightPanel() {
  const buildMode = useGameStore(s => s.buildMode);
  const selectedTowerId = useGameStore(s => s.selectedTowerId);

  return (
    <div style={rightPanelStyle}>
      <div style={{
        fontSize: 13,
        color: '#e0d4b8',
        marginBottom: 12,
        padding: '8px 10px',
        textAlign: 'center',
        background: buildMode
          ? 'linear-gradient(90deg, #2e4a2e, #3a5a3a)'
          : 'linear-gradient(90deg, #3a2e1a, #4a3828)',
        borderRadius: 8,
        border: `1px solid ${buildMode ? '#4caf50' : '#6b5335'}88`,
        fontFamily: '"Georgia", serif',
      }}>
        {buildMode ? '🏗 建造模式 - 点击地块放置塔' : selectedTowerId ? '🛡 塔已选中 - 可升级' : '📜 选择防御塔'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {(['arrow', 'magic', 'stone'] as TowerType[]).map(type => (
          <TowerCard key={type} type={type} />
        ))}
      </div>

      <SelectedTowerPanel />
    </div>
  );
}

function GameOverModal() {
  const phase = useGameStore(s => s.phase);
  const kills = useGameStore(s => s.kills);
  const currentWave = useGameStore(s => s.currentWave);
  const gold = useGameStore(s => s.gold);
  const highScore = useGameStore(s => s.highScore);
  const resetGame = useGameStore(s => s.resetGame);
  const [visible, setVisible] = useState(false);

  if (phase !== 'gameOver' && phase !== 'victory') return null;

  setTimeout(() => setVisible(true), 500);

  const isVictory = phase === 'victory';

  return (
    <div style={modalOverlayStyle}>
      <div style={{
        ...modalBoxStyle,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0.9)',
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <div style={{
          fontSize: 36,
          fontWeight: 'bold',
          textAlign: 'center',
          color: isVictory ? '#ffd700' : '#c62828',
          marginBottom: 8,
          fontFamily: '"Georgia", serif',
          textShadow: isVictory ? '0 0 20px rgba(255,215,0,0.6)' : '0 0 20px rgba(198,40,40,0.5)',
        }}>
          {isVictory ? '🏆 胜利!' : '💀 城堡陷落'}
        </div>
        <div style={{
          fontSize: 14,
          color: '#8b7355',
          textAlign: 'center',
          marginBottom: 20,
          letterSpacing: 2,
        }}>
          {isVictory ? '你成功守护了城堡!' : '敌军攻破了你的防线...'}
        </div>

        <div style={scoreRowStyle}>
          <span>🌊 通过波次</span>
          <span style={scoreValueStyle}>{currentWave} / 20</span>
        </div>
        <div style={scoreRowStyle}>
          <span>💀 击杀敌军</span>
          <span style={scoreValueStyle}>{kills}</span>
        </div>
        <div style={scoreRowStyle}>
          <span>💰 剩余金币</span>
          <span style={scoreValueStyle}>{gold}</span>
        </div>

        <div style={{
          marginTop: 20,
          padding: 12,
          background: 'linear-gradient(180deg, #3a2e1a, #2a1e12)',
          borderRadius: 8,
          border: '1px solid #6b5335',
        }}>
          <div style={{ fontSize: 12, color: '#b8860b', marginBottom: 8, textAlign: 'center', letterSpacing: 2 }}>
            🏆 历史最高记录
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: 12, color: '#c0b090' }}>
            <div>波次: {highScore.waves}</div>
            <div>击杀: {highScore.kills}</div>
            <div>金币: {highScore.gold}</div>
          </div>
        </div>

        <button
          onClick={() => {
            setVisible(false);
            setTimeout(() => resetGame(), 300);
          }}
          style={restartBtnStyle}
        >
          ⚔ 再来一局
        </button>
      </div>
    </div>
  );
}

export default function UI() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', width: 'min(720px, 60%)', pointerEvents: 'auto' }}>
        <TopStatusBar />
      </div>

      <div style={{ position: 'absolute', top: 120, left: 20, width: 230, pointerEvents: 'auto' }}>
        <LeftToolbar />
      </div>

      <div style={{ position: 'absolute', top: 120, right: 20, width: 240, pointerEvents: 'auto' }}>
        <RightPanel />
      </div>

      <GameOverModal />
    </div>
  );
}

const topBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 20,
  alignItems: 'center',
  padding: '12px 20px',
  background: 'linear-gradient(180deg, rgba(42,30,18,0.95), rgba(30,22,14,0.95))',
  borderRadius: 12,
  border: '1px solid rgba(107,83,53,0.6)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,215,0,0.05)',
  backdropFilter: 'blur(4px)',
};

const labelStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 'bold',
  color: '#e0d4b8',
  fontFamily: '"Georgia", serif',
  flexShrink: 0,
  whiteSpace: 'nowrap',
};

const hpContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  flex: 1,
  gap: 10,
};

const waveContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  flex: 1,
  gap: 10,
};

const barOuterStyle: React.CSSProperties = {
  flex: 1,
  height: 22,
  background: 'linear-gradient(180deg, #1a1410, #2a1e12)',
  borderRadius: 11,
  border: '1px solid #3a2e1a',
  position: 'relative',
  overflow: 'hidden',
  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
};

const barInnerStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: 10,
  transition: 'width 0.3s ease',
  boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
};

const barTextStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  fontWeight: 'bold',
  color: '#fff',
  textShadow: '0 1px 2px rgba(0,0,0,0.9)',
};

const leftToolbarStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
};

const goldBoxStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '14px 18px',
  background: 'linear-gradient(180deg, rgba(58,46,26,0.95), rgba(42,30,18,0.95))',
  borderRadius: 12,
  border: '1px solid rgba(255,215,0,0.2)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
};

const waveButtonStyle: React.CSSProperties = {
  padding: '16px 20px',
  fontSize: 16,
  fontWeight: 'bold',
  color: '#fff',
  borderRadius: 10,
  border: 'none',
  letterSpacing: 2,
  fontFamily: '"Georgia", serif',
  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
  outline: 'none',
};

const settingsBtnStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: 13,
  color: '#e0d4b8',
  background: 'linear-gradient(180deg, #4a3828, #3a2e1a)',
  borderRadius: 8,
  border: '1px solid #6b5335',
  cursor: 'pointer',
  fontFamily: '"Georgia", serif',
  transition: 'all 0.2s ease',
};

const settingsPanelStyle: React.CSSProperties = {
  padding: 14,
  background: 'rgba(26,20,16,0.95)',
  borderRadius: 10,
  border: '1px solid #4a3828',
  marginTop: 4,
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: 6,
  borderRadius: 3,
  background: '#2a1e12',
  outline: 'none',
  cursor: 'pointer',
  WebkitAppearance: 'none',
  appearance: 'none',
};

const checkboxLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  fontSize: 13,
  color: '#c0b090',
  marginBottom: 14,
  cursor: 'pointer',
  userSelect: 'none',
};

const rightPanelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const towerCardStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 12,
  border: '2px solid',
  backgroundImage: `
    linear-gradient(180deg, #f3e5c0, #e6d29e),
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 10px,
      rgba(139,69,19,0.03) 10px,
      rgba(139,69,19,0.03) 20px
    )
  `,
  backgroundBlendMode: 'multiply',
  position: 'relative',
  userSelect: 'none',
};

const selectedPanelStyle: React.CSSProperties = {
  marginTop: 8,
  padding: 14,
  background: 'linear-gradient(180deg, rgba(58,46,26,0.95), rgba(42,30,18,0.95))',
  borderRadius: 10,
  border: '1px solid #6b5335',
  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
};

const statsRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '5px 2px',
  fontSize: 13,
  color: '#c0b090',
  borderBottom: '1px dashed rgba(107,83,53,0.4)',
};

const upgradeBtnStyle: React.CSSProperties = {
  marginTop: 14,
  width: '100%',
  padding: '12px 14px',
  fontSize: 14,
  fontWeight: 'bold',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  fontFamily: '"Georgia", serif',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  boxShadow: '0 3px 0 rgba(0,0,0,0.4)',
  transition: 'all 0.15s ease',
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(0,0,0,0.75)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backdropFilter: 'blur(6px)',
  pointerEvents: 'auto',
  zIndex: 100,
};

const modalBoxStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  width: 400,
  padding: 30,
  background: `
    linear-gradient(180deg, #f3e5c0, #dcc48e),
    repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(139,69,19,0.04) 10px, rgba(139,69,19,0.04) 20px)
  `,
  backgroundBlendMode: 'multiply',
  borderRadius: 16,
  border: '3px solid #8b6914',
  boxShadow: '0 20px 60px rgba(0,0,0,0.8), inset 0 0 60px rgba(139,105,20,0.15)',
  fontFamily: '"Georgia", "Noto Serif SC", serif',
};

const scoreRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 0',
  fontSize: 15,
  color: '#5a4526',
  borderBottom: '1px dashed #8b691455',
};

const scoreValueStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#8b4513',
};

const restartBtnStyle: React.CSSProperties = {
  marginTop: 24,
  width: '100%',
  padding: '14px 20px',
  fontSize: 16,
  fontWeight: 'bold',
  color: '#fff',
  background: 'linear-gradient(180deg, #c83d3d, #8b2222)',
  borderRadius: 10,
  border: 'none',
  cursor: 'pointer',
  fontFamily: '"Georgia", serif',
  letterSpacing: 2,
  boxShadow: '0 4px 0 #5a1a1a, 0 8px 20px rgba(0,0,0,0.4)',
  transition: 'all 0.15s ease',
};
