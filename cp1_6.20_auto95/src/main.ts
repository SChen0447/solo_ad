import {
  createScene,
  createGeologicalLayers,
  createDrillMarkers,
  startAnimation
} from './geology/model'
import { setupInteraction } from './geology/interaction'
import { getAllData } from './data/api'
import { initPanels, openDrillModal } from './ui/panel'
import type { Drill, Layer } from './data/types'

let frameCount = 0
let lastFpsUpdate = performance.now()
let currentFps = 0

function updateFps(): void {
  frameCount++
  const now = performance.now()
  if (now - lastFpsUpdate >= 1000) {
    currentFps = Math.round(frameCount * 1000 / (now - lastFpsUpdate))
    frameCount = 0
    lastFpsUpdate = now
    console.debug(`FPS: ${currentFps}`)
  }
}

async function main(): Promise<void> {
  try {
    const container = document.getElementById('scene-container')
    if (!container) {
      throw new Error('Scene container not found')
    }

    const data = await getAllData()
    console.log('Loaded data:', data)

    const sceneObjects = createScene(container)
    sceneObjects.layerMeshes = createGeologicalLayers(sceneObjects.scene, data.layers)
    sceneObjects.drillMeshes = createDrillMarkers(
      sceneObjects.scene,
      data.drills,
      sceneObjects.labelContainer
    )

    setupInteraction(sceneObjects, {
      onDrillClick: (drill: Drill, event: MouseEvent) => {
        console.log('Drill clicked:', drill.wellNo)
        const startTime = performance.now()
        openDrillModal(drill)
        const elapsed = performance.now() - startTime
        console.debug(`Modal opened in ${elapsed.toFixed(2)}ms`)
      },
      onLayerClick: (layer: Layer, event: MouseEvent) => {
        console.log('Layer clicked:', layer.name, 'Thickness:', layer.thickness.toFixed(2), 'm')
      }
    })

    initPanels({
      sceneObjects,
      layers: data.layers,
      drills: data.drills
    })

    startAnimation(sceneObjects, updateFps)

    console.log('Geology 3D Viewer initialized successfully')
    console.log(`Layers: ${data.layers.length}, Drills: ${data.drills.length}`)

  } catch (error) {
    console.error('Failed to initialize application:', error)
    const container = document.getElementById('scene-container')
    if (container) {
      container.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100%;
          color: #e74c3c;
          font-family: 'Segoe UI', sans-serif;
        ">
          <h2 style="margin-bottom: 16px;">应用初始化失败</h2>
          <p style="opacity: 0.8; max-width: 400px; text-align: center;">
            请确保后端服务已启动: <br>
            <code style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px;">
              cd server && python app.py
            </code>
          </p>
          <p style="margin-top: 16px; font-size: 14px; opacity: 0.7;">
            错误详情: ${error instanceof Error ? error.message : String(error)}
          </p>
        </div>
      `
    }
  }
}

document.addEventListener('DOMContentLoaded', main)
