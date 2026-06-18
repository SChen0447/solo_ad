import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useCharacterStore, ClassName, CharacterAttributes, ATTR_KEYS } from './characterStore';
import { useDiceStore } from '../dice/diceStore';
import { roll } from '../dice/DiceRoller';

const CLASS_LIST: ClassName[] = ['战士', '法师', '游侠', '牧师'];
const CLASS_COLORS: Record<ClassName, string> = {
  '战士': '#8B0000',
  '法师': '#4A0080',
  '游侠': '#006400',
  '牧师': '#C4A000',
};
const CLASS_ICONS: Record<ClassName, string> = {
  '战士': '⚔️',
  '法师': '🔮',
  '游侠': '🏹',
  '牧师': '✝️',
};

type DiceAnimState = {
  attrKey: keyof CharacterAttributes;
  diceIndex: number;
  value: number;
  active: boolean;
};

export default function CharacterSheet() {
  const character = useCharacterStore((s) => s.character);
  const createCharacter = useCharacterStore((s) => s.createCharacter);
  const rollAllAttributes = useCharacterStore((s) => s.rollAllAttributes);
  const adjustAttribute = useCharacterStore((s) => s.adjustAttribute);
  const getEffectiveAttributes = useCharacterStore((s) => s.getEffectiveAttributes);
  const addRecord = useDiceStore((s) => s.addRecord);

  const [name, setName] = useState('');
  const [cls, setCls] = useState<ClassName>('战士');
  const [rolling, setRolling] = useState(false);
  const [diceAnims, setDiceAnims] = useState<DiceAnimState[]>([]);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpKey, setLevelUpKey] = useState(0);
  const prevLevelRef = useRef(character?.level ?? 0);

  useEffect(() => {
    if (character && character.level > prevLevelRef.current) {
      setShowLevelUp(true);
      setLevelUpKey((k) => k + 1);
      const t = setTimeout(() => setShowLevelUp(false), 600);
      return () => clearTimeout(t);
    }
    prevLevelRef.current = character?.level ?? 0;
  }, [character?.level]);

  const effective = getEffectiveAttributes();

  const totalBase = character
    ? ATTR_KEYS.reduce((s: number, k: keyof CharacterAttributes) => s + character.baseAttributes[k], 0)
    : 0;
  const totalAdj = character
    ? ATTR_KEYS.reduce((s: number, k: keyof CharacterAttributes) => s + character.adjustment[k], 0)
    : 0;

  const handleCreate = useCallback(() => {
    if (!name.trim()) return;
    createCharacter(name.trim(), cls);
  }, [name, cls, createCharacter]);

  const handleRoll = useCallback(() => {
    if (!character || rolling) return;
    setRolling(true);
    setDiceAnims([]);

    const newRolls: Record<keyof CharacterAttributes, number[]> = {
      力量: [], 敏捷: [], 体质: [], 智力: [], 感知: [], 魅力: [],
    };

    for (const k of ATTR_KEYS) {
      const r = roll({ diceCount: 3, sides: 6 });
      newRolls[k] = r.rolls;
      addRecord({ config: { diceCount: 3, sides: 6 }, result: r, isJudge: false });
    }

    const anims: DiceAnimState[] = [];
    ATTR_KEYS.forEach((k: keyof CharacterAttributes) => {
      newRolls[k].forEach((v: number, i: number) => {
        anims.push({ attrKey: k, diceIndex: i, value: v, active: false });
      });
    });
    setDiceAnims(anims);

    let idx = 0;
    const timer = setInterval(() => {
      setDiceAnims((prev) => {
        const next = [...prev];
        if (idx < next.length) {
          next[idx] = { ...next[idx], active: true };
        }
        idx++;
        if (idx >= next.length) {
          clearInterval(timer);
          setTimeout(() => {
            rollAllAttributes();
            setRolling(false);
          }, 300);
        }
        return next;
      });
    }, 500);

    return () => clearInterval(timer);
  }, [character, rolling, rollAllAttributes, addRecord]);

  const handleAdjust = useCallback(
    (attr: keyof CharacterAttributes, delta: number) => {
      adjustAttribute(attr, delta);
    },
    [adjustAttribute]
  );

  if (!character) {
    return (
      <div style={styles.createContainer}>
        <div style={styles.createCard}>
          <h2 style={styles.createTitle}>创建角色</h2>
          <div style={styles.formGroup}>
            <label style={styles.label}>角色名称</label>
            <input
              style={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入角色名称"
              maxLength={20}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>选择职业</label>
            <div style={styles.classGrid}>
              {CLASS_LIST.map((c) => (
                <button
                  key={c}
                  style={{
                    ...styles.classBtn,
                    ...(cls === c ? styles.classBtnActive : {}),
                    borderColor: cls === c ? CLASS_COLORS[c] : '#5C4033',
                  }}
                  onClick={() => setCls(c)}
                  className="btn-press"
                >
                  <span style={styles.classIcon}>{CLASS_ICONS[c]}</span>
                  <span>{c}</span>
                </button>
              ))}
            </div>
          </div>
          <button
            style={{
              ...styles.createBtn,
              opacity: name.trim() ? 1 : 0.5,
            }}
            onClick={handleCreate}
            disabled={!name.trim()}
            className="btn-press"
          >
            创建角色
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {showLevelUp && (
        <div key={levelUpKey} style={styles.levelUpOverlay}>
          <div style={styles.levelUpInner}>
            <div style={styles.levelUpHalo} />
            <div style={styles.levelUpText}>升级！Lv.{character.level}</div>
          </div>
        </div>
      )}
      <div style={styles.summaryArea}>
        <div style={styles.avatarCircle}>
          <span style={styles.avatarIcon}>{CLASS_ICONS[character.className]}</span>
        </div>
        <div style={styles.summaryInfo}>
          <h2 style={styles.charName}>{character.name}</h2>
          <div style={styles.charClass}>
            <span style={{ color: CLASS_COLORS[character.className] }}>
              {character.className}
            </span>
            <span style={styles.levelBadge}>Lv.{character.level}</span>
          </div>
          <div style={styles.expBarOuter}>
            <div
              style={{
                ...styles.expBarInner,
                width: `${character.experience}%`,
              }}
            />
            <span style={styles.expText}>{character.experience}/100 EXP</span>
          </div>
        </div>
      </div>
      <div style={styles.rollArea}>
        <button
          style={{
            ...styles.rollBtn,
            opacity: rolling ? 0.6 : 1,
          }}
          onClick={handleRoll}
          disabled={rolling}
          className="btn-press"
        >
          {rolling ? '投点中...' : '🎲 摇点生成属性'}
        </button>
        <span style={styles.totalHint}>
          基础总值: {totalBase + totalAdj} / 72
        </span>
      </div>
      <div style={styles.attrGrid}>
        {ATTR_KEYS.map((k: keyof CharacterAttributes) => {
          const detail = character.attributeDetail[k];
          const adj = character.adjustment[k];
          const val = effective ? effective[k] : 0;
          const hasActive = diceAnims.some(
            (d) => d.attrKey === k && d.active
          );
          return (
            <div
              key={k}
              style={{
                ...styles.attrSlot,
                animation: hasActive ? 'attrSlotGlow 0.5s ease' : 'none',
              }}
            >
              <div style={styles.attrName}>{k}</div>
              <div style={styles.attrValue}>{val}</div>
              <div style={styles.attrDetail}>
                {detail.rolls[0]
                  ? `${detail.rolls.join('+')}${adj !== 0 ? (adj > 0 ? '+' : '') + adj : ''}`
                  : '—'}
              </div>
              <div style={styles.adjControls}>
                <button
                  style={styles.adjBtn}
                  onClick={() => handleAdjust(k, -1)}
                  className="btn-press"
                >
                  −
                </button>
                <span style={styles.adjValue}>
                  {adj > 0 ? '+' : ''}{adj}
                </span>
                <button
                  style={styles.adjBtn}
                  onClick={() => handleAdjust(k, 1)}
                  className="btn-press"
                >
                  +
                </button>
              </div>
              {diceAnims
                .filter((d) => d.attrKey === k)
                .map((d) =>
                  d.active ? (
                    <div
                      key={`${k}-${d.diceIndex}`}
                      style={styles.diceFlyIn}
                      className="dice-fly-in"
                    >
                      {d.value}
                    </div>
                  ) : null
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  createContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
    padding: 24,
  },
  createCard: {
    background: 'rgba(43,29,14,0.95)',
    borderRadius: 12,
    padding: 32,
    width: '100%',
    maxWidth: 420,
    border: '2px solid #D4A843',
    boxShadow: '0 0 20px rgba(212,168,67,0.3)',
  },
  createTitle: {
    color: '#D4A843',
    fontSize: 24,
    fontWeight: 700,
    textAlign: 'center' as const,
    marginBottom: 24,
    textShadow: '0 0 10px rgba(212,168,67,0.5)',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    display: 'block',
    color: '#D4A843',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: 600,
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #5C4033',
    background: 'rgba(20,14,8,0.8)',
    color: '#E8D5B7',
    fontSize: 16,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  classGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },
  classBtn: {
    padding: '12px 8px',
    borderRadius: 8,
    border: '2px solid',
    background: 'rgba(20,14,8,0.6)',
    color: '#E8D5B7',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    fontSize: 15,
    fontWeight: 600,
    transition: 'all 0.2s',
  },
  classBtnActive: {
    background: 'rgba(212,168,67,0.15)',
    boxShadow: '0 0 10px rgba(212,168,67,0.3)',
  },
  classIcon: {
    fontSize: 20,
  },
  createBtn: {
    width: '100%',
    padding: 14,
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #D4A843, #8B6914)',
    color: '#2B1D0E',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 8,
    transition: 'all 0.2s',
  },
  container: {
    padding: 24,
    position: 'relative' as const,
  },
  summaryArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    padding: 20,
    background: 'rgba(43,29,14,0.8)',
    borderRadius: 12,
    border: '1px solid #5C4033',
    marginBottom: 20,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3D2B1A, #5C4033)',
    border: '3px solid #D4A843',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarIcon: {
    fontSize: 32,
  },
  summaryInfo: {
    flex: 1,
    minWidth: 0,
  },
  charName: {
    color: '#D4A843',
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
  },
  charClass: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    fontSize: 15,
    color: '#E8D5B7',
  },
  levelBadge: {
    background: 'rgba(212,168,67,0.2)',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 13,
    color: '#D4A843',
    fontWeight: 700,
  },
  expBarOuter: {
    height: 18,
    borderRadius: 9,
    background: 'rgba(20,14,8,0.8)',
    marginTop: 8,
    position: 'relative' as const,
    overflow: 'hidden',
    border: '1px solid #5C4033',
  },
  expBarInner: {
    height: '100%',
    borderRadius: 9,
    background: 'linear-gradient(90deg, #8B6914, #D4A843)',
    transition: 'width 0.4s ease',
  },
  expText: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    color: '#E8D5B7',
    fontWeight: 700,
  },
  rollArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  rollBtn: {
    padding: '10px 24px',
    borderRadius: 8,
    border: '2px solid #D4A843',
    background: 'linear-gradient(135deg, rgba(139,105,20,0.4), rgba(212,168,67,0.2))',
    color: '#D4A843',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  totalHint: {
    color: '#8B7355',
    fontSize: 13,
  },
  attrGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 14,
  },
  attrSlot: {
    background: 'rgba(43,29,14,0.9)',
    borderRadius: 10,
    border: '2px solid #5C4033',
    padding: 14,
    position: 'relative' as const,
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)',
    minHeight: 110,
  },
  attrName: {
    color: '#D4A843',
    fontSize: 13,
    fontWeight: 700,
    position: 'absolute' as const,
    top: 10,
    left: 12,
  },
  attrValue: {
    fontSize: 36,
    fontWeight: 800,
    color: '#E8D5B7',
    textAlign: 'center' as const,
    lineHeight: 1.2,
    marginTop: 8,
  },
  attrDetail: {
    fontSize: 12,
    color: '#8B7355',
    textAlign: 'right' as const,
    position: 'absolute' as const,
    bottom: 34,
    right: 12,
  },
  adjControls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  adjBtn: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    border: '1px solid #5C4033',
    background: 'rgba(20,14,8,0.8)',
    color: '#D4A843',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    transition: 'all 0.2s',
  },
  adjValue: {
    color: '#D4A843',
    fontSize: 14,
    fontWeight: 700,
    minWidth: 20,
    textAlign: 'center' as const,
  },
  diceFlyIn: {
    position: 'absolute' as const,
    top: -10,
    right: -5,
    width: 28,
    height: 28,
    borderRadius: 4,
    background: '#D4A843',
    color: '#2B1D0E',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: 14,
    boxShadow: '0 0 8px rgba(212,168,67,0.6)',
    animation: 'diceFly 0.5s ease-out',
    zIndex: 10,
  },
  levelUpOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    pointerEvents: 'none' as const,
  },
  levelUpInner: {
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelUpHalo: {
    width: 160,
    height: 160,
    borderRadius: '50%',
    border: '4px solid #D4A843',
    animation: 'levelUpSpin 0.6s linear infinite',
    boxShadow: '0 0 40px rgba(212,168,67,0.8), inset 0 0 40px rgba(212,168,67,0.3)',
  },
  levelUpText: {
    position: 'absolute' as const,
    color: '#D4A843',
    fontSize: 28,
    fontWeight: 800,
    textShadow: '0 0 20px rgba(212,168,67,0.8)',
  },
};
