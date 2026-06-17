import VoiceRecorder, { RecognitionChunk, RecognitionResult } from '../voice/VoiceRecorder';

export interface ComparisonChar {
  char: string;
  originalChar: string;
  status: 'correct' | 'wrong' | 'pending' | 'extra';
  originalIndex: number;
}

export interface RoundCalculation {
  accuracy: number;
  duration: number;
  recognizedText: string;
  charComparison: ComparisonChar[];
  roundScore: number;
}

export type EngineState =
  | 'idle'
  | 'prep'
  | 'ready_to_record'
  | 'recording'
  | 'processing'
  | 'submitted';

type StateCallback = (state: EngineState) => void;
type ChunkCallback = (chunk: ComparisonChar[], text: string) => void;
type ResultCallback = (result: RoundCalculation) => void;
type TimerCallback = (seconds: number) => void;

export class GameEngine {
  private voiceRecorder: VoiceRecorder;
  private state: EngineState = 'idle';
  private currentTwister: string = '';
  private normalizedOriginal: string = '';
  private currentRecognizedText: string = '';
  private onStateChangeCallback: StateCallback | null = null;
  private onChunkCallback: ChunkCallback | null = null;
  private onResultCallback: ResultCallback | null = null;
  private onTimerCallback: TimerCallback | null = null;
  private recordingStartTime: number = 0;
  private recordingMaxDuration: number = 10;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private submitHandler: ((result: RoundCalculation) => void) | null = null;

  constructor() {
    this.voiceRecorder = new VoiceRecorder();
    this.voiceRecorder.onChunk((chunk: RecognitionChunk) => {
      this.handleRecognitionChunk(chunk);
    });
    this.voiceRecorder.onResult((result: RecognitionResult) => {
      this.handleRecognitionResult(result);
    });
    this.voiceRecorder.onStateChange((state) => {
      if (state === 'recording') {
        this.setState('recording');
        this.startCountdown();
      }
    });
  }

  private setState(newState: EngineState): void {
    this.state = newState;
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(newState);
    }
  }

  private normalizeText(text: string): string {
    return text
      .replace(/[，。！？、；：""''（）《》【】,.!?;:''""()<>\[\]{}]/g, '')
      .replace(/\s+/g, '')
      .toLowerCase();
  }

  setTwister(twister: string): void {
    this.currentTwister = twister;
    this.normalizedOriginal = this.normalizeText(twister);
    this.currentRecognizedText = '';
  }

  setMaxDuration(seconds: number): void {
    this.recordingMaxDuration = seconds;
    this.voiceRecorder.setMaxDuration(seconds);
  }

  onSubmit(handler: (result: RoundCalculation) => void): void {
    this.submitHandler = handler;
  }

  private startCountdown(): void {
    this.clearCountdown();
    this.recordingStartTime = performance.now();
    let elapsed = 0;
    this.countdownTimer = setInterval(() => {
      elapsed += 0.1;
      const remaining = Math.max(0, this.recordingMaxDuration - elapsed);
      if (this.onTimerCallback) {
        this.onTimerCallback(Number(remaining.toFixed(1)));
      }
      if (remaining <= 0) {
        this.clearCountdown();
      }
    }, 100);
  }

  private clearCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private handleRecognitionChunk(chunk: RecognitionChunk): void {
    if (chunk.isFinal) {
      this.currentRecognizedText += chunk.text;
    } else {
      this.currentRecognizedText += chunk.text;
    }
    const comparison = this.compareText(
      this.normalizeText(this.currentRecognizedText)
    );
    if (this.onChunkCallback) {
      this.onChunkCallback(comparison, this.currentRecognizedText);
    }
  }

  private handleRecognitionResult(result: RecognitionResult): void {
    this.currentRecognizedText = result.text;
    this.clearCountdown();
    this.processFinalResult(result.text);
  }

  compareText(recognized: string): ComparisonChar[] {
    const original = this.normalizedOriginal;
    const originalChars = Array.from(original);
    const recognizedChars = Array.from(recognized);
    const comparison: ComparisonChar[] = [];
    const usedRecognized = new Set<number>();
    let lastMatchIdx = -1;
    for (let i = 0; i < originalChars.length; i++) {
      const origChar = originalChars[i];
      let foundIdx = -1;
      for (let j = lastMatchIdx + 1; j < recognizedChars.length; j++) {
        if (!usedRecognized.has(j) && recognizedChars[j] === origChar) {
          foundIdx = j;
          break;
        }
      }
      if (foundIdx !== -1) {
        usedRecognized.add(foundIdx);
        lastMatchIdx = foundIdx;
        comparison.push({
          char: origChar,
          originalChar: origChar,
          status: 'correct',
          originalIndex: i,
        });
      } else {
        comparison.push({
          char: origChar,
          originalChar: origChar,
          status: 'pending',
          originalIndex: i,
        });
      }
    }
    for (let j = 0; j < recognizedChars.length; j++) {
      if (!usedRecognized.has(j)) {
        comparison.push({
          char: recognizedChars[j],
          originalChar: '',
          status: 'extra',
          originalIndex: -1,
        });
      }
    }
    return comparison;
  }

  calculateAccuracy(recognized: string): { accuracy: number; comparison: ComparisonChar[] } {
    const comparison = this.compareText(recognized);
    const originalLen = this.normalizedOriginal.length;
    if (originalLen === 0) {
      return { accuracy: 0, comparison };
    }
    const correctCount = comparison.filter((c) => c.status === 'correct' && c.originalIndex >= 0).length;
    const accuracy = correctCount / originalLen;
    return { accuracy: Math.min(1, accuracy), comparison };
  }

  calculateRoundScore(accuracy: number, duration: number): number {
    return round(accuracy * 70 + Math.max(0, (this.recordingMaxDuration - duration) / this.recordingMaxDuration) * 30, 2);
  }

  private processFinalResult(recognizedText: string): void {
    this.setState('processing');
    const normalized = this.normalizeText(recognizedText);
    const { accuracy, comparison } = this.calculateAccuracy(normalized);
    const duration = (performance.now() - this.recordingStartTime) / 1000;
    const finalDuration = Math.max(0.1, Math.min(this.recordingMaxDuration, duration));
    const result: RoundCalculation = {
      accuracy,
      duration: finalDuration,
      recognizedText,
      charComparison: this.markWrongChars(comparison),
      roundScore: 0,
    };
    result.roundScore = this.calculateRoundScore(accuracy, finalDuration);
    this.setState('submitted');
    if (this.submitHandler) {
      this.submitHandler(result);
    }
    if (this.onResultCallback) {
      this.onResultCallback(result);
    }
  }

  private markWrongChars(comparison: ComparisonChar[]): ComparisonChar[] {
    return comparison.map((c) => ({
      ...c,
      status: c.status === 'pending' ? 'wrong' : c.status,
    }));
  }

  async startRecording(): Promise<void> {
    if (this.state === 'prep' || this.state === 'ready_to_record') {
      this.setState('ready_to_record');
      await this.voiceRecorder.start(this.recordingMaxDuration);
    }
  }

  stopRecording(): void {
    this.voiceRecorder.stop();
  }

  setPrepMode(): void {
    this.currentRecognizedText = '';
    this.setState('prep');
  }

  getState(): EngineState {
    return this.state;
  }

  getRecognizedText(): string {
    return this.currentRecognizedText;
  }

  getCurrentTwister(): string {
    return this.currentTwister;
  }

  onStateChange(callback: StateCallback): void {
    this.onStateChangeCallback = callback;
  }

  onChunk(callback: ChunkCallback): void {
    this.onChunkCallback = callback;
  }

  onResult(callback: ResultCallback): void {
    this.onResultCallback = callback;
  }

  onTimer(callback: TimerCallback): void {
    this.onTimerCallback = callback;
  }

  reset(): void {
    this.clearCountdown();
    this.voiceRecorder.stop();
    this.currentRecognizedText = '';
    this.setState('idle');
  }

  destroy(): void {
    this.clearCountdown();
    this.voiceRecorder.destroy();
    this.onStateChangeCallback = null;
    this.onChunkCallback = null;
    this.onResultCallback = null;
    this.onTimerCallback = null;
    this.submitHandler = null;
  }

  static isVoiceSupported(): boolean {
    return VoiceRecorder.isSupported();
  }
}

function round(value: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

export default GameEngine;
