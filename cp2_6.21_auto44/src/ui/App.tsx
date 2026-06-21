import React, { useState, useEffect, useCallback } from 'react';
import HeroPanel from '@/ui/HeroPanel';
import BattleScene from '@/ui/BattleScene';
import {
  createHero,
  assignPendingAttr,
  confirmAttrs,
  gainExp,
  restHero,
  recalcStatsFromAttrs,
  CLASS_STATS,
  type IHero,
  type HeroClass,
  type AttributeType,
} from '@/modules/character';
import {
  equipItem,
  unequipItem,
  addToInventory,
  generateEquipment,
  type IEquipment,
  type EquipmentType,
  QUALITY_CONFIG,
  EQUIPMENT_CONFIG,
  INVENTORY_LIMIT,
} from '@/modules/equipment';
import {
  startBattle,
  executePlayerAction,
  executeEnemyTurn,
  clearAnimations,
  generateMapMonsters,
  buildBattleResult,
  type IBattleState,
  type BattleAction,
  type IBattleResult,
  type IMonster,
} from '@/modules/battle';

type Scene = 'create' | 'panel' | 'map' | 'battle';

export default function App() {
  const [scene, setScene] = useState<Scene>('create');
  const [hero, setHero] = useState<IHero | null>(null);
  const [heroName, setHeroName] = useState('');
  const [selectedClass, setSelectedClass] = useState<HeroClass | null>(null);
  const [warningMessage, setWarningMessage] = useState<string>('');
  const [mapMonsters, setMapMonsters] = useState<IMonster[]>([]);
  const [currentMonsterIdx, setCurrentMonsterIdx] = useState(-1);
  const [battleState, setBattleState] = useState<IBattleState | null>(null);
  const [battleResult, setBattleResult] = useState<IBattleResult | null>(null);
  const [currentDrop, setCurrentDrop] = useState<IEquipment | null>(null);
  const [leveledUpCount, setLeveledUpCount] = useState(0);

  const warnOnce = useCallback((msg: string) => {
    setWarningMessage(msg);
    setTimeout(() => setWarningMessage(''), 100);
  }, []);

  const handleCreateHero = () => {
    if (!heroName.trim()) { alert('请输入英雄名称！'); return; }
    if (!selectedClass) { alert('请选择职业！'); return; }
    let h = createHero(heroName.trim(), selectedClass);
    h = recalcStatsFromAttrs(h);
    setHero(h);
    setScene('panel');
  };

  const handleAssignAttr = (attr: AttributeType) => {
    if (!hero) return;
    const res = assignPendingAttr(hero, attr);
    if (res.success) setHero(recalcStatsFromAttrs(res.hero));
  };

  const handleConfirmAttrs = () => {
    if (!hero) return;
    setHero(confirmAttrs(hero));
  };

  const handleEquipItem = (eq: IEquipment) => {
    if (!hero) return { replaced: null, inventoryFull: false };
    let workingHero = hero;
    const idx = workingHero.inventory.findIndex(e => e.id === eq.id);
    if (idx >= 0) {
      workingHero = {
        ...JSON.parse(JSON.stringify(workingHero)),
        inventory: workingHero.inventory.filter((e: IEquipment) => e.id !== eq.id),
      };
    }
    const res = equipItem(workingHero, eq);
    setHero(recalcStatsFromAttrs(res.hero));
    if (res.inventoryFull) warnOnce(`背包已满（${INVENTORY_LIMIT}件上限）`);
    return res;
  };

  const handleUnequipItem = (slot: EquipmentType) => {
    if (!hero) return { success: false, inventoryFull: false };
    const res = unequipItem(hero, slot);
    if (res.success) setHero(recalcStatsFromAttrs(res.hero));
    if (res.inventoryFull) warnOnce(`背包已满（${INVENTORY_LIMIT}件上限）`);
    return res;
  };

  const handleEnterMap = () => {
    if (!hero) return;
    if (hero.availablePoints > 0) {
      alert('请先分配完剩余的属性点！');
      return;
    }
    const monsters = generateMapMonsters(hero.level);
    setMapMonsters(monsters);
    setCurrentMonsterIdx(-1);
    setScene('map');
  };

  const handleSelectMonster = (idx: number) => {
    if (!hero) return;
    setCurrentMonsterIdx(idx);
    const bs = startBattle(hero, mapMonsters[idx]);
    setBattleState(bs);
    setBattleResult(null);
    setCurrentDrop(null);
    setLeveledUpCount(0);
    setScene('battle');
  };

  const handleBattleAction = (action: BattleAction) => {
    if (!battleState || !hero) return;
    let bs = executePlayerAction(battleState, action);
    setBattleState(bs);
    setTimeout(() => {
      setBattleState(prev => prev ? clearAnimations(prev) : prev);
    }, 450);
    setTimeout(() => {
      setBattleState(prevState => {
        if (!prevState) return prevState;
        let s = prevState;
        if (s.phase === 'enemy') {
          s = executeEnemyTurn(s);
          setTimeout(() => {
            setBattleState(p => p ? clearAnimations(p) : p);
          }, 450);
        }
        if (s.phase === 'victory') {
          const result = buildBattleResult(s, hero.level);
          setBattleResult(result);
          setCurrentDrop(result.drop || null);
          let updatedHero: IHero = JSON.parse(JSON.stringify(hero));
          updatedHero.hp = result.heroHp;
          const expRes = gainExp(updatedHero, result.expGained);
          updatedHero = expRes.hero;
          setLeveledUpCount(expRes.leveledUp);
          if (result.drop) {
            const addRes = addToInventory(updatedHero, result.drop);
            updatedHero = addRes.hero;
            if (!addRes.added) warnOnce(`背包已满，装备丢失！（${INVENTORY_LIMIT}件上限）`);
          }
          setHero(recalcStatsFromAttrs(updatedHero));
        }
        return s;
      });
    }, 600);
  };

  const handleContinue = () => {
    if (!hero) return;
    const remaining = mapMonsters.filter((_, i) => i !== currentMonsterIdx);
    if (remaining.length === 0) {
      const refreshed = generateMapMonsters(hero.level);
      setMapMonsters(refreshed);
    } else {
      setMapMonsters(remaining);
    }
    setCurrentMonsterIdx(-1);
    setBattleState(null);
    setBattleResult(null);
    setCurrentDrop(null);
    setScene('map');
  };

  const handleRest = () => {
    if (!hero) return;
    setHero(restHero(hero));
    setBattleState(null);
    setBattleResult(null);
    setCurrentDrop(null);
    setScene('panel');
  };

  const handleRetry = () => {
    setHero(null);
    setBattleState(null);
    setBattleResult(null);
    setCurrentDrop(null);
    setHeroName('');
    setSelectedClass(null);
    setScene('create');
  };

  const handleLeaveMap = () => {
    if (!hero) return;
    setHero(restHero(hero));
    setScene('panel');
  };

  return (
    <div className="app-container">
      <div className="game-wrapper">
        {scene === 'create' && <CreateScene
          heroName={heroName}
          selectedClass={selectedClass}
          onNameChange={setHeroName}
          onSelectClass={setSelectedClass}
          onCreate={handleCreateHero}
        />}
        {scene === 'panel' && hero && (
          <HeroPanel
            hero={hero}
            onAssignAttr={handleAssignAttr}
            onConfirmAttrs={handleConfirmAttrs}
            onEquipItem={handleEquipItem}
            onUnequipItem={handleUnequipItem}
            onEnterMap={handleEnterMap}
            warningMessage={warningMessage}
          />
        )}
        {scene === 'map' && hero && (
          <MapScene
            monsters={mapMonsters}
            heroLevel={hero.level}
            heroName={hero.name}
            onSelectMonster={handleSelectMonster}
            onLeaveMap={handleLeaveMap}
          />
        )}
        {scene === 'battle' && battleState && hero && (
          <BattleScene
            battleState={battleState}
            heroClass={hero.heroClass}
            onAction={handleBattleAction}
            drop={currentDrop}
            result={battleResult}
            leveledUpCount={leveledUpCount}
            onContinue={handleContinue}
            onRest={handleRest}
            onRetry={handleRetry}
          />
        )}
      </div>
    </div>
  );
}

function CreateScene({
  heroName, selectedClass, onNameChange, onSelectClass, onCreate,
}: {
  heroName: string;
  selectedClass: HeroClass | null;
  onNameChange: (n: string) => void;
  onSelectClass: (c: HeroClass) => void;
  onCreate: () => void;
}) {
  const classes: HeroClass[] = ['warrior', 'mage', 'rogue', 'archer'];
  const iconMap: Record<HeroClass, string> = {
    warrior: '⚔️', mage: '🔮', rogue: '🗡️', archer: '🏹',
  };
  return (
    <div className="scene-transition" style={{ width: '100%' }}>
      <div className="panel">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 20, color: '#FFD700', marginBottom: 8, letterSpacing: 2 }}>
            ⚔ 像素 JRPG ⚔
          </div>
          <div style={{ fontSize: 10, color: '#999' }}>
            战斗与角色养成系统 · 迷你原型
          </div>
        </div>

        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, marginBottom: 10, color: '#FFD700' }}>
              ▶ 输入英雄名称（≤16字符）
            </div>
            <input
              type="text"
              value={heroName}
              maxLength={16}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="请输入英雄名称..."
              style={{ width: '100%', height: 40, fontSize: 11 }}
            />
            <div style={{ fontSize: 8, color: '#666', marginTop: 6, textAlign: 'right' }}>
              {heroName.length} / 16
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, marginBottom: 14, color: '#FFD700' }}>
              ▶ 选择职业
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
              {classes.map((c) => {
                const s = CLASS_STATS[c];
                const selected = selectedClass === c;
                return (
                  <div
                    key={c}
                    className={`class-card ${selected ? 'selected' : ''}`}
                    onClick={() => onSelectClass(c)}
                  >
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{iconMap[c]}</div>
                    <div style={{ fontSize: 11, marginBottom: 10, color: selected ? '#FFD700' : '#fff' }}>
                      {s.name}
                    </div>
                    <div style={{ fontSize: 8, lineHeight: 2, textAlign: 'left', color: '#bbb' }}>
                      <div>HP：<span style={{ color: '#4ADE80' }}>{s.hp}</span></div>
                      <div>ATK：<span style={{ color: '#F87171' }}>{s.atk}</span></div>
                      <div>DEF：<span style={{ color: '#60A5FA' }}>{s.def}</span></div>
                      <div>SPD：<span style={{ color: '#34D399' }}>{s.spd}</span></div>
                      <div>MATK：<span style={{ color: '#C084FC' }}>{s.matk}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={onCreate}
              disabled={!heroName.trim() || !selectedClass}
              style={{ width: 200, height: 48, fontSize: 12 }}
            >
              🎮 开始冒险
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MapScene({
  monsters, heroLevel, heroName, onSelectMonster, onLeaveMap,
}: {
  monsters: IMonster[];
  heroLevel: number;
  heroName: string;
  onSelectMonster: (idx: number) => void;
  onLeaveMap: () => void;
}) {
  const positions = [
    { top: '20%', left: '25%' },
    { top: '15%', left: '70%' },
    { top: '60%', left: '20%' },
    { top: '65%', left: '75%' },
  ];
  return (
    <div className="scene-transition" style={{ width: '100%' }}>
      <div className="panel" style={{ minHeight: 580, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 12, color: '#FFD700' }}>🗺 随机地图</div>
            <div style={{ fontSize: 9, color: '#888', marginTop: 6 }}>
              英雄 {heroName} · Lv.{heroLevel} | 剩余怪物：{monsters.length}
            </div>
          </div>
          <button className="btn btn-primary" onClick={onLeaveMap} style={{ width: 140 }}>
            💤 离开休息
          </button>
        </div>

        <div style={{
          position: 'relative',
          background: `
            radial-gradient(circle at 30% 30%, rgba(74, 222, 128, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 70% 70%, rgba(139, 92, 246, 0.08) 0%, transparent 50%),
            linear-gradient(180deg, #0a0f0a 0%, #0f1015 100%)
          `,
          border: '2px solid #333',
          minHeight: 440,
          overflow: 'hidden',
        }}>
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {positions.slice(0, monsters.length).map((p, i) => {
              if (i === 0) return null;
              const prev = positions[i - 1];
              return (
                <line
                  key={i}
                  x1={prev.left} y1={prev.top}
                  x2={p.left} y2={p.top}
                  stroke="#444"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              );
            })}
          </svg>

          {monsters.map((m, i) => (
            <MonsterNode
              key={m.id}
              monster={m}
              style={positions[i] || { top: '50%', left: '50%' }}
              onClick={() => onSelectMonster(i)}
            />
          ))}

          {monsters.length === 0 && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
            }}>
              <div style={{ fontSize: 14, color: '#FFD700', marginBottom: 12 }}>
                ✨ 地图已清理！
              </div>
              <div style={{ fontSize: 10, color: '#888' }}>
                休息后将生成新的怪物节点
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, fontSize: 9, color: '#666', textAlign: 'center' }}>
          💡 点击怪物节点进入战斗 · 击败所有怪物后进入休息室恢复
        </div>
      </div>
    </div>
  );
}

function MonsterNode({
  monster, style, onClick,
}: {
  monster: IMonster;
  style: { top: string; left: string };
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'absolute',
        top: style.top,
        left: style.left,
        transform: 'translate(-50%, -50%)',
        cursor: 'pointer',
        textAlign: 'center',
        animation: 'bounce 2s ease-in-out infinite',
        animationDelay: `${Math.random() * 0.5}s`,
      }}
    >
      <div style={{
        width: 80, height: 80,
        background: `radial-gradient(circle, ${monster.color}44 0%, transparent 70%)`,
        border: `2px solid ${monster.color}`,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 0 20px ${monster.color}66`,
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)';
        e.currentTarget.style.boxShadow = `0 0 30px ${monster.color}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
      >
        <div style={{ fontSize: 32 }}>
          {monster.type === 'slime' ? '🟢' :
           monster.type === 'skeleton' ? '💀' :
           monster.type === 'bat' ? '🦇' : '👹'}
        </div>
      </div>
      <div style={{
        fontSize: 8, marginTop: 6, color: '#fff',
        background: 'rgba(0,0,0,0.7)', padding: '3px 6px',
        border: '1px solid #444', display: 'inline-block',
      }}>
        {monster.name} Lv.{monster.level}
      </div>
      <div style={{ fontSize: 7, marginTop: 2, color: '#999' }}>
        HP:{monster.maxHp} ATK:{monster.atk}
      </div>
    </div>
  );
}
