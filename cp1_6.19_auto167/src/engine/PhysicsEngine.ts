import type { Ball, ForceField, PhysicsData, TargetZone, Vector2 } from 'src/types';
import { calcNetForce } from './FieldCalculator';

export class PhysicsEngine {
  private ball: Ball;
  private fields: ForceField[];

  constructor() {
    this.ball = {
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      radius: 10,
      mass: 1,
    };
    this.fields = [];
  }

  setObjects(ball: Ball, fields: ForceField[]): void {
    this.ball = {
      ...ball,
      position: { ...ball.position },
      velocity: { ...ball.velocity },
    };
    this.fields = fields.map((f) => ({
      ...f,
      position: { ...f.position },
    }));
  }

  getBall(): Ball {
    return {
      ...this.ball,
      position: { ...this.ball.position },
      velocity: { ...this.ball.velocity },
    };
  }

  update(dt: number): { ball: Ball; data: PhysicsData } {
    const netForce = calcNetForce(this.ball, this.fields);
    const forceMagnitude = Math.sqrt(netForce.x * netForce.x + netForce.y * netForce.y);
    const ax = netForce.x / this.ball.mass;
    const ay = netForce.y / this.ball.mass;
    const acceleration = Math.sqrt(ax * ax + ay * ay);

    this.ball.velocity.x += ax * dt;
    this.ball.velocity.y += ay * dt;

    const maxSpeed = 800;
    const currentSpeed = Math.sqrt(
      this.ball.velocity.x ** 2 + this.ball.velocity.y ** 2
    );
    if (currentSpeed > maxSpeed) {
      const scale = maxSpeed / currentSpeed;
      this.ball.velocity.x *= scale;
      this.ball.velocity.y *= scale;
    }

    this.ball.position.x += this.ball.velocity.x * dt;
    this.ball.position.y += this.ball.velocity.y * dt;

    const velocity = Math.sqrt(
      this.ball.velocity.x ** 2 + this.ball.velocity.y ** 2
    );

    return {
      ball: this.getBall(),
      data: {
        velocity,
        acceleration,
        netForce,
        forceMagnitude,
      },
    };
  }

  isBallInTarget(ball: Ball, target: TargetZone): boolean {
    if (target.type === 'circle') {
      const radius = target.size.radius ?? 30;
      const dx = ball.position.x - target.position.x;
      const dy = ball.position.y - target.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist + ball.radius <= radius;
    } else {
      const w = target.size.width ?? 60;
      const h = target.size.height ?? 60;
      const left = target.position.x - w / 2;
      const right = target.position.x + w / 2;
      const top = target.position.y - h / 2;
      const bottom = target.position.y + h / 2;
      return (
        ball.position.x - ball.radius >= left &&
        ball.position.x + ball.radius <= right &&
        ball.position.y - ball.radius >= top &&
        ball.position.y + ball.radius <= bottom
      );
    }
  }

  handleBoundaryCollision(ball: Ball, width: number, height: number): Ball {
    const b = {
      ...ball,
      position: { ...ball.position },
      velocity: { ...ball.velocity },
    };
    const restitution = 0.7;

    if (b.position.x - b.radius < 0) {
      b.position.x = b.radius;
      b.velocity.x = Math.abs(b.velocity.x) * restitution;
    } else if (b.position.x + b.radius > width) {
      b.position.x = width - b.radius;
      b.velocity.x = -Math.abs(b.velocity.x) * restitution;
    }

    if (b.position.y - b.radius < 0) {
      b.position.y = b.radius;
      b.velocity.y = Math.abs(b.velocity.y) * restitution;
    } else if (b.position.y + b.radius > height) {
      b.position.y = height - b.radius;
      b.velocity.y = -Math.abs(b.velocity.y) * restitution;
    }

    this.ball = b;
    return this.getBall();
  }
}
