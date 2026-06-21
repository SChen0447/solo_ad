import type { GameElement, GameState, FrameData } from '../types'
import { generateId } from '../types'

type FrameCallback = (data: FrameData) => void

export class GameEngine {
  private state: GameState
  private animationId: number | null = null
  private lastTime: number = 0
  private frameCount: number = 0
  private fpsTime: number = 0
  private currentFps: number = 60
  private avgFps: number = 60
  private minFps: number = 60
  private fpsHistory: number[] = []
  private totalFpsSamples: number = 0
  private totalFpsSum: number = 0
  private frameCallback: FrameCallback | null = null
  private canvasWidth: number = 800
  private canvasHeight: number = 600
  private keys: Set<string> = new Set()

  constructor() {
    this.state = {
      elements: [],
      score: 0,
      isRunning: false,
      isPaused: false,
      selectedId: null,
      title: '我的游戏',
      author: '开发者'
    }
    this.setupKeyboard()
  }

  private setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code)
      if (e.code === 'Space' && this.state.isRunning) {
        e.preventDefault()
        this.togglePause()
      }
      if (e.code === 'Escape' && this.state.isRunning) {
        this.stop()
      }
    })
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code)
    })
  }

  setFrameCallback(cb: FrameCallback) {
    this.frameCallback = cb
  }

  setCanvasSize(w: number, h: number) {
    this.canvasWidth = w
    this.canvasHeight = h
  }

  getState(): GameState {
    return JSON.parse(JSON.stringify(this.state))
  }

  setState(state: GameState) {
    this.state = JSON.parse(JSON.stringify(state))
  }

  addElement(element: GameElement) {
    this.state.elements.push(element)
  }

  removeElement(id: string) {
    this.state.elements = this.state.elements.filter(el => el.id !== id)
    if (this.state.selectedId === id) {
      this.state.selectedId = null
    }
  }

  selectElement(id: string | null) {
    this.state.selectedId = id
  }

  updateElement(id: string, updates: Partial<GameElement>) {
    const el = this.state.elements.find(e => e.id === id)
    if (el) {
      Object.assign(el, updates)
    }
  }

  reorderElements(ids: string[]) {
    const map = new Map(this.state.elements.map(el => [el.id, el]))
    this.state.elements = ids.map(id => map.get(id)).filter(Boolean) as GameElement[]
  }

  setScore(score: number) {
    this.state.score = score
  }

  setTitle(title: string) {
    this.state.title = title
  }

  setAuthor(author: string) {
    this.state.author = author
  }

  start() {
    this.state.isRunning = true
    this.state.isPaused = false
    this.state.score = 0
    this.state.elements.forEach(el => {
      el.physics.velocityX = 0
      el.physics.velocityY = 0
    })
    this.lastTime = performance.now()
    this.frameCount = 0
    this.fpsTime = this.lastTime
    this.currentFps = 60
    this.avgFps = 60
    this.minFps = 60
    this.fpsHistory = []
    this.totalFpsSamples = 0
    this.totalFpsSum = 0
    this.loop()
  }

  togglePause() {
    this.state.isPaused = !this.state.isPaused
    if (!this.state.isPaused) {
      this.lastTime = performance.now()
    }
  }

  pause() {
    this.state.isPaused = true
  }

  stop() {
    this.state.isRunning = false
    this.state.isPaused = false
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    this.emitFrame()
  }

  private loop = () => {
    if (!this.state.isRunning) return
    const now = performance.now()
    const dt = Math.min((now - this.lastTime) / 1000, 1 / 30)
    this.lastTime = now

    this.frameCount++
    if (now - this.fpsTime >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.fpsTime))
      this.frameCount = 0
      this.fpsTime = now
      this.fpsHistory.push(this.currentFps)
      if (this.fpsHistory.length > 120) this.fpsHistory.shift()
      this.totalFpsSamples++
      this.totalFpsSum += this.currentFps
      this.avgFps = Math.round(this.totalFpsSum / this.totalFpsSamples)
      this.minFps = Math.min(...this.fpsHistory)
    }

    if (!this.state.isPaused) {
      this.update(dt)
    }

    this.emitFrame()
    this.animationId = requestAnimationFrame(this.loop)
  }

  private emitFrame() {
    if (this.frameCallback) {
      this.frameCallback({
        elements: this.state.elements,
        score: this.state.score,
        fps: this.currentFps,
        avgFps: this.avgFps,
        minFps: this.minFps,
        isPaused: this.state.isPaused
      })
    }
  }

  private update(dt: number) {
    const elements = this.state.elements

    for (const el of elements) {
      if (!el.physics.isStatic) {
        el.physics.velocityY += el.physics.gravity * dt
        el.x += el.physics.velocityX * dt
        el.y += el.physics.velocityY * dt

        const friction = Math.max(0, 1 - el.physics.friction * dt * 10)
        el.physics.velocityX *= friction

        if (el.type === 'circle' && el.radius) {
          if (el.y + el.radius > this.canvasHeight) {
            el.y = this.canvasHeight - el.radius
            el.physics.velocityY = -el.physics.velocityY * el.physics.bounciness
            el.physics.velocityX *= (1 - el.physics.friction)
          }
          if (el.y - el.radius < 0) {
            el.y = el.radius
            el.physics.velocityY = -el.physics.velocityY * el.physics.bounciness
          }
          if (el.x + el.radius > this.canvasWidth) {
            el.x = this.canvasWidth - el.radius
            el.physics.velocityX = -el.physics.velocityX * el.physics.bounciness
          }
          if (el.x - el.radius < 0) {
            el.x = el.radius
            el.physics.velocityX = -el.physics.velocityX * el.physics.bounciness
          }
        } else {
          if (el.y + el.height > this.canvasHeight) {
            el.y = this.canvasHeight - el.height
            el.physics.velocityY = -el.physics.velocityY * el.physics.bounciness
            el.physics.velocityX *= (1 - el.physics.friction)
          }
          if (el.y < 0) {
            el.y = 0
            el.physics.velocityY = -el.physics.velocityY * el.physics.bounciness
          }
          if (el.x + el.width > this.canvasWidth) {
            el.x = this.canvasWidth - el.width
            el.physics.velocityX = -el.physics.velocityX * el.physics.bounciness
          }
          if (el.x < 0) {
            el.x = 0
            el.physics.velocityX = -el.physics.velocityX * el.physics.bounciness
          }
        }
      }

      if (el.script && el.script.trim()) {
        try {
          const scriptFn = new Function(
            'element', 'state', 'keys', 'dt', 'engine',
            el.script
          )
          scriptFn(el, this.state, this.keys, dt, {
            generateId,
            addElement: (e: GameElement) => this.addElement(e),
            removeElement: (id: string) => this.removeElement(id),
            setScore: (s: number) => this.setScore(s),
            getElements: () => this.state.elements
          })
        } catch (e) {
          // Script error, silently ignore
        }
      }
    }

    this.resolveCollisions()
  }

  private getAABB(el: GameElement) {
    if (el.type === 'circle' && el.radius) {
      return {
        minX: el.x - el.radius,
        minY: el.y - el.radius,
        maxX: el.x + el.radius,
        maxY: el.y + el.radius
      }
    }
    return {
      minX: el.x,
      minY: el.y,
      maxX: el.x + el.width,
      maxY: el.y + el.height
    }
  }

  private resolveCollisions() {
    const elements = this.state.elements
    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        const a = elements[i]
        const b = elements[j]
        const boxA = this.getAABB(a)
        const boxB = this.getAABB(b)

        if (
          boxA.minX < boxB.maxX &&
          boxA.maxX > boxB.minX &&
          boxA.minY < boxB.maxY &&
          boxA.maxY > boxB.minY
        ) {
          this.handleCollision(a, b, boxA, boxB)
        }
      }
    }
  }

  private handleCollision(a: GameElement, b: GameElement, boxA: any, boxB: any) {
    if (a.physics.isStatic && b.physics.isStatic) return

    const overlapX = Math.min(boxA.maxX - boxB.minX, boxB.maxX - boxA.minX)
    const overlapY = Math.min(boxA.maxY - boxB.minY, boxB.maxY - boxA.minY)

    if (overlapX < overlapY) {
      if (!a.physics.isStatic && !b.physics.isStatic) {
        const shift = overlapX / 2
        if (a.x < b.x) {
          a.x -= shift
          b.x += shift
        } else {
          a.x += shift
          b.x -= shift
        }
        const temp = a.physics.velocityX
        a.physics.velocityX = b.physics.velocityX * a.physics.bounciness
        b.physics.velocityX = temp * b.physics.bounciness
      } else if (!a.physics.isStatic) {
        if (a.x < b.x) {
          a.x -= overlapX
        } else {
          a.x += overlapX
        }
        a.physics.velocityX = -a.physics.velocityX * a.physics.bounciness
      } else {
        if (b.x < a.x) {
          b.x -= overlapX
        } else {
          b.x += overlapX
        }
        b.physics.velocityX = -b.physics.velocityX * b.physics.bounciness
      }
    } else {
      if (!a.physics.isStatic && !b.physics.isStatic) {
        const shift = overlapY / 2
        if (a.y < b.y) {
          a.y -= shift
          b.y += shift
        } else {
          a.y += shift
          b.y -= shift
        }
        const temp = a.physics.velocityY
        a.physics.velocityY = b.physics.velocityY * a.physics.bounciness
        b.physics.velocityY = temp * b.physics.bounciness
      } else if (!a.physics.isStatic) {
        if (a.y < b.y) {
          a.y -= overlapY
        } else {
          a.y += overlapY
        }
        a.physics.velocityY = -a.physics.velocityY * a.physics.bounciness
      } else {
        if (b.y < a.y) {
          b.y -= overlapY
        } else {
          b.y += overlapY
        }
        b.physics.velocityY = -b.physics.velocityY * b.physics.bounciness
      }
    }
  }

  isKeyPressed(code: string): boolean {
    return this.keys.has(code)
  }
}
