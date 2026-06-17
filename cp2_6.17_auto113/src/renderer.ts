import type { Note, JudgeResult, Song } from './noteManager';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

const TRACK_COLORS = ['#ff4757', '#3742fa', '#2ed573', '#ffa502'];
const NOTE_SIZE = 30;
const PARTICLE_LIFETIME = 300;

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private particles: Particle[] = [];
  private particlePool: Particle[] = [];
  private lastJudgeResult: JudgeResult | null = null;
  private judgeResultTimer = 0;
  private haloEffects: { x: number; y: number; life: number; maxLife: number; track: number }[] = [];
  private buttonHoverStates: Map<string, boolean> = new Map();
  private selectedSongIndex = 0;

  constructor(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.resize(canvas.width, canvas.height);
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  public clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private easeOutElastic(t: number): number {
    const p = 0.3;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
  }

  private drawRoundedRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  public drawBackground(scene: string): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    if (scene === 'start') {
      gradient.addColorStop(0, '#0f0f23');
      gradient.addColorStop(1, '#0a0a1a');
    } else {
      gradient.addColorStop(0, '#0a0a23');
      gradient.addColorStop(1, '#050515');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.strokeStyle = 'rgba(255, 107, 53, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      const y = (i / 20) * this.canvas.height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvas.width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(0, 210, 211, 0.05)';
    for (let i = 0; i < 20; i++) {
      const x = (i / 20) * this.canvas.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvas.height);
      ctx.stroke();
    }
  }

  public drawStartScreen(animationTime: number, hoverButton: boolean): void {
    const ctx = this.ctx;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    const pulseScale = 1 + Math.sin(animationTime / 500) * 0.05;
    ctx.save();
    ctx.translate(centerX, centerY - 80);
    ctx.scale(pulseScale, pulseScale);

    ctx.shadowColor = '#ff6b35';
    ctx.shadowBlur = 20;
    ctx.font = 'bold 72px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff6b35';
    ctx.fillText('节奏陷阱', 0, 0);
    ctx.shadowBlur = 0;
    ctx.restore();

    ctx.font = '18px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('使用 D F J K 键击打音符', centerX, centerY + 20);

    const btnWidth = 200;
    const btnHeight = 60;
    const btnX = centerX - btnWidth / 2;
    const btnY = centerY + 80;
    const btnScale = hoverButton ? 1.05 : 1;
    const easeScale = this.easeOutElastic(Math.min(1, (animationTime % 1000) / 300));
    const displayScale = btnScale + (easeScale - 1) * 0.1;

    ctx.save();
    ctx.translate(centerX, btnY + btnHeight / 2);
    ctx.scale(displayScale, displayScale);
    ctx.translate(-centerX, -(btnY + btnHeight / 2));

    ctx.shadowColor = hoverButton ? '#ff6b35' : 'rgba(255, 255, 255, 0.3)';
    ctx.shadowBlur = hoverButton ? 15 : 8;
    this.drawRoundedRect(btnX, btnY, btnWidth, btnHeight, 12);
    ctx.fillStyle = hoverButton ? '#ff6b35' : '#ffffff';
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font = 'bold 24px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = hoverButton ? '#ffffff' : '#0a0a23';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('开始游戏', centerX, btnY + btnHeight / 2);
    ctx.restore();

    this.buttonHoverStates.set('startBtn', hoverButton);
  }

  public isPointInStartButton(x: number, y: number): boolean {
    const centerX = this.canvas.width / 2;
    const btnWidth = 200;
    const btnHeight = 60;
    const btnX = centerX - btnWidth / 2;
    const btnY = this.canvas.height / 2 + 80;
    return x >= btnX && x <= btnX + btnWidth && y >= btnY && y <= btnY + btnHeight;
  }

  public drawSelectScreen(songs: Song[], selectedIndex: number, animationTime: number): void {
    this.selectedSongIndex = selectedIndex;
    const ctx = this.ctx;
    const centerX = this.canvas.width / 2;

    ctx.shadowColor = '#ff6b35';
    ctx.shadowBlur = 15;
    ctx.font = 'bold 48px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#ff6b35';
    ctx.textAlign = 'center';
    ctx.fillText('选择歌曲', centerX, 80);
    ctx.shadowBlur = 0;

    const cardWidth = 350;
    const cardHeight = 140;
    const cardSpacing = 40;
    const startY = 160;

    songs.forEach((song, index) => {
      const cardY = startY + index * (cardHeight + cardSpacing);
      const isSelected = index === selectedIndex;
      const hoverScale = isSelected ? 1.02 : 1;

      ctx.save();
      ctx.translate(centerX, cardY + cardHeight / 2);
      ctx.scale(hoverScale, hoverScale);
      ctx.translate(-centerX, -(cardY + cardHeight / 2));

      ctx.shadowColor = isSelected ? '#00d2d3' : 'rgba(255, 107, 53, 0.3)';
      ctx.shadowBlur = isSelected ? 20 : 10;
      this.drawRoundedRect(centerX - cardWidth / 2, cardY, cardWidth, cardHeight, 16);

      const gradient = ctx.createLinearGradient(centerX - cardWidth / 2, cardY, centerX + cardWidth / 2, cardY + cardHeight);
      gradient.addColorStop(0, isSelected ? 'rgba(0, 210, 211, 0.2)' : 'rgba(255, 107, 53, 0.1)');
      gradient.addColorStop(1, isSelected ? 'rgba(0, 210, 211, 0.05)' : 'rgba(255, 107, 53, 0.02)');
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = isSelected ? '#00d2d3' : 'rgba(255, 107, 53, 0.3)';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px "Segoe UI", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(song.title, centerX - cardWidth / 2 + 25, cardY + 45);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '16px "Segoe UI", "Microsoft YaHei", sans-serif';
      ctx.fillText(song.artist, centerX - cardWidth / 2 + 25, cardY + 75);

      const difficultyColors: Record<string, string> = { '简单': '#2ed573', '普通': '#ffa502', '困难': '#ff4757' };
      ctx.fillStyle = difficultyColors[song.difficulty] || '#ffffff';
      ctx.font = 'bold 14px "Segoe UI", "Microsoft YaHei", sans-serif';
      ctx.fillText(song.difficulty, centerX - cardWidth / 2 + 25, cardY + 105);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '14px "Segoe UI", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'right';
      const durationSec = Math.ceil(song.duration / 1000);
      ctx.fillText(`${durationSec}秒 | BPM ${song.bpm}`, centerX + cardWidth / 2 - 25, cardY + 105);

      if (isSelected) {
        const pulse = Math.sin(animationTime / 200) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(0, 210, 211, ${0.3 + pulse * 0.3})`;
        ctx.beginPath();
        ctx.arc(centerX + cardWidth / 2 - 40, cardY + 45, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '16px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('↑↓ 选择歌曲 | Enter 开始游戏 | 点击卡片选择', centerX, this.canvas.height - 40);
  }

  public isPointInSongCard(x: number, y: number, songs: Song[]): number {
    const centerX = this.canvas.width / 2;
    const cardWidth = 350;
    const cardHeight = 140;
    const cardSpacing = 40;
    const startY = 160;

    for (let i = 0; i < songs.length; i++) {
      const cardY = startY + i * (cardHeight + cardSpacing);
      if (x >= centerX - cardWidth / 2 && x <= centerX + cardWidth / 2 &&
          y >= cardY && y <= cardY + cardHeight) {
        return i;
      }
    }
    return -1;
  }

  public drawGameScreen(
    notes: Note[],
    score: number,
    combo: number,
    progress: number,
    judgeLineY: number
  ): void {
    const ctx = this.ctx;
    const trackWidth = this.canvas.width / 4;

    for (let i = 0; i < 4; i++) {
      const trackX = i * trackWidth;
      const gradient = ctx.createLinearGradient(trackX, 0, trackX, this.canvas.height);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.02)');
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
      ctx.fillStyle = gradient;
      ctx.fillRect(trackX, 0, trackWidth, this.canvas.height);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(trackX, 0);
      ctx.lineTo(trackX, this.canvas.height);
      ctx.stroke();
    }

    ctx.shadowColor = '#00d2d3';
    ctx.shadowBlur = 15;
    ctx.strokeStyle = 'rgba(0, 210, 211, 0.8)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, judgeLineY);
    ctx.lineTo(this.canvas.width, judgeLineY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(0, 210, 211, 0.1)';
    ctx.fillRect(0, judgeLineY - 2, this.canvas.width, 4);

    for (let i = 0; i < 4; i++) {
      const keyX = i * trackWidth + trackWidth / 2;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.arc(keyX, judgeLineY, NOTE_SIZE / 2 + 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = 'bold 20px "Segoe UI", sans-serif';
      ctx.fillStyle = TRACK_COLORS[i];
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(['D', 'F', 'J', 'K'][i], keyX, judgeLineY);
    }

    for (const note of notes) {
      const noteX = note.track * trackWidth + trackWidth / 2;
      const color = TRACK_COLORS[note.track];

      ctx.shadowColor = color;
      ctx.shadowBlur = 12;

      const gradient = ctx.createRadialGradient(noteX, note.y, 0, noteX, note.y, NOTE_SIZE / 2);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.3, color);
      gradient.addColorStop(1, color);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(noteX, note.y, NOTE_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    for (const halo of this.haloEffects) {
      const progress = halo.life / halo.maxLife;
      const radius = NOTE_SIZE * (1 + (1 - progress) * 2);
      const alpha = progress * 0.6;

      ctx.shadowColor = TRACK_COLORS[halo.track];
      ctx.shadowBlur = 20 * progress;
      ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
      ctx.lineWidth = 3 * progress;
      ctx.beginPath();
      ctx.arc(halo.x, halo.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    this.drawParticles();

    const progressBarWidth = this.canvas.width * 0.8;
    const progressBarHeight = 8;
    const progressBarX = (this.canvas.width - progressBarWidth) / 2;
    const progressBarY = 30;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    this.drawRoundedRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight, 4);
    ctx.fill();

    const progressGradient = ctx.createLinearGradient(progressBarX, progressBarY, progressBarX + progressBarWidth, progressBarY);
    progressGradient.addColorStop(0, '#2ed573');
    progressGradient.addColorStop(0.5, '#ffa502');
    progressGradient.addColorStop(1, '#ff4757');
    ctx.fillStyle = progressGradient;
    this.drawRoundedRect(progressBarX, progressBarY, progressBarWidth * progress, progressBarHeight, 4);
    ctx.fill();

    ctx.font = 'bold 24px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(`分数: ${Math.floor(score)}`, 30, 65);

    if (combo > 0) {
      ctx.shadowColor = '#ff6b35';
      ctx.shadowBlur = 10;
      ctx.font = 'bold 28px "Segoe UI", sans-serif';
      ctx.fillStyle = '#ff6b35';
      ctx.textAlign = 'right';
      ctx.fillText(`${combo} COMBO`, this.canvas.width - 30, 65);
      ctx.shadowBlur = 0;
    }

    if (this.lastJudgeResult && this.judgeResultTimer > 0) {
      const alpha = Math.min(1, this.judgeResultTimer / 500);
      const yOffset = (1 - alpha) * 20;
      const judgeTexts: Record<string, string> = { perfect: 'PERFECT', good: 'GOOD', miss: 'MISS' };
      const judgeColors: Record<string, string> = { perfect: '#ffd700', good: '#c0c0c0', miss: '#808080' };

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = judgeColors[this.lastJudgeResult.type];
      ctx.shadowBlur = 20;
      ctx.font = 'bold 36px "Segoe UI", sans-serif';
      ctx.fillStyle = judgeColors[this.lastJudgeResult.type];
      ctx.textAlign = 'center';
      ctx.fillText(judgeTexts[this.lastJudgeResult.type], this.canvas.width / 2, 100 - yOffset);
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  public drawResultScreen(
    score: number,
    maxCombo: number,
    perfect: number,
    good: number,
    miss: number,
    grade: string,
    animationTime: number
  ): void {
    const ctx = this.ctx;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    const fadeIn = Math.min(1, animationTime / 1000);
    ctx.globalAlpha = fadeIn;

    ctx.shadowColor = '#ff6b35';
    ctx.shadowBlur = 20;
    ctx.font = 'bold 56px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#ff6b35';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', centerX, 80);
    ctx.shadowBlur = 0;

    const gradeX = centerX;
    const gradeY = centerY - 100;
    const gradeRotation = Math.sin(animationTime / 1000) * 0.1;

    ctx.save();
    ctx.translate(gradeX, gradeY);
    ctx.rotate(gradeRotation);

    const gradeGradient = ctx.createLinearGradient(-60, -60, 60, 60);
    gradeGradient.addColorStop(0, '#ffd700');
    gradeGradient.addColorStop(0.3, '#ffec8b');
    gradeGradient.addColorStop(0.5, '#ffd700');
    gradeGradient.addColorStop(0.7, '#daa520');
    gradeGradient.addColorStop(1, '#ffd700');

    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 30;
    ctx.font = 'bold 120px "Segoe UI", sans-serif';
    ctx.fillStyle = gradeGradient;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(grade, 0, 0);
    ctx.shadowBlur = 0;
    ctx.restore();

    ctx.font = 'bold 32px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`最终得分: ${Math.floor(score)}`, centerX, centerY + 20);

    ctx.font = '24px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#ff6b35';
    ctx.fillText(`最大连击: ${maxCombo}`, centerX, centerY + 65);

    const totalNotes = perfect + good + miss;
    const perfectRate = totalNotes > 0 ? (perfect / totalNotes) * 100 : 0;
    const goodRate = totalNotes > 0 ? (good / totalNotes) * 100 : 0;
    const missRate = totalNotes > 0 ? (miss / totalNotes) * 100 : 0;

    const barWidth = 300;
    const barHeight = 30;
    const barX = centerX - barWidth / 2;
    const barY = centerY + 110;
    const barSpacing = 15;

    this.drawJudgeBar(barX, barY, barWidth, barHeight, perfect, perfectRate, '#ffd700', 'PERFECT');
    this.drawJudgeBar(barX, barY + barHeight + barSpacing, barWidth, barHeight, good, goodRate, '#c0c0c0', 'GOOD');
    this.drawJudgeBar(barX, barY + (barHeight + barSpacing) * 2, barWidth, barHeight, miss, missRate, '#808080', 'MISS');

    const btnWidth = 220;
    const btnHeight = 55;
    const btnX = centerX - btnWidth / 2;
    const btnY = centerY + 220;
    const hoverBtn = this.buttonHoverStates.get('backBtn') || false;
    const btnScale = hoverBtn ? 1.05 : 1;

    ctx.save();
    ctx.translate(centerX, btnY + btnHeight / 2);
    ctx.scale(btnScale, btnScale);
    ctx.translate(-centerX, -(btnY + btnHeight / 2));

    ctx.shadowColor = hoverBtn ? '#ff6b35' : 'rgba(255, 255, 255, 0.3)';
    ctx.shadowBlur = hoverBtn ? 15 : 8;
    this.drawRoundedRect(btnX, btnY, btnWidth, btnHeight, 12);
    ctx.fillStyle = hoverBtn ? '#ff6b35' : '#ffffff';
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font = 'bold 22px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = hoverBtn ? '#ffffff' : '#0a0a23';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('返回选歌', centerX, btnY + btnHeight / 2);
    ctx.restore();

    ctx.globalAlpha = 1;
  }

  private drawJudgeBar(x: number, y: number, width: number, height: number, count: number, rate: number, color: string, label: string): void {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.drawRoundedRect(x, y, width, height, 6);
    ctx.fill();

    const fillGradient = ctx.createLinearGradient(x, y, x + width * (rate / 100), y);
    fillGradient.addColorStop(0, color);
    fillGradient.addColorStop(1, color + '80');
    ctx.fillStyle = fillGradient;
    this.drawRoundedRect(x, y, width * (rate / 100), height, 6);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 16px "Segoe UI", sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + 10, y + height / 2);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText(`${count} (${rate.toFixed(1)}%)`, x + width - 10, y + height / 2);
  }

  public isPointInBackButton(x: number, y: number): boolean {
    const centerX = this.canvas.width / 2;
    const btnWidth = 220;
    const btnHeight = 55;
    const btnX = centerX - btnWidth / 2;
    const btnY = this.canvas.height / 2 + 220;
    return x >= btnX && x <= btnX + btnWidth && y >= btnY && y <= btnY + btnHeight;
  }

  public setButtonHover(buttonId: string, hover: boolean): void {
    this.buttonHoverStates.set(buttonId, hover);
  }

  public spawnParticles(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 2 + Math.random() * 3;
      const particle = this.getParticleFromPool();
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.color = color;
      particle.life = PARTICLE_LIFETIME;
      particle.maxLife = PARTICLE_LIFETIME;
      particle.size = 4 + Math.random() * 4;
      this.particles.push(particle);
    }
  }

  private getParticleFromPool(): Particle {
    if (this.particlePool.length > 0) {
      return this.particlePool.pop()!;
    }
    return { x: 0, y: 0, vx: 0, vy: 0, color: '#ffffff', life: 0, maxLife: 0, size: 0 };
  }

  public updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.particlePool.push(this.particles.splice(i, 1)[0]);
      }
    }

    for (let i = this.haloEffects.length - 1; i >= 0; i--) {
      this.haloEffects[i].life -= deltaTime;
      if (this.haloEffects[i].life <= 0) {
        this.haloEffects.splice(i, 1);
      }
    }

    if (this.judgeResultTimer > 0) {
      this.judgeResultTimer -= deltaTime;
    }
  }

  private drawParticles(): void {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  public spawnHalo(x: number, y: number, track: number): void {
    this.haloEffects.push({ x, y, life: 400, maxLife: 400, track });
  }

  public showJudgeResult(result: JudgeResult): void {
    this.lastJudgeResult = result;
    this.judgeResultTimer = 800;
  }
}
