import React, { useState, useRef, useEffect } from 'react'
import { Star, useSimulationStore } from './store'
import { createStar, getVelocityMagnitude } from '../module1/star-manager'

interface SliderInputProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  color: string
  onChange: (value: number) => void
}

const SliderInput: React.FC<SliderInputProps> = ({
  label,
  value,
  min,
  max,
  step,
  color,
  onChange,
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value))
  }

  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div style={{ marginBottom: '10px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '4px',
        }}
      >
        <span style={{ fontSize: '12px', color: '#e0e0ff' }}>{label}</span>
        <input
          type="number"
          value={value.toFixed(2)}
          onChange={handleInputChange}
          min={min}
          max={max}
          step={step}
          style={{
            width: '60px',
            textAlign: 'right',
            background: '#1a1a2e',
            border: '1px solid #3a3a5c',
            borderRadius: '4px',
            color: '#e0e0ff',
            padding: '2px 6px',
            fontSize: '12px',
          }}
        />
      </div>
      <div style={{ position: 'relative', height: '20px' }}>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '0',
            right: '0',
            height: '6px',
            transform: 'translateY(-50%)',
            background: '#3a3a5c',
            borderRadius: '3px',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '0',
            width: `${percentage}%`,
            height: '6px',
            transform: 'translateY(-50%)',
            background: color,
            borderRadius: '3px',
            opacity: 0.5,
          }}
        />
        <input
          type="range"
          value={value}
          onChange={handleInputChange}
          min={min}
          max={max}
          step={step}
          style={{
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `calc(${percentage}% - 8px)`,
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: color,
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            boxShadow: `0 0 6px ${color}`,
          }}
        />
      </div>
    </div>
  )
}

interface Vector3InputProps {
  label: string
  value: { x: number; y: number; z: number }
  min: number
  max: number
  step: number
  color: string
  onChange: (value: { x: number; y: number; z: number }) => void
}

const Vector3Input: React.FC<Vector3InputProps> = ({
  label,
  value,
  min,
  max,
  step,
  color,
  onChange,
}) => {
  return (
    <div style={{ marginBottom: '10px' }}>
      <div
        style={{
          fontSize: '12px',
          color: '#e0e0ff',
          marginBottom: '6px',
          fontWeight: '500',
        }}
      >
        {label}
      </div>
      <SliderInput
        label="X"
        value={value.x}
        min={min}
        max={max}
        step={step}
        color={color}
        onChange={(x) => onChange({ ...value, x })}
      />
      <SliderInput
        label="Y"
        value={value.y}
        min={min}
        max={max}
        step={step}
        color={color}
        onChange={(y) => onChange({ ...value, y })}
      />
      <SliderInput
        label="Z"
        value={value.z}
        min={min}
        max={max}
        step={step}
        color={color}
        onChange={(z) => onChange({ ...value, z })}
      />
    </div>
  )
}

interface StarListItemProps {
  star: Star
  isExpanded: boolean
  onToggle: () => void
  onUpdate: (updates: Partial<Star>) => void
  onRemove: () => void
}

const StarListItem: React.FC<StarListItemProps> = ({
  star,
  isExpanded,
  onToggle,
  onUpdate,
  onRemove,
}) => {
  return (
    <div
      style={{
        background: '#2a2a4a',
        borderRadius: '8px',
        marginBottom: '8px',
        overflow: 'hidden',
      }}
    >
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px 12px',
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')
        }
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <div
          style={{
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
            marginRight: '10px',
            color: '#e0e0ff',
            fontSize: '12px',
          }}
        >
          ▶
        </div>
        <div
          style={{
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: star.color,
            marginRight: '10px',
            boxShadow: `0 0 8px ${star.color}`,
          }}
        />
        <span style={{ flex: 1, color: '#e0e0ff', fontSize: '13px' }}>
          {star.name}
        </span>
        <span style={{ color: '#888', fontSize: '11px' }}>
          {star.mass.toFixed(1)} M☉
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          style={{
            marginLeft: '10px',
            background: 'transparent',
            border: 'none',
            color: '#ff6b6b',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0 4px',
          }}
        >
          ×
        </button>
      </div>
      <div
        style={{
          maxHeight: isExpanded ? '500px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}
      >
        <div
          style={{
            padding: '0 12px 12px',
            borderTop: '1px solid #3a3a5c',
          }}
        >
          <div style={{ marginTop: '12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '10px',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  color: '#e0e0ff',
                  marginRight: '10px',
                }}
              >
                颜色
              </span>
              <input
                type="color"
                value={star.color}
                onChange={(e) => onUpdate({ color: e.target.value })}
                style={{
                  width: '30px',
                  height: '24px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  background: 'transparent',
                }}
              />
            </div>
          </div>

          <SliderInput
            label="质量 (M☉)"
            value={star.mass}
            min={0.1}
            max={100}
            step={0.1}
            color={star.color}
            onChange={(mass) => onUpdate({ mass })}
          />

          <Vector3Input
            label="初始位置"
            value={star.position}
            min={-50}
            max={50}
            step={0.5}
            color={star.color}
            onChange={(position) => onUpdate({ position })}
          />

          <Vector3Input
            label="初始速度"
            value={star.velocity}
            min={-10}
            max={10}
            step={0.1}
            color={star.color}
            onChange={(velocity) => onUpdate({ velocity })}
          />
        </div>
      </div>
    </div>
  )
}

interface EnergyChartProps {
  stars: Star[]
  energyHistory: Array<{
    time: number
    kinetic: number
    potential: number
    total: number
    perStar: { [starId: string]: number }
  }>
}

const EnergyChart: React.FC<EnergyChartProps> = ({ stars, energyHistory }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = canvas.width
    const height = canvas.height

    ctx.clearRect(0, 0, width, height)

    const padding = { top: 20, right: 10, bottom: 30, left: 50 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1

    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(width - padding.right, y)
      ctx.stroke()
    }

    for (let i = 0; i <= 5; i++) {
      const x = padding.left + (chartWidth / 5) * i
      ctx.beginPath()
      ctx.moveTo(x, padding.top)
      ctx.lineTo(x, height - padding.bottom)
      ctx.stroke()
    }

    if (energyHistory.length < 2) {
      ctx.fillStyle = '#888'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('暂无数据', width / 2, height / 2)
      return
    }

    let maxEnergy = -Infinity
    let minEnergy = Infinity
    for (const point of energyHistory) {
      maxEnergy = Math.max(maxEnergy, point.kinetic, point.total)
      minEnergy = Math.min(minEnergy, point.potential, point.total)
    }

    if (maxEnergy === minEnergy) {
      maxEnergy += 1
      minEnergy -= 1
    }

    const energyRange = maxEnergy - minEnergy

    const drawLine = (
      data: number[],
      color: string,
      lineWidth: number = 2
    ) => {
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.beginPath()
      for (let i = 0; i < data.length; i++) {
        const x =
          padding.left +
          (chartWidth / (energyHistory.length - 1)) * i
        const y =
          padding.top +
          chartHeight -
          ((data[i] - minEnergy) / energyRange) * chartHeight
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()
    }

    const kineticData = energyHistory.map((p) => p.kinetic)
    const potentialData = energyHistory.map((p) => p.potential)
    const totalData = energyHistory.map((p) => p.total)

    drawLine(kineticData, '#4ecdc4', 2)
    drawLine(potentialData, '#ff6b6b', 2)
    drawLine(totalData, '#ffe66d', 2)

    ctx.fillStyle = '#e0e0ff'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'right'

    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i
      const value = maxEnergy - (energyRange / 5) * i
      ctx.fillText(value.toFixed(1), padding.left - 5, y + 3)
    }

    ctx.textAlign = 'center'
    ctx.fillText(
      '时间 (s)',
      width / 2,
      height - 10
    )

    ctx.textAlign = 'left'
    const legendY = 8
    const legends = [
      { color: '#4ecdc4', label: '动能' },
      { color: '#ff6b6b', label: '势能' },
      { color: '#ffe66d', label: '总能量' },
    ]
    let legendX = padding.left
    for (const legend of legends) {
      ctx.fillStyle = legend.color
      ctx.fillRect(legendX, legendY, 12, 12)
      ctx.fillStyle = '#e0e0ff'
      ctx.fillText(legend.label, legendX + 16, legendY + 10)
      legendX += 60
    }
  }, [energyHistory, stars])

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={200}
      style={{ width: '100%', height: '200px', borderRadius: '8px' }}
    />
  )
}

type TabType = 'stars' | 'simulation' | 'energy'

export const UIPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('stars')
  const [expandedStars, setExpandedStars] = useState<Set<string>>(new Set())
  const [isEnergyExpanded, setIsEnergyExpanded] = useState(true)
  const [fadeIn, setFadeIn] = useState(true)

  const stars = useSimulationStore((state) => state.stars)
  const isSimulating = useSimulationStore((state) => state.isSimulating)
  const energyHistory = useSimulationStore((state) => state.energyHistory)
  const addStar = useSimulationStore((state) => state.addStar)
  const removeStar = useSimulationStore((state) => state.removeStar)
  const updateStar = useSimulationStore((state) => state.updateStar)
  const setSimulating = useSimulationStore((state) => state.setSimulating)
  const resetSimulation = useSimulationStore((state) => state.resetSimulation)

  const handleTabChange = (tab: TabType) => {
    setFadeIn(false)
    setTimeout(() => {
      setActiveTab(tab)
      setFadeIn(true)
    }, 150)
  }

  const toggleStarExpand = (id: string) => {
    setExpandedStars((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const handleAddStar = () => {
    const newStar = createStar()
    addStar(newStar)
    setExpandedStars((prev) => new Set(prev).add(newStar.id))
  }

  const tabButtonStyle = (tab: TabType) => ({
    flex: 1,
    padding: '10px 0',
    border: 'none',
    background: activeTab === tab ? '#2a2a4a' : 'transparent',
    color: activeTab === tab ? '#e0e0ff' : '#888',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    borderBottom: `2px solid ${activeTab === tab ? '#4ecdc4' : 'transparent'}`,
  })

  return (
    <div
      className="control-panel"
      style={{
        position: 'absolute',
        left: '0',
        bottom: '0',
        top: '0',
        width: '320px',
        background: 'rgba(26, 26, 46, 0.85)',
        backdropFilter: 'blur(10px)',
        borderTopLeftRadius: '12px',
        borderBottomLeftRadius: '12px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        color: '#e0e0ff',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #3a3a5c',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 600,
            color: '#e0e0ff',
          }}
        >
          🌌 星体运动模拟
        </h2>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #3a3a5c' }}>
        <button
          onClick={() => handleTabChange('stars')}
          style={tabButtonStyle('stars')}
        >
          星体管理
        </button>
        <button
          onClick={() => handleTabChange('simulation')}
          style={tabButtonStyle('simulation')}
        >
          模拟控制
        </button>
        <button
          onClick={() => handleTabChange('energy')}
          style={tabButtonStyle('energy')}
        >
          能量分析
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          opacity: fadeIn ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      >
        {activeTab === 'stars' && (
          <div>
            <button
              onClick={handleAddStar}
              style={{
                width: '100%',
                padding: '10px',
                background: '#4ecdc4',
                color: '#1a1a2e',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: '16px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = '#45b7aa')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = '#4ecdc4')
              }
            >
              + 添加星体
            </button>

            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
              共 {stars.length} 颗星体
            </div>

            <div>
              {stars.map((star) => (
                <StarListItem
                  key={star.id}
                  star={star}
                  isExpanded={expandedStars.has(star.id)}
                  onToggle={() => toggleStarExpand(star.id)}
                  onUpdate={(updates) => updateStar(star.id, updates)}
                  onRemove={() => removeStar(star.id)}
                />
              ))}
              {stars.length === 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    color: '#666',
                    padding: '40px 0',
                    fontSize: '13px',
                  }}
                >
                  暂无星体，点击上方按钮添加
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'simulation' && (
          <div>
            <div
              style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '20px',
              }}
            >
              <button
                onClick={() => setSimulating(!isSimulating)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: isSimulating ? '#ffe66d' : '#4ecdc4',
                  color: '#1a1a2e',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {isSimulating ? '⏸ 暂停' : '▶ 开始模拟'}
              </button>
              <button
                onClick={resetSimulation}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#ff6b6b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                ↻ 重置
              </button>
            </div>

            <div
              style={{
                background: '#2a2a4a',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  color: '#888',
                  marginBottom: '8px',
                }}
              >
                模拟状态
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '14px',
                  marginBottom: '6px',
                }}
              >
                <span>状态</span>
                <span
                  style={{
                    color: isSimulating ? '#4ecdc4' : '#ff6b6b',
                    fontWeight: 600,
                  }}
                >
                  {isSimulating ? '运行中' : '已暂停'}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '14px',
                }}
              >
                <span>模拟时间</span>
                <span style={{ fontWeight: 600 }}>
                  {useSimulationStore.getState().time.toFixed(2)} s
                </span>
              </div>
            </div>

            <div
              style={{
                background: '#2a2a4a',
                borderRadius: '8px',
                padding: '16px',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  color: '#888',
                  marginBottom: '8px',
                }}
              >
                操作说明
              </div>
              <div style={{ fontSize: '12px', color: '#e0e0ff', lineHeight: 1.8 }}>
                <div>🖱️ 左键拖拽：旋转视角</div>
                <div>🖱️ 滚轮：缩放视角</div>
                <div>🖱️ 右键拖拽：平移视角</div>
                <div>✨ 悬停星体：查看详情</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'energy' && (
          <div>
            <div
              onClick={() => setIsEnergyExpanded(!isEnergyExpanded)}
              style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '8px 0',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  transform: isEnergyExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease',
                  marginRight: '10px',
                  color: '#e0e0ff',
                  fontSize: '12px',
                }}
              >
                ▶
              </div>
              <span style={{ fontSize: '14px', fontWeight: 500 }}>
                能量变化曲线
              </span>
            </div>

            <div
              style={{
                maxHeight: isEnergyExpanded ? '600px' : '0',
                overflow: 'hidden',
                transition: 'max-height 0.3s ease',
              }}
            >
              <EnergyChart stars={stars} energyHistory={energyHistory} />
            </div>

            <div
              style={{
                marginTop: '16px',
                background: '#2a2a4a',
                borderRadius: '8px',
                padding: '12px',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  color: '#888',
                  marginBottom: '8px',
                }}
              >
                各星体动能
              </div>
              {stars.map((star) => {
                const lastPoint = energyHistory[energyHistory.length - 1]
                const ke = lastPoint?.perStar?.[star.id] || 0
                return (
                  <div
                    key={star.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px',
                      padding: '4px 0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: star.color,
                          marginRight: '8px',
                        }}
                      />
                      <span>{star.name}</span>
                    </div>
                    <span style={{ fontFamily: 'monospace' }}>
                      {ke.toFixed(2)}
                    </span>
                  </div>
                )
              })}
              {stars.length === 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    color: '#666',
                    fontSize: '12px',
                    padding: '20px 0',
                  }}
                >
                  暂无数据
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
