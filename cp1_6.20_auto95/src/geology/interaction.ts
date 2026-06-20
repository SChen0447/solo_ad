import * as THREE from 'three'
import type { SceneObjects } from './model'
import type { Layer, Drill } from '../data/types'

export type DrillClickCallback = (drill: Drill, event: MouseEvent) => void
export type LayerClickCallback = (layer: Layer, event: MouseEvent) => void

interface InteractionHandlers {
  onDrillClick?: DrillClickCallback
  onLayerClick?: LayerClickCallback
}

let selectedLayer: THREE.Mesh | null = null
let selectedDrill: THREE.Group | null = null
let animationFrameId: number | null = null
let targetCameraPosition: THREE.Vector3 | null = null
let targetLookAt: THREE.Vector3 | null = null

function highlightLayerInternal(layerMesh: THREE.Mesh): void {
  if (selectedLayer && selectedLayer !== layerMesh) {
    const material = selectedLayer.material as THREE.MeshStandardMaterial
    material.emissive?.setHex(0x000000)
    material.emissiveIntensity = 0
  }

  const material = layerMesh.material as THREE.MeshStandardMaterial
  material.emissive?.setHex(0x4488ff)
  material.emissiveIntensity = 0.3
  selectedLayer = layerMesh
}

function clearLayerHighlightInternal(): void {
  if (selectedLayer) {
    const material = selectedLayer.material as THREE.MeshStandardMaterial
    material.emissive?.setHex(0x000000)
    material.emissiveIntensity = 0
    selectedLayer = null
  }
}

function highlightDrillInternal(drillGroup: THREE.Group): void {
  if (selectedDrill && selectedDrill !== drillGroup) {
    selectedDrill.traverse(child => {
      if (child instanceof THREE.Mesh && child.userData.isGlow) {
        const glowMat = child.material as THREE.MeshBasicMaterial
        glowMat.opacity = 0
      }
    })
  }

  drillGroup.traverse(child => {
    if (child instanceof THREE.Mesh && child.userData.isGlow) {
      const glowMat = child.material as THREE.MeshBasicMaterial
      glowMat.opacity = 0.4
    }
  })
  selectedDrill = drillGroup
}

function clearDrillHighlightInternal(): void {
  if (selectedDrill) {
    selectedDrill.traverse(child => {
      if (child instanceof THREE.Mesh && child.userData.isGlow) {
        const glowMat = child.material as THREE.MeshBasicMaterial
        glowMat.opacity = 0
      }
    })
    selectedDrill = null
  }
}

export function setupInteraction(
  sceneObjects: SceneObjects,
  handlers: InteractionHandlers
): void {
  const { scene, camera, renderer, layerMeshes, drillMeshes, raycaster, mouse } = sceneObjects

  const tooltip = document.getElementById('info-tooltip') as HTMLElement

  function updateMouse(event: MouseEvent): void {
    const rect = renderer.domElement.getBoundingClientRect()
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  function getAllClickableObjects(): THREE.Object3D[] {
    const objects: THREE.Object3D[] = []
    layerMeshes.forEach(mesh => objects.push(mesh))
    drillMeshes.forEach(group => {
      group.traverse(child => {
        if (child instanceof THREE.Mesh && !child.userData.isGlow) {
          objects.push(child)
        }
      })
    })
    return objects
  }

  const highlightLayer = highlightLayerInternal
  const clearLayerHighlight = clearLayerHighlightInternal
  const highlightDrill = highlightDrillInternal
  const clearDrillHighlight = clearDrillHighlightInternal

  renderer.domElement.addEventListener('mousemove', (event) => {
    updateMouse(event)

    const objects = getAllClickableObjects()
    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects(objects, false)

    if (tooltip) {
      if (intersects.length > 0) {
        const hit = intersects[0]
        let objectData: { type: string; name: string; thickness?: number } | null = null

        if (hit.object.userData.parentGroup) {
          const group = hit.object.userData.parentGroup as THREE.Group
          const drill = group.userData.drill as Drill
          objectData = {
            type: 'drill',
            name: drill.wellNo,
            thickness: drill.depth
          }
        } else if (hit.object.userData.type === 'layer') {
          const layer = hit.object.userData.layer as Layer
          objectData = {
            type: 'layer',
            name: layer.name,
            thickness: layer.thickness
          }
        }

        if (objectData) {
          tooltip.style.display = 'block'
          tooltip.style.left = `${event.clientX + 15}px`
          tooltip.style.top = `${event.clientY + 15}px`
          if (objectData.type === 'drill') {
            tooltip.textContent = `${objectData.name} | 深度: ${objectData.thickness?.toFixed(1)}m`
          } else {
            tooltip.textContent = `${objectData.name} | 平均厚度: ${objectData.thickness?.toFixed(2)}m`
          }
        }
      } else {
        tooltip.style.display = 'none'
      }
    }
  })

  renderer.domElement.addEventListener('click', (event) => {
    updateMouse(event)

    const objects = getAllClickableObjects()
    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects(objects, false)

    if (intersects.length > 0) {
      const hit = intersects[0]

      if (hit.object.userData.parentGroup) {
        const group = hit.object.userData.parentGroup as THREE.Group
        const drill = group.userData.drill as Drill
        highlightDrill(group)
        if (handlers.onDrillClick) {
          handlers.onDrillClick(drill, event)
        }
      } else if (hit.object.userData.type === 'layer') {
        const layerMesh = hit.object as THREE.Mesh
        const layer = layerMesh.userData.layer as Layer
        highlightLayer(layerMesh)
        if (handlers.onLayerClick) {
          handlers.onLayerClick(layer, event)
        }
      }
    } else {
      clearLayerHighlight()
    }
  })
}

export function focusOnDrill(
  sceneObjects: SceneObjects,
  drill: Drill,
  duration: number = 1000
): void {
  const { camera, controls } = sceneObjects

  const offset = new THREE.Vector3(15, 12, 15)
  targetCameraPosition = new THREE.Vector3(
    drill.x + offset.x,
    drill.depth / 2 + offset.y,
    drill.z + offset.z
  )
  targetLookAt = new THREE.Vector3(drill.x, -drill.depth / 2, drill.z)

  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }

  const startPosition = camera.position.clone()
  const startLookAt = controls.target.clone()
  const startTime = performance.now()

  function animateCamera(currentTime: number): void {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)

    const easeProgress = 1 - Math.pow(1 - progress, 3)

    if (targetCameraPosition && targetLookAt) {
      camera.position.lerpVectors(startPosition, targetCameraPosition, easeProgress)
      controls.target.lerpVectors(startLookAt, targetLookAt, easeProgress)
      controls.update()
    }

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(animateCamera)
    } else {
      animationFrameId = null
    }
  }

  animationFrameId = requestAnimationFrame(animateCamera)
}

export function clearHighlights(): void {
  if (selectedLayer) {
    const material = selectedLayer.material as THREE.MeshStandardMaterial
    material.emissive?.setHex(0x000000)
    material.emissiveIntensity = 0
    selectedLayer = null
  }
  if (selectedDrill) {
    selectedDrill.traverse(child => {
      if (child instanceof THREE.Mesh && child.userData.isGlow) {
        const glowMat = child.material as THREE.MeshBasicMaterial
        glowMat.opacity = 0
      }
    })
    selectedDrill = null
  }
}

export function highlightDrillById(
  sceneObjects: SceneObjects,
  drillId: number
): void {
  const { drillMeshes } = sceneObjects
  clearDrillHighlightInternal()

  const drillGroup = drillMeshes.find(
    group => (group.userData.drill as Drill).id === drillId
  )

  if (drillGroup) {
    highlightDrillInternal(drillGroup)
  }
}

export function getSelectedDrill(): Drill | null {
  if (selectedDrill) {
    return selectedDrill.userData.drill as Drill
  }
  return null
}

export function getSelectedLayer(): Layer | null {
  if (selectedLayer) {
    return selectedLayer.userData.layer as Layer
  }
  return null
}
