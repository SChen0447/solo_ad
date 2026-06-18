import React, { useCallback, useMemo } from 'react';
import { useBattleStore } from '../store/useBattleStore';
import { getDistance } from '../engine/effectSystem';
import type { GridCell, Character, GridCoord } from '../types';

const terrainStyles: Record<string, { bg: string; label: string }> = {
  grass: { bg: 'bg-green-900/40', label: '🌿 草地' },
  sand: { bg: 'bg-yellow-900/40', label: '🏖️ 沙滩' },
  ruins: { bg: 'bg-gray-700/40', label: '🏚️ 废墟' },
  normal: { bg: 'bg-gray-800/20', label: '' },
};

interface GridCellProps {
  cell: GridCell;
  character: Character | undefined;
  isSelected: boolean;
  isDeployTarget: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const GridCellComponent: React.FC<GridCellProps> = ({
  cell,
  character,
  isSelected,
  isDeployTarget,
  onClick,
  onMouseEnter,
  onMouseLeave,
}) => {
  const terrain = terrainStyles[cell.terrain];
  
  const highlightClass = useMemo(() => {
    if (!cell.isHighlighted) return '';
    switch (cell.highlightType) {
      case 'valid':
        return 'ring-2 ring-green-400 bg-green-500/30';
      case 'invalid':
        return 'ring-2 ring-red-400 bg-red-500/30';
      case 'combo':
        return 'ring-2 ring-yellow-400 bg-yellow-500/40 animate-pulse';
      case 'effect':
        return 'ring-2 ring-purple-400 bg-purple-500/30';
      default:
        return '';
    }
  }, [cell.isHighlighted, cell.highlightType]);

  const deployAnimClass = character?.position ? 'animate-fill-cell' : '';

  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`
        relative aspect-square border border-gray-700/50
        transition-all duration-200 cursor-pointer
        ${terrain.bg}
        ${highlightClass}
        ${isSelected ? 'ring-2 ring-[#f5a623]' : ''}
        ${isDeployTarget ? 'hover:bg-[#f5a623]/30' : ''}
        ${deployAnimClass}
        ${(cell.coord.x + cell.coord.y) % 2 === 0 ? 'bg-opacity-30' : 'bg-opacity-50'}
      `}
    >
      {cell.characterId && character && character.isAlive && (
        <>
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`
                w-10 h-10 rounded-lg flex items-center justify-center text-2xl
                border-2 animate-breath
                ${character.team === 'A' ? 'border-blue-500 bg-blue-900/80' : 'border-red-500 bg-red-900/80'}
              `}
            >
              {character.avatar}
            </div>
          </div>
          
          <div className="absolute top-0.5 left-0.5 right-0.5 h-1 bg-gray-900/80 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${(character.currentHp / character.maxHp) * 100}%`,
                background: character.currentHp / character.maxHp > 0.5
                  ? '#22c55e'
                  : character.currentHp / character.maxHp > 0.25
                  ? '#eab308'
                  : '#ef4444',
              }}
            />
          </div>
          
          <div className="absolute bottom-0.5 left-0.5 right-0.5 h-1 bg-gray-900/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${(character.currentEnergy / character.maxEnergy) * 100}%` }}
            />
          </div>
          
          {character.statusEffects.length > 0 && (
            <div className="absolute -top-1 -right-1 flex">
              {character.statusEffects.slice(0, 2).map((effect, idx) => (
                <span
                  key={effect.id}
                  className="text-xs bg-gray-900 rounded-full w-4 h-4 flex items-center justify-center -ml-1"
                >
                  {effect.type === 'burn' ? '🔥' :
                   effect.type === 'poison' ? '☠️' :
                   effect.type === 'paralyze' ? '⚡' :
                   effect.type === 'stun' ? '💫' :
                   effect.type === 'defense_up' ? '🛡️' :
                   effect.type === 'attack_up' ? '⚔️' : '❓'}
                </span>
              ))}
            </div>
          )}
        </>
      )}
      
      {!character?.isAlive && cell.characterId && (
        <div className="absolute inset-0 flex items-center justify-center opacity-40">
          <span className="text-2xl grayscale">💀</span>
        </div>
      )}
      
      {cell.isHighlighted && cell.highlightType === 'combo' && (
        <div className="absolute inset-0 animate-explosion pointer-events-none">
          <div className="absolute inset-0 bg-yellow-500/50 rounded-full animate-ping" />
        </div>
      )}
    </div>
  );
};

export const GridMap: React.FC = () => {
  const {
    grid,
    characters,
    phase,
    selectedCharacterId,
    selectedSkillId,
    actionQueue,
    deployCharacterAction,
    addAction,
    floatingTexts,
  } = useBattleStore();

  const selectedCharacter = characters.find(c => c.id === selectedCharacterId);
  const selectedSkill = selectedCharacter?.skills.find(s => s.id === selectedSkillId);

  const characterMap = useMemo(() => {
    const map = new Map<string, Character>();
    characters.forEach(c => map.set(c.id, c));
    return map;
  }, [characters]);

  const canDeploy = phase === 'deploy' && selectedCharacter && !selectedCharacter.position;
  const canUseSkill = phase === 'planning' && selectedSkill && selectedCharacter;

  const isDeployTarget = useCallback((cell: GridCell) => {
    if (!canDeploy) return false;
    if (cell.characterId) return false;
    if (selectedCharacter?.team === 'A') {
      return cell.coord.x <= 4;
    } else {
      return cell.coord.x >= 5;
    }
  }, [canDeploy, selectedCharacter]);

  const isValidTarget = useCallback((cell: GridCell) => {
    return cell.isHighlighted && cell.highlightType === 'valid';
  }, []);

  const handleCellClick = useCallback((coord: GridCoord) => {
    if (canDeploy) {
      const cell = grid[coord.y]?.[coord.x];
      if (cell && !cell.characterId && isDeployTarget(cell)) {
        deployCharacterAction({ characterId: selectedCharacterId!, position: coord });
      }
      return;
    }

    if (canUseSkill && isValidTarget(grid[coord.y][coord.x])) {
      if (selectedSkill!.targetType === 'self' && selectedCharacter!.position) {
        if (coord.x === selectedCharacter!.position.x && coord.y === selectedCharacter!.position.y) {
          addAction({
            characterId: selectedCharacterId!,
            skillId: selectedSkillId!,
            targetPosition: coord,
          });
        }
      } else {
        addAction({
          characterId: selectedCharacterId!,
          skillId: selectedSkillId!,
          targetPosition: coord,
        });
      }
    }
  }, [canDeploy, canUseSkill, grid, selectedCharacterId, selectedSkillId, selectedSkill, selectedCharacter, isDeployTarget, isValidTarget, deployCharacterAction, addAction]);

  const [hoveredCell, setHoveredCell] = React.useState<GridCoord | null>(null);

  return (
    <div className="relative">
      <div className="absolute -top-8 left-0 right-0 flex justify-between px-2">
        {grid[0]?.map((_, x) => (
          <div key={x} className="text-xs text-gray-500 w-12 text-center">
            {x}
          </div>
        ))}
      </div>
      
      <div className="flex">
        <div className="flex flex-col justify-around pr-2">
          {grid.map((_, y) => (
            <div key={y} className="text-xs text-gray-500 w-6 text-right h-12 flex items-center justify-end">
              {y}
            </div>
          ))}
        </div>
        
        <div className="relative">
          <div
            className="grid gap-0.5 bg-gray-900 p-2 rounded-xl border border-gray-700"
            style={{ gridTemplateColumns: `repeat(${grid[0]?.length || 10}, 48px)` }}
          >
            {grid.map((row, y) =>
              row.map((cell, x) => (
                <GridCellComponent
                  key={`${x}-${y}`}
                  cell={cell}
                  character={cell.characterId ? characterMap.get(cell.characterId) : undefined}
                  isSelected={selectedCharacter?.position?.x === x && selectedCharacter?.position?.y === y}
                  isDeployTarget={isDeployTarget(cell)}
                  onClick={() => handleCellClick({ x, y })}
                  onMouseEnter={() => setHoveredCell({ x, y })}
                  onMouseLeave={() => setHoveredCell(null)}
                />
              ))
            )}
          </div>
          
          {floatingTexts.map(ft => (
            <div
              key={ft.id}
              className={`
                absolute pointer-events-none font-bold text-xl
                animate-float-up
                ${ft.type === 'damage' ? 'text-yellow-400' : ''}
                ${ft.type === 'heal' ? 'text-green-400' : ''}
                ${ft.type === 'combo_damage' ? 'text-red-500 text-2xl' : ''}
              `}
              style={{
                left: `${ft.position.x * 50 + 24}px`,
                top: `${ft.position.y * 50 + 16}px`,
                transform: 'translateX(-50%)',
              }}
            >
              {ft.type === 'heal' ? '+' : '-'}{ft.value}
            </div>
          ))}
          
          {hoveredCell && (
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900/90 text-xs text-gray-300 px-3 py-1 rounded whitespace-nowrap z-10">
              {`位置: (${hoveredCell.x}, ${hoveredCell.y})`}
              {grid[hoveredCell.y]?.[hoveredCell.x]?.terrain !== 'normal' && (
                <span className="ml-2">{terrainStyles[grid[hoveredCell.y][hoveredCell.x].terrain].label}</span>
              )}
              {characterMap.get(grid[hoveredCell.y]?.[hoveredCell.x]?.characterId || '') && (
                <span className="ml-2">
                  {characterMap.get(grid[hoveredCell.y][hoveredCell.x].characterId!)?.name}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-10 flex justify-center gap-6 text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-green-900/60 border border-gray-700" />
          <span>🌿 草地 (火系+30%)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-yellow-900/60 border border-gray-700" />
          <span>🏖️ 沙滩 (水系-10%)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-gray-700/60 border border-gray-700" />
          <span>🏚️ 废墟 (火风-20%, +防御)</span>
        </div>
      </div>
      
      {phase === 'deploy' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="flex">
            <div className="w-[250px] h-[500px] border-2 border-dashed border-blue-500/30 rounded-l-xl flex items-center justify-center">
              <span className="text-blue-400/50 font-bold">队伍A 部署区</span>
            </div>
            <div className="w-[250px] h-[500px] border-2 border-dashed border-red-500/30 rounded-r-xl flex items-center justify-center">
              <span className="text-red-400/50 font-bold">队伍B 部署区</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
