import type { Position, ElementType, PlayerState } from '../store/gameStore'
import { useGameStore } from '../store/gameStore'
import { ROOM_SIZE } from './dungeonGenerator'
import { SKILL_COSTS } from './elementSystem'

export interface InputState {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
  sprint: boolean
  attack: boolean
  interact: boolean
}

export interface PlayerController {
  input: InputState
  lastMousePos: Position

  handleKeyDown: (e: KeyboardEvent) => void
  handleKeyUp: (e: KeyboardEvent) => void
  handleMouseMove: (e: MouseEvent) => void
  handleClick: (e: MouseEvent, canvasOffset: Position) => void
  update: (delta: number) => void
}

export function createInputState(): InputState {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    sprint: false,
    attack: false,
    interact: false
  }
}

function isKey(key: string, keys: string[]): boolean {
  return keys.includes(key.toLowerCase())
}

export function handlePlayerKeyDown(
  e: KeyboardEvent,
  input: InputState,
  store: typeof useGameStore
): InputState {
  const newInput = { ...input }
  const key = e.key.toLowerCase()

  if (isKey(key, ['w', 'arrowup'])) newInput.up = true
  if (isKey(key, ['s', 'arrowdown'])) newInput.down = true
  if (isKey(key, ['a', 'arrowleft'])) newInput.left = true
  if (isKey(key, ['d', 'arrowright'])) newInput.right = true
  if (isKey(key, ['shift'])) newInput.sprint = true
  if (isKey(key, [' '])) newInput.attack = true
  if (isKey(key, ['f', 'e']) && key === 'f') newInput.interact = true

  const state = store.getState()

  if (key === 'q' && state.player.elementCooldown <= 0) {
    switchElement('fire', store)
  } else if (key === 'e' && !newInput.interact && state.player.elementCooldown <= 0) {
    switchElement('ice', store)
  } else if (key === 'r' && state.player.elementCooldown <= 0) {
    switchElement('wind', store)
  }

  return newInput
}

export function handlePlayerKeyUp(
  e: KeyboardEvent,
  input: InputState
): InputState {
  const newInput = { ...input }
  const key = e.key.toLowerCase()

  if (isKey(key, ['w', 'arrowup'])) newInput.up = false
  if (isKey(key, ['s', 'arrowdown'])) newInput.down = false
  if (isKey(key, ['a', 'arrowleft'])) newInput.left = false
  if (isKey(key, ['d', 'arrowright'])) newInput.right = false
  if (isKey(key, ['shift'])) newInput.sprint = false
  if (isKey(key, [' '])) newInput.attack = false
  if (isKey(key, ['f'])) newInput.interact = false

  return newInput
}

function switchElement(element: ElementType, store: typeof useGameStore): void {
  const state = store.getState()
  if (state.player.currentElement === element) return

  store.setState({
    player: {
      ...state.player,
      currentElement: element,
      elementCooldown: 1
    }
  })

  const names: Record<ElementType, string> = {
    fire: '火',
    ice: '冰',
    wind: '风',
    none: '无'
  }
  store.getState().addLog(`切换为${names[element]}元素`, 'info')
  store.getState().triggerHitEffect(element)
}

export function updatePlayerMovement(
  input: InputState,
  delta: number,
  store: typeof useGameStore
): void {
  const state = store.getState()
  const { player, dungeon } = state

  if (state.gameStatus !== 'playing') return

  let dx = 0
  let dy = 0
  if (input.up) dy -= 1
  if (input.down) dy += 1
  if (input.left) dx -= 1
  if (input.right) dx += 1

  if (dx === 0 && dy === 0) return

  const len = Math.sqrt(dx * dx + dy * dy)
  dx /= len
  dy /= len

  let speed = player.speed
  if (input.sprint) speed *= 1.5

  const currentRoom = dungeon[player.currentRoom.y]?.[player.currentRoom.x]
  if (!currentRoom) return

  const margin = 1
  const roomSize = ROOM_SIZE

  let newX = player.position.x + dx * speed * delta * 60 * 0.08
  let newY = player.position.y + dy * speed * delta * 60 * 0.08

  newX = Math.max(margin, Math.min(roomSize - margin, newX))
  newY = Math.max(margin, Math.min(roomSize - margin, newY))

  checkRoomTransition(
    { x: newX, y: newY },
    player.currentRoom,
    currentRoom.doors,
    store
  )
}

function checkRoomTransition(
  newPos: Position,
  currentRoomPos: Position,
  doors: any[],
  store: typeof useGameStore
): void {
  const state = store.getState()
  const player = state.player
  const dungeon = state.dungeon

  const margin = 0.3
  const center = ROOM_SIZE / 2

  const nearLeft = newPos.x <= 1 + margin
  const nearRight = newPos.x >= ROOM_SIZE - 1 - margin
  const nearTop = newPos.y <= 1 + margin
  const nearBottom = newPos.y >= ROOM_SIZE - 1 - margin

  if (!nearLeft && !nearRight && !nearTop && !nearBottom) {
    store.getState().setPlayerPosition(newPos)
    return
  }

  type Dir = 'top' | 'bottom' | 'left' | 'right'
  let dir: Dir | null = null

  if (nearLeft && Math.abs(newPos.y - center) < 3) dir = 'left'
  if (nearRight && Math.abs(newPos.y - center) < 3) dir = 'right'
  if (nearTop && Math.abs(newPos.x - center) < 3) dir = 'top'
  if (nearBottom && Math.abs(newPos.x - center) < 3) dir = 'bottom'

  if (!dir) {
    store.getState().setPlayerPosition(newPos)
    return
  }

  const door = doors.find(d => d.direction === dir)
  if (!door) {
    store.getState().setPlayerPosition(newPos)
    return
  }

  if (door.isLocked) {
    const clampedPos = clampToDoorEdge(newPos, dir)
    store.getState().setPlayerPosition(clampedPos)
    return
  }

  const offset = {
    top: { x: 0, y: -1 },
    bottom: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  }

  const targetRoom = {
    x: currentRoomPos.x + offset[dir].x,
    y: currentRoomPos.y + offset[dir].y
  }

  if (targetRoom.x < 0 || targetRoom.x >= dungeon[0].length ||
      targetRoom.y < 0 || targetRoom.y >= dungeon.length) {
    store.getState().setPlayerPosition(newPos)
    return
  }

  const opposite: Record<Dir, Dir> = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left'
  }

  const entryPos = {
    top: { x: ROOM_SIZE / 2, y: ROOM_SIZE - 2 },
    bottom: { x: ROOM_SIZE / 2, y: 2 },
    left: { x: ROOM_SIZE - 2, y: ROOM_SIZE / 2 },
    right: { x: 2, y: ROOM_SIZE / 2 }
  }

  store.getState().setCurrentRoom(targetRoom)
  store.getState().setPlayerPosition(entryPos[opposite[dir]])
  store.getState().setRoomVisited(targetRoom)
  store.getState().addLog(
    `进入房间 [${targetRoom.x + 1}, ${targetRoom.y + 1}]`,
    'info'
  )
}

function clampToDoorEdge(pos: Position, dir: 'top' | 'bottom' | 'left' | 'right'): Position {
  const result = { ...pos }
  switch (dir) {
    case 'top': result.y = Math.max(result.y, 1.3); break
    case 'bottom': result.y = Math.min(result.y, ROOM_SIZE - 1.3); break
    case 'left': result.x = Math.max(result.x, 1.3); break
    case 'right': result.x = Math.min(result.x, ROOM_SIZE - 1.3); break
  }
  return result
}

export function playerUseSkill(
  targetPos: Position,
  store: typeof useGameStore
): boolean {
  const state = store.getState()
  const { player } = state

  if (state.gameStatus !== 'playing') return false

  const element = player.currentElement
  const cost = SKILL_COSTS[element]

  if (player.elementEnergies[element] < cost) {
    state.addLog(`${element === 'fire' ? '火' : element === 'ice' ? '冰' : '风'}元素能量不足！`, 'warning')
    return false
  }

  if (player.skillCooldowns[element] > 0) return false

  const dx = targetPos.x - player.position.x
  const dy = targetPos.y - player.position.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist === 0) return false

  const speed = 0.25
  const velocity = { x: (dx / dist) * speed, y: (dy / dist) * speed }

  const damages: Record<ElementType, number> = {
    fire: 25,
    ice: 15,
    wind: 18,
    none: 0
  }

  const lifetimes: Record<ElementType, number> = {
    fire: 1.2,
    ice: 1.5,
    wind: 1.0,
    none: 0
  }

  const cooldowns: Record<ElementType, number> = {
    fire: 0.4,
    ice: 0.7,
    wind: 0.25,
    none: 0
  }

  store.getState().addProjectile({
    position: { ...player.position },
    velocity,
    element,
    damage: damages[element],
    lifetime: lifetimes[element],
    fromPlayer: true
  })

  store.setState((s) => ({
    player: {
      ...s.player,
      elementEnergies: {
        ...s.player.elementEnergies,
        [element]: s.player.elementEnergies[element] - cost
      },
      skillCooldowns: {
        ...s.player.skillCooldowns,
        [element]: cooldowns[element]
      }
    }
  }))

  return true
}

export function updatePlayerInteraction(
  input: InputState,
  store: typeof useGameStore
): void {
  if (!input.interact) return

  const state = store.getState()
  const { player, dungeon } = state
  const room = dungeon[player.currentRoom.y]?.[player.currentRoom.x]
  if (!room) return

  for (const mech of room.mechanisms) {
    if (mech.solved) continue

    const dist = Math.sqrt(
      Math.pow(player.position.x - mech.position.x, 2) +
      Math.pow(player.position.y - mech.position.y, 2)
    )

    if (dist < 2.5) {
      const { checkMechanismInteraction } = require('./elementSystem')
      const reaction = checkMechanismInteraction(mech, player.currentElement, player.position)

      if (reaction.success) {
        store.getState().solveMechanism(player.currentRoom, mech.id)
        store.getState().addParticleBurst(mech.position, mech.requiredElement, 15)
        store.getState().addLog(reaction.message, 'success')
      } else if (reaction.penalty && reaction.penalty > 0) {
        store.getState().setPlayerHp(player.hp - reaction.penalty)
        store.getState().addParticleBurst(player.position, 'fire', 20)
        store.getState().addLog(reaction.message, 'warning')
      } else {
        store.getState().addLog(reaction.message, 'info')
      }
      break
    }
  }
}

export function checkTrapCollision(
  store: typeof useGameStore,
  lastDamageTime: Map<string, number>,
  currentTime: number
): void {
  const state = store.getState()
  const { player, dungeon } = state
  const room = dungeon[player.currentRoom.y]?.[player.currentRoom.x]
  if (!room) return

  for (const trap of room.traps) {
    if (!trap.active) continue

    const dist = Math.sqrt(
      Math.pow(player.position.x - trap.position.x, 2) +
      Math.pow(player.position.y - trap.position.y, 2)
    )

    if (dist < 0.8) {
      const lastHit = lastDamageTime.get(trap.id) || 0
      if (currentTime - lastHit > 1000) {
        store.getState().setPlayerHp(player.hp - trap.damage)
        lastDamageTime.set(trap.id, currentTime)
        const trapNames: Record<string, string> = {
          spike: '尖刺',
          poison: '毒气',
          fire: '火焰'
        }
        store.getState().addLog(`踩到${trapNames[trap.type]}陷阱！损失${trap.damage}点生命`, 'damage')
      }
    }
  }
}
