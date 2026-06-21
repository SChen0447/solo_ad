import type { Plant } from '../types'

interface PlantCardProps {
  plant: Plant
  onClick: () => void
  isNew?: boolean
  isFiltered?: boolean
}

function formatRelativeTime(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  return `${diffDays}天前`
}

function needsWater(dateString: string): boolean {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays > 3
}

export default function PlantCard({
  plant,
  onClick,
  isNew = false,
  isFiltered = false
}: PlantCardProps) {
  const needsWatering = needsWater(plant.lastWatered)

  return (
    <div
      className={`plant-card ${isNew ? 'fade-in' : ''} ${isFiltered ? 'fade-out' : ''}`}
      onClick={onClick}
    >
      <div className="plant-card-image">
        <img src={plant.imageUrl} alt={plant.name} />
      </div>
      <div className="plant-card-info">
        <div className="plant-card-name">{plant.name}</div>
        <div className="plant-card-water">
          上次浇水：{formatRelativeTime(plant.lastWatered)}
        </div>
      </div>
      <div className={`water-drop-icon ${needsWatering ? 'red' : 'blue'}`}>
        💧
      </div>
    </div>
  )
}
