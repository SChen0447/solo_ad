import { Particle, COLORS } from './types';

/**
 * ParticleSystem - 粒子效果系统
 * 
 * 职责：
 *  - 生成单位死亡时的爆炸碎片粒子（5-8个随机四散，淡出0.5秒）
 *  - 生成子弹命中时的火花粒子
 *  - 管理粒子的重力、速度衰减、生命周期
 *  - 渲染带透明度渐变的粒子
 * 
 * 数据流向：
 *  - 输入：粒子创建指令 <- GameEngine（来自onUnitKilled/命中检测）
 *  - 输出：渲染数据 -> GameEngine.render()
 * 
 * 调用者：GameEngine（update/render/createExplosion/createHitEffect）
 */
export class ParticleSystem {
  private particles: Particle[] = [];
  private nextParticleId: number = 0;

  public getParticles(): Particle[] {
    return this.particles;
  }

  public createExplosion(x: number, y: number, count: number = 6): void {
    const particleCount = Math.floor(Math.random() * 4) + count;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const speed = 50 + Math.random() * 100;

      const particle: Particle = {
        id: this.nextParticleId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5,
        maxLife: 0.5,
        color: this.getRandomDebrisColor(),
        size: 3 + Math.random() * 4
      };

      this.particles.push(particle);
    }
  }

  private getRandomDebrisColor(): string {
    const colors = ['#DC2626', '#F87171', '#FCA5A5', '#FECACA', '#7F1D1D'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  public createHitEffect(x: number, y: number): void {
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 50;

      const particle: Particle = {
        id: this.nextParticleId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.2,
        maxLife: 0.2,
        color: COLORS.bullet,
        size: 2 + Math.random() * 2
      };

      this.particles.push(particle);
    }
  }

  public update(deltaTime: number): void {
    for (const particle of this.particles) {
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      particle.vy += 200 * deltaTime;
      particle.life -= deltaTime;
    }

    this.particles = this.particles.filter(p => p.life > 0);
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (const particle of this.particles) {
      const alpha = particle.life / particle.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.fillRect(
        particle.x - particle.size / 2,
        particle.y - particle.size / 2,
        particle.size,
        particle.size
      );
    }
    ctx.globalAlpha = 1;
  }

  public clear(): void {
    this.particles = [];
    this.nextParticleId = 0;
  }
}
