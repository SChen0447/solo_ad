import type { Plant } from '@/types'

interface Props {
  plant: Plant
  onClick: (plant: Plant) => void
  style?: React.CSSProperties
}

const categoryLabels: Record<Plant['category'], string> = {
  leaf: '叶菜类',
  fruit: '果实类',
  root: '根茎类',
}

export default function PlantCard({ plant, onClick, style }: Props) {
  return (
    <div
      className={`plant-card ${plant.category}`}
      onClick={() => onClick(plant)}
      style={style}
    >
      <img
        className="plant-card-image"
        src={plant.imageUrl}
        alt={plant.name}
        onError={(e) => {
          ;(e.target as HTMLImageElement).src =
            'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjRTVFN0VCIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5Q0EzQUYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7wn5SlPC90ZXh0Pjwvc3ZnPg=='
        }}
      />
      <div className="plant-card-body">
        <div className="plant-card-name">{plant.name}</div>
        <div className="plant-card-info">
          成熟周期：{plant.maturityDays}天
        </div>
        <div className="plant-card-info">
          浇水：每{plant.waterFrequency}天
        </div>
        <span className={`plant-card-tag ${plant.category}`}>
          {categoryLabels[plant.category]}
        </span>
      </div>
    </div>
  )
}
