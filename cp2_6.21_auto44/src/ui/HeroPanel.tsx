import React, { useState } from 'react';
import type { IHero, AttributeType } from '@/modules/character';
import { CLASS_STATS, ATTR_COEFFICIENTS } from '@/modules/character';
import {
  QUALITY_CONFIG,
  EQUIPMENT_CONFIG,
  INVENTORY_LIMIT,
  formatBonus,
  type IEquipment,
  type EquipmentType,
} from '@/modules/equipment';

interface HeroPanelProps {
  hero: IHero;
  onAssignAttr: (attr: AttributeType) => void;
  onConfirmAttrs: () => void;
  onEquipItem: (eq: IEquipment) => { replaced: IEquipment | null; inventoryFull: boolean };
  onUnequipItem: (slot: EquipmentType) => { success: boolean; inventoryFull: boolean };
  onEnterMap: () => void;
  warningMessage?: string;
}

const EQUIP_SLOTS: EquipmentType[] = ['weapon', 'helmet', 'armor', 'boots'];

const HERO_SPRITE: Record<string, number[][]> = {
  warrior: [
    [0,0,1,1,1,1,0,0],[0,1,2,2,2,2,1,0],[1,2,1,2,2,1,2,1],
    [1,2,2,2,2,2,2,1],[0,1,3,3,3,3,1,0],[0,1,3,3,3,3,1,0],
    [0,0,1,1,1,1,0,0],[0,1,1,0,0,1,1,0],
  ],
  mage: [
    [0,0,0,1,1,0,0,0],[0,0,1,3,3,1,0,0],[0,1,2,2,2,2,1,0],
    [1,2,1,2,2,1,2,1],[1,2,2,2,2,2,2,1],[0,1,3,3,3,3,1,0],
    [0,1,3,3,3,3,1,0],[0,0,1,1,1,1,0,0],
  ],
  rogue: [
    [0,0,1,1,1,1,0,0],[0,1,2,2,2,2,1,0],[1,2,3,2,2,3,2,1],
    [1,2,2,2,2,2,2,1],[0,1,1,2,2,1,1,0],[0,1,3,3,3,3,1,0],
    [0,1,3,0,0,3,1,0],[0,0,1,0,0,1,0,0],
  ],
  archer: [
    [0,0,1,1,1,1,0,0],[0,1,2,2,2,2,1,0],[1,2,1,2,2,1,2,1],
    [1,2,2,2,2,2,2,3],[0,1,3,3,3,3,3,0],[0,1,3,3,3,3,1,0],
    [0,0,1,1,1,1,0,0],[0,1,1,0,0,1,1,0],
  ],
};

const SPRITE_COLORS: Record<string, string> = {
  warrior: { '1': '#8B4513', '2': '#FDBF6F', '3': '#2563EB' },
  mage: { '1': '#6D28D9', '2': '#FDBF6F', '3': '#7C3AED' },
  rogue: { '1': '#1F2937', '2': '#FDBF6F', '3': '#059669' },
  archer: { '1': '#065F46', '2': '#FDBF6F', '3': '#92400E' },
};

function HpBar({ current, max }: { current: number; max: number }) {
  const ratio = Math.max(0, Math.min(1, current / max));
  const bg = ratio > 0.5 ? '#4ADE80' : ratio > 0.25 ? '#F59E0B' : '#EF4444';
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 8, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
        <span>HP</span><span style={{ color: '#4ADE80' }}>{current}/{max}</span>
      </div>
      <div className="hp-bar-container">
        <div className="hp-bar-fill" style={{ width: `${ratio * 100}%`, background: bg }} />
      </div>
    </div>
  );
}

function MpBar({ current, max }: { current: number; max: number }) {
  const ratio = Math.max(0, Math.min(1, current / max));
  const bg = '#60A5FA';
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ fontSize: 8, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
        <span>MP</span><span style={{ color: bg }}>{current}/{max}</span>
      </div>
      <div className="hp-bar-container" style={{ height: 10 }}>
        <div className="hp-bar-fill" style={{ width: `${ratio * 100}%`, background: bg }} />
      </div>
    </div>
  );
}

function PixelSprite({ sprite, colors, size = 5 }: { sprite: number[][]; colors: Record<string, string>; size?: number }) {
  const colorMap = { 0: 'transparent', ...colors } as Record<number, string>;
  return (
    <div
      className="pixel-sprite"
      style={{
        gridTemplateColumns: `repeat(${sprite[0].length}, ${size}px)`,
        gridTemplateRows: `repeat(${sprite.length}, ${size}px)`,
      }}
    >
      {sprite.flat().map((v, i) => (
        <div key={i} style={{ width: size, height: size, background: colorMap[v] || 'transparent' }} />
      ))}
    </div>
  );
}

function EquipmentCard({
  eq, onDragStart, small = false, animate = false,
}: { eq: IEquipment; onDragStart?: (e: React.DragEvent) => void; small?: boolean; animate?: boolean }) {
  const qCfg = QUALITY_CONFIG[eq.quality];
  const gradient = `linear-gradient(180deg, ${qCfg.color}, ${adjustColor(qCfg.color, -40)})`;
  const bonuses = formatBonus(eq.bonus);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`equipment-card ${animate ? 'drop-animation' : ''}`}
      style={{
        background: gradient,
        width: small ? 88 : 100,
      }}
      title={eq.name}
    >
      <div style={{ fontSize: small ? 7 : 8, fontWeight: 'bold', marginBottom: 4, wordBreak: 'break-all' }}>
        {eq.name}
      </div>
      <div style={{ fontSize: small ? 6 : 7, opacity: 0.9 }}>
        {bonuses.map((b, i) => <div key={i} style={{ margin: '2px 0' }}>{b}</div>)}
      </div>
      {eq.skills && eq.skills.length > 0 && (
        <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px dashed rgba(255,255,255,0.3)' }}>
          <div style={{ fontSize: small ? 5.5 : 6.5, color: '#FFD700', marginBottom: 2 }}>✨技能</div>
          {eq.skills.map((s, i) => (
            <div key={i} style={{ fontSize: small ? 5.5 : 6.5 }}>
              {s.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0xff) + amount;
  let b = (num & 0xff) + amount;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

export default function HeroPanel(props: HeroPanelProps) {
  const { hero, onAssignAttr, onConfirmAttrs, onEquipItem, onUnequipItem, onEnterMap, warningMessage } = props;
  const [dragOverSlot, setDragOverSlot] = useState<EquipmentType | null>(null);
  const [showWarn, setShowWarn] = useState(false);
  const [successBounce, setSuccessBounce] = useState(false);
  const [dragEq, setDragEq] = useState<IEquipment | null>(null);

  React.useEffect(() => {
    if (warningMessage) {
      setShowWarn(true);
      const t = setTimeout(() => setShowWarn(false), 1000);
      return () => clearTimeout(t);
    }
  }, [warningMessage]);

  const handleConfirm = () => {
    if (hero.availablePoints > 0) return;
    onConfirmAttrs();
    setSuccessBounce(true);
    setTimeout(() => setSuccessBounce(false), 300);
  };

  const handleDropOnSlot = (e: React.DragEvent, slot: EquipmentType) => {
    e.preventDefault();
    setDragOverSlot(null);
    if (!dragEq) return;
    if (dragEq.type !== slot) {
      alert('装备类型与槽位不匹配！');
      setDragEq(null);
      return;
    }
    const res = onEquipItem(dragEq);
    if (res.inventoryFull) {
      alert(`背包已满（上限${INVENTORY_LIMIT}件）！请先清理背包。`);
    }
    setDragEq(null);
  };

  const handleUnequip = (slot: EquipmentType) => {
    const eq = hero.equipment[slot];
    if (!eq) return;
    const res = onUnequipItem(slot);
    if (!res.success && res.inventoryFull) {
      alert(`背包已满（上限${INVENTORY_LIMIT}件）！`);
    }
  };

  const attrs: AttributeType[] = ['str', 'agi', 'vit', 'int'];
  const classInfo = CLASS_STATS[hero.heroClass];

  return (
    <div className={`scene-transition ${showWarn ? 'warn-flash' : ''}`} style={{ width: '100%' }}>
      <div className="panel" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center', minWidth: 140 }}>
            <div style={{
              background: '#0D0D0D', padding: 16, border: '1px solid #fff',
              display: 'inline-block',
            }}>
              <PixelSprite
                sprite={HERO_SPRITE[hero.heroClass]}
                colors={SPRITE_COLORS[hero.heroClass]}
                size={6}
              />
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: '#FFD700' }}>{hero.name}</div>
            <div style={{ marginTop: 4, fontSize: 10 }}>
              Lv.{hero.level} {classInfo.name}
            </div>
            <div style={{ width: 160, marginTop: 8 }}>
              <HpBar current={hero.hp} max={hero.maxHp} />
              <MpBar current={hero.mp} max={hero.maxMp} />
            </div>
            <div style={{ marginTop: 8, fontSize: 9, color: '#999' }}>
              EXP: {hero.exp} / {hero.expToNext}
            </div>
            <div style={{ marginTop: 10, fontSize: 10, display: 'grid', gap: 4 }}>
              <div>ATK: <span style={{ color: '#F87171' }}>{hero.atk}</span></div>
              <div>DEF: <span style={{ color: '#60A5FA' }}>{hero.def}</span></div>
              <div>SPD: <span style={{ color: '#34D399' }}>{hero.spd}</span></div>
              <div>MATK: <span style={{ color: '#C084FC' }}>{hero.matk}</span></div>
              <div style={{ marginTop: 6, color: '#FFD700' }}>🧪 药水 x{hero.potions}</div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 300 }}>
            <div style={{ marginBottom: 12, fontSize: 11, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>可用属性点：</span>
              <span style={{ color: '#FFD700', fontSize: 16 }}>{hero.availablePoints}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
              {attrs.map((a) => {
                const info = ATTR_COEFFICIENTS[a];
                const current = hero[a] + hero.pendingAttrs[a];
                return (
                  <div key={a} className="attr-cell">
                    <div>
                      <div style={{ fontSize: 10 }}>{info.label}</div>
                      <div style={{ fontSize: 12, color: '#FFD700', marginTop: 2 }}>{current}</div>
                    </div>
                    <button
                      className="btn"
                      style={{ width: 28, height: 28, fontSize: 12, minWidth: 28 }}
                      disabled={hero.availablePoints <= 0}
                      onClick={() => onAssignAttr(a)}
                    >+</button>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                className={`btn btn-primary btn-wide ${successBounce ? 'btn-success-bounce' : ''}`}
                onClick={handleConfirm}
                disabled={hero.availablePoints > 0}
              >确认分配</button>
              <button className="btn btn-wide" onClick={onEnterMap} style={{ background: '#FFD700', color: '#000', borderColor: '#FFD700' }}>
                🗺 进入地图
              </button>
            </div>
            {hero.availablePoints > 0 && (
              <div style={{ marginTop: 10, fontSize: 9, color: '#F59E0B' }}>
                ⚠ 还有 {hero.availablePoints} 点属性需要分配
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <div style={{ marginBottom: 12, fontSize: 11, color: '#FFD700' }}>装备栏</div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          {EQUIP_SLOTS.map((slot) => {
            const eq = hero.equipment[slot] as IEquipment | null;
            const isDragOver = dragOverSlot === slot;
            const isCorrectDrag = dragEq && dragEq.type === slot;
            return (
              <div key={slot} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 9, marginBottom: 6, color: '#999' }}>
                  {EQUIPMENT_CONFIG[slot].label}
                </div>
                <div
                  className={`equipment-slot ${isDragOver && isCorrectDrag ? 'drag-over' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverSlot(slot);
                  }}
                  onDragLeave={() => setDragOverSlot(null)}
                  onDrop={(e) => handleDropOnSlot(e, slot)}
                >
                  {eq ? (
                    <div onClick={() => handleUnequip(slot)} style={{ cursor: 'pointer' }} title="点击卸下">
                      <EquipmentCard eq={eq} small onDragStart={(e) => {
                        setDragEq(eq);
                        e.dataTransfer.effectAllowed = 'move';
                      }} />
                    </div>
                  ) : (
                    <div className="slot-label">
                      {EQUIPMENT_CONFIG[slot].label}<br />
                      <span style={{ fontSize: 6 }}>拖入装备</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#FFD700', marginBottom: 10 }}>✨ 技能列表</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
            {hero.skills.map((skill: any) => (
              <div
                key={skill.id}
                style={{
                  background: '#0D0D0D',
                  border: '1px solid #333',
                  padding: '8px 10px',
                  borderRadius: 4,
                  borderLeft: `3px solid ${skill.type === 'attack' ? '#DC2626' : skill.type === 'heal' ? '#16A34A' : '#7C3AED'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 9, fontWeight: 'bold' }}>
                    {skill.type === 'attack' ? '⚔' : skill.type === 'heal' ? '💚' : '✨'} {skill.name}
                  </span>
                  <span style={{ fontSize: 8, color: '#60A5FA' }}>MP {skill.mpCost}</span>
                </div>
                <div style={{ fontSize: 8, color: '#999', lineHeight: 1.5 }}>
                  {skill.description}
                </div>
                {skill.fromEquipment && (
                  <div style={{ fontSize: 7, color: '#A78BFA', marginTop: 4 }}>（装备附带）</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: '#FFD700' }}>背包</div>
          <div style={{ fontSize: 9, color: hero.inventory.length >= INVENTORY_LIMIT ? '#EF4444' : '#999' }}>
            {hero.inventory.length} / {INVENTORY_LIMIT}
          </div>
        </div>
        {hero.inventory.length === 0 ? (
          <div style={{ fontSize: 9, color: '#666', padding: 16, textAlign: 'center', background: '#0D0D0D', border: '1px dashed #333' }}>
            背包是空的，击败怪物可获得装备掉落。
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: 12, background: '#0D0D0D', border: '1px solid #333' }}>
            {hero.inventory.map((eq: IEquipment) => (
              <EquipmentCard
                key={eq.id}
                eq={eq}
                small
                onDragStart={(e) => {
                  setDragEq(eq);
                  e.dataTransfer.effectAllowed = 'move';
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
