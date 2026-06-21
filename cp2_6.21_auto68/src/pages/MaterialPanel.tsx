import { useState, useEffect, useCallback } from 'react'
import { Material } from '@/common/types'
import clsx from 'clsx'

interface MaterialPanelProps {
  materials: Material[]
  onRefresh: () => void
}

export default function MaterialPanel({ materials, onRefresh }: MaterialPanelProps) {
  const [blinkIds, setBlinkIds] = useState<Set<string>>(new Set())
  const [prevMaterialsRef, setPrevMaterialsRef] = useState<Material[]>([])
  const [modalMaterial, setModalMaterial] = useState<Material | null>(null)
  const [purchasing, setPurchasing] = useState(false)

  useEffect(() => {
    if (prevMaterialsRef !== materials) {
      const lowStockIds = materials
        .filter((m) => m.stock < m.safetyStock)
        .map((m) => m.id)
      if (lowStockIds.length > 0) {
        setBlinkIds(new Set(lowStockIds))
        const timer = setTimeout(() => {
          setBlinkIds(new Set())
        }, 3000)
        setPrevMaterialsRef(materials)
        return () => clearTimeout(timer)
      }
      setPrevMaterialsRef(materials)
    }
  }, [materials, prevMaterialsRef])

  const handlePurchase = useCallback(async () => {
    if (!modalMaterial) return
    setPurchasing(true)
    try {
      await fetch(`/api/materials/${modalMaterial.id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: 1 }),
      })
      setModalMaterial(null)
      onRefresh()
    } finally {
      setPurchasing(false)
    }
  }, [modalMaterial, onRefresh])

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr
            style={{
              background: '#F8FAFC',
              fontWeight: 600,
              borderBottom: '2px solid #E2E8F0',
            }}
          >
            <th style={thStyle}>名称</th>
            <th style={thStyle}>类别</th>
            <th style={thStyle}>当前库存</th>
            <th style={thStyle}>安全库存</th>
            <th style={thStyle}>单位</th>
            <th style={thStyle}>供应商</th>
            <th style={thStyle}>操作</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((m) => {
            const isLow = m.stock < m.safetyStock
            return (
              <tr
                key={m.id}
                style={{
                  height: 48,
                  background: isLow ? '#FEF2F2' : undefined,
                }}
                onMouseEnter={(e) => {
                  if (!isLow) e.currentTarget.style.background = '#F8FAFC'
                }}
                onMouseLeave={(e) => {
                  if (!isLow) e.currentTarget.style.background = ''
                }}
              >
                <td style={tdStyle}>{m.name}</td>
                <td style={tdStyle}>{m.category}</td>
                <td style={tdStyle}>
                  <span
                    className={clsx(isLow && blinkIds.has(m.id) && 'blink-animation')}
                    style={{
                      color: isLow ? '#EF4444' : undefined,
                      fontWeight: isLow ? 700 : undefined,
                    }}
                  >
                    {m.stock}
                  </span>
                </td>
                <td style={tdStyle}>{m.safetyStock}</td>
                <td style={tdStyle}>{m.unit}</td>
                <td style={tdStyle}>{m.supplier}</td>
                <td style={tdStyle}>
                  <button
                    onClick={() => setModalMaterial(m)}
                    style={{
                      padding: '4px 12px',
                      border: '1px solid #CBD5E1',
                      borderRadius: 6,
                      background: '#fff',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    补货
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {modalMaterial && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setModalMaterial(null)}
        >
          <div
            style={{
              background: '#fff',
              width: 400,
              borderRadius: 12,
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
              补货确认
            </div>
            <div style={{ marginBottom: 24, color: '#475569' }}>
              为 <strong>{modalMaterial.name}</strong> 补货量+1单位
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => setModalMaterial(null)}
                style={{
                  padding: '8px 20px',
                  border: '1px solid #CBD5E1',
                  borderRadius: 8,
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                取消
              </button>
              <button
                onClick={handlePurchase}
                disabled={purchasing}
                style={{
                  padding: '8px 20px',
                  border: 'none',
                  borderRadius: 8,
                  background: purchasing ? '#94A3B8' : '#3B82F6',
                  color: '#fff',
                  cursor: purchasing ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                }}
              >
                {purchasing ? '提交中...' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0 12px',
  fontSize: 13,
  color: '#475569',
  height: 40,
}

const tdStyle: React.CSSProperties = {
  padding: '0 12px',
  fontSize: 14,
  color: '#1E293B',
  borderBottom: '1px solid #F1F5F9',
}
