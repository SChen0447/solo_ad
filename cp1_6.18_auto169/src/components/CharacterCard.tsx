import React from 'react';
import type { Character, StatusEffect } from '../types';

interface CharacterCardProps {
  character: Character;
  isSelected?: boolean;
  onClick?: () => void;
  showDetails?: boolean;
  compact?: boolean;
}

const getStatusIcon = (type: StatusEffect['type']): string => {
  const icons: Record<StatusEffect['type'], string> = {
    burn: '🔥',
    paralyze: '⚡',
    poison: '☠️',
    defense_up: '🛡️',
    attack_up: '⚔️',
    stun: '💫',
  };
  return icons[type] || '❓';
};

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  isSelected = false,
  onClick,
  showDetails = false,
  compact = false,
}) => {
  const hpPercent = (character.currentHp / character.maxHp) * 100;
  const energyPercent = (character.currentEnergy / character.maxEnergy) * 100;
  
  const getHpColor = () => {
    if (hpPercent > 60) return 'linear-gradient(90deg, #22c55e, #4ade80)';
    if (hpPercent > 30) return 'linear-gradient(90deg, #eab308, #facc15)';
    return 'linear-gradient(90deg, #ef4444, #f87171)';
  };

  const teamColor = character.team === 'A' ? 'border-blue-500' : 'border-red-500';
  const teamBg = character.team === 'A' ? 'bg-blue-900/30' : 'bg-red-900/30';

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={`
          flex items-center gap-2 p-2 rounded-lg cursor-pointer
          transition-all duration-200 border-2
          ${isSelected ? `${teamColor} ${teamBg} scale-105` : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'}
          ${!character.isAlive ? 'opacity-40 grayscale' : ''}
        `}
      >
        <span className="text-2xl">{character.avatar}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-white truncate">{character.name}</div>
          <div className="h-1 bg-gray-700 rounded-full overflow-hidden mt-1">
            <div
              className="h-full transition-all duration-300 rounded-full"
              style={{ width: `${hpPercent}%`, background: getHpColor() }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`
        relative p-3 rounded-xl cursor-pointer transition-all duration-200 border-2
        ${isSelected ? `${teamColor} ${teamBg} scale-105 shadow-lg shadow-current/20` : 'border-gray-700 bg-gray-800/80 hover:border-gray-500'}
        ${!character.isAlive ? 'opacity-40 grayscale pointer-events-none' : ''}
        ${character.position ? 'ring-2 ring-yellow-500/50' : ''}
      `}
    >
      {character.isAlive && character.position && (
        <div className="absolute inset-0 rounded-xl animate-pulse-ring pointer-events-none" style={{
          boxShadow: `0 0 15px ${character.team === 'A' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`
        }} />
      )}
      
      <div className="flex items-center gap-3">
        <div className={`text-4xl p-2 rounded-lg ${teamBg}`}>
          {character.avatar}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">{character.name}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${character.team === 'A' ? 'bg-blue-600' : 'bg-red-600'} text-white`}>
              队伍{character.team}
            </span>
          </div>
          
          {!character.isAlive && (
            <div className="text-red-500 text-xs font-bold mt-1">💀 已阵亡</div>
          )}
          
          {showDetails && (
            <>
              <div className="flex gap-3 mt-2 text-xs text-gray-300">
                <span>⚔️ {character.attack}</span>
                <span>🛡️ {character.defense}</span>
              </div>
              
              {character.statusEffects.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {character.statusEffects.map(effect => (
                    <div
                      key={effect.id}
                      className="relative group"
                      title={`${effect.type}: ${effect.duration}回合`}
                    >
                      <span className="text-lg">{getStatusIcon(effect.type)}</span>
                      <span className="absolute -top-1 -right-1 text-xs bg-gray-900 text-white rounded-full w-4 h-4 flex items-center justify-center">
                        {effect.duration}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-8">HP</span>
          <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-500 ease-out rounded-full"
              style={{ width: `${hpPercent}%`, background: getHpColor() }}
            />
          </div>
          <span className="text-xs text-gray-300 w-16 text-right">
            {character.currentHp}/{character.maxHp}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-8">EP</span>
          <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden relative">
            <div
              className="h-full transition-all duration-500 ease-out rounded-full relative overflow-hidden"
              style={{ width: `${energyPercent}%`, background: 'linear-gradient(90deg, #3b82f6, #60a5fa)' }}
            >
              <div className="absolute inset-0 animate-shimmer" style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
              }} />
            </div>
          </div>
          <span className="text-xs text-gray-300 w-16 text-right">
            {character.currentEnergy}/{character.maxEnergy}
          </span>
        </div>
      </div>
      
      {character.position && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          位置: ({character.position.x}, {character.position.y})
        </div>
      )}
    </div>
  );
};
