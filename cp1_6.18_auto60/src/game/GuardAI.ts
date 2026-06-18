import {
  Guard,
  Vec2,
  GUARD_PATROL_SPEED,
  GUARD_CHASE_SPEED,
  GUARD_SIGHT_RADIUS,
  GUARD_SIGHT_ANGLE,
  GUARD_CHASE_TIMEOUT,
  GUARD_CATCH_TIMEOUT,
  GUARD_SIZE,
  CELL_SIZE,
  PLAYER_RADIUS,
} from './types';
import { WorldModel } from './WorldModel';

export class GuardAI {
  private world: WorldModel;
  private onGuardAlert: ((guard: Guard) => void) | null = null;
  private onGuardCaught: ((guard: Guard) => void) | null = null;
  private patrolStepCounter: number[] = [];

  constructor(world: WorldModel) {
    this.world = world;
    this.patrolStepCounter = world.getGuards().map(() => 0);
  }

  public setCallbacks(
    onGuardAlert: (guard: Guard) => void,
    onGuardCaught: (guard: Guard) => void,
  ): void {
    this.onGuardAlert = onGuardAlert;
    this.onGuardCaught = onGuardCaught;
  }

  public update(delta: number): void {
    const guards = this.world.getGuards();
    const playerPos = this.world.getPlayerPosition();
    const playerInvisible = this.world.isPlayerInvisible();

    for (let i = 0; i < guards.length; i++) {
      const guard = guards[i];
      guard.lastPositions.unshift({ ...guard.position });
      if (guard.lastPositions.length > 6) {
        guard.lastPositions.pop();
      }

      const canSeePlayer = !playerInvisible && this.canSeePlayer(guard, playerPos);

      switch (guard.state) {
        case 'PATROL':
          if (canSeePlayer) {
            guard.state = 'ALERT';
            guard.alertTimer = 1.0;
            guard.blinkCount = 0;
            if (this.onGuardAlert) this.onGuardAlert(guard);
          } else {
            this.updatePatrol(guard, delta, i);
          }
          break;

        case 'ALERT':
          guard.alertTimer -= delta;
          if (Math.floor(guard.alertTimer * 6) % 2 === 0) {
            guard.blinkCount = 1;
          } else {
            guard.blinkCount = 2;
          }
          const angleToPlayer = Math.atan2(
            playerPos.y - guard.position.y,
            playerPos.x - guard.position.x,
          );
          guard.angle = this.lerpAngle(guard.angle, angleToPlayer, delta * 5);

          if (guard.alertTimer <= 0) {
            guard.state = 'CHASE';
            guard.chaseTimer = GUARD_CHASE_TIMEOUT;
            guard.catchTimer = GUARD_CATCH_TIMEOUT;
          } else if (!canSeePlayer) {
            guard.state = 'PATROL';
            guard.alertTimer = 0;
          }
          break;

        case 'CHASE':
          guard.chaseTimer -= delta;
          guard.blinkCount = 0;
          if (canSeePlayer) {
            guard.catchTimer = GUARD_CATCH_TIMEOUT;
            const angleToPlayerChase = Math.atan2(
              playerPos.y - guard.position.y,
              playerPos.x - guard.position.x,
            );
            guard.angle = this.lerpAngle(guard.angle, angleToPlayerChase, delta * 4);
            this.updateChase(guard, delta, playerPos);

            if (this.checkPlayerCollision(guard, playerPos)) {
              if (this.onGuardCaught) this.onGuardCaught(guard);
            }
          } else {
            guard.catchTimer -= delta;
            if (guard.catchTimer <= 0) {
              if (this.onGuardCaught) this.onGuardCaught(guard);
            }
            this.updateChase(guard, delta, playerPos);
          }

          if (guard.chaseTimer <= 0) {
            guard.state = 'PATROL';
            guard.chaseTimer = 0;
            guard.catchTimer = 0;
          }
          break;
      }
    }
  }

  private canSeePlayer(guard: Guard, playerPos: Vec2): boolean {
    const dx = playerPos.x - guard.position.x;
    const dy = playerPos.y - guard.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > GUARD_SIGHT_RADIUS) return false;

    const angleToPlayer = Math.atan2(dy, dx);
    let angleDiff = angleToPlayer - guard.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    if (Math.abs(angleDiff) > GUARD_SIGHT_ANGLE / 2) return false;

    const steps = Math.ceil(dist / (CELL_SIZE / 3));
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const cx = guard.position.x + dx * t;
      const cy = guard.position.y + dy * t;
      if (this.world.isWall(cx, cy)) {
        return false;
      }
    }

    return true;
  }

  private updatePatrol(guard: Guard, delta: number, guardIndex: number): void {
    const path = guard.path;
    if (path.points.length < 2) return;

    const currentTarget = path.points[path.currentIndex];
    const nextIdx = (path.currentIndex + 1) % path.points.length;
    const nextTarget = path.points[nextIdx];

    const offsetAngle = path.offset * 0.3;
    const perpX = -Math.sin(guard.angle);
    const perpY = Math.cos(guard.angle);

    const targetX = nextTarget.x + perpX * path.offset * CELL_SIZE * 0.3;
    const targetY = nextTarget.y + perpY * path.offset * CELL_SIZE * 0.3;

    const dx = targetX - guard.position.x;
    const dy = targetY - guard.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 5) {
      path.currentIndex = nextIdx;
      this.patrolStepCounter[guardIndex]++;
      if (this.patrolStepCounter[guardIndex] >= 5) {
        this.patrolStepCounter[guardIndex] = 0;
        path.offset = (Math.random() * 4 - 2);
      }
    } else {
      const moveX = (dx / dist) * GUARD_PATROL_SPEED * delta;
      const moveY = (dy / dist) * GUARD_PATROL_SPEED * delta;

      let newX = guard.position.x + moveX;
      let newY = guard.position.y + moveY;

      if (!this.isGuardCollision(newX, guard.position.y)) {
        guard.position.x = newX;
      }
      if (!this.isGuardCollision(guard.position.x, newY)) {
        guard.position.y = newY;
      }

      const targetAngle = Math.atan2(dy, dx);
      guard.angle = this.lerpAngle(guard.angle, targetAngle, delta * 3);
    }
  }

  private updateChase(guard: Guard, delta: number, target: Vec2): void {
    const dx = target.x - guard.position.x;
    const dy = target.y - guard.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2) return;

    const moveX = (dx / dist) * GUARD_CHASE_SPEED * delta;
    const moveY = (dy / dist) * GUARD_CHASE_SPEED * delta;

    let newX = guard.position.x + moveX;
    let newY = guard.position.y + moveY;

    if (!this.isGuardCollision(newX, guard.position.y)) {
      guard.position.x = newX;
    }
    if (!this.isGuardCollision(guard.position.x, newY)) {
      guard.position.y = newY;
    }
  }

  private isGuardCollision(x: number, y: number): boolean {
    const r = GUARD_SIZE * 0.4;
    const points = [
      { x: x - r, y },
      { x: x + r, y },
      { x, y: y - r },
      { x, y: y + r },
    ];
    for (const p of points) {
      if (this.world.isWall(p.x, p.y)) return true;
    }
    return false;
  }

  private checkPlayerCollision(guard: Guard, playerPos: Vec2): boolean {
    const dx = guard.position.x - playerPos.x;
    const dy = guard.position.y - playerPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < GUARD_SIZE * 0.5 + PLAYER_RADIUS;
  }

  private lerpAngle(a: number, b: number, t: number): number {
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }

  public getSightRadius(): number {
    return GUARD_SIGHT_RADIUS;
  }

  public getSightAngle(): number {
    return GUARD_SIGHT_ANGLE;
  }
}
