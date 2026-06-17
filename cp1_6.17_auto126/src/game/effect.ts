interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'normal' | 'victory';
}

interface BeamEffect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  progress: number;
  duration: number;
}

export class EffectManager {
  private particles: Particle[] = [];
  private beams: BeamEffect[] = [];
  private victoryActive: boolean = false;
  private victoryTime: number = 0;
  private victoryDuration: number = 2;
  private centerX: number = 0;
  private centerY: number = 0;

  update(deltaTime: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.life -= deltaTime;

      if (p.type === 'victory') {
        p.vy -= 50 * deltaTime;
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.beams.length - 1; i >= 0; i--) {
      const beam = this.beams[i];
      beam.progress += deltaTime / beam.duration;
      if (beam.progress >= 1) {
        this.beams.splice(i, 1);
      }
    }

    if (this.victoryActive) {
      this.victoryTime += deltaTime;
      this.spawnVictoryParticles(deltaTime);
      if (this.victoryTime >= this.victoryDuration) {
        this.victoryActive = false;
      }
    }
  }

  spawnParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1,
        color,
        size: 2 + Math.random() * 3,
        type: 'normal'
      });
    }
  }

  createBeam(x1: number, y1: number, x2: number, y2: number, color: string, duration: number): Promise<void> {
    return new Promise((resolve) => {
      const beam: BeamEffect = {
        x1, y1, x2, y2, color,
        progress: 0,
        duration
      };
      this.beams.push(beam);

      setTimeout(() => {
        resolve();
      }, duration * 1000);
    });
  }

  startVictoryEffect(centerX: number, centerY: number) {
    this.victoryActive = true;
    this.victoryTime = 0;
    this.centerX = centerX;
    this.centerY = centerY;
  }

  private spawnVictoryParticles(deltaTime: number) {
    const particlesPerSecond = 60;
    const count = Math.floor(particlesPerSecond * deltaTime);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 30 + Math.random() * 50;
      this.particles.push({
        x: this.centerX + Math.cos(angle) * radius,
        y: this.centerY + Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 20,
        vy: -80 - Math.random() * 60,
        life: 1.5 + Math.random() * 0.5,
        maxLife: 2,
        color: Math.random() > 0.5 ? '#ffcc00' : '#ffdd44',
        size: 3 + Math.random() * 4,
        type: 'victory'
      });
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const beam of this.beams) {
      const currentX = beam.x1 + (beam.x2 - beam.x1) * Math.min(beam.progress * 2, 1);
      const currentY = beam.y1 + (beam.y2 - beam.y1) * Math.min(beam.progress * 2, 1);

      const alpha = 1 - beam.progress;

      ctx.shadowColor = beam.color;
      ctx.shadowBlur = 15;

      ctx.strokeStyle = beam.color;
      ctx.lineWidth = 4;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(beam.x1, beam.y1);
      ctx.lineTo(currentX, currentY);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(beam.x1, beam.y1);
      ctx.lineTo(currentX, currentY);
      ctx.stroke();

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;

      if (p.type === 'victory') {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
      }

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
    }

    ctx.globalAlpha = 1;

    if (this.victoryActive) {
      this.renderVictoryRune(ctx);
    }
  }

  private renderVictoryRune(ctx: CanvasRenderingContext2D) {
    const alpha = Math.min(this.victoryTime / 0.3, 1) * Math.min((this.victoryDuration - this.victoryTime) / 0.3, 1);
    const scale = 0.8 + Math.sin(this.victoryTime * 3) * 0.05;

    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;

    const glowGradient = ctx.createRadialGradient(0, 0, 10, 0, 0, 120);
    glowGradient.addColorStop(0, 'rgba(255, 204, 0, 0.8)');
    glowGradient.addColorStop(0.5, 'rgba(255, 204, 0, 0.3)');
    glowGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, 120, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 20;

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 - Math.PI / 2;
      const x = Math.cos(angle) * 60;
      const y = Math.sin(angle) * 60;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle1 = (i * Math.PI) / 3 - Math.PI / 2;
      const angle2 = ((i + 2) * Math.PI) / 3 - Math.PI / 2;
      const x1 = Math.cos(angle1) * 60;
      const y1 = Math.sin(angle1) * 60;
      const x2 = Math.cos(angle2) * 60;
      const y2 = Math.sin(angle2) * 60;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();

    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✧', 0, 0);

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}
