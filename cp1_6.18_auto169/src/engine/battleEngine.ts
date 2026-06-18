import { v4 as uuidv4 } from 'uuid';
import type {
  BattleState,
  ActionQueueItem,
  Character,
  GridCell,
  TerrainType,
  GridCoord,
  BattleEvent,
  FloatingText,
  ElementType,
} from '../types';
import {
  executeSkillEffect,
  processStatusEffects,
  decreaseCooldowns,
  regenerateEnergy,
  isCharacterStunned,
  getDistance,
} from './effectSystem';
import { findMatchingCombo, comboRules } from '../data/rules';

const GRID_SIZE = 10;

export function createInitialGrid(): GridCell[][] {
  const grid: GridCell[][] = [];
  
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: GridCell[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      let terrain: TerrainType = 'normal';
      
      if (y === 0 || y === GRID_SIZE - 1) {
        terrain = x < 5 ? 'grass' : 'sand';
      } else if (x === 0 || x === GRID_SIZE - 1) {
        terrain = 'ruins';
      } else if ((x === 3 && y === 3) || (x === 6 && y === 6) || (x === 3 && y === 6) || (x === 6 && y === 3)) {
        terrain = Math.random() > 0.5 ? 'grass' : 'ruins';
      }
      
      row.push({
        coord: { x, y },
        terrain,
        characterId: null,
        isHighlighted: false,
      });
    }
    grid.push(row);
  }
  
  return grid;
}

export function createInitialState(characters: Character[]): BattleState {
  const grid = createInitialGrid();
  
  characters.forEach(char => {
    if (char.position) {
      grid[char.position.y][char.position.x].characterId = char.id;
    }
  });
  
  return {
    turn: 1,
    phase: 'deploy',
    grid,
    characters,
    actionQueue: [],
    comboRules,
    lastComboElements: [],
    eventLog: [{
      id: uuidv4(),
      timestamp: Date.now(),
      type: 'system',
      message: '⚔️ 战斗开始！请部署角色到网格地图上。',
    }],
    floatingTexts: [],
    selectedCharacterId: null,
    selectedSkillId: null,
    executingActionIndex: 0,
    isExecuting: false,
  };
}

export function deployCharacter(
  state: BattleState,
  characterId: string,
  position: GridCoord
): BattleState {
  if (state.phase !== 'deploy') return state;
  
  const gridCell = state.grid[position.y]?.[position.x];
  if (!gridCell || gridCell.characterId) return state;
  
  const character = state.characters.find(c => c.id === characterId);
  if (!character || character.position) return state;
  
  const newGrid = state.grid.map(row => row.map(cell => {
    if (cell.coord.x === position.x && cell.coord.y === position.y) {
      return { ...cell, characterId };
    }
    return cell;
  }));
  
  const newCharacters = state.characters.map(c =>
    c.id === characterId ? { ...c, position } : c
  );
  
  const deployedCount = newCharacters.filter(c => c.position).length;
  const teamADeployed = newCharacters.filter(c => c.team === 'A' && c.position).length;
  const teamBDeployed = newCharacters.filter(c => c.team === 'B' && c.position).length;
  
  let newPhase = state.phase;
  let eventLog = state.eventLog;
  
  if (teamADeployed >= 1 && teamBDeployed >= 1) {
    newPhase = 'planning';
    eventLog = [...eventLog, {
      id: uuidv4(),
      timestamp: Date.now(),
      type: 'system',
      message: '🎯 部署完成！请选择角色技能加入行动队列。',
    }];
  } else {
    eventLog = [...eventLog, {
      id: uuidv4(),
      timestamp: Date.now(),
      type: 'system',
      message: `${character.name} 已部署到位置 (${position.x}, ${position.y})。已部署 ${deployedCount} 个角色。`,
    }];
  }
  
  return {
    ...state,
    grid: newGrid,
    characters: newCharacters,
    phase: newPhase,
    eventLog,
    selectedCharacterId: null,
  };
}

export function addActionToQueue(
  state: BattleState,
  characterId: string,
  skillId: string,
  targetPosition: GridCoord | null
): BattleState {
  if (state.phase !== 'planning') return state;
  
  const character = state.characters.find(c => c.id === characterId);
  if (!character || !character.position || !character.isAlive) return state;
  
  const skill = character.skills.find(s => s.id === skillId);
  if (!skill) return state;
  
  if (skill.currentCooldown > 0) return state;
  if (character.currentEnergy < skill.cost) return state;
  
  const existingAction = state.actionQueue.find(a => a.characterId === characterId);
  if (existingAction) return state;
  
  if (skill.targetType !== 'self' && skill.targetType !== 'position' && !targetPosition) {
    return state;
  }
  
  if (skill.targetType === 'self') {
    targetPosition = character.position;
  }
  
  if (targetPosition && skill.range > 0) {
    const distance = getDistance(character.position, targetPosition);
    if (distance > skill.range) return state;
  }
  
  const newAction: ActionQueueItem = {
    id: uuidv4(),
    characterId,
    skillId,
    targetPosition,
    order: state.actionQueue.length,
  };
  
  const eventLog = [...state.eventLog, {
    id: uuidv4(),
    timestamp: Date.now(),
    type: 'action',
    message: `📋 ${character.name} 的 ${skill.name} 已加入行动队列，顺序：${state.actionQueue.length + 1}`,
  }];
  
  return {
    ...state,
    actionQueue: [...state.actionQueue, newAction],
    eventLog,
    selectedSkillId: null,
  };
}

export function removeActionFromQueue(
  state: BattleState,
  actionId: string
): BattleState {
  if (state.phase !== 'planning') return state;
  
  const action = state.actionQueue.find(a => a.id === actionId);
  if (!action) return state;
  
  const character = state.characters.find(c => c.id === action.characterId);
  
  const newQueue = state.actionQueue
    .filter(a => a.id !== actionId)
    .map((a, idx) => ({ ...a, order: idx }));
  
  const eventLog = [...state.eventLog, {
    id: uuidv4(),
    timestamp: Date.now(),
    type: 'system',
    message: `❌ ${character?.name || '角色'} 的行动已从队列移除`,
  }];
  
  return {
    ...state,
    actionQueue: newQueue,
    eventLog,
  };
}

export function reorderActionQueue(
  state: BattleState,
  actionId: string,
  newOrder: number
): BattleState {
  if (state.phase !== 'planning') return state;
  
  const action = state.actionQueue.find(a => a.id === actionId);
  if (!action) return state;
  
  const clampedOrder = Math.max(0, Math.min(state.actionQueue.length - 1, newOrder));
  
  const newQueue = [...state.actionQueue.filter(a => a.id !== actionId)];
  newQueue.splice(clampedOrder, 0, action);
  
  const reorderedQueue = newQueue.map((a, idx) => ({ ...a, order: idx }));
  
  return {
    ...state,
    actionQueue: reorderedQueue,
  };
}

export function executeNextAction(state: BattleState): BattleState {
  if (state.phase !== 'executing') return state;
  if (state.executingActionIndex >= state.actionQueue.length) {
    return finalizeTurn(state);
  }
  
  const action = state.actionQueue[state.executingActionIndex];
  const source = state.characters.find(c => c.id === action.characterId);
  const skill = source?.skills.find(s => s.id === action.skillId);
  
  if (!source || !skill || !source.position || !source.isAlive) {
    return {
      ...state,
      executingActionIndex: state.executingActionIndex + 1,
    };
  }
  
  if (isCharacterStunned(source)) {
    const eventLog = [...state.eventLog, {
      id: uuidv4(),
      timestamp: Date.now(),
      type: 'status',
      message: `😵 ${source.name} 处于${source.statusEffects.find(e => e.type === 'paralyze' || e.type === 'stun')?.type === 'paralyze' ? '麻痹' : '眩晕'}状态，无法行动！`,
    }];
    return {
      ...state,
      eventLog,
      executingActionIndex: state.executingActionIndex + 1,
    };
  }
  
  const targetPos = action.targetPosition || source.position;
  
  const result = executeSkillEffect(source, skill, targetPos, state);
  
  let newState = result.updatedState;
  let eventLog = [...state.eventLog, ...result.events];
  let floatingTexts = [...state.floatingTexts, ...result.floatingTexts];
  let lastComboElements = [...state.lastComboElements];
  
  const hitTargets = result.hitTargets.filter(t => t.team !== source.team && t.isAlive);
  
  if (lastComboElements.length > 0 && hitTargets.length > 0) {
    const lastElement = lastComboElements[lastComboElements.length - 1];
    const currentElement = result.usedElement;
    
    const comboRule = findMatchingCombo(lastElement, currentElement);
    
    if (comboRule) {
      const mainTarget = hitTargets[0];
      const comboStateClone: BattleState = JSON.parse(JSON.stringify(newState));
      
      const comboResult = comboRule.effect(source, mainTarget, comboStateClone, eventLog);
      
      eventLog = comboResult.eventLog;
      newState = comboStateClone;
      
      comboResult.affectedTargets.forEach(targetId => {
        const target = newState.characters.find(c => c.id === targetId);
        if (target?.position && comboResult.extraDamage > 0) {
          floatingTexts.push({
            id: uuidv4(),
            position: target.position,
            value: Math.floor(comboResult.extraDamage / comboResult.affectedTargets.length) || comboResult.extraDamage,
            type: 'combo_damage',
            createdAt: Date.now(),
          });
        }
      });
      
      newState = highlightComboCells(newState, comboResult.affectedTargets);
    }
  }
  
  lastComboElements.push(result.usedElement);
  if (lastComboElements.length > 2) {
    lastComboElements = lastComboElements.slice(-2);
  }
  
  const updatedGrid = newState.grid.map(row => row.map(cell => ({ ...cell, isHighlighted: false, highlightType: undefined })));
  
  return {
    ...newState,
    grid: updatedGrid,
    eventLog,
    floatingTexts,
    lastComboElements,
    executingActionIndex: state.executingActionIndex + 1,
  };
}

function highlightComboCells(state: BattleState, affectedIds: string[]): BattleState {
  const grid = state.grid.map(row => row.map(cell => {
    if (cell.characterId && affectedIds.includes(cell.characterId)) {
      return { ...cell, isHighlighted: true, highlightType: 'combo' as const };
    }
    return cell;
  }));
  return { ...state, grid };
}

export function startExecution(state: BattleState): BattleState {
  if (state.phase !== 'planning' || state.actionQueue.length === 0) return state;
  
  const eventLog = [...state.eventLog, {
    id: uuidv4(),
    timestamp: Date.now(),
    type: 'system',
    message: `⏳ 第 ${state.turn} 回合开始执行！共 ${state.actionQueue.length} 个行动。`,
  }];
  
  return {
    ...state,
    phase: 'executing',
    eventLog,
    executingActionIndex: 0,
    isExecuting: true,
    lastComboElements: [],
  };
}

export function finalizeTurn(state: BattleState): BattleState {
  let characters = [...state.characters];
  let eventLog = [...state.eventLog];
  let floatingTexts = [...state.floatingTexts];
  
  eventLog.push({
    id: uuidv4(),
    timestamp: Date.now(),
    type: 'system',
    message: `🔄 回合结束，处理持续效果...`,
  });
  
  characters = characters.map(char => {
    if (!char.isAlive) return char;
    
    const result = processStatusEffects(char, eventLog);
    eventLog = result.events;
    floatingTexts = [...floatingTexts, ...result.floatingTexts];
    return result.character;
  });
  
  characters = characters.map(char => {
    if (!char.isAlive) return char;
    let updated = decreaseCooldowns(char);
    updated = regenerateEnergy(updated, 25);
    return updated;
  });
  
  const teamAAllive = characters.filter(c => c.team === 'A' && c.isAlive).length;
  const teamBAllive = characters.filter(c => c.team === 'B' && c.isAlive).length;
  
  let phase: BattleState['phase'] = 'planning';
  let message = `✅ 第 ${state.turn} 回合结束！第 ${state.turn + 1} 回合开始，请规划行动。`;
  
  if (teamAAllive === 0) {
    phase = 'result';
    message = '🏆 战斗结束！队伍 B 获胜！';
  } else if (teamBAllive === 0) {
    phase = 'result';
    message = '🏆 战斗结束！队伍 A 获胜！';
  }
  
  eventLog.push({
    id: uuidv4(),
    timestamp: Date.now(),
    type: 'system',
    message,
  });
  
  const grid = state.grid.map(row => row.map(cell => {
    const char = characters.find(c => c.id === cell.characterId);
    return {
      ...cell,
      characterId: char?.isAlive ? char.id : null,
      isHighlighted: false,
    };
  }));
  
  return {
    ...state,
    turn: state.turn + 1,
    phase,
    grid,
    characters,
    actionQueue: [],
    eventLog,
    floatingTexts,
    executingActionIndex: 0,
    isExecuting: false,
    selectedCharacterId: null,
    selectedSkillId: null,
  };
}

export function selectCharacter(state: BattleState, characterId: string | null): BattleState {
  return {
    ...state,
    selectedCharacterId: characterId,
    selectedSkillId: null,
  };
}

export function selectSkill(state: BattleState, skillId: string | null): BattleState {
  return {
    ...state,
    selectedSkillId: skillId,
  };
}

export function clearHighlights(state: BattleState): BattleState {
  const grid = state.grid.map(row => row.map(cell => ({
    ...cell,
    isHighlighted: false,
    highlightType: undefined,
  })));
  return { ...state, grid };
}

export function highlightValidTargets(state: BattleState, characterId: string, skillId: string): BattleState {
  const character = state.characters.find(c => c.id === characterId);
  const skill = character?.skills.find(s => s.id === skillId);
  
  if (!character || !skill || !character.position) return clearHighlights(state);
  
  const grid = state.grid.map(row => row.map(cell => {
    const distance = getDistance(character.position!, cell.coord);
    let isHighlighted = false;
    let highlightType: GridCell['highlightType'] = undefined;
    
    if (distance <= skill.range) {
      if (skill.targetType === 'enemy') {
        const targetChar = state.characters.find(c => c.id === cell.characterId);
        if (targetChar && targetChar.team !== character.team && targetChar.isAlive) {
          isHighlighted = true;
          highlightType = 'valid';
        }
      } else if (skill.targetType === 'ally') {
        const targetChar = state.characters.find(c => c.id === cell.characterId);
        if (targetChar && targetChar.team === character.team && targetChar.isAlive) {
          isHighlighted = true;
          highlightType = 'valid';
        }
      } else if (skill.targetType === 'position') {
        isHighlighted = true;
        highlightType = 'valid';
      } else if (skill.targetType === 'self') {
        if (cell.coord.x === character.position!.x && cell.coord.y === character.position!.y) {
          isHighlighted = true;
          highlightType = 'valid';
        }
      }
    }
    
    return { ...cell, isHighlighted, highlightType };
  }));
  
  return { ...state, grid };
}

export function removeExpiredFloatingTexts(state: BattleState): BattleState {
  const now = Date.now();
  const floatingTexts = state.floatingTexts.filter(ft => now - ft.createdAt < 1500);
  return { ...state, floatingTexts };
}

export function performanceTest(): number {
  const startTime = performance.now();
  const iterations = 1000;
  
  for (let i = 0; i < iterations; i++) {
    const testGrid = createInitialGrid();
    const distance = getDistance({ x: 0, y: 0 }, { x: 9, y: 9 });
    void testGrid;
    void distance;
  }
  
  const endTime = performance.now();
  return (endTime - startTime) / iterations;
}
