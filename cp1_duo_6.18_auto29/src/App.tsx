import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { SceneManager } from './modules/scene/SceneManager'
import { MoleculeRenderer } from './modules/scene/MoleculeRenderer'
import { UIController } from './modules/ui/UIController'
import { useStore } from './store/useStore'
import { loadMolecule } from './modules/data/MoleculeLoader'
import { calculateSASA } from './modules/analysis/SurfaceAnalyzer'
import './App.css'

export function App() {
  const setAtoms = useStore(state => state.setAtoms)
  const setBonds = useStore(state => state.setBonds)
  const setSasa = useStore(state => state.setSasa)

  useEffect(() => {
    const { atoms, bonds } = loadMolecule('peptide')
    setAtoms(atoms)
    setBonds(bonds)
    const sasa = calculateSASA(atoms)
    setSasa(sasa)
  }, [setAtoms, setBonds, setSasa])

  return (
    <div className="app-container">
      <Canvas
        camera={{ position: [6, 4, 8], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={['#1a1a2e']} />
        <fog attach="fog" args={['#1a1a2e', 10, 30]} />
        <SceneManager />
        <MoleculeRenderer />
      </Canvas>
      <UIController />
    </div>
  )
}
