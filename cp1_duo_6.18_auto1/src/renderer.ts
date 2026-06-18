import { GameEngine, EnergyBallState, GravityBodyState, RingCheckpointState, BlackHoleState, Vector } from './engine';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private stars: Array<{ x: number; y: number; size: number; brightness: number; twinkleSpeed: number; phase: number }> = [];
  private time: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.generateStars();
  }

  private generateStars(): void {
    this.stars = [];
    for (let i = 0; i < 200; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2 + 0.5,
        brightness: Math.random() * 0.5 + 0.5,
        twinkleSpeed: Math.random() * 0.02 + 0.01,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.generateStars();
  }

  render(engine: GameEngine, deltaTime: number): void {
    this.time += deltaTime;
    this.drawBackground();
    this.drawStars();
    this.drawGravityBodies(engine.gravityBodies);
    this.drawRingCheckpoints(engine.ringCheckpoints);
    this.drawBlackHole(engine.blackHole);
    this.drawEnergyBallTrail(engine.energyBall);
    this.drawEnergyBall(engine.energyBall);
    this.drawChargeEffect(engine.energyBall);
    this.drawRingCounter(engine.passedRings, engine.totalRings);
    
    if (engine.isGameWon) {
      this.drawWinScreen(engine.winAnimationTime);
    }
  }

  private drawBackground(): void {
    const gradient = this.ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height / 2, 0,
      this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height) / 1.5
    );
    gradient.addColorStop(0, '#1a1a4e');
    gradient.addColorStop(0.5, '#2d1b4e');
    gradient.addColorStop(1, '#0a0a1a');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawStars(): void {
    this.stars.forEach(star => {
      const twinkle = Math.sin(this.time * star.twinkleSpeed + star.phase) * 0.3 + 0.7;
      const alpha = star.brightness * twinkle;
      
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      this.ctx.fill();
    });
  }

  private drawGravityBodies(bodies: GravityBodyState[]): void {
    bodies.forEach(body => {
      this.ctx.save();
      this.ctx.translate(body.position.x, body.position.y);
      this.ctx.rotate(body.rotation);

      const glowGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, body.radius * 2);
      glowGradient.addColorStop(0, body.color + '40');
      glowGradient.addColorStop(1, body.color + '00');
      this.ctx.fillStyle = glowGradient;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, body.radius * 2, 0, Math.PI * 2);
      this.ctx.fill();

      const bodyGradient = this.ctx.createRadialGradient(-body.radius * 0.3, -body.radius * 0.3, 0, 0, 0, body.radius);
      bodyGradient.addColorStop(0, this.lightenColor(body.color, 30));
      bodyGradient.addColorStop(0.7, body.color);
      bodyGradient.addColorStop(1, this.darkenColor(body.color, 40));
      
      this.ctx.beginPath();
      this.ctx.arc(0, 0, body.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = bodyGradient;
      this.ctx.fill();

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(0, 0, body.radius, 0, Math.PI * 2);
      this.ctx.clip();

      const pulseBrightness = 0.9 + 0.1 * Math.sin(2 * Math.PI * this.time / body.stripePulsePeriod + body.stripePulsePhase);

      this.ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const y = (i - 1.5) * (body.radius * 0.5);
        const waveOffset = Math.sin(body.stripeOffset + i) * 5;
        const stripeBaseColor = this.darkenColor(body.color, 20);
        const stripeAlpha = Math.floor(96 * pulseBrightness).toString(16).padStart(2, '0');
        this.ctx.strokeStyle = stripeBaseColor + stripeAlpha;
        this.ctx.beginPath();
        this.ctx.moveTo(-body.radius, y + waveOffset);
        this.ctx.quadraticCurveTo(0, y + waveOffset * 2, body.radius, y + waveOffset);
        this.ctx.stroke();
      }

      this.ctx.restore();
      this.ctx.restore();
    });
  }

  private drawRingCheckpoints(rings: RingCheckpointState[]): void {
    const flashDuration = 500;
    const colors = ['#ff0080', '#ff8c00', '#ffff00', '#00ff80', '#00ffff', '#0080ff', '#8000ff', '#ff0080'];

    rings.forEach(ring => {
      this.ctx.save();
      this.ctx.translate(ring.position.x, ring.position.y);
      this.ctx.rotate(ring.rotation);

      const ringRadius = ring.radius;
      let pulseScale = 1;

      if (ring.flashTime > 0) {
        const flashProgress = 1 - ring.flashTime / flashDuration;
        const pulseT = flashProgress;
        if (pulseT < 0.4) {
          const upT = pulseT / 0.4;
          pulseScale = 1 + 0.2 * this.easeOutCubic(upT);
        } else {
          const downT = (pulseT - 0.4) / 0.6;
          pulseScale = 1.2 - 0.2 * this.easeOutCubic(downT);
        }

        const shockwaveRadius = ringRadius * (1 + flashProgress);
        const shockwaveWidth = 6 + flashProgress * 8;
        const r = Math.floor(255 - flashProgress * 105);
        const g = Math.floor(255 - flashProgress * 55);
        const b = 255;
        const shockwaveAlpha = (1 - flashProgress) * 0.9;
        const shockwaveGlow = (1 - flashProgress) * 0.3;

        this.ctx.beginPath();
        this.ctx.arc(0, 0, shockwaveRadius + 10, 0, Math.PI * 2);
        this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${shockwaveGlow})`;
        this.ctx.lineWidth = shockwaveWidth + 8;
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(0, 0, shockwaveRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${shockwaveAlpha})`;
        this.ctx.lineWidth = shockwaveWidth;
        this.ctx.stroke();

        const innerAlpha = (1 - flashProgress) * 0.4;
        const innerRadius = ringRadius * (0.5 + flashProgress * 0.5);
        this.ctx.beginPath();
        this.ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${innerAlpha})`;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      }

      const drawRadius = ringRadius * pulseScale;

      for (let i = 0; i < ring.segments; i++) {
        const startAngle = (i / ring.segments) * Math.PI * 2;
        const endAngle = ((i + 1) / ring.segments) * Math.PI * 2;
        const colorIndex = i % colors.length;

        this.ctx.beginPath();
        this.ctx.arc(0, 0, drawRadius, startAngle, endAngle);
        this.ctx.strokeStyle = colors[colorIndex] + '80';
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';
        this.ctx.stroke();

        if (ring.passed) {
          this.ctx.beginPath();
          this.ctx.arc(0, 0, drawRadius, startAngle, endAngle);
          this.ctx.strokeStyle = colors[colorIndex];
          this.ctx.lineWidth = 3;
          this.ctx.stroke();
        }
      }

      this.ctx.restore();
    });
  }

  private drawBlackHole(blackHole: BlackHoleState): void {
    this.ctx.save();
    this.ctx.translate(blackHole.position.x, blackHole.position.y);

    blackHole.particles.forEach(particle => {
      this.ctx.save();
      this.ctx.translate(particle.position.x - blackHole.position.x, particle.position.y - blackHole.position.y);
      this.ctx.globalAlpha = particle.life;
      this.ctx.fillStyle = particle.color;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    this.ctx.rotate(blackHole.rotation);

    const attractGradient = this.ctx.createRadialGradient(0, 0, blackHole.radius, 0, 0, blackHole.attractRadius);
    attractGradient.addColorStop(0, 'rgba(80, 0, 0, 0.3)');
    attractGradient.addColorStop(0.5, 'rgba(50, 0, 30, 0.15)');
    attractGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.ctx.fillStyle = attractGradient;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, blackHole.attractRadius, 0, Math.PI * 2);
    this.ctx.fill();

    for (let i = 0; i < 3; i++) {
      const ringRadius = blackHole.radius + 15 + i * 10;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      const alpha = 0.3 - i * 0.1;
      this.ctx.strokeStyle = `rgba(139, 0, 0, ${alpha})`;
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.ctx.lineDashOffset = -blackHole.rotation * 50;
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    const coreGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, blackHole.radius);
    coreGradient.addColorStop(0, '#000000');
    coreGradient.addColorStop(0.7, '#1a0000');
    coreGradient.addColorStop(1, '#3d0000');
    
    this.ctx.beginPath();
    this.ctx.arc(0, 0, blackHole.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = coreGradient;
    this.ctx.fill();

    const eventHorizon = this.ctx.createRadialGradient(0, 0, blackHole.radius * 0.8, 0, 0, blackHole.radius);
    eventHorizon.addColorStop(0, 'rgba(255, 100, 100, 0)');
    eventHorizon.addColorStop(0.8, 'rgba(255, 50, 50, 0.3)');
    eventHorizon.addColorStop(1, 'rgba(255, 0, 100, 0.5)');
    
    this.ctx.beginPath();
    this.ctx.arc(0, 0, blackHole.radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = eventHorizon;
    this.ctx.lineWidth = 4;
    this.ctx.stroke();

    this.ctx.restore();
  }

  private drawEnergyBallTrail(ball: EnergyBallState): void {
    if (ball.trail.length < 2) return;

    this.ctx.beginPath();
    this.ctx.moveTo(ball.trail[0].x, ball.trail[0].y);

    for (let i = 1; i < ball.trail.length; i++) {
      this.ctx.lineTo(ball.trail[i].x, ball.trail[i].y);
    }

    const gradient = this.ctx.createLinearGradient(
      ball.trail[0].x, ball.trail[0].y,
      ball.position.x, ball.position.y
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.6)');

    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.stroke();
  }

  private drawEnergyBall(ball: EnergyBallState): void {
    if (ball.isAbsorbed) return;

    const pos = ball.position;
    
    const glowGradient = this.ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, ball.radius * 2.5);
    glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    glowGradient.addColorStop(0.5, 'rgba(200, 220, 255, 0.2)');
    glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    this.ctx.fillStyle = glowGradient;
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, ball.radius * 2.5, 0, Math.PI * 2);
    this.ctx.fill();

    const ballGradient = this.ctx.createRadialGradient(
      pos.x - ball.radius * 0.3, pos.y - ball.radius * 0.3, 0,
      pos.x, pos.y, ball.radius
    );
    ballGradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    ballGradient.addColorStop(0.5, 'rgba(220, 240, 255, 0.8)');
    ballGradient.addColorStop(1, 'rgba(180, 200, 255, 0.5)');
    
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, ball.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = ballGradient;
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(pos.x - ball.radius * 0.4, pos.y - ball.radius * 0.4, ball.radius * 0.25, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.fill();
  }

  private drawChargeEffect(ball: EnergyBallState): void {
    if (!ball.isCharging || !ball.chargeStart || !ball.chargeCurrent) return;

    const pos = ball.position;
    const dragVector = new Vector(
      ball.chargeCurrent.x - ball.chargeStart.x,
      ball.chargeCurrent.y - ball.chargeStart.y
    );
    const distance = dragVector.length();
    const maxDistance = 200;
    const chargePower = Math.min(distance / maxDistance, 1);

    const waveCount = 3;
    for (let i = 0; i < waveCount; i++) {
      const wavePhase = (this.time * 0.003 + i / waveCount) % 1;
      const waveRadius = ball.radius + wavePhase * (30 + chargePower * 50);
      const waveAlphaInner = 0.8;
      const waveAlphaOuter = 0.2;
      const waveAlpha = (waveAlphaInner + (waveAlphaOuter - waveAlphaInner) * wavePhase) * (1 - wavePhase * 0.4);
      
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, waveRadius, 0, Math.PI * 2);
      this.ctx.strokeStyle = this.getChargeColorRgba(chargePower, waveAlpha);
      this.ctx.lineWidth = 2 + chargePower * 2;
      this.ctx.stroke();
    }

    if (distance > 10) {
      const direction = dragVector.normalize().mul(-1);
      const arrowLength = 30 + chargePower * 80;
      const arrowEnd = new Vector(
        pos.x + direction.x * arrowLength,
        pos.y + direction.y * arrowLength
      );

      this.ctx.beginPath();
      this.ctx.moveTo(pos.x, pos.y);
      this.ctx.lineTo(arrowEnd.x, arrowEnd.y);
      this.ctx.strokeStyle = this.getChargeColorRgba(chargePower, 0.8);
      this.ctx.lineWidth = 2 + chargePower * 3;
      this.ctx.stroke();

      const arrowHeadLength = 10 + chargePower * 10;
      const angle = Math.atan2(direction.y, direction.x);
      this.ctx.beginPath();
      this.ctx.moveTo(arrowEnd.x, arrowEnd.y);
      this.ctx.lineTo(
        arrowEnd.x - arrowHeadLength * Math.cos(angle - Math.PI / 6),
        arrowEnd.y - arrowHeadLength * Math.sin(angle - Math.PI / 6)
      );
      this.ctx.moveTo(arrowEnd.x, arrowEnd.y);
      this.ctx.lineTo(
        arrowEnd.x - arrowHeadLength * Math.cos(angle + Math.PI / 6),
        arrowEnd.y - arrowHeadLength * Math.sin(angle + Math.PI / 6)
      );
      this.ctx.stroke();
    }
  }

  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h = ((h % 360) + 360) % 360;
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }

  private getChargeColor(power: number): string {
    const startH = 220;
    const endH = 20;
    const h = startH - power * (startH - endH);
    const [r, g, b] = this.hslToRgb(h, 100, 58);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private getChargeColorRgba(power: number, alpha: number): string {
    const startH = 220;
    const endH = 20;
    const h = startH - power * (startH - endH);
    const [r, g, b] = this.hslToRgb(h, 100, 58);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private drawRingCounter(passed: number, total: number): void {
    const x = this.canvas.width - 100;
    const y = 40;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(x - 60, y - 20, 120, 40);

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - 60, y - 20, 120, 40);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`${passed} / ${total}`, x, y);

    this.ctx.font = '12px Arial';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.fillText('光环', x, y + 25);
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeOutElastic(t: number): number {
    const c4 = (2 * Math.PI) / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  private drawWinScreen(animationTime: number): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    let scale = 1;
    const totalDuration = 1000;
    const scaleUpDuration = 500;
    const bounceDuration = 500;

    if (animationTime < scaleUpDuration) {
      const t = animationTime / scaleUpDuration;
      const easedT = this.easeOutCubic(t);
      scale = 0.5 + easedT * 0.7;
    } else if (animationTime < totalDuration) {
      const t = (animationTime - scaleUpDuration) / bounceDuration;
      const easedT = this.easeOutBack(t);
      scale = 1.2 - easedT * 0.2;
    }

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2 - 40;

    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.scale(scale, scale);

    const textGradient = this.ctx.createLinearGradient(-150, 0, 150, 0);
    textGradient.addColorStop(0, '#ffd700');
    textGradient.addColorStop(0.5, '#ffffff');
    textGradient.addColorStop(1, '#ffd700');

    this.ctx.font = 'bold 48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = textGradient;
    this.ctx.strokeStyle = '#8b4513';
    this.ctx.lineWidth = 3;
    this.ctx.strokeText('恭喜通关！', 0, 0);
    this.ctx.fillText('恭喜通关！', 0, 0);

    this.ctx.restore();
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return `rgb(${R}, ${G}, ${B})`;
  }

  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return `rgb(${R}, ${G}, ${B})`;
  }
}
