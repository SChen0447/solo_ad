export interface RecognitionResult {
  text: string;
  confidence: number;
  timestamp: number;
}

export interface RecognitionChunk {
  isFinal: boolean;
  text: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
  }
}

export type VoiceRecorderState =
  | 'idle'
  | 'initializing'
  | 'listening'
  | 'recording'
  | 'stopped'
  | 'error';

type EventCallback = (result: RecognitionResult) => void;
type StateCallback = (state: VoiceRecorderState) => void;
type ChunkCallback = (chunk: RecognitionChunk) => void;

export class VoiceRecorder {
  private recognition: SpeechRecognition | null = null;
  private state: VoiceRecorderState = 'idle';
  private onResultCallback: EventCallback | null = null;
  private onStateChangeCallback: StateCallback | null = null;
  private onChunkCallback: ChunkCallback | null = null;
  private finalText: string = '';
  private startTime: number = 0;
  private maxDuration: number = 10;
  private forceStopTimer: ReturnType<typeof setTimeout> | null = null;
  private language: string = 'zh-CN';

  constructor() {
    this.initRecognition();
  }

  private initRecognition(): void {
    try {
      const SpeechRecognitionCtor =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionCtor) {
        this.setState('error');
        return;
      }
      this.recognition = new SpeechRecognitionCtor();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.language;
      this.recognition.maxAlternatives = 3;

      this.recognition.onstart = () => {
        this.setState('recording');
        this.startTime = performance.now();
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimText = '';
        let finalChunkText = '';
        let finalConfidence = 0;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          if (result.isFinal) {
            finalChunkText += transcript;
            finalConfidence = Math.max(finalConfidence, result[0].confidence);
          } else {
            interimText += transcript;
          }
        }
        if (finalChunkText) {
          this.finalText += finalChunkText;
          if (this.onChunkCallback) {
            this.onChunkCallback({
              isFinal: true,
              text: finalChunkText,
              confidence: finalConfidence,
            });
          }
        }
        if (interimText && this.onChunkCallback) {
          this.onChunkCallback({
            isFinal: false,
            text: interimText,
            confidence: 0.5,
          });
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('[VoiceRecorder] 识别错误:', event.error);
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          this.setState('error');
        }
      };

      this.recognition.onend = () => {
        this.clearForceStop();
        const duration = (performance.now() - this.startTime) / 1000;
        if (this.onResultCallback) {
          this.onResultCallback({
            text: this.finalText.trim(),
            confidence: 0.9,
            timestamp: Date.now(),
          });
        }
        this.setState('stopped');
      };
    } catch (e) {
      console.error('[VoiceRecorder] 初始化失败:', e);
      this.setState('error');
    }
  }

  private setState(newState: VoiceRecorderState): void {
    this.state = newState;
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(newState);
    }
  }

  private clearForceStop(): void {
    if (this.forceStopTimer) {
      clearTimeout(this.forceStopTimer);
      this.forceStopTimer = null;
    }
  }

  setLanguage(lang: string): void {
    this.language = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  setMaxDuration(seconds: number): void {
    this.maxDuration = seconds;
  }

  async start(maxDuration?: number): Promise<void> {
    if (!this.recognition) {
      throw new Error('浏览器不支持语音识别');
    }
    if (this.state === 'recording') {
      return;
    }
    if (maxDuration) {
      this.maxDuration = maxDuration;
    }
    this.finalText = '';
    this.setState('initializing');
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      this.setState('error');
      throw new Error('无法访问麦克风');
    }
    try {
      this.recognition.start();
      this.setState('listening');
      this.forceStopTimer = setTimeout(() => {
        this.stop();
      }, this.maxDuration * 1000);
    } catch (e) {
      console.error('[VoiceRecorder] 启动失败:', e);
    }
  }

  stop(): void {
    if (!this.recognition || this.state !== 'recording') {
      return;
    }
    this.clearForceStop();
    try {
      this.recognition.stop();
    } catch (e) {
      const duration = (performance.now() - this.startTime) / 1000;
      if (this.onResultCallback) {
        this.onResultCallback({
          text: this.finalText.trim(),
          confidence: 0.9,
          timestamp: Date.now(),
        });
      }
      this.setState('stopped');
    }
  }

  getState(): VoiceRecorderState {
    return this.state;
  }

  onResult(callback: EventCallback): void {
    this.onResultCallback = callback;
  }

  onStateChange(callback: StateCallback): void {
    this.onStateChangeCallback = callback;
  }

  onChunk(callback: ChunkCallback): void {
    this.onChunkCallback = callback;
  }

  destroy(): void {
    this.clearForceStop();
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (_) {}
    }
    this.onResultCallback = null;
    this.onStateChangeCallback = null;
    this.onChunkCallback = null;
  }

  static isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }
}

export default VoiceRecorder;
