import { useCallback, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { BattleState, DamagePopup, Hero, Enemy, Particle, Score } from './types';
import { getEnemyWave } from './data';

const CRIT_CHANCE = 0.2;
const CRIT_MULTIPLIER = 1.5;
const MAX_PARTICLES = 50;

function calculateDamage(attackerAtk: number, skillMultiplier: number, defenderDef: number): { damage: number; isCrit: boolean } {
  const isCrit = Math.random() < CRIT_CHANCE;
  let damage = Math.max(1, Math.floor(attackerAtk * skillMultiplier - defenderDef * 0.5));
  if (isCrit) damage = Math.floor(damage * CRIT_MULTIPLIER);
  return { damage, isCrit };
}

function calculateScore(heroes: Hero[], round: number, winStreak: number): Score {
  const totalMaxHp = heroes.reduce((s, h) => s + h.maxHp, 0);
  const totalCurrentHp = heroes.reduce((s, h) => s + (h.isAlive ? h.hp : 0), 0);
  const remainingHpRatio = totalCurrentHp / totalMaxHp;

  let grade: Score['grade'];
  if (remainingHpRatio > 0.8 && round <= 5) grade = 'S';
  else if (remainingHpRatio > 0.6 && round <= 8) grade = 'A';
  else if (remainingHpRatio > 0.4) grade = 'B';
  else grade = 'C';

  const basePoints = grade === 'S' ? 100 : grade === 'A' ? 75 : grade === 'B' ? 50 : 25;
  const streakBonus = 1 + winStreak * 0.1;
  const points = Math.floor(basePoints * streakBonus);

  return { grade, remainingHpRatio, rounds: round, points };
}

function findLowestHpTarget(targets: (Hero | Enemy)[]): (Hero | Enemy) | null {
  const alive = targets.filter(t => t.isAlive);
  if (alive.length === 0) return null;
  return alive.reduce((min, t) => (t.hp < min.hp ? t : min), alive[0]);
}

function createDamagePopup(value: number, isCrit: boolean, x: number, y: number): DamagePopup {
  return { id: uuidv4(), value, isCrit, x, y, timestamp: Date.now() };
}

function createDeathParticles(x: number, y: number, color: string): Particle[] {
  const particles: Particle[] = [];
  const count = Math.min(20, MAX_PARTICLES);
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const speed = 1 + Math.random() * 3;
    particles.push({
      id: uuidv4(),
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      maxLife: 1.0,
      color,
      size: 2 + Math.random() * 4,
    });
  }
  return particles;
}

function createCritParticles(x: number, y: number): Particle[] {
  const particles: Particle[] = [];
  const count = Math.min(12, MAX_PARTICLES);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    particles.push({
      id: uuidv4(),
      x: x + (Math.random() - 0.5) * 30,
      y: y + (Math.random() - 0.5) * 30,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.6,
      maxLife: 0.6,
      color: '#FFD700',
      size: 1 + Math.random() * 3,
    });
  }
  return particles;
}

const HERO_POSITIONS = [
  { x: 80, y: 280 },
  { x: 80, y: 380 },
  { x: 80, y: 480 },
];

const ENEMY_POSITIONS = [
  { x: 520, y: 280 },
  { x: 520, y: 380 },
  { x: 520, y: 480 },
];

export function useBattle() {
  const [state, setState] = useState<BattleState>({
    heroes: [],
    enemies: [],
    round: 0,
    log: [],
    isPlayerTurn: true,
    isAutoMode: true,
    phase: 'select',
    score: { grade: 'C', remainingHpRatio: 0, rounds: 0, points: 0 },
    winStreak: 0,
    totalScore: 0,
    damagePopups: [],
    particles: [],
    screenShake: false,
    isBattleOver: false,
    isVictory: false,
    logModalOpen: false,
    displayedLogCount: 0,
  });

  const waveRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const turnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startBattle = useCallback((selectedHeroes: Omit<Hero, 'x' | 'y'>[]) => {
    const heroes: Hero[] = selectedHeroes.map((h, i) => ({
      ...h,
      hp: h.maxHp,
      cooldown: 0,
      isAlive: true,
      x: HERO_POSITIONS[i].x,
      y: HERO_POSITIONS[i].y,
    }));

    const enemyData = getEnemyWave(waveRef.current);
    const enemies: Enemy[] = enemyData.map((e, i) => ({
      ...e,
      isAlive: true,
      x: ENEMY_POSITIONS[i].x,
      y: ENEMY_POSITIONS[i].y,
    }));

    setState(prev => ({
      ...prev,
      heroes,
      enemies,
      round: 1,
      log: [`⚔️ 第1回合开始！`],
      isPlayerTurn: true,
      phase: 'battle',
      damagePopups: [],
      particles: [],
      screenShake: false,
      isBattleOver: false,
      isVictory: false,
      displayedLogCount: 1,
    }));
  }, []);

  const addLog = useCallback((messages: string[]) => {
    setState(prev => ({
      ...prev,
      log: [...prev.log, ...messages],
      displayedLogCount: prev.displayedLogCount + messages.length,
    }));
  }, []);

  const executeHeroAction = useCallback((heroIndex: number, useSkill: boolean) => {
    setState(prev => {
      if (prev.isBattleOver || !prev.isPlayerTurn) return prev;

      const heroes = prev.heroes.map(h => ({ ...h }));
      const enemies = prev.enemies.map(e => ({ ...e }));
      const hero = heroes[heroIndex];
      if (!hero || !hero.isAlive) return prev;

      const target = findLowestHpTarget(enemies);
      if (!target) return prev;

      let damage: number;
      let isCrit: boolean;
      let multiplier: number;
      let newCooldown = hero.cooldown;
      let newPopups: DamagePopup[] = [];
      let newParticles: Particle[] = [];
      let logs: string[] = [];

      if (useSkill && hero.cooldown <= 0) {
        multiplier = hero.skill.multiplier;
        newCooldown = hero.maxCooldown;
        const result = calculateDamage(hero.atk, multiplier, target.def);
        damage = result.damage;
        isCrit = result.isCrit;
        logs.push(`✨ ${hero.name} 释放 ${hero.skill.name}！`);
      } else {
        multiplier = 1.0;
        const result = calculateDamage(hero.atk, multiplier, target.def);
        damage = result.damage;
        isCrit = result.isCrit;
        logs.push(`⚔️ ${hero.name} 攻击 ${target.name}`);
      }

      target.hp = Math.max(0, target.hp - damage);
      newPopups.push(createDamagePopup(damage, isCrit, target.x, target.y - 30));

      if (isCrit) {
        logs.push(`💥 暴击！造成 ${damage} 点伤害！`);
        newParticles = createCritParticles(target.x, target.y);
      } else {
        logs.push(`造成 ${damage} 点伤害`);
      }

      if (target.hp <= 0) {
        target.isAlive = false;
        logs.push(`💀 ${target.name} 被击败！`);
        newParticles = [...newParticles, ...createDeathParticles(target.x, target.y, '#8B0000')];
      }

      hero.cooldown = newCooldown;
      heroes[heroIndex] = hero;

      const enemyIdx = enemies.findIndex(e => e.id === target.id);
      if (enemyIdx >= 0) enemies[enemyIdx] = target;

      const allEnemiesDead = enemies.every(e => !e.isAlive);
      const allHeroesDead = heroes.every(h => !h.isAlive);

      if (allEnemiesDead || allHeroesDead) {
        const score = calculateScore(heroes, prev.round, allEnemiesDead ? prev.winStreak : 0);
        const newWinStreak = allEnemiesDead ? prev.winStreak + 1 : 0;
        logs.push(allEnemiesDead ? '🎉 胜利！' : '💀 战败...');
        return {
          ...prev,
          heroes,
          enemies,
          log: [...prev.log, ...logs],
          displayedLogCount: prev.displayedLogCount + logs.length,
          damagePopups: [...prev.damagePopups, ...newPopups],
          particles: [...prev.particles, ...newParticles].slice(-MAX_PARTICLES * 2),
          screenShake: true,
          isBattleOver: true,
          isVictory: allEnemiesDead,
          score,
          winStreak: newWinStreak,
          totalScore: prev.totalScore + score.points,
        };
      }

      return {
        ...prev,
        heroes,
        enemies,
        log: [...prev.log, ...logs],
        displayedLogCount: prev.displayedLogCount + logs.length,
        damagePopups: [...prev.damagePopups, ...newPopups],
        particles: [...prev.particles, ...newParticles].slice(-MAX_PARTICLES * 2),
        screenShake: true,
      };
    });
  }, []);

  const executeEnemyTurn = useCallback(() => {
    setState(prev => {
      if (prev.isBattleOver) return prev;

      const heroes = prev.heroes.map(h => ({ ...h }));
      const enemies = prev.enemies.map(e => ({ ...e }));
      let newPopups: DamagePopup[] = [];
      let newParticles: Particle[] = [];
      let logs: string[] = [];

      for (const enemy of enemies) {
        if (!enemy.isAlive) continue;
        const target = findLowestHpTarget(heroes);
        if (!target) break;

        const result = calculateDamage(enemy.atk, 1.0, target.def);
        target.hp = Math.max(0, target.hp - result.damage);
        newPopups.push(createDamagePopup(result.damage, result.isCrit, target.x, target.y - 30));

        if (result.isCrit) {
          logs.push(`💥 ${enemy.name} 暴击 ${target.name}，造成 ${result.damage} 点伤害！`);
          newParticles = [...newParticles, ...createCritParticles(target.x, target.y)];
        } else {
          logs.push(`🗡️ ${enemy.name} 攻击 ${target.name}，造成 ${result.damage} 点伤害`);
        }

        if (target.hp <= 0) {
          target.isAlive = false;
          logs.push(`💀 ${target.name} 倒下了！`);
          newParticles = [...newParticles, ...createDeathParticles(target.x, target.y, '#5D4037')];
        }

        const heroIdx = heroes.findIndex(h => h.id === target.id);
        if (heroIdx >= 0) heroes[heroIdx] = target;
      }

      const allHeroesDead = heroes.every(h => !h.isAlive);

      heroes.forEach(h => {
        if (h.isAlive && h.cooldown > 0) h.cooldown--;
      });

      if (allHeroesDead) {
        const score = calculateScore(heroes, prev.round, 0);
        logs.push('💀 全军覆没...');
        return {
          ...prev,
          heroes,
          enemies,
          log: [...prev.log, ...logs],
          displayedLogCount: prev.displayedLogCount + logs.length,
          damagePopups: [...prev.damagePopups, ...newPopups],
          particles: [...prev.particles, ...newParticles].slice(-MAX_PARTICLES * 2),
          screenShake: true,
          isBattleOver: true,
          isVictory: false,
          score,
          winStreak: 0,
        };
      }

      return {
        ...prev,
        heroes,
        enemies,
        log: [...prev.log, ...logs],
        displayedLogCount: prev.displayedLogCount + logs.length,
        damagePopups: [...prev.damagePopups, ...newPopups],
        particles: [...prev.particles, ...newParticles].slice(-MAX_PARTICLES * 2),
        screenShake: true,
        round: prev.round + 1,
        isPlayerTurn: true,
      };
    });
  }, []);

  const autoPlayRound = useCallback(() => {
    setState(prev => {
      if (prev.isBattleOver || !prev.isPlayerTurn) return prev;

      const heroes = prev.heroes.map(h => ({ ...h }));
      const enemies = prev.enemies.map(e => ({ ...e }));
      let newPopups: DamagePopup[] = [];
      let newParticles: Particle[] = [];
      let logs: string[] = [];

      logs.push(`⚔️ 第${prev.round}回合 - AI自动战斗`);

      for (const hero of heroes) {
        if (!hero.isAlive) continue;
        const target = findLowestHpTarget(enemies);
        if (!target) break;

        let damage: number;
        let isCrit: boolean;
        let newCooldown = hero.cooldown;

        if (hero.cooldown <= 0) {
          const result = calculateDamage(hero.atk, hero.skill.multiplier, target.def);
          damage = result.damage;
          isCrit = result.isCrit;
          newCooldown = hero.maxCooldown;
          logs.push(`✨ ${hero.name} 释放 ${hero.skill.name}！`);
        } else {
          const result = calculateDamage(hero.atk, 1.0, target.def);
          damage = result.damage;
          isCrit = result.isCrit;
          logs.push(`⚔️ ${hero.name} 攻击 ${target.name}`);
        }

        target.hp = Math.max(0, target.hp - damage);
        newPopups.push(createDamagePopup(damage, isCrit, target.x, target.y - 30));

        if (isCrit) {
          logs.push(`💥 暴击！造成 ${damage} 点伤害！`);
          newParticles = [...newParticles, ...createCritParticles(target.x, target.y)];
        } else {
          logs.push(`造成 ${damage} 点伤害`);
        }

        if (target.hp <= 0) {
          target.isAlive = false;
          logs.push(`💀 ${target.name} 被击败！`);
          newParticles = [...newParticles, ...createDeathParticles(target.x, target.y, '#8B0000')];
        }

        hero.cooldown = newCooldown;
        const enemyIdx = enemies.findIndex(e => e.id === target.id);
        if (enemyIdx >= 0) enemies[enemyIdx] = target;
      }

      const allEnemiesDead = enemies.every(e => !e.isAlive);

      if (!allEnemiesDead) {
        for (const enemy of enemies) {
          if (!enemy.isAlive) continue;
          const target = findLowestHpTarget(heroes);
          if (!target) break;

          const result = calculateDamage(enemy.atk, 1.0, target.def);
          target.hp = Math.max(0, target.hp - result.damage);
          newPopups.push(createDamagePopup(result.damage, result.isCrit, target.x, target.y - 30));

          if (result.isCrit) {
            logs.push(`💥 ${enemy.name} 暴击 ${target.name}，造成 ${result.damage} 点伤害！`);
            newParticles = [...newParticles, ...createCritParticles(target.x, target.y)];
          } else {
            logs.push(`🗡️ ${enemy.name} 攻击 ${target.name}，造成 ${result.damage} 点伤害`);
          }

          if (target.hp <= 0) {
            target.isAlive = false;
            logs.push(`💀 ${target.name} 倒下了！`);
            newParticles = [...newParticles, ...createDeathParticles(target.x, target.y, '#5D4037')];
          }

          const heroIdx = heroes.findIndex(h => h.id === target.id);
          if (heroIdx >= 0) heroes[heroIdx] = target;
        }
      }

      heroes.forEach(h => {
        if (h.isAlive && h.cooldown > 0) h.cooldown--;
      });

      const allHeroesDead = heroes.every(h => !h.isAlive);

      if (allEnemiesDead || allHeroesDead) {
        const score = calculateScore(heroes, prev.round, allEnemiesDead ? prev.winStreak : 0);
        const newWinStreak = allEnemiesDead ? prev.winStreak + 1 : 0;
        logs.push(allEnemiesDead ? '🎉 胜利！' : '💀 战败...');
        return {
          ...prev,
          heroes,
          enemies,
          log: [...prev.log, ...logs],
          displayedLogCount: prev.displayedLogCount + logs.length,
          damagePopups: [...prev.damagePopups, ...newPopups],
          particles: [...prev.particles, ...newParticles].slice(-MAX_PARTICLES * 2),
          screenShake: true,
          isBattleOver: true,
          isVictory: allEnemiesDead,
          score,
          winStreak: newWinStreak,
          totalScore: prev.totalScore + score.points,
        };
      }

      return {
        ...prev,
        heroes,
        enemies,
        log: [...prev.log, ...logs],
        displayedLogCount: prev.displayedLogCount + logs.length,
        damagePopups: [...prev.damagePopups, ...newPopups],
        particles: [...prev.particles, ...newParticles].slice(-MAX_PARTICLES * 2),
        screenShake: true,
        round: prev.round + 1,
      };
    });
  }, []);

  const toggleAutoMode = useCallback(() => {
    setState(prev => ({ ...prev, isAutoMode: !prev.isAutoMode }));
  }, []);

  const toggleLogModal = useCallback(() => {
    setState(prev => ({ ...prev, logModalOpen: !prev.logModalOpen }));
  }, []);

  const goToResult = useCallback(() => {
    setState(prev => ({ ...prev, phase: 'result' }));
  }, []);

  const restart = useCallback(() => {
    waveRef.current = 0;
    setState(prev => ({
      ...prev,
      phase: 'select',
      heroes: [],
      enemies: [],
      log: [],
      damagePopups: [],
      particles: [],
      round: 0,
      isBattleOver: false,
      isVictory: false,
      logModalOpen: false,
      displayedLogCount: 0,
    }));
  }, []);

  const nextWave = useCallback(() => {
    waveRef.current++;
    setState(prev => ({
      ...prev,
      phase: 'select',
      heroes: [],
      enemies: [],
      log: [],
      damagePopups: [],
      particles: [],
      round: 0,
      isBattleOver: false,
      isVictory: false,
      logModalOpen: false,
      displayedLogCount: 0,
    }));
  }, []);

  const clearScreenShake = useCallback(() => {
    setState(prev => ({ ...prev, screenShake: false }));
  }, []);

  const updateParticles = useCallback((deltaTime: number) => {
    setState(prev => {
      const updated = prev.particles
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.05,
          life: p.life - deltaTime / p.maxLife,
        }))
        .filter(p => p.life > 0)
        .slice(-MAX_PARTICLES * 2);
      return { ...prev, particles: updated };
    });
  }, []);

  const cleanOldPopups = useCallback(() => {
    const now = Date.now();
    setState(prev => ({
      ...prev,
      damagePopups: prev.damagePopups.filter(p => now - p.timestamp < 1500),
    }));
  }, []);

  const animateParticles = useCallback(() => {
    const animate = (time: number) => {
      const delta = lastFrameTimeRef.current ? (time - lastFrameTimeRef.current) / 1000 : 0.016;
      lastFrameTimeRef.current = time;
      updateParticles(Math.min(delta, 0.05));
      cleanOldPopups();
      animFrameRef.current = requestAnimationFrame(animate);
    };
    lastFrameTimeRef.current = 0;
    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [updateParticles, cleanOldPopups]);

  const startAutoBattle = useCallback(() => {
    if (turnTimeoutRef.current) clearTimeout(turnTimeoutRef.current);

    const runTurn = () => {
      setState(prev => {
        if (prev.isBattleOver || !prev.isAutoMode) return prev;
        return prev;
      });

      autoPlayRound();

      turnTimeoutRef.current = setTimeout(runTurn, 1800);
    };

    turnTimeoutRef.current = setTimeout(runTurn, 800);
  }, [autoPlayRound]);

  const stopAutoBattle = useCallback(() => {
    if (turnTimeoutRef.current) {
      clearTimeout(turnTimeoutRef.current);
      turnTimeoutRef.current = null;
    }
  }, []);

  return {
    state,
    startBattle,
    executeHeroAction,
    executeEnemyTurn,
    autoPlayRound,
    toggleAutoMode,
    toggleLogModal,
    goToResult,
    restart,
    nextWave,
    clearScreenShake,
    animateParticles,
    startAutoBattle,
    stopAutoBattle,
  };
}
