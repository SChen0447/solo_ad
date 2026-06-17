import React, { useMemo, useState, useEffect, useRef } from 'react'
import type { TargetMarkerData } from './TargetMarker'
import { TARGET_LABELS, TargetMarkerApi } from './TargetMarker'
import { sonarApi } from '../../services/sonarApi'

interface SidePanelProps {
  currentDepth: number
  waterTemperature: number
  targets: TargetMarkerData[]
  shipPosition: { x: number; z: number }
  onTargetClick: (target: TargetMarkerData) => void
  onHighlightClick: (targetId: string) => void
}

const SidePanel: React.FC<SidePanelProps> = ({
  currentDepth,
  waterTemperature,
  targets,
  shipPosition,
  onTargetClick,
  onHighlightClick,
}) => {
  const [depthFlash, setDepthFlash] = useState(false)
  const prevDepthRef = useRef(currentDepth)
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (currentDepth !== prevDepthRef.current) {
      prevDepthRef.current = currentDepth
      setDepthFlash(true)
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current)
      }
      flashTimeoutRef.current = setTimeout(() => {
        setDepthFlash(false)
      }, 400)
    }
  }, [currentDepth])

  const sortedTargets = useMemo(() => {
    return [...targets].sort((a, b) => b.createdAt - a.createdAt)
  }, [targets])

  const handleExportTerrain = async () => {
    try {
      const objContent = await sonarApi.exportTerrain()
      const blob = new Blob([objContent], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `terrain_${Date.now()}.obj`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export terrain:', error)
    }
  }

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: '20px',
    right: '20px',
    width: '280px',
    maxHeight: 'calc(100% - 40px)',
    overflowY: 'auto',
    padding: '20px',
    backgroundColor: 'rgba(10, 19, 47, 0.85)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(0, 191, 255, 0.25)',
    borderRadius: '8px',
    boxShadow: '0 0 30px rgba(0, 191, 255, 0.08), inset 0 0 30px rgba(0, 0, 0, 0.3)',
    color: '#ffffff',
    fontFamily: "'JetBrains Mono', monospace",
    zIndex: 10,
  }

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#00BFFF',
    letterSpacing: '1px',
    textTransform: 'uppercase' as const,
    marginBottom: '10px',
    fontWeight: 700,
  }

  const dataBoxStyle: React.CSSProperties = {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    border: '1px solid rgba(0, 191, 255, 0.1)',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '10px',
    color: '#88aacc',
    marginBottom: '4px',
  }

  const valueStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: '2px',
  }

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'rgba(0, 191, 255, 0.5)',
    color: '#ffffff',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.3s ease-in-out',
    letterSpacing: '0.5px',
  }

  const targetItemStyle: React.CSSProperties = {
    padding: '10px 12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    border: '1px solid rgba(0, 191, 255, 0.1)',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease-in-out',
  }

  const targetNameStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: '#ffffff',
    marginBottom: '3px',
  }

  const targetMetaStyle: React.CSSProperties = {
    fontSize: '10px',
    color: '#88aacc',
    display: 'flex',
    justifyContent: 'space-between',
  }

  return (
    <div style={panelStyle}>
      <div style={{ marginBottom: '20px' }}>
        <h2
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#00BFFF',
            marginBottom: '4px',
            letterSpacing: '1px',
          }}
        >
          深海回声测距仪
        </h2>
        <div
          style={{
            fontSize: '10px',
            color: '#557799',
            letterSpacing: '0.5px',
          }}
        >
          DEEP SEA ECHO SOUNDER v1.0
        </div>
      </div>

      <div>
        <div style={sectionTitleStyle}>探测数据</div>

        <div
          style={{
            ...dataBoxStyle,
            transition: 'all 0.3s ease-in-out',
            backgroundColor: depthFlash ? 'rgba(0, 191, 255, 0.2)' : 'rgba(0, 0, 0, 0.25)',
            borderColor: depthFlash ? 'rgba(0, 191, 255, 0.6)' : 'rgba(0, 191, 255, 0.1)',
            boxShadow: depthFlash ? '0 0 20px rgba(0, 191, 255, 0.3)' : 'none',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <div style={labelStyle}>当前深度 (m)</div>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: depthFlash ? '#00BFFF' : '#335577',
                boxShadow: depthFlash ? '0 0 8px #00BFFF, 0 0 16px #00BFFF' : 'none',
                transition: 'all 0.2s ease-in-out',
              }}
              title={depthFlash ? '声纳扫描中' : '等待脉冲'}
            />
          </div>
          <div
            style={{
              ...valueStyle,
              color: depthFlash ? '#00FFFF' : '#ffffff',
              textShadow: depthFlash ? '0 0 10px rgba(0, 255, 255, 0.6)' : 'none',
              transition: 'all 0.3s ease-in-out',
            }}
          >
            {String(Math.floor(currentDepth)).padStart(3, '0')}
            <span
              style={{
                fontSize: '14px',
                color: depthFlash ? '#00CCCC' : '#88aacc',
                marginLeft: '4px',
                transition: 'all 0.3s ease-in-out',
              }}
            >
              .{String(Math.floor((currentDepth % 1) * 10)).padStart(1, '0')}
            </span>
          </div>
        </div>

        <div style={dataBoxStyle}>
          <div style={labelStyle}>水温 (°C)</div>
          <div style={{ ...valueStyle, fontSize: '20px' }}>
            {waterTemperature.toFixed(1)}
          </div>
        </div>

        <div style={dataBoxStyle}>
          <div style={labelStyle}>船舶坐标</div>
          <div style={{ fontSize: '13px', color: '#ffffff', letterSpacing: '0.5px' }}>
            X: {shipPosition.x.toFixed(1)} &nbsp; Z: {shipPosition.z.toFixed(1)}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <div style={sectionTitleStyle}>
          目标列表 ({sortedTargets.length})
        </div>

        <div style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '8px' }}>
          {sortedTargets.length === 0 ? (
            <div
              style={{
                fontSize: '11px',
                color: '#556677',
                textAlign: 'center',
                padding: '20px 0',
                fontStyle: 'italic',
              }}
            >
              暂无探测目标
              <br />
              <span style={{ fontSize: '10px' }}>双击场景添加标记</span>
            </div>
          ) : (
            sortedTargets.map(target => {
              const distance = TargetMarkerApi.calculateDistance(
                target,
                shipPosition.x,
                shipPosition.z
              )
              return (
                <div
                  key={target.id}
                  style={{
                    ...targetItemStyle,
                    padding: '10px 12px 10px 12px',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 191, 255, 0.15)'
                    e.currentTarget.style.borderColor = 'rgba(0, 191, 255, 0.4)'
                    e.currentTarget.style.transform = 'translateX(-2px)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.25)'
                    e.currentTarget.style.borderColor = 'rgba(0, 191, 255, 0.1)'
                    e.currentTarget.style.transform = 'translateX(0)'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '3px',
                    }}
                  >
                    <div
                      onClick={() => onTargetClick(target)}
                      style={{ ...targetNameStyle, cursor: 'pointer', flex: 1 }}
                    >
                      {target.name}
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        onHighlightClick(target.id)
                      }}
                      title="在场景中高亮此目标"
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 193, 7, 0.4)',
                        backgroundColor: 'rgba(255, 193, 7, 0.15)',
                        color: '#FFD700',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease-in-out',
                        marginLeft: '8px',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 193, 7, 0.35)'
                        e.currentTarget.style.borderColor = 'rgba(255, 193, 7, 0.7)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 193, 7, 0.15)'
                        e.currentTarget.style.borderColor = 'rgba(255, 193, 7, 0.4)'
                      }}
                      onMouseDown={e => {
                        e.currentTarget.style.transform = 'scale(0.95)'
                      }}
                      onMouseUp={e => {
                        e.currentTarget.style.transform = 'scale(1)'
                      }}
                    >
                      ✦ 高亮
                    </button>
                  </div>
                  <div
                    onClick={() => onTargetClick(target)}
                    style={{ ...targetMetaStyle, cursor: 'pointer' }}
                  >
                    <span>{TARGET_LABELS[target.type]}</span>
                    <span>距离 {distance.toFixed(1)}m</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <div style={sectionTitleStyle}>操作</div>

        <button
          style={buttonStyle}
          onClick={handleExportTerrain}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 191, 255, 0.75)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 191, 255, 0.5)'
          }}
          onMouseDown={e => {
            e.currentTarget.style.transform = 'scale(0.95)'
          }}
          onMouseUp={e => {
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          导出地形 OBJ
        </button>

        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(0, 191, 255, 0.08)',
            fontSize: '10px',
            lineHeight: '1.6',
            color: '#557799',
          }}
        >
          <div style={{ color: '#00BFFF', marginBottom: '6px', fontSize: '10px' }}>
            操作指南
          </div>
          <div>• 鼠标拖拽：旋转视角</div>
          <div>• 滚轮：缩放视图</div>
          <div>• W/S 键：船舶前后移动</div>
          <div>• 双击场景：添加目标标记</div>
        </div>
      </div>
    </div>
  )
}

export default SidePanel
