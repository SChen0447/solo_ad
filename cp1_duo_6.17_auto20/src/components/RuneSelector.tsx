import React, { useState, useCallback, useEffect, useRef } from 'react';
import { RuneType, RUNE_EFFECTS, RUNE_COUNTERS } from '../game/types';

interface RuneSelectorProps {
  onRunesSelected: (runes: RuneType[]) => void;
  selectedRunes?: RuneType[];
}

const RUNES: { type: RuneType; name: string; icon: string; description: string }[] = [
  { type: 'fire', name: '火焰', icon: '🔥', description: '高攻击，克制自然' },
  { type: 'ice', name: '寒冰', icon: '❄️', description: '高防御，克制火焰' },
  { type: 'thunder', name: '雷电', icon: '⚡', description: '高法力，克制寒冰' },
  { type: 'shadow', name: '暗影', icon: '🌑', description: '均衡属性，克制光明' },
  { type: 'light', name: '光明', icon: '✨', description: '高生命，克制暗影' },
  { type: 'nature', name: '自然', icon: '🌿', description: '均衡防御，克制雷电' }
];

const RuneSelector: React.FC<RuneSelectorProps> = ({ onRunesSelected, selectedRunes: externalRunes }) => {
  const [selectedRunes, setSelectedRunes] = useState<RuneType[]>(externalRunes || []);
  const [flyingRune, setFlyingRune] = useState<{ type: RuneType; fromX: number; fromY: number; toX: number; toY: number } | null>(null);
  const heroSlotsRef = useRef<(HTMLDivElement | null)[]>([]);

  const getRunePosition = useCallback((index: number) => {
    const angle = (index * 60 - 90) * (Math.PI / 180);
    const radius = 150;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    };
  }, []);

  const handleRuneClick = useCallback((rune: RuneType, event: React.MouseEvent) => {
    const isSelected = selectedRunes.includes(rune);
    
    if (isSelected) {
      setSelectedRunes(prev => prev.filter(r => r !== rune));
    } else if (selectedRunes.length < 3) {
      const runeRect = event.currentTarget.getBoundingClientRect();
      const slotIndex = selectedRunes.length;
      
      const slotElement = heroSlotsRef.current[slotIndex];
      if (slotElement) {
        const slotRect = slotElement.getBoundingClientRect();
        setFlyingRune({
          type: rune,
          fromX: runeRect.left + runeRect.width / 2,
          fromY: runeRect.top + runeRect.height / 2,
          toX: slotRect.left + slotRect.width / 2,
          toY: slotRect.top + slotRect.height / 2
        });
        
        setTimeout(() => {
          setFlyingRune(null);
        }, 800);
      }
      
      setSelectedRunes(prev => [...prev, rune]);
    }
  }, [selectedRunes]);

  const handleStartBattle = useCallback(() => {
    if (selectedRunes.length === 3) {
      onRunesSelected(selectedRunes);
    }
  }, [selectedRunes, onRunesSelected]);

  const calculateStats = useCallback(() => {
    let attack = 0;
    let defense = 0;
    let health = 30;
    let mana = 1;

    for (const rune of selectedRunes) {
      const effect = RUNE_EFFECTS[rune];
      attack += effect.attack;
      defense += effect.defense;
      health += effect.health;
      mana += effect.mana;
    }

    return { attack, defense, health, mana };
  }, [selectedRunes]);

  const stats = calculateStats();

  useEffect(() => {
    if (externalRunes) {
      setSelectedRunes(externalRunes);
    }
  }, [externalRunes]);

  return (
    <div className="rune-selector">
      <h2>选择符文</h2>
      <p style={{ marginBottom: '1rem', color: '#a89880' }}>
        从6个符文中选择3个镶嵌到英雄身上 ({selectedRunes.length}/3)
      </p>
      
      <div className="rune-wheel-container">
        <div className="rune-wheel"></div>
        
        {RUNES.map((rune, index) => {
          const pos = getRunePosition(index);
          const isSelected = selectedRunes.includes(rune.type);
          
          return (
            <div
              key={rune.type}
              className={`rune-slot ${rune.type} ${isSelected ? 'selected' : ''}`}
              style={{
                transform: `translate(${pos.x}px, ${pos.y}px)`
              }}
              onClick={(e) => handleRuneClick(rune.type, e)}
              title={`${rune.name}: ${rune.description}`}
            >
              {rune.icon}
            </div>
          );
        })}
        
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          fontSize: '1.1rem',
          color: '#c9a847'
        }}>
          <div>符文盘</div>
          <div style={{ fontSize: '0.8rem', color: '#a89880' }}>点击选择</div>
        </div>
      </div>

      <div className="hero-slots">
        {[0, 1, 2].map(index => (
          <div
            key={index}
            ref={el => { heroSlotsRef.current[index] = el; }}
            className={`hero-slot ${selectedRunes[index] ? 'filled' : ''}`}
          >
            {selectedRunes[index] && RUNES.find(r => r.type === selectedRunes[index])?.icon}
          </div>
        ))}
      </div>

      <div className="stats-display">
        <div className="stat-item">
          <span className="stat-icon">⚔️</span>
          <span>攻击:</span>
          <span className="stat-value">{stats.attack}</span>
        </div>
        <div className="stat-item">
          <span className="stat-icon">🛡️</span>
          <span>防御:</span>
          <span className="stat-value">{stats.defense}</span>
        </div>
        <div className="stat-item">
          <span className="stat-icon">❤️</span>
          <span>生命:</span>
          <span className="stat-value">{stats.health}</span>
        </div>
        <div className="stat-item">
          <span className="stat-icon">💧</span>
          <span>法力:</span>
          <span className="stat-value">{stats.mana}</span>
        </div>
      </div>

      <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#a89880' }}>
        <p>相生相克: 火→自然→雷电→冰→火 | 光⇔暗</p>
      </div>

      <button
        className="start-battle-button"
        onClick={handleStartBattle}
        disabled={selectedRunes.length !== 3}
      >
        开始战斗
      </button>

      {flyingRune && (
        <div
          className="rune-fly-animation"
          style={{
            left: flyingRune.fromX,
            top: flyingRune.fromY,
            fontSize: '2rem',
            '--fly-x': `${(flyingRune.toX - flyingRune.fromX) / 2}px`,
            '--fly-y': `${-100}px`,
            '--fly-end-x': `${flyingRune.toX - flyingRune.fromX}px`,
            '--fly-end-y': `${flyingRune.toY - flyingRune.fromY}px`
          } as React.CSSProperties}
        >
          {RUNES.find(r => r.type === flyingRune.type)?.icon}
        </div>
      )}
    </div>
  );
};

export default RuneSelector;
