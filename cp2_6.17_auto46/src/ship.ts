export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  r: number;
  g: number;
  b: number;
  size: number;
}

export interface LaserState {
  active: boolean;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  timer: number;
  duration: number;
  ringRadius: number;
  ringAlpha: number;
  width: number;
  hitChecked: boolean;
}

export interface ShipState {
  x: number;
  y: number;
  angle: number;
  speed: number;
  baseSpeed: number;
  engineLevel: number;
  shieldLevel: number;
  laserLevel: number;
  particles: Particle[];
  trailParticles: Particle[];
  laser: LaserState;
  laserCooldown: number;
  mouseX: number;
  mouseY: number;
  mouseDown: boolean;
  prevX: number;
  prevY: number;
  moveDx: number;
  moveDy: number;
  trailSpawnTimer: number;
}

export function createShip(canvasW: number, canvasH: number): ShipState {
  return {
    x: canvasW / 2,
    y: canvasH / 2,
    angle: 0,
    speed: 3,
    baseSpeed: 3,
    engineLevel: 1,
    shieldLevel: 1,
    laserLevel: 1,
    particles: [],
    trailParticles: [],
    laser: {
      active: false,
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      timer: 0,
      duration: 0.15,
      ringRadius: 0,
      ringAlpha: 0,
      width: 4,
      hitChecked: false,
    },
    laserCooldown: 0,
    mouseX: canvasW / 2,
    mouseY: canvasH / 2,
    mouseDown: false,
    prevX: canvasW / 2,
    prevY: canvasH / 2,
    moveDx: 0,
    moveDy: 0,
    trailSpawnTimer: 0,
  };
}

export function updateShip(ship: ShipState, dt: number, keys: Set<string>, canvasW: number, canvasH: number): void {
  const speedMul = 1 + (ship.engineLevel - 1) * 0.15;
  const speed = ship.baseSpeed * speedMul;

  let dx = 0;
  let dy = 0;
  if (keys.has('w') || keys.has('arrowup')) dy -= 1;
  if (keys.has('s') || keys.has('arrowdown')) dy += 1;
  if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
  if (keys.has('d') || keys.has('arrowright')) dx += 1;

  let moving = false;
  if (dx !== 0 || dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
    ship.moveDx = dx;
    ship.moveDy = dy;
    moving = true;
    ship.prevX = ship.x;
    ship.prevY = ship.y;
    ship.x += dx * speed * dt * 60;
    ship.y += dy * speed * dt * 60;
  } else {
    ship.moveDx = 0;
    ship.moveDy = 0;
  }

  ship.x = Math.max(20, Math.min(canvasW - 20, ship.x));
  ship.y = Math.max(20, Math.min(canvasH - 20, ship.y));

  ship.angle = Math.atan2(ship.mouseY - ship.y, ship.mouseX - ship.x);

  const distPerSec = Math.sqrt(Math.pow(ship.x - ship.prevX, 2) + Math.pow(ship.y - ship.prevY, 2)) / Math.max(dt, 0.001);

  if (moving) {
    const flameCount = 12;
    const moveAngle = Math.atan2(ship.moveDy, ship.moveDx);
    for (let i = 0; i < flameCount; i++) {
      const backAngle = moveAngle + Math.PI + (Math.random() - 0.5) * 1.2;
      const spd = 1.5 + Math.random() * 3;
      const lifeRatio = Math.random() * 0.3 + 0.7;
      ship.particles.push({
        x: ship.x - Math.cos(moveAngle) * (14 + Math.random() * 6),
        y: ship.y - Math.sin(moveAngle) * (14 + Math.random() * 6),
        vx: Math.cos(backAngle) * spd,
        vy: Math.sin(backAngle) * spd,
        life: 0.6 * lifeRatio,
        maxLife: 0.6 * lifeRatio,
        r: 255,
        g: Math.floor(100 + Math.random() * 100),
        b: Math.floor(Math.random() * 40),
        size: 2 + Math.random() * 3,
      });
    }
  } else {
    const flameCount = 8;
    for (let i = 0; i < flameCount; i++) {
      const backAngle = ship.angle + Math.PI + (Math.random() - 0.5) * 1.0;
      const spd = 0.5 + Math.random() * 1;
      const lifeRatio = Math.random() * 0.3 + 0.7;
      ship.particles.push({
        x: ship.x - Math.cos(ship.angle) * (16 + Math.random() * 3),
        y: ship.y - Math.sin(ship.angle) * (16 + Math.random() * 3),
        vx: Math.cos(backAngle) * spd,
        vy: Math.sin(backAngle) * spd,
        life: 0.6 * lifeRatio,
        maxLife: 0.6 * lifeRatio,
        r: 255,
        g: Math.floor(100 + Math.random() * 100),
        b: Math.floor(Math.random() * 40),
        size: 1.5 + Math.random() * 2,
      });
    }
  }

  const TRAIL_SPEED_THRESHOLD = 50;
  if (distPerSec > TRAIL_SPEED_THRESHOLD) {
    const speedFactor = (distPerSec - TRAIL_SPEED_THRESHOLD) / 150;
    const spawnInterval = Math.max(0.008, 0.05 - speedFactor * 0.04);
    ship.trailSpawnTimer -= dt;
    while (ship.trailSpawnTimer <= 0) {
      ship.trailSpawnTimer += spawnInterval;
      const moveAngle = Math.atan2(ship.moveDy, ship.moveDx);
      const tailX = ship.x - Math.cos(moveAngle) * 12;
      const tailY = ship.y - Math.sin(moveAngle) * 12;
      ship.trailParticles.push({
        x: tailX + (Math.random() - 0.5) * 4,
        y: tailY + (Math.random() - 0.5) * 4,
        vx: -Math.cos(moveAngle) * 0.5 + (Math.random() - 0.5) * 0.5,
        vy: -Math.sin(moveAngle) * 0.5 + (Math.random() - 0.5) * 0.5,
        life: 1.2,
        maxLife: 1.2,
        r: 0,
        g: 229,
        b: 255,
        size: 2,
      });
    }
  } else {
    ship.trailSpawnTimer = 0;
  }

  for (let i = ship.particles.length - 1; i >= 0; i--) {
    const p = ship.particles[i];
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.life -= dt;
    if (p.life <= 0) {
      ship.particles.splice(i, 1);
    }
  }

  for (let i = ship.trailParticles.length - 1; i >= 0; i--) {
    const p = ship.trailParticles[i];
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.life -= dt;
    if (p.life <= 0) {
      ship.trailParticles.splice(i, 1);
    }
  }

  if (ship.laser.active) {
    ship.laser.timer -= dt;
    if (ship.laser.timer <= 0) {
      ship.laser.ringRadius += dt * 160;
      ship.laser.ringAlpha -= dt * 2.5;
      if (ship.laser.ringAlpha <= 0) {
        ship.laser.active = false;
        ship.laser.ringAlpha = 0;
      }
    }
  }

  if (ship.laserCooldown > 0) {
    ship.laserCooldown -= dt;
  }

  if (ship.mouseDown && ship.laserCooldown <= 0) {
    fireLaser(ship);
    ship.laserCooldown = 0.18;
  }
}

export function fireLaser(ship: ShipState): void {
  const laserWidth = 4 + (ship.laserLevel - 1) * 2;
  ship.laser = {
    active: true,
    x: ship.x + Math.cos(ship.angle) * 20,
    y: ship.y + Math.sin(ship.angle) * 20,
    targetX: ship.x + Math.cos(ship.angle) * 800,
    targetY: ship.y + Math.sin(ship.angle) * 800,
    timer: 0.15,
    duration: 0.15,
    ringRadius: 20 * (1 + (ship.laserLevel - 1) * 0.15),
    ringAlpha: 0.8,
    width: laserWidth,
    hitChecked: false,
  };
}

export function drawShip(ctx: CanvasRenderingContext2D, ship: ShipState): void {
  for (const p of ship.trailParticles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    const size = p.size * alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`;
    ctx.shadowColor = `rgba(${p.r},${p.g},${p.b},${alpha * 0.6})`;
    ctx.shadowBlur = 4;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  for (const p of ship.particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`;
    ctx.fill();
  }

  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);

  ctx.beginPath();
  const size = 20;
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const px = Math.cos(a) * size;
    const py = Math.sin(a) * size;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();

  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = 8;
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = 'rgba(0, 229, 255, 0.15)';
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.restore();

  if (ship.shieldLevel > 1) {
    const shieldAlpha = 0.12 + ship.shieldLevel * 0.04;
    const shieldR = 28 + ship.shieldLevel * 2;
    const hue = 220 + (ship.shieldLevel - 1) * 20;
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, shieldR, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${shieldAlpha})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = `hsla(${hue}, 80%, 60%, 0.5)`;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  if (ship.laser.active) {
    const laser = ship.laser;
    const laserAlpha = laser.timer > 0 ? 1 : laser.ringAlpha;

    if (laser.timer > 0) {
      const grad = ctx.createLinearGradient(laser.x, laser.y, laser.targetX, laser.targetY);
      grad.addColorStop(0, `rgba(255, 234, 0, ${laserAlpha})`);
      grad.addColorStop(1, `rgba(255, 111, 0, ${laserAlpha * 0.6})`);
      ctx.beginPath();
      ctx.moveTo(laser.x, laser.y);
      ctx.lineTo(laser.targetX, laser.targetY);
      ctx.strokeStyle = grad;
      ctx.lineWidth = laser.width;
      ctx.shadowColor = '#ffea00';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    if (laser.timer <= 0 && laser.ringAlpha > 0) {
      ctx.beginPath();
      ctx.arc(laser.targetX, laser.targetY, laser.ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 234, 0, ${laser.ringAlpha})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ffea00';
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
}

export function getLaserHitPoint(ship: ShipState): { x: number; y: number; radius: number } | null {
  if (!ship.laser.active) return null;
  if (ship.laser.hitChecked) return null;
  if (ship.laser.timer <= 0) return null;
  if (ship.laser.timer > ship.laser.duration - 0.01) {
    ship.laser.hitChecked = true;
    return {
      x: ship.laser.targetX,
      y: ship.laser.targetY,
      radius: 20 * (1 + (ship.laserLevel - 1) * 0.15),
    };
  }
  return null;
}
