import { useState, useEffect, useRef } from 'react'
import useAppStore from './store'
import {
  ObjectCategory,
  ObjectSubType,
  COLOR_TEMP_MIN,
  COLOR_TEMP_MAX,
  BRIGHTNESS_MIN,
  BRIGHTNESS_MAX,
  CONE_ANGLE_MIN,
  CONE_ANGLE_MAX,
  colorTemperatureToRGB,
  MAX_SCHEMES,
  TreeType,
  BenchType,
  PlacedObject,
} from './types'

interface LibraryItem {
  category: ObjectCategory
  subType: ObjectSubType
  name: string
  icon: string
}

const LIBRARY_ITEMS: LibraryItem[] = [
  { category: 'tree', subType: 'sphere', name: '球形树冠', icon: '🌳' },
  { category: 'tree', subType: 'cone', name: '锥形树冠', icon: '🌲' },
  { category: 'tree', subType: 'umbrella', name: '伞形树冠', icon: '🌴' },
  { category: 'bench', subType: 'long', name: '长条凳', icon: '🪑' },
  { category: 'bench', subType: 'ring', name: '圆环座', icon: '⭕' },
  { category: 'lamp', subType: 'default', name: '路灯', icon: '💡' },
]

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  ticks,
  gradientColor,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (v: number) => void
  ticks?: number[]
  gradientColor?: (v: number) => string
}) {
  const percentage = ((value - min) / (max - min)) * 100
  const fillColor = gradientColor ? gradientColor(value) : '#ff8c42'

  return (
    <div style={{ marginBottom: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
        }}
      >
        <span
          style={{
            color: '#cccccc',
            fontSize: '13px',
            fontWeight: 500,
            letterSpacing: '0.5px',
          }}
        >
          {label}
        </span>
        <span
          style={{
            color: fillColor,
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: 'monospace',
            padding: '2px 8px',
            background: 'rgba(255, 140, 66, 0.1)',
            borderRadius: '4px',
            border: `1px solid ${fillColor}33`,
          }}
        >
          {value.toFixed(step < 1 ? 2 : 0)}
          {unit}
        </span>
      </div>

      <div style={{ position: 'relative', height: '32px' }}>
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: 0,
            right: 0,
            height: '6px',
            background: 'linear-gradient(to right, #2a2a2a, #3a3a3a)',
            borderRadius: '3px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${percentage}%`,
              height: '100%',
              background: `linear-gradient(to right, ${fillColor}88, ${fillColor})`,
              borderRadius: '3px',
              transition: 'width 0.1s ease, background 0.2s ease',
              boxShadow: `0 0 12px ${fillColor}66`,
            }}
          />
        </div>

        {ticks && (
          <div style={{ position: 'absolute', top: '6px', left: 0, right: 0, height: '18px' }}>
            {ticks.map((t, i) => {
              const p = ((t - min) / (max - min)) * 100
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${p}%`,
                    top: 0,
                    transform: 'translateX(-50%)',
                    width: '1px',
                    height: '8px',
                    background: '#555555',
                  }}
                />
              )
            })}
          </div>
        )}

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            position: 'absolute',
            top: '6px',
            left: 0,
            width: '100%',
            height: '20px',
            appearance: 'none',
            WebkitAppearance: 'none',
            background: 'transparent',
            cursor: 'pointer',
            outline: 'none',
            padding: 0,
            margin: 0,
          }}
        />
      </div>

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff8c42, #ff6a1a);
          border: 2px solid #ffffff;
          cursor: pointer;
          box-shadow: 0 2px 10px rgba(255, 140, 66, 0.6);
          transition: transform 0.15s ease, box-shadow 0.2s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 2px 16px rgba(255, 140, 66, 0.9);
        }
        input[type="range"]::-webkit-slider-thumb:active {
          transform: scale(0.95);
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff8c42, #ff6a1a);
          border: 2px solid #ffffff;
          cursor: pointer;
          box-shadow: 0 2px 10px rgba(255, 140, 66, 0.6);
        }
      `}</style>

      {ticks && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '6px',
            padding: '0 4px',
          }}
        >
          {ticks.map((t, i) => (
            <span
              key={i}
              style={{
                fontSize: '10px',
                color: '#666666',
                fontFamily: 'monospace',
              }}
            >
              {t >= 1000 ? `${(t / 1000).toFixed(0)}K` : t}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function LightColorPreview({ colorTemperature, brightness }: { colorTemperature: number; brightness: number }) {
  const [r, g, b] = colorTemperatureToRGB(colorTemperature)
  const color = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color} 0%, ${color}44 60%, transparent 100%)`,
          boxShadow: `0 0 ${20 * brightness}px ${color}aa`,
          transition: 'all 0.3s ease',
        }}
      />
      <div>
        <div style={{ fontSize: '12px', color: '#888', marginBottom: '2px' }}>色温预览</div>
        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: color }}>{color}</div>
      </div>
    </div>
  )
}

function AttributePanel({ collapsed }: { collapsed: boolean }) {
  const {
    selectedObjectId,
    schemes,
    activeSchemeId,
    updateLightParams,
    getSelectedLightParams,
    removeObject,
  } = useAppStore()

  const scheme = schemes.find((s) => s.id === activeSchemeId)
  const selectedObject: PlacedObject | undefined = scheme?.objects.find(
    (o) => o.id === selectedObjectId,
  )

  const lightParams = getSelectedLightParams()

  const width = collapsed ? '40px' : '240px'
  const opacity = collapsed ? 0 : 1
  const pointerEvents = collapsed ? 'none' as const : 'auto' as const

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        height: '100%',
        width,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        transition: 'width 0.3s ease-in-out',
        overflow: 'hidden',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '20px 20px 10px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          opacity,
          transition: 'opacity 0.2s ease',
          pointerEvents,
          whiteSpace: 'nowrap',
          minWidth: '200px',
        }}
      >
        <h2
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#ffffff',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              width: '4px',
              height: '18px',
              background: 'linear-gradient(to bottom, #ff8c42, #ff6a1a)',
              borderRadius: '2px',
            }}
          />
          属性面板
        </h2>
        <p style={{ fontSize: '11px', color: '#666', margin: '6px 0 0 12px' }}>
          选中物体后可编辑参数
        </p>
      </div>

      {collapsed && (
        <div
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            padding: '20px 10px',
            color: '#888',
            fontSize: '12px',
            letterSpacing: '2px',
            textAlign: 'center',
            opacity: 0.8,
            whiteSpace: 'nowrap',
          }}
        >
          ⚙ 属性
        </div>
      )}

      <div
        style={{
          flex: 1,
          padding: '20px',
          overflowY: 'auto',
          opacity,
          transition: 'opacity 0.2s ease',
          pointerEvents,
          minWidth: '200px',
        }}
      >
        {!selectedObjectId && (
          <div
            style={{
              padding: '40px 10px',
              textAlign: 'center',
              color: '#555',
              fontSize: '13px',
            }}
          >
            <div style={{ fontSize: '36px', marginBottom: '12px', opacity: 0.5 }}>🎯</div>
            <div>请在场景中点击选中一个物体</div>
            <div style={{ fontSize: '11px', marginTop: '8px', color: '#444' }}>
              或从左侧对象库中选择放置
            </div>
          </div>
        )}

        {selectedObjectId && !lightParams && selectedObject && (
          <div>
            <div
              style={{
                padding: '12px',
                background: 'rgba(255,140,66,0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(255,140,66,0.3)',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '13px', color: '#ff8c42', fontWeight: 600, marginBottom: '4px' }}>
                {selectedObject.category === 'tree'
                  ? selectedObject.subType === 'sphere'
                    ? '🌳 球形树冠'
                    : selectedObject.subType === 'cone'
                    ? '🌲 锥形树冠'
                    : '🌴 伞形树冠'
                  : selectedObject.subType === 'long'
                  ? '🪑 长条凳'
                  : '⭕ 圆环座'}
              </div>
              <div style={{ fontSize: '11px', color: '#888', fontFamily: 'monospace' }}>
                ID: {selectedObject.id.slice(0, 8)}...
              </div>
            </div>

            <div
              style={{
                fontSize: '11px',
                color: '#666',
                marginBottom: '12px',
                fontFamily: 'monospace',
              }}
            >
              位置: X: {selectedObject.position[0].toFixed(1)} Z:{' '}
              {selectedObject.position[2].toFixed(1)}
            </div>

            <button
              onClick={() => removeObject(selectedObjectId)}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: 'linear-gradient(135deg, #3a1a1a, #4a2020)',
                border: '1px solid rgba(255,80,80,0.3)',
                color: '#ff6666',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  'linear-gradient(135deg, #4a1a1a, #5a2020)'
                e.currentTarget.style.transform = 'scale(0.98)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  'linear-gradient(135deg, #3a1a1a, #4a2020)'
                e.currentTarget.style.transform = 'scale(1)'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)'
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(0.98)'
              }}
            >
              🗑 删除物体
            </button>
          </div>
        )}

        {selectedObjectId && lightParams && selectedObject && (
          <div>
            <div
              style={{
                padding: '12px',
                background: 'rgba(255,140,66,0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(255,140,66,0.3)',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '13px', color: '#ff8c42', fontWeight: 600, marginBottom: '4px' }}>
                💡 路灯
              </div>
              <div style={{ fontSize: '11px', color: '#888', fontFamily: 'monospace' }}>
                ID: {selectedObject.id.slice(0, 8)}...
              </div>
            </div>

            <LightColorPreview
              colorTemperature={lightParams.colorTemperature}
              brightness={lightParams.brightness}
            />

            <Slider
              label="色温"
              value={lightParams.colorTemperature}
              min={COLOR_TEMP_MIN}
              max={COLOR_TEMP_MAX}
              step={100}
              unit="K"
              onChange={(v) =>
                updateLightParams(selectedObjectId, { colorTemperature: v })
              }
              ticks={[2700, 3500, 4500, 5500, 6500]}
              gradientColor={(t) => {
                const [r, g, b] = colorTemperatureToRGB(t)
                return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`
              }}
            />

            <Slider
              label="亮度"
              value={lightParams.brightness}
              min={BRIGHTNESS_MIN}
              max={BRIGHTNESS_MAX}
              step={0.05}
              unit="x"
              onChange={(v) => updateLightParams(selectedObjectId, { brightness: v })}
              ticks={[0, 0.5, 1, 1.5, 2]}
            />

            <Slider
              label="锥角"
              value={lightParams.coneAngle}
              min={CONE_ANGLE_MIN}
              max={CONE_ANGLE_MAX}
              step={1}
              unit="°"
              onChange={(v) => updateLightParams(selectedObjectId, { coneAngle: v })}
              ticks={[10, 30, 50, 70, 80]}
            />

            <button
              onClick={() => removeObject(selectedObjectId)}
              style={{
                width: '100%',
                padding: '10px 16px',
                marginTop: '8px',
                background: 'linear-gradient(135deg, #3a1a1a, #4a2020)',
                border: '1px solid rgba(255,80,80,0.3)',
                color: '#ff6666',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  'linear-gradient(135deg, #4a1a1a, #5a2020)'
                e.currentTarget.style.transform = 'scale(0.98)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  'linear-gradient(135deg, #3a1a1a, #4a2020)'
                e.currentTarget.style.transform = 'scale(1)'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)'
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(0.98)'
              }}
            >
              🗑 删除路灯
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function SidebarPanel({ collapsed }: { collapsed: boolean }) {
  const {
    selectedLibraryItem,
    setSelectedLibraryItem,
    schemes,
    activeSchemeId,
    switchScheme,
    createScheme,
    deleteScheme,
    renameScheme,
    isTransitioning,
  } = useAppStore()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newSchemeName, setNewSchemeName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showCreateModal && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [showCreateModal])

  const width = collapsed ? '40px' : '220px'
  const opacity = collapsed ? 0 : 1
  const pointerEvents = collapsed ? 'none' as const : 'auto' as const

  const categories: { name: string; items: LibraryItem[] }[] = [
    { name: '🌿 植被', items: LIBRARY_ITEMS.filter((i) => i.category === 'tree') },
    { name: '🪑 座椅', items: LIBRARY_ITEMS.filter((i) => i.category === 'bench') },
    { name: '💡 灯具', items: LIBRARY_ITEMS.filter((i) => i.category === 'lamp') },
  ]

  const activeScheme = schemes.find((s) => s.id === activeSchemeId)

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        width,
        background: 'rgba(40, 40, 45, 0.55)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        transition: 'width 0.3s ease-in-out',
        overflow: 'hidden',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {collapsed && (
        <div
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            padding: '20px 10px',
            color: '#888',
            fontSize: '12px',
            letterSpacing: '2px',
            textAlign: 'center',
            opacity: 0.8,
            whiteSpace: 'nowrap',
            transform: 'rotate(180deg)',
          }}
        >
          🎨 工具栏
        </div>
      )}

      <div
        style={{
          padding: '20px 16px 10px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          opacity,
          transition: 'opacity 0.2s ease',
          pointerEvents,
          whiteSpace: 'nowrap',
          minWidth: '190px',
        }}
      >
        <h2
          style={{
            fontSize: '15px',
            fontWeight: 600,
            color: '#ffffff',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              width: '4px',
              height: '18px',
              background: 'linear-gradient(to bottom, #ff8c42, #ff6a1a)',
              borderRadius: '2px',
            }}
          />
          对象库
        </h2>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 12px 8px',
          opacity,
          transition: 'opacity 0.2s ease',
          pointerEvents,
          minWidth: '190px',
        }}
      >
        {categories.map((cat, catIdx) => (
          <div key={catIdx} style={{ marginBottom: '16px' }}>
            <div
              style={{
                fontSize: '11px',
                color: '#888',
                marginBottom: '8px',
                paddingLeft: '4px',
                letterSpacing: '0.5px',
                fontWeight: 500,
              }}
            >
              {cat.name}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {cat.items.map((item, idx) => {
                const isSelected =
                  selectedLibraryItem?.category === item.category &&
                  selectedLibraryItem?.subType === item.subType
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedLibraryItem(null)
                      } else {
                        setSelectedLibraryItem({
                          category: item.category,
                          subType: item.subType,
                        })
                      }
                    }}
                    style={{
                      padding: '10px 6px',
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(255,140,66,0.25), rgba(255,106,26,0.2))'
                        : 'rgba(255,255,255,0.03)',
                      border: isSelected
                        ? '1px solid rgba(255,140,66,0.6)'
                        : '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease',
                      color: isSelected ? '#ff8c42' : '#cccccc',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(255,140,66,0.1)'
                        e.currentTarget.style.borderColor = 'rgba(255,140,66,0.3)'
                      }
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                      }
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = 'scale(0.95)'
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{item.icon}</span>
                    <span style={{ fontSize: '10px', fontWeight: 500 }}>{item.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {selectedLibraryItem && (
          <div
            style={{
              padding: '10px',
              background: 'rgba(255,140,66,0.1)',
              borderRadius: '8px',
              border: '1px dashed rgba(255,140,66,0.4)',
              marginBottom: '12px',
              textAlign: 'center',
              fontSize: '11px',
              color: '#ff8c42',
              animation: 'pulse 2s infinite',
            }}
          >
            👆 点击地面放置物体
            <br />
            <span style={{ color: '#666', fontSize: '10px' }}>按 ESC 取消选择</span>
          </div>
        )}
      </div>

      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: '12px',
          opacity,
          transition: 'opacity 0.2s ease',
          pointerEvents,
          minWidth: '190px',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            color: '#888',
            marginBottom: '8px',
            paddingLeft: '4px',
            letterSpacing: '0.5px',
            fontWeight: 500,
          }}
        >
          📋 布局方案 ({schemes.length}/{MAX_SCHEMES})
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '180px', overflowY: 'auto' }}>
          {schemes.map((scheme) => {
            const isActive = scheme.id === activeSchemeId
            const isEditing = editingId === scheme.id
            return (
              <div
                key={scheme.id}
                onClick={() => !isTransitioning && switchScheme(scheme.id)}
                style={{
                  padding: '8px 10px',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(255,140,66,0.3), rgba(255,106,26,0.2))'
                    : 'rgba(255,255,255,0.03)',
                  border: isActive
                    ? '1px solid rgba(255,140,66,0.5)'
                    : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '6px',
                  cursor: isTransitioning ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                  opacity: isTransitioning && !isActive ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isActive && !isTransitioning) {
                    e.currentTarget.style.background = 'rgba(255,140,66,0.08)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                  }
                }}
              >
                {isEditing ? (
                  <input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => {
                      if (editingName.trim()) {
                        renameScheme(editingId!, editingName.trim())
                      }
                      setEditingId(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (editingName.trim()) {
                          renameScheme(editingId!, editingName.trim())
                        }
                        setEditingId(null)
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    style={{
                      flex: 1,
                      background: 'rgba(0,0,0,0.5)',
                      border: '1px solid rgba(255,140,66,0.4)',
                      color: '#fff',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                ) : (
                  <span
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      if (schemes.length > 0) {
                        setEditingId(scheme.id)
                        setEditingName(scheme.name)
                      }
                    }}
                    style={{
                      fontSize: '12px',
                      color: isActive ? '#ff8c42' : '#ccc',
                      fontWeight: isActive ? 600 : 400,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '100px',
                    }}
                  >
                    {isActive && '● '}
                    {scheme.name}
                  </span>
                )}

                {schemes.length > 1 && !isEditing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`确定删除方案「${scheme.name}」？`)) {
                        deleteScheme(scheme.id)
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#666',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: '2px 4px',
                      borderRadius: '3px',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#ff6666'
                      e.currentTarget.style.background = 'rgba(255,80,80,0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#666'
                      e.currentTarget.style.background = 'none'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <button
          onClick={() => {
            if (schemes.length >= MAX_SCHEMES) {
              alert(`最多只能创建 ${MAX_SCHEMES} 个方案`)
              return
            }
            setShowCreateModal(true)
            setNewSchemeName(`方案 ${schemes.length + 1}`)
          }}
          disabled={schemes.length >= MAX_SCHEMES}
          style={{
            width: '100%',
            marginTop: '8px',
            padding: '8px 12px',
            background: 'linear-gradient(135deg, #ff8c42, #ff6a1a)',
            border: 'none',
            color: '#fff',
            borderRadius: '6px',
            cursor: schemes.length >= MAX_SCHEMES ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            opacity: schemes.length >= MAX_SCHEMES ? 0.5 : 1,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (schemes.length < MAX_SCHEMES) {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,140,66,0.4)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}
          onMouseDown={(e) => {
            if (schemes.length < MAX_SCHEMES) {
              e.currentTarget.style.transform = 'scale(0.95)'
            }
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
        >
          + 新建方案
        </button>
      </div>

      {showCreateModal && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#2a2a2f',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              width: '260px',
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: '15px',
                color: '#fff',
                marginBottom: '16px',
              }}
            >
              创建新方案
            </h3>
            <input
              ref={inputRef}
              value={newSchemeName}
              onChange={(e) => setNewSchemeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newSchemeName.trim()) {
                  createScheme(newSchemeName.trim())
                  setShowCreateModal(false)
                }
              }}
              placeholder="方案名称"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                borderRadius: '6px',
                fontSize: '13px',
                outline: 'none',
                marginBottom: '16px',
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#aaa',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  transition: 'all 0.2s',
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (newSchemeName.trim()) {
                    createScheme(newSchemeName.trim())
                    setShowCreateModal(false)
                  }
                }}
                disabled={!newSchemeName.trim()}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: 'linear-gradient(135deg, #ff8c42, #ff6a1a)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '6px',
                  cursor: newSchemeName.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '12px',
                  fontWeight: 600,
                  opacity: newSchemeName.trim() ? 1 : 0.5,
                  transition: 'all 0.2s',
                }}
                onMouseDown={(e) => {
                  if (newSchemeName.trim()) e.currentTarget.style.transform = 'scale(0.95)'
                }}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TopToolbar() {
  const { schemes, activeSchemeId, schemes: _schemes } = useAppStore()
  const activeScheme = schemes.find((s) => s.id === activeSchemeId)

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '12px 28px',
        background: 'rgba(40, 40, 45, 0.6)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottomLeftRadius: '12px',
        borderBottomRightRadius: '12px',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <div
        style={{
          fontSize: '18px',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #ff8c42, #ffb080)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '1px',
        }}
      >
        城市公共空间设计师
      </div>
      <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)' }} />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          background: 'rgba(255,140,66,0.12)',
          borderRadius: '20px',
          border: '1px solid rgba(255,140,66,0.3)',
        }}
      >
        <span style={{ fontSize: '13px', color: '#ff8c42', fontWeight: 600 }}>
          📋 {activeScheme?.name || '无方案'}
        </span>
        <span
          style={{
            fontSize: '10px',
            color: '#888',
            fontFamily: 'monospace',
            paddingLeft: '8px',
            borderLeft: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {activeScheme?.objects.length || 0} 个物体
        </span>
      </div>
    </div>
  )
}

function HintBar() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '10px 20px',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.08)',
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
      }}
    >
      {[
        { icon: '🖱', label: '拖拽旋转' },
        { icon: '⚙', label: '滚轮缩放' },
        { icon: '🖱', label: '右键平移' },
        { icon: '👆', label: '点击选中' },
        { icon: '✋', label: '拖拽移动' },
      ].map((h, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            color: '#888',
          }}
        >
          <span style={{ fontSize: '14px' }}>{h.icon}</span>
          <span>{h.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function UI() {
  const [leftHover, setLeftHover] = useState(false)
  const [rightHover, setRightHover] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false)
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false)
  const { setSelectedLibraryItem } = useAppStore()

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedLibraryItem(null)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [setSelectedLibraryItem])

  if (isMobile) {
    return (
      <>
        <TopToolbar />
        <HintBar />

        {leftDrawerOpen && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 15,
            }}
            onClick={() => setLeftDrawerOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '85%',
                maxWidth: '300px',
              }}
            >
              <SidebarPanel collapsed={false} />
            </div>
          </div>
        )}

        {rightDrawerOpen && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 15,
            }}
            onClick={() => setRightDrawerOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: '85%',
                maxWidth: '300px',
              }}
            >
              <AttributePanel collapsed={false} />
            </div>
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            bottom: '70px',
            left: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 10,
          }}
        >
          <button
            onClick={() => setLeftDrawerOpen(true)}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(40, 40, 45, 0.85)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#ff8c42',
              fontSize: '22px',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
          >
            🎨
          </button>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: '70px',
            right: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 10,
          }}
        >
          <button
            onClick={() => setRightDrawerOpen(true)}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(40, 40, 45, 0.85)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#ff8c42',
              fontSize: '22px',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
          >
            ⚙
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <div
        onMouseEnter={() => setLeftHover(true)}
        onMouseLeave={() => setLeftHover(false)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: leftHover ? '220px' : '40px',
          height: '100%',
          zIndex: 9,
        }}
      >
        <SidebarPanel collapsed={!leftHover} />
      </div>

      <div
        onMouseEnter={() => setRightHover(true)}
        onMouseLeave={() => setRightHover(false)}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: rightHover ? '240px' : '40px',
          height: '100%',
          zIndex: 9,
        }}
      >
        <AttributePanel collapsed={!rightHover} />
      </div>

      <TopToolbar />
      <HintBar />
    </>
  )
}
