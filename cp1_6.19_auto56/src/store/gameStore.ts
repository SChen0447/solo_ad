import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

export type ElementType = 'fire' | 'ice' | 'wind' | 'none'

export interface Position {
  x: number
  y: number
}

export interface PlayerState {
  id: string
  position: Position
  currentRoom: Position
  hp: number
  maxHp: number
  currentElement: ElementType
  elementEnergies: Record<ElementType, number>
  maxEnergy: number
  speed: number
  isSprinting: boolean
  elementCooldown: number
  skillCooldowns: Record<ElementType, number>
  gemsCollected: Record<ElementType, number>
  shield: number
}

export interface Mechanism {
  id: string
  type: 'torch' | 'ice_door' | 'poison_vent' | 'water_surface' | 'windmill' | 'crack' | 'ice_wall'
  position: Position
  requiredElement: ElementType
  solved: boolean
  active: boolean
}

export interface Door {
  id: string
  position: Position
  direction: 'top' | 'bottom' | 'left' | 'right'
  isOpen: boolean
  isLocked: boolean
  animationProgress: number
}

export interface Trap {
  id: string
  position: Position
  type: 'spike' | 'poison' | 'fire'
  active: boolean
  damage: number
}

export interface Enemy {
  id: string
  type: 'slime' | 'bat' | 'skeleton' | 'boss'
  position: Position
  hp: number
  maxHp: number
  speed: number
  visionRange: number
  state: 'patrol' | 'chase' | 'attack' | 'dead'
  elementWeakness: ElementType
  attackCooldown: number
  direction: Position
  patrolTarget: Position | null
  hasShield: boolean
  shieldHp: number
  dropsGem: ElementType | null
}

export interface Projectile {
  id: string
  position: Position
  velocity: Position
  element: ElementType
  damage: number
  lifetime: number
  fromPlayer: boolean
}

export interface Particle {
  id: string
  position: Position
  velocity: Position
  color: string
  size: number
  lifetime: number
  maxLifetime: number
  type: 'spark' | 'smoke' | 'burst' | 'firework'
}

export interface Room {
  gridPos: Position
  visited: boolean
  cleared: boolean
  mechanisms: Mechanism[]
  enemies: Enemy[]
  doors: Door[]
  traps: Trap[]
  isBossRoom: boolean
  isStartRoom: boolean
}

export interface GameLog {
  id: string
  message: string
  type: 'info' | 'damage' | 'success' | 'warning'
  timestamp: number
}

export interface GameState {
  dungeon: Room[][]
  dungeonSize: number
  currentFloor: number
  player: PlayerState
  projectiles: Projectile[]
  particles: Particle[]
  logs: GameLog[]
  gameStatus: 'menu' | 'playing' | 'paused' | 'victory' | 'defeat' | 'boss_intro'
  totalMechanismsSolved: number
  totalMechanisms: number
  enemiesDefeated: number
  showHitEffect: boolean
  hitElement: ElementType

  setPlayerPosition: (pos: Position) => void
  setCurrentRoom: (roomPos: Position) => void
  setPlayerHp: (hp: number) => void
  setCurrentElement: (element: ElementType) => void
  setElementEnergy: (element: ElementType, value: number) => void
  setSprinting: (sprinting: boolean) => void
  consumeEnergy: (element: ElementType, amount: number) => boolean
  recoverEnergies: (delta: number) => void
  updateCooldowns: (delta: number) => void
  setElementCooldown: (value: number) => void
  setSkillCooldown: (element: ElementType, value: number) => void

  setDungeon: (dungeon: Room[][]) => void
  setRoomVisited: (roomPos: Position) => void
  setRoomCleared: (roomPos: Position, cleared: boolean) => void
  solveMechanism: (roomPos: Position, mechanismId: string) => void
  setDoorState: (roomPos: Position, doorId: string, isOpen: boolean) => void
  updateDoorAnimation: (roomPos: Position, doorId: string, progress: number) => void

  addProjectile: (proj: Omit<Projectile, 'id'>) => void
  updateProjectiles: (delta: number) => void
  removeProjectile: (id: string) => void

  addParticle: (particle: Omit<Particle, 'id'>) => void
  addParticleBurst: (pos: Position, element: ElementType, count?: number) => void
  addFireworkEffect: (pos: Position) => void
  updateParticles: (delta: number) => void

  updateEnemy: (roomPos: Position, enemyId: string, updates: Partial<Enemy>) => void
  damageEnemy: (roomPos: Position, enemyId: string, damage: number, element: ElementType) => void
  removeEnemy: (roomPos: Position, enemyId: string) => void

  addLog: (message: string, type?: GameLog['type']) => void
  setGameStatus: (status: GameState['gameStatus']) => void
  triggerHitEffect: (element: ElementType) => void
  collectGem: (element: ElementType) => void

  resetGame: () => void
  nextFloor: () => void
}

const ELEMENT_COLORS: Record<ElementType, string> = {
  fire: '#e74c3c',
  ice: '#3498db',
  wind: '#2ecc71',
  none: '#95a5a6'
}

const createInitialPlayer = (): PlayerState => ({
  id: uuidv4(),
  position: { x: 8, y: 8 },
  currentRoom: { x: 0, y: 0 },
  hp: 100,
  maxHp: 100,
  currentElement: 'fire',
  elementEnergies: { fire: 100, ice: 100, wind: 100, none: 0 },
  maxEnergy: 100,
  speed: 4,
  isSprinting: false,
  elementCooldown: 0,
  skillCooldowns: { fire: 0, ice: 0, wind: 0, none: 0 },
  gemsCollected: { fire: 0, ice: 0, wind: 0, none: 0 },
  shield: 0
})

export const useGameStore = create<GameState>((set, get) => ({
  dungeon: [],
  dungeonSize: 6,
  currentFloor: 1,
  player: createInitialPlayer(),
  projectiles: [],
  particles: [],
  logs: [],
  gameStatus: 'playing',
  totalMechanismsSolved: 0,
  totalMechanisms: 0,
  enemiesDefeated: 0,
  showHitEffect: false,
  hitElement: 'none',

  setPlayerPosition: (pos) => set((state) => ({
    player: { ...state.player, position: pos }
  })),

  setCurrentRoom: (roomPos) => set((state) => ({
    player: { ...state.player, currentRoom: roomPos }
  })),

  setPlayerHp: (hp) => set((state) => {
    const newHp = Math.max(0, Math.min(state.player.maxHp, hp))
    const newStatus = newHp <= 0 ? 'defeat' : state.gameStatus
    return {
      player: { ...state.player, hp: newHp },
      gameStatus: newStatus
    }
  }),

  setCurrentElement: (element) => set((state) => ({
    player: { ...state.player, currentElement: element }
  })),

  setElementEnergy: (element, value) => set((state) => ({
    player: {
      ...state.player,
      elementEnergies: {
        ...state.player.elementEnergies,
        [element]: Math.max(0, Math.min(state.player.maxEnergy, value))
      }
    }
  })),

  setSprinting: (sprinting) => set((state) => ({
    player: { ...state.player, isSprinting: sprinting }
  })),

  consumeEnergy: (element, amount) => {
    const state = get()
    const currentEnergy = state.player.elementEnergies[element]
    if (currentEnergy < amount) return false
    set((s) => ({
      player: {
        ...s.player,
        elementEnergies: {
          ...s.player.elementEnergies,
          [element]: currentEnergy - amount
        }
      }
    }))
    return true
  },

  recoverEnergies: (delta) => set((state) => {
    const recovery = 5 * delta
    return {
      player: {
        ...state.player,
        elementEnergies: {
          fire: Math.min(state.player.maxEnergy, state.player.elementEnergies.fire + recovery),
          ice: Math.min(state.player.maxEnergy, state.player.elementEnergies.ice + recovery),
          wind: Math.min(state.player.maxEnergy, state.player.elementEnergies.wind + recovery),
          none: 0
        }
      }
    }
  }),

  updateCooldowns: (delta) => set((state) => ({
    player: {
      ...state.player,
      elementCooldown: Math.max(0, state.player.elementCooldown - delta),
      skillCooldowns: {
        fire: Math.max(0, state.player.skillCooldowns.fire - delta),
        ice: Math.max(0, state.player.skillCooldowns.ice - delta),
        wind: Math.max(0, state.player.skillCooldowns.wind - delta),
        none: 0
      }
    }
  })),

  setElementCooldown: (value) => set((state) => ({
    player: { ...state.player, elementCooldown: value }
  })),

  setSkillCooldown: (element, value) => set((state) => ({
    player: {
      ...state.player,
      skillCooldowns: {
        ...state.player.skillCooldowns,
        [element]: value
      }
    }
  })),

  setDungeon: (dungeon) => {
    let totalMech = 0
    dungeon.forEach(row => row.forEach(room => {
      totalMech += room.mechanisms.length
    }))
    set({ dungeon, totalMechanisms: totalMech, totalMechanismsSolved: 0 })
  },

  setRoomVisited: (roomPos) => set((state) => {
    const newDungeon = state.dungeon.map(row => row.map(room => {
      if (room.gridPos.x === roomPos.x && room.gridPos.y === roomPos.y) {
        return { ...room, visited: true }
      }
      return room
    }))
    return { dungeon: newDungeon }
  }),

  setRoomCleared: (roomPos, cleared) => set((state) => {
    const newDungeon = state.dungeon.map(row => row.map(room => {
      if (room.gridPos.x === roomPos.x && room.gridPos.y === roomPos.y) {
        return { ...room, cleared }
      }
      return room
    }))
    return { dungeon: newDungeon }
  }),

  solveMechanism: (roomPos, mechanismId) => set((state) => {
    let solved = false
    const newDungeon = state.dungeon.map(row => row.map(room => {
      if (room.gridPos.x === roomPos.x && room.gridPos.y === roomPos.y) {
        const mechs = room.mechanisms.map(m => {
          if (m.id === mechanismId && !m.solved) {
            solved = true
            return { ...m, solved: true, active: true }
          }
          return m
        })
        return { ...room, mechanisms: mechs }
      }
      return room
    }))
    return {
      dungeon: newDungeon,
      totalMechanismsSolved: solved ? state.totalMechanismsSolved + 1 : state.totalMechanismsSolved
    }
  }),

  setDoorState: (roomPos, doorId, isOpen) => set((state) => {
    const newDungeon = state.dungeon.map(row => row.map(room => {
      if (room.gridPos.x === roomPos.x && room.gridPos.y === roomPos.y) {
        const doors = room.doors.map(d => {
          if (d.id === doorId) {
            return { ...d, isOpen }
          }
          return d
        })
        return { ...room, doors }
      }
      return room
    }))
    return { dungeon: newDungeon }
  }),

  updateDoorAnimation: (roomPos, doorId, progress) => set((state) => {
    const newDungeon = state.dungeon.map(row => row.map(room => {
      if (room.gridPos.x === roomPos.x && room.gridPos.y === roomPos.y) {
        const doors = room.doors.map(d => {
          if (d.id === doorId) {
            return { ...d, animationProgress: Math.max(0, Math.min(1, progress)) }
          }
          return d
        })
        return { ...room, doors }
      }
      return room
    }))
    return { dungeon: newDungeon }
  }),

  addProjectile: (proj) => set((state) => ({
    projectiles: [...state.projectiles, { ...proj, id: uuidv4() }]
  })),

  updateProjectiles: (delta) => set((state) => {
    const updated = state.projectiles
      .map(p => ({
        ...p,
        position: {
          x: p.position.x + p.velocity.x * delta * 60,
          y: p.position.y + p.velocity.y * delta * 60
        },
        lifetime: p.lifetime - delta
      }))
      .filter(p => p.lifetime > 0 &&
        p.position.x >= -1 && p.position.x <= 17 &&
        p.position.y >= -1 && p.position.y <= 17)
    return { projectiles: updated }
  }),

  removeProjectile: (id) => set((state) => ({
    projectiles: state.projectiles.filter(p => p.id !== id)
  })),

  addParticle: (particle) => set((state) => ({
    particles: [...state.particles.slice(-200), { ...particle, id: uuidv4() }]
  })),

  addParticleBurst: (pos, element, count = 12) => {
    const color = ELEMENT_COLORS[element]
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
      const speed = 2 + Math.random() * 3
      get().addParticle({
        position: { ...pos },
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        color,
        size: 3 + Math.random() * 4,
        lifetime: 0.5 + Math.random() * 0.3,
        maxLifetime: 0.8,
        type: 'burst'
      })
    }
  },

  addFireworkEffect: (pos) => {
    const colors = ['#e74c3c', '#f39c12', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6']
    for (let w = 0; w < 5; w++) {
      setTimeout(() => {
        const offset = { x: pos.x + (Math.random() - 0.5) * 8, y: pos.y + (Math.random() - 0.5) * 8 }
        const color = colors[Math.floor(Math.random() * colors.length)]
        for (let i = 0; i < 20; i++) {
          const angle = (Math.PI * 2 * i) / 20
          const speed = 3 + Math.random() * 4
          get().addParticle({
            position: { ...offset },
            velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
            color,
            size: 4 + Math.random() * 4,
            lifetime: 1 + Math.random() * 0.5,
            maxLifetime: 1.5,
            type: 'firework'
          })
        }
      }, w * 300)
    }
  },

  updateParticles: (delta) => set((state) => ({
    particles: state.particles
      .map(p => ({
        ...p,
        position: {
          x: p.position.x + p.velocity.x * delta * 60,
          y: p.position.y + p.velocity.y * delta * 60
        },
        velocity: {
          x: p.velocity.x * 0.96,
          y: p.velocity.y * 0.96
        },
        lifetime: p.lifetime - delta
      }))
      .filter(p => p.lifetime > 0)
  })),

  updateEnemy: (roomPos, enemyId, updates) => set((state) => {
    const newDungeon = state.dungeon.map(row => row.map(room => {
      if (room.gridPos.x === roomPos.x && room.gridPos.y === roomPos.y) {
        const enemies = room.enemies.map(e => {
          if (e.id === enemyId) {
            return { ...e, ...updates }
          }
          return e
        })
        return { ...room, enemies }
      }
      return room
    }))
    return { dungeon: newDungeon }
  }),

  damageEnemy: (roomPos, enemyId, damage, element) => {
    const state = get()
    const room = state.dungeon[roomPos.y]?.[roomPos.x]
    const enemy = room?.enemies.find(e => e.id === enemyId)
    if (!enemy) return

    let actualDamage = damage
    if (enemy.elementWeakness === element) {
      actualDamage *= 2
      get().addLog(`弱点命中！${element}对${enemy.type}造成双倍伤害！`, 'success')
    }

    if (enemy.hasShield && enemy.shieldHp > 0) {
      const shieldDmg = Math.min(enemy.shieldHp, actualDamage)
      get().updateEnemy(roomPos, enemyId, { shieldHp: enemy.shieldHp - shieldDmg, hasShield: enemy.shieldHp - shieldDmg > 0 })
      actualDamage -= shieldDmg
    }

    if (actualDamage > 0) {
      const newHp = enemy.hp - actualDamage
      if (newHp <= 0) {
        get().addLog(`击败了${enemy.type}！`, 'success')
        get().addParticleBurst(enemy.position, element, 20)
        if (enemy.dropsGem) {
          get().collectGem(enemy.dropsGem)
        }
        get().removeEnemy(roomPos, enemyId)
        set((s) => ({ enemiesDefeated: s.enemiesDefeated + 1 }))

        if (enemy.type === 'boss') {
          get().addFireworkEffect(enemy.position)
          setTimeout(() => {
            set({ gameStatus: 'victory' })
          }, 3000)
        }
      } else {
        get().updateEnemy(roomPos, enemyId, { hp: newHp })
        get().addParticleBurst(enemy.position, element, 8)
      }
    }
  },

  removeEnemy: (roomPos, enemyId) => set((state) => {
    const newDungeon = state.dungeon.map(row => row.map(room => {
      if (room.gridPos.x === roomPos.x && room.gridPos.y === roomPos.y) {
        return { ...room, enemies: room.enemies.filter(e => e.id !== enemyId) }
      }
      return room
    }))
    return { dungeon: newDungeon }
  }),

  addLog: (message, type = 'info') => set((state) => ({
    logs: [{ id: uuidv4(), message, type, timestamp: Date.now() }, ...state.logs].slice(0, 50)
  })),

  setGameStatus: (status) => set({ gameStatus: status }),

  triggerHitEffect: (element) => {
    set({ showHitEffect: true, hitElement: element })
    setTimeout(() => set({ showHitEffect: false }), 200)
  },

  collectGem: (element) => set((state) => {
    const newGems = {
      ...state.player.gemsCollected,
      [element]: state.player.gemsCollected[element] + 1
    }
    get().addLog(`获得了${element === 'fire' ? '火' : element === 'ice' ? '冰' : '风'}元素宝石！`, 'success')
    return {
      player: { ...state.player, gemsCollected: newGems }
    }
  }),

  resetGame: () => set({
    player: createInitialPlayer(),
    projectiles: [],
    particles: [],
    logs: [],
    gameStatus: 'playing',
    currentFloor: 1,
    enemiesDefeated: 0,
    totalMechanismsSolved: 0
  }),

  nextFloor: () => set((state) => ({
    currentFloor: state.currentFloor + 1,
    player: {
      ...createInitialPlayer(),
      hp: Math.min(state.player.maxHp, state.player.hp + 30),
      gemsCollected: { fire: 0, ice: 0, wind: 0, none: 0 }
    },
    projectiles: [],
    gameStatus: 'playing'
  }))
}))

export { ELEMENT_COLORS }
