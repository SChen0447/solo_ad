import { useEffect, useRef } from 'react';
import { useGameStore } from './store';
import type { Enemy } from './types';

const MOVE_INTERVAL = 600;
const LERP_SPEED = 8;

export const EnemyAI = (): null => {
  const phase = useGameStore((s) => s.phase);
  const path = useGameStore((s) => s.path);
  const enemies = useGameStore((s) => s.enemies);
  const updateEnemy = useGameStore((s) => s.updateEnemy);
  const incrementTurn = useGameStore((s) => s.incrementTurn);
  const stopSimulation = useGameStore((s) => s.stopSimulation);
  const addLog = useGameStore((s) => s.addLog);

  const lastMoveTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (phase !== 'simulating') {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    lastMoveTimeRef.current = performance.now();

    const tick = (now: number) => {
      const currentEnemies = useGameStore.getState().enemies;
      const currentPath = useGameStore.getState().path;

      currentEnemies.forEach((enemy) => {
        if (enemy.isDead) return;

        const lerpT = Math.min(1, LERP_SPEED * 0.016);
        const newDisplayX = enemy.displayX + (enemy.targetX - enemy.displayX) * lerpT;
        const newDisplayY = enemy.displayY + (enemy.targetY - enemy.displayY) * lerpT;

        if (
          Math.abs(newDisplayX - enemy.displayX) > 0.001 ||
          Math.abs(newDisplayY - enemy.displayY) > 0.001
        ) {
          updateEnemy(enemy.id, { displayX: newDisplayX, displayY: newDisplayY });
        }

        if (now < enemy.stunEndTime) {
          updateEnemy(enemy.id, { isStunned: true });
        } else if (enemy.isStunned) {
          updateEnemy(enemy.id, { isStunned: false });
        }
      });

      if (now - lastMoveTimeRef.current >= MOVE_INTERVAL) {
        lastMoveTimeRef.current = now;
        const state = useGameStore.getState();
        let allReachedEnd = true;
        let anyAlive = false;

        state.enemies.forEach((enemy: Enemy) => {
          if (enemy.isDead) return;
          anyAlive = true;

          if (now < enemy.stunEndTime) return;

          const nextIdx = enemy.pathIndex + 1;
          if (nextIdx < currentPath.length) {
            const nextPoint = currentPath[nextIdx];
            updateEnemy(enemy.id, {
              x: nextPoint.x,
              y: nextPoint.y,
              targetX: nextPoint.x,
              targetY: nextPoint.y,
              pathIndex: nextIdx,
            });
            if (nextIdx < currentPath.length - 1) {
              allReachedEnd = false;
            }
          }
        });

        incrementTurn();

        if (anyAlive && allReachedEnd) {
          addLog('敌人已到达终点，模拟结束', 'system');
          stopSimulation();
          return;
        }

        if (!anyAlive) {
          addLog('所有敌人已被消灭，模拟结束', 'system');
          stopSimulation();
          return;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, path, enemies, updateEnemy, incrementTurn, stopSimulation, addLog]);

  return null;
};
