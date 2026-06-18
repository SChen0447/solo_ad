import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { TransformControls } from '@react-three/drei'
import * as THREE from 'three'
import { useStore, type Atom, type Bond } from '../../store/useStore'
import { loadMolecule } from '../data/MoleculeLoader'

const ATOM_COLORS: Record<string, string> = {
  C: '#808080',
  O: '#ff0000',
  N: '#0000ff',
  S: '#ffff00',
  H: '#ffffff',
  P: '#ffa500'
}

const ATOM_RADII: Record<string, number> = {
  C: 0.4,
  O: 0.35,
  N: 0.38,
  S: 0.45,
  H: 0.25,
  P: 0.42
}

function getAtomColor(type: string): string {
  return ATOM_COLORS[type] || '#808080'
}

function getAtomRadius(type: string): number {
  return ATOM_RADII[type] || 0.35
}

interface BondMeshProps {
  bond: Bond
  atom1: Atom | undefined
  atom2: Atom | undefined
  opacity: number
}

function BondMesh({ bond, atom1, atom2, opacity }: BondMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const bondRadius = 0.1

  useFrame(() => {
    if (!meshRef.current || !atom1 || !atom2) return

    const start = new THREE.Vector3(atom1.x, atom1.y, atom1.z)
    const end = new THREE.Vector3(atom2.x, atom2.y, atom2.z)
    const direction = new THREE.Vector3().subVectors(end, start)
    const length = direction.length()

    if (length === 0) return

    const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)

    meshRef.current.position.copy(midpoint)
    meshRef.current.scale.y = length

    const quaternion = new THREE.Quaternion()
    quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize()
    )
    meshRef.current.quaternion.copy(quaternion)
  })

  if (!atom1 || !atom2) return null

  return (
    <mesh ref={meshRef}>
      <cylinderGeometry args={[bondRadius, bondRadius, 1, 8]} />
      <meshPhongMaterial color="#888888" transparent opacity={opacity} shininess={50} />
    </mesh>
  )
}

interface SelectionGlowProps {
  position: [number, number, number]
  radius: number
  opacity: number
}

function SelectionGlow({ position, radius, opacity }: SelectionGlowProps) {
  const glowRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (glowRef.current) {
      const t = clock.getElapsedTime()
      const pulse = 1 + Math.sin(t * 3) * 0.15
      glowRef.current.scale.setScalar(pulse)
    }
  })

  return (
    <mesh ref={glowRef} position={position}>
      <torusGeometry args={[radius * 1.3, 0.05, 8, 32]} />
      <meshBasicMaterial
        color="#00d4ff"
        transparent
        opacity={opacity * 0.9}
      />
    </mesh>
  )
}

function SurfaceMesh({ opacity }: { opacity: number }) {
  const atoms = useStore(state => state.atoms)

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions: number[] = []
    const POINTS_PER_ATOM = 50

    atoms.forEach(atom => {
      const radius = getAtomRadius(atom.type) + 1.4
      for (let i = 0; i < POINTS_PER_ATOM; i++) {
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)

        const x = atom.x + radius * Math.sin(phi) * Math.cos(theta)
        const y = atom.y + radius * Math.sin(phi) * Math.sin(theta)
        const z = atom.z + radius * Math.cos(phi)

        positions.push(x, y, z)
      }
    })

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geo
  }, [atoms])

  return (
    <points geometry={geometry}>
      <pointsMaterial
        color="#00ff88"
        transparent
        opacity={opacity * 0.4}
        size={0.05}
        sizeAttenuation
      />
    </points>
  )
}

interface AtomSphereProps {
  atom: Atom
  isSelected: boolean
  opacity: number
  onClick: (e: any) => void
  onPointerOver: () => void
  onPointerOut: () => void
}

function AtomSphere({ atom, isSelected, opacity, onClick, onPointerOver, onPointerOut }: AtomSphereProps) {
  const color = getAtomColor(atom.type)
  const radius = getAtomRadius(atom.type)

  return (
    <mesh
      position={[atom.x, atom.y, atom.z]}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <sphereGeometry args={[radius, 32, 32]} />
      <meshPhongMaterial
        color={color}
        transparent
        opacity={opacity}
        shininess={100}
        emissive={isSelected ? '#00d4ff' : '#000000'}
        emissiveIntensity={isSelected ? 0.5 : 0}
      />
    </mesh>
  )
}

export function MoleculeRenderer() {
  const atoms = useStore(state => state.atoms)
  const bonds = useStore(state => state.bonds)
  const selectedAtomIds = useStore(state => state.selectedAtomIds)
  const editMode = useStore(state => state.editMode)
  const selectAtom = useStore(state => state.selectAtom)
  const updateAtomPosition = useStore(state => state.updateAtomPosition)
  const transitionProgress = useStore(state => state.transitionProgress)
  const transitionPhase = useStore(state => state.transitionPhase)
  const showSurface = useStore(state => state.analysis.showSurface)
  const setTransitionProgress = useStore(state => state.setTransitionProgress)
  const setTransitionPhase = useStore(state => state.setTransitionPhase)
  const currentMolecule = useStore(state => state.currentMolecule)
  const setAtoms = useStore(state => state.setAtoms)
  const setBonds = useStore(state => state.setBonds)

  const transformRef = useRef<any>(null)
  const prevMoleculeRef = useRef<string>(currentMolecule)
  const [isDragging, setIsDragging] = useState(false)

  const atomMap = useMemo(() => {
    const map = new Map<number, Atom>()
    atoms.forEach(a => map.set(a.id, a))
    return map
  }, [atoms])

  const firstSelectedAtom = useMemo(() => {
    if (selectedAtomIds.length > 0) {
      return atomMap.get(selectedAtomIds[0]) || null
    }
    return null
  }, [selectedAtomIds, atomMap])

  useEffect(() => {
    if (prevMoleculeRef.current !== currentMolecule) {
      setTransitionPhase('fade-out')
      prevMoleculeRef.current = currentMolecule
    }
  }, [currentMolecule, setTransitionPhase])

  useFrame((_, delta) => {
    if (transitionPhase === 'fade-out') {
      const newProgress = Math.max(0, transitionProgress - delta * 2)
      setTransitionProgress(newProgress)
      if (newProgress <= 0) {
        setTransitionPhase('fade-in')
        setAtoms([])
        setBonds([])
      }
    } else if (transitionPhase === 'fade-in') {
      const newProgress = Math.min(1, transitionProgress + delta * 2)
      setTransitionProgress(newProgress)
      if (newProgress >= 1) {
        setTransitionPhase('idle')
      }
    }
  })

  useEffect(() => {
    if (transitionPhase === 'fade-in' && atoms.length === 0) {
      const { atoms: newAtoms, bonds: newBonds } = loadMolecule(currentMolecule)
      setAtoms(newAtoms)
      setBonds(newBonds)
    }
  }, [transitionPhase, currentMolecule, atoms.length, setAtoms, setBonds])

  const opacity = transitionPhase === 'idle' ? 1 : transitionProgress

  const handleAtomClick = (atomId: number) => (e: any) => {
    e.stopPropagation()
    if (editMode) {
      selectAtom(atomId, true)
    }
  }

  const handlePointerOver = () => {
    if (editMode) {
      document.body.style.cursor = 'pointer'
    }
  }

  const handlePointerOut = () => {
    document.body.style.cursor = 'default'
  }

  const handleTransformChange = () => {
    if (transformRef.current && firstSelectedAtom && isDragging) {
      const obj = transformRef.current.object
      if (obj) {
        updateAtomPosition(firstSelectedAtom.id, obj.position.x, obj.position.y, obj.position.z)
      }
    }
  }

  const handleTransformMouseDown = () => {
    setIsDragging(true)
  }

  const handleTransformMouseUp = () => {
    setIsDragging(false)
  }

  const nonSelectedAtoms = atoms.filter(a => !selectedAtomIds.includes(a.id))
  const secondSelectedAtom = selectedAtomIds.length > 1 ? atomMap.get(selectedAtomIds[1]) : null

  return (
    <group>
      {bonds.map(bond => (
        <BondMesh
          key={`bond-${bond.id}`}
          bond={bond}
          atom1={atomMap.get(bond.atom1)}
          atom2={atomMap.get(bond.atom2)}
          opacity={opacity}
        />
      ))}

      {nonSelectedAtoms.map(atom => (
        <group key={`atom-nsel-${atom.id}`}>
          <AtomSphere
            atom={atom}
            isSelected={false}
            opacity={opacity}
            onClick={handleAtomClick(atom.id)}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          />
        </group>
      ))}

      {selectedAtomIds.map((atomId, idx) => {
        const atom = atomMap.get(atomId)
        if (!atom) return null
        const isFirst = idx === 0 && editMode

        if (isFirst && firstSelectedAtom) {
          return (
            <group key={`atom-sel-${atom.id}`}>
              <TransformControls
                ref={transformRef}
                mode="translate"
                onMouseDown={handleTransformMouseDown}
                onMouseUp={handleTransformMouseUp}
                onObjectChange={handleTransformChange}
              >
                <mesh
                  position={[firstSelectedAtom.x, firstSelectedAtom.y, firstSelectedAtom.z]}
                  onClick={(e) => { e.stopPropagation() }}
                  onPointerOver={handlePointerOver}
                  onPointerOut={handlePointerOut}
                >
                  <sphereGeometry args={[getAtomRadius(firstSelectedAtom.type), 32, 32]} />
                  <meshPhongMaterial
                    color={getAtomColor(firstSelectedAtom.type)}
                    transparent
                    opacity={opacity}
                    shininess={100}
                    emissive="#00d4ff"
                    emissiveIntensity={0.5}
                  />
                </mesh>
              </TransformControls>
              <SelectionGlow
                position={[atom.x, atom.y, atom.z]}
                radius={getAtomRadius(atom.type)}
                opacity={opacity}
              />
            </group>
          )
        }

        return (
          <group key={`atom-sel-${atom.id}`}>
            <AtomSphere
              atom={atom}
              isSelected={true}
              opacity={opacity}
              onClick={handleAtomClick(atom.id)}
              onPointerOver={handlePointerOver}
              onPointerOut={handlePointerOut}
            />
            <SelectionGlow
              position={[atom.x, atom.y, atom.z]}
              radius={getAtomRadius(atom.type)}
              opacity={opacity}
            />
          </group>
        )
      })}

      {showSurface && <SurfaceMesh opacity={opacity} />}
    </group>
  )
}
