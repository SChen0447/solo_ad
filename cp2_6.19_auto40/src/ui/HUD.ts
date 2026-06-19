export class HUD {
  score = 0;
  collectibleCount = 0;
  totalCollectibles = 5;
  energyRatio = 1;
  energyFull = false;
  showTutorial = true;
  private tutorialTimer = 0;
  private readonly TUTORIAL_DURATION = 600;

  private pulsePhase = 0;

  update(): void {
    this.pulsePhase += 0.05;
    if (this.showTutorial) {
      this.tutorialTimer++;
      if (this.tutorialTimer > this.TUTORIAL_DURATION) {
        this.showTutorial = false;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, canvasW: number, _canvasH: number): void {
    ctx.save();
    ctx.font = '16px monospace';

    const x = 20;
    let y = 30;

    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'top';
    ctx.fillText(`SCORE: ${this.score}`, x, y);
    y += 28;

    this.drawCollectibleCounter(ctx, x, y);
    y += 28;

    this.drawEnergyBar(ctx, x, y);

    if (this.showTutorial) {
      this.drawTutorial(ctx, canvasW);
    }

    ctx.restore();
  }

  private drawCollectibleCounter(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = '#00e5ff';
    this.drawMiniStar(ctx, x + 8, y + 8, 5, 7, 3);
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(`x ${this.collectibleCount} / ${this.totalCollectibles}`, x + 22, y);
  }

  private drawMiniStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, points: number, outer: number, inner: number): void {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  private drawEnergyBar(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const barW = 140;
    const barH = 14;
    const label = 'REWIND';

    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(label, x, y - 1);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x + 60, y, barW, barH);

    ctx.strokeStyle = '#4a4a6a';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 60, y, barW, barH);

    const fillW = barW * this.energyRatio;
    if (this.energyFull) {
      const pulse = 0.7 + Math.sin(this.pulsePhase) * 0.3;
      const gradient = ctx.createLinearGradient(x + 60, 0, x + 60 + fillW, 0);
      gradient.addColorStop(0, `rgba(255, 215, 0, ${pulse})`);
      gradient.addColorStop(0.5, `rgba(255, 236, 100, ${pulse})`);
      gradient.addColorStop(1, `rgba(255, 215, 0, ${pulse})`);
      ctx.fillStyle = gradient;
    } else {
      const gradient = ctx.createLinearGradient(x + 60, 0, x + 60 + fillW, 0);
      gradient.addColorStop(0, '#7c3aed');
      gradient.addColorStop(0.5, '#a855f7');
      gradient.addColorStop(1, '#c084fc');
      ctx.fillStyle = gradient;
    }
    ctx.fillRect(x + 60, y, fillW, barH);

    if (this.energyFull) {
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.sin(this.pulsePhase * 2) * 0.2;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(x + 60, y, fillW, barH);
      ctx.restore();
    }
  }

  private drawTutorial(ctx: CanvasRenderingContext2D, canvasW: number): void {
    const lines = [
      '← → / A D : Move',
      'SPACE / W / ↑ : Jump (hold = higher)',
      'Z : Time Rewind',
      'Collect all shards to activate the goal!',
    ];

    const alpha = this.tutorialTimer < this.TUTORIAL_DURATION - 60
      ? 1
      : (this.TUTORIAL_DURATION - this.tutorialTimer) / 60;

    ctx.save();
    ctx.globalAlpha = alpha * 0.85;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    const padding = 12;
    const lineH = 22;
    const boxW = 320;
    const boxH = lines.length * lineH + padding * 2;
    const boxX = canvasW / 2 - boxW / 2;
    const boxY = 60;

    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#4a4a6a';
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.globalAlpha = alpha;
    ctx.font = '13px monospace';
    ctx.fillStyle = '#e2e8f0';
    ctx.textBaseline = 'top';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], boxX + padding, boxY + padding + i * lineH);
    }

    ctx.restore();
  }

  drawVictory(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number, victoryTimer: number): void {
    ctx.save();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvasW, canvasH);

    if (victoryTimer < 120) {
      const count = Math.min(victoryTimer * 2, 100);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        const px = canvasW / 2 + Math.cos(angle) * speed * victoryTimer * 0.5;
        const py = canvasH / 2 + Math.sin(angle) * speed * victoryTimer * 0.3;
        const alpha = Math.max(0, 1 - victoryTimer / 120);
        const size = 2 + Math.random() * 4;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = ['#ffd700', '#ffec6e', '#ff9100', '#ffe082'][Math.floor(Math.random() * 4)];
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    const textT = Math.min(victoryTimer / 40, 1);
    const scale = 0.3 + textT * 0.7;
    const alpha = textT;

    ctx.globalAlpha = alpha;
    ctx.font = `bold ${Math.floor(48 * scale)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 20 + Math.sin(victoryTimer * 0.05) * 10;
    ctx.fillText('时光掌握者', canvasW / 2, canvasH / 2);

    ctx.restore();
  }
}
