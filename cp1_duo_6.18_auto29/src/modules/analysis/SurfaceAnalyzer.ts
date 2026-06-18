import type { Atom, Bond } from '../../store/useStore'

const VAN_DER_WAALS_RADII: Record<string, number> = {
  C: 1.7,
  O: 1.52,
  N: 1.55,
  S: 1.8,
  H: 1.2,
  P: 1.8
}

const PROBE_RADIUS = 1.4
const POINTS_PER_ATOM = 162

function getVanDerWaalsRadius(type: string): number {
  return VAN_DER_WAALS_RADII[type] || 1.5
}

function generateSpherePoints(n: number): Array<[number, number, number]> {
  const points: Array<[number, number, number]> = []
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))

  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2
    const radius = Math.sqrt(1 - y * y)
    const theta = goldenAngle * i

    const x = Math.cos(theta) * radius
    const z = Math.sin(theta) * radius

    points.push([x, y, z])
  }

  return points
}

const SPHERE_POINTS = generateSpherePoints(POINTS_PER_ATOM)

export function calculateSASA(atoms: Atom[]): number {
  if (atoms.length === 0) return 0

  let totalArea = 0

  for (let i = 0; i < atoms.length; i++) {
    const atom = atoms[i]
    const radius = getVanDerWaalsRadius(atom.type) + PROBE_RADIUS

    let accessiblePoints = 0

    for (const point of SPHERE_POINTS) {
      const px = atom.x + point[0] * radius
      const py = atom.y + point[1] * radius
      const pz = atom.z + point[2] * radius

      let isAccessible = true

      for (let j = 0; j < atoms.length; j++) {
        if (i === j) continue

        const other = atoms[j]
        const otherRadius = getVanDerWaalsRadius(other.type) + PROBE_RADIUS

        const dx = px - other.x
        const dy = py - other.y
        const dz = pz - other.z
        const distSq = dx * dx + dy * dy + dz * dz

        if (distSq < otherRadius * otherRadius) {
          isAccessible = false
          break
        }
      }

      if (isAccessible) {
        accessiblePoints++
      }
    }

    const sphereArea = 4 * Math.PI * radius * radius
    const atomArea = sphereArea * (accessiblePoints / POINTS_PER_ATOM)
    totalArea += atomArea
  }

  return parseFloat(totalArea.toFixed(2))
}

export function calculateBondAngle(
  centerAtomId: number,
  atoms: Atom[],
  bonds: Bond[]
): number | null {
  const connectedAtomIds: number[] = []

  for (const bond of bonds) {
    if (bond.atom1 === centerAtomId) {
      connectedAtomIds.push(bond.atom2)
    } else if (bond.atom2 === centerAtomId) {
      connectedAtomIds.push(bond.atom1)
    }
  }

  if (connectedAtomIds.length < 2) {
    return null
  }

  const centerAtom = atoms.find(a => a.id === centerAtomId)
  const atom1 = atoms.find(a => a.id === connectedAtomIds[0])
  const atom2 = atoms.find(a => a.id === connectedAtomIds[1])

  if (!centerAtom || !atom1 || !atom2) {
    return null
  }

  const v1 = {
    x: atom1.x - centerAtom.x,
    y: atom1.y - centerAtom.y,
    z: atom1.z - centerAtom.z
  }

  const v2 = {
    x: atom2.x - centerAtom.x,
    y: atom2.y - centerAtom.y,
    z: atom2.z - centerAtom.z
  }

  const dotProduct = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z

  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z)
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z)

  if (mag1 === 0 || mag2 === 0) {
    return null
  }

  let cosAngle = dotProduct / (mag1 * mag2)
  cosAngle = Math.max(-1, Math.min(1, cosAngle))

  const angleRad = Math.acos(cosAngle)
  const angleDeg = angleRad * (180 / Math.PI)

  return parseFloat(angleDeg.toFixed(1))
}

export function calculateAtomDistance(
  atom1Id: number,
  atom2Id: number,
  atoms: Atom[]
): number | null {
  const atom1 = atoms.find(a => a.id === atom1Id)
  const atom2 = atoms.find(a => a.id === atom2Id)

  if (!atom1 || !atom2) {
    return null
  }

  const dx = atom1.x - atom2.x
  const dy = atom1.y - atom2.y
  const dz = atom1.z - atom2.z

  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

  return parseFloat(distance.toFixed(2))
}

export function getConnectedAtoms(atomId: number, bonds: Bond[]): number[] {
  const connected: number[] = []

  for (const bond of bonds) {
    if (bond.atom1 === atomId) {
      connected.push(bond.atom2)
    } else if (bond.atom2 === atomId) {
      connected.push(bond.atom1)
    }
  }

  return connected
}
