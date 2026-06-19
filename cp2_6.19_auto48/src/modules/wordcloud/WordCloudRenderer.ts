import type { WordData } from '../../types';

interface AnimatedWord extends WordData {
  targetFontSize: number;
  currentFontSize: number;
  opacity: number;
  targetOpacity: number;
  scalePulse: number;
  pulseDirection: number;
  isNew: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export class WordCloudRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private words: AnimatedWord[] = [];
  private particles: Particle[] = [];
  private animationId: number | null = null;
  private backgroundColor: string = '#ffffff';
  private isClearing: boolean = false;
  private clearProgress: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取Canvas 2D上下文');
    }
    this.ctx = ctx;
  }

  setBackgroundColor(color: string): void {
    this.backgroundColor = color;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  updateWords(newWords: WordData[]): void {
    const existingMap = new Map<string, AnimatedWord>();
    this.words.forEach((w) => existingMap.set(w.text, w));

    const result: AnimatedWord[] = [];

    for (const word of newWords) {
      const existing = existingMap.get(word.text);
      
      if (existing) {
        const weightIncreased = word.weight > existing.weight;
        
        result.push({
          ...word,
          targetFontSize: word.fontSize,
          currentFontSize: existing.currentFontSize,
          opacity: existing.opacity,
          targetOpacity: 1,
          scalePulse: weightIncreased ? 1.2 : 1,
          pulseDirection: weightIncreased ? -1 : 0,
          isNew: false
        });
      } else {
        result.push({
          ...word,
          targetFontSize: word.fontSize,
          currentFontSize: 0,
          opacity: 0,
          targetOpacity: 1,
          scalePulse: 1,
          pulseDirection: 0,
          isNew: true
        });
      }
    }

    this.words = result;
    this.isClearing = false;
    this.clearProgress = 0;
    this.startAnimation();
  }

  clearWithAnimation(): void {
    this.isClearing = true;
    this.clearProgress = 0;
    this.startAnimation();
  }

  private startAnimation(): void {
    if (this.animationId === null) {
      this.animate();
    }
  }

  private animate = (): void => {
    let needsNextFrame = false;

    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.isClearing) {
      this.clearProgress += 0.02;
      
      if (this.clearProgress < 1) {
        this.generateClearParticles();
        needsNextFrame = true;
      } else {
        this.words = [];
        this.particles = [];
        this.isClearing = false;
        this.animationId = null;
        return;
      }
    }

    for (const word of this.words) {
      if (word.isNew && word.opacity < word.targetOpacity) {
        word.opacity += 1 / 36;
        word.currentFontSize += word.targetFontSize / 36;
        
        if (word.opacity >= word.targetOpacity) {
          word.opacity = word.targetOpacity;
          word.currentFontSize = word.targetFontSize;
          word.isNew = false;
        }
        needsNextFrame = true;
      }

      if (Math.abs(word.currentFontSize - word.targetFontSize) > 0.1) {
        const diff = word.targetFontSize - word.currentFontSize;
        word.currentFontSize += diff * 0.1;
        needsNextFrame = true;
      }

      if (word.scalePulse !== 1) {
        word.scalePulse += word.pulseDirection * 0.05;
        if (word.scalePulse <= 1) {
          word.scalePulse = 1;
          word.pulseDirection = 0;
        }
        needsNextFrame = true;
      }
    }

    this.words.forEach((word) => {
      const opacity = this.isClearing 
        ? Math.max(0, 1 - this.clearProgress * 1.5) 
        : word.opacity;
      
      if (opacity > 0) {
        this.drawWord(word, opacity);
      }
    });

    this.updateParticles();
    this.drawParticles();
    
    if (this.particles.length > 0) {
      needsNextFrame = true;
    }

    if (needsNextFrame) {
      this.animationId = requestAnimationFrame(this.animate);
    } else {
      this.animationId = null;
    }
  };

  private drawWord(word: AnimatedWord, opacity: number): void {
    const fontSize = word.currentFontSize * word.scalePulse;
    
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.fillStyle = word.color;
    this.ctx.font = `bold ${fontSize}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    this.ctx.translate(word.x, word.y);
    this.ctx.rotate((word.rotation * Math.PI) / 180);
    this.ctx.fillText(word.text, 0, 0);

    this.ctx.restore();
  }

  private generateClearParticles(): void {
    if (this.clearProgress < 0.8 && Math.random() > 0.3) {
      const word = this.words[Math.floor(Math.random() * this.words.length)];
      if (word) {
        for (let i = 0; i < 3; i++) {
          this.particles.push({
            x: word.x + (Math.random() - 0.5) * 50,
            y: word.y + (Math.random() - 0.5) * 30,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4 - 1,
            life: 1,
            maxLife: 1,
            color: word.color,
            size: Math.random() * 4 + 2
          });
        }
      }
    }
  }

  private updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life -= 0.02;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private drawParticles(): void {
    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.globalAlpha = p.life / p.maxLife;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  addRocketParticles(startX: number, startY: number, endX: number, endY: number): void {
    const duration = 500;
    const startTime = performance.now();

    const animateRocket = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const currentX = startX + (endX - startX) * easeProgress;
      const currentY = startY + (endY - startY) * easeProgress;

      for (let i = 0; i < 3; i++) {
        this.particles.push({
          x: currentX + (Math.random() - 0.5) * 10,
          y: currentY + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 2 - (endX - startX) * 0.01,
          vy: (Math.random() - 0.5) * 2 - (endY - startY) * 0.01,
          life: 1,
          maxLife: 1,
          color: '#ff6b6b',
          size: Math.random() * 3 + 2
        });
      }

      if (progress < 1) {
        requestAnimationFrame(animateRocket);
      }

      this.startAnimation();
    };

    animateRocket();
  }

  exportPNG(): string {
    return this.canvas.toDataURL('image/png');
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  destroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.words = [];
    this.particles = [];
  }
}
