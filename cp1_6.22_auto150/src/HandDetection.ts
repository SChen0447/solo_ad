import { Hands, Results } from '@mediapipe/hands'

export interface HandLandmark {
  x: number
  y: number
  z: number
}

export interface HandData {
  landmarks: HandLandmark[]
  handedness: 'Left' | 'Right'
  timestamp: number
}

export type HandDataCallback = (handData: HandData[]) => void

const FINGER_TIP_INDICES = [4, 8, 12, 16, 20]

export class HandDetection {
  private hands: Hands | null = null
  private videoElement: HTMLVideoElement | null = null
  private canvasElement: HTMLCanvasElement | null = null
  private animationFrameId: number | null = null
  private callback: HandDataCallback | null = null
  private isRunning = false
  private lastDetectTime = 0
  private detectInterval = 1000 / 30

  constructor() {
    this.videoElement = document.createElement('video')
    this.videoElement.style.display = 'none'
    this.videoElement.setAttribute('playsinline', 'true')
    this.canvasElement = document.createElement('canvas')
    this.canvasElement.style.display = 'none'
  }

  async init(callback: HandDataCallback): Promise<void> {
    this.callback = callback

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: 640,
        height: 480,
        facingMode: 'user'
      }
    })

    this.videoElement!.srcObject = stream
    await this.videoElement!.play()

    this.hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      }
    })

    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    })

    this.hands.onResults(this.onResults.bind(this))
  }

  private onResults(results: Results): void {
    const now = performance.now()
    const handDataList: HandData[] = []

    if (results.multiHandLandmarks && results.multiHandedness) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks = results.multiHandLandmarks[i]
        const handedness = results.multiHandedness[i].label as 'Left' | 'Right'
        
        const normalizedLandmarks: HandLandmark[] = landmarks.map(lm => ({
          x: lm.x,
          y: lm.y,
          z: lm.z
        }))

        handDataList.push({
          landmarks: normalizedLandmarks,
          handedness,
          timestamp: now
        })
      }
    }

    if (this.callback) {
      this.callback(handDataList)
    }
  }

  start(): void {
    if (this.isRunning || !this.hands || !this.videoElement) return
    this.isRunning = true
    this.detectLoop()
  }

  private detectLoop = async (): Promise<void> => {
    if (!this.isRunning || !this.hands || !this.videoElement) return

    const now = performance.now()
    if (now - this.lastDetectTime >= this.detectInterval) {
      await this.hands.send({ image: this.videoElement })
      this.lastDetectTime = now
    }

    this.animationFrameId = requestAnimationFrame(this.detectLoop)
  }

  stop(): void {
    this.isRunning = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    if (this.videoElement && this.videoElement.srcObject) {
      const stream = this.videoElement.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      this.videoElement.srcObject = null
    }
    if (this.hands) {
      this.hands.close()
      this.hands = null
    }
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement
  }

  static getFingerTipIndices(): number[] {
    return FINGER_TIP_INDICES
  }
}
