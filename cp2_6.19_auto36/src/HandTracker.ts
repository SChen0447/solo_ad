import { Hands, Results } from '@mediapipe/hands'
import { Camera } from '@mediapipe/camera_utils'

export type GestureType = 'open' | 'fist' | 'none'

export interface HandData {
  gesture: GestureType
  palmPosition: { x: number; y: number; z: number } | null
  landmarks: Array<{ x: number; y: number; z: number }> | null
  isHandPresent: boolean
}

const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17]
]

const FINGER_COLORS: Record<number, string> = {
  0: 'rgba(0, 255, 140, 0.9)',
  1: 'rgba(0, 255, 160, 0.9)',
  2: 'rgba(50, 255, 180, 0.9)',
  3: 'rgba(80, 255, 200, 0.9)',
  4: 'rgba(100, 255, 220, 0.9)'
}

const CONNECTION_TO_FINGER: Map<string, number> = new Map([
  ['0-1', 0], ['1-2', 0], ['2-3', 0], ['3-4', 0],
  ['0-5', 1], ['5-6', 1], ['6-7', 1], ['7-8', 1],
  ['5-9', 2], ['9-10', 2], ['10-11', 2], ['11-12', 2],
  ['9-13', 3], ['13-14', 3], ['14-15', 3], ['15-16', 3],
  ['13-17', 4], ['17-18', 4], ['18-19', 4], ['19-20', 4],
  ['0-17', 0]
])

export class HandTracker {
  private hands: Hands | null = null
  private camera: Camera | null = null
  private videoElement: HTMLVideoElement
  private canvasElement: HTMLCanvasElement
  private canvasCtx: CanvasRenderingContext2D
  private handData: HandData = {
    gesture: 'none',
    palmPosition: null,
    landmarks: null,
    isHandPresent: false
  }
  private onHandDataCallback: ((data: HandData) => void) | null = null

  constructor(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement) {
    this.videoElement = videoElement
    this.canvasElement = canvasElement
    this.canvasCtx = canvasElement.getContext('2d')!
    this.resizeCanvas()
    window.addEventListener('resize', () => this.resizeCanvas())
  }

  private resizeCanvas(): void {
    this.canvasElement.width = window.innerWidth
    this.canvasElement.height = window.innerHeight
  }

  async init(): Promise<void> {
    this.hands = new Hands({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      }
    })

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5
    })

    this.hands.onResults((results: Results) => {
      this.handleResults(results)
    })

    this.camera = new Camera(this.videoElement, {
      onFrame: async () => {
        if (this.hands) {
          await this.hands.send({ image: this.videoElement })
        }
      },
      width: 1280,
      height: 720
    })

    await this.camera.start()
  }

  private handleResults(results: Results): void {
    this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height)

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0]
      const scaledLandmarks = landmarks.map(lm => ({
        x: lm.x * this.canvasElement.width,
        y: lm.y * this.canvasElement.height,
        z: lm.z
      }))

      const palmPos = this.calculatePalmPosition(scaledLandmarks)
      const gesture = this.detectGesture(scaledLandmarks)

      this.handData = {
        gesture,
        palmPosition: {
          x: palmPos.x,
          y: palmPos.y,
          z: palmPos.z
        },
        landmarks: scaledLandmarks,
        isHandPresent: true
      }

      this.drawHand(scaledLandmarks, gesture)
    } else {
      this.handData = {
        gesture: 'none',
        palmPosition: null,
        landmarks: null,
        isHandPresent: false
      }
    }

    if (this.onHandDataCallback) {
      this.onHandDataCallback(this.handData)
    }
  }

  private calculatePalmPosition(landmarks: Array<{ x: number; y: number; z: number }>): { x: number; y: number; z: number } {
    const palmIndices = [0, 5, 9, 13, 17]
    let sumX = 0, sumY = 0, sumZ = 0
    for (const idx of palmIndices) {
      sumX += landmarks[idx].x
      sumY += landmarks[idx].y
      sumZ += landmarks[idx].z
    }
    return {
      x: sumX / palmIndices.length,
      y: sumY / palmIndices.length,
      z: sumZ / palmIndices.length
    }
  }

  private detectGesture(landmarks: Array<{ x: number; y: number; z: number }>): GestureType {
    const fingerTips = [8, 12, 16, 20]
    const fingerPips = [6, 10, 14, 18]
    const mcpIndices = [5, 9, 13, 17]

    let foldedFingers = 0

    for (let i = 0; i < 4; i++) {
      const tip = landmarks[fingerTips[i]]
      const pip = landmarks[fingerPips[i]]
      const mcp = landmarks[mcpIndices[i]]
      const wrist = landmarks[0]

      const tipToWristDist = this.distance2D(tip, wrist)
      const mcpToWristDist = this.distance2D(mcp, wrist)

      if (tipToWristDist < mcpToWristDist * 1.5) {
        foldedFingers++
      }
    }

    const thumbTip = landmarks[4]
    const indexMcp = landmarks[5]
    const thumbToPalmDist = this.distance2D(thumbTip, indexMcp)
    const handSize = this.distance2D(landmarks[0], landmarks[9])
    const thumbFolded = thumbToPalmDist < handSize * 0.5

    if (foldedFingers >= 3 && thumbFolded) {
      return 'fist'
    } else if (foldedFingers <= 1) {
      return 'open'
    }

    return 'open'
  }

  private distance2D(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
  }

  private drawHand(landmarks: Array<{ x: number; y: number; z: number }>, gesture: GestureType): void {
    const ctx = this.canvasCtx

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
      const start = landmarks[startIdx]
      const end = landmarks[endIdx]
      const key = `${startIdx}-${endIdx}`
      const fingerIdx = CONNECTION_TO_FINGER.get(key) ?? 0
      const color = FINGER_COLORS[fingerIdx]

      const gradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y)
      gradient.addColorStop(0, color)
      gradient.addColorStop(1, FINGER_COLORS[(fingerIdx + 1) % 5])

      ctx.strokeStyle = gradient
      ctx.lineWidth = 4
      ctx.shadowColor = 'rgba(0, 255, 128, 0.9)'
      ctx.shadowBlur = 15

      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
      ctx.stroke()
    }

    ctx.shadowBlur = 10

    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i]
      const isFingerTip = [4, 8, 12, 16, 20].includes(i)
      const isWrist = i === 0
      const isJoint = [2, 3, 6, 7, 10, 11, 14, 15, 18, 19].includes(i)

      let radius = 4
      let fillColor = 'rgba(0, 255, 180, 0.95)'
      let shadowColor = 'rgba(0, 255, 180, 0.8)'

      if (isFingerTip) {
        radius = 7
        fillColor = 'rgba(120, 255, 220, 1)'
        shadowColor = 'rgba(120, 255, 220, 1)'
      } else if (isWrist) {
        radius = 8
        fillColor = 'rgba(0, 200, 255, 0.95)'
        shadowColor = 'rgba(0, 200, 255, 0.9)'
      } else if (isJoint) {
        radius = 5
        fillColor = 'rgba(50, 255, 160, 0.9)'
        shadowColor = 'rgba(50, 255, 160, 0.8)'
      }

      ctx.fillStyle = fillColor
      ctx.shadowColor = shadowColor

      ctx.beginPath()
      ctx.arc(lm.x, lm.y, radius, 0, Math.PI * 2)
      ctx.fill()

      if (isFingerTip || isWrist) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
        ctx.lineWidth = 1.5
        ctx.shadowBlur = 5
        ctx.stroke()
      }
    }

    const palmPos = this.calculatePalmPosition(landmarks)
    const wristToMiddleMcp = this.distance2D(landmarks[0], landmarks[9])
    const handSize = wristToMiddleMcp * 1.8
    const ringRadius = gesture === 'fist' ? handSize * 0.55 : handSize * 1.3
    const innerRadius = gesture === 'fist' ? handSize * 0.25 : handSize * 0.35

    let ringColor: string
    let ringColorRgb: { r: number; g: number; b: number }
    let fillColor: string

    if (gesture === 'fist') {
      ringColor = 'rgba(255, 70, 70, 0.55)'
      ringColorRgb = { r: 255, g: 70, b: 70 }
      fillColor = 'rgba(255, 70, 70, 0.18)'
    } else {
      ringColor = 'rgba(0, 190, 255, 0.45)'
      ringColorRgb = { r: 0, g: 190, b: 255 }
      fillColor = 'rgba(0, 190, 255, 0.12)'
    }

    ctx.shadowColor = `rgba(${ringColorRgb.r}, ${ringColorRgb.g}, ${ringColorRgb.b}, 0.9)`
    ctx.shadowBlur = 30

    ctx.strokeStyle = ringColor
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.arc(palmPos.x, palmPos.y, ringRadius, 0, Math.PI * 2)
    ctx.stroke()

    ctx.strokeStyle = `rgba(${ringColorRgb.r}, ${ringColorRgb.g}, ${ringColorRgb.b}, 0.25)`
    ctx.lineWidth = 10
    ctx.beginPath()
    ctx.arc(palmPos.x, palmPos.y, ringRadius + 5, 0, Math.PI * 2)
    ctx.stroke()

    ctx.fillStyle = fillColor
    ctx.beginPath()
    ctx.arc(palmPos.x, palmPos.y, innerRadius, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = `rgba(${ringColorRgb.r}, ${ringColorRgb.g}, ${ringColorRgb.b}, 0.7)`
    ctx.lineWidth = 2
    ctx.shadowBlur = 15
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + (Date.now() / 1500)
      const startAngle = angle - 0.25
      const endAngle = angle + 0.25
      ctx.beginPath()
      ctx.arc(palmPos.x, palmPos.y, ringRadius * 0.75, startAngle, endAngle)
      ctx.stroke()
    }

    ctx.fillStyle = `rgba(${ringColorRgb.r}, ${ringColorRgb.g}, ${ringColorRgb.b}, 0.95)`
    ctx.shadowBlur = 20
    ctx.beginPath()
    ctx.arc(palmPos.x, palmPos.y, 6, 0, Math.PI * 2)
    ctx.fill()

    ctx.shadowBlur = 0
  }

  onHandData(callback: (data: HandData) => void): void {
    this.onHandDataCallback = callback
  }

  getHandData(): HandData {
    return this.handData
  }
}
