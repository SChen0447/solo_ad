export class AnimationRunner {
  private rafId: number | null = null;
  private startTimestamp = 0;

  constructor(
    private onTick: (currentTime: number) => void,
    private onEnd: () => void,
  ) {}

  start(totalDuration: number) {
    this.stop();
    this.startTimestamp = performance.now();
    const tick = () => {
      const elapsed = performance.now() - this.startTimestamp;
      if (elapsed >= totalDuration) {
        this.onTick(totalDuration);
        this.onEnd();
        this.stop();
        return;
      }
      this.onTick(elapsed);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  destroy() {
    this.stop();
  }
}
