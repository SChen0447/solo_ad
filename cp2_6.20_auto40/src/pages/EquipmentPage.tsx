/* ============================================
 * 装备集市页面
 * 上游组件：App.tsx（通过React Router渲染）
 * 下游组件：EquipmentCard、Modal
 * 数据流向：
 *   - 接收：equipment: Equipment[]（来自App.tsx props）
 *           onEquipmentChange: (Equipment[]) => void（更新父组件状态）
 *   - 调用EquipmentCard.onBorrow(id, borrowDuration) → 打开确认Modal
 *   - 确认后 → api.borrowEquipment(id, days) → refresh() → 父组件更新
 * ============================================ */

import React, { useState, useEffect } from 'react'
import EquipmentCard from '../components/EquipmentCard'
import Modal from '../components/Modal'
import { api } from '../api'
import type { Equipment, EquipmentCategory } from '../types'
import { EquipmentCategoryLabels } from '../types'

interface EquipmentPageProps {
  equipment: Equipment[]
  onEquipmentChange: (equipment: Equipment[]) => void
}

const EquipmentPage: React.FC<EquipmentPageProps> = ({ equipment, onEquipmentChange }) => {
  const [showBorrow, setShowBorrow] = useState(false)
  const [selectedEqId, setSelectedEqId] = useState<string | null>(null)
  const [selectedDays, setSelectedDays] = useState<7 | 3 | 14>(7)
  const [category, setCategory] = useState<'all' | EquipmentCategory>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const selectedEq = equipment.find(e => e.id === selectedEqId) || null

  const refresh = async () => {
    const res = await api.getEquipment(1, 20, category, search)
    onEquipmentChange(res.data)
  }

  useEffect(() => {
    refresh()
  }, [category, search])

  const handleOpenBorrow = (equipmentId: string, borrowDuration: number) => {
    setSelectedEqId(equipmentId)
    setSelectedDays(borrowDuration as 3 | 7 | 14)
    setShowBorrow(true)
  }

  const handleConfirmBorrow = async () => {
    if (!selectedEqId) return
    setLoading(true)
    try {
      await api.borrowEquipment(selectedEqId, selectedDays)
      await refresh()
      setShowBorrow(false)
      setSelectedEqId(null)
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : '预约失败')
    } finally {
      setLoading(false)
    }
  }

  const options: { key: 'all' | EquipmentCategory; label: string }[] = [
    { key: 'all', label: '全部' },
    ...(Object.keys(EquipmentCategoryLabels) as EquipmentCategory[]).map(k => ({
      key: k, label: EquipmentCategoryLabels[k]
    }))
  ]

  const returnDate = new Date()
  returnDate.setDate(returnDate.getDate() + selectedDays)

  return (
    <div className="page-container page-fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">🎒 装备集市</h2>
          <p className="page-subtitle">共享闲置装备，减少出行负担</p>
        </div>
      </div>

      <div className="eq-toolbar">
        <div className="eq-search">
          <input
            className="form-input search-input"
            type="text"
            placeholder="搜索装备名称或描述..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>
        <div className="filter-bar eq-filter-bar">
          {options.map(opt => (
            <button
              key={opt.key}
              className={`filter-btn ${category === opt.key ? 'filter-active' : ''}`}
              onClick={() => setCategory(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="equipment-masonry">
        {equipment.map(eq => (
          <EquipmentCard
            key={eq.id}
            equipment={eq}
            onBorrow={handleOpenBorrow}
          />
        ))}
      </div>

      {equipment.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🎒</div>
          <p className="empty-text">暂无匹配的装备</p>
        </div>
      )}

      <Modal
        isOpen={showBorrow}
        title="确认预约装备"
        onClose={() => !loading && setShowBorrow(false)}
        width="440px"
      >
        {selectedEq && (
          <div className="borrow-confirm">
            <div className="borrow-item-preview">
              <img src={selectedEq.imageUrl} alt={selectedEq.name} />
              <div className="borrow-item-info">
                <h4 className="borrow-item-name">{selectedEq.name}</h4>
                <p className="borrow-item-desc">{selectedEq.description}</p>
                <p className="borrow-item-owner">提供者: {selectedEq.ownerName}</p>
              </div>
            </div>
            <div className="borrow-days-select">
              <label className="form-label">确认借用期限:</label>
              <div className="days-options">
                {([3, 7, 14] as const).map(d => {
                  const retDate = new Date()
                  retDate.setDate(retDate.getDate() + d)
                  return (
                    <button
                      key={d}
                      type="button"
                      className={`day-option ${selectedDays === d ? 'day-active' : ''}`}
                      onClick={() => setSelectedDays(d)}
                    >
                      <div className="day-num">今日起{d}天</div>
                      <div className="day-return">
                        归还: {retDate.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                      </div>
                    </button>
                  )
                })}
              </div>
              <div className="borrow-summary">
                借用期限: <strong>{selectedDays}天</strong> · 预计归还: <strong>{returnDate.toLocaleDateString('zh-CN')}</strong>
              </div>
            </div>
            <div className="borrow-notice">
              💡 借用请爱护装备，按时归还，损坏需照价赔偿
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowBorrow(false)}
                disabled={loading}
              >
                取消
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmBorrow}
                disabled={loading}
              >
                {loading ? '处理中...' : '确认预约'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default EquipmentPage
