import * as THREE from 'three'
import type { Connection } from './graphManager'

export interface SceneSnapshot {
  timestamp: number
  params: SceneParams
  gravityPoint: { x: number; y: number; z: number }
  connections: Connection[]
}

export interface SceneParams {
  particleCount: number
  particleSize: number
  speedMultiplier: number
  colorTheme: string
  gravityStrength: number
  gravityPointColor: string
}

export type RecordingStatus = 'idle' | 'recording' | 'playing'

const RECORD_DURATION = 10000
const PLAYBACK_SPEED = 2
const TRAIL_DURATION = 200

export class Recorder {
  private snapshots: SceneSnapshot[] = []
  private status: RecordingStatus = 'idle'
  private recordStartTime: number = 0
  private playbackStartTime: number = 0
  private playbackCurrentTime: number = 0
  private statusListeners: ((status: RecordingStatus) => void)[] = []
  private snapshotListeners: ((snapshot: SceneSnapshot) => void)[] = []
  private playbackCompleteListeners: (() => void)[] = []
  private savedParams: SceneParams | null = null
  private savedGravityPoint: THREE.Vector3 | null = null
  private savedConnections: Connection[] | null = null

  constructor() {}

  startRecording(initialParams: SceneParams, gravityPoint: THREE.Vector3, connections: Connection[]) {
    if (this.status !== 'idle') return

    this.snapshots = []
    this.status = 'recording'
    this.recordStartTime = performance.now()
    this.recordSnapshot(initialParams, gravityPoint, connections)
    this.notifyStatusChange()
  }

  recordSnapshot(params: SceneParams, gravityPoint: THREE.Vector3, connections: Connection[]) {
    if (this.status !== 'recording') return

    const elapsed = performance.now() - this.recordStartTime

    if (elapsed > RECORD_DURATION) {
      this.stopRecording()
      return
    }

    const snapshot: SceneSnapshot = {
      timestamp: elapsed,
      params: { ...params },
      gravityPoint: {
        x: gravityPoint.x,
        y: gravityPoint.y,
        z: gravityPoint.z
      },
      connections: connections.map(c => ({ ...c }))
    }

    this.snapshots.push(snapshot)
  }

  stopRecording() {
    if (this.status !== 'recording') return
    this.status = 'idle'
    this.notifyStatusChange()
  }

  startPlayback(currentParams: SceneParams, currentGravityPoint: THREE.Vector3, currentConnections: Connection[]) {
    if (this.status !== 'idle' || this.snapshots.length === 0) return

    this.savedParams = { ...currentParams }
    this.savedGravityPoint = currentGravityPoint.clone()
    this.savedConnections = currentConnections.map(c => ({ ...c }))

    this.status = 'playing'
    this.playbackStartTime = performance.now()
    this.playbackCurrentTime = 0
    this.notifyStatusChange()

    this.playbackLoop()
  }

  private playbackLoop() {
    if (this.status !== 'playing') return

    const elapsed = (performance.now() - this.playbackStartTime) * PLAYBACK_SPEED
    this.playbackCurrentTime = elapsed

    const recordDuration = RECORD_DURATION

    if (elapsed >= recordDuration) {
      this.stopPlayback()
      return
    }

    const snapshot = this.getSnapshotAtTime(elapsed)
    if (snapshot) {
      this.notifySnapshot(snapshot)
    }

    requestAnimationFrame(() => this.playbackLoop())
  }

  private getSnapshotAtTime(time: number): SceneSnapshot | null {
    if (this.snapshots.length === 0) return null
    if (time <= this.snapshots[0].timestamp) return this.snapshots[0]
    if (time >= this.snapshots[this.snapshots.length - 1].timestamp) {
      return this.snapshots[this.snapshots.length - 1]
    }

    let left = 0
    let right = this.snapshots.length - 1

    while (left < right) {
      const mid = Math.floor((left + right) / 2)
      if (this.snapshots[mid].timestamp < time) {
        left = mid + 1
      } else {
        right = mid
      }
    }

    const s1 = this.snapshots[left - 1]
    const s2 = this.snapshots[left]

    if (!s1) return s2
    if (!s2) return s1

    const t = (time - s1.timestamp) / (s2.timestamp - s1.timestamp)
    return this.interpolateSnapshots(s1, s2, t)
  }

  private interpolateSnapshots(s1: SceneSnapshot, s2: SceneSnapshot, t: number): SceneSnapshot {
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t

    return {
      timestamp: s1.timestamp + (s2.timestamp - s1.timestamp) * t,
      params: {
        particleCount: Math.round(lerp(s1.params.particleCount, s2.params.particleCount, t)),
        particleSize: lerp(s1.params.particleSize, s2.params.particleSize, t),
        speedMultiplier: lerp(s1.params.speedMultiplier, s2.params.speedMultiplier, t),
        colorTheme: t < 0.5 ? s1.params.colorTheme : s2.params.colorTheme,
        gravityStrength: lerp(s1.params.gravityStrength, s2.params.gravityStrength, t),
        gravityPointColor: t < 0.5 ? s1.params.gravityPointColor : s2.params.gravityPointColor
      },
      gravityPoint: {
        x: lerp(s1.gravityPoint.x, s2.gravityPoint.x, t),
        y: lerp(s1.gravityPoint.y, s2.gravityPoint.y, t),
        z: lerp(s1.gravityPoint.z, s2.gravityPoint.z, t)
      },
      connections: t < 0.5 ? s1.connections : s2.connections
    }
  }

  stopPlayback() {
    if (this.status !== 'playing') return

    this.status = 'idle'
    this.notifyStatusChange()

    if (this.savedParams && this.savedGravityPoint && this.savedConnections) {
      const restoreSnapshot: SceneSnapshot = {
        timestamp: performance.now(),
        params: this.savedParams,
        gravityPoint: {
          x: this.savedGravityPoint.x,
          y: this.savedGravityPoint.y,
          z: this.savedGravityPoint.z
        },
        connections: this.savedConnections
      }
      this.notifySnapshot(restoreSnapshot)
    }

    for (const listener of this.playbackCompleteListeners) {
      listener()
    }

    this.savedParams = null
    this.savedGravityPoint = null
    this.savedConnections = null
  }

  getStatus(): RecordingStatus {
    return this.status
  }

  getRecordProgress(): number {
    if (this.status !== 'recording') return 0
    const elapsed = performance.now() - this.recordStartTime
    return Math.min(elapsed / RECORD_DURATION, 1)
  }

  getPlaybackProgress(): number {
    if (this.status !== 'playing') return 0
    return Math.min(this.playbackCurrentTime / RECORD_DURATION, 1)
  }

  getTrailOpacity(): number {
    if (this.status !== 'playing') return 0
    const progress = this.playbackCurrentTime % TRAIL_DURATION / TRAIL_DURATION
    return 0.3 * (1 - progress)
  }

  hasRecording(): boolean {
    return this.snapshots.length > 0
  }

  getSnapshotCount(): number {
    return this.snapshots.length
  }

  getRecordDuration(): number {
    return RECORD_DURATION
  }

  onStatusChange(listener: (status: RecordingStatus) => void): () => void {
    this.statusListeners.push(listener)
    return () => {
      const idx = this.statusListeners.indexOf(listener)
      if (idx > -1) this.statusListeners.splice(idx, 1)
    }
  }

  onSnapshot(listener: (snapshot: SceneSnapshot) => void): () => void {
    this.snapshotListeners.push(listener)
    return () => {
      const idx = this.snapshotListeners.indexOf(listener)
      if (idx > -1) this.snapshotListeners.splice(idx, 1)
    }
  }

  onPlaybackComplete(listener: () => void): () => void {
    this.playbackCompleteListeners.push(listener)
    return () => {
      const idx = this.playbackCompleteListeners.indexOf(listener)
      if (idx > -1) this.playbackCompleteListeners.splice(idx, 1)
    }
  }

  private notifyStatusChange() {
    for (const listener of this.statusListeners) {
      listener(this.status)
    }
  }

  private notifySnapshot(snapshot: SceneSnapshot) {
    for (const listener of this.snapshotListeners) {
      listener(snapshot)
    }
  }
}
