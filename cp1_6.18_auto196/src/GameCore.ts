import { useGameStore, type Vec2, type Rune, type Tentacle, type Particle } from './store'
import { audioManager } from './AudioManager'

export interface InputState {
  w: boolean
  a: boolean
  s: boolean
  d: boolean
  space: boolean
}

export class GameCore {
  private input: InputState = { w: false, a: false, s: false, d: false, space: false }
  private animationId: number = 0
  private lastTime: number = 0
  private tentacleSpawnTimer: number = 0
  private trailTimer: number = 0
  private nextTentacleId: number = 0
  private nextParticleId: number = 0
  private invulnerableUntil: number = 0
  private isRunning: boolean = false

  private MAP_SIZE = 15
  private SIGIL_BASE_SPEED = 6
  private SIGIL_BOOST_MULTIPLIER = 3
  private BOOST_DURATION = 0.5
  private BOOST_COOLDOWN = 2
  private TENTACLE_SPAWN_INTERVAL = 3.5
  private TENTACLE_SEGMENT_COUNT = 12
  private TENTACLE_BASE_SPEED = 2.2
  private SIGIL_HIT_RADIUS = 0.6
  private RUNE_HIT_RADIUS = 0.7
  private TENTACLE_HIT_RADIUS = 0.4
  private TENTACLE_SPACING = 0.25
  private TRAIL_SPAWN_INTERVAL = 0.015
  private TRAIL_MAX_PARTICLES = 15
  private INVULNERABLE_DURATION = 1.2

  private keyDownHandler = (e: KeyboardEvent): void => {
    switch (e.key.toLowerCase()) {
      case 'w': case 'arrowup': this.input.w = true; break
      case 'a': case 'arrowleft': this.input.a = true; break
      case 's': case 'arrowdown': this.input.s = true; break
      case 'd': case 'arrowright': this.input.d = true; break
      case ' ': this.input.space = true; e.preventDefault(); break
    }
  }

  private keyUpHandler = (e: KeyboardEvent): void => {
    switch (e.key.toLowerCase()) {
      case 'w': case 'arrowup': this.input.w = false; break
      case 'a': case 'arrowleft': this.input.a = false; break
      case 's': case 'arrowdown': this.input.s = false; break
      case 'd': case 'arrowright': this.input.d = false; break
      case ' ': this.input.space = false; break
    }
  }

  start(): void {
    if (this.isRunning) return
    this.isRunning = true
    this.lastTime = performance.now()
    this.tentacleSpawnTimer = 0
    this.trailTimer = 0
    this.nextTentacleId = 0
    this.nextParticleId = 0
    this.invulnerableUntil = 0

    window.addEventListener('keydown', this.keyDownHandler)
    window.addEventListener('keyup', this.keyUpHandler)

    this.loop(performance.now())
  }

  stop(): void {
    this.isRunning = false
    cancelAnimationFrame(this.animationId)
    window.removeEventListener('keydown', this.keyDownHandler)
    window.removeEventListener('keyup', this.keyUpHandler)
  }

  private loop = (now: number): void => {
    if (!this.isRunning) return

    const dt = Math.min((now - this.lastTime) / 1000, 0.05)
    this.lastTime = now

    const state = useGameStore.getState()

    if (state.phase === 'playing') {
      this.updateSigil(dt)
      this.updateBoost(dt)
      this.checkRuneCollisions()
      this.updateTentacles(dt)
      this.updateParticles(dt)
      this.spawnTrail(dt)
      this.checkTentacleCollisions()
      this.checkPortal()
    }

    this.animationId = requestAnimationFrame(this.loop)
  }

  private updateSigil(dt: number): void {
    const state = useGameStore.getState()

    let dx = 0
    let dz = 0

    if (this.input.w) dz -= 1
    if (this.input.s) dz += 1
    if (this.input.a) dx -= 1
    if (this.input.d) dx += 1

    const len = Math.sqrt(dx * dx + dz * dz)
    if (len > 0) {
      dx /= len
      dz /= len
    }

    const speed = state.isBoosting
      ? this.SIGIL_BASE_SPEED * this.SIGIL_BOOST_MULTIPLIER
      : this.SIGIL_BASE_SPEED

    let newX = state.sigil.x + dx * speed * dt
    let newZ = state.sigil.z + dz * speed * dt

    const bound = this.MAP_SIZE - 0.5
    newX = Math.max(-bound, Math.min(bound, newX))
    newZ = Math.max(-bound, Math.min(bound, newZ))

    useGameStore.setState({
      sigil: { x: newX, z: newZ },
      sigilVelocity: { x: dx * speed, z: dz * speed }
    })
  }

  private updateBoost(dt: number): void {
    const state = useGameStore.getState()
    let { isBoosting, boostCooldown, boostActiveTime } = state

    if (isBoosting) {
      boostActiveTime -= dt
      if (boostActiveTime <= 0) {
        isBoosting = false
        boostActiveTime = 0
        boostCooldown = this.BOOST_COOLDOWN
      }
    } else {
      if (boostCooldown > 0) {
        boostCooldown -= dt
      }
      if (this.input.space && boostCooldown <= 0) {
        isBoosting = true
        boostActiveTime = this.BOOST_DURATION
        boostCooldown = 0
        audioManager.init()
        audioManager.playSound('boost')
      }
    }

    useGameStore.setState({ isBoosting, boostCooldown, boostActiveTime })
  }

  private checkRuneCollisions(): void {
    const state = useGameStore.getState()
    const { sigil, runes } = state

    for (const rune of runes) {
      if (rune.activated) continue

      const dx = sigil.x - rune.position.x
      const dz = sigil.z - rune.position.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist < this.SIGIL_HIT_RADIUS + this.RUNE_HIT_RADIUS) {
        audioManager.init()
        audioManager.playSound('rune')
        useGameStore.getState().activateRune(rune.id)
        this.spawnActivationParticles(rune)
      }
    }
  }

  private spawnActivationParticles(rune: Rune): void {
    const state = useGameStore.getState()
    const particles = [...state.particles]
    const count = 12

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5
      const speed = 2 + Math.random() * 4
      particles.push({
        id: this.nextParticleId++,
        position: { x: rune.position.x, z: rune.position.z },
        velocity: {
          x: Math.cos(angle) * speed,
          z: Math.sin(angle) * speed
        },
        life: 0,
        maxLife: 0.6 + Math.random() * 0.4,
        color: rune.color,
        size: 0.12 + Math.random() * 0.1
      })
    }

    useGameStore.setState({ particles })
  }

  private updateTentacles(dt: number): void {
    const state = useGameStore.getState()
    let tentacles = [...state.tentacles]

    this.tentacleSpawnTimer += dt
    if (this.tentacleSpawnTimer >= this.TENTACLE_SPAWN_INTERVAL) {
      this.tentacleSpawnTimer = 0
      tentacles.push(this.createTentacle())
    }

    const { sigil } = useGameStore.getState()

    tentacles = tentacles.map(tentacle => {
      if (tentacle.segments.length === 0) return tentacle

      const head = tentacle.segments[0]

      let tx = sigil.x - head.x
      let tz = sigil.z - head.z
      const dist = Math.sqrt(tx * tx + tz * tz)
      if (dist > 0) {
        tx /= dist
        tz /= dist
      }

      const wobble = Math.sin(performance.now() / 200 + tentacle.id) * 0.6
      const perpX = -tz
      const perpZ = tx
      const dirX = tx + perpX * wobble * 0.3
      const dirZ = tz + perpZ * wobble * 0.3
      const dirLen = Math.sqrt(dirX * dirX + dirZ * dirZ)
      const ndx = dirX / dirLen
      const ndz = dirZ / dirLen

      const speed = tentacle.speed * dt
      const newSegments = [
        {
          x: head.x + ndx * speed,
          z: head.z + ndz * speed
        }
      ]

      for (let i = 1; i < tentacle.segments.length; i++) {
        const prev = newSegments[i - 1]
        const curr = tentacle.segments[i]
        const cx = curr.x - prev.x
        const cz = curr.z - prev.z
        const cd = Math.sqrt(cx * cx + cz * cz)
        if (cd > this.TENTACLE_SPACING) {
          const t = this.TENTACLE_SPACING / cd
          newSegments.push({
            x: prev.x + cx * (1 - t),
            z: prev.z + cz * (1 - t)
          })
        } else {
          newSegments.push({ x: curr.x, z: curr.z })
        }
      }

      return { ...tentacle, segments: newSegments }
    })

    useGameStore.setState({ tentacles })
  }

  private createTentacle(): Tentacle {
    const side = Math.floor(Math.random() * 4)
    const offset = (Math.random() - 0.5) * (this.MAP_SIZE * 1.5)
    const edge = this.MAP_SIZE + 1

    let spawnX = 0
    let spawnZ = 0

    switch (side) {
      case 0: spawnX = offset; spawnZ = -edge; break
      case 1: spawnX = edge; spawnZ = offset; break
      case 2: spawnX = offset; spawnZ = edge; break
      case 3: spawnX = -edge; spawnZ = offset; break
    }

    const segments: Vec2[] = []
    const state = useGameStore.getState()

    let dx = state.sigil.x - spawnX
    let dz = state.sigil.z - spawnZ
    const len = Math.sqrt(dx * dx + dz * dz)
    dx /= len
    dz /= len

    for (let i = 0; i < this.TENTACLE_SEGMENT_COUNT; i++) {
      segments.push({
        x: spawnX - dx * i * this.TENTACLE_SPACING,
        z: spawnZ - dz * i * this.TENTACLE_SPACING
      })
    }

    return {
      id: this.nextTentacleId++,
      segments,
      speed: this.TENTACLE_BASE_SPEED + Math.random() * 1.2,
      spawnTime: performance.now()
    }
  }

  private spawnTrail(dt: number): void {
    const state = useGameStore.getState()
    const { sigil, isBoosting } = state

    this.trailTimer += dt
    if (this.trailTimer >= this.TRAIL_SPAWN_INTERVAL) {
      this.trailTimer = 0

      let particles = [...state.particles]

      particles = particles.filter(p => {
        const age = p.life / p.maxLife
        return age < 1.05
      })

      particles.push({
        id: this.nextParticleId++,
        position: { x: sigil.x, z: sigil.z },
        velocity: { x: 0, z: 0 },
        life: 0,
        maxLife: isBoosting ? 0.9 : 0.6,
        color: isBoosting ? '#ffffff' : '#ffd700',
        size: isBoosting ? 0.2 : 0.15
      })

      while (particles.length > this.TRAIL_MAX_PARTICLES + 50) {
        particles.shift()
      }

      useGameStore.setState({ particles })
    }
  }

  private updateParticles(dt: number): void {
    const state = useGameStore.getState()
    const { particles } = state

    const updated = particles
      .map(p => ({
        ...p,
        life: p.life + dt,
        position: {
          x: p.position.x + p.velocity.x * dt,
          z: p.position.z + p.velocity.z * dt
        },
        velocity: {
          x: p.velocity.x * 0.95,
          z: p.velocity.z * 0.95
        }
      }))
      .filter(p => p.life < p.maxLife + 0.05)

    useGameStore.setState({ particles: updated })
  }

  private checkTentacleCollisions(): void {
    const state = useGameStore.getState()
    if (performance.now() < this.invulnerableUntil) return
    if (state.phase !== 'playing') return

    const { sigil, tentacles } = state

    for (const tentacle of tentacles) {
      const checkCount = Math.min(5, tentacle.segments.length)
      for (let i = 0; i < checkCount; i++) {
        const seg = tentacle.segments[i]
        const dx = sigil.x - seg.x
        const dz = sigil.z - seg.z
        const dist = Math.sqrt(dx * dx + dz * dz)

        if (dist < this.SIGIL_HIT_RADIUS + this.TENTACLE_HIT_RADIUS) {
          this.invulnerableUntil = performance.now() + this.INVULNERABLE_DURATION * 1000
          audioManager.init()
          audioManager.playSound('damage')
          useGameStore.getState().loseLife()
          useGameStore.getState().triggerDamageFlash()
          return
        }
      }
    }
  }

  private checkPortal(): void {
    const state = useGameStore.getState()
    if (!state.portalActive || state.phase !== 'playing') return

    const { sigil, portalPosition } = state
    const dx = sigil.x - portalPosition.x
    const dz = sigil.z - portalPosition.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist < 1.2) {
      audioManager.init()
      audioManager.playSound('victory')
      useGameStore.getState().completeVictory()
      this.spawnVictoryParticles()
    }
  }

  private spawnVictoryParticles(): void {
    const state = useGameStore.getState()
    const particles = [...state.particles]
    const colors = ['#ffd700', '#fff5a0', '#ffa500', '#ffed4e', '#ffcc00']

    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 3 + Math.random() * 8
      particles.push({
        id: this.nextParticleId++,
        position: { x: 0, z: 0 },
        velocity: {
          x: Math.cos(angle) * speed,
          z: Math.sin(angle) * speed
        },
        life: 0,
        maxLife: 1.2 + Math.random() * 1.0,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 0.15 + Math.random() * 0.2
      })
    }

    useGameStore.setState({ particles })
  }
}

export const gameCore = new GameCore()
