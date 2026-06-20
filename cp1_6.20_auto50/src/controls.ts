export interface ControlState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  viewLocked: boolean;
  fileName: string;
  sampleRate: number;
  isDark: boolean;
  toastMessage: string;
  toastVisible: boolean;
}

export type ControlCallback = (state: ControlState) => void;

export class ControlsManager {
  private state: ControlState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    viewLocked: true,
    fileName: '',
    sampleRate: 0,
    isDark: true,
    toastMessage: '',
    toastVisible: false,
  };
  private callback: ControlCallback | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  onStateChange(cb: ControlCallback): void {
    this.callback = cb;
  }

  getState(): ControlState {
    return { ...this.state };
  }

  private notify(): void {
    if (this.callback) this.callback({ ...this.state });
  }

  private showToast(msg: string): void {
    this.state.toastMessage = msg;
    this.state.toastVisible = true;
    this.notify();
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.state.toastVisible = false;
      this.notify();
    }, 2000);
  }

  updateFromEngine(data: {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    fileName: string;
    sampleRate: number;
  }): void {
    this.state.isPlaying = data.isPlaying;
    this.state.currentTime = data.currentTime;
    this.state.duration = data.duration;
    this.state.volume = data.volume;
    this.state.fileName = data.fileName;
    this.state.sampleRate = data.sampleRate;
    this.notify();
  }

  togglePlayPause(): void {
    this.state.isPlaying = !this.state.isPlaying;
    this.notify();
    return;
  }

  setPlaying(playing: boolean): void {
    this.state.isPlaying = playing;
    this.notify();
  }

  setVolume(v: number): void {
    this.state.volume = Math.max(0, Math.min(1, v));
    this.notify();
  }

  toggleViewLock(): void {
    this.state.viewLocked = !this.state.viewLocked;
    this.notify();
  }

  toggleTheme(): void {
    this.state.isDark = !this.state.isDark;
    this.notify();
  }

  handleKeyboard(e: KeyboardEvent): { action: string; value?: number } | null {
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        this.showToast('⏯ Play/Pause');
        return { action: 'togglePlay' };
      case 'ArrowLeft':
        e.preventDefault();
        this.showToast('⏪ -3s');
        return { action: 'seek', value: -3 };
      case 'ArrowRight':
        e.preventDefault();
        this.showToast('⏩ +3s');
        return { action: 'seek', value: 3 };
      case 'ArrowUp':
        e.preventDefault();
        this.showToast('🔊 Volume +5%');
        return { action: 'volume', value: 0.05 };
      case 'ArrowDown':
        e.preventDefault();
        this.showToast('🔉 Volume -5%');
        return { action: 'volume', value: -0.05 };
      default:
        return null;
    }
  }

  formatTime(seconds: number): string {
    const s = Math.max(0, seconds);
    const min = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  }

  destroy(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }
}
