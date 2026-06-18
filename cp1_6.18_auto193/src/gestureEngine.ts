import { Hands, Results } from '@mediapipe/hands';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import { v4 as uuidv4 } from 'uuid';
import { HandData, HandLandmark } from './types';
import { useAppStore } from './store';

export interface GestureEngineOptions {
  videoElement: HTMLVideoElement;
  onHandData?: (data: HandData[]) => void;
  onError?: (error: string) => void;
}

interface HandTracker {
  id: string;
  lastLandmarks: HandLandmark[] | null;
  lastTimestamp: number;
}

export class GestureEngine {
  private hands: Hands | null = null;
  private videoElement: HTMLVideoElement;
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;
  private handTrackers: Map<number, HandTracker> = new Map();
  private lastFrameTime: number = 0;
  private targetFPS: number = 15;
  private frameInterval: number = 1000 / this.targetFPS;
  private onHandData?: (data: HandData[]) => void;
  private onError?: (error: string) => void;
  private tfInitialized: boolean = false;

  constructor(options: GestureEngineOptions) {
    this.videoElement = options.videoElement;
    this.onHandData = options.onHandData;
    this.onError = options.onError;
  }

  async init(): Promise<void> {
    try {
      useAppStore.getState().setGestureInitializing(true);
      useAppStore.getState().setGestureError(null);

      if (!this.tfInitialized) {
        await tf.ready();
        await tf.setBackend('webgl');
        this.tfInitialized = true;
      }

      this.hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        },
      });

      this.hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.hands.onResults(this.onResults.bind(this));

      useAppStore.getState().setGestureInitializing(false);
      useAppStore.getState().setGestureInitialized(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '手势检测初始化失败';
      useAppStore.getState().setGestureError(errorMessage);
      useAppStore.getState().setGestureInitializing(false);
      if (this.onError) {
        this.onError(errorMessage);
      }
      throw error;
    }
  }

  private onResults(results: Results): void {
    const now = performance.now();
    const handDataList: HandData[] = [];

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      results.multiHandLandmarks.forEach((landmarks, index) => {
        const handLandmarks: HandLandmark[] = landmarks.map((lm) => ({
          x: lm.x,
          y: lm.y,
          z: lm.z,
        }));

        let tracker = this.handTrackers.get(index);
        if (!tracker) {
          tracker = {
            id: uuidv4(),
            lastLandmarks: null,
            lastTimestamp: 0,
          };
          this.handTrackers.set(index, tracker);
        }

        const handData: HandData = {
          id: tracker.id,
          landmarks: handLandmarks,
          timestamp: now,
        };

        handDataList.push(handData);

        tracker.lastLandmarks = handLandmarks;
        tracker.lastTimestamp = now;
      });
    }

    this.handTrackers.forEach((tracker, index) => {
      if (now - tracker.lastTimestamp > 500) {
        this.handTrackers.delete(index);
      }
    });

    if (this.onHandData) {
      this.onHandData(handDataList);
    }
    useAppStore.getState().setHandData(handDataList);
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    if (!this.hands) {
      await this.init();
    }

    this.isRunning = true;
    this.processFrame();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private async processFrame(): Promise<void> {
    if (!this.isRunning || !this.hands) return;

    const now = performance.now();
    const delta = now - this.lastFrameTime;

    if (delta >= this.frameInterval) {
      try {
        if (
          this.videoElement.readyState >= 2 &&
          this.videoElement.videoWidth > 0 &&
          this.videoElement.videoHeight > 0
        ) {
          await this.hands.send({ image: this.videoElement });
        }
      } catch (error) {
        console.warn('Frame processing error:', error);
      }
      this.lastFrameTime = now;
    }

    this.animationFrameId = requestAnimationFrame(() => this.processFrame());
  }

  async reset(): Promise<void> {
    this.stop();
    this.handTrackers.clear();

    if (this.hands) {
      this.hands.close();
      this.hands = null;
    }

    useAppStore.getState().resetGestureState();

    await this.init();
    await this.start();
  }

  destroy(): void {
    this.stop();
    if (this.hands) {
      this.hands.close();
      this.hands = null;
    }
    this.handTrackers.clear();
  }

  setTargetFPS(fps: number): void {
    this.targetFPS = Math.max(1, Math.min(60, fps));
    this.frameInterval = 1000 / this.targetFPS;
  }
}

export async function createGestureEngine(
  videoElement: HTMLVideoElement,
  options?: Omit<GestureEngineOptions, 'videoElement'>
): Promise<GestureEngine> {
  const engine = new GestureEngine({
    videoElement,
    ...options,
  });
  await engine.init();
  return engine;
}
