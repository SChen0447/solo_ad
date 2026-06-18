import React from 'react';
import { useBattleStore } from '../store/useBattleStore';
import { CharacterCard } from './CharacterCard';
import type { Team } from '../types';

interface TeamPanelProps {
  team: Team;
}

export const TeamPanel: React.FC<TeamPanelProps> = ({ team }) => {
  const {
    characters,
    selectedCharacterId,
    phase,
    selectCharacterAction,
    getCharactersByTeam,
  } = useBattleStore();

  const teamCharacters = getCharactersByTeam(team);
  const aliveCount = teamCharacters.filter(c => c.isAlive).length;
  const deployedCount = teamCharacters.filter(c => c.position).length;

  const canSelect = phase === 'deploy' || phase === 'planning';

  const handleSelect = (charId: string) => {
    if (!canSelect) return;
    
    const char = characters.find(c => c.id === charId);
    if (!char) return;
    
    if (phase === 'deploy' && char.position) return;
    if (phase === 'planning' && !char.position) return;
    if (phase === 'planning' && !char.isAlive) return;
    
    selectCharacterAction(selectedCharacterId === charId ? null : charId);
  };

  const totalHp = teamCharacters.reduce((sum, c) => sum + c.maxHp, 0);
  const currentHp = teamCharacters.reduce((sum, c) => sum + c.currentHp, 0);
  const hpPercent = totalHp > 0 ? (currentHp / totalHp) * 100 : 0;

  return (
    <div className={`
      w-64 bg-[#16213e] rounded-xl p-4 flex flex-col gap-3
      border-2 ${team === 'A' ? 'border-blue-500/50' : 'border-red-500/50'}
    `}>
      <div className="flex items-center justify-between">
        <h3 className={`font-bold text-lg ${team === 'A' ? 'text-blue-400' : 'text-red-400'}`}>
          队伍 {team}
        </h3>
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 bg-gray-700 rounded text-green-400">
            {aliveCount}/{teamCharacters.length} 存活
          </span>
          <span className="px-2 py-1 bg-gray-700 rounded text-yellow-400">
            {deployedCount} 已部署
          </span>
        </div>
      </div>
      
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-500 rounded-full"
          style={{
            width: `${hpPercent}%`,
            background: team === 'A' 
              ? 'linear-gradient(90deg, #2563eb, #3b82f6)' 
              : 'linear-gradient(90deg, #dc2626, #ef4444)',
          }}
        />
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-2 max-h-[500px] pr-1">
        {teamCharacters.map(char => (
          <CharacterCard
            key={char.id}
            character={char}
            isSelected={selectedCharacterId === char.id}
            onClick={() => handleSelect(char.id)}
            showDetails={canSelect}
          />
        ))}
      </div>
      
      {phase === 'deploy' && (
        <div className="text-xs text-gray-400 text-center p-2 bg-gray-800/50 rounded-lg">
          {team === 'A' ? '💡 选择角色后点击左侧区域部署' : '💡 选择角色后点击右侧区域部署'}
        </div>
      )}
      
      {phase === 'planning' && (
        <div className="text-xs text-gray-400 text-center p-2 bg-gray-800/50 rounded-lg">
          💡 选择已部署的角色查看技能
        </div>
      )}
    </div>
  );
};
