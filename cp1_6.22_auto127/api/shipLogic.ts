import { v4 as uuidv4 } from 'uuid';
import type { BattleShip, ShipType, Team, Projectile, BattleEvent } from '../../shared/types';
import { SHIP_TEMPLATES, CANVAS_WIDTH, CANVAS_HEIGHT, PROJECTILE_SPEED, BATTLE_DURATION } from '../../shared/types';

const DT = 1 / 60;
const MARGIN = 80;

export function createBattleShips(
  redShips: ShipType[],
  blueShips: ShipType[],
): BattleShip[] {
  const ships: BattleShip[] = [];
  const centerY = CANVAS_HEIGHT / 2;
  const spacing = Math.min(60, (CANVAS_HEIGHT - 2 * MARGIN) / Math.max(redShips.length, blueShips.length, 1));

  redShips.forEach((type, i) => {
    const t = SHIP_TEMPLATES.find((s) => s.type === type)!;
    const count = redShips.length;
    const offset = (count - 1) / 2;
    ships.push({
      id: uuidv4(),
      type,
      team: 'red',
      x: CANVAS_WIDTH - MARGIN - t.size,
      y: centerY + (i - offset) * spacing,
      hp: t.hp,
      maxHp: t.hp,
      attack: t.attack,
      defense: t.defense,
      speed: t.speed,
      range: t.range,
      cooldown: 0,
      maxCooldown: t.maxCooldown,
      targetId: null,
      state: 'idle',
      angle: Math.PI,
    });
  });

  blueShips.forEach((type, i) => {
    const t = SHIP_TEMPLATES.find((s) => s.type === type)!;
    const count = blueShips.length;
    const offset = (count - 1) / 2;
    ships.push({
      id: uuidv4(),
      type,
      team: 'blue',
      x: MARGIN + t.size,
      y: centerY + (i - offset) * spacing,
      hp: t.hp,
      maxHp: t.hp,
      attack: t.attack,
      defense: t.defense,
      speed: t.speed,
      range: t.range,
      cooldown: 0,
      maxCooldown: t.maxCooldown,
      targetId: null,
      state: 'idle',
      angle: 0,
    });
  });

  return ships;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function findNearestEnemy(ship: BattleShip, allShips: BattleShip[]): BattleShip | null {
  let nearest: BattleShip | null = null;
  let minDist = Infinity;
  for (const s of allShips) {
    if (s.team === ship.team || s.hp <= 0) continue;
    const d = dist(ship, s);
    if (d < minDist) {
      minDist = d;
      nearest = s;
    }
  }
  return nearest;
}

export function applyCommand(
  ships: BattleShip[],
  team: Team,
  command: { type: string; targetId?: string },
): void {
  for (const ship of ships) {
    if (ship.team !== team || ship.hp <= 0) continue;
    switch (command.type) {
      case 'advance':
        ship.state = 'moving';
        break;
      case 'retreat':
        ship.state = 'retreating';
        ship.targetId = null;
        break;
      case 'stop':
        ship.state = 'idle';
        ship.targetId = null;
        break;
      case 'focus':
        if (command.targetId) {
          ship.targetId = command.targetId;
          ship.state = 'moving';
        }
        break;
    }
  }
}

export function tickBattle(
  ships: BattleShip[],
  projectiles: Projectile[],
  elapsed: number,
): { ships: BattleShip[]; projectiles: Projectile[]; events: BattleEvent[] } {
  const events: BattleEvent[] = [];
  const aliveShips = ships.filter((s) => s.hp > 0);

  for (const ship of aliveShips) {
    ship.cooldown = Math.max(0, ship.cooldown - DT);

    let target: BattleShip | null = null;
    if (ship.targetId) {
      target = aliveShips.find((s) => s.id === ship.targetId && s.hp > 0) || null;
      if (!target) ship.targetId = null;
    }

    if (!target) {
      target = findNearestEnemy(ship, aliveShips);
    }

    if (!target) {
      ship.state = 'idle';
      continue;
    }

    const d = dist(ship, target);

    if (ship.state === 'retreating') {
      const baseX = ship.team === 'red' ? CANVAS_WIDTH - MARGIN : MARGIN;
      const dx = baseX - ship.x;
      const dy = 0;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 1) {
        ship.x += (dx / len) * ship.speed * DT;
        ship.angle = Math.atan2(dy, dx);
      }
    } else if (d > ship.range) {
      const dx = target.x - ship.x;
      const dy = target.y - ship.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        ship.x += (dx / len) * ship.speed * DT;
        ship.y += (dy / len) * ship.speed * DT;
        ship.angle = Math.atan2(dy, dx);
      }
      ship.state = 'moving';
    } else {
      ship.state = 'attacking';
      const dx = target.x - ship.x;
      const dy = target.y - ship.y;
      ship.angle = Math.atan2(dy, dx);

      if (ship.cooldown <= 0) {
        const dx2 = target.x - ship.x;
        const dy2 = target.y - ship.y;
        const len = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (len > 0) {
          projectiles.push({
            id: uuidv4(),
            x: ship.x,
            y: ship.y,
            vx: (dx2 / len) * PROJECTILE_SPEED,
            vy: (dy2 / len) * PROJECTILE_SPEED,
            damage: Math.max(1, ship.attack - target.defense * 0.3),
            team: ship.team,
            ttl: 2,
          });
        }
        ship.cooldown = ship.maxCooldown;
      }
    }
  }

  const newProjectiles: Projectile[] = [];
  for (const p of projectiles) {
    p.x += p.vx * DT;
    p.y += p.vy * DT;
    p.ttl -= DT;

    if (p.ttl <= 0 || p.x < -50 || p.x > CANVAS_WIDTH + 50 || p.y < -50 || p.y > CANVAS_HEIGHT + 50) {
      continue;
    }

    let hit = false;
    for (const ship of aliveShips) {
      if (ship.team === p.team) continue;
      const d = dist(p, ship);
      const hitRadius = SHIP_TEMPLATES.find((t) => t.type === ship.type)?.size || 15;
      if (d < hitRadius + 4) {
        ship.hp -= p.damage;
        events.push({ type: 'hit', shipId: ship.id, team: ship.team, x: ship.x, y: ship.y });
        if (ship.hp <= 0) {
          ship.hp = 0;
          events.push({ type: 'destroy', shipId: ship.id, team: ship.team, x: ship.x, y: ship.y });
        }
        hit = true;
        break;
      }
    }

    if (!hit) {
      newProjectiles.push(p);
    }
  }

  return { ships, projectiles: newProjectiles, events };
}

export function checkBattleEnd(ships: BattleShip[], elapsed: number): { ended: boolean; winner: Team | null } {
  const redAlive = ships.some((s) => s.team === 'red' && s.hp > 0);
  const blueAlive = ships.some((s) => s.team === 'blue' && s.hp > 0);

  if (!redAlive) return { ended: true, winner: 'blue' };
  if (!blueAlive) return { ended: true, winner: 'red' };

  if (elapsed >= BATTLE_DURATION) {
    const redHp = ships.filter((s) => s.team === 'red').reduce((s, sh) => s + Math.max(0, sh.hp), 0);
    const blueHp = ships.filter((s) => s.team === 'blue').reduce((s, sh) => s + Math.max(0, sh.hp), 0);
    if (redHp > blueHp) return { ended: true, winner: 'red' };
    if (blueHp > redHp) return { ended: true, winner: 'blue' };
    return { ended: true, winner: null };
  }

  return { ended: false, winner: null };
}
