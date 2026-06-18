import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useGameStore, GRID_SIZE } from './state/gameStore';
import type { Enemy, SkillWave } from './state/gameStore';
import { Grid } from './map/Grid';
import { Tower, TowerToolbar } from './map/Tower';
import { Hero } from './hero/Hero';
import { generatePath, spawnWave, updateEnemiesMovement, applyBurnDamage } from './battle/EnemyManager';
import { processTowerAttack, processHeroSkill } from './battle/CombatSystem';

const WAVE_INTERVAL = 15;
const SKILL_MAX_CHARGE = 3;
const SKILL_COOLDOWN = 5;
const SKILL_RADIUS = 80;
const SKILL_BASE_DAMAGE = 30;
const HERO_SPEED = 2;
const ENEMY_SPAWN_GRACE = 200;

export default function App() {
  const [viewWidth, setViewWidth] = useState(window.innerWidth);
  const [viewHeight, setViewHeight] = useState(window.innerHeight);

  const toolbarWidth = viewWidth < 800 ? 120 : 200;
  const towerIconSize = viewWidth < 800 ? 40 : 50;
  const statusBarHeight = 60;

  const mainWidth = viewWidth - toolbarWidth;
  const mainHeight = viewHeight;
  const gameAreaWidth = Math.max(mainWidth * 0.7, 600);
  const gameAreaHeight = mainHeight - statusBarHeight;

  const cellSize = Math.min(
    Math.floor((gameAreaWidth - 40) / GRID_SIZE),
    Math.floor((gameAreaHeight - 40) / GRID_SIZE),
    60
  );
  const gridPixelSize = cellSize * GRID_SIZE;
  const offsetX = Math.floor((gameAreaWidth - gridPixelSize) / 2);
  const offsetY = statusBarHeight + Math.floor((gameAreaHeight - gridPixelSize) / 2);

  const bounds = useMemo(() => ({
    minX: offsetX,
    minY: offsetY,
    maxX: offsetX + gridPixelSize,
    maxY: offsetY + gridPixelSize,
  }), [offsetX, offsetY, gridPixelSize]);

  const path = useMemo(
    () => generatePath(offsetX, offsetY, cellSize),
    [offsetX, offsetY, cellSize]
  );

  const pathRef = useRef(path);
  useEffect(() => { pathRef.current = path; }, [path]);

  const boundsRef = useRef(bounds);
  useEffect(() => { boundsRef.current = bounds; }, [bounds]);

  useEffect(() => {
    const onResize = () => {
      setViewWidth(window.innerWidth);
      setViewHeight(window.innerHeight);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const {
    gold, wave, lives, towers, enemies, hero, selectedTowerId,
    gameOver, killCount, survivedWaves, nextWaveTimer, keys,
    addEnemy, markEnemyReachedEnd, updateEnemies, incrementKillCount,
    addGold, setWave, setNextWaveTimer, setSurvivedWaves,
    setHeroPosition, setHeroCharging, setHeroChargeTime, setHeroCooldown,
    addSkillWave, removeSkillWave, setKey, resetGame, selectTower,
  } = useGameStore();

  const stateRef = useRef({
    gold, wave, lives, towers, enemies, hero, keys,
    killCount, survivedWaves, nextWaveTimer, selectedTowerId, gameOver,
  });

  useEffect(() => {
    stateRef.current = {
      gold, wave, lives, towers, enemies, hero, keys,
      killCount, survivedWaves, nextWaveTimer, selectedTowerId, gameOver,
    };
  }, [gold, wave, lives, towers, enemies, hero, keys, killCount, survivedWaves, nextWaveTimer, selectedTowerId, gameOver]);

  const pendingEnemiesRef = useRef<{ enemy: Enemy; spawnAt: number }[]>([]);
  const spawnTimerRef = useRef(0);
  const frameCountRef = useRef(0);

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (stateRef.current.gameOver) return;

    const key = e.key.toLowerCase();
    if (['w', 'a', 's', 'd'].includes(key)) {
      setKey(key, true);
    }
    if (key === ' ' || e.code === 'Space') {
      e.preventDefault();
      const s = stateRef.current;
      if (!s.hero.charging && s.hero.cooldown <= 0 && !s.hero.charging) {
        setHeroCharging(true);
        setHeroChargeTime(0);
      }
    }
  }, [setKey, setHeroCharging, setHeroChargeTime]);

  const onKeyUp = useCallback((e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if (['w', 'a', 's', 'd'].includes(key)) {
      setKey(key, false);
    }
    if (key === ' ' || e.code === 'Space') {
      e.preventDefault();
      const s = stateRef.current;
      if (s.hero.charging) {
        const chargeT = Math.min(s.hero.chargeTime, SKILL_MAX_CHARGE);
        const damage = SKILL_BASE_DAMAGE + Math.floor(chargeT * 50);
        const hx = s.hero.x;
        const hy = s.hero.y;
        const targets = processHeroSkill(hx, hy, SKILL_RADIUS, damage, s.enemies);
        addSkillWave(hx, hy, SKILL_RADIUS);
        setHeroCharging(false);
        setHeroChargeTime(0);
        setHeroCooldown(SKILL_COOLDOWN);

        setTimeout(() => {
          targets.forEach(t => {
            useGameStore.getState().damageEnemy(t.id, t.damage);
          });
        }, 0);
      }
    }
  }, [setKey, setHeroCharging, setHeroChargeTime, setHeroCooldown, addSkillWave]);

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [onKeyDown, onKeyUp]);

  const rafRef = useRef<number>();
  const lastTimeRef = useRef<number>(performance.now());
  const attackTimersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const loop = (now: number) => {
      const rawDt = (now - lastTimeRef.current) / 1000;
      const dt = Math.min(rawDt, 0.05);
      lastTimeRef.current = now;

      const st = stateRef.current;

      if (!st.gameOver) {
        frameCountRef.current++;
        const shouldThrottle = st.enemies.length > 40;
        const doUpdate = !shouldThrottle || frameCountRef.current % 2 === 0;

        let newTimer = st.nextWaveTimer - dt;
        if (newTimer <= 0) {
          newTimer = WAVE_INTERVAL;
          const newWave = st.wave + 1;
          setWave(newWave);
          setSurvivedWaves(Math.max(st.survivedWaves, newWave - 1));
          const newEnemies = spawnWave(newWave, pathRef.current);
          const baseSpawn = now;
          pendingEnemiesRef.current = newEnemies.map((en, idx) => ({
            enemy: en,
            spawnAt: baseSpawn + idx * ENEMY_SPAWN_GRACE,
          }));
          spawnTimerRef.current = 0;
        }
        setNextWaveTimer(newTimer);

        const ready = pendingEnemiesRef.current.filter(p => p.spawnAt <= now);
        if (ready.length > 0) {
          pendingEnemiesRef.current = pendingEnemiesRef.current.filter(p => p.spawnAt > now);
          ready.forEach(p => addEnemy(p.enemy));
        }

        const newHero = { ...st.hero };
        const b = boundsRef.current;
        let dx = 0, dy = 0;
        if (st.keys.has('w')) dy -= 1;
        if (st.keys.has('s')) dy += 1;
        if (st.keys.has('a')) dx -= 1;
        if (st.keys.has('d')) dx += 1;
        if (dx !== 0 && dy !== 0) {
          const inv = 1 / Math.sqrt(2);
          dx *= inv; dy *= inv;
        }
        newHero.x = Math.max(b.minX, Math.min(b.maxX, newHero.x + dx * HERO_SPEED));
        newHero.y = Math.max(b.minY, Math.min(b.maxY, newHero.y + dy * HERO_SPEED));

        if (newHero.charging) {
          newHero.chargeTime = Math.min(newHero.chargeTime + dt, SKILL_MAX_CHARGE);
        }
        if (newHero.cooldown > 0) {
          newHero.cooldown = Math.max(0, newHero.cooldown - dt);
        }

        const expiredWaves: string[] = [];
        newHero.skillWaves = newHero.skillWaves.filter(w => {
          if (now - w.createdAt > 500) {
            expiredWaves.push(w.id);
            return false;
          }
          return true;
        });
        if (expiredWaves.length) {
          expiredWaves.forEach(id => removeSkillWave(id));
        }

        setHeroPosition(newHero.x, newHero.y);
        if (newHero.charging !== st.hero.charging) setHeroCharging(newHero.charging);
        if (newHero.chargeTime !== st.hero.chargeTime) setHeroChargeTime(newHero.chargeTime);
        if (newHero.cooldown !== st.hero.cooldown) setHeroCooldown(newHero.cooldown);

        if (doUpdate && st.enemies.length > 0) {
          const moved = updateEnemiesMovement(
            st.enemies,
            pathRef.current,
            dt,
            (id) => markEnemyReachedEnd(id)
          );

          const burned = applyBurnDamage(
            moved,
            dt,
            () => incrementKillCount(),
            (n) => addGold(n)
          );

          updateEnemies(() => burned);

          const curState = useGameStore.getState();
          const currentEnemies = curState.enemies;

          curState.towers.forEach(tower => {
            const last = attackTimersRef.current.get(tower.id) || 0;
            if (now - last < 1000) return;

            const result = processTowerAttack(tower, currentEnemies, now);
            if (result) {
              attackTimersRef.current.set(tower.id, now);
              useGameStore.getState().damageEnemy(
                result.targetEnemyId,
                result.damage,
                result.effects
              );
              if (result.chainTargets && result.chainTargets.length > 0) {
                result.chainTargets.forEach(ct => {
                  useGameStore.getState().damageEnemy(ct.id, ct.damage, {});
                });
              }
            }
          });
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [addEnemy, markEnemyReachedEnd, updateEnemies, incrementKillCount, addGold,
      setWave, setNextWaveTimer, setSurvivedWaves,
      setHeroPosition, setHeroCharging, setHeroChargeTime, setHeroCooldown, removeSkillWave]);

  const renderEnemies = () => {
    return enemies.map(e => {
      const hpPct = e.hp / e.maxHp;
      const size = 12;
      return (
        <g key={e.id} pointerEvents="none">
          <polygon
            points={`${e.x},${e.y - size / 2} ${e.x - size / 2},${e.y + size / 2} ${e.x + size / 2},${e.y + size / 2}`}
            fill={e.color}
            stroke="#000"
            strokeWidth={0.5}
          />
          <rect
            x={e.x - 10}
            y={e.y - size / 2 - 8}
            width={20}
            height={4}
            rx={2}
            fill="#1a252f"
          />
          <rect
            x={e.x - 9}
            y={e.y - size / 2 - 7}
            width={18 * hpPct}
            height={2}
            rx={1}
            fill={hpPct > 0.5 ? '#27ae60' : hpPct > 0.2 ? '#f1c40f' : '#e74c3c'}
          />
          {e.burnTime > 0 && (
            <circle cx={e.x} cy={e.y - 2} r={3} fill="#e74c3c" opacity={0.8} />
          )}
          {e.slowTime > 0 && (
            <circle cx={e.x} cy={e.y - 2} r={3} fill="#3498db" opacity={0.8} />
          )}
        </g>
      );
    });
  };

  const handleMainClick = () => {
    selectTower(null);
  };

  const handleReset = () => {
    attackTimersRef.current.clear();
    pendingEnemiesRef.current = [];
    frameCountRef.current = 0;
    resetGame();
  };

  const livesPct = Math.max(0, Math.min(1, lives / 100));

  return (
    <div
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        background: '#1a252f',
        overflow: 'hidden',
      }}
    >
      <TowerToolbar width={toolbarWidth} iconSize={towerIconSize} />

      <div
        style={{
          flex: 1,
          height: '100vh',
          position: 'relative',
          overflow: 'hidden',
        }}
        onClick={handleMainClick}
      >
        <div
          style={{
            height: statusBarHeight,
            background: '#1a252f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            borderBottom: '2px solid #34495e',
            flexShrink: 0,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <div style={{ color: '#fff', fontSize: 14 }}>
              <span style={{ color: '#95a5a6', marginRight: 6 }}>波次</span>
              <span style={{ color: '#3498db', fontWeight: 'bold', fontSize: 18 }}>
                {wave}
              </span>
              <span style={{ color: '#95a5a6', marginLeft: 6 }}>
                ({Math.ceil(nextWaveTimer)}s)
              </span>
            </div>
            <div style={{ color: '#fff', fontSize: 14 }}>
              <span style={{ color: '#95a5a6', marginRight: 6 }}>金币</span>
              <span style={{ color: '#f1c40f', fontWeight: 'bold', fontSize: 18 }}>
                💰 {gold}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#95a5a6', fontSize: 14 }}>生命</span>
              <div
                style={{
                  width: 180,
                  height: 18,
                  background: '#2c3e50',
                  borderRadius: 9,
                  overflow: 'hidden',
                  border: '1px solid #34495e',
                }}
              >
                <div
                  style={{
                    width: `${livesPct * 100}%`,
                    height: '100%',
                    background: livesPct > 0.5 ? '#27ae60' : livesPct > 0.25 ? '#f39c12' : '#e74c3c',
                    transition: 'width 0.3s, background 0.3s',
                  }}
                />
              </div>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 'bold', width: 40 }}>
                {lives}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ color: '#95a5a6', fontSize: 12 }}>
              击杀: <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>{killCount}</span>
            </div>
            <div style={{ color: '#7f8c8d', fontSize: 11 }}>
              WASD 移动 | 空格蓄力技能
            </div>
          </div>
        </div>

        <svg
          width="100%"
          height="100%"
          style={{ display: 'block', background: '#1a252f' }}
        >
          <Grid cellSize={cellSize} offsetX={offsetX} offsetY={offsetY} />

          {towers.map(t => (
            <Tower
              key={t.id}
              id={t.id}
              x={t.x}
              y={t.y}
              type={t.type}
              level={t.level}
              attack={t.attack}
              range={t.range}
              selected={selectedTowerId === t.id}
            />
          ))}

          {renderEnemies()}

          <Hero bounds={bounds} />
        </svg>

        {gameOver && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
            }}
          >
            <div
              style={{
                background: '#2c3e50',
                borderRadius: 16,
                padding: '40px 60px',
                textAlign: 'center',
                border: '3px solid #e74c3c',
                boxShadow: '0 0 60px rgba(231,76,60,0.4)',
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>💀</div>
              <h2 style={{ color: '#e74c3c', fontSize: 32, marginBottom: 24 }}>游戏结束</h2>
              <div style={{ color: '#ecf0f1', fontSize: 18, marginBottom: 8 }}>
                存活波次：<span style={{ color: '#3498db', fontWeight: 'bold' }}>{survivedWaves}</span>
              </div>
              <div style={{ color: '#ecf0f1', fontSize: 18, marginBottom: 32 }}>
                总击杀数：<span style={{ color: '#f1c40f', fontWeight: 'bold' }}>{killCount}</span>
              </div>
              <button
                onClick={handleReset}
                style={{
                  padding: '14px 40px',
                  fontSize: 18,
                  fontWeight: 'bold',
                  background: '#27ae60',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(39,174,96,0.4)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget.style.transform = 'translateY(-2px)');
                  (e.currentTarget.style.boxShadow = '0 6px 20px rgba(39,174,96,0.6)');
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget.style.transform = 'translateY(0)');
                  (e.currentTarget.style.boxShadow = '0 4px 16px rgba(39,174,96,0.4)');
                }}
              >
                🔄 重新开始
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
