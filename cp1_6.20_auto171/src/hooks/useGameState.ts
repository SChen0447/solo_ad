import { useState, useCallback, useRef, useEffect } from 'react';
import type { Unit, Tile, HexCoord, DamagePopup, GameState } from '../types';
import { generateGrid, hexKey } from '../utils/hexUtils';
import { getMoveRange, getAttackRange, findPath } from '../utils/pathfinding';
import { calculateAIActions, executeAIActions } from '../ai/AIModule';
import { GameAPI } from '../api/GameAPI';

const UNIT_TEMPLATES = {
  infantry: {
    name: '步兵',
    type: 'infantry',
    attack: 2,
    defense: 2,
    movement: 3,
    health: 10,
    range: 1,
    color: '#c0392b',
  },
  archer: {
    name: '弓箭手',
    type: 'archer',
    attack: 3,
    defense: 1,
    movement: 2,
    health: 8,
    range: 3,
    color: '#2980b9',
  },
  knight: {
    name: '骑士',
    type: 'knight',
    attack: 4,
    defense: 1,
    movement: 4,
    health: 12,
    range: 1,
    color: '#f39c12',
  },
};

function createInitialUnits(): Unit[] {
  const units: Unit[] = [];
  let idCounter = 1;

  const playerUnits = [
    { type: 'infantry', q: 1, r: 6 },
    { type: 'infantry', q: 1, r: 8 },
    { type: 'archer', q: 0, r: 5 },
    { type: 'archer', q: 0, r: 9 },
    { type: 'knight', q: 2, r: 7 },
  ];

  const aiUnits = [
    { type: 'infantry', q: 13, r: 6 },
    { type: 'infantry', q: 13, r: 8 },
    { type: 'archer', q: 14, r: 5 },
    { type: 'archer', q: 14, r: 9 },
    { type: 'knight', q: 12, r: 7 },
  ];

  playerUnits.forEach((u) => {
    const template = UNIT_TEMPLATES[u.type as keyof typeof UNIT_TEMPLATES];
    units.push({
      id: `player-${idCounter}`,
      ...template,
      team: 'player',
      position: { q: u.q, r: u.r },
      currentHealth: template.health,
      maxHealth: template.health,
      hasMoved: false,
      hasAttacked: false,
    });
    idCounter++;
  });

  idCounter = 1;
  aiUnits.forEach((u) => {
    const template = UNIT_TEMPLATES[u.type as keyof typeof UNIT_TEMPLATES];
    units.push({
      id: `ai-${idCounter}`,
      ...template,
      team: 'ai',
      position: { q: u.q, r: u.r },
      currentHealth: template.health,
      maxHealth: template.health,
      hasMoved: false,
      hasAttacked: false,
    });
    idCounter++;
  });

  return units;
}

export function useGameState() {
  const [tiles, setTiles] = useState<Tile[]>(() => generateGrid());
  const [gameState, setGameState] = useState<GameState>(() => ({
    turn: 1,
    currentTeam: 'player',
    units: createInitialUnits(),
    selectedUnitId: null,
    phase: 'select',
    winner: null,
    moveRange: [],
    attackRange: [],
    pathPreview: [],
    gameStartTime: Date.now(),
  }));
  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);
  const [attackingTarget, setAttackingTarget] = useState<HexCoord | null>(null);
  const [logs, setLogs] = useState<string[]>(['游戏开始！玩家回合。']);
  const [isAIThinking, setIsAIThinking] = useState(false);

  const addLog = useCallback((message: string) => {
    setLogs(prev => [...prev, message]);
  }, []);

  const selectedUnit = gameState.units.find(u => u.id === gameState.selectedUnitId) || null;

  const calculateDamage = (attacker: Unit, defender: Unit): number => {
    const baseDamage = attacker.attack;
    const defense = defender.defense;
    return Math.max(1, baseDamage - Math.floor(defense / 2));
  };

  const showDamagePopup = useCallback((position: HexCoord, damage: number) => {
    const id = `dmg-${Date.now()}-${Math.random()}`;
    setDamagePopups(prev => [...prev, { id, position, damage }]);
    setTimeout(() => {
      setDamagePopups(prev => prev.filter(p => p.id !== id));
    }, 500);
  }, []);

  const selectUnit = useCallback((unit: Unit) => {
    if (gameState.phase === 'gameOver') return;
    if (gameState.currentTeam !== unit.team) return;

    if (unit.team === 'player' && gameState.currentTeam === 'player') {
      const moveRange = unit.hasMoved ? [] : getMoveRange(unit.position, unit.movement, tiles, gameState.units);
      const attackRange = unit.hasAttacked ? [] : getAttackRange(unit.position, unit.range, tiles);

      setGameState(prev => ({
        ...prev,
        selectedUnitId: unit.id,
        phase: 'select',
        moveRange,
        attackRange,
        pathPreview: [],
      }));
    }
  }, [tiles, gameState.units, gameState.phase, gameState.currentTeam]);

  const handleTileClick = useCallback((coord: HexCoord) => {
    if (gameState.phase === 'gameOver') return;
    if (gameState.currentTeam !== 'player') return;

    const clickedUnit = gameState.units.find(
      u => u.position.q === coord.q && u.position.r === coord.r && u.currentHealth > 0
    );

    if (clickedUnit) {
      if (clickedUnit.team === 'player') {
        selectUnit(clickedUnit);
        return;
      }

      if (selectedUnit && !selectedUnit.hasAttacked) {
        const inAttackRange = gameState.attackRange.some(
          c => c.q === coord.q && c.r === coord.r
        );

        if (inAttackRange && clickedUnit.team === 'ai') {
          performAttack(selectedUnit, clickedUnit);
          return;
        }
      }
    }

    if (selectedUnit && !selectedUnit.hasMoved) {
      const inMoveRange = gameState.moveRange.some(
        c => c.q === coord.q && c.r === coord.r
      );

      if (inMoveRange) {
        moveUnit(selectedUnit, coord);
        return;
      }
    }

    if (selectedUnit && !selectedUnit.hasMoved) {
      const path = findPath(selectedUnit.position, coord, tiles, gameState.units);
      if (path && path.length - 1 <= selectedUnit.movement) {
        setGameState(prev => ({ ...prev, pathPreview: path }));
      }
    }
  }, [gameState, selectedUnit, tiles, selectUnit]);

  const moveUnit = useCallback((unit: Unit, target: HexCoord) => {
    setGameState(prev => {
      const newUnits = prev.units.map(u => {
        if (u.id === unit.id) {
          return { ...u, position: target, hasMoved: true };
        }
        return u;
      });

      const updatedUnit = newUnits.find(u => u.id === unit.id)!;
      const moveRange: HexCoord[] = [];
      const attackRange = updatedUnit.hasAttacked ? [] : getAttackRange(target, updatedUnit.range, tiles);

      addLog(`${unit.name} 移动到 (${target.q}, ${target.r})`);

      return {
        ...prev,
        units: newUnits,
        moveRange,
        attackRange,
        pathPreview: [],
      };
    });
  }, [tiles, addLog]);

  const performAttack = useCallback((attacker: Unit, target: Unit) => {
    const damage = calculateDamage(attacker, target);

    setAttackingTarget(target.position);
    showDamagePopup(target.position, damage);

    setTimeout(() => {
      setAttackingTarget(null);
    }, 300);

    setGameState(prev => {
      const newUnits = prev.units.map(u => {
        if (u.id === attacker.id) {
          return { ...u, hasAttacked: true };
        }
        if (u.id === target.id) {
          const newHealth = Math.max(0, u.currentHealth - damage);
          return { ...u, currentHealth: newHealth };
        }
        return u;
      });

      const killed = target.currentHealth - damage <= 0;
      if (killed) {
        addLog(`${attacker.name} 击败了 ${target.name}！`);
      } else {
        addLog(`${attacker.name} 对 ${target.name} 造成 ${damage} 点伤害`);
      }

      const updatedAttacker = newUnits.find(u => u.id === attacker.id)!;
      const moveRange = updatedAttacker.hasMoved ? [] : getMoveRange(updatedAttacker.position, updatedAttacker.movement, tiles, newUnits);
      const attackRange: HexCoord[] = [];

      let winner = prev.winner;
      let phase = prev.phase;

      const alivePlayerUnits = newUnits.filter(u => u.team === 'player' && u.currentHealth > 0);
      const aliveAiUnits = newUnits.filter(u => u.team === 'ai' && u.currentHealth > 0);

      if (alivePlayerUnits.length === 0) {
        winner = 'ai';
        phase = 'gameOver';
        addLog('AI获胜！');
      } else if (aliveAiUnits.length === 0) {
        winner = 'player';
        phase = 'gameOver';
        addLog('玩家获胜！');
      }

      return {
        ...prev,
        units: newUnits,
        moveRange,
        attackRange,
        winner,
        phase,
      };
    });
  }, [tiles, addLog, showDamagePopup]);

  const endTurn = useCallback(() => {
    if (gameState.phase === 'gameOver') return;
    if (gameState.currentTeam !== 'player') return;

    setGameState(prev => ({
      ...prev,
      currentTeam: 'ai',
      selectedUnitId: null,
      moveRange: [],
      attackRange: [],
      pathPreview: [],
    }));
    addLog('玩家回合结束，AI回合开始。');
    setIsAIThinking(true);

    setTimeout(() => {
      runAITurn();
    }, 1000);
  }, [gameState.currentTeam, gameState.phase, addLog]);

  const runAITurn = useCallback(() => {
    setGameState(prev => {
      const aiUnits = prev.units.filter(u => u.team === 'ai' && u.currentHealth > 0);
      const playerUnits = prev.units.filter(u => u.team === 'player' && u.currentHealth > 0);

      const actions = calculateAIActions(aiUnits, playerUnits, tiles, prev.units);
      const { units: newUnits, events } = executeAIActions(actions, prev.units, tiles);

      events.forEach(event => {
        if (event.type === 'move') {
          const unit = prev.units.find(u => u.id === event.unitId);
          if (unit) {
            addLog(`AI ${unit.name} 移动`);
          }
        } else if (event.type === 'attack') {
          const attacker = prev.units.find(u => u.id === event.attackerId);
          const target = prev.units.find(u => u.id === event.targetId);
          if (attacker && target) {
            addLog(`AI ${attacker.name} 攻击 ${target.name}，造成 ${event.damage} 点伤害`);
            if (event.targetPosition && event.damage) {
              showDamagePopup(event.targetPosition, event.damage);
            }
          }
        } else if (event.type === 'death') {
          const unit = prev.units.find(u => u.id === event.unitId);
          if (unit) {
            addLog(`${unit.name} 被击败了！`);
          }
        }
      });

      const resetUnits = newUnits.map(u => ({
        ...u,
        hasMoved: false,
        hasAttacked: false,
      }));

      let winner = prev.winner;
      let phase = prev.phase;

      const alivePlayerUnits = resetUnits.filter(u => u.team === 'player' && u.currentHealth > 0);
      const aliveAiUnits = resetUnits.filter(u => u.team === 'ai' && u.currentHealth > 0);

      if (alivePlayerUnits.length === 0) {
        winner = 'ai';
        phase = 'gameOver';
        addLog('AI获胜！');
      } else if (aliveAiUnits.length === 0) {
        winner = 'player';
        phase = 'gameOver';
        addLog('玩家获胜！');
      }

      const newTurn = prev.turn + 1;

      if (phase === 'gameOver') {
        const duration = (Date.now() - prev.gameStartTime) / 1000;
        GameAPI.saveGame({
          winner: winner || '',
          turns: newTurn,
          player_units_remaining: alivePlayerUnits.length,
          ai_units_remaining: aliveAiUnits.length,
          duration,
        });
      }

      return {
        ...prev,
        units: phase === 'gameOver' ? resetUnits : resetUnits,
        turn: newTurn,
        currentTeam: phase === 'gameOver' ? prev.currentTeam : 'player',
        phase,
        winner,
      };
    });

    setIsAIThinking(false);
    if (gameState.phase !== 'gameOver') {
      addLog('AI回合结束，玩家回合开始。');
    }
  }, [tiles, addLog, showDamagePopup, gameState.phase]);

  const resetGame = useCallback(() => {
    setTiles(generateGrid());
    setGameState({
      turn: 1,
      currentTeam: 'player',
      units: createInitialUnits(),
      selectedUnitId: null,
      phase: 'select',
      winner: null,
      moveRange: [],
      attackRange: [],
      pathPreview: [],
      gameStartTime: Date.now(),
    });
    setDamagePopups([]);
    setAttackingTarget(null);
    setLogs(['游戏重置！玩家回合。']);
    setIsAIThinking(false);
  }, []);

  return {
    tiles,
    gameState,
    selectedUnit,
    damagePopups,
    attackingTarget,
    logs,
    isAIThinking,
    selectUnit,
    handleTileClick,
    endTurn,
    resetGame,
  };
}
