export class GestureController {
  private gestureValue: number = 0.5
  private targetGestureValue: number = 0.5
  private videoElement: HTMLVideoElement | null = null
  private hands: any = null
  private animationFrameId: number | null = null
  private onGestureChange: ((value: number) => void) | null = null
  private isKeyboardFallback: boolean = false
  private fps: number = 0
  private frameCount: number = 0
  private lastFpsUpdate: number = 0

  constructor(onGestureChange?: (value: number) => void) {
    if (onGestureChange) {
      this.onGestureChange = onGestureChange
    }
  }

  async init(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      })
      
      this.videoElement = document.createElement('video')
      this.videoElement.srcObject = stream
      this.videoElement.width = 640
      this.videoElement.height = 480
      this.videoElement.style.display = 'none'
      document.body.appendChild(this.videoElement)
      
      await this.videoElement.play()
      
      try {
        await this.initMediaPipeHands()
        this.startDetectionLoop()
        return true
      } catch (mpError) {
        console.warn('MediaPipe Hands initialization failed, falling back to keyboard:', mpError)
        this.enableKeyboardFallback()
        return false
      }
    } catch (error) {
      console.warn('Camera access denied or unavailable, falling back to keyboard:', error)
      this.enableKeyboardFallback()
      return false
    }
  }

  private async initMediaPipeHands(): Promise<void> {
    const { Hands } = await import('@mediapipe/hands')
    
    this.hands = new Hands({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      }
    })
    
    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    })
    
    this.hands.onResults((results: any) => {
      this.onHandResults(results)
    })
  }

  private onHandResults(results: any): void {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0]
      const fingerOpenness = this.calculateFingerOpenness(landmarks)
      const avgOpenness = fingerOpenness.reduce((a, b) => a + b, 0) / fingerOpenness.length
      this.targetGestureValue = Math.max(0, Math.min(1, avgOpenness))
    }
  }

  private calculateFingerOpenness(landmarks: any[]): number[] {
    const fingerTips = [4, 8, 12, 16, 20]
    const fingerMcps = [2, 5, 9, 13, 17]
    const wrist = 0
    
    const openness: number[] = []
    
    for (let i = 0; i < 5; i++) {
      const tip = landmarks[fingerTips[i]]
      const mcp = landmarks[fingerMcps[i]]
      const wristPoint = landmarks[wrist]
      
      const tipToWrist = this.distance(tip, wristPoint)
      const mcpToWrist = this.distance(mcp, wristPoint)
      
      let ratio = tipToWrist / mcpToWrist
      
      const minRatio = 1.2
      const maxRatio = 2.5
      ratio = (ratio - minRatio) / (maxRatio - minRatio)
      ratio = Math.max(0, Math.min(1, ratio))
      
      openness.push(ratio)
    }
    
    return openness
  }

  private distance(p1: any, p2: any): number {
    const dx = p1.x - p2.x
    const dy = p1.y - p2.y
    const dz = (p1.z || 0) - (p2.z || 0)
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  private startDetectionLoop(): void {
    const detect = async () => {
      if (this.videoElement && this.hands && this.videoElement.readyState >= 2) {
        try {
          await this.hands.send({ image: this.videoElement })
        } catch (e) {
          // Skip frame on error
        }
      }
      
      this.updateSmoothValue()
      this.updateFps()
      
      this.animationFrameId = requestAnimationFrame(detect)
    }
    
    this.animationFrameId = requestAnimationFrame(detect)
  }

  private enableKeyboardFallback(): void {
    this.isKeyboardFallback = true
    window.addEventListener('keydown', this.handleKeyDown)
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Space') {
      e.preventDefault()
      this.targetGestureValue = Math.min(1, this.targetGestureValue + 0.1)
    } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      e.preventDefault()
      this.targetGestureValue = Math.max(0, this.targetGestureValue - 0.1)
    }
  }

  private updateSmoothValue(): void {
    const smoothing = 0.1
    this.gestureValue += (this.targetGestureValue - this.gestureValue) * smoothing
    
    if (this.onGestureChange) {
      this.onGestureChange(this.gestureValue)
    }
  }

  private updateFps(): void {
    const now = performance.now()
    this.frameCount++
    
    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = this.frameCount
      this.frameCount = 0
      this.lastFpsUpdate = now
    }
  }

  getValue(): number {
    return this.gestureValue
  }

  getFps(): number {
    return this.fps
  }

  getIsKeyboardFallback(): boolean {
    return this.isKeyboardFallback
  }

  setTargetValue(value: number): void {
    this.targetGestureValue = Math.max(0, Math.min(1, value))
  }

  destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    
    if (this.videoElement && this.videoElement.srcObject) {
      const stream = this.videoElement.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      this.videoElement.remove()
      this.videoElement = null
    }
    
    window.removeEventListener('keydown', this.handleKeyDown)
    
    this.hands = null
  }
}
