import React, { useState, useEffect, useRef } from 'react';
import {
  PokemonType,
  Pokemon,
  Skill,
  typeConfig,
  getPokemonByType,
} from '../data/pokemonData';

interface SelectPanelProps {
  isPlayer: boolean;
  onSelection: (pokemon: Pokemon, skill: Skill) => void;
  selectedPokemon: Pokemon | null;
  selectedSkill: Skill | null;
}

const TYPES: PokemonType[] = ['fire', 'water', 'grass', 'electric', 'rock', 'ghost'];

export const SelectPanel: React.FC<SelectPanelProps> = ({
  isPlayer,
  onSelection,
  selectedPokemon,
  selectedSkill,
}) => {
  const [activeType, setActiveType] = useState<PokemonType | null>(null);
  const [showPokemonList, setShowPokemonList] = useState(false);
  const [animateAvatar, setAnimateAvatar] = useState(false);
  const [iconPosition, setIconPosition] = useState({ x: 0, y: 0 });
  const avatarContainerRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<Map<PokemonType, HTMLButtonElement>>(new Map());

  const handleTypeClick = (type: PokemonType) => {
    if (!isPlayer) return;
    const iconEl = iconRefs.current.get(type);
    if (iconEl && avatarContainerRef.current) {
      const iconRect = iconEl.getBoundingClientRect();
      const containerRect = avatarContainerRef.current.getBoundingClientRect();
      setIconPosition({
        x: iconRect.left - containerRect.left + iconRect.width / 2 - 60,
        y: iconRect.top - containerRect.top + iconRect.height / 2 - 60,
      });
    }
    setActiveType(type);
    setShowPokemonList(true);
  };

  const handlePokemonSelect = (pokemon: Pokemon) => {
    setAnimateAvatar(true);
    setShowPokemonList(false);
    setTimeout(() => {
      setAnimateAvatar(false);
      onSelection(pokemon, selectedSkill || pokemon.skills[0]);
    }, 400);
  };

  const handleSkillSelect = (skill: Skill) => {
    if (!isPlayer || !selectedPokemon) return;
    onSelection(selectedPokemon, skill);
  };

  useEffect(() => {
    if (!isPlayer) {
      const randomType = TYPES[Math.floor(Math.random() * TYPES.length)];
      const pokemonOfType = getPokemonByType(randomType);
      const randomPokemon = pokemonOfType[Math.floor(Math.random() * pokemonOfType.length)];
      const randomSkill = randomPokemon.skills[Math.floor(Math.random() * randomPokemon.skills.length)];
      setTimeout(() => onSelection(randomPokemon, randomSkill), 500);
    }
  }, [isPlayer, onSelection]);

  const currentTypePokemon = activeType ? getPokemonByType(activeType) : [];

  return (
    <div
      style={{
        background: '#16213e',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        minWidth: '340px',
        flex: 1,
        maxWidth: '460px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>
          {isPlayer ? '🎮 玩家选择' : '🤖 AI对手'}
        </h2>
        {selectedPokemon && (
          <span
            style={{
              background: typeConfig[selectedPokemon.type].gradient,
              padding: '4px 12px',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {typeConfig[selectedPokemon.type].icon} {typeConfig[selectedPokemon.type].label}属性
          </span>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '10px',
        }}
      >
        {TYPES.map((type) => (
          <button
            key={type}
            ref={(el) => {
              if (el) iconRefs.current.set(type, el);
            }}
            onClick={() => handleTypeClick(type)}
            disabled={!isPlayer}
            style={{
              width: '100%',
              aspectRatio: '1',
              borderRadius: '50%',
              border: activeType === type ? '3px solid #fff' : '2px solid transparent',
              background: typeConfig[type].gradient,
              cursor: isPlayer ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              transition: 'transform 0.2s, box-shadow 0.2s',
              animation: isPlayer ? 'breathe 4s ease-in-out infinite' : 'none',
              opacity: !isPlayer ? 0.6 : 1,
              padding: 0,
            }}
            onMouseEnter={(e) => {
              if (isPlayer) {
                e.currentTarget.style.boxShadow = '0 0 20px rgba(100, 200, 255, 0.6)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {typeConfig[type].icon}
          </button>
        ))}
      </div>

      <div
        ref={avatarContainerRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '140px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, rgba(15,52,96,0.5) 0%, rgba(22,33,62,0.5) 100%)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        {selectedPokemon ? (
          <div
            style={{
              position: 'relative',
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: animateAvatar
                ? 'flyIn 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards'
                : 'none',
              '--start-x': `${iconPosition.x}px`,
              '--start-y': `${iconPosition.y}px`,
            } as React.CSSProperties}
          >
            <div
              style={{
                position: 'absolute',
                inset: '-8px',
                borderRadius: '50%',
                background: typeConfig[selectedPokemon.type].gradient,
                opacity: 0.5,
                animation: 'pulseRing 2s ease-in-out infinite',
              }}
            />
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: '#0f3460',
                border: `3px solid ${typeConfig[selectedPokemon.type].ring}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '56px',
                boxShadow: `0 0 30px ${typeConfig[selectedPokemon.type].ring}60`,
                zIndex: 1,
              }}
            >
              {selectedPokemon.emoji}
            </div>
          </div>
        ) : (
          <div style={{ color: '#666', fontSize: '14px' }}>
            {isPlayer ? '请选择属性图标' : 'AI正在选择...'}
          </div>
        )}
      </div>

      {selectedPokemon && (
        <div
          style={{
            textAlign: 'center',
            color: '#fff',
            fontSize: '20px',
            fontWeight: 600,
          }}
        >
          {selectedPokemon.name}
          <div
            style={{
              fontSize: '12px',
              color: '#888',
              marginTop: '4px',
              fontWeight: 'normal',
            }}
          >
            HP: {selectedPokemon.hp} | 速度: {selectedPokemon.speed}
          </div>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ color: '#aaa', fontSize: '14px', marginBottom: '4px' }}>
          技能配置 {isPlayer && '(点击选择)'}
        </div>
        {selectedPokemon?.skills.map((skill, index) => {
          const isSelected = selectedSkill?.name === skill.name;
          return (
            <div
              key={skill.name}
              onClick={() => handleSkillSelect(skill)}
              style={{
                background: isSelected ? 'linear-gradient(135deg, #0f3460, #1a4a8a)' : '#0f3460',
                borderRadius: '10px',
                padding: '12px 14px',
                cursor: isPlayer ? 'pointer' : 'default',
                transition: 'transform 0.2s, box-shadow 0.2s',
                transform: isSelected ? 'translateZ(20px) scale(1.02)' : 'translateZ(0)',
                boxShadow: isSelected
                  ? '0 8px 24px rgba(100, 200, 255, 0.3), 0 0 0 2px rgba(100, 200, 255, 0.5)'
                  : '0 2px 8px rgba(0,0,0,0.2)',
                border: isSelected ? '1px solid rgba(100, 200, 255, 0.6)' : '1px solid transparent',
                opacity: !isPlayer ? 0.8 : 1,
              }}
              onMouseEnter={(e) => {
                if (isPlayer) {
                  e.currentTarget.style.transform = 'translateZ(20px) translateY(-4px) scale(1.02)';
                  e.currentTarget.style.boxShadow =
                    '0 12px 28px rgba(100, 200, 255, 0.35)';
                }
              }}
              onMouseLeave={(e) => {
                if (isPlayer && !isSelected) {
                  e.currentTarget.style.transform = 'translateZ(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                } else if (isPlayer && isSelected) {
                  e.currentTarget.style.transform = 'translateZ(20px) scale(1.02)';
                }
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#fff', fontWeight: 600, fontSize: '15px' }}>
                  {index + 1}. {skill.name}
                </span>
                {isSelected && (
                  <span style={{ color: '#64c8ff', fontSize: '12px' }}>✓ 已选</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '12px' }}>
                <span style={{ color: '#ff6b6b' }}>⚔️ 威力 {skill.power}</span>
                <span style={{ color: '#51cf66' }}>🎯 命中 {skill.accuracy}%</span>
              </div>
              <div style={{ color: '#aaa', fontSize: '12px', marginTop: '6px' }}>
                {skill.effect}
              </div>
            </div>
          );
        })}
      </div>

      {showPokemonList && activeType && (
        <div
          onClick={() => setShowPokemonList(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#16213e',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '480px',
              width: '90%',
              border: `2px solid ${typeConfig[activeType].ring}`,
              boxShadow: `0 0 40px ${typeConfig[activeType].ring}40`,
            }}
          >
            <h3
              style={{
                margin: '0 0 16px 0',
                color: '#fff',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '24px' }}>{typeConfig[activeType].icon}</span>
              选择{typeConfig[activeType].label}属性精灵
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {currentTypePokemon.map((pokemon) => (
                <div
                  key={pokemon.id}
                  onClick={() => handlePokemonSelect(pokemon)}
                  style={{
                    background: '#0f3460',
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    border: '2px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = typeConfig[activeType].ring;
                    e.currentTarget.style.boxShadow = `0 0 20px ${typeConfig[activeType].ring}60`;
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <div
                    style={{
                      width: '70px',
                      height: '70px',
                      borderRadius: '50%',
                      background: typeConfig[activeType].gradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '36px',
                    }}
                  >
                    {pokemon.emoji}
                  </div>
                  <div style={{ color: '#fff', fontWeight: 600 }}>{pokemon.name}</div>
                  <div style={{ color: '#888', fontSize: '12px' }}>
                    HP:{pokemon.hp} 速度:{pokemon.speed}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes flyIn {
          0% {
            transform: translate(var(--start-x), var(--start-y)) scale(0.3);
            opacity: 0;
          }
          60% {
            opacity: 1;
          }
          100% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
        }
        @keyframes pulseRing {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};
