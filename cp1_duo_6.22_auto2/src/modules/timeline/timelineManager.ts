import { reactive, ref, computed } from 'vue'
import type { CanvasElement } from '../render/canvasElement'
import { Keyframe } from './keyframe'
import type { EasingType, KeyframeProperties } from './keyframe'

export type PlayMode = 'once' | 'loop'

export interface TimelineState {
  currentFrame: number
  totalFrames: number
  fps: number
  isPlaying: boolean
  playMode: PlayMode
}

export interface PerformanceMetrics {
  actualFps: number
  targetFps: number
  frameTime: number
  droppedFrames: number
  totalFramesProcessed: number
  frameSkipCount: number
  lastUpdateTime: number
}

export interface PerformanceConfig {
  enabled: boolean
  minFps: number
  maxFrameSkip: number
  adaptiveFrameSkip: boolean
  targetFrameTime: number
}

class TimelineManager {
  private state = reactive<TimelineState>({
    currentFrame: 0,
    totalFrames: 120,
    fps: 24,
    isPlaying: false,
    playMode: 'loop'
  })

  private performance = reactive<PerformanceMetrics>({
    actualFps: 0,
    targetFps: 24,
    frameTime: 0,
    droppedFrames: 0,
    totalFramesProcessed: 0,
    frameSkipCount: 0,
    lastUpdateTime: 0
  })

  private perfConfig: PerformanceConfig = {
    enabled: true,
    minFps: 30,
    maxFrameSkip: 3,
    adaptiveFrameSkip: true,
    targetFrameTime: 1000 / 24
  }

  private elements = ref<CanvasElement[]>([])
  private selectedElementId = ref<string | null>(null)
  private selectedKeyframeElementId = ref<string | null>(null)
  private selectedKeyframeFrame = ref<number | null>(null)

  private animationFrameId: number | null = null
  private lastFrameTime = 0
  private frameAccumulator = 0

  private fpsHistory: number[] = []
  private fpsSampleCount = 60
  private lastFpsUpdate = 0
  private framesThisSecond = 0

  private needsRender = ref(true)
  private renderDirty = false

  private listeners: Set<() => void> = new Set()

  get currentFrame(): number {
    return this.state.currentFrame
  }

  get totalFrames(): number {
    return this.state.totalFrames
  }

  get fps(): number {
    return this.state.fps
  }

  get isPlaying(): boolean {
    return this.state.isPlaying
  }

  get playMode(): PlayMode {
    return this.state.playMode
  }

  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performance }
  }

  setPerformanceConfig(config: Partial<PerformanceConfig>): void {
    this.perfConfig = { ...this.perfConfig, ...config }
    this.perfConfig.targetFrameTime = 1000 / this.state.fps
  }

  markDirty(): void {
    this.renderDirty = true
    this.needsRender.value = true
  }

  shouldRender(): boolean {
    return this.needsRender.value || this.renderDirty
  }

  clearRenderFlag(): void {
    this.needsRender.value = false
    this.renderDirty = false
  }

  getElements(): CanvasElement[] {
    return this.elements.value
  }

  getSelectedElementId(): string | null {
    return this.selectedElementId.value
  }

  getSelectedKeyframe(): { elementId: string | null; frame: number | null } {
    return {
      elementId: this.selectedKeyframeElementId.value,
      frame: this.selectedKeyframeFrame.value
    }
  }

  setTotalFrames(frames: number): void {
    this.state.totalFrames = Math.max(1, frames)
    if (this.state.currentFrame > this.state.totalFrames - 1) {
      this.state.currentFrame = this.state.totalFrames - 1
    }
    this.markDirty()
  }

  setFps(fps: number): void {
    this.state.fps = Math.max(1, Math.min(120, fps))
    this.performance.targetFps = this.state.fps
    this.perfConfig.targetFrameTime = 1000 / this.state.fps
  }

  setPlayMode(mode: PlayMode): void {
    this.state.playMode = mode
  }

  setCurrentFrame(frame: number): void {
    this.state.currentFrame = Math.max(0, Math.min(this.state.totalFrames - 1, frame))
    this.markDirty()
    this.notifyListeners()
  }

  setElements(elements: CanvasElement[]): void {
    this.elements.value = elements
    this.markDirty()
  }

  addElement(element: CanvasElement): void {
    this.elements.value.push(element)
    this.markDirty()
  }

  removeElement(elementId: string): void {
    const index = this.elements.value.findIndex(e => e.id === elementId)
    if (index >= 0) {
      this.elements.value.splice(index, 1)
      if (this.selectedElementId.value === elementId) {
        this.selectedElementId.value = null
      }
      if (this.selectedKeyframeElementId.value === elementId) {
        this.selectedKeyframeElementId.value = null
        this.selectedKeyframeFrame.value = null
      }
      this.markDirty()
    }
  }

  selectElement(elementId: string | null): void {
    this.selectedElementId.value = elementId
    this.selectedKeyframeElementId.value = null
    this.selectedKeyframeFrame.value = null
    this.markDirty()
  }

  selectKeyframe(elementId: string, frame: number): void {
    this.selectedKeyframeElementId.value = elementId
    this.selectedKeyframeFrame.value = frame
    this.selectedElementId.value = elementId
    this.markDirty()
  }

  addKeyframe(
    elementId: string,
    frame: number,
    properties: Partial<KeyframeProperties>,
    easing: EasingType = 'easeOutCubic'
  ): void {
    const element = this.elements.value.find(e => e.id === elementId)
    if (element) {
      const keyframe = new Keyframe(frame, properties, easing)
      element.addKeyframe(keyframe)
      this.updateTotalFramesFromKeyframes()
      this.markDirty()
    }
  }

  removeKeyframe(elementId: string, frame: number): boolean {
    const element = this.elements.value.find(e => e.id === elementId)
    if (element) {
      const result = element.removeKeyframe(frame)
      if (this.selectedKeyframeElementId.value === elementId && this.selectedKeyframeFrame.value === frame) {
        this.selectedKeyframeElementId.value = null
        this.selectedKeyframeFrame.value = null
      }
      this.markDirty()
      return result
    }
    return false
  }

  moveKeyframe(elementId: string, oldFrame: number, newFrame: number): boolean {
    const element = this.elements.value.find(e => e.id === elementId)
    if (element) {
      const kf = element.getKeyframeAtFrame(oldFrame)
      if (kf) {
        element.removeKeyframe(oldFrame)
        const movedKf = new Keyframe(newFrame, kf.properties, kf.easing, kf.customEasingFn ?? undefined)
        element.addKeyframe(movedKf)
        if (this.selectedKeyframeElementId.value === elementId && this.selectedKeyframeFrame.value === oldFrame) {
          this.selectedKeyframeFrame.value = newFrame
        }
        this.updateTotalFramesFromKeyframes()
        this.markDirty()
        return true
      }
    }
    return false
  }

  updateKeyframeProperties(
    elementId: string,
    frame: number,
    properties: Partial<KeyframeProperties>
  ): boolean {
    const element = this.elements.value.find(e => e.id === elementId)
    if (element) {
      const kf = element.getKeyframeAtFrame(frame)
      if (kf) {
        kf.properties = { ...kf.properties, ...properties }
        this.markDirty()
        this.notifyListeners()
        return true
      }
    }
    return false
  }

  updateKeyframeEasing(elementId: string, frame: number, easing: EasingType): boolean {
    const element = this.elements.value.find(e => e.id === elementId)
    if (element) {
      const kf = element.getKeyframeAtFrame(frame)
      if (kf) {
        kf.easing = easing
        this.markDirty()
        this.notifyListeners()
        return true
      }
    }
    return false
  }

  play(): void {
    if (this.state.isPlaying) return
    this.state.isPlaying = true
    this.lastFrameTime = performance.now()
    this.lastFpsUpdate = this.lastFrameTime
    this.frameAccumulator = 0
    this.framesThisSecond = 0
    this.performance.droppedFrames = 0
    this.performance.totalFramesProcessed = 0
    this.performance.frameSkipCount = 0
    this.animationLoop()
  }

  pause(): void {
    this.state.isPlaying = false
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  stop(): void {
    this.pause()
    this.state.currentFrame = 0
    this.markDirty()
    this.notifyListeners()
  }

  togglePlay(): void {
    if (this.state.isPlaying) {
      this.pause()
    } else {
      this.play()
    }
  }

  private animationLoop = (): void => {
    if (!this.state.isPlaying) return

    const now = performance.now()
    const deltaTime = now - this.lastFrameTime
    this.lastFrameTime = now

    this.updateFpsCounter(now)
    this.adjustFrameSkip(deltaTime)

    const frameDuration = this.perfConfig.targetFrameTime
    this.frameAccumulator += deltaTime

    let framesToAdvance = 0
    while (this.frameAccumulator >= frameDuration) {
      this.frameAccumulator -= frameDuration
      framesToAdvance++
    }

    if (framesToAdvance > 0) {
      let framesSkipped = 0
      const maxSkip = this.perfConfig.adaptiveFrameSkip
        ? Math.min(framesToAdvance - 1, this.perfConfig.maxFrameSkip)
        : 0

      if (maxSkip > 0 && this.performance.actualFps < this.perfConfig.minFps) {
        framesSkipped = Math.min(maxSkip, framesToAdvance - 1)
        if (framesSkipped > 0) {
          this.advanceFrames(framesSkipped, true)
          this.performance.frameSkipCount += framesSkipped
          this.performance.droppedFrames += framesSkipped
          framesToAdvance -= framesSkipped
        }
      }

      for (let i = 0; i < framesToAdvance; i++) {
        this.advanceFrames(1, false)
        this.performance.totalFramesProcessed++
      }

      this.markDirty()
    }

    this.performance.frameTime = deltaTime
    this.performance.lastUpdateTime = now

    this.notifyListeners()
    this.animationFrameId = requestAnimationFrame(this.animationLoop)
  }

  private advanceFrames(count: number, silent: boolean = false): void {
    for (let i = 0; i < count; i++) {
      this.advanceFrame()
    }
  }

  private advanceFrame(): void {
    const nextFrame = this.state.currentFrame + 1
    if (nextFrame >= this.state.totalFrames) {
      if (this.state.playMode === 'loop') {
        this.state.currentFrame = 0
      } else {
        this.state.currentFrame = this.state.totalFrames - 1
        this.pause()
      }
    } else {
      this.state.currentFrame = nextFrame
    }
  }

  private updateFpsCounter(now: number): void {
    this.framesThisSecond++

    if (now - this.lastFpsUpdate >= 1000) {
      const fps = this.framesThisSecond * 1000 / (now - this.lastFpsUpdate)
      this.fpsHistory.push(fps)
      if (this.fpsHistory.length > this.fpsSampleCount) {
        this.fpsHistory.shift()
      }

      const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
      this.performance.actualFps = Math.round(avgFps * 10) / 10

      this.framesThisSecond = 0
      this.lastFpsUpdate = now
    }
  }

  private adjustFrameSkip(deltaTime: number): void {
    if (!this.perfConfig.adaptiveFrameSkip || !this.perfConfig.enabled) return

    const targetFrameTime = this.perfConfig.targetFrameTime
    const overloadRatio = deltaTime / targetFrameTime

    if (overloadRatio > 1.5 && this.performance.actualFps < this.perfConfig.minFps) {
      this.perfConfig.maxFrameSkip = Math.min(5, this.perfConfig.maxFrameSkip + 1)
    } else if (overloadRatio < 1.2 && this.performance.actualFps > this.state.fps * 0.8) {
      this.perfConfig.maxFrameSkip = Math.max(0, this.perfConfig.maxFrameSkip - 1)
    }
  }

  private updateTotalFramesFromKeyframes(): void {
    let maxFrame = 0
    for (const element of this.elements.value) {
      for (const kf of element.keyframes) {
        if (kf.frame > maxFrame) {
          maxFrame = kf.frame
        }
      }
    }
    if (maxFrame + 24 > this.state.totalFrames) {
      this.state.totalFrames = maxFrame + 24
    }
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }

  getStateSnapshot() {
    return {
      currentFrame: computed(() => this.state.currentFrame),
      totalFrames: computed(() => this.state.totalFrames),
      fps: computed(() => this.state.fps),
      isPlaying: computed(() => this.state.isPlaying),
      playMode: computed(() => this.state.playMode),
      elements: this.elements,
      selectedElementId: this.selectedElementId,
      selectedKeyframeElementId: this.selectedKeyframeElementId,
      selectedKeyframeFrame: this.selectedKeyframeFrame,
      performance: computed(() => ({ ...this.performance })),
      needsRender: this.needsRender
    }
  }
}

export const timelineManager = new TimelineManager()
