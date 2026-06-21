import { useState, useEffect, useCallback, useMemo } from 'react'
import ComparisonTable from './components/ComparisonTable'
import RadarChart from './components/RadarChart'
import WeightPanel from './components/WeightPanel'
import type { Property, Weights, ComparisonList } from './types'
import {
  WEIGHT_LABELS,
  ORIENTATION_SCORE,
  LAYOUT_SCORE,
  DECORATION_SCORE,
  type WeightKey,
} from './types'

const COLORS = ['#4A90D9', '#E67E22', '#27AE60', '#8E44AD', '#E74C3C', '#16A085']

export default function App() {
  const [properties, setProperties] = useState<Property[]>([])
  const [weights, setWeights] = useState<Weights>({
    rent: 8,
    area: 7,
    layout: 6,
    floor: 5,
    orientation: 5,
    decoration: 5,
    metroWalkTime: 7,
  })
  const [comparisonLists, setComparisonLists] = useState<ComparisonList[]>([])
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [isWeightPanelOpen, setIsWeightPanelOpen] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImageModal, setShowImageModal] = useState<string | null>(null)
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set())
  const [newProperty, setNewProperty] = useState<Partial<Property>>({
    name: '',
    rent: 0,
    area: 0,
    layout: '一居',
    floor: '中层/10层',
    orientation: '南',
    decoration: '精装修',
    metroWalkTime: 10,
    images: [],
  })

  const activeProperties = useMemo(() => {
    const activeList = comparisonLists.find((l) => l.id === activeListId)
    if (!activeList) return properties
    return properties.filter((p) => activeList.propertyIds.includes(p.id))
  }, [properties, comparisonLists, activeListId])

  useEffect(() => {
    Promise.all([
      fetch('/api/properties').then((r) => r.json()),
      fetch('/api/weights').then((r) => r.json()),
      fetch('/api/comparison-lists').then((r) => r.json()),
      fetch('/api/active-list').then((r) => r.json()),
    ]).then(([props, w, lists, active]) => {
      setProperties(props)
      setWeights(w)
      setComparisonLists(lists)
      if (active) setActiveListId(active.id)
    })
  }, [])

  const handleAddProperty = async () => {
    if (!newProperty.name || !newProperty.rent || !newProperty.area) return
    const res = await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProperty),
    })
    const created = await res.json()
    setProperties((prev) => [...prev, created])
    setShowAddModal(false)
    setNewProperty({
      name: '',
      rent: 0,
      area: 0,
      layout: '一居',
      floor: '中层/10层',
      orientation: '南',
      decoration: '精装修',
      metroWalkTime: 10,
      images: [],
    })
  }

  const handleDeleteProperty = async (id: string) => {
    setFadingIds((prev) => new Set(prev).add(id))
    setTimeout(async () => {
      await fetch(`/api/properties/${id}`, { method: 'DELETE' })
      setProperties((prev) => prev.filter((p) => p.id !== id))
      setFadingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 300)
  }

  const handleWeightsChange = useCallback(async (newWeights: Weights) => {
    setWeights(newWeights)
    await fetch('/api/weights', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newWeights),
    })
  }, [])

  const handleListChange = async (listId: string) => {
    setFadingIds(new Set(activeProperties.map((p) => p.id)))
    setTimeout(async () => {
      const res = await fetch(`/api/active-list/${listId}`, { method: 'PUT' })
      const active = await res.json()
      setActiveListId(active.id)
      setFadingIds(new Set())
    }, 200)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    Promise.all(
      files.slice(0, 3).map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.readAsDataURL(file)
          }),
      ),
    ).then((base64s) => {
      setNewProperty((prev) => ({ ...prev, images: base64s }))
    })
  }

  const scores = useMemo(() => {
    if (activeProperties.length === 0) return {} as Record<string, number>
    const maxRent = Math.max(...activeProperties.map((p) => p.rent))
    const minRent = Math.min(...activeProperties.map((p) => p.rent))
    const maxArea = Math.max(...activeProperties.map((p) => p.area))
    const minArea = Math.min(...activeProperties.map((p) => p.area))
    const maxMetro = Math.max(...activeProperties.map((p) => p.metroWalkTime))
    const minMetro = Math.min(...activeProperties.map((p) => p.metroWalkTime))

    const norm = (val: number, min: number, max: number, reverse = false) => {
      if (max === min) return 5
      const n = ((val - min) / (max - min)) * 10
      return reverse ? 10 - n : n
    }

    const parseFloor = (floorStr: string) => {
      const match = floorStr.match(/(\d+)层/)
      const total = match ? parseInt(match[1]) : 10
      if (floorStr.startsWith('高')) return 9
      if (floorStr.startsWith('中')) return 7
      if (floorStr.startsWith('低')) return 5
      return 6
    }

    const weightSum = Object.values(weights).reduce((a, b) => a + b, 0) || 1

    const result: Record<string, number> = {}
    activeProperties.forEach((p) => {
      const rentScore = norm(p.rent, minRent, maxRent, true)
      const areaScore = norm(p.area, minArea, maxArea)
      const layoutScore = LAYOUT_SCORE[p.layout] || 6
      const floorScore = parseFloor(p.floor)
      const orientationScore = ORIENTATION_SCORE[p.orientation] || 5
      const decorationScore = DECORATION_SCORE[p.decoration] || 6
      const metroScore = norm(p.metroWalkTime, minMetro, maxMetro, true)

      const total =
        (rentScore * weights.rent +
          areaScore * weights.area +
          layoutScore * weights.layout +
          floorScore * weights.floor +
          orientationScore * weights.orientation +
          decorationScore * weights.decoration +
          metroScore * weights.metroWalkTime) /
        weightSum

      result[p.id] = Math.round(total * 10) / 10
    })
    return result
  }, [activeProperties, weights])

  const radarData = useMemo(() => {
    if (activeProperties.length === 0) return { dimensions: [], series: [] }
    const maxRent = Math.max(...activeProperties.map((p) => p.rent))
    const minRent = Math.min(...activeProperties.map((p) => p.rent))
    const maxArea = Math.max(...activeProperties.map((p) => p.area))
    const minArea = Math.min(...activeProperties.map((p) => p.area))
    const maxMetro = Math.max(...activeProperties.map((p) => p.metroWalkTime))
    const minMetro = Math.min(...activeProperties.map((p) => p.metroWalkTime))

    const norm = (val: number, min: number, max: number, reverse = false) => {
      if (max === min) return 0.5
      const n = (val - min) / (max - min)
      return reverse ? 1 - n : n
    }

    const parseFloor = (floorStr: string) => {
      if (floorStr.startsWith('高')) return 0.9
      if (floorStr.startsWith('中')) return 0.7
      if (floorStr.startsWith('低')) return 0.5
      return 0.6
    }

    const dimensions = ['租金', '面积', '交通', '楼层', '朝向']
    const series = activeProperties.map((p, idx) => ({
      name: p.name,
      color: COLORS[idx % COLORS.length],
      values: [
        norm(p.rent, minRent, maxRent, true),
        norm(p.area, minArea, maxArea),
        norm(p.metroWalkTime, minMetro, maxMetro, true),
        parseFloor(p.floor),
        (ORIENTATION_SCORE[p.orientation] || 5) / 10,
      ],
    }))
    return { dimensions, series }
  }, [activeProperties])

  return (
    <div style={{ minHeight: '100vh', padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>🏠 租房房源比较平台</h1>
          <p style={styles.subtitle}>智能对比 · 轻松决策</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            value={activeListId || ''}
            onChange={(e) => handleListChange(e.target.value)}
            style={styles.select}
          >
            {comparisonLists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <button onClick={() => setIsWeightPanelOpen(true)} style={styles.secondaryBtn}>
            ⚙️ 设置权重
          </button>
          <button onClick={() => setShowAddModal(true)} style={styles.primaryBtn}>
            ＋ 添加房源
          </button>
        </div>
      </header>

      <div style={styles.mainGrid}>
        <div style={{ minWidth: 0 }}>
          <ComparisonTable
            properties={activeProperties}
            weights={weights}
            scores={scores}
            fadingIds={fadingIds}
            weightLabels={WEIGHT_LABELS}
            onDelete={handleDeleteProperty}
            onImageClick={(url) => setShowImageModal(url)}
          />
        </div>
        <div style={styles.chartCard}>
          <h3 style={styles.sectionTitle}>📊 五维对比雷达图</h3>
          <RadarChart dimensions={radarData.dimensions} series={radarData.series} />
          <div style={styles.legend}>
            {radarData.series.map((s, idx) => (
              <div key={idx} style={styles.legendItem}>
                <span style={{ ...styles.legendDot, background: s.color }} />
                <span style={styles.legendText}>{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <WeightPanel
        isOpen={isWeightPanelOpen}
        weights={weights}
        weightLabels={WEIGHT_LABELS}
        onClose={() => setIsWeightPanelOpen(false)}
        onChange={handleWeightsChange}
      />

      {showAddModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()} className="fade-in">
            <h3 style={styles.modalTitle}>添加新房源</h3>
            <div style={styles.formGrid}>
              <FormField label="房源名称">
                <input
                  value={newProperty.name}
                  onChange={(e) => setNewProperty({ ...newProperty, name: e.target.value })}
                  style={styles.input}
                  placeholder="如：阳光花园A栋"
                />
              </FormField>
              <FormField label="月租金（元）">
                <input
                  type="number"
                  value={newProperty.rent || ''}
                  onChange={(e) =>
                    setNewProperty({ ...newProperty, rent: Number(e.target.value) })
                  }
                  style={styles.input}
                />
              </FormField>
              <FormField label="面积（㎡）">
                <input
                  type="number"
                  value={newProperty.area || ''}
                  onChange={(e) =>
                    setNewProperty({ ...newProperty, area: Number(e.target.value) })
                  }
                  style={styles.input}
                />
              </FormField>
              <FormField label="户型">
                <select
                  value={newProperty.layout}
                  onChange={(e) => setNewProperty({ ...newProperty, layout: e.target.value })}
                  style={styles.input}
                >
                  <option>开间</option>
                  <option>一居</option>
                  <option>两居</option>
                  <option>三居</option>
                  <option>四居</option>
                </select>
              </FormField>
              <FormField label="楼层">
                <input
                  value={newProperty.floor}
                  onChange={(e) => setNewProperty({ ...newProperty, floor: e.target.value })}
                  style={styles.input}
                  placeholder="如：中层/18层"
                />
              </FormField>
              <FormField label="朝向">
                <select
                  value={newProperty.orientation}
                  onChange={(e) =>
                    setNewProperty({ ...newProperty, orientation: e.target.value })
                  }
                  style={styles.input}
                >
                  <option>南</option>
                  <option>东南</option>
                  <option>西南</option>
                  <option>东</option>
                  <option>西</option>
                  <option>东北</option>
                  <option>西北</option>
                  <option>北</option>
                </select>
              </FormField>
              <FormField label="装修">
                <select
                  value={newProperty.decoration}
                  onChange={(e) =>
                    setNewProperty({ ...newProperty, decoration: e.target.value })
                  }
                  style={styles.input}
                >
                  <option>毛坯</option>
                  <option>简装</option>
                  <option>中装</option>
                  <option>精装修</option>
                  <option>豪华装修</option>
                </select>
              </FormField>
              <FormField label="地铁步行（分钟）">
                <input
                  type="number"
                  value={newProperty.metroWalkTime || ''}
                  onChange={(e) =>
                    setNewProperty({ ...newProperty, metroWalkTime: Number(e.target.value) })
                  }
                  style={styles.input}
                />
              </FormField>
              <div style={{ gridColumn: 'span 2' }}>
                <FormField label="房源图片（最多3张）">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    style={styles.fileInput}
                  />
                </FormField>
                {newProperty.images && newProperty.images.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    {newProperty.images.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt=""
                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px' }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setShowAddModal(false)} style={styles.secondaryBtn}>
                取消
              </button>
              <button onClick={handleAddProperty} style={styles.primaryBtn}>
                确认添加
              </button>
            </div>
          </div>
        </div>
      )}

      {showImageModal && (
        <div style={styles.modalOverlay} onClick={() => setShowImageModal(null)}>
          <img
            src={showImageModal}
            alt=""
            style={styles.lightboxImage}
            className="fade-in"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={styles.formField}>
      <label style={styles.formLabel}>{label}</label>
      {children}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  subtitle: {
    color: 'var(--text-secondary)',
    marginTop: '4px',
  },
  primaryBtn: {
    background: 'var(--primary)',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: 'var(--radius)',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'background 200ms',
  },
  secondaryBtn: {
    background: '#fff',
    color: 'var(--primary)',
    padding: '10px 20px',
    borderRadius: 'var(--radius)',
    fontSize: '14px',
    fontWeight: 600,
    border: '1px solid var(--primary)',
    transition: 'all 200ms',
  },
  select: {
    padding: '10px 16px',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    fontSize: '14px',
    background: '#fff',
    minWidth: '160px',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 360px',
    gap: '24px',
  },
  chartCard: {
    background: '#fff',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow)',
    padding: '20px',
    height: 'fit-content',
    position: 'sticky',
    top: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '16px',
    color: 'var(--text-primary)',
  },
  legend: {
    marginTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  legendDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
  },
  legendText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    background: '#fff',
    borderRadius: 'var(--radius)',
    padding: '28px',
    maxWidth: '560px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 700,
    marginBottom: '20px',
    color: 'var(--text-primary)',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  formField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  formLabel: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  input: {
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    fontSize: '14px',
    transition: 'border-color 200ms',
  },
  fileInput: {
    fontSize: '13px',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
  },
  lightboxImage: {
    maxWidth: '90vw',
    maxHeight: '90vh',
    borderRadius: 'var(--radius)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
  },
}
