import React from 'react';
import { useBattleStore } from '../store/useBattleStore';
import type { Skill, ElementType } from '../types';

const elementColors: Record<ElementType, string> = {
  fire: 'from-red-600 to-orange-500',
  water: 'from-blue-600 to-cyan-500',
  wind: 'from-green-600 to-emerald-500',
  thunder: 'from-purple-600 to-violet-500',
  earth: 'from-amber-700 to-yellow-600',
  light: 'from-yellow-400 to-amber-300',
  dark: 'from-gray-800 to-slate-700',
};

const elementIcons: Record<ElementType, string> = {
  fire: '🔥',
  water: '💧',
  wind: '🌪️',
  thunder: '⚡',
  earth: '🪨',
  light: '✨',
  dark: '🌑',
};

const elementBorders: Record<ElementType, string> = {
  fire: 'border-red-400',
  water: 'border-blue-400',
  wind: 'border-green-400',
  thunder: 'border-purple-400',
  earth: 'border-amber-500',
  light: 'border-yellow-300',
  dark: 'border-gray-500',
};

const elementGlows: Record<ElementType, string> = {
  fire: 'shadow-red-500/60',
  water: 'shadow-blue-500/60',
  wind: 'shadow-green-500/60',
  thunder: 'shadow-purple-500/60',
  earth: 'shadow-amber-500/60',
  light: 'shadow-yellow-400/60',
  dark: 'shadow-gray-500/60',
};

interface SkillIconProps {
  skill: Skill;
  isSelected: boolean;
  isDisabled: boolean;
  onClick: () => void;
  angle: number;
  radius: number;
}

const SkillIcon: React.FC<SkillIconProps> = ({
  skill,
  isSelected,
  isDisabled,
  onClick,
  angle,
  radius,
}) => {
  const x = Math.cos((angle * Math.PI) / 180) * radius;
  const y = Math.sin((angle * Math.PI) / 180) * radius;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`
        absolute w-16 h-16 rounded-xl flex items-center justify-center
        transition-all duration-300 transform
        bg-gradient-to-br ${elementColors[skill.element]}
        border-2 ${elementBorders[skill.element]}
        shadow-lg ${elementGlows[skill.element]}
        ${isSelected ? 'scale-110 ring-4 ring-white/50' : 'hover:scale-105'}
        ${isDisabled ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer'}
      `}
      style={{
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
      }}
      title={`${skill.name}\n${skill.description}\n消耗: ${skill.cost} EP | 冷却: ${skill.cooldown}回合`}
    >
      <span className="text-2xl">{elementIcons[skill.element]}</span>
      
      {skill.currentCooldown > 0 && (
        <div className="absolute inset-0 bg-black/70 rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-lg">{skill.currentCooldown}</span>
        </div>
      )}
      
      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
        <span className="text-xs bg-blue-600 text-white px-1 rounded">{skill.cost}</span>
      </div>
    </button>
  );
};

export const SkillWheel: React.FC = () => {
  const {
    selectedCharacterId,
    selectedSkillId,
    phase,
    characters,
    actionQueue,
    selectSkillAction,
    highlightTargets,
    clearHighlightsAction,
  } = useBattleStore();

  const character = characters.find(c => c.id === selectedCharacterId);
  
  if (!character || phase !== 'planning') return null;
  
  const hasQueuedAction = actionQueue.some(a => a.characterId === character.id);
  
  const handleSkillClick = (skill: Skill) => {
    if (skill.currentCooldown > 0) return;
    if (character.currentEnergy < skill.cost) return;
    if (hasQueuedAction) return;
    
    if (selectedSkillId === skill.id) {
      selectSkillAction(null);
      clearHighlightsAction();
    } else {
      selectSkillAction(skill.id);
      highlightTargets(character.id, skill.id);
    }
  };

  const skills = character.skills;
  const radius = 80;
  const startAngle = -90;
  const angleStep = 120;

  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
      <div className="relative pointer-events-auto">
        <div className="w-20 h-20 rounded-full bg-[#16213e] border-4 border-[#f5a623] flex items-center justify-center">
          <span className="text-3xl">{character.avatar}</span>
        </div>
        
        {skills.map((skill, index) => (
          <SkillIcon
            key={skill.id}
            skill={skill}
            isSelected={selectedSkillId === skill.id}
            isDisabled={skill.currentCooldown > 0 || character.currentEnergy < skill.cost || hasQueuedAction}
            onClick={() => handleSkillClick(skill)}
            angle={startAngle + index * angleStep}
            radius={radius}
          />
        ))}
        
        {hasQueuedAction && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
            <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">
              已加入行动队列
            </span>
          </div>
        )}
      </div>
      
      {selectedSkillId && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-[#16213e]/95 border border-[#f5a623] rounded-xl p-4 max-w-sm">
          {(() => {
            const skill = character.skills.find(s => s.id === selectedSkillId);
            if (!skill) return null;
            return (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{elementIcons[skill.element]}</span>
                  <span className="font-bold text-white">{skill.name}</span>
                  <span className="text-xs px-2 py-0.5 bg-blue-600 rounded text-white">
                    {skill.cost} EP
                  </span>
                  {skill.cooldown > 0 && (
                    <span className="text-xs px-2 py-0.5 bg-gray-600 rounded text-white">
                      CD: {skill.cooldown}回合
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-300">{skill.description}</p>
                <p className="text-xs text-[#f5a623] mt-2">
                  {skill.targetType === 'self' ? '点击自身释放' :
                   skill.targetType === 'position' ? '点击网格上的目标位置释放' :
                   skill.targetType === 'ally' ? '点击高亮的友方角色释放' :
                   '点击高亮的敌方角色释放'}
                </p>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};
