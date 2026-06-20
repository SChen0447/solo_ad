import { ParticleType, PARTICLE_CONFIGS } from './particleTypes';

export class UIPanel {
  private container: HTMLDivElement;
  private iconElement: HTMLDivElement;
  private particleCountElement: HTMLDivElement;
  private fpsElement: HTMLDivElement;
  private typeNameElement: HTMLDivElement;
  private fpsHistory: number[] = [];
  private maxFpsHistory: number = 60;
  private glowAnimation: number = 0;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'ui-panel';
    this.applyPanelStyles();

    this.iconElement = document.createElement('div');
    this.iconElement.className = 'particle-icon';
    this.applyIconStyles();

    this.typeNameElement = document.createElement('div');
    this.typeNameElement.className = 'type-name';
    this.applyTypeNameStyles();

    this.particleCountElement = document.createElement('div');
    this.particleCountElement.className = 'particle-count';
    this.applyCountStyles();

    this.fpsElement = document.createElement('div');
    this.fpsElement.className = 'fps-display';
    this.applyFpsStyles();

    const hintElement = document.createElement('div');
    hintElement.className = 'hint-text';
    hintElement.textContent = '1-5 切换 · 左键释放 · 右键平移 · C清空';
    this.applyHintStyles(hintElement);

    this.container.appendChild(this.iconElement);
    this.container.appendChild(this.typeNameElement);
    this.container.appendChild(this.particleCountElement);
    this.container.appendChild(this.fpsElement);
    this.container.appendChild(hintElement);

    document.body.appendChild(this.container);

    this.updateParticleType(ParticleType.FIRE);
    this.animateGlow();
  }

  private applyPanelStyles(): void {
    const style = this.container.style;
    style.position = 'fixed';
    style.left = '24px';
    style.bottom = '24px';
    style.width = '160px';
    style.height = '160px';
    style.borderRadius = '50%';
    style.background = 'rgba(20, 20, 40, 0.55)';
    style.backdropFilter = 'blur(16px)';
    style.border = '1px solid rgba(255, 255, 255, 0.15)';
    style.display = 'flex';
    style.flexDirection = 'column';
    style.alignItems = 'center';
    style.justifyContent = 'center';
    style.zIndex = '1000';
    style.boxShadow = `
      0 8px 32px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1)
    `;
    style.color = '#fff';
    style.fontFamily = '"Segoe UI", system-ui, -apple-system, sans-serif';
    style.userSelect = 'none';
    style.overflow = 'hidden';
  }

  private applyIconStyles(): void {
    const style = this.iconElement.style;
    style.fontSize = '28px';
    style.width = '48px';
    style.height = '48px';
    style.display = 'flex';
    style.alignItems = 'center';
    style.justifyContent = 'center';
    style.borderRadius = '50%';
    style.background = 'rgba(255, 255, 255, 0.1)';
    style.marginBottom = '6px';
    style.transition = 'all 0.3s ease';
  }

  private applyTypeNameStyles(): void {
    const style = this.typeNameElement.style;
    style.fontSize = '12px';
    style.opacity = '0.8';
    style.marginBottom = '8px';
    style.fontWeight = '500';
    style.letterSpacing = '0.5px';
  }

  private applyCountStyles(): void {
    const style = this.particleCountElement.style;
    style.fontSize = '11px';
    style.opacity = '0.7';
    style.marginBottom = '2px';
  }

  private applyFpsStyles(): void {
    const style = this.fpsElement.style;
    style.fontSize = '11px';
    style.fontWeight = '600';
    style.opacity = '0.9';
  }

  private applyHintStyles(element: HTMLDivElement): void {
    const style = element.style;
    style.position = 'absolute';
    style.bottom = '-30px';
    style.left = '50%';
    style.transform = 'translateX(-50%)';
    style.fontSize = '10px';
    style.opacity = '0.5';
    style.whiteSpace = 'nowrap';
    style.color = '#fff';
    style.fontFamily = '"Segoe UI", system-ui, -apple-system, sans-serif';
  }

  private animateGlow = (): void => {
    this.glowAnimation += 0.02;
    const glow = 0.5 + Math.sin(this.glowAnimation) * 0.3;
    const type = this.typeNameElement.textContent || '火';
    const color = this.getTypeGlowColor(type as any);

    this.container.style.boxShadow = `
      0 8px 32px rgba(0, 0, 0, 0.3),
      0 0 ${20 + glow * 15}px ${color},
      inset 0 1px 0 rgba(255, 255, 255, 0.1)
    `;

    requestAnimationFrame(this.animateGlow);
  };

  private getTypeGlowColor(type: ParticleType): string {
    switch (type) {
      case ParticleType.FIRE:
        return 'rgba(255, 100, 0, 0.3)';
      case ParticleType.WATER:
        return 'rgba(30, 144, 255, 0.3)';
      case ParticleType.EARTH:
        return 'rgba(139, 69, 19, 0.2)';
      case ParticleType.PLANT:
        return 'rgba(50, 205, 50, 0.3)';
      case ParticleType.MAGIC:
        return 'rgba(153, 50, 204, 0.4)';
      default:
        return 'rgba(100, 100, 150, 0.3)';
    }
  }

  updateParticleType(type: ParticleType): void {
    const config = PARTICLE_CONFIGS[type];
    this.iconElement.textContent = config.iconSymbol;
    this.typeNameElement.textContent = config.displayName;
    this.iconElement.style.background = `${config.color}33`;
    this.iconElement.style.border = `1px solid ${config.color}66`;
  }

  updateParticleCount(count: number): void {
    this.particleCountElement.textContent = `粒子: ${count}`;
  }

  updateFPS(fps: number): void {
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > this.maxFpsHistory) {
      this.fpsHistory.shift();
    }

    const avgFps = Math.round(
      this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
    );

    this.fpsElement.textContent = `FPS: ${avgFps}`;

    if (avgFps >= 50) {
      this.fpsElement.style.color = '#4ade80';
    } else if (avgFps >= 30) {
      this.fpsElement.style.color = '#fbbf24';
    } else {
      this.fpsElement.style.color = '#f87171';
    }
  }

  dispose(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
