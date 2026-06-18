import { AABB, Obstacle, Crystal, Vec3 } from '../types'

export const CART_HALF_WIDTH = 0.8
export const CART_HALF_LENGTH = 1.2
export const OBSTACLE_RADIUS = 0.9
export const CRYSTAL_RADIUS = 0.6

export function getCartAABB(position: Vec3): AABB {
  return {
    minX: position.x - CART_HALF_WIDTH,
    maxX: position.x + CART_HALF_WIDTH,
    minZ: position.z - CART_HALF_LENGTH,
    maxZ: position.z + CART_HALF_LENGTH,
  }
}

export function getObstacleAABB(obstacle: Obstacle): AABB {
  return {
    minX: obstacle.position.x - OBSTACLE_RADIUS,
    maxX: obstacle.position.x + OBSTACLE_RADIUS,
    minZ: obstacle.position.z - OBSTACLE_RADIUS,
    maxZ: obstacle.position.z + OBSTACLE_RADIUS,
  }
}

export function getCrystalAABB(crystal: Crystal): AABB {
  return {
    minX: crystal.position.x - CRYSTAL_RADIUS,
    maxX: crystal.position.x + CRYSTAL_RADIUS,
    minZ: crystal.position.z - CRYSTAL_RADIUS,
    maxZ: crystal.position.z + CRYSTAL_RADIUS,
  }
}

export function checkAABBIntersection(a: AABB, b: AABB): boolean {
  return (
    a.minX < b.maxX &&
    a.maxX > b.minX &&
    a.minZ < b.maxZ &&
    a.maxZ > b.minZ
  )
}

export interface CollisionResult {
  hitObstacle: boolean
  collectedCrystals: string[]
}

export function checkCollisions(
  cartPosition: Vec3,
  obstacles: Obstacle[],
  crystals: Crystal[]
): CollisionResult {
  const cartAABB = getCartAABB(cartPosition)
  const result: CollisionResult = {
    hitObstacle: false,
    collectedCrystals: [],
  }

  for (const obstacle of obstacles) {
    if (!obstacle.active || obstacle.opacity < 0.5) continue
    const obstacleAABB = getObstacleAABB(obstacle)
    if (checkAABBIntersection(cartAABB, obstacleAABB)) {
      result.hitObstacle = true
      break
    }
  }

  for (const crystal of crystals) {
    if (crystal.collected) continue
    const crystalAABB = getCrystalAABB(crystal)
    if (checkAABBIntersection(cartAABB, crystalAABB)) {
      result.collectedCrystals.push(crystal.id)
    }
  }

  return result
}
