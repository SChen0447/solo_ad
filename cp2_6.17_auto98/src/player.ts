export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  ownerId: number;
  active: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  active: boolean;
}

export class Player {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  speed = 200;
  width = 30;
  height = 40;
  score = 0;
  shootCooldown = 0;
  shootCooldownMax = 0.3;
  color: string;
  facingAngle: number;
  id: number;
  active = true;
  engineParticles: Particle[] = [];

  constructor(
    x: number, y: number, color: string,
    id: number, facingAngle: number
  ) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.id = id;
    this.facingAngle = facingAngle;
  }

  update(dt: number, canvasW: number, canvasH: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.x = Math.max(this.width / 2, Math.min(canvasW - this.width / 2, this.x));
    this.y = Math.max(this.height / 2, Math.min(canvasH - this.height / 2, this.y));
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    this.updateEngineParticles(dt);
    if (Math.abs(this.vx) > 1 || Math.abs(this.vy) > 1) {
      if (Math.random() < 0.6) {
        this.addEngineParticle();
      }
    }
  }

  shoot(bulletSpeed = 400, angleOverride?: number): Bullet | null {
    if (this.shootCooldown > 0) return null;
    this.shootCooldown = this.shootCooldownMax;
    const angle = angleOverride !== undefined ? angleOverride : this.facingAngle;
    return {
      x: this.x + Math.cos(angle) * (this.height / 2),
      y: this.y + Math.sin(angle) * (this.height / 2),
      vx: Math.cos(angle) * bulletSpeed,
      vy: Math.sin(angle) * bulletSpeed,
      radius: 3,
      ownerId: this.id,
      active: true,
    };
  }

  addEngineParticle(): void {
    const backAngle = this.facingAngle + Math.PI;
    const spread = (Math.random() - 0.5) * 0.6;
    const speed = 60 + Math.random() * 100;
    this.engineParticles.push({
      x: this.x + Math.cos(backAngle) * (this.height * 0.4),
      y: this.y + Math.sin(backAngle) * (this.height * 0.4),
      vx: Math.cos(backAngle + spread) * speed + this.vx * 0.3,
      vy: Math.sin(backAngle + spread) * speed + this.vy * 0.3,
      life: 0.25 + Math.random() * 0.2,
      maxLife: 0.45,
      color: Math.random() > 0.4 ? '#ff9800' : '#ffeb3b',
      size: 2 + Math.random() * 3,
      active: true,
    });
  }

  updateEngineParticles(dt: number): void {
    for (const p of this.engineParticles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) p.active = false;
    }
    this.engineParticles = this.engineParticles.filter(p => p.active);
  }

  faceToward(targetX: number, targetY: number): void {
    this.facingAngle = Math.atan2(targetY - this.y, targetX - this.x);
  }
}
