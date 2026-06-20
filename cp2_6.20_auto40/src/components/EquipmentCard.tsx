/* ============================================
 * 装备卡片组件
 * 调用关系：被 EquipmentPage 调用
 * 数据流向：父组件传入 equipment props → 渲染卡片 → 选择借用期限 → onBorrow 回调
 *          传递 (装备id, 借用天数) 给父组件 → EquipmentPage 调用 api.borrowEquipment
 * ============================================ */

import React, { useState } from 'react'
import type { Equipment } from '../types'
import { EquipmentCategoryLabels } from '../types'

interface EquipmentCardProps {
  equipment: Equipment
  onBorrow?: (equipmentId: string, days: number) => void
}

const EquipmentCard: React.FC<EquipmentCardProps> = ({ equipment, onBorrow }) => {
  const isAvailable = equipment.status === 'available'
  const [borrowDays, setBorrowDays] = useState<3 | 7 | 14>(7)

  const handleBorrow = () => {
    if (isAvailable && onBorrow) {
      onBorrow(equipment.id, borrowDays)
    }
  }

  const returnDate = new Date()
  returnDate.setDate(returnDate.getDate() + borrowDays)

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
        {isAvailable && (
          <div className="borrow-days-selector">
            <div className="days-selector-label">借用期限:</div>
            <div className="days-selector-options">
              {([3, 7, 14] as const).map(d => (
                <button
                  key={d}
                  type="button"
                  className={`day-option-mini ${borrowDays === d ? 'day-active' : ''}`}
                  onClick={() => setBorrowDays(d)}
                  disabled={!isAvailable}
                >
                  {d}天
                </button>
              ))}
            </div>
            <div className="return-preview">
              预计归还: {returnDate.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        )}
        <button
          className={`borrow-btn ${isAvailable ? 'btn-primary' : 'btn-disabled'}`}
          onClick={handleBorrow}
          disabled={!isAvailable}
        >
          {isAvailable ? '立即预约' : '暂不可用'}
        </button>
      </div>
    </div>
  )
}

export default EquipmentCard
