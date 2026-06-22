import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  GameState,
  createInitialState,
  selectUnit,
  tryMoveUnit,
  tryAttackUnit,
  endTurn,
  getUnitAt,
  updateAnimations,
  getMovableTiles,
  getAttackableTiles,
  selectDeployType,
  tryDeployUnit,
  confirmDeploy,
  clearAndRestartDeploy,
  UnitType,
  Side,
} from './GameEngine';
import { UnitRenderer } from './UnitRenderer';
import { UIPanel } from './UIPanel';

const App: React.FC = () => {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const lastFrameRef = useRef<number>(performance.now());
  const animRef = useRef<number>(0);

  useEffect(() => {
    const loop = (t: number) => {
      const delta = t - lastFrameRef.current;
      lastFrameRef.current = t;
      setState(prev => {
        if (prev.projectiles.length === 0 && prev.hitAnimations.length === 0 && prev.deployAnimations.length === 0) {
          return prev;
        }
        return updateAnimations(prev, delta);
      });
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const handleUnitClick = useCallback((unitId: string) => {
    setState(prev => {
      if (prev.phase === 'deploy') return prev;
      const unit = prev.units.find(u => u.id === unitId);
      if (!unit || unit.hp <= 0) return prev;

      if (prev.selectedUnitId && prev.selectedUnitId !== unitId) {
        const attacker = prev.units.find(u => u.id === prev.selectedUnitId);
        if (attacker && attacker.hp > 0 && attacker.side === prev.currentSide) {
          const attackables = getAttackableTiles(prev, prev.selectedUnitId);
          const canAttack = attackables.some(
            p => p.x === unit.position.x && p.y === unit.position.y
          );
          if (canAttack && attacker.side !== unit.side) {
            return tryAttackUnit(prev, prev.selectedUnitId, unit.position.x, unit.position.y);
          }
        }
      }

      return selectUnit(prev, unit.side === prev.currentSide ? unitId : prev.selectedUnitId);
    });
  }, []);

  const handleCellClick = useCallback((x: number, y: number) => {
    setState(prev => {
      if (prev.phase === 'deploy') {
      if (prev.selectedDeployType) {
        return tryDeployUnit(prev, prev.selectedDeployType, x, y);
      }
      return prev;
    }

      if (!prev.selectedUnitId) {
        const selectedUnit = prev.units.find(u => u.id === prev.selectedUnitId);
        if (!selectedUnit || selectedUnit.hp <= 0) {
          return selectUnit(prev, null);
        }

        const movables = getMovableTiles(prev, prev.selectedUnitId);
        const canMove = movables.some(p => p.x === x && p.y === y);
        if (canMove) {
          return tryMoveUnit(prev, prev.selectedUnitId, x, y);
        }

        const attackables = getAttackableTiles(prev, prev.selectedUnitId);
        const canAttack = attackables.some(p => p.x === x && p.y === y);
        if (canAttack) {
          return tryAttackUnit(prev, prev.selectedUnitId, x, y);
        }

        const unitAtCell = getUnitAt(prev, x, y);
        if (unitAtCell && unitAtCell.side === prev.currentSide) {
          return selectUnit(prev, unitAtCell.id);
        }
        return selectUnit(prev, null);
      } else {
        const unit = getUnitAt(prev, x, y);
        if (unit && unit.side === prev.currentSide) {
          return selectUnit(prev, unit.id);
        }
      }
      return prev;
    });
  }, []);

  const handleEndTurn = useCallback(() => {
    setState(prev => endTurn(prev));
  }, []);

  const handleRestart = useCallback(() => {
    setState(createInitialState());
  }, []);

  const handleSelectDeployType = useCallback((type: UnitType | null) => {
    setState(prev => selectDeployType(prev, type));
  }, []);

  const handleConfirmDeploy = useCallback(() => {
    setState(prev => confirmDeploy(prev));
  }, []);

  const handleClearDeploy = useCallback((side: Side) => {
    setState(prev => clearAndRestartDeploy(prev, side));
  }, []);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      padding: 20,
      boxSizing: 'border-box',
      background: `
        radial-gradient(ellipse at 20% 20%, rgba(212,165,116,0.9) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 80%, rgba(180,140,90,0.8) 0%, transparent 60%),
        repeating-linear-gradient(
          45deg,
          rgba(92,58,33,0.03) 0px,
          rgba(92,58,33,0.03) 2px,
          transparent 2px,
          transparent 6px
        ),
        #d4a574
      `,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}>
        <OperationHint state={state} />
        <UnitRenderer
          state={state}
          onCellClick={handleCellClick}
          onUnitClick={handleUnitClick}
        />
        {state.phase !== 'deploy' && <StatusBar state={state} />}
      </div>
      <UIPanel
        state={state}
        onEndTurn={handleEndTurn}
        onRestart={handleRestart}
        onSelectDeployType={handleSelectDeployType}
        onConfirmDeploy={handleConfirmDeploy}
        onClearDeploy={handleClearDeploy}
      />
    </div>
  );
};

const OperationHint: React.FC<{ state: GameState }> = ({ state }) => {
  const selectedUnit = state.units.find(u => u.id === state.selectedUnitId);
  let hint = '';
  let hintColor = '#5c3a21';

  if (state.phase === 'deploy') {
    const deployingSide: Side = state.deployStep === 'attackerDeploy' ? 'attacker' : 'defender';
    if (state.selectedDeployType) {
      hint = `📍 已选择【${getUnitName(state.selectedDeployType)}】——点击${deployingSide === 'attacker' ? '左侧红色' : '右侧蓝色'}高亮区域的空格放置单位`;
    } else {
      hint = deployingSide === 'attacker'
        ? '📜 部署阶段：请先在右侧选择要部署的兵种（步兵/弓箭手/投石车各2个）'
        : '📜 部署阶段：请先在右侧选择要部署的兵种（骑士/弓箭手/投石机各2个）';
    }
    hintColor = deployingSide === 'attacker' ? '#922b21' : '#1f618d';
  } else if (state.phase === 'ended') {
    hint = state.winner === 'attacker' ? '🏆 攻方已攻破城门，战斗结束！' : '🛡️ 守方成功守卫城堡，战斗结束！';
    hintColor = state.winner === 'attacker' ? '#922b21' : '#1f618d';
  } else if (selectedUnit) {
    const canMove = !selectedUnit.movedThisTurn;
    const canAttack = !selectedUnit.attackedThisTurn;
    if (canMove && canAttack) {
      hint = `🎯 已选中单位：可移动或攻击';
    } else if (canMove) {
      hint = `👣 已选中单位：仅可移动`;
    } else if (canAttack) {
      hint = `⚔️ 已选中单位：仅可攻击`;
    } else {
      hint = `⏸️ 本回合已行动完毕，选择其他单位或结束回合`;
    }
    hintColor = selectedUnit.side === 'attacker' ? '#8b2020' : '#204080';
  } else {
    hint = '💡 点击己方单位选择，然后点击绿色格子移动或红色格子攻击';
  }

  return (
    <div style={{
      padding: '10px 20px',
      background: 'linear-gradient(180deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1))',
      border: '2px solid #8b6a3a',
      borderRadius: 6,
      color: hintColor,
      fontWeight: 'bold',
      fontSize: 14,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.4)',
      maxWidth: 680,
      textAlign: 'center',
      minHeight: 44,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {hint}
    </div>
  );
};

function getUnitName(type: UnitType): string {
  const map: Record<UnitType, string> = {
    infantry: '步兵⚔️',
    archer: '弓箭手🏹',
    catapult: '投石车🪨',
    knight: '骑士🛡️',
    trebuchet: '投石机💥',
  };
  return map[type] || type;
}

const StatusBar: React.FC<{ state: GameState }> = ({ state }) => {
  const selectedUnit = state.units.find(u => u.id === state.selectedUnitId);
  return (
    <div style={{
      display: 'flex',
      gap: 16,
      padding: '10px 16px',
      background: 'linear-gradient(180deg, #e8c89a, #d4a574)',
      border: '3px solid #5c3a21',
      borderRadius: 6,
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      minWidth: 600,
      justifyContent: 'center',
      flexWrap: 'wrap',
    }}>
      <StatusItem label="回合" value={`${state.turn}/${state.maxTurns}`} color="#5c3a21" />
      <StatusItem
        label="当前行动"
        value={state.currentSide === 'attacker' ? '⚔️ 攻方' : '🛡️ 守方'}
        color={state.currentSide === 'attacker' ? '#922b21' : '#1f618d'}
      />
      <StatusItem label="城门HP" value={`${state.gateHp}/${state.gateMaxHp}`} color="#8b4513" />
      {selectedUnit && (
        <>
          <StatusItem
            label="选中单位"
            value={getUnitLabel(selectedUnit)}
            color={selectedUnit.side === 'attacker' ? '#8b2020' : '#204080'}
          />
          <StatusItem label="HP" value={`${selectedUnit.hp}/${selectedUnit.maxHp}`} color="#276020" />
          <StatusItem label="攻击" value={String(selectedUnit.attack)} color="#8b4513" />
          <StatusItem label="射程" value={String(selectedUnit.range)} color="#3a5a8a" />
        </>
      )}
    </div>
  );
};

const getUnitLabel = (unit: { type: string; side: string }) => {
  return `${getUnitIcon(unit.type)} ${getUnitShortName(unit.type)}(${unit.side === 'attacker' ? '攻' : '守'})`;
};

function getUnitIcon(type: string): string {
  const map: Record<string, string> = {
    infantry: '⚔️', archer: '🏹', catapult: '🪨', knight: '🛡️', trebuchet: '💥',
  };
  return map[type] || '❓';
}

function getUnitShortName(type: string): string {
  const map: Record<string, string> = {
    infantry: '步兵', archer: '弓箭手', catapult: '投石车', knight: '骑士', trebuchet: '投石机',
  };
  return map[type] || type;
}

const StatusItem: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={{
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
  }}>
    <span style={{
      fontSize: 12,
      color: '#5c3a21',
      fontWeight: 'bold',
      opacity: 0.8,
    }}>
      {label}
    </span>
    <span style={{
      fontSize: 15,
      fontWeight: 'bold',
      color,
    }}>
      {value}
    </span>
  </div>
);

export default App;
