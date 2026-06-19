export class AnimationManager {
  private activeAnimations: Map<string, number> = new Map();

  public playFillAnimation(
    onUpdate: (progress: number) => void,
    duration: number = 200
  ): Promise<void> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const animId = `fill-${Date.now()}-${Math.random()}`;

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        onUpdate(eased);

        if (progress < 1) {
          this.activeAnimations.set(animId, requestAnimationFrame(animate));
        } else {
          this.activeAnimations.delete(animId);
          resolve();
        }
      };

      this.activeAnimations.set(animId, requestAnimationFrame(animate));
    });
  }

  public playNumberFadeIn(
    onUpdate: (opacity: number) => void,
    duration: number = 300
  ): Promise<void> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const animId = `fade-${Date.now()}-${Math.random()}`;

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        onUpdate(progress);

        if (progress < 1) {
          this.activeAnimations.set(animId, requestAnimationFrame(animate));
        } else {
          this.activeAnimations.delete(animId);
          resolve();
        }
      };

      this.activeAnimations.set(animId, requestAnimationFrame(animate));
    });
  }

  public playErrorFlash(
    onUpdate: (opacity: number) => void,
    duration: number = 500
  ): Promise<void> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const animId = `flash-${Date.now()}-${Math.random()}`;

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = elapsed / duration;

        let opacity: number;
        if (progress < 0.2) {
          opacity = progress / 0.2;
        } else if (progress < 0.8) {
          opacity = 1;
        } else {
          opacity = 1 - (progress - 0.8) / 0.2;
        }

        onUpdate(Math.max(0, Math.min(1, opacity)));

        if (progress < 1) {
          this.activeAnimations.set(animId, requestAnimationFrame(animate));
        } else {
          this.activeAnimations.delete(animId);
          resolve();
        }
      };

      this.activeAnimations.set(animId, requestAnimationFrame(animate));
    });
  }

  public cancelAll(): void {
    for (const [, frameId] of this.activeAnimations) {
      cancelAnimationFrame(frameId);
    }
    this.activeAnimations.clear();
  }
}
