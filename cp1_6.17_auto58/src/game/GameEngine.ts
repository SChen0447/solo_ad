import { AIManager } from './AIManager';
import {
  AI_STATE,
  TILE,
  type AIAgent,
  type AudioSource,
  type Door,
  type GameState,
  type InputState,
  type MapData,
  type Player,
} from '../types';

const PLAYER_SPEED = 1.0;
const PLAYER_RADIUS = 0.3;
const VISION_RADIUS = 15;
const ALERT_PULSE_FREQ = 2;

export class GameEngine {
  state: GameState;
  private aiManager: AIManager;
  private lastAIUpdate = 0;
  private aiUpdateInterval = 100;
  private audioCallback: ((src: AudioSource) => void) | null = null;
  private onAlertChange: ((active: boolean) => void) | null = null;

  constructor() {
    this.aiManager = new AIManager();
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      map: null,
      player: this.createPlayer(0, 0),
      ais: [],
      explored: [],
      lastKnownAIPositions: new Map(),
      audioSources: [],
      isAlertActive: false,
      alertPulse: 0,
      nearestDoor: null,
      gameTime: 0,
      running: false,
    };
  }

  private createPlayer(x: number, y: number): Player {
    return {
      x,
      y,
      prevX: x,
      prevY: y,
      health: 100,
      stamina: 100,
      exposure: 0,
      facing: 0,
      velocity: { x: 0, y: 0 },
    };
  }

  setAudioCallback(cb: (src: AudioSource) => void) {
    this.audioCallback = cb;
  }

  setAlertCallback(cb: (active: boolean) => void) {
    this.onAlertChange = cb;
  }

  async init(): Promise<void> {
    const mapData = await AIManager.generateMap();
    this.state.map = {
      ...mapData,
      doors: mapData.doors.map(d => ({ ...d, animProgress: d.open ? 1 : 0 })),
    };
    this.state.explored = Array.from({ length: mapData.size }, () =>
      Array(mapData.size).fill(false)
    );
    if (mapData.start) {
      this.state.player = this.createPlayer(mapData.start.x, mapData.start.y);
    }
    this.state.running = true;
    this.updateExplored();
  }

  update(dt: number, input: InputState): void {
    if (!this.state.running || !this.state.map) return;

    this.state.gameTime += dt;

    this.updatePlayer(dt, input);
    this.updateDoors(dt, input);
    this.updateAI(dt);
    this.updateAlert(dt);
    this.updateExplored();
    this.updateNearestDoor();
    this.updateExposure();
  }

  private updatePlayer(dt: number, input: InputState): void {
    const p = this.state.player;
    p.prevX = p.x;
    p.prevY = p.y;

    let dx = 0;
    let dy = 0;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;

    const len = Math.hypot(dx, dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
      p.facing = Math.atan2(dy, dx);
    }

    p.velocity.x = dx * PLAYER_SPEED;
    p.velocity.y = dy * PLAYER_SPEED;

    this.movePlayerWithCollision(dx * PLAYER_SPEED * dt, dy * PLAYER_SPEED * dt);
  }

  private movePlayerWithCollision(mvx: number, mvy: number): void {
    const map = this.state.map!;
    const p = this.state.player;

    const newX = p.x + mvx;
    if (this.canPlayerBeAt(newX, p.y, map)) {
      p.x = newX;
    }

    const newY = p.y + mvy;
    if (this.canPlayerBeAt(p.x, newY, map)) {
      p.y = newY;
    }
  }

  private canPlayerBeAt(x: number, y: number, map: MapData): boolean {
    const minX = Math.floor(x - PLAYER_RADIUS);
    const maxX = Math.floor(x + PLAYER_RADIUS);
    const minY = Math.floor(y - PLAYER_RADIUS);
    const maxY = Math.floor(y + PLAYER_RADIUS);

    for (let ty = minY; ty <= maxY; ty++) {
      for (let tx = minX; tx <= maxX; tx++) {
        if (tx < 0 || ty < 0 || tx >= map.size || ty >= map.size) return false;
        const tile = map.grid[ty][tx];
        if (tile === TILE.WALL) return false;
        if (tile === TILE.DOOR) {
          const door = map.doors.find(d => d.x === tx && d.y === ty);
          if (door && !door.open) return false;
        }
        const dx = x - (tx + 0.5);
        const dy = y - (ty + 0.5);
        if (tile === TILE.WALL && dx * dx + dy * dy < PLAYER_RADIUS * PLAYER_RADIUS) {
          return false;
        }
      }
    }
    return true;
  }

  private updateDoors(dt: number, input: InputState): void {
    const map = this.state.map!;
    for (const door of map.doors) {
      const target = door.open ? 1 : 0;
      const speed = 1 / 0.3;
      if (door.animProgress < target) {
        door.animProgress = Math.min(target, door.animProgress + speed * dt);
      } else if (door.animProgress > target) {
        door.animProgress = Math.max(target, door.animProgress - speed * dt);
      }
    }

    if (input.interact && this.state.nearestDoor) {
      const door = this.state.nearestDoor;
      door.open = !door.open;
      AIManager.updateDoor(door).catch(console.error);
      if (this.audioCallback) {
        this.audioCallback({
          id: `door_${door.x}_${door.y}`,
          type: 'door',
          x: door.x,
          y: door.y,
          volume: 1,
          timestamp: performance.now(),
        });
      }
      input.interact = false;
    }
  }

  private updateNearestDoor(): void {
    const map = this.state.map!;
    const p = this.state.player;
    let nearest: Door | null = null;
    let nearestDist = Infinity;

    for (const door of map.doors) {
      const dist = Math.hypot(door.x + 0.5 - p.x, door.y + 0.5 - p.y);
      if (dist < 1.5 && dist < nearestDist) {
        nearest = door;
        nearestDist = dist;
      }
    }
    this.state.nearestDoor = nearest;
  }

  private async updateAI(dt: number): Promise<void> {
    const now = performance.now();
    if (now - this.lastAIUpdate > this.aiUpdateInterval) {
      this.lastAIUpdate = now;
      try {
        const result = await AIManager.updateServer(
          { x: this.state.player.x, y: this.state.player.y },
          this.state.map!.doors,
          dt
        );
        this.aiManager.updateFromServer(result.ais);
        this.state.ais = this.aiManager.getAgents();
        this.aiManager.processEvents(result.events, ev => {
          if (this.audioCallback && ev.type === 'footstep') {
            const floorType = this.state.map?.floorType[Math.floor(ev.y)]?.[Math.floor(ev.x)] ?? 0;
            this.audioCallback({
              id: `footstep_${ev.aiId}_${ev.timestamp || now}`,
              type: 'footstep',
              x: ev.x,
              y: ev.y,
              floorType,
              state: ev.state,
              volume: 1,
              timestamp: now,
            });
          }
        });

        for (const ai of this.state.ais) {
          this.state.lastKnownAIPositions.set(ai.id, { x: ai.x, y: ai.y });
          if (ai.showAlert > 0) {
            ai.showAlert = Math.max(0, ai.showAlert - dt);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  }

  private updateAlert(dt: number): void {
    const anyAlert = this.state.ais.some(
      a => a.state === AI_STATE.CHASE || a.state === AI_STATE.ALERT
    );
    if (anyAlert !== this.state.isAlertActive) {
      this.state.isAlertActive = anyAlert;
      this.onAlertChange?.(anyAlert);
    }
    if (this.state.isAlertActive) {
      this.state.alertPulse += dt * ALERT_PULSE_FREQ * Math.PI * 2;
    }
  }

  private updateExplored(): void {
    if (!this.state.map) return;
    const p = this.state.player;
    const cx = Math.floor(p.x);
    const cy = Math.floor(p.y);
    const r = VISION_RADIUS;

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r) {
          const x = cx + dx;
          const y = cy + dy;
          if (x >= 0 && y >= 0 && x < this.state.map.size && y < this.state.map.size) {
            if (this.hasLineOfSight(cx, cy, x, y)) {
              this.state.explored[y][x] = true;
            }
          }
        }
      }
    }
  }

  private hasLineOfSight(x0: number, y0: number, x1: number, y1: number): boolean {
    const map = this.state.map!;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0;
    let y = y0;

    while (true) {
      if (x !== x0 || y !== y0) {
        const tile = map.grid[y]?.[x];
        if (tile === TILE.WALL) return false;
        if (tile === TILE.DOOR) {
          const door = map.doors.find(d => d.x === x && d.y === y);
          if (door && !door.open) return false;
        }
      }
      if (x === x1 && y === y1) return true;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  private updateExposure(): void {
    let total = 0;
    for (const ai of this.state.ais) {
      if (ai.state === AI_STATE.CHASE) {
        const dist = Math.hypot(ai.x - this.state.player.x, ai.y - this.state.player.y);
        total += Math.max(0, 100 - dist * 10);
      }
    }
    this.state.player.exposure = Math.min(100, total);
  }

  getAIAgents(): AIAgent[] {
    return this.state.ais;
  }
}
