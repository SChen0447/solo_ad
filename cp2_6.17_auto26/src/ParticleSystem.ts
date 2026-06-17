import type { Particle, MaterialType } from '@/types';

export class ParticleSystem {
  particles: Particle[] = [];
  MAX_PARTICLES = 200;

  get count(): number {
    return this.particles.length;
  }

  clear(): void {
    this.particles = [];
  }

  rotationSpeedFromSize(size: number, baseRange: [number, number]): number {
    const minSize = 2;
    const maxSize = 10;
    const clampedSize = Math.max(minSize, Math.min(maxSize, size));
    const inverseRatio = (1 / clampedSize) * 10;
    const [rangeMin, rangeMax] = baseRange;
    const baseSpeed = rangeMin + (rangeMax - rangeMin) * Math.min(1, (inverseRatio - 1) / 4);
    const jitter = (Math.random() - 0.5) * (rangeMax - rangeMin) * 0.2;
    const finalDeg = baseSpeed + jitter;
    const rad = (finalDeg * Math.PI) / 180;
    const sign = Math.random() < 0.5 ? -1 : 1;
    return rad * sign;
  }

  createParticles(x: number, y: number, material: MaterialType, energy: number, impactAngle: number = 0): void {
    const energyScale = Math.max(0, Math.min(1, energy / 100));
    const created: Particle[] = [];

    if (material === 'wood') {
      const debrisCount = Math.floor(5 + Math.random() * 4);
      const woodColors = ['#c9b99a', '#b8a88a', '#d4c4a8', '#a89878'];
      for (let i = 0; i < debrisCount; i++) {
        const size = 3 + Math.random() * 2;
        const angle = Math.random() * Math.PI * 2;
        const speed = (30 + Math.random() * 90) * energyScale;
        const maxLife = 1.2;
        created.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size,
          color: woodColors[Math.floor(Math.random() * woodColors.length)],
          life: maxLife,
          maxLife,
          type: 'debris',
          shape: 'circle',
          opacity: 1,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: this.rotationSpeedFromSize(size, [30, 120]),
          rotateStartTime: maxLife - 0.3,
          gravityScale: 0.5,
        });
      }
      const sliverCount = Math.floor(6 + Math.random() * 5);
      for (let i = 0; i < sliverCount; i++) {
        let width = 2 + Math.random() * 4;
        let height = 2 + Math.random() * 4;
        while (Math.abs(width - height) < 0.8) {
          width = 2 + Math.random() * 4;
          height = 2 + Math.random() * 4;
        }
        const size = Math.max(width, height);
        const angle = Math.random() * Math.PI * 2;
        const speed = (50 + Math.random() * 110) * energyScale;
        const maxLife = 1.2;
        created.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size,
          width,
          height,
          color: woodColors[Math.floor(Math.random() * woodColors.length)],
          life: maxLife,
          maxLife,
          type: 'sliver',
          shape: 'rect',
          opacity: 1,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: this.rotationSpeedFromSize(size, [40, 130]),
          rotateStartTime: maxLife - 0.3,
          gravityScale: 0.5,
        });
      }
    } else if (material === 'iron') {
      const sparkCount = Math.floor(8 + Math.random() * 5);
      const sparkColors = ['#ffaa00', '#ff8800', '#ff6600'];
      const spread = (120 * Math.PI) / 180;
      for (let i = 0; i < sparkCount; i++) {
        const size = 2 + Math.random();
        const angleOffset = (Math.random() - 0.5) * spread;
        const angle = impactAngle + angleOffset;
        const speed = (200 + Math.random() * 250) * energyScale;
        const maxLife = 0.6;
        const vx0 = Math.cos(angle) * speed;
        const vy0 = Math.sin(angle) * speed;
        created.push({
          x, y,
          vx: vx0,
          vy: vy0,
          size,
          color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
          colorEnd: '#ff6600',
          life: maxLife,
          maxLife,
          type: 'spark',
          shape: 'circle',
          opacity: 1,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: this.rotationSpeedFromSize(size, [60, 180]),
          trail: [],
          trailLength: 10 + Math.floor(Math.random() * 3),
          gravityScale: 1.0,
        });
      }
    } else if (material === 'glass') {
      const shardCount = Math.floor(10 + Math.random() * 5);
      for (let i = 0; i < shardCount; i++) {
        const size = 4 + Math.random() * 6;
        const vertexCount = 4 + Math.floor(Math.random() * 3);
        const points: number[][] = [];
        for (let j = 0; j < vertexCount; j++) {
          const baseAngle = (j / vertexCount) * Math.PI * 2;
          const angleJitter = (Math.random() - 0.5) * 0.3;
          const radiusFactor = 0.6 + Math.random() * 0.4;
          const px = Math.cos(baseAngle + angleJitter) * size * radiusFactor;
          const py = Math.sin(baseAngle + angleJitter) * size * radiusFactor;
          points.push([px, py]);
        }
        const angle = Math.random() * Math.PI * 2;
        const speed = (80 + Math.random() * 120) * energyScale;
        const maxLife = 1.5;
        created.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size,
          color: 'rgba(200,230,255,0.85)',
          life: maxLife,
          maxLife,
          type: 'shard',
          shape: 'polygon',
          points,
          opacity: 1,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: this.rotationSpeedFromSize(size, [30, 90]),
          glowIntensity: 0.3 + Math.random() * 0.2,
          flickerPhase: Math.random() < 0.5 ? 0 : 1,
          flickerTimer: 0,
          gravityScale: 0.4,
        });
      }
      const dropletCount = Math.floor(4 + Math.random() * 4);
      for (let i = 0; i < dropletCount; i++) {
        const size = 2 + Math.random();
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
        const speed = 60 + Math.random() * 90;
        const maxLife = 0.8;
        created.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size,
          color: '#4488ff',
          life: maxLife,
          maxLife,
          type: 'droplet',
          shape: 'circle',
          opacity: 1,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: this.rotationSpeedFromSize(size, [60, 150]),
          swingAmplitude: 3 + Math.random() * 2,
          swingSpeed: 2 + Math.random() * 2,
          swingPhase: Math.random() * Math.PI * 2,
          startX: x,
          gravityScale: 1.0,
        });
      }
    } else if (material === 'explosive') {
      const explosionCount = Math.floor(14 + Math.random() * 5);
      const explosionColors = ['#ff4444', '#ff8800', '#ffcc00', '#ffffff'];
      for (let i = 0; i < explosionCount; i++) {
        const size = 4 + Math.random() * 4;
        const angle = Math.random() * Math.PI * 2;
        const speed = (300 + Math.random() * 400) * energyScale;
        const maxLife = 0.5;
        created.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size,
          color: explosionColors[Math.floor(Math.random() * explosionColors.length)],
          life: maxLife,
          maxLife,
          type: 'explosion',
          shape: 'circle',
          opacity: 1,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: this.rotationSpeedFromSize(size, [45, 120]),
          trail: [],
          trailLength: 6 + Math.floor(Math.random() * 4),
          gravityScale: 0.3,
        });
      }
    } else if (material === 'launcher') {
      const sparkCount = Math.floor(5 + Math.random() * 4);
      for (let i = 0; i < sparkCount; i++) {
        const size = 2 + Math.random();
        const angle = Math.random() * Math.PI * 2;
        const speed = 150 + Math.random() * 150;
        const maxLife = 0.4;
        created.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size,
          color: '#aa66ff',
          colorEnd: '#6633cc',
          life: maxLife,
          maxLife,
          type: 'spark',
          shape: 'circle',
          opacity: 1,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: this.rotationSpeedFromSize(size, [60, 150]),
          gravityScale: 0.5,
        });
      }
    }

    this.particles.push(...created);

    if (this.particles.length > this.MAX_PARTICLES) {
      const excess = this.particles.length - this.MAX_PARTICLES;
      this.particles.splice(0, excess);
    }
  }

  update(dt: number): void {
    const gravity = 220;
    for (const p of this.particles) {
      if (p.type === 'spark') {
        p.vy += gravity * (p.gravityScale ?? 1) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      } else {
        p.vy += gravity * (p.gravityScale ?? 1) * dt;
        if (p.type === 'droplet' && p.swingAmplitude !== undefined && p.swingSpeed !== undefined && p.startX !== undefined) {
          p.startX += p.vx * dt;
          const elapsed = p.maxLife - p.life;
          p.x = p.startX + Math.sin((elapsed + (p.swingPhase ?? 0)) * (p.swingSpeed ?? 3) * Math.PI) * (p.swingAmplitude ?? 4);
          p.y += p.vy * dt;
        } else {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        }
      }

      p.life -= dt;
      p.opacity = Math.max(0, Math.min(1, p.life / p.maxLife));

      if (p.type === 'shard') {
        p.flickerTimer = (p.flickerTimer ?? 0) + dt;
        if (p.flickerTimer >= 0.2) {
          p.flickerTimer = 0;
          p.flickerPhase = (p.flickerPhase ?? 0) ^ 1;
        }
        p.opacity *= (p.flickerPhase ?? 1) === 1 ? 1.0 : 0.65;
      }

      if (p.rotateStartTime !== undefined) {
        if (p.maxLife - p.life >= p.rotateStartTime) {
          p.rotation += p.rotationSpeed * dt;
        }
      } else {
        p.rotation += p.rotationSpeed * dt;
      }

      if ((p.type === 'spark' || p.type === 'explosion') && p.trail !== undefined && p.trailLength !== undefined) {
        p.trail.push({ x: p.x, y: p.y, life: p.life });
        if (p.trail.length > p.trailLength) {
          p.trail.splice(0, p.trail.length - p.trailLength);
        }
      }
    }

    this.particles = this.particles.filter(p => p.life > 0);
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.save();

      if (p.type === 'spark' && p.trail && p.trail.length > 0) {
        const maxLen = p.trail.length;
        for (let i = 0; i < maxLen; i++) {
          const t = i / Math.max(1, maxLen - 1);
          const tp = p.trail[i];
          const trailAlpha = t * 0.8;
          let r1 = 255, g1 = 170, b1 = 0;
          let r2 = 255, g2 = 102, b2 = 0;
          if (p.color === '#aa66ff') {
            r1 = 170; g1 = 102; b1 = 255;
          }
          if (p.colorEnd === '#6633cc') {
            r2 = 102; g2 = 51; b2 = 204;
          }
          if (p.color.startsWith('#') && p.color.length === 7) {
            r1 = parseInt(p.color.slice(1, 3), 16);
            g1 = parseInt(p.color.slice(3, 5), 16);
            b1 = parseInt(p.color.slice(5, 7), 16);
          }
          if (p.colorEnd && p.colorEnd.startsWith('#') && p.colorEnd.length === 7) {
            r2 = parseInt(p.colorEnd.slice(1, 3), 16);
            g2 = parseInt(p.colorEnd.slice(3, 5), 16);
            b2 = parseInt(p.colorEnd.slice(5, 7), 16);
          }
          const cr = Math.round(r1 + (r2 - r1) * t);
          const cg = Math.round(g1 + (g2 - g1) * t);
          const cb = Math.round(b1 + (b2 - b1) * t);
          const radius = (p.size / 2) * (0.3 + t * 0.7);
          ctx.globalAlpha = trailAlpha;
          ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
          ctx.beginPath();
          ctx.arc(tp.x, tp.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = p.opacity;
        const mainR = p.size / 2;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, mainR * 2);
        grad.addColorStop(0, p.color);
        if (p.colorEnd) {
          grad.addColorStop(1, p.colorEnd + '00');
        } else {
          grad.addColorStop(1, 'rgba(255,255,255,0)');
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, mainR * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, mainR, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'explosion' && p.trail && p.trail.length > 0) {
        const maxLen = p.trail.length;
        for (let i = 0; i < maxLen; i++) {
          const t = i / Math.max(1, maxLen - 1);
          const tp = p.trail[i];
          const trailAlpha = t * 0.7;
          const radius = (p.size / 2) * (0.4 + t * 0.6);
          ctx.globalAlpha = trailAlpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(tp.x, tp.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = p.opacity;
        const mainR = p.size / 2;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, mainR * 2.5);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, p.color);
        grad.addColorStop(1, p.color + '00');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, mainR * 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, mainR, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'shard' && p.points) {
        ctx.globalAlpha = p.opacity;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = p.size * (p.glowIntensity ?? 0.4) * 4;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.beginPath();
        const pts = p.points;
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i][0], pts[i][1]);
        }
        ctx.closePath();
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.save();
        ctx.shadowColor = 'rgba(255,255,255,0.9)';
        ctx.shadowBlur = 3 + (p.glowIntensity ?? 0.4) * 4;
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
        ctx.strokeStyle = 'rgba(180,220,255,0.5)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        if (pts.length >= 2) {
          ctx.strokeStyle = 'rgba(255,255,255,0.95)';
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          const idx = Math.floor((p.rotation * 3) % (pts.length - 1));
          const a = pts[idx];
          const b = pts[(idx + 1) % pts.length];
          const mx = (a[0] + b[0]) / 2;
          const my = (a[1] + b[1]) / 2;
          const dirX = b[0] - a[0];
          const dirY = b[1] - a[1];
          const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
          const nx = -dirY / len;
          const ny = dirX / len;
          const off = Math.sin(p.rotation * 2) * 2;
          ctx.moveTo(mx + nx * off, my + ny * off);
          ctx.lineTo(mx + nx * off + dirX * 0.3, my + ny * off + dirY * 0.3);
          ctx.stroke();
        }
      } else if (p.type === 'sliver' && p.shape === 'rect') {
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        const w = p.width ?? p.size;
        const h = p.height ?? p.size;
        ctx.fillStyle = p.color;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        let dr = 184, dg = 168, db = 138;
        if (p.color.startsWith('#') && p.color.length === 7) {
          dr = parseInt(p.color.slice(1, 3), 16);
          dg = parseInt(p.color.slice(3, 5), 16);
          db = parseInt(p.color.slice(5, 7), 16);
        }
        dr = Math.max(0, dr - 30);
        dg = Math.max(0, dg - 30);
        db = Math.max(0, db - 30);
        ctx.strokeStyle = `rgb(${dr},${dg},${db})`;
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-w / 2, -h / 2, w, h);
      } else if (p.type === 'debris') {
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'droplet') {
        ctx.globalAlpha = p.opacity;
        const r = p.size / 2;
        const grad = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, 0, p.x, p.y, r * 1.5);
        grad.addColorStop(0, '#aaccff');
        grad.addColorStop(0.5, p.color);
        grad.addColorStop(1, p.color + '00');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#88bbff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'spark') {
        ctx.globalAlpha = p.opacity;
        const mainR = p.size / 2;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, mainR * 2);
        grad.addColorStop(0, p.color);
        if (p.colorEnd) {
          grad.addColorStop(1, p.colorEnd + '00');
        } else {
          grad.addColorStop(1, 'rgba(255,255,255,0)');
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, mainR * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, mainR, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}
