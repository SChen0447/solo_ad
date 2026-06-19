interface Animation {
  id: string;
  startTime: number;
  duration: number;
  onUpdate: (progress: number, elapsed: number) => void;
  onComplete?: () => void;
  completed: boolean;
}

export class AnimationManager {
  private animations: Map<string, Animation> = new Map();
  private rafId: number | null = null;
  private running: boolean = false;

  private tick = (now: number): void => {
    if (!this.running) return;

    const toRemove: string[] = [];

    this.animations.forEach((anim, id) => {
      if (anim.completed) {
        toRemove.push(id);
        return;
      }

      const elapsed = now - anim.startTime;
      const progress = Math.min(1, elapsed / anim.duration);

      anim.onUpdate(progress, elapsed);

      if (progress >= 1) {
        anim.completed = true;
        anim.onComplete?.();
        toRemove.push(id);
      }
    });

    toRemove.forEach(id => this.animations.delete(id));

    if (this.animations.size > 0) {
      this.rafId = requestAnimationFrame(this.tick);
    } else {
      this.running = false;
      this.rafId = null;
    }
  };

  private ensureRunning(): void {
    if (!this.running && this.animations.size > 0 && this.rafId === null) {
      this.running = true;
      this.rafId = requestAnimationFrame(this.tick);
    }
  }

  playFillAnimation(
    id: string,
    duration: number,
    onUpdate: (progress: number) => void,
    onComplete?: () => void
  ): Promise<void> {
    return new Promise((resolve) => {
      const start = performance.now();
      const anim: Animation = {
        id,
        startTime: start,
        duration,
        onUpdate: (progress => {
          onUpdate(progress);
        }),
        onComplete: () => {
          onComplete?.();
          resolve();
        },
        completed: false
      };
      this.animations.set(id, anim);
      this.ensureRunning();
    });
  }

  playNumberFadeIn(
    id: string,
    duration: number,
    onUpdate: (alpha: number) => void,
    onComplete?: () => void
  ): Promise<void> {
    return new Promise((resolve) => {
      const start = performance.now();
      const anim: Animation = {
        id,
        startTime: start,
        duration,
        onUpdate: (progress) => {
          onUpdate(progress);
        },
        onComplete: () => {
          onComplete?.();
          resolve();
        },
        completed: false
      };
      this.animations.set(id, anim);
      this.ensureRunning();
    });
  }

  playBorderFlash(
    id: string,
    duration: number,
    onUpdate: (intensity: number) => void,
    onComplete?: () => void
  ): Promise<void> {
    return new Promise((resolve) => {
      const start = performance.now();
      const anim: Animation = {
        id,
        startTime: start,
        duration,
        onUpdate: (progress) => {
          const intensity = Math.sin(progress * Math.PI * 4) * 0.5 + 0.5;
          onUpdate(intensity);
        },
        onComplete: () => {
          onComplete?.();
          resolve();
        },
        completed: false
      };
      this.animations.set(id, anim);
      this.ensureRunning();
    });
  }

  playFadeTransition(
    id: string,
    duration: number,
    onUpdate: (alpha: number) => void,
    onComplete?: () => void
  ): Promise<void> {
    return new Promise((resolve) => {
      const start = performance.now();
      const anim: Animation = {
        id,
        startTime: start,
        duration,
        onUpdate: (progress) => {
          onUpdate(progress);
        },
        onComplete: () => {
          onComplete?.();
          resolve();
        },
        completed: false
      };
      this.animations.set(id, anim);
      this.ensureRunning();
    });
  }

  cancel(id: string): void {
    this.animations.delete(id);
  }

  cancelAll(): void {
    this.animations.clear();
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.running = false;
  }

  destroy(): void {
    this.cancelAll();
  }
}
