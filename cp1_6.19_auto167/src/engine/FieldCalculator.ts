import type { Vector2, ForceField, Ball } from 'src/types';

const degToRad = (deg: number): number => (deg * Math.PI) / 180;

const distance = (a: Vector2, b: Vector2): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const normalize = (v: Vector2): Vector2 => {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
};

const isBallInField = (ball: Ball, field: ForceField): boolean => {
  return distance(ball.position, field.position) <= field.radius;
};

export function calcGravityForce(ball: Ball, field: ForceField): Vector2 {
  if (!isBallInField(ball, field)) return { x: 0, y: 0 };
  const rad = degToRad(field.angle);
  const force = field.strength * ball.mass;
  return {
    x: Math.cos(rad) * force,
    y: Math.sin(rad) * force,
  };
}

export function calcMagneticForce(ball: Ball, field: ForceField): Vector2 {
  if (!isBallInField(ball, field)) return { x: 0, y: 0 };
  const dx = field.position.x - ball.position.x;
  const dy = field.position.y - ball.position.y;
  const dist = Math.max(distance(ball.position, field.position), 10);
  const dir = normalize({ x: dx, y: dy });
  const falloff = 1 - dist / field.radius;
  const force = field.strength * Math.max(falloff, 0.1);
  const rad = degToRad(field.angle);
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);
  return {
    x: (dir.x * cosA - dir.y * sinA) * force,
    y: (dir.x * sinA + dir.y * cosA) * force,
  };
}

export function calcElasticForce(ball: Ball, field: ForceField): Vector2 {
  if (!isBallInField(ball, field)) return { x: 0, y: 0 };
  const dx = ball.position.x - field.position.x;
  const dy = ball.position.y - field.position.y;
  const dist = distance(ball.position, field.position);
  if (dist < 5) return { x: 0, y: 0 };
  const dir = normalize({ x: dx, y: dy });
  const displacement = dist - field.radius * 0.3;
  if (displacement < 0) return { x: 0, y: 0 };
  const force = field.strength * (displacement / field.radius);
  const rad = degToRad(field.angle);
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);
  return {
    x: -(dir.x * cosA - dir.y * sinA) * force,
    y: -(dir.x * sinA + dir.y * cosA) * force,
  };
}

export function calcNetForce(ball: Ball, fields: ForceField[]): Vector2 {
  let netX = 0;
  let netY = 0;
  for (const field of fields) {
    if (!isBallInField(ball, field)) continue;
    let fx = 0;
    let fy = 0;
    switch (field.type) {
      case 'gravity': {
        const f = calcGravityForce(ball, field);
        fx = f.x;
        fy = f.y;
        break;
      }
      case 'magnetic': {
        const f = calcMagneticForce(ball, field);
        fx = f.x;
        fy = f.y;
        break;
      }
      case 'elastic': {
        const f = calcElasticForce(ball, field);
        fx = f.x;
        fy = f.y;
        break;
      }
    }
    netX += fx;
    netY += fy;
  }
  return { x: netX, y: netY };
}
