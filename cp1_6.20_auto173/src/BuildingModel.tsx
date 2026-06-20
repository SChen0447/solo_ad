import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { BuildingData } from './types'

interface BuildingModelProps {
  buildingData: BuildingData
  clippingY: number
}

const FLOOR_COLOR = '#D2B48C'
const WALL_COLOR = '#F5DEB3'
const FURNITURE_COLOR = '#8B4513'
const WALL_THICKNESS = 0.1
const OPAQUE = 1
const TRANSPARENT = 0.15
const ANIMATION_SPEED = 4

export function BuildingModel({ buildingData, clippingY }: BuildingModelProps) {
  const groupRef = useRef<THREE.Group>(null)
  const floorGroupsRef = useRef<THREE.Group[]>([])
  const targetOpacitiesRef = useRef<number[]>([])
  const currentOpacitiesRef = useRef<number[]>([])

  const floorMeshes = useMemo(() => {
    return buildingData.floors.map((floor, floorIdx) => {
      const floorGroup = new THREE.Group()
      floorGroup.name = `floor-${floorIdx}`

      const floorY = floor.y

      const floorGeometry = new THREE.BoxGeometry(
        buildingData.buildingWidth,
        0.15,
        buildingData.buildingDepth
      )
      const floorMaterial = new THREE.MeshStandardMaterial({
        color: FLOOR_COLOR,
        transparent: true,
        opacity: OPAQUE,
        roughness: 0.8,
        metalness: 0.1,
        side: THREE.DoubleSide,
      })
      const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial)
      floorMesh.position.y = floorY + 0.075
      floorMesh.receiveShadow = true
      floorMesh.castShadow = true
      floorMesh.name = 'floor-slab'
      floorGroup.add(floorMesh)

      floor.rooms.forEach((room) => {
        const roomCenterX = room.x + room.width / 2
        const roomCenterZ = room.z + room.depth / 2

        const wallMaterial = new THREE.MeshStandardMaterial({
          color: WALL_COLOR,
          transparent: true,
          opacity: OPAQUE,
          roughness: 0.9,
          metalness: 0.05,
          side: THREE.DoubleSide,
        })

        const backWallGeo = new THREE.BoxGeometry(room.width, floor.height, WALL_THICKNESS)
        const backWall = new THREE.Mesh(backWallGeo, wallMaterial)
        backWall.position.set(roomCenterX, floorY + floor.height / 2, room.z)
        backWall.castShadow = true
        backWall.receiveShadow = true
        backWall.name = 'wall'
        floorGroup.add(backWall)

        const frontWallGeo = new THREE.BoxGeometry(room.width, floor.height, WALL_THICKNESS)
        const frontWall = new THREE.Mesh(frontWallGeo, wallMaterial)
        frontWall.position.set(roomCenterX, floorY + floor.height / 2, room.z + room.depth)
        frontWall.castShadow = true
        frontWall.receiveShadow = true
        frontWall.name = 'wall'
        floorGroup.add(frontWall)

        const leftWallGeo = new THREE.BoxGeometry(WALL_THICKNESS, floor.height, room.depth)
        const leftWall = new THREE.Mesh(leftWallGeo, wallMaterial)
        leftWall.position.set(room.x, floorY + floor.height / 2, roomCenterZ)
        leftWall.castShadow = true
        leftWall.receiveShadow = true
        leftWall.name = 'wall'
        floorGroup.add(leftWall)

        const rightWallGeo = new THREE.BoxGeometry(WALL_THICKNESS, floor.height, room.depth)
        const rightWall = new THREE.Mesh(rightWallGeo, wallMaterial)
        rightWall.position.set(room.x + room.width, floorY + floor.height / 2, roomCenterZ)
        rightWall.castShadow = true
        rightWall.receiveShadow = true
        rightWall.name = 'wall'
        floorGroup.add(rightWall)

        const furnitureType = Math.random() > 0.5 ? 'box' : 'cylinder'
        const furnitureSize = 0.6
        const furnitureMaterial = new THREE.MeshStandardMaterial({
          color: FURNITURE_COLOR,
          transparent: true,
          opacity: OPAQUE,
          roughness: 0.7,
          metalness: 0.2,
        })

        let furnitureGeo: THREE.BufferGeometry
        if (furnitureType === 'box') {
          furnitureGeo = new THREE.BoxGeometry(furnitureSize, furnitureSize, furnitureSize)
        } else {
          furnitureGeo = new THREE.CylinderGeometry(
            furnitureSize / 2,
            furnitureSize / 2,
            furnitureSize,
            16
          )
        }

        const furnitureMesh = new THREE.Mesh(furnitureGeo, furnitureMaterial)
        const furnitureX = room.x + room.width * randomRange(0.25, 0.75)
        const furnitureZ = room.z + room.depth * randomRange(0.25, 0.75)
        furnitureMesh.position.set(
          furnitureX,
          floorY + 0.15 + furnitureSize / 2,
          furnitureZ
        )
        furnitureMesh.castShadow = true
        furnitureMesh.receiveShadow = true
        furnitureMesh.name = 'furniture'
        floorGroup.add(furnitureMesh)
      })

      return floorGroup
    })
  }, [buildingData])

  useEffect(() => {
    targetOpacitiesRef.current = buildingData.floors.map(() => OPAQUE)
    currentOpacitiesRef.current = buildingData.floors.map(() => OPAQUE)
    floorGroupsRef.current = []
  }, [buildingData.floors.length])

  useFrame((_, delta) => {
    if (!groupRef.current) return

    buildingData.floors.forEach((floor, idx) => {
      const isAbove = floor.y >= clippingY

      targetOpacitiesRef.current[idx] = isAbove ? TRANSPARENT : OPAQUE

      const current = currentOpacitiesRef.current[idx]
      const target = targetOpacitiesRef.current[idx]
      const diff = target - current

      if (Math.abs(diff) > 0.001) {
        const step = Math.sign(diff) * Math.min(Math.abs(diff), ANIMATION_SPEED * delta)
        currentOpacitiesRef.current[idx] = current + step

        const floorGroup = floorGroupsRef.current[idx]
        if (floorGroup) {
          floorGroup.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              const mat = child.material as THREE.MeshStandardMaterial
              if (Array.isArray(mat)) {
                mat.forEach((m) => {
                  m.opacity = currentOpacitiesRef.current[idx]
                  m.transparent = currentOpacitiesRef.current[idx] < 1
                })
              } else {
                mat.opacity = currentOpacitiesRef.current[idx]
                mat.transparent = currentOpacitiesRef.current[idx] < 1
              }
              const shouldCastShadow = currentOpacitiesRef.current[idx] >= 0.5
              child.castShadow = shouldCastShadow
            }
          })
        }
      }
    })
  })

  return (
    <group ref={groupRef}>
      {floorMeshes.map((floorGroup, idx) => (
        <primitive
          key={idx}
          object={floorGroup}
          ref={(el: THREE.Group | null) => {
            if (el) floorGroupsRef.current[idx] = el
          }}
        />
      ))}
    </group>
  )
}

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}
