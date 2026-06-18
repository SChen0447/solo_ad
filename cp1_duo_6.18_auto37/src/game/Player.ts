import { useGameStore } from '../state/gameStore';
import type { GameMap } from './Map';

const PLAYER_RADIUS = 8;
const NORMAL_SPEED = 3;
const SPRINT_SPEED = 6;
const STAMINA_MAX = 100;
const STAMINA_REGEN = 10;
const STAMINA_SPRINT_COST = 20;
const CRYSTAL_COLLECT_DIST = 20;
const PORTAL_DIST = 20;

export class Player {
  x: number;
  y: number;
  stamina: number;
  breathPhase: number = 0;
  glowRadius: number = 0;

  constructor(startX: number, startY: number) {
    this.x = startX;
    this.y = startY;
    this.stamina = STAMINA_MAX;
  }

  update(dt: number, keys: Set<string>, map: GameMap): void {
    if (useGameStore.getState().gameState !== 'playing') return;

    const store = useGameStore.getState();
    const sprinting =
      keys.has('shift') && this.stamina > 0;

    const speed = sprinting ? SPRINT_SPEED : NORMAL_SPEED;
    let dx = 0;
    let dy = 0;

    if (keys.has('w') || keys.has('arrowup')) dy -= speed;
    if (keys.has('s') || keys.has('arrowdown')) dy += speed;
    if (keys.has('a') || keys.has('arrowleft')) dx -= speed;
    if (keys.has('d') || keys.has('arrowright')) dx += speed;

    if (dx !== 0 && dy !== 0) {
      const factor = 1 / Math.sqrt(2);
      dx *= factor;
      dy *= factor;
    }

    const newX = this.x + dx;
    if (!map.isWallRect(newX, this.y, PLAYER_RADIUS)) {
      this.x = newX;
    }

    const newY = this.y + dy;
    if (!map.isWallRect(this.x, newY, PLAYER_RADIUS)) {
      this.y = newY;
    }

    if (sprinting && (dx !== 0 || dy !== 0)) {
      this.stamina = Math.max(0, this.stamina - STAMINA_SPRINT_COST * dt);
    } else {
      this.stamina = Math.min(
        STAMINA_MAX,
        this.stamina + STAMINA_REGEN * dt
      );
    }

    this.breathPhase += dt * 2;
    this.glowRadius = PLAYER_RADIUS + 4 + Math.sin(this.breathPhase) * 3;

    store.setPlayerPos(this.x, this.y);
    store.setStamina(this.stamina);

    for (const crystal of store.crystals) {
      if (crystal.collected) continue;
      const cdx = this.x - crystal.x;
      const cdy = this.y - crystal.y;
      const dist = Math.sqrt(cdx * cdx + cdy * cdy);
      if (dist < CRYSTAL_COLLECT_DIST) {
        store.collectCrystal(crystal.id);
        store.spawnParticles(crystal.x, crystal.y, 8);
      }
    }

    if (store.portalActive) {
      const pdx = this.x - store.portalX;
      const pdy = this.y - store.portalY;
      const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
      if (pDist < PORTAL_DIST) {
        const score = Math.floor(
          Math.max(0, 120 - store.elapsed) * 10 +
            store.crystals.filter((c) => c.collected).length * 100
        );
        store.setScore(score);
        store.setGameState('won');
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const sx = this.x - camX;
    const sy = this.y - camY;

    const gradient = ctx.createRadialGradient(
      sx,
      sy,
      PLAYER_RADIUS,
      sx,
      sy,
      this.glowRadius
    );
    gradient.addColorStop(0, 'rgba(224, 240, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(224, 240, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(sx, sy, this.glowRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e0f0ff';
    ctx.beginPath();
    ctx.arc(sx - 2, sy - 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}
