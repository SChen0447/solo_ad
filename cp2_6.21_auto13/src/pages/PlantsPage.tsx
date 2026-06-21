import { useState, useEffect, useMemo, useRef } from 'react'
import PlantCard from '../components/PlantCard'
import { getPlants, addPlant, waterPlant } from '../api'
import type { Plant } from '../types'

export default function PlantsPage() {
  const [plants, setPlants] = useState<Plant[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addModalVisible, setAddModalVisible] = useState(false)
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [speciesFilter, setSpeciesFilter] = useState('')
  const [lightFilter, setLightFilter] = useState('')
  const [newPlantIds, setNewPlantIds] = useState<Set<string>>(new Set())

  const closeDetailTimer = useRef<number | null>(null)
  const closeAddTimer = useRef<number | null>(null)
  const newPlantTimer = useRef<number | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    species: '',
    location: '',
    lightNeeds: '',
    imageUrl: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadPlants()
    return () => {
      if (closeDetailTimer.current) clearTimeout(closeDetailTimer.current)
      if (closeAddTimer.current) clearTimeout(closeAddTimer.current)
      if (newPlantTimer.current) clearTimeout(newPlantTimer.current)
    }
  }, [])

  async function loadPlants() {
    try {
      setLoading(true)
      const data = await getPlants()
      setPlants(data)
    } catch (error) {
      console.error('加载植物失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const speciesOptions = useMemo(() => {
    const species = new Set(plants.map(p => p.species))
    return Array.from(species)
  }, [plants])

  const lightOptions = useMemo(() => {
    const lights = new Set(plants.map(p => p.lightNeeds))
    return Array.from(lights)
  }, [plants])

  const filteredPlants = useMemo(() => {
    return plants.filter(plant => {
      if (speciesFilter && plant.species !== speciesFilter) return false
      if (lightFilter && plant.lightNeeds !== lightFilter) return false
      return true
    })
  }, [plants, speciesFilter, lightFilter])

  const isFiltered = speciesFilter !== '' || lightFilter !== ''

  function handleCardClick(plant: Plant) {
    if (closeDetailTimer.current) {
      clearTimeout(closeDetailTimer.current)
      closeDetailTimer.current = null
    }
    setSelectedPlant(plant)
    requestAnimationFrame(() => {
      setDetailVisible(true)
    })
  }

  function handleCloseDetail() {
    setDetailVisible(false)
    if (closeDetailTimer.current) clearTimeout(closeDetailTimer.current)
    closeDetailTimer.current = window.setTimeout(() => {
      setSelectedPlant(null)
      closeDetailTimer.current = null
    }, 300)
  }

  function handleOpenAddModal() {
    if (closeAddTimer.current) {
      clearTimeout(closeAddTimer.current)
      closeAddTimer.current = null
    }
    setShowAddModal(true)
    setFormData({
      name: '',
      species: '',
      location: '',
      lightNeeds: '',
      imageUrl: ''
    })
    requestAnimationFrame(() => {
      setAddModalVisible(true)
    })
  }

  function handleCloseAddModal() {
    setAddModalVisible(false)
    if (closeAddTimer.current) clearTimeout(closeAddTimer.current)
    closeAddTimer.current = window.setTimeout(() => {
      setShowAddModal(false)
      closeAddTimer.current = null
    }, 250)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name || !formData.species || !formData.location || !formData.lightNeeds) {
      return
    }

    try {
      setSubmitting(true)
      const newPlant = await addPlant({
        name: formData.name,
        species: formData.species,
        location: formData.location,
        lightNeeds: formData.lightNeeds,
        imageUrl: formData.imageUrl || undefined
      })

      setPlants(prev => [newPlant, ...prev])
      setNewPlantIds(prev => new Set(prev).add(newPlant.id))
      setAddModalVisible(false)
      if (closeAddTimer.current) clearTimeout(closeAddTimer.current)
      closeAddTimer.current = window.setTimeout(() => {
        setShowAddModal(false)
        closeAddTimer.current = null
      }, 250)

      if (newPlantTimer.current) clearTimeout(newPlantTimer.current)
      newPlantTimer.current = window.setTimeout(() => {
        setNewPlantIds(prev => {
          const next = new Set(prev)
          next.delete(newPlant.id)
          return next
        })
        newPlantTimer.current = null
      }, 500)
    } catch (error) {
      console.error('添加植物失败:', error)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleWaterPlant() {
    if (!selectedPlant) return
    try {
      const updated = await waterPlant(selectedPlant.id)
      setSelectedPlant(updated)
      setPlants(prev =>
        prev.map(p => (p.id === selectedPlant.id ? updated : p))
      )
    } catch (error) {
      console.error('浇水失败:', error)
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  function getCareTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      water: '浇水',
      fertilize: '施肥',
      repot: '换盆'
    }
    return labels[type] || type
  }

  if (loading) {
    return (
      <div className="plants-page">
        <div className="loading">加载中...</div>
      </div>
    )
  }

  return (
    <div className="plants-page">
      <div className="page-header">
        <h1 className="page-title">我的植物</h1>
      </div>

      <div className="filter-section">
        <select
          className="filter-select"
          value={speciesFilter}
          onChange={e => setSpeciesFilter(e.target.value)}
        >
          <option value="">全部种类</option>
          {speciesOptions.map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={lightFilter}
          onChange={e => setLightFilter(e.target.value)}
        >
          <option value="">全部光照</option>
          {lightOptions.map(l => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {plants.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🌱</div>
          <p>还没有植物，点击右下角添加第一盆吧！</p>
        </div>
      ) : (
        <div className="plants-grid">
          {plants.map(plant => (
            <PlantCard
              key={plant.id}
              plant={plant}
              onClick={() => handleCardClick(plant)}
              isNew={newPlantIds.has(plant.id)}
              isFiltered={isFiltered && !filteredPlants.find(p => p.id === plant.id)}
            />
          ))}
        </div>
      )}

      <button className="fab" onClick={handleOpenAddModal}>
        +
      </button>

      {showAddModal && (
        <div className={`modal-overlay ${addModalVisible ? 'visible' : ''}`} onClick={handleCloseAddModal}>
          <div
            className="modal-content center-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">添加植物</h2>
              <button className="close-btn" onClick={handleCloseAddModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">植物名称 *</label>
                  <input
                    className="form-input"
                    type="text"
                    value={formData.name}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="如：绿萝"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">种类 *</label>
                  <input
                    className="form-input"
                    type="text"
                    value={formData.species}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, species: e.target.value }))
                    }
                    placeholder="如：天南星科"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">位置 *</label>
                  <input
                    className="form-input"
                    type="text"
                    value={formData.location}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, location: e.target.value }))
                    }
                    placeholder="如：客厅"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">光照需求 *</label>
                  <select
                    className="form-select"
                    value={formData.lightNeeds}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, lightNeeds: e.target.value }))
                    }
                    required
                  >
                    <option value="">请选择</option>
                    <option value="全日照">全日照</option>
                    <option value="散射光">散射光</option>
                    <option value="耐阴">耐阴</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">图片URL</label>
                  <input
                    className="form-input"
                    type="text"
                    value={formData.imageUrl}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, imageUrl: e.target.value }))
                    }
                    placeholder="可选"
                  />
                </div>

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={submitting}
                >
                  {submitting ? '添加中...' : '添加植物'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {selectedPlant && (
        <div className={`modal-overlay ${detailVisible ? 'visible' : ''}`} onClick={handleCloseDetail}>
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">{selectedPlant.name}</h2>
              <button className="close-btn" onClick={handleCloseDetail}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <img
                className="plant-detail-image"
                src={selectedPlant.imageUrl}
                alt={selectedPlant.name}
              />

              <div className="plant-detail-info">
                <div className="info-row">
                  <span className="info-label">种类</span>
                  <span className="info-value">{selectedPlant.species}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">位置</span>
                  <span className="info-value">{selectedPlant.location}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">光照需求</span>
                  <span className="info-value">{selectedPlant.lightNeeds}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">上次浇水</span>
                  <span className="info-value">{formatDate(selectedPlant.lastWatered)}</span>
                </div>
              </div>

              <div className="care-timeline">
                <h3 className="timeline-title">养护日历</h3>
                {selectedPlant.careHistory.length === 0 ? (
                  <p style={{ color: '#999', fontSize: '14px' }}>暂无养护记录</p>
                ) : (
                  selectedPlant.careHistory.map(record => (
                    <div key={record.id} className="timeline-item">
                      <div className={`timeline-dot ${record.type}`}></div>
                      <div className="timeline-content">
                        <div className="timeline-type">
                          {getCareTypeLabel(record.type)}
                          {record.note ? ` - ${record.note}` : ''}
                        </div>
                        <div className="timeline-date">{formatDate(record.date)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button className="edit-btn" onClick={handleWaterPlant}>
                💧 浇水
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
