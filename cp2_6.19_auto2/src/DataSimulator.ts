import * as THREE from 'three';

export interface FlowData {
  timestamp: number;
  direction: THREE.Vector3;
  magnitude: number;
}

export type DataSubscriber = (data: FlowData) => void;

export class DataSimulator {
  private subscribers: DataSubscriber[] = [];
  private intervalId: number | null = null;
  private readonly INTERVAL_MS = 100;
  private peakMagnitude = 0;
  private currentDirection = new THREE.Vector3(1, 0, 0);
  private targetDirection = new THREE.Vector3(1, 0, 0);
  private smoothFactor = 0.05;

  subscribe(fn: DataSubscriber): void {
    this.subscribers.push(fn);
  }

  unsubscribe(fn: DataSubscriber): void {
    this.subscribers = this.subscribers.filter(s => s !== fn);
  }

  start(): void {
    if (this.intervalId !== null) return;
    this.intervalId = window.setInterval(() => this.emit(), this.INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getPeak(): number {
    return this.peakMagnitude;
  }

  resetPeak(): void {
    this.peakMagnitude = 0;
  }

  private emit(): void {
    this.targetDirection.set(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
    ).normalize();

    this.currentDirection.lerp(this.targetDirection, this.smoothFactor);
    this.currentDirection.normalize();

    const magnitude = Math.random();
    if (magnitude > this.peakMagnitude) {
      this.peakMagnitude = magnitude;
    }

    const data: FlowData = {
      timestamp: performance.now(),
      direction: this.currentDirection.clone(),
      magnitude,
    };

    for (const fn of this.subscribers) {
      fn(data);
    }
  }
}
