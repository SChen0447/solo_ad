import { isLineOfSightClear, isPositionValid, enemyPatrolPaths } from './Map'
import { Decoy } from './Player'

export type EnemyState = 'patrol' | 'alert' | 'chase'

export const ENEMY_SIZE = 20
export const ENEMY_VISION_ANGLE = Math.PI / 2
export const ENEMY_VISION_RADIUS = 120
export const ENEMY_PATROL_SPEED = 1
export const ENEMY_CHASE_SPEED = 3
export const ALERT_DURATION = 2000
export const LOST_SIGHT_TIMEOUT = 3000
export const DECOY_INVESTIGATE_STAY = 2000
export const DECOY_DETECT_RADIUS = 300

export interface EnemyStateData {
  id: number
  x: number
  y: number
  angle: number
  state: EnemyState
  alertTime: number
  lastSeenPlayerX: number
  lastSeenPlayerY: number
  lostSightTimer: number
  hasDecoyTarget: boolean
  decoyTargetX: number
  decoyTargetY: number
  decoyArrivalTime: number
  isVisible: boolean
}

export class Enemy {
  id: number
  x: number
  y: number
  angle: number
  state: EnemyState = 'patrol'

  size = ENEMY_SIZE
  visionAngle = ENEMY_VISION_ANGLE
  visionRadius = ENEMY_VISION_RADIUS
  patrolSpeed = ENEMY_PATROL_SPEED
  chaseSpeed = ENEMY_CHASE_SPEED

  patrolPath: { x: number; y: number }[]
  currentPatrolIndex = 0
  nextPatrolIndex = 1

  alertTime = 0
  lastSeenPlayerX = 0
  lastSeenPlayerY = 0
  lostSightTimer = 0

  hasDecoyTarget = false
  decoyTargetX = 0
  decoyTargetY = 0
  decoyArrivalTime = 0

  constructor(id: number, path: { x: number; y: number }[]) {
    this.id = id
    this.patrolPath = path
    this.x = path[0].x
    this.y = path[0].y
    const dx = path[1].x - path[0].x
    const dy = path[1].y - path[0].y
    this.angle = Math.atan2(dy, dx)
  }

  update(
    playerX: number,
    playerY: number,
    playerRadius: number,
    decoys: Decoy[],
    deltaTime: number
  ): void {
    const now = performance.now()

    const canSeePlayer = this.canSeeTarget(playerX, playerY, playerRadius)

    if (canSeePlayer) {
      this.lastSeenPlayerX = playerX
      this.lastSeenPlayerY = playerY
      this.lostSightTimer = LOST_SIGHT_TIMEOUT

      if (this.state === 'patrol') {
        this.state = 'alert'
        this.alertTime = ALERT_DURATION
        this.hasDecoyTarget = false
      } else if (this.state === 'alert') {
        this.alertTime -= deltaTime
        if (this.alertTime <= 0) {
          this.state = 'chase'
        }
      } else if (this.state === 'chase') {
        this.moveToward(playerX, playerY, this.chaseSpeed)
      }
    } else {
      if (this.state === 'alert') {
        this.alertTime -= deltaTime
        if (this.alertTime <= 0) {
          this.state = 'chase'
        }
      } else if (this.state === 'chase') {
        this.lostSightTimer -= deltaTime
        if (this.lostSightTimer <= 0) {
          this.state = 'patrol'
          this.hasDecoyTarget = false
        } else {
          this.moveToward(this.lastSeenPlayerX, this.lastSeenPlayerY, this.chaseSpeed)
          if (
            Math.hypot(this.x - this.lastSeenPlayerX, this.y - this.lastSeenPlayerY) < 5
          ) {
            this.lostSightTimer -= deltaTime * 2
          }
        }
      } else if (this.state === 'patrol') {
        this.handleDecoyResponse(decoys, now)

        if (this.hasDecoyTarget) {
          const distToDecoy = Math.hypot(
            this.x - this.decoyTargetX,
            this.y - this.decoyTargetY
          )
          if (distToDecoy < 20) {
            if (this.decoyArrivalTime === 0) {
              this.decoyArrivalTime = now
            }
            if (now - this.decoyArrivalTime >= DECOY_INVESTIGATE_STAY) {
              this.hasDecoyTarget = false
              this.decoyArrivalTime = 0
            }
          } else {
            this.moveToward(this.decoyTargetX, this.decoyTargetY, this.patrolSpeed)
          }
        } else {
          this.patrol()
        }
      }
    }
  }

  handleDecoyResponse(decoys: Decoy[], _now: number): void {
    if (decoys.length === 0) {
      if (this.hasDecoyTarget) {
        this.hasDecoyTarget = false
        this.decoyArrivalTime = 0
      }
      return
    }

    if (this.hasDecoyTarget) {
      const stillExists = decoys.some(
        (d) =>
          Math.abs(d.x - this.decoyTargetX) < 1 &&
          Math.abs(d.y - this.decoyTargetY) < 1
      )
      if (!stillExists) {
        this.hasDecoyTarget = false
        this.decoyArrivalTime = 0
      }
      return
    }

    let nearestDecoy: Decoy | null = null
    let nearestDist = Infinity

    for (const decoy of decoys) {
      const dist = Math.hypot(decoy.x - this.x, decoy.y - this.y)
      if (dist < DECOY_DETECT_RADIUS && dist < nearestDist) {
        nearestDist = dist
        nearestDecoy = decoy
      }
    }

    if (nearestDecoy) {
      this.hasDecoyTarget = true
      this.decoyTargetX = nearestDecoy.x
      this.decoyTargetY = nearestDecoy.y
      this.decoyArrivalTime = 0
    }
  }

  patrol(): void {
    const target = this.patrolPath[this.nextPatrolIndex]
    const dist = Math.hypot(target.x - this.x, target.y - this.y)

    if (dist < 3) {
      this.currentPatrolIndex = this.nextPatrolIndex
      this.nextPatrolIndex = (this.nextPatrolIndex + 1) % this.patrolPath.length
      return
    }

    this.moveToward(target.x, target.y, this.patrolSpeed)
  }

  moveToward(targetX: number, targetY: number, speed: number): void {
    const dx = targetX - this.x
    const dy = targetY - this.y
    const dist = Math.hypot(dx, dy)

    if (dist < 0.1) return

    this.angle = Math.atan2(dy, dx)

    const moveX = (dx / dist) * speed
    const moveY = (dy / dist) * speed

    const newX = this.x + moveX
    const newY = this.y + moveY

    if (isPositionValid(newX, this.y, this.size / 2)) {
      this.x = newX
    }
    if (isPositionValid(this.x, newY, this.size / 2)) {
      this.y = newY
    }
  }

  canSeeTarget(tx: number, ty: number, tRadius: number): boolean {
    const dx = tx - this.x
    const dy = ty - this.y
    const dist = Math.hypot(dx, dy)

    if (dist > this.visionRadius + tRadius) return false

    const angleToTarget = Math.atan2(dy, dx)
    let angleDiff = angleToTarget - this.angle
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2

    if (Math.abs(angleDiff) > this.visionAngle / 2) return false

    return isLineOfSightClear(this.x, this.y, tx, ty)
  }

  getStateData(isVisible: boolean): EnemyStateData {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      angle: this.angle,
      state: this.state,
      alertTime: this.alertTime,
      lastSeenPlayerX: this.lastSeenPlayerX,
      lastSeenPlayerY: this.lastSeenPlayerY,
      lostSightTimer: this.lostSightTimer,
      hasDecoyTarget: this.hasDecoyTarget,
      decoyTargetX: this.decoyTargetX,
      decoyTargetY: this.decoyTargetY,
      decoyArrivalTime: this.decoyArrivalTime,
      isVisible,
    }
  }
}

export function findNearestEnemyToDecoy(
  decoy: Decoy,
  enemies: Enemy[]
): Enemy | null {
  let nearest: Enemy | null = null
  let nearestDist = Infinity

  for (const enemy of enemies) {
    if (enemy.state !== 'patrol') continue
    const dist = Math.hypot(decoy.x - enemy.x, decoy.y - enemy.y)
    if (dist < nearestDist) {
      nearestDist = dist
      nearest = enemy
    }
  }

  return nearest
}

export function createEnemies(): Enemy[] {
  return enemyPatrolPaths.map((path, idx) => new Enemy(idx, path))
}
