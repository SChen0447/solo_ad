import type { Position, Mechanism, ElementType, Room } from '../store/gameStore'
import { useGameStore } from '../store/gameStore'

export interface ElementReaction {
  success: boolean
  penalty?: number
  message: string
  particles?: { pos: Position; element: ElementType; count: number }
}

export interface ElementCollisionResult {
  blocked: boolean
  reaction?: ElementReaction
  newMechState?: Partial<Mechanism>
}

const ELEMENT_NAMES: Record<ElementType, string> = {
  fire: '火',
  ice: '冰',
  wind: '风',
  none: '无'
}

const MECHANISM_NAMES: Record<Mechanism['type'], string> = {
  torch: '火把',
  ice_door: '冰封门',
  poison_vent: '毒气口',
  water_surface: '水面',
  windmill: '风车',
  crack: '裂缝',
  ice_wall: '冰墙'
}

export class ElementStateMachine {
  private currentState: ElementType = 'fire'
  private transitionCooldown: number = 0

  constructor(initial: ElementType = 'fire') {
    this.currentState = initial
  }

  getState(): ElementType {
    return this.currentState
  }

  canTransition(): boolean {
    return this.transitionCooldown <= 0
  }

  transition(newState: ElementType): { success: boolean; message: string } {
    if (!this.canTransition()) {
      return { success: false, message: '元素切换冷却中' }
    }

    if (newState === this.currentState) {
      return { success: false, message: `当前已是${ELEMENT_NAMES[newState]}元素` }
    }

    this.currentState = newState
    this.transitionCooldown = 1

    return { success: true, message: `切换为${ELEMENT_NAMES[newState]}元素` }
  }

  updateCooldown(delta: number): void {
    this.transitionCooldown = Math.max(0, this.transitionCooldown - delta)
  }
}

export function checkMechanismInteraction(
  mechanism: Mechanism,
  element: ElementType,
  playerPos: Position
): ElementReaction {
  const dist = Math.sqrt(
    Math.pow(playerPos.x - mechanism.position.x, 2) +
    Math.pow(playerPos.y - mechanism.position.y, 2)
  )

  const interactionRange = 2.5
  if (dist > interactionRange) {
    return { success: false, message: '距离太远，无法交互' }
  }

  if (mechanism.solved) {
    return { success: false, message: `${MECHANISM_NAMES[mechanism.type]}已激活` }
  }

  const reaction = getElementReaction(mechanism.type, element)
  return reaction
}

export function getElementReaction(
  mechanismType: Mechanism['type'],
  element: ElementType
): ElementReaction {
  switch (mechanismType) {
    case 'torch':
      if (element === 'fire') {
        return {
          success: true,
          message: '火把被点燃了！',
          particles: { pos: { x: 0, y: 0 }, element: 'fire', count: 15 }
        }
      } else if (element === 'ice') {
        return {
          success: false,
          penalty: 10,
          message: '错误！冰灭火把引发爆炸，损失10点生命！',
          particles: { pos: { x: 0, y: 0 }, element: 'fire', count: 20 }
        }
      }
      return { success: false, message: '需要使用火元素点燃火把' }

    case 'ice_wall':
    case 'ice_door':
      if (element === 'fire') {
        return {
          success: true,
          message: '冰墙被融化了！',
          particles: { pos: { x: 0, y: 0 }, element: 'ice', count: 12 }
        }
      } else if (element === 'wind') {
        return {
          success: false,
          message: '风对冰墙无效'
        }
      }
      return { success: false, message: '需要使用火元素融化冰墙' }

    case 'water_surface':
    case 'crack':
      if (element === 'ice') {
        return {
          success: true,
          message: '水面被冰封，裂缝被堵住了！',
          particles: { pos: { x: 0, y: 0 }, element: 'ice', count: 10 }
        }
      } else if (element === 'fire') {
        return {
          success: false,
          message: '火无法封住裂缝'
        }
      }
      return { success: false, message: '需要使用冰元素冻结水面/封住裂缝' }

    case 'poison_vent':
      if (element === 'ice') {
        return {
          success: true,
          message: '毒气口被冰封，毒气消散了！',
          particles: { pos: { x: 0 }, element: 'ice', count: 10 } as any
        }
      } else if (element === 'wind') {
        return {
          success: true,
          message: '风吹散了毒气！',
          particles: { pos: { x: 0, y: 0 }, element: 'wind', count: 15 }
        }
      } else if (element === 'fire') {
        return {
          success: false,
          penalty: 10,
          message: '错误！火点燃毒气引发爆炸，损失10点生命！',
          particles: { pos: { x: 0, y: 0 }, element: 'fire', count: 25 }
        }
      }
      return { success: false, message: '需要使用冰或风元素处理毒气口' }

    case 'windmill':
      if (element === 'wind') {
        return {
          success: true,
          message: '风车开始转动，平台升起！',
          particles: { pos: { x: 0, y: 0 }, element: 'wind', count: 12 }
        }
      } else if (element === 'fire') {
        return {
          success: false,
          message: '火无法驱动风车'
        }
      }
      return { success: false, message: '需要使用风元素驱动风车' }

    default:
      return { success: false, message: '未知机关' }
  }
}

export function checkProjectileMechanismCollision(
  projectilePos: Position,
  mechanisms: Mechanism[]
): { hit: boolean; mechanismId?: string; mechanism?: Mechanism } {
  for (const mech of mechanisms) {
    if (mech.solved) continue
    const dist = Math.sqrt(
      Math.pow(projectilePos.x - mech.position.x, 2) +
      Math.pow(projectilePos.y - mech.position.y, 2)
    )
    if (dist < 1) {
      return { hit: true, mechanismId: mech.id, mechanism: mech }
    }
  }
  return { hit: false }
}

export function checkProjectileEnemyCollision(
  projectilePos: Position,
  enemies: any[]
): { hit: boolean; enemyId?: string; enemy?: any } {
  for (const enemy of enemies) {
    if (enemy.state === 'dead') continue
    const dist = Math.sqrt(
      Math.pow(projectilePos.x - enemy.position.x, 2) +
      Math.pow(projectilePos.y - enemy.position.y, 2)
    )
    if (dist < 1) {
      return { hit: true, enemyId: enemy.id, enemy }
    }
  }
  return { hit: false }
}

export function createSkillProjectile(
  element: ElementType,
  playerPos: Position,
  targetPos: Position,
  fromPlayer: boolean = true
): {
  pos: Position
  vel: Position
  element: ElementType
  damage: number
  lifetime: number
  fromPlayer: boolean
} | null {
  const dx = targetPos.x - playerPos.x
  const dy = targetPos.y - playerPos.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist === 0) return null

  const speed = 0.18
  const vel = { x: (dx / dist) * speed, y: (dy / dist) * speed }

  const skillCosts: Record<ElementType, { cost: number; damage: number; lifetime: number }> = {
    fire: { cost: 20, damage: 25, lifetime: 1.2 },
    ice: { cost: 30, damage: 15, lifetime: 1.5 },
    wind: { cost: 15, damage: 18, lifetime: 1.0 },
    none: { cost: 0, damage: 0, lifetime: 0 }
  }

  const skill = skillCosts[element]
  if (skill.cost === 0) return null

  return {
    pos: { ...playerPos },
    vel,
    element,
    damage: skill.damage,
    lifetime: skill.lifetime,
    fromPlayer
  }
}

export const SKILL_COSTS: Record<ElementType, number> = {
  fire: 20,
  ice: 30,
  wind: 15,
  none: 0
}

export function processMechanismSolve(
  room: Room,
  mechanismId: string,
  projectileElement: ElementType
): {
  shouldSolve: boolean
  penalty: number
  reaction: ElementReaction
} {
  const mech = room.mechanisms.find(m => m.id === mechanismId)
  if (!mech || mech.solved) {
    return { shouldSolve: false, penalty: 0, reaction: { success: false, message: '无效目标' } }
  }

  const reaction = getElementReaction(mech.type, projectileElement)

  return {
    shouldSolve: reaction.success,
    penalty: reaction.penalty || 0,
    reaction
  }
}

export { ELEMENT_NAMES, MECHANISM_NAMES }
