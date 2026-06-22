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

class TimelineManager {
  private state = reactive<TimelineState>({
    currentFrame: 0,
    totalFrames: 120,
    fps: 24,
    isPlaying: false,
    playMode: 'loop'
  })

  private elements = ref<CanvasElement[]>([])
  private selectedElementId = ref<string | null>(null)
  private selectedKeyframeElementId = ref<string | null>(null)
  private selectedKeyframeFrame = ref<number | null>(null)

  private animationFrameId: number | null = null
  private lastFrameTime = 0
  private frameAccumulator = 0

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
  }

  setFps(fps: number): void {
    this.state.fps = Math.max(1, Math.min(120, fps))
  }

  setPlayMode(mode: PlayMode): void {
    this.state.playMode = mode
  }

  setCurrentFrame(frame: number): void {
    this.state.currentFrame = Math.max(0, Math.min(this.state.totalFrames - 1, frame))
    this.notifyListeners()
  }

  setElements(elements: CanvasElement[]): void {
    this.elements.value = elements
  }

  addElement(element: CanvasElement): void {
    this.elements.value.push(element)
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
    }
  }

  selectElement(elementId: string | null): void {
    this.selectedElementId.value = elementId
    this.selectedKeyframeElementId.value = null
    this.selectedKeyframeFrame.value = null
  }

  selectKeyframe(elementId: string, frame: number): void {
    this.selectedKeyframeElementId.value = elementId
    this.selectedKeyframeFrame.value = frame
    this.selectedElementId.value = elementId
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
        const movedKf = new Keyframe(newFrame, kf.properties, kf.easing)
        element.addKeyframe(movedKf)
        if (this.selectedKeyframeElementId.value === elementId && this.selectedKeyframeFrame.value === oldFrame) {
          this.selectedKeyframeFrame.value = newFrame
        }
        this.updateTotalFramesFromKeyframes()
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
    this.frameAccumulator = 0
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

    const frameDuration = 1000 / this.state.fps
    this.frameAccumulator += deltaTime

    while (this.frameAccumulator >= frameDuration) {
      this.frameAccumulator -= frameDuration
      this.advanceFrame()
    }

    this.notifyListeners()
    this.animationFrameId = requestAnimationFrame(this.animationLoop)
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
      selectedKeyframeFrame: this.selectedKeyframeFrame
    }
  }
}

export const timelineManager = new TimelineManager()
