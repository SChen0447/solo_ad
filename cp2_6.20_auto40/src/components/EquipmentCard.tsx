import React from 'react'
import type { Equipment } from '../types'
import { EquipmentCategoryLabels } from '../types'

interface EquipmentCardProps {
  equipment: Equipment
  onBorrow?: (eq: Equipment) => void
}

const EquipmentCard: React.FC<EquipmentCardProps> = ({ equipment, onBorrow }) => {
  const isAvailable = equipment.status === 'available'

  return (
    <div className={`equipment-card ${!isAvailable ? 'card-borrowed' : ''}`}>
      <div className="eq-card-cover">
        <img src={equipment.imageUrl} alt={equipment.name} />
        <div className={`eq-status-tag ${isAvailable ? 'tag-available' : 'tag-borrowed'}`}>
          {isAvailable ? '可预约' : '已借出'}
        </div>
        <div className="eq-category-tag">
          {EquipmentCategoryLabels[equipment.category]}
        </div>
      </div>
      <div className="eq-card-body">
        <h4 className="eq-card-title">{equipment.name}</h4>
        <p className="eq-card-desc">{equipment.description}</p>
        <div className="eq-card-owner">
          <span className="owner-label">提供者:</span>
          <span className="owner-name">{equipment.ownerName}</span>
        </div>
        {equipment.returnDate && (
          <div className="eq-card-return">
            预计归还: {equipment.returnDate}
          </div>
        )}
        <button
          className={`borrow-btn ${isAvailable ? 'btn-primary' : 'btn-disabled'}`}
          onClick={() => isAvailable && onBorrow && onBorrow(equipment)}
          disabled={!isAvailable}
        >
          {isAvailable ? '立即预约' : '暂不可用'}
        </button>
      </div>
    </div>
  )
}

export default EquipmentCard
