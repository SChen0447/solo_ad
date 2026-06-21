import type { PlayerState, WeaponType, WeaponQuality } from '../types';
import { getWeaponName, getQualityName, getQualityColor, getForgeCountForNextLevel, canForgeDragonbone } from '../utils/storage';

interface Props {
  playerState: PlayerState;
}

const WEAPON_ICONS: Record<WeaponType, string> = {
  sword: '⚔️',
  shield: '🛡️',
  helmet: '⛑️',
  dragonbone_sword: '🗡️'
};

const ALL_WEAPONS: WeaponType[] = ['sword', 'shield', 'helmet', 'dragonbone_sword'];

export default function InventoryPanel({ playerState }: Props) {
  const nextLevelAt = getForgeCountForNextLevel(playerState.level);
  const progress = Math.min(100, (playerState.forgeCount / nextLevelAt) * 100);
  const dragonboneUnlocked = canForgeDragonbone(playerState.level);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="card">
        <div className="section-title">🧙 铁匠等级</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#3182ce' }}>Lv.{playerState.level}</span>
          <span style={{ fontSize: 12, color: '#7a5a4a' }}>
            锻造 {playerState.forgeCount}/{nextLevelAt}
          </span>
        </div>
        <div style={{
          width: '100%', height: 10, background: '#e2e8f0',
          borderRadius: 5, overflow: 'hidden', border: '1px solid #cbd5e0'
        }}>
          <div style={{
            width: `${progress}%`, height: '100%',
            background: 'linear-gradient(90deg, #3182ce, #63b3ed)',
            transition: 'width 0.3s ease'
          }} />
        </div>
        {playerState.level >= 2 && !dragonboneUnlocked && (
          <div style={{ fontSize: 11, color: '#b8860b', marginTop: 6, fontStyle: 'italic' }}>
            💡 达到 Lv.3 解锁龙骨剑配方
          </div>
        )}
        {dragonboneUnlocked && (
          <div style={{ fontSize: 11, color: '#d69e2e', marginTop: 6, fontWeight: 600 }}>
            ✨ 已解锁: 龙骨剑配方
          </div>
        )}
      </div>

      <div>
        <div className="section-title">📖 武器图鉴</div>
        {ALL_WEAPONS.map(type => {
          const isDragonbone = type === 'dragonbone_sword';
          const unlocked = !isDragonbone || dragonboneUnlocked;
          const bestQuality = playerState.discoveredWeapons[type];

          return (
            <div
              key={type}
              className={`catalog-item ${!unlocked || !bestQuality ? 'locked' : ''}`}
            >
              <span className="catalog-icon">{WEAPON_ICONS[type]}</span>
              <div className="catalog-info">
                <div className="catalog-name">
                  {unlocked ? getWeaponName(type) : '???'}
                  {isDragonbone && unlocked && <span style={{ color: '#d69e2e' }}> ⭐</span>}
                </div>
                <div className="catalog-quality">
                  {unlocked ? (
                    bestQuality ? (
                      <span style={{ color: getQualityColor(bestQuality as WeaponQuality), fontWeight: 600 }}>
                        最高: {getQualityName(bestQuality as WeaponQuality)}
                      </span>
                    ) : (
                      <span style={{ color: '#a0aec0' }}>尚未锻造</span>
                    )
                  ) : (
                    <span style={{ color: '#a0aec0' }}>Lv.3解锁</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <div className="section-title">📦 武器收藏 ({playerState.inventory.length})</div>
        {playerState.inventory.length === 0 ? (
          <div style={{ fontSize: 12, color: '#7a5a4a', fontStyle: 'italic', padding: '8px 4px' }}>
            还没有收藏武器
          </div>
        ) : (
          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
            {playerState.inventory.slice().reverse().map(weapon => (
              <div
                key={weapon.id}
                className="weapon-item"
                style={{ padding: '6px 8px' }}
              >
                <span style={{ fontSize: 18, marginRight: 6 }}>{WEAPON_ICONS[weapon.type]}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{weapon.name}</div>
                  <div
                    style={{
                      fontSize: 10,
                      color: getQualityColor(weapon.quality),
                      fontWeight: 600
                    }}
                  >
                    {getQualityName(weapon.quality)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 0 }}>
        <div className="section-title">📜 锻造配方</div>
        <div style={{ fontSize: 11, lineHeight: 1.6, color: '#5c4033' }}>
          <div style={{ marginBottom: 4 }}>
            <strong>⚔️ 长剑:</strong> 铁锭 x1, 木炭 x1
          </div>
          <div style={{ marginBottom: 4 }}>
            <strong>🛡️ 圆盾:</strong> 铁锭 x1, 木炭 x1
          </div>
          <div style={{ marginBottom: 4 }}>
            <strong>⛑️ 铁盔:</strong> 铁锭 x1, 木炭 x1, 皮革 x1
          </div>
          {dragonboneUnlocked && (
            <div>
              <strong style={{ color: '#d69e2e' }}>🗡️ 龙骨剑:</strong> 铁锭 x1, 木炭 x1, 皮革 x1 ⭐
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
