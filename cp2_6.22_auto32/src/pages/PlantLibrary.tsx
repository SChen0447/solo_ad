import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import PlantCard from '@/components/PlantCard'
import AddPlantModal from '@/components/AddPlantModal'
import PlantDetail from '@/components/PlantDetail'
import type { Plant } from '@/types'

export default function PlantLibrary() {
  const { plants } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null)

  if (selectedPlant) {
    return <PlantDetail plant={selectedPlant} onBack={() => setSelectedPlant(null)} />
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">植物库</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + 添加植物
        </button>
      </div>

      {plants.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🌱</div>
          <div className="empty-state-text">还没有添加任何植物，点击右上角开始添加吧</div>
        </div>
      ) : (
        <div className="plant-grid">
          {plants.map((plant, idx) => (
            <PlantCard
              key={plant.id}
              plant={plant}
              onClick={setSelectedPlant}
              style={{ animationDelay: `${idx * 0.05}s` }}
            />
          ))}
        </div>
      )}

      <AddPlantModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  )
}
