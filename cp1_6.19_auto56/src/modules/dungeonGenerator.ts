import { v4 as uuidv4 } from 'uuid'
import type { Room, Position, Mechanism, Door, Trap, Enemy, ElementType } from '../store/gameStore'

const DUNGEON_SIZE = 6
const ROOM_SIZE = 16

interface MechanismTemplate {
  type: Mechanism['type']
  requiredElement: ElementType
}

interface EnemyTemplate {
  type: Enemy['type']
  hp: number
  speed: number
  visionRange: number
  elementWeakness: ElementType
  dropsGem: ElementType | null
}

const MECHANISM_TEMPLATES: MechanismTemplate[] = [
  { type: 'torch', requiredElement: 'fire' },
  { type: 'ice_wall', requiredElement: 'fire' },
  { type: 'ice_door', requiredElement: 'fire' },
  { type: 'water_surface', requiredElement: 'ice' },
  { type: 'crack', requiredElement: 'ice' },
  { type: 'poison_vent', requiredElement: 'ice' },
  { type: 'windmill', requiredElement: 'wind' }
]

const ENEMY_TEMPLATES: EnemyTemplate[] = [
  { type: 'slime', hp: 30, speed: 1.5, visionRange: 6, elementWeakness: 'fire', dropsGem: 'fire' },
  { type: 'bat', hp: 20, speed: 2.0, visionRange: 7, elementWeakness: 'wind', dropsGem: 'wind' },
  { type: 'skeleton', hp: 40, speed: 1.8, visionRange: 5, elementWeakness: 'ice', dropsGem: 'ice' }
]

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomPosition(margin: number = 3, roomSize: number = ROOM_SIZE): Position {
  return {
    x: randomInt(margin, roomSize - margin - 1),
    y: randomInt(margin, roomSize - margin - 1)
  }
}

function distance(a: Position, b: Position): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2))
}

function findValidPosition(
  existing: Position[],
  minDistance: number = 3,
  margin: number = 3,
  maxAttempts: number = 50
): Position {
  for (let i = 0; i < maxAttempts; i++) {
    const pos = randomPosition(margin)
    const valid = existing.every(e => distance(e, pos) >= minDistance)
    if (valid) return pos
  }
  return randomPosition(margin)
}

function generateDoors(gridPos: Position, dungeonSize: number): Door[] {
  const doors: Door[] = []
  const { x, y } = gridPos

  const directions: { dir: Door['direction']; pos: Position; hasNeighbor: boolean }[] = [
    { dir: 'top', pos: { x: ROOM_SIZE / 2, y: 0 }, hasNeighbor: y > 0 },
    { dir: 'bottom', pos: { x: ROOM_SIZE / 2, y: ROOM_SIZE - 1 }, hasNeighbor: y < dungeonSize - 1 },
    { dir: 'left', pos: { x: 0, y: ROOM_SIZE / 2 }, hasNeighbor: x > 0 },
    { dir: 'right', pos: { x: ROOM_SIZE - 1, y: ROOM_SIZE / 2 }, hasNeighbor: x < dungeonSize - 1 }
  ]

  directions.forEach(({ dir, pos, hasNeighbor }) => {
    if (!hasNeighbor) return

    const shouldHaveDoor = Math.random() < 0.7 ||
      (y === 0 && x === 0 && (dir === 'right' || dir === 'bottom')) ||
      (y === dungeonSize - 1 && x === dungeonSize - 1 && (dir === 'left' || dir === 'top'))

    if (shouldHaveDoor) {
      doors.push({
        id: uuidv4(),
        position: pos,
        direction: dir,
        isOpen: false,
        isLocked: false,
        animationProgress: 0
      })
    }
  })

  if (gridPos.x === 0 && gridPos.y === 0) {
    return doors
  }

  const needsMoreConnections = doors.length < 2 && Math.random() < 0.5
  if (needsMoreConnections) {
    const missingDirs = directions.filter(d =>
      d.hasNeighbor && !doors.some(door => door.direction === d.dir)
    )
    if (missingDirs.length > 0) {
      const addDir = missingDirs[randomInt(0, missingDirs.length - 1)]
      doors.push({
        id: uuidv4(),
        position: addDir.pos,
        direction: addDir.dir,
        isOpen: false,
        isLocked: false,
        animationProgress: 0
      })
    }
  }

  return doors
}

function generateMechanisms(
  gridPos: Position,
  isStartRoom: boolean,
  isBossRoom: boolean,
  floor: number
): Mechanism[] {
  const mechanisms: Mechanism[] = []
  const usedPositions: Position[] = [{ x: ROOM_SIZE / 2, y: ROOM_SIZE / 2 }]

  if (isStartRoom) {
    const template = MECHANISM_TEMPLATES[randomInt(0, MECHANISM_TEMPLATES.length - 1)]
    const pos = findValidPosition(usedPositions)
    usedPositions.push(pos)
    mechanisms.push({
      id: uuidv4(),
      type: template.type,
      position: pos,
      requiredElement: template.requiredElement,
      solved: true,
      active: true
    })
    return mechanisms
  }

  if (isBossRoom) return mechanisms

  const mechCount = 1 + Math.min(Math.floor(floor / 2), 2)

  for (let i = 0; i < mechCount; i++) {
    const template = MECHANISM_TEMPLATES[randomInt(0, MECHANISM_TEMPLATES.length - 1)]
    const pos = findValidPosition(usedPositions)
    usedPositions.push(pos)
    mechanisms.push({
      id: uuidv4(),
      type: template.type,
      position: pos,
      requiredElement: template.requiredElement,
      solved: false,
      active: false
    })
  }

  return mechanisms
}

function generateEnemies(
  gridPos: Position,
  isStartRoom: boolean,
  isBossRoom: boolean,
  floor: number
): Enemy[] {
  const enemies: Enemy[] = []
  const usedPositions: Position[] = [{ x: ROOM_SIZE / 2, y: ROOM_SIZE / 2 }]

  if (isStartRoom) return enemies

  const floorSpeedBonus = Math.min(0.5 * (floor - 1), 2)
  const floorHpBonus = Math.min(10 * (floor - 1), 50)

  if (isBossRoom) {
    usedPositions.push({ x: ROOM_SIZE / 2, y: 5 })
    const elements: ElementType[] = ['fire', 'ice', 'wind']
    const bossElement = elements[randomInt(0, 2)]
    enemies.push({
      id: uuidv4(),
      type: 'boss',
      position: { x: ROOM_SIZE / 2, y: 5 },
      hp: 200 + floorHpBonus * 3,
      maxHp: 200 + floorHpBonus * 3,
      speed: 1.2 + floorSpeedBonus * 0.5,
      visionRange: 12,
      state: 'patrol',
      elementWeakness: bossElement,
      attackCooldown: 0,
      direction: { x: 0, y: 1 },
      patrolTarget: null,
      hasShield: true,
      shieldHp: 100,
      dropsGem: null
    })
    return enemies
  }

  const enemyCount = 1 + Math.min(Math.floor(floor / 2), 2)

  for (let i = 0; i < enemyCount; i++) {
    const template = ENEMY_TEMPLATES[randomInt(0, ENEMY_TEMPLATES.length - 1)]
    const pos = findValidPosition(usedPositions)
    usedPositions.push(pos)
    enemies.push({
      id: uuidv4(),
      type: template.type,
      position: pos,
      hp: template.hp + floorHpBonus,
      maxHp: template.hp + floorHpBonus,
      speed: template.speed + floorSpeedBonus,
      visionRange: template.visionRange,
      state: 'patrol',
      elementWeakness: template.elementWeakness,
      attackCooldown: 0,
      direction: { x: 0, y: 0 },
      patrolTarget: null,
      hasShield: false,
      shieldHp: 0,
      dropsGem: template.dropsGem
    })
  }

  return enemies
}

function generateTraps(
  gridPos: Position,
  isStartRoom: boolean,
  isBossRoom: boolean,
  floor: number
): Trap[] {
  const traps: Trap[] = []
  if (isStartRoom || isBossRoom) return traps

  const usedPositions: Position[] = [{ x: ROOM_SIZE / 2, y: ROOM_SIZE / 2 }]
  const trapCount = Math.random() < 0.4 ? 1 : 0

  const trapTypes: Trap['type'][] = ['spike', 'poison', 'fire']

  for (let i = 0; i < trapCount; i++) {
    const type = trapTypes[randomInt(0, trapTypes.length - 1)]
    const pos = findValidPosition(usedPositions, 2, 2)
    usedPositions.push(pos)
    traps.push({
      id: uuidv4(),
      position: pos,
      type,
      active: true,
      damage: 5 + floor * 2
    })
  }

  return traps
}

export function generateDungeon(floor: number = 1, size: number = DUNGEON_SIZE): Room[][] {
  const dungeon: Room[][] = []

  for (let y = 0; y < size; y++) {
    const row: Room[] = []
    for (let x = 0; x < size; x++) {
      const gridPos: Position = { x, y }
      const isStartRoom = x === 0 && y === 0
      const isBossRoom = x === size - 1 && y === size - 1

      row.push({
        gridPos,
        visited: isStartRoom,
        cleared: isStartRoom,
        mechanisms: generateMechanisms(gridPos, isStartRoom, isBossRoom, floor),
        enemies: generateEnemies(gridPos, isStartRoom, isBossRoom, floor),
        doors: generateDoors(gridPos, size),
        traps: generateTraps(gridPos, isStartRoom, isBossRoom, floor),
        isBossRoom,
        isStartRoom
      })
    }
    dungeon.push(row)
  }

  ensureConnectivity(dungeon, size)
  ensureBossAccessible(dungeon, size)

  return dungeon
}

function ensureConnectivity(dungeon: Room[][], size: number): void {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (x < size - 1) {
        const hasRight = dungeon[y][x].doors.some(d => d.direction === 'right')
        const hasLeft = dungeon[y][x + 1].doors.some(d => d.direction === 'left')
        if (hasRight !== hasLeft) {
          if (hasRight && !hasLeft) {
            dungeon[y][x + 1].doors.push({
              id: uuidv4(),
              position: { x: 0, y: ROOM_SIZE / 2 },
              direction: 'left',
              isOpen: false,
              isLocked: false,
              animationProgress: 0
            })
          } else if (!hasRight && hasLeft) {
            dungeon[y][x].doors.push({
              id: uuidv4(),
              position: { x: ROOM_SIZE - 1, y: ROOM_SIZE / 2 },
              direction: 'right',
              isOpen: false,
              isLocked: false,
              animationProgress: 0
            })
          }
        }
      }

      if (y < size - 1) {
        const hasBottom = dungeon[y][x].doors.some(d => d.direction === 'bottom')
        const hasTop = dungeon[y + 1][x].doors.some(d => d.direction === 'top')
        if (hasBottom !== hasTop) {
          if (hasBottom && !hasTop) {
            dungeon[y + 1][x].doors.push({
              id: uuidv4(),
              position: { x: ROOM_SIZE / 2, y: 0 },
              direction: 'top',
              isOpen: false,
              isLocked: false,
              animationProgress: 0
            })
          } else if (!hasBottom && hasTop) {
            dungeon[y][x].doors.push({
              id: uuidv4(),
              position: { x: ROOM_SIZE / 2, y: ROOM_SIZE - 1 },
              direction: 'bottom',
              isOpen: false,
              isLocked: false,
              animationProgress: 0
            })
          }
        }
      }
    }
  }
}

function ensureBossAccessible(dungeon: Room[][], size: number): void {
  const bossX = size - 1
  const bossY = size - 1

  if (!dungeon[bossY][bossX].doors.some(d => d.direction === 'left')) {
    dungeon[bossY][bossX].doors.push({
      id: uuidv4(),
      position: { x: 0, y: ROOM_SIZE / 2 },
      direction: 'left',
      isOpen: false,
      isLocked: true,
      animationProgress: 0
    })
    dungeon[bossY][bossX - 1].doors.push({
      id: uuidv4(),
      position: { x: ROOM_SIZE - 1, y: ROOM_SIZE / 2 },
      direction: 'right',
      isOpen: false,
      isLocked: true,
      animationProgress: 0
    })
  }

  if (!dungeon[bossY][bossX].doors.some(d => d.direction === 'top')) {
    dungeon[bossY][bossX].doors.push({
      id: uuidv4(),
      position: { x: ROOM_SIZE / 2, y: 0 },
      direction: 'top',
      isOpen: false,
      isLocked: true,
      animationProgress: 0
    })
    dungeon[bossY - 1][bossX].doors.push({
      id: uuidv4(),
      position: { x: ROOM_SIZE / 2, y: ROOM_SIZE - 1 },
      direction: 'bottom',
      isOpen: false,
      isLocked: true,
      animationProgress: 0
    })
  }
}

export function canEnterRoom(
  dungeon: Room[][],
  fromRoom: Position,
  direction: Door['direction']
): { canEnter: boolean; targetRoom?: Position } {
  const dirOffset: Record<Door['direction'], Position> = {
    top: { x: 0, y: -1 },
    bottom: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  }

  const opposite: Record<Door['direction'], Door['direction']> = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left'
  }

  const offset = dirOffset[direction]
  const targetPos = {
    x: fromRoom.x + offset.x,
    y: fromRoom.y + offset.y
  }

  if (targetPos.x < 0 || targetPos.x >= dungeon[0].length ||
      targetPos.y < 0 || targetPos.y >= dungeon.length) {
    return { canEnter: false }
  }

  const fromDoor = dungeon[fromRoom.y][fromRoom.x].doors.find(d => d.direction === direction)
  const toDoor = dungeon[targetPos.y][targetPos.x].doors.find(d => d.direction === opposite[direction])

  return {
    canEnter: !!fromDoor && !!toDoor && !fromDoor.isLocked && !toDoor.isLocked,
    targetRoom: targetPos
  }
}

export function getDoorEntryPosition(direction: Door['direction']): Position {
  switch (direction) {
    case 'top': return { x: ROOM_SIZE / 2, y: ROOM_SIZE - 3 }
    case 'bottom': return { x: ROOM_SIZE / 2, y: 2 }
    case 'left': return { x: ROOM_SIZE - 3, y: ROOM_SIZE / 2 }
    case 'right': return { x: 2, y: ROOM_SIZE / 2 }
  }
}

export function checkRoomCleared(room: Room): boolean {
  if (room.isStartRoom) return true
  if (room.isBossRoom) {
    return room.enemies.length === 0
  }
  const allMechsSolved = room.mechanisms.every(m => m.solved)
  const allEnemiesDead = room.enemies.length === 0
  return allMechsSolved && allEnemiesDead
}

export function unlockBossDoors(dungeon: Room[][]): Room[][] {
  const size = dungeon.length
  const bossY = size - 1
  const bossX = size - 1

  const newDungeon = dungeon.map(row => row.map(room => ({
    ...room,
    doors: room.doors.map(d => ({ ...d, isLocked: false }))
  })))

  return newDungeon
}

export { DUNGEON_SIZE, ROOM_SIZE }
