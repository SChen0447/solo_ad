import React, { useEffect } from 'react'
import { SceneRenderer } from './module2/scene-renderer'
import { UIPanel } from './module2/ui-panel'
import { useSimulationStore } from './module2/store'
import { createStar } from './module1/star-manager'

const App: React.FC = () => {
  const addStar = useSimulationStore((state) => state.addStar)
  const stars = useSimulationStore((state) => state.stars)

  useEffect(() => {
    if (stars.length === 0) {
      addStar(
        createStar({
          mass: 10,
          position: { x: 0, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          color: '#ffe66d',
          name: 'Star-01',
        })
      )
      addStar(
        createStar({
          mass: 1,
          position: { x: 20, y: 0, z: 0 },
          velocity: { x: 0, y: 2, z: 0 },
          color: '#4ecdc4',
          name: 'Star-02',
        })
      )
      addStar(
        createStar({
          mass: 0.5,
          position: { x: -25, y: 10, z: 5 },
          velocity: { x: 0.5, y: -1.5, z: 0.3 },
          color: '#ff6b6b',
          name: 'Star-03',
        })
      )
    }
  }, [])

  return (
    <div className="app-container">
      <div className="scene-container">
        <SceneRenderer />
      </div>
      <UIPanel />
    </div>
  )
}

export default App
