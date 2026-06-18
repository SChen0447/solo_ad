import { useEffect, useState } from 'react';
import { gameStore } from '../modules/gameState/GameStore';
import { GameState, Unit, COLORS } from '../modules/gameMap/types';

export default function UIPanel() {
  const [state, setState] = useState<GameState>(gameStore.getState());
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth <= 1024);

  useEffect(() => {
    const unsub = gameStore.subscribe(setState);
    return unsub;
  }, []);

  useEffect(() => {
    const handleResize = () => setIsSmallScreen(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const selectedUnits = state.units.filter((u) => u.selected);
  const firstSelected: Unit | undefined = selectedUnits[0];

  const panelStyle: React.CSSProperties = isSmallScreen
    ? {
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        height: 120,
        background: COLORS.panelBg,
        borderRadius: '12px 12px 0 0',
        padding: '8px 16px',
        color: '#e0e0e0',
        fontFamily: "'Segoe UI', sans-serif",
        fontSize: 12,
        display: 'flex',
        flexDirection: 'row',
        gap: 16,
        alignItems: 'center',
        overflowX: 'auto',
        zIndex: 100,
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderTop: '1px solid rgba(255,255,255,0.15)'
      }
    : {
        position: 'fixed',
        right: 12,
        top: 52,
        width: 260,
        maxHeight: 'calc(100vh - 64px)',
        background: COLORS.panelBg,
        borderRadius: 12,
        padding: 16,
        color: '#e0e0e0',
        fontFamily: "'Segoe UI', sans-serif",
        fontSize: 12,
        overflowY: 'auto',
        zIndex: 100,
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.08)'
      };

  const hpBarColor = (ratio: number): string => {
    if (ratio > 0.6) return COLORS.hpBar;
    if (ratio > 0.3) return '#eab308';
    return '#ef4444';
  };

  return (
    <div style={panelStyle}>
      {!isSmallScreen && (
        <div style={{ marginBottom: 12, fontSize: 14, fontWeight: 600, letterSpacing: 1, color: '#ffffff' }}>
          ⚡ 单位信息
        </div>
      )}

      {selectedUnits.length === 0 && (
        <div style={{ opacity: 0.5, textAlign: 'center', padding: isSmallScreen ? '0 16px' : 16 }}>
          未选中单位
        </div>
      )}

      {firstSelected && (
        <div style={{ flex: isSmallScreen ? '0 0 auto' : undefined, minWidth: isSmallScreen ? 180 : undefined }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#ffffff' }}>
            {firstSelected.name}
          </div>
          <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ opacity: 0.7 }}>HP</span>
            <div style={{
              flex: 1,
              height: 8,
              background: 'rgba(0,0,0,0.4)',
              borderRadius: 4,
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${(firstSelected.hp / firstSelected.maxHp) * 100}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${hpBarColor(firstSelected.hp / firstSelected.maxHp)}, #86efac)`,
                borderRadius: 4,
                transition: 'width 0.15s ease-out'
              }} />
            </div>
            <span style={{ opacity: 0.8, fontSize: 10 }}>
              {firstSelected.hp}/{firstSelected.maxHp}
            </span>
          </div>
          <div style={{ opacity: 0.6, textTransform: 'uppercase', fontSize: 10, letterSpacing: 1 }}>
            {firstSelected.state === 'idle' ? '⏸ 待命' : firstSelected.state === 'moving' ? '▶ 移动中' : '⚔ 攻击中'}
          </div>
        </div>
      )}

      {selectedUnits.length > 1 && (
        <div style={{
          flex: isSmallScreen ? '0 0 auto' : undefined,
          borderTop: isSmallScreen ? 'none' : '1px solid rgba(255,255,255,0.1)',
          paddingTop: isSmallScreen ? 0 : 8,
          marginTop: isSmallScreen ? 0 : 8
        }}>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>
            已选中 {selectedUnits.length} 个单位
          </div>
          {isSmallScreen ? null : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {selectedUnits.slice(0, 8).map((u) => (
                <div
                  key={u.id}
                  style={{
                    background: 'rgba(68, 136, 255, 0.2)',
                    borderRadius: 4,
                    padding: '2px 6px',
                    fontSize: 10
                  }}
                >
                  {u.name}
                </div>
              ))}
              {selectedUnits.length > 8 && (
                <div style={{ opacity: 0.5, fontSize: 10 }}>+{selectedUnits.length - 8}</div>
              )}
            </div>
          )}
        </div>
      )}

      {!isSmallScreen && (
        <div style={{
          marginTop: 16,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: 8,
          opacity: 0.5,
          fontSize: 10
        }}>
          💡 左键选择/移动 · 右键放置障碍 · 滚轮缩放
        </div>
      )}
    </div>
  );
}
