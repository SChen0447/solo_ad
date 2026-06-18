import { Star, EnergyDataPoint } from '../module2/store'

const G = 1
const TIMESTEP = 0.01
const MAX_TRAIL_LENGTH = 200
const SOFTENING = 0.1

export interface PhysicsStar {
  id: string
  mass: number
  position: { x: number; y: number; z: number }
  velocity: { x: number; y: number; z: number }
  trail: { x: number; y: number; z: number }[]
}

const vecSub = (
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
) => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
})

const vecLength = (v: { x: number; y: number; z: number }) =>
  Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)

const vecScale = (v: { x: number; y: number; z: number }, s: number) => ({
  x: v.x * s,
  y: v.y * s,
  z: v.z * s,
})

const vecAdd = (
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
) => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
})

export const calculateForce = (
  star: PhysicsStar,
  otherStars: PhysicsStar[]
): { x: number; y: number; z: number } => {
  let fx = 0
  let fy = 0
  let fz = 0

  for (const other of otherStars) {
    if (other.id === star.id) continue

    const dx = other.position.x - star.position.x
    const dy = other.position.y - star.position.y
    const dz = other.position.z - star.position.z

    const distSq = dx * dx + dy * dy + dz * dz
    const dist = Math.sqrt(distSq + SOFTENING * SOFTENING)
    const distCubed = dist * dist * dist

    const force = (G * star.mass * other.mass) / distCubed

    fx += force * dx
    fy += force * dy
    fz += force * dz
  }

  return { x: fx, y: fy, z: fz }
}

export const calculateAllForces = (
  stars: PhysicsStar[]
): Map<string, { x: number; y: number; z: number }> => {
  const forces = new Map<string, { x: number; y: number; z: number }>()

  for (const star of stars) {
    forces.set(star.id, calculateForce(star, stars))
  }

  return forces
}

export const verletIntegration = (
  stars: Star[],
  dt: number = TIMESTEP
): Star[] => {
  const physicsStars: PhysicsStar[] = stars.map((s) => ({
    id: s.id,
    mass: s.mass,
    position: { ...s.position },
    velocity: { ...s.velocity },
    trail: s.trail.map((t) => ({ ...t })),
  }))

  const forces = calculateAllForces(physicsStars)

  const updatedStars = physicsStars.map((star) => {
    const force = forces.get(star.id)!
    const acceleration = {
      x: force.x / star.mass,
      y: force.y / star.mass,
      z: force.z / star.mass,
    }

    const halfStepVelocity = {
      x: star.velocity.x + acceleration.x * dt * 0.5,
      y: star.velocity.y + acceleration.y * dt * 0.5,
      z: star.velocity.z + acceleration.z * dt * 0.5,
    }

    const newPosition = {
      x: star.position.x + halfStepVelocity.x * dt,
      y: star.position.y + halfStepVelocity.y * dt,
      z: star.position.z + halfStepVelocity.z * dt,
    }

    const newStar: PhysicsStar = {
      ...star,
      position: newPosition,
      velocity: { ...halfStepVelocity },
    }

    return newStar
  })

  const newForces = calculateAllForces(updatedStars)

  const finalStars = updatedStars.map((star) => {
    const newForce = newForces.get(star.id)!
    const newAcceleration = {
      x: newForce.x / star.mass,
      y: newForce.y / star.mass,
      z: newForce.z / star.mass,
    }

    const finalVelocity = {
      x: star.velocity.x + newAcceleration.x * dt * 0.5,
      y: star.velocity.y + newAcceleration.y * dt * 0.5,
      z: star.velocity.z + newAcceleration.z * dt * 0.5,
    }

    const newTrail = [...star.trail, { ...star.position }]
    if (newTrail.length > MAX_TRAIL_LENGTH) {
      newTrail.shift()
    }

    return {
      ...star,
      velocity: finalVelocity,
      trail: newTrail,
    }
  })

  return stars.map((s) => {
    const updated = finalStars.find((fs) => fs.id === s.id)
    if (!updated) return s
    return {
      ...s,
      position: updated.position,
      velocity: updated.velocity,
      trail: updated.trail,
    }
  })
}

export const calculateKineticEnergy = (stars: Star[]): number => {
  let total = 0
  for (const star of stars) {
    const speedSq =
      star.velocity.x * star.velocity.x +
      star.velocity.y * star.velocity.y +
      star.velocity.z * star.velocity.z
    total += 0.5 * star.mass * speedSq
  }
  return total
}

export const calculatePotentialEnergy = (stars: Star[]): number => {
  let total = 0
  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      const a = stars[i]
      const b = stars[j]
      const dx = b.position.x - a.position.x
      const dy = b.position.y - a.position.y
      const dz = b.position.z - a.position.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz + SOFTENING * SOFTENING)
      total -= (G * a.mass * b.mass) / dist
    }
  }
  return total
}

export const calculateEnergyDataPoint = (
  stars: Star[],
  time: number
): EnergyDataPoint => {
  const kinetic = calculateKineticEnergy(stars)
  const potential = calculatePotentialEnergy(stars)
  const perStar: { [starId: string]: number } = {}

  for (const star of stars) {
    const speedSq =
      star.velocity.x * star.velocity.x +
      star.velocity.y * star.velocity.y +
      star.velocity.z * star.velocity.z
    perStar[star.id] = 0.5 * star.mass * speedSq
  }

  return {
    time,
    kinetic,
    potential,
    total: kinetic + potential,
    perStar,
  }
}
