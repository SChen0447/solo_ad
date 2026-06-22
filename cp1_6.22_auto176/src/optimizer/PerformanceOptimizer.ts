import { StarField } from '../starfield/StarField'
import { ConstellationManager } from '../constellation/ConstellationManager'

export type QualityMode = 'quality' | 'performance'

export interface PerformanceMetrics {
  fps: number
  frameTime: number
  currentStarCount: number
  isLowQuality: boolean
  qualityMode: QualityMode
}

export interface OptimizerCallbacks {
  onQualityChange?: (isLow: boolean) => void
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void
}

export class PerformanceOptimizer {
  private starField: StarField
  private constellationManager: ConstellationManager
  private callbacks: OptimizerCallbacks

  private lastFrameTime: number = 0
  private frameTimes: number[] = []
  private maxFrameTimes: number = 30
  private currentFps: number = 60
  private currentFrameTime: number = 16.67

  private qualityMode: QualityMode = 'quality'
  private isAutoDowngraded: boolean = false
  private isUserOverride: boolean = false

  private originalStarCount: number = 2000
  private lowStarCount: number = 1000
  private lowFpsThreshold: number = 30
  private highFpsThreshold: number = 45

  private consecutiveLowFrames: number = 0
  private consecutiveHighFrames: number = 0
  private frameThreshold: number = 60

  constructor(
    starField: StarField,
    constellationManager: ConstellationManager,
    callbacks: OptimizerCallbacks = {}
  ) {
    this.starField = starField
    this.constellationManager = constellationManager
    this.callbacks = callbacks
    this.originalStarCount = starField.getStarCount()
  }

  onFrame(currentTime: number): void {
    if (this.lastFrameTime > 0) {
      const delta = currentTime - this.lastFrameTime
      this.frameTimes.push(delta)

      if (this.frameTimes.length > this.maxFrameTimes) {
        this.frameTimes.shift()
      }

      const avgDelta = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
      this.currentFrameTime = avgDelta
      this.currentFps = 1000 / avgDelta

      if (!this.isUserOverride) {
        this.autoAdjustQuality()
      }

      if (this.callbacks.onMetricsUpdate) {
        this.callbacks.onMetricsUpdate(this.getMetrics())
      }
    }

    this.lastFrameTime = currentTime
  }

  private autoAdjustQuality(): void {
    if (this.currentFps < this.lowFpsThreshold) {
      this.consecutiveLowFrames++
      this.consecutiveHighFrames = 0

      if (this.consecutiveLowFrames >= this.frameThreshold && !this.isAutoDowngraded) {
        this.downgradeQuality()
        this.isAutoDowngraded = true
      }
    } else if (this.currentFps > this.highFpsThreshold) {
      this.consecutiveHighFrames++
      this.consecutiveLowFrames = 0

      if (this.consecutiveHighFrames >= this.frameThreshold && this.isAutoDowngraded) {
        this.upgradeQuality()
        this.isAutoDowngraded = false
      }
    } else {
      this.consecutiveLowFrames = Math.max(0, this.consecutiveLowFrames - 1)
      this.consecutiveHighFrames = Math.max(0, this.consecutiveHighFrames - 1)
    }
  }

  private downgradeQuality(): void {
    this.starField.setStarCount(this.lowStarCount)
    this.constellationManager.setGlowEnabled(false)

    if (this.callbacks.onQualityChange) {
      this.callbacks.onQualityChange(true)
    }
  }

  private upgradeQuality(): void {
    this.starField.setStarCount(this.originalStarCount)
    this.constellationManager.setGlowEnabled(true)

    if (this.callbacks.onQualityChange) {
      this.callbacks.onQualityChange(false)
    }
  }

  setQualityMode(mode: QualityMode): void {
    this.qualityMode = mode
    this.isUserOverride = true

    if (mode === 'performance') {
      this.starField.setStarCount(this.lowStarCount)
      this.starField.setShowGalaxy(false)
      this.constellationManager.setGlowEnabled(false)
      this.constellationManager.setShowBubbles(false)
    } else {
      this.starField.setStarCount(this.originalStarCount)
      this.starField.setShowGalaxy(true)
      this.constellationManager.setGlowEnabled(true)
      this.constellationManager.setShowBubbles(true)
    }

    if (this.callbacks.onQualityChange) {
      this.callbacks.onQualityChange(mode === 'performance')
    }
  }

  getQualityMode(): QualityMode {
    return this.qualityMode
  }

  enableAutoAdjust(): void {
    this.isUserOverride = false
  }

  disableAutoAdjust(): void {
    this.isUserOverride = true
  }

  getIsAutoAdjustEnabled(): boolean {
    return !this.isUserOverride
  }

  getMetrics(): PerformanceMetrics {
    return {
      fps: Math.round(this.currentFps),
      frameTime: Math.round(this.currentFrameTime * 100) / 100,
      currentStarCount: this.starField.getStarCount(),
      isLowQuality: this.isAutoDowngraded || this.qualityMode === 'performance',
      qualityMode: this.qualityMode,
    }
  }

  setFpsThresholds(low: number, high: number): void {
    this.lowFpsThreshold = low
    this.highFpsThreshold = high
  }

  setStarCounts(original: number, low: number): void {
    this.originalStarCount = original
    this.lowStarCount = low
  }

  reset(): void {
    this.frameTimes = []
    this.consecutiveLowFrames = 0
    this.consecutiveHighFrames = 0
    this.isAutoDowngraded = false
    this.lastFrameTime = 0
  }

  dispose(): void {
    this.frameTimes = []
  }
}
