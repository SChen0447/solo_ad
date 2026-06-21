import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface HandData {
  landmarks: HandLandmark[];
  handedness: 'Left' | 'Right';
  fingerCount: number;
  gesture: 'pinch' | 'open' | 'knead' | 'fist' | 'unknown';
  wristAngle: number;
}

export interface TrackingResult {
  hands: HandData[];
  timestamp: number;
}

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17]
];

const FINGER_TIPS = [4, 8, 12, 16, 20];
const FINGER_PIPS = [3, 6, 10, 14, 18];
const FINGER_Mcps = [2, 5, 9, 13, 17];

export class HandTracker {
  private hands: Hands | null = null;
  private camera: Camera | null = null;
  private videoElement: HTMLVideoElement;
  private canvasElement: HTMLCanvasElement;
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private onResultsCallback: ((result: TrackingResult) => void) | null = null;
  private isInitialized = false;
  private previousHandData: Map<string, HandData> = new Map();
  private previousWristPositions: Map<string, { x: number; y: number; timestamp: number }> = new Map();
  private palmDistanceHistory: Map<string, number[]> = new Map();
  private readonly HISTORY_LENGTH = 15;

  constructor(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement) {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
    const ctx = canvasElement.getContext('2d');
    if (ctx) {
      this.canvasCtx = ctx;
    }
  }

  async initialize(): Promise<boolean> {
    try {
      this.hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      this.hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.5
      });

      this.hands.onResults((results: Results) => {
        this.processResults(results);
      });

      this.camera = new Camera(this.videoElement, {
        onFrame: async () => {
          if (this.hands) {
            await this.hands.send({ image: this.videoElement });
          }
        },
        width: 640,
        height: 480
      });

      await this.camera.start();
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('HandTracker initialization failed:', error);
      return false;
    }
  }

  onResults(callback: (result: TrackingResult) => void): void {
    this.onResultsCallback = callback;
  }

  private processResults(results: Results): void {
    const trackingResult: TrackingResult = {
      hands: [],
      timestamp: performance.now()
    };

    if (results.multiHandLandmarks && results.multiHandedness) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks = results.multiHandLandmarks[i] as HandLandmark[];
        const handedness = results.multiHandedness[i].label as 'Left' | 'Right';
        const fingerCount = this.countFingers(landmarks, handedness);
        const gesture = this.detectGesture(landmarks, handedness, fingerCount);
        const wristAngle = this.calculateWristAngle(landmarks);

        const handData: HandData = {
          landmarks,
          handedness,
          fingerCount,
          gesture,
          wristAngle
        };

        trackingResult.hands.push(handData);
        this.previousHandData.set(handedness, handData);

        const wrist = landmarks[0];
        this.previousWristPositions.set(handedness, {
          x: wrist.x,
          y: wrist.y,
          timestamp: trackingResult.timestamp
        });
      }
    }

    this.drawLandmarks(trackingResult);
    this.updateFingerCount(trackingResult);

    if (this.onResultsCallback) {
      this.onResultsCallback(trackingResult);
    }
  }

  private countFingers(landmarks: HandLandmark[], handedness: 'Left' | 'Right'): number {
    let count = 0;

    if (handedness === 'Right') {
      if (landmarks[FINGER_TIPS[0]].x < landmarks[FINGER_PIPS[0]].x) {
        count++;
      }
    } else {
      if (landmarks[FINGER_TIPS[0]].x > landmarks[FINGER_PIPS[0]].x) {
        count++;
      }
    }

    for (let i = 1; i < 5; i++) {
      if (landmarks[FINGER_TIPS[i]].y < landmarks[FINGER_PIPS[i]].y) {
        count++;
      }
    }

    return count;
  }

  private detectGesture(landmarks: HandLandmark[], handedness: 'Left' | 'Right', fingerCount: number): HandData['gesture'] {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const palmCenter = landmarks[9];
    const wrist = landmarks[0];

    const palmSize = Math.sqrt(
      Math.pow(wrist.x - palmCenter.x, 2) +
      Math.pow(wrist.y - palmCenter.y, 2)
    ) * 2;

    const tips = [thumbTip, indexTip, middleTip, ringTip, pinkyTip];
    const mcps = [2, 5, 9, 13, 17];

    let allFingersFolded = true;
    for (let i = 1; i < 5; i++) {
      const tip = tips[i];
      const mcp = landmarks[mcps[i]];
      const tipToPalm = Math.sqrt(
        Math.pow(tip.x - palmCenter.x, 2) +
        Math.pow(tip.y - palmCenter.y, 2)
      );
      if (tipToPalm > palmSize * 0.55) {
        allFingersFolded = false;
        break;
      }
    }

    const thumbToPalm = Math.sqrt(
      Math.pow(thumbTip.x - palmCenter.x, 2) +
      Math.pow(thumbTip.y - palmCenter.y, 2)
    );
    if (allFingersFolded && thumbToPalm < palmSize * 0.6) {
      return 'fist';
    }

    const thumbIndexDist = Math.sqrt(
      Math.pow(thumbTip.x - indexTip.x, 2) +
      Math.pow(thumbTip.y - indexTip.y, 2)
    );

    if (thumbIndexDist < palmSize * 0.3 && fingerCount >= 2 && fingerCount <= 3) {
      return 'pinch';
    }

    const avgTipToPalm = tips.reduce((sum, tip) => {
      return sum + Math.sqrt(
        Math.pow(tip.x - palmCenter.x, 2) +
        Math.pow(tip.y - palmCenter.y, 2)
      );
    }, 0) / tips.length;

    const history = this.palmDistanceHistory.get(handedness) || [];
    history.push(avgTipToPalm);
    if (history.length > this.HISTORY_LENGTH) {
      history.shift();
    }
    this.palmDistanceHistory.set(handedness, history);

    let isKneading = false;
    if (history.length >= 8 && fingerCount >= 3) {
      let fluctuations = 0;
      const recent = history.slice(-8);
      for (let i = 2; i < recent.length; i++) {
        const prevDiff = recent[i - 1] - recent[i - 2];
        const currDiff = recent[i] - recent[i - 1];
        if (prevDiff * currDiff < 0 && Math.abs(currDiff) > palmSize * 0.02) {
          fluctuations++;
        }
      }
      const avgDist = recent.reduce((a, b) => a + b, 0) / recent.length;
      const variance = recent.reduce((sum, d) => sum + Math.pow(d - avgDist, 2), 0) / recent.length;
      const stdDev = Math.sqrt(variance);

      if (fluctuations >= 2 && stdDev > palmSize * 0.04) {
        isKneading = true;
      }
    }

    if (isKneading) {
      return 'knead';
    }

    if (fingerCount >= 4) {
      return 'open';
    }

    return 'unknown';
  }

  private calculateWristAngle(landmarks: HandLandmark[]): number {
    const wrist = landmarks[0];
    const middleMcp = landmarks[9];
    const middleTip = landmarks[12];

    const v1 = { x: middleMcp.x - wrist.x, y: middleMcp.y - wrist.y };
    const v2 = { x: middleTip.x - middleMcp.x, y: middleTip.y - middleMcp.y };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (mag1 === 0 || mag2 === 0) return 0;

    return Math.acos(Math.min(1, Math.max(-1, dot / (mag1 * mag2)))) * (180 / Math.PI);
  }

  getHandRotationSpeed(handedness: 'Left' | 'Right'): number {
    const current = this.previousHandData.get(handedness);
    if (!current) return 0;

    const positions = this.previousWristPositions;
    const entries = Array.from(positions.entries());
    if (entries.length < 2) return 0;

    let maxSpeed = 0;
    for (let i = 1; i < entries.length; i++) {
      const [, prev] = entries[i - 1];
      const [, curr] = entries[i];
      const dt = (curr.timestamp - prev.timestamp) / 1000;
      if (dt > 0) {
        const dx = curr.x - prev.x;
        const dy = curr.y - prev.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = (dist / dt) * 180;
        maxSpeed = Math.max(maxSpeed, speed);
      }
    }

    return maxSpeed;
  }

  private drawLandmarks(result: TrackingResult): void {
    if (!this.canvasCtx) return;

    const width = this.canvasElement.width = this.canvasElement.offsetWidth;
    const height = this.canvasElement.height = this.canvasElement.offsetHeight;

    this.canvasCtx.clearRect(0, 0, width, height);
    this.canvasCtx.save();
    this.canvasCtx.scale(-1, 1);
    this.canvasCtx.translate(-width, 0);

    for (const hand of result.hands) {
      this.canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      this.canvasCtx.lineWidth = 2;

      for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
        const start = hand.landmarks[startIdx];
        const end = hand.landmarks[endIdx];
        this.canvasCtx.beginPath();
        this.canvasCtx.moveTo(start.x * width, start.y * height);
        this.canvasCtx.lineTo(end.x * width, end.y * height);
        this.canvasCtx.stroke();
      }

      this.canvasCtx.fillStyle = '#FF4444';
      for (const landmark of hand.landmarks) {
        this.canvasCtx.beginPath();
        this.canvasCtx.arc(landmark.x * width, landmark.y * height, 3, 0, 2 * Math.PI);
        this.canvasCtx.fill();
      }
    }

    this.canvasCtx.restore();
  }

  private updateFingerCount(result: TrackingResult): void {
    const fingerCountEl = document.getElementById('finger-count');
    if (fingerCountEl) {
      const totalFingers = result.hands.reduce((sum, h) => sum + h.fingerCount, 0);
      fingerCountEl.textContent = totalFingers.toString();
    }
  }

  destroy(): void {
    if (this.camera) {
      this.camera.stop();
    }
    if (this.hands) {
      this.hands.close();
    }
    this.isInitialized = false;
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}
