import { CollisionBody, CharacterState, PhysicsParams, Particle } from '../engine/GameStore';
import { resolveCircleVsBody, isLandingOnTop } from './CollisionResolver';

const CHARACTER_RADIUS = 15;
const MOVE_SPEED = 200;
const JUMP_SPEED = 400;
const BOUNCE_PAD_SPEED = 30;
const BOUNCE_COOLDOWN = 0.2;
const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 900;

export interface PhysicsUpdateResult {
  character: CharacterState;
  bodies: CollisionBody[];
  newParticles: Particle[];
}

function createBounceParticles(x: number, y: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < 30; i++) {
    const angle = (Math.PI * 2 * i) / 30 + (Math.random() - 0.5) * 0.5;
    const speed = 80 + Math.random() * 120;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.3,
      maxLife: 0.3,
    });
  }
  return particles;
}

function updateMovingPlatforms(bodies: CollisionBody[], dt: number): CollisionBody[] {
  return bodies.map((body) => {
    if (body.type !== 'movingPlatform') return body;

    const speed = body.platformSpeed * 60;
    const range = body.platformRange;

    let newX = body.x + speed * body.platformDirection * dt;
    const originX = body.platformOriginX;

    if (newX > originX + range) {
      newX = originX + range;
      return { ...body, x: newX, platformDirection: -1 as const };
    }
    if (newX < originX - range) {
      newX = originX - range;
      return { ...body, x: newX, platformDirection: 1 as const };
    }

    return { ...body, x: newX };
  });
}

function updateBounceCooldowns(bodies: CollisionBody[], dt: number): CollisionBody[] {
  return bodies.map((body) => {
    if (body.type !== 'bouncePad' || body.bounceCooldown <= 0) return body;
    return { ...body, bounceCooldown: Math.max(0, body.bounceCooldown - dt) };
  });
}

export function updatePhysics(
  character: CharacterState,
  bodies: CollisionBody[],
  physics: PhysicsParams,
  keys: Set<string>,
  dt: number
): PhysicsUpdateResult {
  const updatedBodies = updateBounceCooldowns(updateMovingPlatforms(bodies, dt), dt);
  const allParticles: Particle[] = [];

  let cx = character.x;
  let cy = character.y;
  let cvx = character.vx;
  let cvy = character.vy;
  let onGround = false;
  let canDoubleJump = character.canDoubleJump;
  let currentPlatformId: string | null = null;

  cvy += physics.gravity * dt;

  const moveLeft = keys.has('ArrowLeft') || keys.has('a');
  const moveRight = keys.has('ArrowRight') || keys.has('d');
  const jumpKey = keys.has(' ') || keys.has('ArrowUp') || keys.has('w');

  if (moveLeft) {
    cvx = -MOVE_SPEED;
  } else if (moveRight) {
    cvx = MOVE_SPEED;
  } else {
    if (onGround || character.onGround) {
      cvx *= (1 - physics.friction * 5 * dt);
    }
    if (Math.abs(cvx) < 1) cvx = 0;
  }

  cx += cvx * dt;
  cy += cvy * dt;

  for (let iteration = 0; iteration < 3; iteration++) {
    let hadCollision = false;

    for (const body of updatedBodies) {
      const result = resolveCircleVsBody(cx, cy, CHARACTER_RADIUS, body);
      if (!result.collided) continue;

      hadCollision = true;

      cx += result.normalX * result.depth;
      cy += result.normalY * result.depth;

      const velocityDotNormal = cvx * result.normalX + cvy * result.normalY;

      if (velocityDotNormal < 0) {
        if (body.type === 'bouncePad') {
          // do nothing here, handle below
        } else {
          cvx -= (1 + physics.bounce) * velocityDotNormal * result.normalX;
          cvy -= (1 + physics.bounce) * velocityDotNormal * result.normalY;

          if (Math.abs(result.normalX) > 0.7) {
            cvx *= 0.8;
          }
        }
      }

      if (isLandingOnTop(result.normalY, body.type)) {
        onGround = true;
        canDoubleJump = true;

        if (body.type === 'movingPlatform') {
          currentPlatformId = body.id;
          const platformVelX = body.platformSpeed * 60 * body.platformDirection;
          cx += platformVelX * dt;
        }

        cvy = Math.min(cvy, 0);
        if (cvy < 0 && body.type !== 'bouncePad') {
          cvy = 0;
        }

        cvx += -cvx * physics.friction * dt;
      }

      if (body.type === 'bouncePad' && result.normalY < -0.3 && body.bounceCooldown <= 0) {
        cvy = -BOUNCE_PAD_SPEED;
        onGround = false;
        const bodyIdx = updatedBodies.indexOf(body);
        updatedBodies[bodyIdx] = { ...body, bounceCooldown: BOUNCE_COOLDOWN };
        allParticles.push(...createBounceParticles(cx, cy + CHARACTER_RADIUS));
      }
    }

    if (!hadCollision) break;
  }

  if (!onGround) {
    currentPlatformId = null;
  }

  if (jumpKey) {
    if (onGround) {
      cvy = -JUMP_SPEED;
      onGround = false;
    } else if (canDoubleJump) {
      cvy = -JUMP_SPEED;
      canDoubleJump = false;
    }
  }

  if (cx < CHARACTER_RADIUS) {
    cx = CHARACTER_RADIUS;
    cvx = Math.max(0, cvx);
  }
  if (cx > CANVAS_WIDTH - CHARACTER_RADIUS) {
    cx = CANVAS_WIDTH - CHARACTER_RADIUS;
    cvx = Math.min(0, cvx);
  }
  if (cy < CHARACTER_RADIUS) {
    cy = CHARACTER_RADIUS;
    cvy = Math.max(0, cvy);
  }
  if (cy > CANVAS_HEIGHT - CHARACTER_RADIUS) {
    cy = CANVAS_HEIGHT - CHARACTER_RADIUS;
    cvy = 0;
    onGround = true;
    canDoubleJump = true;
  }

  return {
    character: {
      x: cx,
      y: cy,
      vx: cvx,
      vy: cvy,
      onGround,
      canDoubleJump,
      currentPlatformId,
    },
    bodies: updatedBodies,
    newParticles: allParticles,
  };
}

export function updateParticles(particles: Particle[], dt: number): Particle[] {
  return particles
    .map((p) => ({
      ...p,
      x: p.x + p.vx * dt,
      y: p.y + p.vy * dt,
      vy: p.vy + 200 * dt,
      life: p.life - dt,
    }))
    .filter((p) => p.life > 0);
}
