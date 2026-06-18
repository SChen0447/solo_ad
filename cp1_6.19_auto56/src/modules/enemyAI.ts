import type { Position, Enemy, ElementType } from '../store/gameStore'
import { useGameStore } from '../store/gameStore'
import { ROOM_SIZE } from './dungeonGenerator'

type EnemyState = 'patrol' | 'chase' | 'attack' | 'dead'

interface AIContext {
  enemy: Enemy
  playerPos: Position
  delta: number
  roomPos: Position
}

function distance(a: Position, b: Position): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2))
}

function randomPatrolTarget(current: Position): Position {
  const margin = 3
  return {
    x: margin + Math.random() * (ROOM_SIZE - 2 * margin),
    y: margin + Math.random() * (ROOM_SIZE - 2 * margin)
  }
}

function clampPosition(pos: Position, margin: number = 2): Position {
  return {
    x: Math.max(margin, Math.min(ROOM_SIZE - margin, pos.x)),
    y: Math.max(margin, Math.min(ROOM_SIZE - margin, pos.y))
  }
}

function patrolBehavior(ctx: AIContext): EnemyState {
  const { enemy, playerPos, delta, roomPos } = ctx

  const distToPlayer = distance(enemy.position, playerPos)
  if (distToPlayer < enemy.visionRange) {
    return 'chase'
  }

  let target = enemy.patrolTarget
  if (!target || distance(enemy.position, target) < 1) {
    target = randomPatrolTarget(enemy.position)
    useGameStore.getState().updateEnemy(roomPos, enemy.id, {
      patrolTarget: target
    })
  }

  const dx = target.x - enemy.position.x
  const dy = target.y - enemy.position.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist > 0.1) {
    const speed = enemy.speed * delta * 60 * 0.05
    const newPos = clampPosition({
      x: enemy.position.x + (dx / dist) * speed,
      y: enemy.position.y + (dy / dist) * speed
    })
    useGameStore.getState().updateEnemy(roomPos, enemy.id, {
      position: newPos,
      direction: { x: dx / dist, y: dy / dist }
    })
  }

  return 'patrol'
}

function chaseBehavior(ctx: AIContext): EnemyState {
  const { enemy, playerPos, delta, roomPos } = ctx

  const distToPlayer = distance(enemy.position, playerPos)

  if (distToPlayer > enemy.visionRange * 1.5) {
    return 'patrol'
  }

  const attackRange = enemy.type === 'boss' ? 2.5 : 1.2
  if (distToPlayer < attackRange) {
    return 'attack'
  }

  const chaseSpeedMultiplier = enemy.type === 'boss' ? 1.5 : 1.67
  const dx = playerPos.x - enemy.position.x
  const dy = playerPos.y - enemy.position.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist > 0.1) {
    const speed = enemy.speed * chaseSpeedMultiplier * delta * 60 * 0.05
    const newPos = clampPosition({
      x: enemy.position.x + (dx / dist) * speed,
      y: enemy.position.y + (dy / dist) * speed
    })
    useGameStore.getState().updateEnemy(roomPos, enemy.id, {
      position: newPos,
      direction: { x: dx / dist, y: dy / dist }
    })
  }

  return 'chase'
}

function attackBehavior(ctx: AIContext): EnemyState {
  const { enemy, playerPos, delta, roomPos } = ctx
  const state = useGameStore.getState()

  const distToPlayer = distance(enemy.position, playerPos)
  const attackRange = enemy.type === 'boss' ? 2.5 : 1.5

  if (distToPlayer > attackRange) {
    return 'chase'
  }

  const newCooldown = Math.max(0, enemy.attackCooldown - delta)
  if (newCooldown > 0) {
    state.updateEnemy(roomPos, enemy.id, { attackCooldown: newCooldown })
    return 'attack'
  }

  const baseDamage = enemy.type === 'boss' ? 12 : 5
  const attackInterval = enemy.type === 'boss' ? 0.4 : 0.5

  const currentPlayer = state.player
  state.setPlayerHp(currentPlayer.hp - baseDamage)
  state.addLog(
    `${enemy.type === 'slime' ? '史莱姆' : enemy.type === 'bat' ? '蝙蝠' : enemy.type === 'skeleton' ? '骷髅兵' : '元素守卫'}攻击了你！损失${baseDamage}点生命`,
    'damage'
  )
  state.triggerHitEffect('fire')

  if (enemy.type === 'boss') {
    bossSpecialAttack(ctx)
  }

  state.updateEnemy(roomPos, enemy.id, { attackCooldown: attackInterval })

  return 'attack'
}

function bossSpecialAttack(ctx: AIContext): void {
  const { enemy, playerPos } = ctx
  const state = useGameStore.getState()

  const elements: ElementType[] = ['fire', 'ice', 'wind']
  const element = elements[Math.floor(Math.random() * 3)]

  const damages: Record<ElementType, number> = {
    fire: 8,
    ice: 5,
    wind: 6,
    none: 0
  }

  for (let i = 0; i < 3; i++) {
    const angleOffset = (i - 1) * 0.3
    const dx = playerPos.x - enemy.position.x
    const dy = playerPos.y - enemy.position.y
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const baseAngle = Math.atan2(dy, dx)
    const angle = baseAngle + angleOffset

    const speed = 0.12
    state.addProjectile({
      position: { ...enemy.position },
      velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      element,
      damage: damages[element],
      lifetime: 2,
      fromPlayer: false
    })
  }

  const names: Record<ElementType, string> = {
    fire: '火焰',
    ice: '寒霜',
    wind: '暴风',
    none: ''
  }
  state.addLog(`Boss释放了${names[element]}弹幕！`, 'warning')
}

export function updateEnemyAI(
  roomPos: Position,
  enemyId: string,
  playerPos: Position,
  delta: number
): void {
  const state = useGameStore.getState()
  const room = state.dungeon[roomPos.y]?.[roomPos.x]
  if (!room) return

  const enemy = room.enemies.find(e => e.id === enemyId)
  if (!enemy || enemy.state === 'dead') return

  const ctx: AIContext = {
    enemy,
    playerPos,
    delta,
    roomPos
  }

  let newState: EnemyState = enemy.state

  switch (enemy.state) {
    case 'patrol':
      newState = patrolBehavior(ctx)
      break
    case 'chase':
      newState = chaseBehavior(ctx)
      break
    case 'attack':
      newState = attackBehavior(ctx)
      break
  }

  if (newState !== enemy.state) {
    state.updateEnemy(roomPos, enemyId, { state: newState })
  }
}

export function updateAllEnemiesInRoom(
  roomPos: Position,
  playerPos: Position,
  delta: number
): void {
  const state = useGameStore.getState()
  const room = state.dungeon[roomPos.y]?.[roomPos.x]
  if (!room) return

  const player = state.player
  if (player.currentRoom.x !== roomPos.x || player.currentRoom.y !== roomPos.y) return

  room.enemies.forEach(enemy => {
    if (enemy.state !== 'dead') {
      updateEnemyAI(roomPos, enemy.id, playerPos, delta)
    }
  })
}

export function checkProjectileEnemyHit(
  roomPos: Position,
  projectileId: string,
  projectilePos: Position,
  projectileElement: ElementType,
  projectileDamage: number,
  fromPlayer: boolean
): boolean {
  const state = useGameStore.getState()
  const room = state.dungeon[roomPos.y]?.[roomPos.x]
  if (!room) return false

  if (fromPlayer) {
    for (const enemy of room.enemies) {
      if (enemy.state === 'dead') continue
      const dist = distance(projectilePos, enemy.position)
      if (dist < 1) {
        state.damageEnemy(roomPos, enemy.id, projectileDamage, projectileElement)
        state.removeProjectile(projectileId)
        return true
      }
    }
  } else {
    const player = state.player
    if (player.currentRoom.x === roomPos.x && player.currentRoom.y === roomPos.y) {
      const dist = distance(projectilePos, player.position)
      if (dist < 0.8) {
        state.setPlayerHp(player.hp - projectileDamage)
        const names: Record<ElementType, string> = {
          fire: '火焰',
          ice: '寒霜',
          wind: '暴风',
          none: ''
        }
        state.addLog(`被${names[projectileElement]}弹幕击中！损失${projectileDamage}点生命`, 'damage')
        state.removeProjectile(projectileId)
        return true
      }
    }
  }

  return false
}

export function checkProjectileMechanismHit(
  roomPos: Position,
  projectileId: string,
  projectilePos: Position,
  projectileElement: ElementType
): boolean {
  const state = useGameStore.getState()
  const room = state.dungeon[roomPos.y]?.[roomPos.x]
  if (!room) return false

  for (const mech of room.mechanisms) {
    if (mech.solved) continue
    const dist = distance(projectilePos, mech.position)
    if (dist < 0.9) {
      const { getElementReaction } = require('./elementSystem')
      const reaction = getElementReaction(mech.type, projectileElement)

      if (reaction.success) {
        state.solveMechanism(roomPos, mech.id)
        state.addParticleBurst(mech.position, projectileElement, 15)
        state.addLog(reaction.message, 'success')
      } else if (reaction.penalty && reaction.penalty > 0) {
        const player = state.player
        state.setPlayerHp(player.hp - reaction.penalty)
        state.addParticleBurst(player.position, 'fire', 20)
        state.addLog(reaction.message, 'warning')
      }

      state.removeProjectile(projectileId)
      return true
    }
  }

  return false
}

export function checkAllMechanismsSolvedForBoss(
  store: typeof useGameStore
): boolean {
  const state = store.getState()
  const allSolved = state.totalMechanisms > 0 && state.totalMechanismsSolved >= state.totalMechanisms
  if (allSolved) {
    const dungeon = state.dungeon
    const newDungeon = dungeon.map(row => row.map(room => ({
      ...room,
      doors: room.doors.map(d => ({ ...d, isLocked: false }))
    })))
    store.setState({ dungeon: newDungeon })
    state.addLog('所有机关已解开！Boss房间已解锁！', 'success')
  }
  return allSolved
}

export { distance, clampPosition }
