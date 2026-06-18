import { useEffect, useRef, useState } from 'react'
import { useControls, button, Leva } from 'leva'
import { useStore } from '../store'

export function ControlPanel() {
  const params = useStore((s) => s.params)
  const setParams = useStore((s) => s.setParams)
  const resetSimulation = useStore((s) => s.resetSimulation)
  const nodeCount = useStore((s) => s.nodes.length)
  const selectedCount = useStore((s) => s.selectedNodeIds.size)

  const gravityRef = useRef(params.gravityConstant)
  const repulsionRef = useRef(params.repulsionCoefficient)
  const resolutionRef = useRef(params.gridResolution)
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    gravityRef.current = params.gravityConstant
    repulsionRef.current = params.repulsionCoefficient
    resolutionRef.current = params.gridResolution
  }, [params])

  const { gravity, repulsion, resolution } = useControls({
    '⚙️ 模拟参数': { value: undefined, editable: false, label: false },
    gravity: {
      value: params.gravityConstant,
      min: 0.1,
      max: 5.0,
      step: 0.1,
      label: '🌐 引力常数',
      onChange: (v) => {
        const lerped = lerp(gravityRef.current, v, 0.15)
        setParams({ gravityConstant: lerped })
      },
    },
    repulsion: {
      value: params.repulsionCoefficient,
      min: 0.1,
      max: 3.0,
      step: 0.1,
      label: '⚡ 斥力系数',
      onChange: (v) => {
        const lerped = lerp(repulsionRef.current, v, 0.15)
        setParams({ repulsionCoefficient: lerped })
      },
    },
    resolution: {
      value: params.gridResolution,
      min: 10,
      max: 50,
      step: 1,
      label: '🌌 网格分辨率',
      onChange: (v) => {
        const lerped = Math.round(lerp(resolutionRef.current, v, 0.2))
        setParams({ gridResolution: lerped })
      },
    },
    reset: button(() => {
      resetSimulation()
      setTimeout(() => forceUpdate((n) => n + 1), 50)
    }, {
      label: '🔄 重置场景',
    }),
  }, [params.gravityConstant, params.repulsionCoefficient, params.gridResolution])

  return (
    <>
      <Leva
        titleBar={{
          title: '🎨 重力场雕塑家',
          filter: true,
          drag: true,
        }}
        collapsed={false}
        flat
        oneLineLabels
      />

      <div
        style={{
          position: 'fixed',
          left: '20px',
          bottom: '20px',
          zIndex: 100,
          padding: '14px 18px',
          background: 'rgba(15, 15, 40, 0.72)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          color: '#aabbdd',
          fontSize: '12.5px',
          lineHeight: '1.8',
          maxWidth: '280px',
        }}
      >
        <div style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#ffeecc',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          📖 操作指南
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div>🖱️ <span style={{ color: '#ffffff' }}>左键空白</span>：呼出菜单创建节点</div>
          <div>✋ <span style={{ color: '#ffffff' }}>拖拽节点</span>：实时改变力场</div>
          <div>🔗 <span style={{ color: '#ffffff' }}>Ctrl+点击</span>：多选节点</div>
          <div>🗑️ <span style={{ color: '#ffffff' }}>Delete键</span>：删除选中节点</div>
          <div>🔄 <span style={{ color: '#ffffff' }}>鼠标滚轮</span>：缩放视图</div>
        </div>
        <div style={{
          marginTop: '12px',
          paddingTop: '10px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          gap: '12px',
        }}>
          <div>
            <span style={{ color: '#ff9966' }}>●</span> 节点
            <span style={{ color: '#ffffff', marginLeft: '4px', fontWeight: 600 }}>{nodeCount}</span>
          </div>
          <div>
            <span style={{ color: '#66aaff' }}>◆</span> 选中
            <span style={{ color: '#ffffff', marginLeft: '4px', fontWeight: 600 }}>{selectedCount}</span>
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          padding: '10px 24px',
          background: 'linear-gradient(135deg, rgba(136, 102, 255, 0.25), rgba(255, 119, 170, 0.2))',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: '100px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 20px rgba(136, 102, 255, 0.2)',
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: 500,
          letterSpacing: '0.5px',
          pointerEvents: 'none',
        }}
      >
        ✨ 放置节点，编织属于你的宇宙雕塑
      </div>
    </>
  )
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
