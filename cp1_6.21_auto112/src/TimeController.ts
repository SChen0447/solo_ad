import * as TWEEN from '@tweenjs/tween.js';

type UpdateEventHandler = (date: string) => void;
type PlayEventHandler = (playing: boolean) => void;

export class TimeController {
  private track: HTMLElement;
  private thumb: HTMLElement;
  private progress: HTMLElement;
  private label: HTMLElement;
  private playBtn: HTMLElement;
  private playIcon: HTMLElement;
  private pauseIcon: HTMLElement;

  private dates: string[] = [];
  private currentIndex: number = 0;
  private thumbPosition: number = 0;

  private isPlaying: boolean = false;
  private playAccumulator: number = 0;
  private lastFrameTime: number = 0;

  private isDragging: boolean = false;
  private touchIdentifier: number | null = null;

  private updateHandlers: UpdateEventHandler[] = [];
  private playHandlers: PlayEventHandler[] = [];
  private rafId: number = 0;

  private PLAY_SPEED_DAYS_PER_SECOND: number = 1;
  private PLAY_FRAME_INTERVAL: number = 1000;

  constructor() {
    this.track = document.getElementById('sliderTrack')!;
    this.thumb = document.getElementById('sliderThumb')!;
    this.progress = document.getElementById('sliderProgress')!;
    this.label = document.getElementById('timeLabel')!;
    this.playBtn = document.getElementById('playBtn')!;
    this.playIcon = document.getElementById('playIcon')!;
    this.pauseIcon = document.getElementById('pauseIcon')!;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.playBtn.addEventListener('click', this.togglePlay.bind(this));

    this.track.addEventListener('mousedown', this.onTrackMouseDown.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));

    this.track.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
    document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: true });
    document.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: true });
    document.addEventListener('touchcancel', this.onTouchEnd.bind(this), { passive: true });
  }

  public setDates(dates: string[]): void {
    this.dates = dates;
    this.currentIndex = 0;
    this.thumbPosition = 0;
    this.updateUIFromIndex(false);
  }

  public getCurrentDate(): string {
    return this.dates[this.currentIndex] || '';
  }

  public getCurrentIndex(): number {
    return this.currentIndex;
  }

  public getDates(): string[] {
    return this.dates.slice();
  }

  public setDate(date: string, animate: boolean = true): void {
    const idx = this.dates.indexOf(date);
    if (idx === -1) return;
    this.setIndex(idx, animate);
  }

  public setIndex(index: number, animate: boolean = true): void {
    const newIndex = Math.max(0, Math.min(this.dates.length - 1, index));
    if (newIndex === this.currentIndex && !animate) {
      this.updateUIFromIndex(false);
      return;
    }

    if (animate) {
      this.animateThumbToIndex(newIndex);
    } else {
      this.currentIndex = newIndex;
      this.updateUIFromIndex(false);
      this.emitUpdate();
    }
  }

  private animateThumbToIndex(targetIndex: number): void {
    const startIndex = this.currentIndex;
    const startPos = this.indexToPosition(startIndex);
    const endPos = this.indexToPosition(targetIndex);

    const anim = { t: 0 };
    new TWEEN.Tween(anim)
      .to({ t: 1 }, 500)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        const t = anim.t;
        const curPos = startPos + (endPos - startPos) * t;
        this.thumbPosition = curPos;
        this.setThumbPosition(curPos, false);
        const idx = this.positionToIndex(curPos);
        if (idx !== this.currentIndex) {
          this.currentIndex = idx;
          this.emitUpdate();
        }
      })
      .onComplete(() => {
        this.currentIndex = targetIndex;
        this.thumbPosition = endPos;
        this.updateUIFromIndex(false);
        this.emitUpdate();
      })
      .start();
  }

  private indexToPosition(index: number): number {
    if (this.dates.length <= 1) return 0;
    return index / (this.dates.length - 1);
  }

  private positionToIndex(pos: number): number {
    if (this.dates.length <= 1) return 0;
    return Math.round(pos * (this.dates.length - 1));
  }

  private onTrackMouseDown(e: MouseEvent): void {
    e.preventDefault();
    this.isDragging = true;
    this.pauseIfPlaying();
    const rect = this.track.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const rel = Math.max(0, Math.min(1, x / rect.width));
    this.setThumbFromRelative(rel);
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    const rect = this.track.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const rel = Math.max(0, Math.min(1, x / rect.width));
    this.setThumbFromRelative(rel);
  }

  private onMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
    }
  }

  private onTouchStart(e: TouchEvent): void {
    if (this.isDragging) return;
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    this.touchIdentifier = touch.identifier;
    this.isDragging = true;
    this.pauseIfPlaying();
    const rect = this.track.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const rel = Math.max(0, Math.min(1, x / rect.width));
    this.setThumbFromRelative(rel);
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.isDragging || this.touchIdentifier === null) return;
    let touch: Touch | null = null;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === this.touchIdentifier) {
        touch = e.touches[i];
        break;
      }
    }
    if (!touch) return;
    const rect = this.track.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const rel = Math.max(0, Math.min(1, x / rect.width));
    this.setThumbFromRelative(rel);
  }

  private onTouchEnd(e: TouchEvent): void {
    if (!this.isDragging || this.touchIdentifier === null) return;
    let stillActive = false;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === this.touchIdentifier) {
        stillActive = true;
        break;
      }
    }
    if (!stillActive) {
      this.isDragging = false;
      this.touchIdentifier = null;
    }
  }

  private setThumbFromRelative(rel: number): void {
    this.thumbPosition = rel;
    const newIdx = this.positionToIndex(rel);
    this.setThumbPosition(rel, false);
    if (newIdx !== this.currentIndex) {
      this.currentIndex = newIdx;
      this.updateLabel();
      this.emitUpdate();
    } else {
      this.updateLabel();
    }
  }

  private setThumbPosition(pos: number, _snap: boolean): void {
    const pct = (pos * 100).toFixed(3) + '%';
    this.thumb.style.left = pct;
    this.progress.style.width = pct;
  }

  private updateUIFromIndex(_animate: boolean): void {
    const pos = this.indexToPosition(this.currentIndex);
    this.thumbPosition = pos;
    this.setThumbPosition(pos, false);
    this.updateLabel();
  }

  private updateLabel(): void {
    const date = this.dates[this.currentIndex];
    if (date) {
      this.label.textContent = this.formatDate(date);
    }
  }

  private formatDate(iso: string): string {
    return iso;
  }

  public togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public play(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.lastFrameTime = performance.now();
    this.playAccumulator = 0;
    this.updatePlayButtonUI();
    this.emitPlay(true);
    this.startPlaybackLoop();
  }

  public pause(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.stopPlaybackLoop();
    this.updatePlayButtonUI();
    this.emitPlay(false);
  }

  private pauseIfPlaying(): void {
    if (this.isPlaying) this.pause();
  }

  private updatePlayButtonUI(): void {
    if (this.isPlaying) {
      this.playBtn.classList.add('playing');
      this.playIcon.style.display = 'none';
      this.pauseIcon.style.display = 'block';
    } else {
      this.playBtn.classList.remove('playing');
      this.playIcon.style.display = 'block';
      this.pauseIcon.style.display = 'none';
    }
  }

  private startPlaybackLoop(): void {
    this.stopPlaybackLoop();
    const loop = (now: number) => {
      if (!this.isPlaying) return;
      const dt = now - this.lastFrameTime;
      this.lastFrameTime = now;
      this.playAccumulator += dt;
      while (this.playAccumulator >= this.PLAY_FRAME_INTERVAL / this.PLAY_SPEED_DAYS_PER_SECOND) {
        this.playAccumulator -= this.PLAY_FRAME_INTERVAL / this.PLAY_SPEED_DAYS_PER_SECOND;
        this.advanceOneDay();
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private stopPlaybackLoop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private advanceOneDay(): void {
    const next = this.currentIndex + 1;
    if (next >= this.dates.length) {
      this.currentIndex = 0;
    } else {
      this.currentIndex = next;
    }
    this.updateUIFromIndex(false);
    this.emitUpdate();
  }

  private emitUpdate(): void {
    const date = this.dates[this.currentIndex] || '';
    for (const h of this.updateHandlers) {
      try { h(date); } catch (e) { console.error(e); }
    }
  }

  private emitPlay(playing: boolean): void {
    for (const h of this.playHandlers) {
      try { h(playing); } catch (e) { console.error(e); }
    }
  }

  public onUpdate(handler: UpdateEventHandler): void {
    if (this.updateHandlers.indexOf(handler) === -1) {
      this.updateHandlers.push(handler);
    }
  }

  public offUpdate(handler: UpdateEventHandler): void {
    const i = this.updateHandlers.indexOf(handler);
    if (i > -1) this.updateHandlers.splice(i, 1);
  }

  public onPlayStateChange(handler: PlayEventHandler): void {
    if (this.playHandlers.indexOf(handler) === -1) {
      this.playHandlers.push(handler);
    }
  }

  public offPlayStateChange(handler: PlayEventHandler): void {
    const i = this.playHandlers.indexOf(handler);
    if (i > -1) this.playHandlers.splice(i, 1);
  }

  public getPlaying(): boolean {
    return this.isPlaying;
  }
}
