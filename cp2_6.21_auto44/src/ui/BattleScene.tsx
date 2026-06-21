import React, { useEffect, useRef } from 'react';
import { CLASS_STATS } from '@/modules/character';
import { QUALITY_CONFIG, formatBonus, type IEquipment } from '@/modules/equipment';
import {
  type IBattleState,
  type BattleAction,
  type IBattleResult,
} from '@/modules/battle';

interface BattleSceneProps {
  battleState: IBattleState;
  heroClass: string;
  onAction: (action: BattleAction) => void;
  onUseSkill: (skillId: string) => void;
  onBattleEnd?: (result: IBattleResult) => void;
  drop?: IEquipment | null;
  result?: IBattleResult | null;
  leveledUpCount?: number;
  onContinue?: () => void;
  onRest?: () => void;
  onRetry?: () => void;
}

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

const SPRITE_COLORS: Record<string, Record<string, string>> = {
  warrior: { '1': '#8B4513', '2': '#FDBF6F', '3': '#2563EB' },
  mage: { '1': '#6D28D9', '2': '#FDBF6F', '3': '#7C3AED' },
  rogue: { '1': '#1F2937', '2': '#FDBF6F', '3': '#059669' },
  archer: { '1': '#065F46', '2': '#FDBF6F', '3': '#92400E' },
};

function MonsterSpriteColors(base: string): Record<number, string> {
  return {
    0: 'transparent',
    1: base,
    2: '#FFFFFF',
    3: '#000000',
  };
}

function PixelSprite({
  sprite, colors, size = 6, mirror = false,
}: { sprite: number[][]; colors: Record<number | string, string>; size?: number; mirror?: boolean }) {
  const colorMap = colors as Record<number, string>;
  const disp = mirror ? [...sprite].map(r => [...r].reverse()) : sprite;
  return (
    <div
      className="pixel-sprite"
      style={{
        gridTemplateColumns: `repeat(${sprite[0].length}, ${size}px)`,
        gridTemplateRows: `repeat(${sprite.length}, ${size}px)`,
        transform: mirror ? 'scaleX(-1)' : undefined,
      }}
    >
      {disp.flat().map((v, i) => (
        <div key={i} style={{ width: size, height: size, background: colorMap[v] || 'transparent' }} />
      ))}
    </div>
  );
}

function HpBar({ current, max, label }: { current: number; max: number; label?: string }) {
  const ratio = Math.max(0, Math.min(1, current / max));
  const bg = ratio > 0.5 ? '#4ADE80' : ratio > 0.25 ? '#F59E0B' : '#EF4444';
  return (
    <div style={{ minWidth: 220 }}>
      {label && <div style={{ fontSize: 9, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span>
        <span style={{ color: bg }}>{current}/{max}</span>
      </div>}
      <div className="hp-bar-container" style={{ height: 14 }}>
        <div className="hp-bar-fill" style={{ width: `${ratio * 100}%`, background: `linear-gradient(90deg, ${bg}, ${bg}dd)` }} />
      </div>
    </div>
  );
}

function MpBar({ current, max }: { current: number; max: number }) {
  const ratio = Math.max(0, Math.min(1, current / max));
  const bg = '#60A5FA';
  return (
    <div style={{ minWidth: 220 }}>
      <div style={{ fontSize: 9, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
        <span>MP</span>
        <span style={{ color: bg }}>{current}/{max}</span>
      </div>
      <div className="hp-bar-container" style={{ height: 10 }}>
        <div className="hp-bar-fill" style={{ width: `${ratio * 100}%`, background: `linear-gradient(90deg, ${bg}, ${bg}dd)` }} />
      </div>
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

export default function BattleScene(props: BattleSceneProps) {
  const {
    battleState, heroClass, onAction, onUseSkill, drop, result, leveledUpCount = 0,
    onContinue, onRest, onRetry,
  } = props;

  const logsRef = useRef<HTMLDivElement>(null);
  const [showVictory, setShowVictory] = React.useState(false);
  const [showDefeat, setShowDefeat] = React.useState(false);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [battleState.logs]);

  useEffect(() => {
    if (battleState.phase === 'victory') {
      const t = setTimeout(() => setShowVictory(true), 600);
      return () => clearTimeout(t);
    } else if (battleState.phase === 'defeat') {
      const t = setTimeout(() => setShowDefeat(true), 600);
      return () => clearTimeout(t);
    }
  }, [battleState.phase]);

  const isBusy = battleState.phase === 'enemy' || battleState.phase === 'victory' || battleState.phase === 'defeat';
  const classInfo = CLASS_STATS[heroClass as keyof typeof CLASS_STATS];

  const heroSprite = HERO_SPRITE[heroClass] || HERO_SPRITE.warrior;
  const heroColors = SPRITE_COLORS[heroClass] || SPRITE_COLORS.warrior;

  return (
    <div className="scene-transition" style={{ width: '100%' }}>
      <div className="panel" style={{ minHeight: 560, position: 'relative' }}>
        {showDefeat && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.85)', animation: 'fadeIn 0.5s ease-in-out',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, color: '#EF4444', marginBottom: 24, letterSpacing: 2 }}>
                GAME OVER
              </div>
              <div style={{ fontSize: 10, color: '#999', marginBottom: 24 }}>
                你被 {battleState.monster.name} 击败了...
              </div>
              <button className="btn btn-danger btn-wide" onClick={onRetry}>
                🔄 重新开始
              </button>
            </div>
          </div>
        )}

        {showVictory && result && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.88)', animation: 'fadeIn 0.5s ease-in-out',
          }}>
            <div style={{ textAlign: 'center', minWidth: 360 }}>
              <div style={{ fontSize: 24, color: '#FFD700', marginBottom: 16, letterSpacing: 2 }}>
                ✨ 战斗胜利 ✨
              </div>
              <div className="panel" style={{ marginBottom: 16, textAlign: 'left' }}>
                <div style={{ fontSize: 11, marginBottom: 12 }}>
                  击败了 <span style={{ color: '#4ADE80' }}>Lv.{battleState.monster.level} {battleState.monster.name}</span>
                </div>
                <div style={{ fontSize: 10, color: '#FFD700', marginBottom: 8 }}>
                  🌟 获得经验值：+{result.expGained}
                </div>
                {leveledUpCount > 0 && (
                  <div style={{ fontSize: 10, color: '#F59E0B', marginBottom: 8, animation: 'bounce 0.6s ease infinite' }}>
                    🎉 升级了！等级提升 {leveledUpCount} 次，获得 {leveledUpCount * 5} 属性点！
                  </div>
                )}
                {drop ? (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 10, marginBottom: 10 }}>🎁 装备掉落：</div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <DropEquipmentCard eq={drop} />
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 9, color: '#666', marginTop: 8 }}>（本次没有装备掉落）</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="btn btn-wide" onClick={onContinue} style={{ background: '#FFD700', color: '#000', borderColor: '#FFD700' }}>
                  🗺 继续冒险
                </button>
                <button className="btn btn-primary btn-wide" onClick={onRest}>
                  💤 退出休息
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '24px 40px', marginBottom: 16,
          background: 'linear-gradient(180deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%)',
          border: '1px solid #333',
          minHeight: 240,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.15,
            backgroundImage: `
              linear-gradient(#fff 1px, transparent 1px),
              linear-gradient(90deg, #fff 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#FFD700', marginBottom: 8 }}>
              {battleState.hero.name} · Lv.{battleState.hero.level} {classInfo?.name}
            </div>
            <div style={{ marginBottom: 12 }} className={battleState.animatingHero ? 'attack-animation-left' : ''}>
              <PixelSprite sprite={heroSprite} colors={heroColors as any} size={8} />
            </div>
            <HpBar current={battleState.hero.hp} max={battleState.hero.maxHp} label="HP" />
            <div style={{ marginTop: 6 }}>
              <MpBar current={battleState.hero.mp} max={battleState.hero.maxMp} />
            </div>
            {battleState.isDefending && (
              <div style={{ marginTop: 8, fontSize: 9, color: '#60A5FA', animation: 'bounce 0.5s ease infinite' }}>
                🛡 防御中
              </div>
            )}
          </div>

          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 28, color: '#EF4444', marginBottom: 8 }}>VS</div>
            <div style={{ fontSize: 9, color: '#888' }}>回合制战斗</div>
          </div>

          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#EF4444', marginBottom: 8 }}>
              {battleState.monster.name} · Lv.{battleState.monster.level}
            </div>
            <div style={{ marginBottom: 12 }} className={battleState.animatingMonster ? 'attack-animation-right shake-animation' : ''}>
              <PixelSprite
                sprite={battleState.monster.sprite}
                colors={MonsterSpriteColors(battleState.monster.color)}
                size={8}
                mirror
              />
            </div>
            <HpBar current={battleState.monster.hp} max={battleState.monster.maxHp} label="HP" />
          </div>
        </div>

        <div style={{
          display: 'flex', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 300 }}>
            <div style={{ fontSize: 9, color: '#FFD700', marginBottom: 8 }}>📜 战斗日志</div>
            <div
              ref={logsRef}
              style={{
                height: 160, overflowY: 'auto',
                background: '#0D0D0D', border: '1px solid #333',
                padding: '8px 12px',
              }}
            >
              {battleState.logs.map((log, i) => (
                <div key={i} className="log-item">{log}</div>
              ))}
            </div>
          </div>

          <div style={{ minWidth: 280, maxWidth: 320 }}>
            <div style={{ fontSize: 9, color: '#FFD700', marginBottom: 12 }}>
              {battleState.phase === 'player' ? '⚔ 你的回合 - 选择行动' :
               battleState.phase === 'enemy' ? '⏳ 敌方回合中...' :
               battleState.phase === 'victory' ? '🎉 胜利！' : '💀 战败！'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className="btn btn-wide"
                disabled={isBusy}
                onClick={() => onAction('attack')}
                style={{ background: '#B91C1C', borderColor: '#DC2626', width: '100%', height: 38, fontSize: 9 }}
              >🗡 普通攻击</button>
              <button
                className="btn btn-wide"
                disabled={isBusy}
                onClick={() => onAction('defend')}
                style={{ background: '#1E40AF', borderColor: '#3B82F6', width: '100%', height: 38, fontSize: 9 }}
              >🛡 防御</button>
              <button
                className="btn btn-wide"
                disabled={isBusy || battleState.hero.potions <= 0}
                onClick={() => onAction('potion')}
                style={{ background: '#166534', borderColor: '#22C55E', width: '100%', height: 38, fontSize: 9 }}
              >🧪 治疗药水（{battleState.hero.potions}瓶）</button>
            </div>
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 9, color: '#C084FC', marginBottom: 8 }}>✨ 技能</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {battleState.hero.skills.map((skill: any) => {
                  const canUse = !isBusy && battleState.hero.mp >= skill.mpCost;
                  const skillColor = skill.type === 'attack' ? '#DC2626' :
                                     skill.type === 'heal' ? '#16A34A' : '#7C3AED';
                  return (
                    <button
                      key={skill.id}
                      className="btn"
                      disabled={!canUse}
                      onClick={() => onUseSkill(skill.id)}
                      title={skill.description}
                      style={{
                        width: '100%',
                        height: 38,
                        fontSize: 8,
                        background: canUse ? skillColor : '#374151',
                        borderColor: canUse ? skillColor : '#4B5563',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0 10px',
                      }}
                    >
                      <span>{skill.type === 'attack' ? '⚔' : skill.type === 'heal' ? '💚' : '✨'} {skill.name}</span>
                      <span style={{ color: '#60A5FA', fontSize: 8 }}>MP {skill.mpCost}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ marginTop: 14, fontSize: 8, color: '#666', lineHeight: 1.8 }}>
              <div>⚔ 攻击：对敌方造成伤害</div>
              <div>🛡 防御：本回合大幅减伤</div>
              <div>🧪 药水：恢复30HP</div>
              <div>✨ 技能：消耗MP释放强力技能</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DropEquipmentCard({ eq }: { eq: IEquipment }) {
  const qCfg = QUALITY_CONFIG[eq.quality];
  const gradient = `linear-gradient(180deg, ${qCfg.color}, ${adjustColor(qCfg.color, -40)})`;
  const bonuses = formatBonus(eq.bonus);
  return (
    <div
      className="equipment-card drop-animation"
      style={{
        background: gradient,
        width: 160,
        padding: 12,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
        {eq.name}
      </div>
      <div style={{ fontSize: 9, textAlign: 'center' }}>
        {bonuses.map((b, i) => <div key={i} style={{ margin: '3px 0' }}>{b}</div>)}
        {eq.skills && eq.skills.length > 0 && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: 8, marginBottom: 4, color: '#FFD700' }}>✨ 附带技能</div>
            {eq.skills.map((s, i) => (
              <div key={i} style={{ fontSize: 8, margin: '2px 0' }}>
                {s.name} (MP{s.mpCost})
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
