export type RecordAction = 'press' | 'release';

export interface RecordEvent {
  timestamp: number;
  note: string;
  action: RecordAction;
}

export interface RecordingData {
  version: string;
  duration: number;
  events: RecordEvent[];
}

export interface RecorderOptions {
  onRecordingStateChange?: (isRecording: boolean) => void;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
  onEvent?: (event: RecordEvent) => void;
  onHasRecordingChange?: (hasData: boolean) => void;
}

const RECORDING_VERSION = '1.0';
const MAX_DURATION_MS = 5 * 60 * 1000;

export class Recorder {
  private events: RecordEvent[] = [];
  private startTime: number = 0;
  private isRecording: boolean = false;
  private isPlaying: boolean = false;
  private playbackSpeed: number = 1;
  private scheduledTimeouts: number[] = [];
  private validNotes: Set<string> = new Set();
  private options: RecorderOptions;

  constructor(validNotes: string[], options: RecorderOptions = {}) {
    this.validNotes = new Set(validNotes);
    this.options = options;
  }

  public setValidNotes(notes: string[]): void {
    this.validNotes = new Set(notes);
  }

  public start(): boolean {
    if (this.isRecording) return false;
    this.events = [];
    this.startTime = performance.now();
    this.isRecording = true;
    this.options.onRecordingStateChange?.(true);
    this.options.onHasRecordingChange?.(false);
    return true;
  }

  public stop(): boolean {
    if (!this.isRecording) return false;
    this.isRecording = false;
    this.options.onRecordingStateChange?.(false);
    if (this.events.length > 0) {
      this.options.onHasRecordingChange?.(true);
    }
    return true;
  }

  public recordEvent(note: string, action: RecordAction): void {
    if (!this.isRecording) return;
    if (!this.validNotes.has(note)) return;

    const elapsed = performance.now() - this.startTime;
    if (elapsed > MAX_DURATION_MS) {
      this.stop();
      return;
    }

    const event: RecordEvent = {
      timestamp: Math.round(elapsed * 1000) / 1000,
      note,
      action,
    };
    this.events.push(event);
  }

  public getDuration(): number {
    if (this.events.length === 0) return 0;
    return this.events[this.events.length - 1].timestamp;
  }

  public getData(): RecordingData | null {
    if (this.events.length === 0) return null;
    return {
      version: RECORDING_VERSION,
      duration: this.getDuration(),
      events: [...this.events],
    };
  }

  public setSpeed(speed: number): void {
    this.playbackSpeed = Math.max(0.5, Math.min(2, speed));
  }

  public getSpeed(): number {
    return this.playbackSpeed;
  }

  public hasRecording(): boolean {
    return this.events.length > 0;
  }

  public play(): boolean {
    if (this.isPlaying || this.events.length === 0) return false;
    this.isPlaying = true;
    this.options.onPlaybackStateChange?.(true);
    this.scheduleEvents();
    return true;
  }

  private scheduleEvents(): void {
    this.clearPlayback();

    for (const event of this.events) {
      const adjustedDelay = event.timestamp / this.playbackSpeed;
      const timeoutId = window.setTimeout(() => {
        this.options.onEvent?.(event);
      }, adjustedDelay);
      this.scheduledTimeouts.push(timeoutId);
    }

    const totalDuration = this.getDuration() / this.playbackSpeed + 300;
    const endTimeoutId = window.setTimeout(() => {
      this.isPlaying = false;
      this.options.onPlaybackStateChange?.(false);
      this.scheduledTimeouts = this.scheduledTimeouts.filter(id => id !== endTimeoutId);
    }, totalDuration);
    this.scheduledTimeouts.push(endTimeoutId);
  }

  public stopPlayback(): void {
    this.clearPlayback();
    if (this.isPlaying) {
      this.isPlaying = false;
      this.options.onPlaybackStateChange?.(false);
    }
  }

  private clearPlayback(): void {
    for (const id of this.scheduledTimeouts) {
      window.clearTimeout(id);
    }
    this.scheduledTimeouts = [];
  }

  public exportToJSON(): string {
    const data = this.getData();
    if (!data) {
      throw new Error('没有可导出的录制数据');
    }
    return JSON.stringify(data, null, 2);
  }

  public static validate(data: unknown): { valid: boolean; error?: string } {
    if (typeof data !== 'object' || data === null) {
      return { valid: false, error: '无效的JSON格式：根节点必须是对象' };
    }

    const obj = data as Record<string, unknown>;

    if (obj.version !== RECORDING_VERSION) {
      return { valid: false, error: `不支持的版本号：${obj.version}` };
    }

    if (typeof obj.duration !== 'number' || obj.duration < 0) {
      return { valid: false, error: 'duration 字段无效：必须是非负数字' };
    }

    if (!Array.isArray(obj.events)) {
      return { valid: false, error: 'events 字段无效：必须是数组' };
    }

    if (obj.events.length === 0) {
      return { valid: false, error: '录制序列为空' };
    }

    const noteRegex = /^[A-G](#)?[0-8]$/;

    for (let i = 0; i < obj.events.length; i++) {
      const ev = obj.events[i] as Record<string, unknown>;

      if (typeof ev.timestamp !== 'number' || ev.timestamp < 0) {
        return { valid: false, error: `events[${i}].timestamp 无效` };
      }

      if (i > 0) {
        const prev = obj.events[i - 1] as Record<string, unknown>;
        if (ev.timestamp < (prev.timestamp as number)) {
          return { valid: false, error: `events[${i}].timestamp 小于前一个事件` };
        }
      }

      if (typeof ev.note !== 'string' || !noteRegex.test(ev.note)) {
        return { valid: false, error: `events[${i}].note 无效：${ev.note}` };
      }

      if (ev.action !== 'press' && ev.action !== 'release') {
        return { valid: false, error: `events[${i}].action 无效：${ev.action}` };
      }
    }

    return { valid: true };
  }

  public importFromJSON(jsonString: string): RecordingData {
    let data: unknown;
    try {
      data = JSON.parse(jsonString);
    } catch {
      throw new Error('JSON解析失败：文件格式不正确');
    }

    const validation = Recorder.validate(data);
    if (!validation.valid) {
      throw new Error(validation.error || '未知验证错误');
    }

    const recording = data as RecordingData;

    this.events = [...recording.events];
    this.options.onHasRecordingChange?.(this.events.length > 0);

    return recording;
  }

  public downloadFile(): void {
    const json = this.exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `piano-recording-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public isRecordingState(): boolean {
    return this.isRecording;
  }

  public isPlayingState(): boolean {
    return this.isPlaying;
  }

  public destroy(): void {
    this.stopPlayback();
    this.stop();
    this.events = [];
  }
}
