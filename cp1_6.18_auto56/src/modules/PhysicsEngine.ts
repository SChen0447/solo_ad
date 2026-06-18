import {
  type PlayerState,
  type PlacedComponent,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GRID_SIZE,
  getComponentDef,
} from './ComponentRegistry';

const GRAVITY = 0.5;
const FRICTION = 0.85;
const MOVE_SPEED = 3;
const JUMP_FORCE = -8;
const GROUND_Y = CANVAS_HEIGHT - 40;
const PLAYER_RADIUS = 8;

export interface PhysicsResult {
  player: PlayerState;
  activatedComponents: string[];
  edgeFlash: { color: string; alpha: number } | null;
}

export class Engine {
  private gravity: number = GRAVITY;
  private friction: number = FRICTION;
  private moveSpeed: number = MOVE_SPEED;
  private jumpForce: number = JUMP_FORCE;

  constructor(config?: { gravity?: number; friction?: number; moveSpeed?: number; jumpForce?: number }) {
    if (config?.gravity !== undefined) this.gravity = config.gravity;
    if (config?.friction !== undefined) this.friction = config.friction;
    if (config?.moveSpeed !== undefined) this.moveSpeed = config.moveSpeed;
    if (config?.jumpForce !== undefined) this.jumpForce = config.jumpForce;
  }

  createInitialPlayer(): PlayerState {
    return {
      x: CANVAS_WIDTH / 2,
      y: GROUND_Y - PLAYER_RADIUS,
      vx: 0,
      vy: 0,
      width: PLAYER_RADIUS * 2,
      height: PLAYER_RADIUS * 2,
      onGround: false,
      gravityReversed: false,
      scaleX: 1,
      scaleY: 1,
    };
  }

  update(
    player: PlayerState,
    keys: Set<string>,
    components: PlacedComponent[],
    dt: number
  ): PhysicsResult {
    let p = { ...player };
    const activatedComponents: string[] = [];
    let edgeFlash: { color: string; alpha: number } | null = null;

    if (keys.has('a') || keys.has('arrowleft')) {
      p.vx -= this.moveSpeed * 0.3;
    }
    if (keys.has('d') || keys.has('arrowright')) {
      p.vx += this.moveSpeed * 0.3;
    }
    if ((keys.has('w') || keys.has('arrowup')) && p.onGround) {
      p.vy = p.gravityReversed ? Math.abs(this.jumpForce) : this.jumpForce;
      p.onGround = false;
      p.scaleX = 0.7;
      p.scaleY = 1.3;
    }

    const gravityDir = p.gravityReversed ? -1 : 1;
    p.vy += this.gravity * gravityDir;

    p.vx *= this.friction;
    p.vx = Math.max(-8, Math.min(8, p.vx));

    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;

    const halfW = p.width / 2;
    const halfH = p.height / 2;

    if (p.x - halfW < 0) {
      p.x = halfW;
      p.vx = 0;
    }
    if (p.x + halfW > CANVAS_WIDTH) {
      p.x = CANVAS_WIDTH - halfW;
      p.vx = 0;
    }

    if (!p.gravityReversed) {
      if (p.y + halfH >= GROUND_Y) {
        p.y = GROUND_Y - halfH;
        p.vy = 0;
        p.onGround = true;
      } else {
        p.onGround = false;
      }
      if (p.y - halfH < 0) {
        p.y = halfH;
        p.vy = 0;
      }
    } else {
      if (p.y - halfH <= 0) {
        p.y = halfH;
        p.vy = 0;
        p.onGround = true;
      } else {
        p.onGround = false;
      }
      if (p.y + halfH > CANVAS_HEIGHT) {
        p.y = CANVAS_HEIGHT - halfH;
        p.vy = 0;
      }
    }

    for (const comp of components) {
      const def = getComponentDef(comp.type);
      if (!def) continue;

      const compLeft = comp.gridX * GRID_SIZE;
      const compTop = comp.gridY * GRID_SIZE;
      const compRight = compLeft + GRID_SIZE;
      const compBottom = compTop + GRID_SIZE;

      const pLeft = p.x - halfW;
      const pTop = p.y - halfH;
      const pRight = p.x + halfW;
      const pBottom = p.y + halfH;

      const overlaps = pRight > compLeft && pLeft < compRight && pBottom > compTop && pTop < compBottom;

      if (overlaps) {
        if (keys.has(' ') || comp.type === 'bounce') {
          p = def.activate(p, comp.params, comp.gridX, comp.gridY);
          activatedComponents.push(comp.id);
          edgeFlash = { color: def.color, alpha: 0.6 };
        }
      }
    }

    p.scaleX += (1 - p.scaleX) * 0.15;
    p.scaleY += (1 - p.scaleY) * 0.15;
    if (Math.abs(p.scaleX - 1) < 0.01) p.scaleX = 1;
    if (Math.abs(p.scaleY - 1) < 0.01) p.scaleY = 1;

    return { player: p, activatedComponents, edgeFlash };
  }
}
