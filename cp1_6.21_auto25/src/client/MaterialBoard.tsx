import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { Socket } from 'socket.io-client'

interface Material {
  id: string
  name: string
  category: string
  total: number
  allocated: number
  available: number
  image?: string
}

interface MaterialBoardProps {
  materials: Material[]
  socket: Socket | null
}

function MaterialBoard({ materials, socket }: MaterialBoardProps) {
  const [filterCategory, setFilterCategory] = useState<string>('全部')
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const categories = ['全部', ...Array.from(new Set(materials.map((m) => m.category)))]

  const filteredMaterials = filterCategory === '全部'
    ? materials
    : materials.filter((m) => m.category === filterCategory)

  const isLowStock = (material: Material) => {
    return material.total > 0 && material.available / material.total < 0.2
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse<{ name: string; category: string; total: string; allocated: string }>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const importedMaterials = results.data
          .filter((row) => row.name)
          .map((row) => ({
            name: row.name,
            category: row.category || '未分类',
            total: parseInt(row.total) || 0,
            allocated: parseInt(row.allocated) || 0,
          }))

        if (importedMaterials.length > 0 && socket) {
          fetch('/api/materials/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(importedMaterials),
          }).then(() => {
            setIsImportModalOpen(false)
          })
        }
      },
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleCSVTextImport = (csvText: string) => {
    if (socket) {
      fetch('/api/materials/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvText }),
      }).then(() => {
        setIsImportModalOpen(false)
      })
    }
  }

  const getProgressColor = (material: Material) => {
    if (material.total === 0) return '#ccc'
    const ratio = material.available / material.total
    if (ratio < 0.2) return '#F44336'
    if (ratio < 0.5) return '#FF9800'
    return '#4CAF50'
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📦 物资看板</h2>
        <button
          style={styles.importButton}
          onClick={() => setIsImportModalOpen(true)}
        >
          📥 批量导入物资
        </button>
      </div>

      <div style={styles.filterBar}>
        {categories.map((cat) => (
          <button
            key={cat}
            style={{
              ...styles.filterButton,
              ...(filterCategory === cat ? styles.filterButtonActive : {}),
            }}
            onClick={() => setFilterCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <span style={styles.statNumber}>{materials.length}</span>
          <span style={styles.statLabel}>物资种类</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statNumber}>
            {materials.filter((m) => isLowStock(m)).length}
          </span>
          <span style={{ ...styles.statLabel, color: '#F44336' }}>低库存预警</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statNumber}>
            {materials.reduce((sum, m) => sum + m.available, 0)}
          </span>
          <span style={styles.statLabel}>总可用数量</span>
        </div>
      </div>

      <div style={styles.grid} className="board-container">
        {filteredMaterials.map((material) => (
          <div
            key={material.id}
            style={{
              ...styles.card,
              ...(isLowStock(material) ? styles.lowStockCard : {}),
            }}
            className={isLowStock(material) ? 'low-stock' : ''}
          >
            <div style={styles.cardImage}>
              <span style={styles.imagePlaceholder}>📦</span>
              <span style={styles.categoryTag}>{material.category}</span>
            </div>
            <div style={styles.cardContent}>
              <h3 style={styles.materialName}>{material.name}</h3>
              <div style={styles.progressContainer}>
                <div style={styles.progressBar}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${material.total > 0 ? (material.available / material.total) * 100 : 0}%`,
                      backgroundColor: getProgressColor(material),
                    }}
                  />
                </div>
              </div>
              <div style={styles.statsGrid}>
                <div style={styles.statItem}>
                  <span style={styles.statItemValue}>{material.total}</span>
                  <span style={styles.statItemLabel}>总量</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statItemValue}>{material.allocated}</span>
                  <span style={styles.statItemLabel}>已分配</span>
                </div>
                <div style={styles.statItem}>
                  <span style={{ ...styles.statItemValue, color: getProgressColor(material) }}>
                    {material.available}
                  </span>
                  <span style={styles.statItemLabel}>可用</span>
                </div>
              </div>
              {isLowStock(material) && (
                <div style={styles.warningBanner}>
                  ⚠️ 库存不足，请及时补充
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isImportModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsImportModalOpen(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>📥 批量导入物资</h3>
            <p style={styles.modalDesc}>
              上传 CSV 文件，格式：name,category,total,allocated
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              style={styles.fileInput}
            />
            <div style={styles.divider}>
              <span>或</span>
            </div>
            <CSVTextInput onImport={handleCSVTextImport} />
            <button
              style={styles.cancelButton}
              onClick={() => setIsImportModalOpen(false)}
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CSVTextInput({ onImport }: { onImport: (text: string) => void }) {
  const [text, setText] = useState('')

  const sampleCSV = `name,category,total,allocated
矿泉水,饮品,500,100
面包,食品,300,150
急救包,医疗,50,30`

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="粘贴CSV内容..."
        style={styles.textarea}
      />
      <button
        style={styles.importConfirmButton}
        onClick={() => text && onImport(text)}
        disabled={!text}
      >
        导入
      </button>
      <button
        style={styles.sampleButton}
        onClick={() => setText(sampleCSV)}
      >
        加载示例
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#3D3D3D',
  },
  importButton: {
    padding: '12px 24px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #FF8C42 0%, #FFB07C 100%)',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 600,
    boxShadow: '0 4px 12px rgba(255,140,66,0.4)',
  },
  filterBar: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  filterButton: {
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 500,
    background: 'rgba(255,255,255,0.6)',
    color: '#6B6B6B',
    border: '1px solid rgba(255,140,66,0.2)',
  },
  filterButtonActive: {
    background: 'linear-gradient(135deg, #FF8C42 0%, #FFB07C 100%)',
    color: '#fff',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  statCard: {
    background: 'rgba(255,255,255,0.8)',
    backdropFilter: 'blur(12px)',
    borderRadius: '16px',
    padding: '20px',
    textAlign: 'center',
    border: '1px solid rgba(255,140,66,0.15)',
  },
  statNumber: {
    display: 'block',
    fontSize: '28px',
    fontWeight: 700,
    color: '#FF8C42',
  },
  statLabel: {
    fontSize: '13px',
    color: '#6B6B6B',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '16px',
  },
  card: {
    background: 'rgba(255,248,240,0.85)',
    backdropFilter: 'blur(12px)',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid rgba(255,140,66,0.2)',
    boxShadow: '0 2px 8px rgba(255,140,66,0.1)',
    transition: 'all 0.3s ease',
  },
  lowStockCard: {
    borderColor: '#FF9800',
  },
  cardImage: {
    height: '100px',
    background: 'linear-gradient(135deg, #FFE8D6 0%, #FFD166 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  imagePlaceholder: {
    fontSize: '48px',
  },
  categoryTag: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    padding: '4px 10px',
    background: 'rgba(255,255,255,0.9)',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 500,
    color: '#FF8C42',
  },
  cardContent: {
    padding: '16px',
  },
  materialName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#3D3D3D',
    marginBottom: '12px',
  },
  progressContainer: {
    marginBottom: '12px',
  },
  progressBar: {
    height: '6px',
    background: 'rgba(0,0,0,0.08)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  statItem: {
    textAlign: 'center',
  },
  statItemValue: {
    display: 'block',
    fontSize: '16px',
    fontWeight: 600,
    color: '#3D3D3D',
  },
  statItemLabel: {
    fontSize: '11px',
    color: '#9B9B9B',
  },
  warningBanner: {
    marginTop: '12px',
    padding: '8px 12px',
    background: 'rgba(255,152,0,0.15)',
    borderRadius: '8px',
    fontSize: '12px',
    color: '#F57C00',
    fontWeight: 500,
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#FFF8F0',
    borderRadius: '20px',
    padding: '32px',
    width: '90%',
    maxWidth: '480px',
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#3D3D3D',
    marginBottom: '8px',
  },
  modalDesc: {
    fontSize: '14px',
    color: '#6B6B6B',
    marginBottom: '20px',
  },
  fileInput: {
    width: '100%',
    marginBottom: '16px',
    padding: '12px',
    border: '2px dashed rgba(255,140,66,0.3)',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.5)',
  },
  divider: {
    textAlign: 'center',
    color: '#9B9B9B',
    margin: '16px 0',
    fontSize: '14px',
  },
  textarea: {
    width: '100%',
    height: '120px',
    padding: '12px',
    border: '1px solid rgba(255,140,66,0.2)',
    borderRadius: '12px',
    fontSize: '13px',
    fontFamily: 'monospace',
    resize: 'vertical',
    marginBottom: '12px',
  },
  importConfirmButton: {
    width: '100%',
    padding: '12px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #FF8C42 0%, #FFB07C 100%)',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  sampleButton: {
    width: '100%',
    padding: '10px',
    borderRadius: '10px',
    background: 'rgba(255,140,66,0.1)',
    color: '#FF8C42',
    fontSize: '13px',
    marginBottom: '16px',
  },
  cancelButton: {
    width: '100%',
    padding: '12px',
    borderRadius: '12px',
    background: 'rgba(0,0,0,0.08)',
    color: '#6B6B6B',
    fontSize: '14px',
  },
}

export default MaterialBoard
