import { useEffect, useRef, useState } from 'react';
import { useGameStore, type CharacterConfig } from '@/store/GameStore';
import { BulletSystem, type Enemy } from './BulletSystem';

const CANVAS_W = 800;
const CANVAS_H = 600;
const GROUND_Y = 480;
const PLAYER_W = 40;
const PLAYER_H = 64;
const GRAVITY = 0.6;
const PLAYER_MOVE_SPEED = 3;
const PLAYER_JUMP_POWER = 10;
const SKILL_COOLDOWN = 3;
const ENEMY_SPAWN_INTERVAL = 3;
const MAX_ENEMIES = 3;
const PROGRESS_ORBS_FOR_BOSS = 10;

interface EnemyExt extends Enemy {
  type: number;
  attack: number;
  speed: number;
  lastAttackTime: number;
  flashTimer: number;
  knockbackX: number;
}

interface ProgressOrb {
  id: number;
  x: number;
  y: number;
  remaining: number;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  opacity: number;
  vy: number;
  color: string;
}

interface DeathParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  remaining: number;
}

const ENEMY_COLORS = ['#e74c3c', '#9b59b6', '#2ecc71', '#f39c12', '#3498db'];
const WEAPON_EMOJI: Record<string, string> = { sword: '⚔️', bow: '🏹', staff: '🔮' };
const SKILL_EMOJI: Record<string, string> = { fireball: '🔥', heal: '💚', blink: '⚡' };
const WEAPON_ORDER: Array<'sword' | 'bow' | 'staff'> = ['sword', 'bow', 'staff'];

export default function Battle() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [, forceRerender] = useState(0);
  const gamePhase = useGameStore((s) => s.gamePhase);
  const character = useGameStore((s) => s.character);
  const battle = useGameStore((s) => s.battle);
  const setGamePhase = useGameStore((s) => s.setGamePhase);
  const resetBattle = useGameStore((s) => s.resetBattle);
  const updateBattle = useGameStore((s) => s.updateBattle);

  const stateRef = useRef({
    player: { x: 100, y: GROUND_Y - PLAYER_H, vx: 0, vy: 0, onGround: true, facingRight: true },
    keys: {} as Record<string, boolean>,
    enemies: [] as EnemyExt[],
    orbs: [] as ProgressOrb[],
    floats: [] as FloatingText[],
    particles: [] as DeathParticle[],
    bulletSystem: new BulletSystem(),
    lastSpawn: 0,
    elapsed: 0,
    attackCooldown: 0,
    skillCooldown: 0,
    hurtFlash: 0,
    screenFlash: 0,
    enemyIdCounter: 1,
    orbIdCounter: 1,
    floatIdCounter: 1,
    particleIdCounter: 1,
    bossSpawned: false,
    bossDefeated: false,
    playerDied: false,
    gameEnded: false,
    fadeInT: 0,
    weaponSwitchFlash: 0,
    character: character,
  });

  useEffect(() => {
    stateRef.current.character = character;
  }, [character]);

  useEffect(() => {
    const s = stateRef.current;
    s.fadeInT = 0;
    s.player.x = 100;
    s.player.y = GROUND_Y - PLAYER_H;
    s.player.vx = 0;
    s.player.vy = 0;
    s.player.onGround = true;
    s.enemies = [];
    s.orbs = [];
    s.floats = [];
    s.bulletSystem.clear();
    s.lastSpawn = 0;
    s.elapsed = 0;
    s.attackCooldown = 0;
    s.skillCooldown = 0;
    s.hurtFlash = 0;
    s.screenFlash = 0;
    s.bossSpawned = false;
    s.bossDefeated = false;
    s.playerDied = false;
    s.gameEnded = false;
    updateBattle({
      playerHP: 100, playerMaxHP: 100,
      playerEnergy: 50, playerMaxEnergy: 50,
      score: 0, progressOrbs: 0, skillCooldown: 0,
      playerX: 100, playerY: GROUND_Y - PLAYER_H,
    });
  }, [gamePhase, updateBattle]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      stateRef.current.keys[e.key.toLowerCase()] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      stateRef.current.keys[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    if (gamePhase !== 'battle') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    ctx.imageSmoothingEnabled = false;

    let rafId = 0;
    let lastTime = performance.now();

    const spawnEnemy = (isBoss = false) => {
      const s = stateRef.current;
      const type = Math.floor(Math.random() * 5);
      if (isBoss) {
        s.enemies.push({
          id: s.enemyIdCounter++,
          type: 0,
          x: CANVAS_W - 100,
          y: GROUND_Y - 120,
          width: 80,
          height: 120,
          hp: 200,
          maxHp: 200,
          isBoss: true,
          attack: 15,
          speed: 0.8,
          lastAttackTime: 0,
          flashTimer: 0,
          knockbackX: 0,
        });
      } else {
        s.enemies.push({
          id: s.enemyIdCounter++,
          type,
          x: CANVAS_W - 40,
          y: GROUND_Y - 50,
          width: 40,
          height: 50,
          hp: 40 + Math.floor(Math.random() * 21),
          maxHp: 60,
          isBoss: false,
          attack: 5 + Math.floor(Math.random() * 4),
          speed: 1.5,
          lastAttackTime: 0,
          flashTimer: 0,
          knockbackX: 0,
        });
      }
    };

    const addFloatingText = (x: number, y: number, text: string, color: string = '#ffffff') => {
      const s = stateRef.current;
      s.floats.push({
        id: s.floatIdCounter++,
        x, y, text, color,
        opacity: 1,
        vy: -1.5,
      });
    };

    const drawPixelChar = (x: number, y: number, ch: CharacterConfig, scale: number, flash: boolean) => {
      const P = 4 * scale;
      const skin = flash ? '#ffffff' : '#f5c6a0';
      const hat = flash ? '#ffffff' : ch.head.hatColor;
      const shirt = flash ? '#ffffff' : ch.body.shirtColor;
      const pants = flash ? '#ffffff' : ch.legs.pantsColor;
      const px = (gx: number, gy: number, color: string) => {
        ctx.fillStyle = color;
        ctx.fillRect(x + gx * P, y + gy * P, P, P);
      };
      for (let gx = 6; gx <= 13; gx++) { px(gx, 0, hat); px(gx, 1, hat); }
      for (let gx = 5; gx <= 14; gx++) px(gx, 2, hat);
      for (let gx = 7; gx <= 12; gx++) for (let gy = 3; gy <= 6; gy++) px(gx, gy, skin);
      px(8, 4, '#1a1a2e'); px(11, 4, '#1a1a2e');
      for (let gx = 6; gx <= 13; gx++) for (let gy = 7; gy <= 13; gy++) px(gx, gy, shirt);
      for (let gy = 7; gy <= 11; gy++) { px(5, gy, skin); px(14, gy, skin); }
      for (let gx = 7; gx <= 9; gx++) for (let gy = 14; gy <= 17; gy++) px(gx, gy, pants);
      for (let gx = 10; gx <= 12; gx++) for (let gy = 14; gy <= 17; gy++) px(gx, gy, pants);
      for (let gx = 7; gx <= 12; gx++) { px(gx, 18, '#5a3825'); px(gx, 19, '#5a3825'); }
      if (ch.weapon === 'sword') {
        for (let gy = 4; gy <= 10; gy++) px(16, gy, '#d0d0d0');
        px(16, 11, '#8b4513'); px(16, 12, '#5a3825');
      } else if (ch.weapon === 'bow') {
        for (let gy = 4; gy <= 12; gy++) px(16, gy, '#8b4513');
      } else if (ch.weapon === 'staff') {
        for (let gy = 3; gy <= 13; gy++) px(16, gy, '#8b4513');
        px(15, 2, '#ffcc00'); px(16, 2, '#ffcc00'); px(17, 2, '#ffcc00');
      }
    };

    const drawEnemy = (e: EnemyExt) => {
      const color = e.flashTimer > 0 ? '#ffffff' : ENEMY_COLORS[e.type];
      const px = (gx: number, gy: number, w = 1, h = 1) => {
        ctx.fillStyle = color;
        ctx.fillRect(e.x + gx * (e.width / 10), e.y + gy * (e.height / 12), w * (e.width / 10), h * (e.height / 12));
      };
      for (let gx = 1; gx <= 8; gx++) for (let gy = 0; gy <= 4; gy++) px(gx, gy);
      for (let gx = 0; gx <= 9; gx++) for (let gy = 5; gy <= 9; gy++) px(gx, gy);
      for (let gx = 1; gx <= 3; gx++) for (let gy = 10; gy <= 11; gy++) px(gx, gy);
      for (let gx = 6; gx <= 8; gx++) for (let gy = 10; gy <= 11; gy++) px(gx, gy);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(e.x + e.width * 0.25, e.y + e.height * 0.2, e.width * 0.15, e.height * 0.15);
      ctx.fillRect(e.x + e.width * 0.6, e.y + e.height * 0.2, e.width * 0.15, e.height * 0.15);
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(e.x + e.width * 0.3, e.y + e.height * 0.24, e.width * 0.07, e.height * 0.07);
      ctx.fillRect(e.x + e.width * 0.65, e.y + e.height * 0.24, e.width * 0.07, e.height * 0.07);
      const hpRatio = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = '#333333';
      ctx.fillRect(e.x, e.y - 10, e.width, 6);
      ctx.fillStyle = e.isBoss ? '#e94560' : '#2ecc71';
      ctx.fillRect(e.x, e.y - 10, e.width * hpRatio, 6);
    };

    const drawGround = () => {
      ctx.fillStyle = '#2d1b4e';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#3d2b5e';
      for (let gy = GROUND_Y; gy < CANVAS_H; gy += 20) {
        for (let gx = 0; gx < CANVAS_W; gx += 40) {
          const off = (gy / 20) % 2 === 0 ? 0 : 20;
          ctx.fillRect(gx + off, gy, 38, 18);
        }
      }
      ctx.fillStyle = '#5d4b7e';
      ctx.fillRect(0, GROUND_Y - 4, CANVAS_W, 4);
    };

    const drawHUD = () => {
      const s = stateRef.current;
      ctx.fillStyle = '#000000aa';
      ctx.fillRect(0, 0, CANVAS_W, 70);

      ctx.fillStyle = '#333333';
      ctx.fillRect(20, 18, 220, 18);
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(20, 18, 220 * Math.max(0, battle.playerHP / battle.playerMaxHP), 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "Press Start 2P", monospace';
      ctx.fillText(`HP ${Math.max(0, battle.playerHP)}/${battle.playerMaxHP}`, 28, 32);

      ctx.fillStyle = '#333333';
      ctx.fillRect(20, 44, 220, 14);
      ctx.fillStyle = '#3498db';
      ctx.fillRect(20, 44, 220 * Math.max(0, battle.playerEnergy / battle.playerMaxEnergy), 14);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px "Press Start 2P", monospace';
      ctx.fillText(`EP ${Math.floor(battle.playerEnergy)}/${battle.playerMaxEnergy}`, 28, 55);

      ctx.font = '28px sans-serif';
      ctx.fillText(WEAPON_EMOJI[stateRef.current.character.weapon] || '⚔️', 280, 42);

      const cdRatio = Math.max(0, Math.min(1, s.skillCooldown / SKILL_COOLDOWN));
      ctx.save();
      ctx.translate(340, 35);
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fillStyle = '#333333';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - cdRatio));
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fillStyle = cdRatio > 0 ? '#888888' : '#e94560';
      ctx.fill();
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(SKILL_EMOJI[stateRef.current.character.skill] || '✨', 0, 1);
      ctx.restore();

      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 14px "Press Start 2P", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`分数 ${battle.score}`, CANVAS_W - 20, 30);
      ctx.fillStyle = '#feca57';
      ctx.fillText(`进度 ${battle.progressOrbs}/${PROGRESS_ORBS_FOR_BOSS}`, CANVAS_W - 20, 55);
      ctx.textAlign = 'left';
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const s = stateRef.current;

      if (!s.gameEnded) {
        s.elapsed += dt;
        s.fadeInT = Math.min(1, s.fadeInT + dt / 0.5);
        s.attackCooldown = Math.max(0, s.attackCooldown - dt);
        s.skillCooldown = Math.max(0, s.skillCooldown - dt);
        s.hurtFlash = Math.max(0, s.hurtFlash - dt / 0.8);
        s.screenFlash = Math.max(0, s.screenFlash - dt / 0.5);

        if (battle.playerEnergy < battle.playerMaxEnergy) {
          const newEp = Math.min(battle.playerMaxEnergy, battle.playerEnergy + 2 * dt);
          updateBattle({ playerEnergy: newEp });
        }

        const p = s.player;
        p.vx = 0;
        if (s.keys['a'] || s.keys['arrowleft']) { p.vx = -PLAYER_MOVE_SPEED; p.facingRight = false; }
        if (s.keys['d'] || s.keys['arrowright']) { p.vx = PLAYER_MOVE_SPEED; p.facingRight = true; }
        if ((s.keys['w'] || s.keys['arrowup'] || s.keys[' ']) && p.onGround) {
          p.vy = -PLAYER_JUMP_POWER;
          p.onGround = false;
        }

        p.vy += GRAVITY;
        p.x += p.vx;
        p.y += p.vy;
        if (p.y + PLAYER_H >= GROUND_Y) {
          p.y = GROUND_Y - PLAYER_H;
          p.vy = 0;
          p.onGround = true;
        }
        p.x = Math.max(0, Math.min(CANVAS_W - PLAYER_W, p.x));

        if ((s.keys['j']) && s.attackCooldown <= 0) {
          s.attackCooldown = 0.3;
          const weapX = p.x + PLAYER_W / 2 + (p.facingRight ? 20 : -20);
          const weapY = p.y + PLAYER_H / 2;
          s.bulletSystem.createPlayerBullet(stateRef.current.character.weapon, weapX, weapY, p.facingRight);
        }

        if (s.keys['k'] && s.skillCooldown <= 0 && battle.playerEnergy >= 20) {
          s.skillCooldown = SKILL_COOLDOWN;
          updateBattle({ playerEnergy: battle.playerEnergy - 20 });
          const skill = stateRef.current.character.skill;
          if (skill === 'blink') {
            const dir = p.facingRight ? 1 : -1;
            p.x = Math.max(0, Math.min(CANVAS_W - PLAYER_W, p.x + dir * 150));
          }
          s.bulletSystem.createSkillEffect(skill, p.x + PLAYER_W / 2, p.y + PLAYER_H / 2, s.enemies);
        }

        if (!s.bossSpawned && battle.progressOrbs >= PROGRESS_ORBS_FOR_BOSS) {
          s.bossSpawned = true;
          s.enemies = s.enemies.filter(e => e.isBoss);
          spawnEnemy(true);
          addFloatingText(CANVAS_W / 2, 150, 'BOSS出现！', '#e94560');
        }

        if (!s.bossSpawned && s.elapsed - s.lastSpawn >= ENEMY_SPAWN_INTERVAL && s.enemies.length < MAX_ENEMIES) {
          s.lastSpawn = s.elapsed;
          spawnEnemy(false);
        }

        for (let i = s.enemies.length - 1; i >= 0; i--) {
          const e = s.enemies[i];
          e.flashTimer = Math.max(0, e.flashTimer - dt / 0.1);

          const dx = p.x + PLAYER_W / 2 - (e.x + e.width / 2);
          const dist = Math.abs(dx);

          if (dist > (e.width + PLAYER_W) / 2 - 5) {
            const dir = dx > 0 ? 1 : -1;
            e.x += dir * e.speed;
          } else {
            if (s.elapsed - e.lastAttackTime >= 2) {
              e.lastAttackTime = s.elapsed;
              const dmg = e.attack;
              updateBattle({ playerHP: Math.max(0, battle.playerHP - dmg) });
              s.hurtFlash = 1;
              s.screenFlash = 1;
              const knockDir = dx > 0 ? -1 : 1;
              p.x = Math.max(0, Math.min(CANVAS_W - PLAYER_W, p.x + knockDir * 30));
              addFloatingText(p.x + PLAYER_W / 2, p.y, `-${dmg}`, '#e94560');
            }
          }

          if (e.isBoss && s.elapsed - e.lastAttackTime >= 2.5) {
            e.lastAttackTime = s.elapsed;
            for (let a = 0; a < 5; a++) {
              const angle = Math.PI + (a - 2) * 0.25;
              s.bulletSystem.createEnemyBullet(e.x + e.width / 2, e.y + e.height / 2, Math.cos(angle) * 3, Math.sin(angle) * 3, 8);
            }
          }

          if (e.hp <= 0) {
            s.orbs.push({ id: s.orbIdCounter++, x: e.x + e.width / 2, y: e.y + e.height / 2, remaining: 2 });
            const gain = e.isBoss ? 100 : 10;
            updateBattle({ score: battle.score + gain });
            addFloatingText(e.x + e.width / 2, e.y, `+${gain}`, '#ffcc00');
            if (e.isBoss) {
              s.bossDefeated = true;
            }
            s.enemies.splice(i, 1);
          }
        }

        for (let i = s.orbs.length - 1; i >= 0; i--) {
          const o = s.orbs[i];
          o.remaining -= dt;
          const ox = o.x, oy = o.y;
          const cx = p.x + PLAYER_W / 2, cy = p.y + PLAYER_H / 2;
          const ddx = ox - cx, ddy = oy - cy;
          if (ddx * ddx + ddy * ddy <= 30 * 30) {
            updateBattle({ progressOrbs: battle.progressOrbs + 1 });
            s.orbs.splice(i, 1);
            continue;
          }
          if (o.remaining <= 0) s.orbs.splice(i, 1);
        }

        for (let i = s.floats.length - 1; i >= 0; i--) {
          const f = s.floats[i];
          f.y += f.vy;
          f.opacity -= dt * 1.2;
          if (f.opacity <= 0) s.floats.splice(i, 1);
        }

        const result = s.bulletSystem.update(dt, s.enemies, p.x, p.y, PLAYER_W, PLAYER_H);
        for (const h of result.hits) {
          const e = s.enemies.find((en) => en.id === h.enemyId);
          if (e) {
            e.hp -= h.damage;
            e.flashTimer = 1;
          }
        }
        for (const ph of result.playerHits) {
          updateBattle({ playerHP: Math.max(0, battle.playerHP - ph.damage) });
          s.hurtFlash = 1;
          s.screenFlash = 1;
          addFloatingText(p.x + PLAYER_W / 2, p.y, `-${ph.damage}`, '#e94560');
        }
        for (const hl of result.heals) {
          updateBattle({ playerHP: Math.min(battle.playerMaxHP, battle.playerHP + hl.amount) });
          addFloatingText(p.x + PLAYER_W / 2, p.y, `+${hl.amount}`, '#2ecc71');
        }

        if (battle.playerHP <= 0 && !s.gameEnded) {
          s.gameEnded = true;
          s.playerDied = true;
          setTimeout(() => setGamePhase('defeat'), 800);
        }
        if (s.bossDefeated && !s.gameEnded) {
          s.gameEnded = true;
          setTimeout(() => setGamePhase('victory'), 800);
        }

        updateBattle({ skillCooldown: s.skillCooldown, playerX: p.x, playerY: p.y });
      }

      drawGround();

      for (const e of s.enemies) drawEnemy(e);
      drawPixelChar(s.player.x, s.player.y, stateRef.current.character, 1, s.hurtFlash > 0);
      for (const o of s.orbs) {
        const alpha = Math.min(1, o.remaining / 2);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(o.x, o.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      s.bulletSystem.render(ctx);

      for (const f of s.floats) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, f.opacity);
        ctx.fillStyle = f.color;
        ctx.font = 'bold 20px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(f.text, f.x, f.y);
        ctx.restore();
      }

      drawHUD();

      if (s.screenFlash > 0) {
        ctx.save();
        ctx.globalAlpha = s.screenFlash * 0.5;
        const grd = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, 100, CANVAS_W / 2, CANVAS_H / 2, CANVAS_W / 2);
        grd.addColorStop(0, 'rgba(233,69,96,0)');
        grd.addColorStop(1, 'rgba(233,69,96,1)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.restore();
      }

      if (s.fadeInT < 1) {
        ctx.fillStyle = `rgba(0,0,0,${1 - s.fadeInT})`;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }

      forceRerender((x) => (x + 1) % 1000000);
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [gamePhase, battle.playerHP, battle.playerEnergy, battle.playerMaxHP, battle.playerMaxEnergy, battle.score, battle.progressOrbs, battle.skillCooldown, updateBattle, setGamePhase]);

  const handleBack = () => resetBattle();
  const handleReplay = () => {
    resetBattle();
    setTimeout(() => setGamePhase('battle'), 50);
  };

  return (
    <div className="battle-root">
      <div className="battle-stage">
        <canvas ref={canvasRef} className="battle-canvas" />

        {gamePhase === 'victory' && (
          <div className="result-overlay victory-overlay">
            <div className="result-bg-glow" />
            <div className="result-content victory-content">
              <h1 className="result-title victory-title">胜利！</h1>
              <div className="result-score">最终得分：{battle.score}</div>
              <div className="result-buttons">
                <button className="result-btn" onClick={handleBack}>返回编辑</button>
                <button className="result-btn result-btn-primary" onClick={handleReplay}>再战一局</button>
              </div>
            </div>
          </div>
        )}

        {gamePhase === 'defeat' && (
          <div className="result-overlay defeat-overlay">
            <div className="result-content defeat-content">
              <h1 className="result-title defeat-title">失败</h1>
              <div className="result-score">最终得分：{battle.score}</div>
              <div className="result-buttons">
                <button className="result-btn" onClick={handleBack}>返回编辑</button>
                <button className="result-btn result-btn-primary" onClick={handleReplay}>再战一局</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="battle-hint">
        A/D 左右移动 · W 跳跃 · J 攻击 · K 技能
      </div>
    </div>
  );
}
