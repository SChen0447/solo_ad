import { useEffect, useRef } from 'react';
import { useGameStore, TRAP_CONFIG } from './store';
import type { Enemy, Trap } from './types';

interface TriggerRecord {
  enemyId: string;
  trapId: string;
}

export const EffectManager = (): null => {
  const phase = useGameStore((s) => s.phase);
  const enemies = useGameStore((s) => s.enemies);
  const traps = useGameStore((s) => s.traps);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const activeEffects = useGameStore((s) => s.activeEffects);

  const triggeredRef = useRef<Set<string>>(new Set());
  const lastPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (phase !== 'simulating') {
      triggeredRef.current.clear();
      lastPositionsRef.current.clear();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const tick = () => {
      const now = Date.now();
      const state = useGameStore.getState();

      state.clearExpiredEffects(now);

      state.enemies.forEach((enemy: Enemy) => {
        if (enemy.isDead) return;

        const lastPos = lastPositionsRef.current.get(enemy.id);
        if (!lastPos || lastPos.x !== enemy.x || lastPos.y !== enemy.y) {
          lastPositionsRef.current.set(enemy.id, { x: enemy.x, y: enemy.y });

          state.traps.forEach((trap: Trap) => {
            if (trap.x !== enemy.x || trap.y !== enemy.y) return;

            const triggerKey = `${enemy.id}-${trap.id}-${state.currentTurn}`;
            if (triggeredRef.current.has(triggerKey)) return;

            const turnsSincePlaced = state.currentTurn;
            if (turnsSincePlaced < trap.triggerDelay) return;

            if (trap.isTriggered && trap.remainingDuration <= 0) return;

            if (trap.triggeredEnemies.has(enemy.id)) return;

            triggeredRef.current.add(triggerKey);

            const config = TRAP_CONFIG[trap.type];
            const damage = config.damage;

            state.triggerTrap(trap.id);

            const updatedTrap = state.traps.find((t: Trap) => t.id === trap.id);
            if (updatedTrap) {
              const newRemaining = updatedTrap.isTriggered
                ? Math.max(0, updatedTrap.remainingDuration - 1)
                : updatedTrap.duration;
              state.updateTrapRemaining(trap.id, newRemaining);
            }

            state.traps = state.traps.map((t: Trap) => {
              if (t.id === trap.id) {
                t.triggeredEnemies.add(enemy.id);
              }
              return t;
            });

            state.addActiveEffect({
              type: trap.type,
              x: trap.x,
              y: trap.y,
              duration: trap.type === 'poison' ? 1 : 0.6,
            });

            let newHealth = enemy.health - damage;
            const updates: Partial<Enemy> = { health: Math.max(0, newHealth) };

            if (trap.type === 'electric') {
              updates.isStunned = true;
              updates.stunEndTime = now + 300;
            }

            if (newHealth <= 0) {
              updates.isDead = true;
              updates.health = 0;
              state.addLog(
                `[回合${state.currentTurn}] 敌人 #01 触发 ${config.name}，伤害${damage}，敌人阵亡！`,
                'damage'
              );
            } else {
              state.addLog(
                `[回合${state.currentTurn}] 敌人 #01 触发 ${config.name}，伤害${damage}`,
                'trap'
              );
            }

            state.updateEnemy(enemy.id, updates);
          });
        }
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, enemies, traps, currentTurn, activeEffects]);

  return null;
};

export { TRAP_CONFIG };
