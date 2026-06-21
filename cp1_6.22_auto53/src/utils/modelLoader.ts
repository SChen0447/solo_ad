import * as THREE from 'three'
import { fragmentData, FragmentData } from '../data/fragments'

export interface PotteryModels {
  fragments: THREE.Group
  restored: THREE.Group
  complete: THREE.Group
}

function createFragmentMesh(fragment: FragmentData): THREE.Mesh {
  let geometry: THREE.BufferGeometry

  switch (fragment.shape) {
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(
        fragment.scale.x,
        fragment.scale.x * 0.9,
        fragment.scale.y,
        16,
        1
      )
      break
    case 'sphere':
      geometry = new THREE.SphereGeometry(fragment.scale.x, 16, 16)
      break
    case 'box':
      geometry = new THREE.BoxGeometry(
        fragment.scale.x,
        fragment.scale.y,
        fragment.scale.z
      )
      break
    case 'cone':
      geometry = new THREE.ConeGeometry(
        fragment.scale.x,
        fragment.scale.y,
        16
      )
      break
    default:
      geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5)
  }

  const material = new THREE.MeshStandardMaterial({
    color: fragment.color,
    roughness: 0.7,
    metalness: 0.1,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(
    fragment.modelPosition.x,
    fragment.modelPosition.y,
    fragment.modelPosition.z
  )
  mesh.rotation.set(
    fragment.modelRotation.x,
    fragment.modelRotation.y,
    fragment.modelRotation.z
  )
  mesh.userData = { fragmentId: fragment.id, isFragment: true }
  mesh.castShadow = true
  mesh.receiveShadow = true

  return mesh
}

function createFragmentsGroup(): THREE.Group {
  const group = new THREE.Group()
  group.name = 'fragments-stage'

  fragmentData.forEach((fragment) => {
    const mesh = createFragmentMesh(fragment)
    group.add(mesh)
  })

  return group
}

function createRestoredGroup(): THREE.Group {
  const group = new THREE.Group()
  group.name = 'restored-stage'

  fragmentData.forEach((fragment) => {
    const mesh = createFragmentMesh(fragment)
    ;(mesh.material as THREE.MeshStandardMaterial).color.set('#a67c52')
    group.add(mesh)
  })

  const fillerMaterial = new THREE.MeshStandardMaterial({
    color: '#64748b',
    roughness: 0.5,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
  })

  const mainBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.7, 2, 32, 1),
    fillerMaterial
  )
  mainBody.position.y = 0.3
  mainBody.userData = { isFiller: true }
  group.add(mainBody)

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.7, 0.5, 32, 1),
    fillerMaterial
  )
  neck.position.y = 1.55
  neck.userData = { isFiller: true }
  group.add(neck)

  const bottom = new THREE.Mesh(
    new THREE.CircleGeometry(0.7, 32),
    fillerMaterial
  )
  bottom.rotation.x = -Math.PI / 2
  bottom.position.y = -0.7
  bottom.userData = { isFiller: true }
  group.add(bottom)

  return group
}

function createCompleteGroup(): THREE.Group {
  const group = new THREE.Group()
  group.name = 'complete-stage'

  const potteryMaterial = new THREE.MeshStandardMaterial({
    color: '#b8860b',
    roughness: 0.4,
    metalness: 0.1,
  })

  const bodyGeometry = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.7, -0.7),
      new THREE.Vector2(0.9, 0),
      new THREE.Vector2(0.85, 0.5),
      new THREE.Vector2(0.7, 1),
      new THREE.Vector2(0.5, 1.3),
      new THREE.Vector2(0.45, 1.6),
      new THREE.Vector2(0.55, 1.8),
      new THREE.Vector2(0.6, 2),
    ],
    64
  )

  const body = new THREE.Mesh(bodyGeometry, potteryMaterial)
  body.castShadow = true
  body.receiveShadow = true
  group.add(body)

  const rimGeometry = new THREE.TorusGeometry(0.575, 0.08, 16, 64)
  const rim = new THREE.Mesh(rimGeometry, potteryMaterial)
  rim.position.y = 2
  rim.rotation.x = Math.PI / 2
  rim.castShadow = true
  group.add(rim)

  const bottomGeometry = new THREE.CircleGeometry(0.7, 64)
  const bottomMaterial = new THREE.MeshStandardMaterial({
    color: '#8b5a2b',
    roughness: 0.6,
    side: THREE.DoubleSide,
  })
  const bottom = new THREE.Mesh(bottomGeometry, bottomMaterial)
  bottom.rotation.x = -Math.PI / 2
  bottom.position.y = -0.7
  bottom.receiveShadow = true
  group.add(bottom)

  return group
}

export function loadModels(): PotteryModels {
  return {
    fragments: createFragmentsGroup(),
    restored: createRestoredGroup(),
    complete: createCompleteGroup(),
  }
}

export function getFragmentInfo(fragmentId: string): FragmentData | undefined {
  return fragmentData.find((f) => f.id === fragmentId)
}
