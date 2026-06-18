import { isPositionValid, playerStartPos } from './Map'

export const PLAYER_RADIUS = 10
export const PLAYER_SPEED = 2
export const DECOY_RADIUS = 15
export const DECOY_DURATION = 5000
export const DECOY_COOLDOWN = 10000
export const DECOY_BLINK_PERIOD = 500

export interface Decoy {
  id: number
  x: number
  y: number
  spawnTime: number
}

export class PlayerController {
  x: number
  y: number
  radius = PLAYER_RADIUS
  speed = PLAYER_SPEED

  keys: Set<string> = new Set()
  mouseX = 0
  mouseY = 0

  decoys: Decoy[] = []
  lastDecoyTime = -DECOY_COOLDOWN
  private decoyIdCounter = 0

  constructor() {
    this.x = playerStartPos.x
    this.y = playerStartPos.y
  }

  handleKeyDown(key: string): void {
    this.keys.add(key.toLowerCase())
    if (key.toLowerCase() === 'e') {
      this.tryPlaceDecoy()
    }
  }

  handleKeyUp(key: string): void {
    this.keys.delete(key.toLowerCase())
  }

  updateMousePosition(x: number, y: number): void {
    this.mouseX = x
    this.mouseY = y
  }

  tryPlaceDecoy(): void {
    const now = performance.now()
    if (now - this.lastDecoyTime < DECOY_COOLDOWN) return

    const decoyX = this.mouseX
    const decoyY = this.mouseY

    if (!isPositionValid(decoyX, decoyY, DECOY_RADIUS)) return

    this.lastDecoyTime = now
    this.decoyIdCounter++
    this.decoys.push({
      id: this.decoyIdCounter,
      x: decoyX,
      y: decoyY,
      spawnTime: now,
    })
  }

  getDecoyCooldownRemaining(): number {
    const now = performance.now()
    const elapsed = now - this.lastDecoyTime
    return Math.max(0, DECOY_COOLDOWN - elapsed)
  }

  update(): void {
    const now = performance.now()

    this.decoys = this.decoys.filter(
      (d) => now - d.spawnTime < DECOY_DURATION
    )

    let dx = 0
    let dy = 0

    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1

    if (dx !== 0 || dy !== 0) {
      const length = Math.hypot(dx, dy)
      dx /= length
      dy /= length

      const newX = this.x + dx * this.speed
      const newY = this.y + dy * this.speed

      if (isPositionValid(newX, this.y, this.radius)) {
        this.x = newX
      }
      if (isPositionValid(this.x, newY, this.radius)) {
        this.y = newY
      }
    }
  }

  getState() {
    return {
      x: this.x,
      y: this.y,
      radius: this.radius,
      decoys: [...this.decoys],
      decoyCooldown: this.getDecoyCooldownRemaining(),
    }
  }
}
