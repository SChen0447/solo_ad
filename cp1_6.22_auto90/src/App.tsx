import { useState, useEffect, useCallback } from 'react';
import type { PlayerState, WeaponType, WeaponQuality, MaterialType } from './types';
import { loadState, saveState, createWeapon, getForgeCountForNextLevel, getQualityColor } from './utils/storage';
import ForgeCanvas from './component/ForgeCanvas';
import MarketPanel from './component/MarketPanel';
import InventoryPanel from './component/InventoryPanel';

type MobileTab = 'inventory' | 'forge' | 'market';

export default function App() {
  const [playerState, setPlayerState] = useState<PlayerState>(() => loadState());
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpLevel, setLevelUpLevel] = useState(1);
  const [mobileTab, setMobileTab] = useState<MobileTab>('forge');
  const [isShaking, setIsShaking] = useState(false);
  const [showGoldGlow, setShowGoldGlow] = useState(false);
  const [hintText, setHintText] = useState('将原材料拖入熔炉加热，然后移到铁砧上敲打锻造武器 ⚒️');

  useEffect(() => {
    saveState(playerState);
  }, [playerState]);

  const handleForgeComplete = useCallback((type: WeaponType, quality: WeaponQuality, strokes: number) => {
    const newWeapon = createWeapon(type, quality, strokes);

    setPlayerState(prev => {
      const newForgeCount = prev.forgeCount + 1;
      const nextLevelThreshold = getForgeCountForNextLevel(prev.level);
      const shouldLevelUp = newForgeCount >= nextLevelThreshold;
      const newLevel = shouldLevelUp ? prev.level + 1 : prev.level;

      const prevQuality = prev.discoveredWeapons[type];
      const qualityRank = { low: 0, medium: 1, high: 2 };
      const newDiscovered = { ...prev.discoveredWeapons };
      if (!prevQuality || qualityRank[quality] > qualityRank[prevQuality]) {
        newDiscovered[type] = quality;
      }

      if (shouldLevelUp) {
        setLevelUpLevel(newLevel);
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 1200);
      }

      if (quality === 'high') {
        setShowGoldGlow(true);
        setTimeout(() => setShowGoldGlow(false), 600);
      }

      return {
        ...prev,
        forgeCount: shouldLevelUp ? 0 : newForgeCount,
        level: newLevel,
        inventory: [...prev.inventory, newWeapon],
        discoveredWeapons: newDiscovered
      };
    });

    const qName = quality === 'high' ? '高品质' : quality === 'medium' ? '中等品质' : '低品质';
    setHintText(`✨ 锻造成功！获得${qName}武器，可到市场出售换取金币`);
    setTimeout(() => {
      setHintText('将原材料拖入熔炉加热，然后移到铁砧上敲打锻造武器 ⚒️');
    }, 3000);
  }, []);

  const handleHammer = useCallback(() => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 150);
  }, []);

  const handleSellWeapon = useCallback((weaponId: string, price: number) => {
    setPlayerState(prev => ({
      ...prev,
      gold: prev.gold + price,
      inventory: prev.inventory.filter(w => w.id !== weaponId)
    }));
    setHintText(`💰 出售成功！获得 ${price} 金币`);
    setTimeout(() => {
      setHintText('将原材料拖入熔炉加热，然后移到铁砧上敲打锻造武器 ⚒️');
    }, 2500);
  }, []);

  const handleBuyMaterial = useCallback((material: MaterialType, quantity: number, totalPrice: number) => {
    setPlayerState(prev => ({
      ...prev,
      gold: prev.gold - totalPrice,
      materials: {
        ...prev.materials,
        [material]: prev.materials[material] + quantity
      }
    }));
  }, []);

  const handleUseMaterial = useCallback((materials: Partial<Record<MaterialType, number>>) => {
    setPlayerState(prev => {
      const newMats = { ...prev.materials };
      for (const [key, amt] of Object.entries(materials)) {
        newMats[key as MaterialType] = Math.max(0, newMats[key as MaterialType] - (amt as number));
      }
      return { ...prev, materials: newMats };
    });
  }, []);

  const progressPercent = Math.min(100, (playerState.forgeCount / getForgeCountForNextLevel(playerState.level)) * 100);

  return (
    <div className="app-container">
      <header className="status-bar">
        <div className="status-title">⚒️ 中世纪铁匠铺</div>
        <div className="status-items">
          <div className="status-item">
            <span>💰</span>
            <span className="status-gold">{playerState.gold}</span>
          </div>
          <div className="status-item">
            <span>⭐</span>
            <span className="status-level">Lv.{playerState.level}</span>
            <div className="status-progress">
              <div className="status-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
          <div className="status-item">
            <span>⚔️</span>
            <span>{playerState.inventory.length}件</span>
          </div>
        </div>
      </header>

      <div className="mobile-tabs">
        <div className={`mobile-tab ${mobileTab === 'inventory' ? 'active' : ''}`} onClick={() => setMobileTab('inventory')}>
          📜 图鉴
        </div>
        <div className={`mobile-tab ${mobileTab === 'forge' ? 'active' : ''}`} onClick={() => setMobileTab('forge')}>
          ⚒️ 锻造
        </div>
        <div className={`mobile-tab ${mobileTab === 'market' ? 'active' : ''}`} onClick={() => setMobileTab('market')}>
          🏪 市场
        </div>
      </div>

      <main className="main-area">
        <div className={`inventory-panel ${mobileTab !== 'inventory' && mobileTab !== 'forge' ? 'hidden' : ''}`.trim()}>
          <div className="panel-header">📜 锻造图鉴</div>
          <div className="panel-content">
            <InventoryPanel
              playerState={playerState}
            />
          </div>
        </div>

        <div className={`forge-area ${mobileTab !== 'forge' ? 'hidden' : ''} ${isShaking ? 'shake' : ''}`}>
          {showGoldGlow && <div className="golden-glow" />}
          <ForgeCanvas
            playerState={playerState}
            onForgeComplete={handleForgeComplete}
            onHammer={handleHammer}
            onUseMaterial={handleUseMaterial}
          />
        </div>

        <div className={`market-panel ${mobileTab !== 'market' && mobileTab !== 'forge' ? 'hidden' : ''}`.trim()}>
          <div className="panel-header">🏪 交易市场</div>
          <div className="panel-content">
            <MarketPanel
              playerState={playerState}
              onSellWeapon={handleSellWeapon}
              onBuyMaterial={handleBuyMaterial}
              getQualityColor={getQualityColor}
            />
          </div>
        </div>
      </main>

      <footer className="hint-bar">
        <div className="hint-text">{hintText}</div>
      </footer>

      {showLevelUp && (
        <div className="level-up-effect">
          <div className="level-up-text">等级提升! Lv.{levelUpLevel}</div>
          <div className="particle-ring">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} style={{ '--deg': `${i * 30}deg` } as React.CSSProperties} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
