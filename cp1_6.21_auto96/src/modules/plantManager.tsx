import { useState, useEffect } from 'react'
import { getSpeciesEmoji, getSpeciesGradient, getTextColor } from '../constants'
import type { Plant, SortOrder } from '../types'

interface PlantManagerProps {
  plants: Plant[]
  onPlantClick: (plant: Plant) => void
  onDataChange: () => void
  filter: string
  sortOrder: SortOrder
  onFilterChange: (filter: string) => void
  onSortOrderChange: (order: SortOrder) => void
  speciesList: string[]
}

interface PlantFormData {
  name: string
  species: string
  waterFrequency: number
  fertilizeFrequency: number
  repotDate: string
}

const initialFormData: PlantFormData = {
  name: '',
  species: '',
  waterFrequency: 3,
  fertilizeFrequency: 14,
  repotDate: ''
}

export default function PlantManager({
  plants,
  onPlantClick,
  onDataChange,
  filter,
  sortOrder,
  onFilterChange,
  onSortOrderChange,
  speciesList
}: PlantManagerProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null)
  const [formData, setFormData] = useState<PlantFormData>(initialFormData)
  const [animatingCards, setAnimatingCards] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  useEffect(() => {
    setAnimatingCards(new Set(plants.map(p => p.id)))
    const timer = setTimeout(() => {
      setAnimatingCards(new Set())
    }, 600)
    return () => clearTimeout(timer)
  }, [filter, plants.map(p => p.id).join(',')])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.species.trim()) {
      alert('请填写植物名称和品种')
      return
    }

    const plantData = {
      name: formData.name.trim(),
      species: formData.species.trim(),
      waterFrequency: formData.waterFrequency,
      fertilizeFrequency: formData.fertilizeFrequency,
      ...(formData.repotDate ? { repotDate: formData.repotDate } : {})
    }

    try {
      if (editingPlant) {
        await fetch(`/api/plants/${editingPlant.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(plantData)
        })
      } else {
        await fetch('/api/plants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(plantData)
        })
      }
      onDataChange()
      resetForm()
    } catch (error) {
      console.error('Failed to save plant:', error)
      alert('保存失败，请重试')
    }
  }

  const handleDelete = async (plantId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('确定要删除这盆植物吗？')) return

    setIsDeleting(plantId)
    try {
      await fetch(`/api/plants/${plantId}`, {
        method: 'DELETE'
      })
      setTimeout(() => {
        onDataChange()
        setIsDeleting(null)
      }, 300)
    } catch (error) {
      console.error('Failed to delete plant:', error)
      setIsDeleting(null)
      alert('删除失败，请重试')
    }
  }

  const handleEdit = (plant: Plant, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingPlant(plant)
    setFormData({
      name: plant.name,
      species: plant.species,
      waterFrequency: plant.waterFrequency,
      fertilizeFrequency: plant.fertilizeFrequency,
      repotDate: plant.repotDate || ''
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setFormData(initialFormData)
    setEditingPlant(null)
    setShowForm(false)
  }

  const formatDaysText = (days: number | null | undefined) => {
    if (days === null || days === undefined) return '暂无任务'
    if (days < 0) return `已逾期 ${Math.abs(days)} 天`
    if (days === 0) return '今天'
    return `${days} 天后`
  }

  const getDaysClass = (days: number | null | undefined) => {
    if (days === null || days === undefined) return 'days-neutral'
    if (days < 0) return 'days-overdue'
    if (days <= 1) return 'days-urgent'
    if (days <= 3) return 'days-soon'
    return 'days-normal'
  }

  return (
    <div className="plant-manager">
      <div className="toolbar">
        <div className="filter-controls">
          <label className="filter-label">
            品种筛选：
            <select
              className="filter-select"
              value={filter}
              onChange={(e) => onFilterChange(e.target.value)}
            >
              <option value="all">全部</option>
              {speciesList.map(species => (
                <option key={species} value={species}>
                  {getSpeciesEmoji(species)} {species}
                </option>
              ))}
            </select>
          </label>
          <button
            className="sort-btn"
            onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            下次护理 {sortOrder === 'asc' ? '↑ 升序' : '↓ 降序'}
          </button>
        </div>
        <button className="add-btn" onClick={() => setShowForm(true)}>
          + 添加植物
        </button>
      </div>

      {showForm && (
        <div className="form-overlay" onClick={resetForm}>
          <div className="form-modal" onClick={e => e.stopPropagation()}>
            <h3>{editingPlant ? '编辑植物' : '添加新植物'}</h3>
            <form onSubmit={handleSubmit} className="plant-form">
              <div className="form-group">
                <label>植物名称 *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="例如：我的绿萝"
                  required
                />
              </div>
              <div className="form-group">
                <label>品种 *</label>
                <input
                  type="text"
                  name="species"
                  value={formData.species}
                  onChange={handleInputChange}
                  placeholder="例如：绿萝、仙人掌、多肉..."
                  required
                />
              </div>
              <div className="form-group">
                <label>浇水频率（每 X 天）*</label>
                <input
                  type="number"
                  name="waterFrequency"
                  value={formData.waterFrequency}
                  onChange={handleInputChange}
                  min="1"
                  max="365"
                  required
                />
              </div>
              <div className="form-group">
                <label>施肥频率（每 Y 天）*</label>
                <input
                  type="number"
                  name="fertilizeFrequency"
                  value={formData.fertilizeFrequency}
                  onChange={handleInputChange}
                  min="1"
                  max="365"
                  required
                />
              </div>
              <div className="form-group">
                <label>下次换盆日期（可选）</label>
                <input
                  type="date"
                  name="repotDate"
                  value={formData.repotDate}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={resetForm}>
                  取消
                </button>
                <button type="submit" className="submit-btn">
                  {editingPlant ? '保存修改' : '添加植物'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className={`plants-grid ${sortOrder === 'asc' ? 'sorting-asc' : 'sorting-desc'}`}>
        {plants.length === 0 ? (
          <div className="empty-state">
            <p className="empty-icon">🌱</p>
            <p>还没有添加植物，点击上方按钮添加第一盆吧！</p>
          </div>
        ) : (
          plants.map((plant, index) => (
            <div
              key={plant.id}
              className={`plant-card ${animatingCards.has(plant.id) ? 'fade-in' : ''} ${isDeleting === plant.id ? 'fade-out' : ''}`}
              style={{
                background: getSpeciesGradient(plant.species),
                animationDelay: `${index * 100}ms`,
                color: getTextColor(plant.species)
              }}
              onClick={() => onPlantClick(plant)}
            >
              <span className="plant-emoji">{getSpeciesEmoji(plant.species)}</span>
              <h3 className="plant-name">{plant.name}</h3>
              <p className="plant-species">{plant.species}</p>
              <div className="plant-frequencies">
                <span className="freq-item">💧 {plant.waterFrequency}天</span>
                <span className="freq-item">🌿 {plant.fertilizeFrequency}天</span>
              </div>
              <div className={`days-remaining ${getDaysClass(plant.nextCareDays)}`}>
                <span className="days-number">{formatDaysText(plant.nextCareDays)}</span>
              </div>
              <div className="card-actions">
                <button
                  className="action-btn edit-btn"
                  onClick={(e) => handleEdit(plant, e)}
                >
                  ✏️
                </button>
                <button
                  className="action-btn delete-btn"
                  onClick={(e) => handleDelete(plant.id, e)}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
