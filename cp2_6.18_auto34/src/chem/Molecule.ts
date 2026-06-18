import * as THREE from 'three'

export interface Atom {
  element: string
  position: THREE.Vector3
  radius: number
  color: number
}

export interface Bond {
  atomIndex1: number
  atomIndex2: number
  type: 'single' | 'double' | 'triple'
}

export interface BondAngle {
  centerIndex: number
  atomIndex1: number
  atomIndex2: number
  angle: number
}

export type MoleculeType = 'water' | 'methane' | 'benzene'

export class Molecule {
  name: string
  atoms: Atom[]
  bonds: Bond[]

  constructor(name: string, atoms: Atom[], bonds: Bond[]) {
    this.name = name
    this.atoms = atoms
    this.bonds = bonds
  }

  getBondAngles(): BondAngle[] {
    const angles: BondAngle[] = []
    const atomBondMap = new Map<number, number[]>()

    for (const bond of this.bonds) {
      if (!atomBondMap.has(bond.atomIndex1)) {
        atomBondMap.set(bond.atomIndex1, [])
      }
      if (!atomBondMap.has(bond.atomIndex2)) {
        atomBondMap.set(bond.atomIndex2, [])
      }
      atomBondMap.get(bond.atomIndex1)!.push(bond.atomIndex2)
      atomBondMap.get(bond.atomIndex2)!.push(bond.atomIndex1)
    }

    for (const [centerIndex, connected] of atomBondMap) {
      if (connected.length >= 2) {
        for (let i = 0; i < connected.length; i++) {
          for (let j = i + 1; j < connected.length; j++) {
            const angle = this.calculateAngle(
              this.atoms[centerIndex].position,
              this.atoms[connected[i]].position,
              this.atoms[connected[j]].position
            )
            angles.push({
              centerIndex,
              atomIndex1: connected[i],
              atomIndex2: connected[j],
              angle
            })
          }
        }
      }
    }

    return angles
  }

  private calculateAngle(
    center: THREE.Vector3,
    p1: THREE.Vector3,
    p2: THREE.Vector3
  ): number {
    const v1 = p1.clone().sub(center).normalize()
    const v2 = p2.clone().sub(center).normalize()
    const dot = v1.dot(v2)
    return Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI
  }

  static createWater(): Molecule {
    const atoms: Atom[] = [
      {
        element: 'O',
        position: new THREE.Vector3(0, 0, 0),
        radius: 0.6,
        color: 0xff0000
      },
      {
        element: 'H',
        position: new THREE.Vector3(0.75, 0.6, 0),
        radius: 0.3,
        color: 0xffffff
      },
      {
        element: 'H',
        position: new THREE.Vector3(-0.75, 0.6, 0),
        radius: 0.3,
        color: 0xffffff
      }
    ]

    const bonds: Bond[] = [
      { atomIndex1: 0, atomIndex2: 1, type: 'single' },
      { atomIndex1: 0, atomIndex2: 2, type: 'single' }
    ]

    return new Molecule('water', atoms, bonds)
  }

  static createMethane(): Molecule {
    const atoms: Atom[] = [
      {
        element: 'C',
        position: new THREE.Vector3(0, 0, 0),
        radius: 0.5,
        color: 0x404040
      },
      {
        element: 'H',
        position: new THREE.Vector3(0.85, 0.85, 0.85),
        radius: 0.3,
        color: 0xffffff
      },
      {
        element: 'H',
        position: new THREE.Vector3(-0.85, -0.85, 0.85),
        radius: 0.3,
        color: 0xffffff
      },
      {
        element: 'H',
        position: new THREE.Vector3(0.85, -0.85, -0.85),
        radius: 0.3,
        color: 0xffffff
      },
      {
        element: 'H',
        position: new THREE.Vector3(-0.85, 0.85, -0.85),
        radius: 0.3,
        color: 0xffffff
      }
    ]

    const bonds: Bond[] = [
      { atomIndex1: 0, atomIndex2: 1, type: 'single' },
      { atomIndex1: 0, atomIndex2: 2, type: 'single' },
      { atomIndex1: 0, atomIndex2: 3, type: 'single' },
      { atomIndex1: 0, atomIndex2: 4, type: 'single' }
    ]

    return new Molecule('methane', atoms, bonds)
  }

  static createBenzene(): Molecule {
    const atoms: Atom[] = []
    const bonds: Bond[] = []
    const ccBondLength = 1.39
    const chBondLength = 1.09
    const carbonRadius = 0.5
    const hydrogenRadius = 0.3

    for (let i = 0; i < 6; i++) {
      const angle = (i * 60) * Math.PI / 180
      const cX = Math.cos(angle) * ccBondLength
      const cY = Math.sin(angle) * ccBondLength

      atoms.push({
        element: 'C',
        position: new THREE.Vector3(cX, cY, 0),
        radius: carbonRadius,
        color: 0x404040
      })

      const hX = Math.cos(angle) * (ccBondLength + chBondLength)
      const hY = Math.sin(angle) * (ccBondLength + chBondLength)

      atoms.push({
        element: 'H',
        position: new THREE.Vector3(hX, hY, 0),
        radius: hydrogenRadius,
        color: 0xffffff
      })
    }

    for (let i = 0; i < 6; i++) {
      const cIndex = i * 2
      const nextCIndex = ((i + 1) % 6) * 2
      const hIndex = cIndex + 1

      bonds.push({
        atomIndex1: cIndex,
        atomIndex2: nextCIndex,
        type: i % 2 === 0 ? 'double' : 'single'
      })

      bonds.push({
        atomIndex1: cIndex,
        atomIndex2: hIndex,
        type: 'single'
      })
    }

    return new Molecule('benzene', atoms, bonds)
  }

  static create(type: MoleculeType): Molecule {
    switch (type) {
      case 'water':
        return Molecule.createWater()
      case 'methane':
        return Molecule.createMethane()
      case 'benzene':
        return Molecule.createBenzene()
      default:
        return Molecule.createWater()
    }
  }
}
