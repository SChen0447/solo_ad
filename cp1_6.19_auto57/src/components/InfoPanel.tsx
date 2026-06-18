import React from 'react'
import { useStore, LayerType } from '@/store'

const getTypeLabel = (type: LayerType): { label: string; color: string } => {
  switch (type) {
    case 'bone':
      return { label: '骨骼', color: '#f5f5dc' }
    case 'muscle':
      return { label: '肌肉', color: '#cd5c5c' }
    case 'vessel':
      return { label: '血管', color: '#b22222' }
  }
}

const InfoPanel: React.FC = () => {
  const selectedPartId = useStore((s) => s.selectedPartId)
  const getPartById = useStore((s) => s.getPartById)
  const setSelectedPart = useStore((s) => s.setSelectedPart)

  const selected = selectedPartId ? getPartById(selectedPartId) : undefined

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  }

  const headerStyle: React.CSSProperties = {
    padding: '16px 18px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  }

  const titleStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: '#00d4ff',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  }

  if (!selected) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <span style={titleStyle}>部件信息</span>
        </div>
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(0,212,255,0.1)',
            border: '1px solid rgba(0,212,255,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            fontSize: '28px',
          }}>
            🔬
          </div>
          <div style={{
            color: '#a0a0a0',
            fontSize: '12px',
            fontWeight: 300,
            lineHeight: 1.8,
          }}>
            点击部件查看详情
          </div>
          <div style={{
            marginTop: '16px',
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.06)',
            color: '#707070',
            fontSize: '11px',
            lineHeight: 1.7,
          }}>
            提示：点击模型上的骨骼、肌肉
            <br />或血管以查看详细信息
          </div>
        </div>
      </div>
    )
  }

  const typeInfo = getTypeLabel(selected.type)

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <span style={titleStyle}>部件信息</span>
        <button
          onClick={() => setSelectedPart(null)}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.04)',
            color: '#a0a0a0',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,107,107,0.15)'
            e.currentTarget.style.borderColor = 'rgba(255,107,107,0.4)'
            e.currentTarget.style.color = '#ff6b6b'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
            e.currentTarget.style.color = '#a0a0a0'
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px' }}>
        {/* Type badge */}
        <div style={{ marginBottom: '18px', display: 'flex', gap: '8px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            background: `${typeInfo.color}15`,
            border: `1px solid ${typeInfo.color}40`,
            borderRadius: '16px',
            fontSize: '12px',
            color: typeInfo.color,
            fontWeight: 500,
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: typeInfo.color,
              boxShadow: `0 0 8px ${typeInfo.color}`,
            }} />
            {typeInfo.label}
          </span>
        </div>

        {/* Name section */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#e0e0e0',
            marginBottom: '6px',
            lineHeight: 1.3,
          }}>
            {selected.name}
          </div>
          <div style={{
            fontSize: '13px',
            color: '#00d4ff',
            fontWeight: 400,
            fontStyle: 'italic',
            letterSpacing: '0.3px',
          }}>
            {selected.nameEn}
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            fontSize: '11px',
            color: '#a0a0a0',
            fontWeight: 600,
            marginBottom: '10px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>
            功能简介
          </div>
          <div style={{
            fontSize: '14px',
            color: '#d0d0d0',
            lineHeight: 1.8,
            fontWeight: 400,
          }}>
            {selected.description}
          </div>
        </div>

        {/* Key Data */}
        <div>
          <div style={{
            fontSize: '11px',
            color: '#a0a0a0',
            fontWeight: 600,
            marginBottom: '10px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>
            关键数据
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            {Object.entries(selected.data).map(([key, value]) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '11px 14px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  gap: '12px',
                }}
              >
                <span style={{
                  fontSize: '13px',
                  color: '#a0a0a0',
                  flexShrink: 0,
                  fontWeight: 400,
                }}>
                  {key}
                </span>
                <span style={{
                  fontSize: '13px',
                  color: '#e0e0e0',
                  fontWeight: 500,
                  textAlign: 'right',
                  lineHeight: 1.6,
                }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default InfoPanel
