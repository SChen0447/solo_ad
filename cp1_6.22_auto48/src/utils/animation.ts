export function generateNodeEnterKeyframes(): string {
  return `
    @keyframes nodeEnter {
      0% {
        opacity: 0;
        transform: translateY(20px) scale(0.9);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `;
}

export function generatePulseKeyframes(): string {
  return `
    @keyframes pulseRing {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(90, 103, 216, 0.3);
        transform: scale(1);
      }
      50% {
        box-shadow: 0 0 0 8px rgba(90, 103, 216, 0.6);
        transform: scale(1.05);
      }
    }
  `;
}

export function generateFadeInKeyframes(): string {
  return `
    @keyframes fadeIn {
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    }
  `;
}

export function generateSlideInKeyframes(): string {
  return `
    @keyframes slideIn {
      0% {
        opacity: 0;
        transform: translateX(-20px);
      }
      100% {
        opacity: 1;
        transform: translateX(0);
      }
    }
  `;
}

export function injectKeyframes(): void {
  const existingStyle = document.getElementById('animation-keyframes');
  if (existingStyle) return;

  const style = document.createElement('style');
  style.id = 'animation-keyframes';
  style.textContent = `
    ${generateNodeEnterKeyframes()}
    ${generatePulseKeyframes()}
    ${generateFadeInKeyframes()}
    ${generateSlideInKeyframes()}
  `;
  document.head.appendChild(style);
}

export class FPSMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 0;
  private callback: ((fps: number) => void) | null = null;
  private animationId: number | null = null;
  private running = false;

  constructor(callback?: (fps: number) => void) {
    if (callback) {
      this.callback = callback;
    }
  }

  private loop = (): void => {
    if (!this.running) return;

    this.frameCount++;
    const now = performance.now();
    const delta = now - this.lastTime;

    if (delta >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / delta);
      this.frameCount = 0;
      this.lastTime = now;
      if (this.callback) {
        this.callback(this.fps);
      }
    }

    this.animationId = requestAnimationFrame(this.loop);
  };

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.animationId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  getFPS(): number {
    return this.fps;
  }
}

export class ParticleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;
  }> = [];
  private animationId: number | null = null;
  private running = false;
  private particleCount: number;
  private lastFrameTime = 0;
  private frameInterval = 1000 / 30;

  constructor(canvas: HTMLCanvasElement, particleCount = 50) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.particleCount = particleCount;
    this.initParticles();
  }

  private initParticles(): void {
    const { width, height } = this.canvas;
    this.particles = Array.from({ length: this.particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: 2 + Math.random() * 4,
      opacity: 0.05 + Math.random() * 0.05,
    }));
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.initParticles();
  }

  private update = (timestamp: number): void => {
    if (!this.running) return;

    const delta = timestamp - this.lastFrameTime;
    if (delta < this.frameInterval) {
      this.animationId = requestAnimationFrame(this.update);
      return;
    }
    this.lastFrameTime = timestamp;

    const { width, height } = this.canvas;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);

    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
      ctx.fill();
    }

    this.animationId = requestAnimationFrame(this.update);
  };

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = performance.now();
    this.animationId = requestAnimationFrame(this.update);
  }

  stop(): void {
    this.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

export function useInViewAnimation(
  element: HTMLElement | null,
  onEnter: () => void
): () => void {
  if (!element) return () => {};

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          onEnter();
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  observer.observe(element);
  return () => observer.disconnect();
}
