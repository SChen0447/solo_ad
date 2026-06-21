import type { Player, Bullet, Obstacle, Pickup, Particle, SkillEffect, AABB } from './entities';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gridCols: number = 3;
  private gridRows: number = 3;
  private cellSize: number = 100;
  private gridOffsetX: number = 0;
  private gridOffsetY: number = 0;
  
  private shakeAmount: number = 0;
  private shakeDuration: number = 0;
  private shakeTimer: number = 0;
  private shakeFrequency: number = 2;

  private scale: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not supported');
    this.ctx = ctx;
    this.resize();
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.ctx.scale(dpr, dpr);
    
    const baseSize = Math.min(rect.width * 0.6, rect.height * 0.6);
    this.cellSize = Math.floor(baseSize / Math.max(this.gridCols, this.gridRows));
    
    this.gridOffsetX = (rect.width - this.cellSize * this.gridCols) / 2;
    this.gridOffsetY = (rect.height - this.cellSize * this.gridRows) / 2;
    
    const baseScale = Math.min(rect.width / 1920, rect.height / 1080, 1);
    this.scale = Math.max(0.5, baseScale);
  }

  triggerShake(amount: number, duration: number, frequency: number = 2): void {
    this.shakeAmount = amount;
    this.shakeDuration = duration;
    this.shakeTimer = duration;
    this.shakeFrequency = frequency;
  }

  updateShake(deltaTime: number): void {
    if (this.shakeTimer > 0) {
      this.shakeTimer -= deltaTime;
    }
  }

  private getShakeOffset(): { x: number; y: number } {
    if (this.shakeTimer <= 0) return { x: 0, y: 0 };
    
    const progress = 1 - this.shakeTimer / this.shakeDuration;
    const intensity = this.shakeAmount * (1 - progress);
    const phase = (this.shakeDuration - this.shakeTimer) * this.shakeFrequency * Math.PI * 2 / 1000;
    
    return {
      x: Math.sin(phase) * intensity,
      y: Math.cos(phase * 1.3) * intensity * 0.7
    };
  }

  clear(): void {
    this.ctx.fillStyle = '#111827';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  render(
    players: Player[],
    bullets: Bullet[],
    obstacles: Obstacle[],
    pickups: Pickup[],
    particles: Particle[],
    skillEffects: SkillEffect[]
  ): void {
    const shake = this.getShakeOffset();
    
    this.ctx.save();
    this.ctx.translate(shake.x, shake.y);
    
    this.drawBackground();
    this.drawGrid();
    this.drawObstacles(obstacles);
    this.drawPickups(pickups);
    this.drawSkillEffects(skillEffects);
    this.drawPlayers(players);
    this.drawBullets(bullets);
    this.drawParticles(particles);
    this.drawDebris(obstacles);
    
    this.ctx.restore();
    
    this.drawUI(players);
  }

  private drawBackground(): void {
    const gradient = this.ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height / 2, 0,
      this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.6
    );
    gradient.addColorStop(0, '#1a1b2e');
    gradient.addColorStop(1, '#111827');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    const ox = this.gridOffsetX;
    const oy = this.gridOffsetY;
    const cs = this.cellSize;
    const w = cs * this.gridCols;
    const h = cs * this.gridRows;

    ctx.fillStyle = '#1a1b2e';
    ctx.fillRect(ox, oy, w, h);

    ctx.strokeStyle = '#3a7bd5';
    ctx.lineWidth = 2;

    for (let col = 0; col <= this.gridCols; col++) {
      const x = ox + col * cs;
      ctx.beginPath();
      ctx.moveTo(x, oy);
      ctx.lineTo(x, oy + h);
      ctx.stroke();
    }

    for (let row = 0; row <= this.gridRows; row++) {
      const y = oy + row * cs;
      ctx.beginPath();
      ctx.moveTo(ox, y);
      ctx.lineTo(ox + w, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(58, 123, 213, 0.3)';
    ctx.lineWidth = 4;
    ctx.strokeRect(ox - 2, oy - 2, w + 4, h + 4);
  }

  private drawPlayers(players: Player[]): void {
    for (const player of players) {
      if (player.isDead) continue;
      this.drawPlayer(player);
    }
  }

  private drawPlayer(player: Player): void {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const centerX = this.gridOffsetX + (player.gridX + 0.5) * cs + player.entranceProgress * cs * 3;
    const centerY = this.gridOffsetY + (player.gridY + 0.5) * cs;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    
    if (player.stunned) {
      ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 100) * 0.2;
    }
    
    if (player.burning) {
      ctx.shadowColor = '#ff6b35';
      ctx.shadowBlur = 20;
    }
    
    const bodyColor = player.color;
    const secondaryColor = player.secondaryColor;
    
    const scale = cs / 100;
    ctx.scale(scale, scale);
    
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.ellipse(0, 10, 22, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = secondaryColor;
    for (let i = -15; i <= 15; i += 10) {
      ctx.fillRect(i - 2, -5, 4, 25);
    }
    
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = 2;
    ctx.fillRect(-15, -28, 30, 22);
    ctx.strokeRect(-15, -28, 30, 22);
    
    ctx.fillStyle = '#1a1b2e';
    ctx.fillRect(-10, -22, 20, 10);
    
    ctx.fillStyle = player.team === 'red' ? '#ffd700' : '#00ffff';
    ctx.shadowColor = player.team === 'red' ? '#ffd700' : '#00ffff';
    ctx.shadowBlur = 5;
    ctx.fillRect(-8, -20, 7, 4);
    ctx.fillRect(1, -20, 7, 4);
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = 2;
    
    const armOffsetX = player.direction === 0 ? 0 : (player.direction > 0 ? 10 : -10);
    
    ctx.fillRect(-32 + armOffsetX, -15, 12, 30);
    ctx.strokeRect(-32 + armOffsetX, -15, 12, 30);
    
    ctx.fillRect(20 + armOffsetX, -15, 12, 30);
    ctx.strokeRect(20 + armOffsetX, -15, 12, 30);
    
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(-28 + armOffsetX, 10, 20, 6);
    ctx.fillRect(8 + armOffsetX, 10, 20, 6);
    
    ctx.restore();
    
    if (!player.isDead) {
      this.drawHealthBar(centerX, centerY - cs * 0.45, player);
    }
  }

  private drawHealthBar(x: number, y: number, player: Player): void {
    const ctx = this.ctx;
    const barWidth = this.cellSize * 0.7;
    const barHeight = 8;
    const energyHeight = 5;
    const gap = 3;
    
    const startX = x - barWidth / 2;
    
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(startX - 1, y - 1, barWidth + 2, barHeight + 2);
    
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(startX, y, barWidth, barHeight);
    
    const healthPercent = player.health / player.maxHealth;
    const healthWidth = barWidth * healthPercent;
    
    const healthGradient = ctx.createLinearGradient(startX, y, startX, y + barHeight);
    if (healthPercent > 0.5) {
      healthGradient.addColorStop(0, '#68d391');
      healthGradient.addColorStop(1, '#48bb78');
    } else if (healthPercent > 0.25) {
      healthGradient.addColorStop(0, '#f6ad55');
      healthGradient.addColorStop(1, '#ed8936');
    } else {
      healthGradient.addColorStop(0, '#fc8181');
      healthGradient.addColorStop(1, '#e53e3e');
    }
    
    ctx.fillStyle = healthGradient;
    ctx.fillRect(startX, y, healthWidth, barHeight);
    
    const energyY = y + barHeight + gap;
    
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(startX - 1, energyY - 1, barWidth + 2, energyHeight + 2);
    
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(startX, energyY, barWidth, energyHeight);
    
    const energyPercent = player.energy / player.maxEnergy;
    const energyWidth = barWidth * energyPercent;
    
    const energyGradient = ctx.createLinearGradient(startX, energyY, startX, energyY + energyHeight);
    energyGradient.addColorStop(0, '#e2e8f0');
    energyGradient.addColorStop(1, '#cbd5e0');
    
    ctx.fillStyle = energyGradient;
    ctx.fillRect(startX, energyY, energyWidth, energyHeight);
    
    if (player.stunned) {
      ctx.fillStyle = '#9f7aea';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('眩晕', x, y - 4);
    }
    
    if (player.burning) {
      ctx.fillStyle = '#ff6b35';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('燃烧', x, y - 16);
    }
  }

  private drawBullets(bullets: Bullet[]): void {
    const ctx = this.ctx;
    
    for (const bullet of bullets) {
      if (!bullet.active) continue;
      
      const color = bullet.team === 'red' ? '#e53e3e' : '#3182ce';
      const glowColor = bullet.team === 'red' ? 'rgba(229, 62, 62, 0.5)' : 'rgba(49, 130, 206, 0.5)';
      
      ctx.save();
      ctx.translate(bullet.x, bullet.y);
      
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      
      ctx.fillStyle = glowColor;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    }
  }

  private drawObstacles(obstacles: Obstacle[]): void {
    const ctx = this.ctx;
    const cs = this.cellSize;
    
    for (const obstacle of obstacles) {
      if (obstacle.destroyed) continue;
      
      const x = this.gridOffsetX + obstacle.gridX * cs;
      const y = this.gridOffsetY + obstacle.gridY * cs;
      const size = cs * 0.7;
      const offset = (cs - size) / 2;
      
      ctx.save();
      ctx.translate(x + offset + size / 2, y + offset + size / 2);
      
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size / 2);
      gradient.addColorStop(0, '#8b6b5e');
      gradient.addColorStop(0.5, '#6b4d44');
      gradient.addColorStop(1, '#4a3530');
      
      ctx.fillStyle = gradient;
      ctx.strokeStyle = '#3d2822';
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      ctx.moveTo(-size / 2 * 0.8, size / 2 * 0.6);
      ctx.lineTo(-size / 2 * 0.6, -size / 2 * 0.7);
      ctx.lineTo(0, -size / 2 * 0.9);
      ctx.lineTo(size / 2 * 0.7, -size / 2 * 0.5);
      ctx.lineTo(size / 2 * 0.8, size / 2 * 0.4);
      ctx.lineTo(size / 2 * 0.3, size / 2 * 0.8);
      ctx.lineTo(-size / 2 * 0.4, size / 2 * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-size / 2 * 0.3, -size / 2 * 0.3);
      ctx.lineTo(size / 2 * 0.1, size / 2 * 0.2);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(size / 2 * 0.2, -size / 2 * 0.4);
      ctx.lineTo(size / 2 * 0.4, size / 2 * 0.1);
      ctx.stroke();
      
      ctx.restore();
    }
  }

  private drawDebris(obstacles: Obstacle[]): void {
    const ctx = this.ctx;
    
    for (const obstacle of obstacles) {
      for (const particle of obstacle.debris) {
        ctx.save();
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = '#6b4d44';
        ctx.fillRect(
          particle.x - particle.size / 2,
          particle.y - particle.size / 2,
          particle.size,
          particle.size
        );
        ctx.restore();
      }
    }
  }

  private drawPickups(pickups: Pickup[]): void {
    const ctx = this.ctx;
    const cs = this.cellSize;
    
    for (const pickup of pickups) {
      if (pickup.collected) continue;
      
      const x = this.gridOffsetX + (pickup.gridX + 0.5) * cs;
      const y = this.gridOffsetY + (pickup.gridY + 0.5) * cs;
      const size = cs * 0.4;
      
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = pickup.breathAlpha;
      
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 15;
      
      ctx.fillStyle = '#ffd700';
      ctx.strokeStyle = '#ffec8b';
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 72 - 90) * Math.PI / 180;
        const innerAngle = ((i * 72 + 36) - 90) * Math.PI / 180;
        const outerR = size / 2;
        const innerR = size / 4;
        
        if (i === 0) {
          ctx.moveTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
        } else {
          ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
        }
        ctx.lineTo(Math.cos(innerAngle) * innerR, Math.sin(innerAngle) * innerR);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff8dc';
      ctx.font = `${size * 0.5}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pickup.type === 'health' ? '+' : '⚡', 0, 1);
      
      ctx.restore();
      
      for (const particle of pickup.pickupEffect) {
        ctx.save();
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * particle.alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  private drawSkillEffects(skillEffects: SkillEffect[]): void {
    const ctx = this.ctx;
    const cs = this.cellSize;
    
    for (const effect of skillEffects) {
      if (!effect.active) continue;
      
      const x = this.gridOffsetX + (effect.gridX + 0.5) * cs;
      const y = this.gridOffsetY + (effect.gridY + 0.5) * cs;
      const radius = effect.radius * cs;
      
      ctx.save();
      ctx.translate(x, y);
      
      if (effect.type === 'emp') {
        const progress = effect.progress;
        const currentRadius = radius * (0.3 + progress * 0.7);
        const alpha = 1 - progress;
        
        ctx.strokeStyle = `rgba(159, 122, 234, ${alpha})`;
        ctx.lineWidth = 4;
        ctx.shadowColor = '#9f7aea';
        ctx.shadowBlur = 20;
        
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.strokeStyle = `rgba(159, 122, 234, ${alpha * 0.5})`;
        ctx.lineWidth = 2;
        
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + progress * Math.PI;
          const innerR = currentRadius * 0.3;
          const outerR = currentRadius;
          
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
          ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
          ctx.stroke();
        }
      } else if (effect.type === 'flame') {
        const progress = effect.progress;
        const alpha = 0.6 * (1 - Math.abs(progress - 0.5) * 2);
        
        for (let i = 0; i < 3; i++) {
          const r = radius * (0.5 + i * 0.25);
          const a = alpha * (1 - i * 0.3);
          
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
          gradient.addColorStop(0, `rgba(255, 200, 50, ${a})`);
          gradient.addColorStop(0.5, `rgba(255, 107, 53, ${a * 0.7})`);
          gradient.addColorStop(1, `rgba(255, 50, 20, 0)`);
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
        }
        
        const time = Date.now() / 100;
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2 + time * 0.1;
          const dist = radius * (0.3 + Math.sin(time + i) * 0.2);
          const px = Math.cos(angle) * dist;
          const py = Math.sin(angle) * dist;
          const size = 5 + Math.sin(time * 2 + i) * 3;
          
          ctx.fillStyle = `rgba(255, 200, 50, ${alpha * 0.8})`;
          ctx.beginPath();
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      ctx.restore();
    }
  }

  private drawParticles(particles: Particle[]): void {
    const ctx = this.ctx;
    
    for (const particle of particles) {
      ctx.save();
      ctx.globalAlpha = particle.alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * particle.alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawUI(players: Player[]): void {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${24 * this.scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('机甲对战模拟器', rect.width / 2, 20 * this.scale);
    
    const titleWidth = ctx.measureText('机甲对战模拟器').width;
    ctx.strokeStyle = 'rgba(58, 123, 213, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rect.width / 2 - titleWidth / 2, 50 * this.scale);
    ctx.lineTo(rect.width / 2 + titleWidth / 2, 50 * this.scale);
    ctx.stroke();
    
    const bluePlayer = players.find(p => p.team === 'blue');
    const redPlayer = players.find(p => p.team === 'red');
    
    if (bluePlayer) {
      this.drawPlayerPanel(20 * this.scale, 60 * this.scale, bluePlayer, 'left');
    }
    
    if (redPlayer) {
      this.drawPlayerPanel(rect.width - 220 * this.scale, 60 * this.scale, redPlayer, 'right');
    }
    
    this.drawSkillBar(players);
  }

  private drawPlayerPanel(x: number, y: number, player: Player, align: 'left' | 'right'): void {
    const ctx = this.ctx;
    const panelWidth = 200 * this.scale;
    const panelHeight = 100 * this.scale;
    const avatarSize = 60 * this.scale;
    
    ctx.fillStyle = 'rgba(45, 55, 72, 0.6)';
    ctx.strokeStyle = player.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, panelWidth, panelHeight, 8);
    ctx.fill();
    ctx.stroke();
    
    const avatarX = align === 'left' ? x + 15 * this.scale : x + panelWidth - avatarSize - 15 * this.scale;
    const avatarY = y + (panelHeight - avatarSize) / 2;
    
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(avatarX, avatarY, avatarSize, avatarSize, 8);
    ctx.clip();
    
    const gradient = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
    gradient.addColorStop(0, player.color);
    gradient.addColorStop(1, player.secondaryColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = `${28 * this.scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.team === 'blue' ? '蓝' : '红', avatarX + avatarSize / 2, avatarY + avatarSize / 2);
    
    ctx.restore();
    
    const infoX = align === 'left' ? avatarX + avatarSize + 15 * this.scale : x + 15 * this.scale;
    const infoWidth = panelWidth - avatarSize - 30 * this.scale;
    
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${14 * this.scale}px sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    ctx.fillText(player.team === 'blue' ? '蓝方机甲' : '红方机甲', infoX, y + 15 * this.scale);
    
    const barY = y + 35 * this.scale;
    const barHeight = 8 * this.scale;
    
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(infoX, barY, infoWidth, barHeight);
    
    const healthPercent = player.health / player.maxHealth;
    const healthGradient = ctx.createLinearGradient(infoX, barY, infoX, barY + barHeight);
    if (healthPercent > 0.5) {
      healthGradient.addColorStop(0, '#68d391');
      healthGradient.addColorStop(1, '#48bb78');
    } else if (healthPercent > 0.25) {
      healthGradient.addColorStop(0, '#f6ad55');
      healthGradient.addColorStop(1, '#ed8936');
    } else {
      healthGradient.addColorStop(0, '#fc8181');
      healthGradient.addColorStop(1, '#e53e3e');
    }
    
    ctx.fillStyle = healthGradient;
    ctx.fillRect(infoX, barY, infoWidth * healthPercent, barHeight);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = `${10 * this.scale}px sans-serif`;
    ctx.fillText(`HP: ${Math.ceil(player.health)}/${player.maxHealth}`, infoX, barY + barHeight + 4);
    
    const energyY = barY + barHeight + 18 * this.scale;
    const energyHeight = 6 * this.scale;
    
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(infoX, energyY, infoWidth, energyHeight);
    
    const energyPercent = player.energy / player.maxEnergy;
    const energyGradient = ctx.createLinearGradient(infoX, energyY, infoX, energyY + energyHeight);
    energyGradient.addColorStop(0, '#e2e8f0');
    energyGradient.addColorStop(1, '#cbd5e0');
    
    ctx.fillStyle = energyGradient;
    ctx.fillRect(infoX, energyY, infoWidth * energyPercent, energyHeight);
    
    ctx.fillStyle = '#a0aec0';
    ctx.font = `${9 * this.scale}px sans-serif`;
    ctx.fillText(`能量: ${Math.ceil(player.energy)}/${player.maxEnergy}`, infoX, energyY + energyHeight + 2);
  }

  private drawSkillBar(players: Player[]): void {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    
    const skillBarY = rect.height - 90 * this.scale;
    const skillSize = 48 * this.scale;
    const gap = 15 * this.scale;
    
    const skills = [
      { key: '普通射击', icon: '●', team: 'both' as const },
      { key: '特殊技能', icon: '★', team: 'both' as const },
      { key: '能量恢复', icon: '⚡', team: 'both' as const }
    ];
    
    const totalWidth = skills.length * skillSize + (skills.length - 1) * gap;
    const startX = (rect.width - totalWidth) / 2;
    
    const bluePlayer = players.find(p => p.team === 'blue');
    
    skills.forEach((skill, index) => {
      const x = startX + index * (skillSize + gap);
      const y = skillBarY;
      
      ctx.fillStyle = 'rgba(45, 55, 72, 0.5)';
      ctx.strokeStyle = 'rgba(58, 123, 213, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, skillSize, skillSize, 10);
      ctx.fill();
      ctx.stroke();
      
      let cooldownPercent = 0;
      let cooldownText = '';
      
      if (index === 0 && bluePlayer) {
        cooldownPercent = bluePlayer.shootCooldown / bluePlayer.shootCooldownMax;
        if (cooldownPercent > 0) {
          cooldownText = (bluePlayer.shootCooldown / 1000).toFixed(1);
        }
      } else if (index === 1 && bluePlayer) {
        cooldownPercent = bluePlayer.skillCooldown / bluePlayer.skillCooldownMax;
        if (cooldownPercent > 0) {
          cooldownText = Math.ceil(bluePlayer.skillCooldown / 1000).toString();
        }
      }
      
      const iconColor = index === 0 ? '#3182ce' : (index === 1 ? '#9f7aea' : '#ffd700');
      
      ctx.fillStyle = iconColor;
      ctx.font = `bold ${20 * this.scale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(skill.icon, x + skillSize / 2, y + skillSize / 2);
      
      if (cooldownPercent > 0) {
        ctx.fillStyle = 'rgba(200, 200, 200, 0.7)';
        ctx.beginPath();
        ctx.moveTo(x + skillSize / 2, y + skillSize / 2);
        ctx.arc(x + skillSize / 2, y + skillSize / 2, skillSize / 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cooldownPercent);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = `${14 * this.scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cooldownText, x + skillSize / 2, y + skillSize / 2);
      }
      
      ctx.fillStyle = '#a0aec0';
      ctx.font = `${11 * this.scale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(skill.key, x + skillSize / 2, y + skillSize + 5);
    });
    
    ctx.fillStyle = '#718096';
    ctx.font = `${10 * this.scale}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('蓝方: WASD移动 / 空格射击 / 回车技能', 20 * this.scale, rect.height - 25 * this.scale);
    
    ctx.textAlign = 'right';
    ctx.fillText('红方: 方向键移动 / Enter射击 / RCtrl技能', rect.width - 20 * this.scale, rect.height - 25 * this.scale);
  }

  drawGameOver(winner: 'red' | 'blue' | 'draw'): void {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    ctx.fillStyle = winner === 'red' ? '#e53e3e' : (winner === 'blue' ? '#3182ce' : '#ffd700');
    ctx.font = `bold ${48 * this.scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = winner === 'red' ? '#e53e3e' : (winner === 'blue' ? '#3182ce' : '#ffd700');
    ctx.shadowBlur = 20;
    
    const text = winner === 'draw' ? '平局！' : (winner === 'red' ? '红方胜利！' : '蓝方胜利！');
    ctx.fillText(text, rect.width / 2, rect.height / 2 - 30);
    
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#a0aec0';
    ctx.font = `${18 * this.scale}px sans-serif`;
    ctx.fillText('按 F5 重新开始', rect.width / 2, rect.height / 2 + 30);
  }

  getCellSize(): number {
    return this.cellSize;
  }

  getGridOffsetX(): number {
    return this.gridOffsetX;
  }

  getGridOffsetY(): number {
    return this.gridOffsetY;
  }
}

export function aabbCollide(a: AABB, b: AABB): boolean {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}
