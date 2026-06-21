import React, { useState } from 'react'
import { CanvasElement, BorderStyle } from '../types'
import { Lock, Unlock, Palette, Layout, Trash2, Square, Type, Minus, Calendar } from 'lucide-react'

interface ToolPanelProps {
  selectedElement: CanvasElement | null
  selectedCount: number
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void
  onToggleLock: (id: string) => void
  onDeleteElement: (id: string) => void
  onAddElement: (type: 'rect' | 'text' | 'line' | 'dateLabel') => void
  onExportPNG: () => void
  onSaveTemplate: (name: string) => void
  templates: Array<{ id: string; name: string; thumbnail: string }>
  onLoadTemplate: (id: string) => void
  onDeleteTemplate: (id: string) => void
  isExporting: boolean
}

const PRESET_COLORS = [
  '#FFFFFF', '#F9FAFB', '#F3F4F6', '#E5E7EB',
  '#EFF6FF', '#DBEAFE', '#BFDBFE', '#93C5FD',
  '#FEF3C7', '#FDE68A', '#FCD34D', '#FBBF24',
  '#FCE7F3', '#FBCFE8', '#F9A8D4', '#F472B6',
  '#DCFCE7', '#BBF7D0', '#86EFAC', '#4ADE80',
  '#FEE2E2', '#FECACA', '#FCA5A5', '#F87171',
]

type TabType = 'styles' | 'layout'

const panelStyle: React.CSSProperties = {
  width: 280,
  backgroundColor: '#F3F4F6',
  borderTopLeftRadius: 12,
  borderBottomLeftRadius: 12,
  boxShadow: 'inset 1px 0 3px rgba(0,0,0,0.05), -4px 0 12px rgba(0,0,0,0.08)',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
}

const sectionStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid #E5E7EB',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: '#6B7280',
  marginBottom: 6,
  display: 'block',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  fontSize: 13,
  border: '1px solid #D1D5DB',
  borderRadius: 6,
  backgroundColor: '#FFFFFF',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

const inputDisabledStyle: React.CSSProperties = {
  ...inputStyle,
  backgroundColor: '#F3F4F6',
  color: '#9CA3AF',
  cursor: 'not-allowed',
}

const buttonStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 13,
  fontWeight: 500,
  border: '1px solid #D1D5DB',
  borderRadius: 6,
  backgroundColor: '#FFFFFF',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  transition: 'all 0.15s',
}

const buttonHoverStyle = `
  .tp-btn:hover {
    background-color: #F9FAFB;
    border-color: #9CA3AF;
  }
`

export default function ToolPanel({
  selectedElement,
  selectedCount,
  onUpdateElement,
  onToggleLock,
  onDeleteElement,
  onAddElement,
  onExportPNG,
  onSaveTemplate,
  isExporting,
}: ToolPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('styles')
  const [templateName, setTemplateName] = useState('')

  const elementTypeLabels: Record<string, string> = {
    rect: '矩形',
    text: '文本',
    line: '线条',
    dateLabel: '日期标签',
  }

  const handleNumberInput = (key: keyof CanvasElement, value: string) => {
    if (!selectedElement) return
    const num = parseFloat(value)
    if (!isNaN(num)) {
      onUpdateElement(selectedElement.id, { [key]: num })
    }
  }

  const handleTextInput = (key: keyof CanvasElement, value: string) => {
    if (!selectedElement) return
    onUpdateElement(selectedElement.id, { [key]: value })
  }

  const handleSaveTemplate = () => {
    if (templateName.trim()) {
      onSaveTemplate(templateName.trim())
      setTemplateName('')
    }
  }

  const renderAddButtons = () => (
    <div style={sectionStyle}>
      <div style={{ ...labelStyle, marginBottom: 10 }}>添加元素</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button
          className="tp-btn"
          style={buttonStyle}
          onClick={() => onAddElement('rect')}
        >
          <Square size={14} color="#374151" />
          <span>矩形</span>
        </button>
        <button
          className="tp-btn"
          style={buttonStyle}
          onClick={() => onAddElement('text')}
        >
          <Type size={14} color="#374151" />
          <span>文本</span>
        </button>
        <button
          className="tp-btn"
          style={buttonStyle}
          onClick={() => onAddElement('line')}
        >
          <Minus size={14} color="#374151" />
          <span>线条</span>
        </button>
        <button
          className="tp-btn"
          style={buttonStyle}
          onClick={() => onAddElement('dateLabel')}
        >
          <Calendar size={14} color="#374151" />
          <span>日期</span>
        </button>
      </div>
      <style>{buttonHoverStyle}</style>
    </div>
  )

  const renderEmptyState = () => (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      textAlign: 'center',
    }}>
      <div style={{ color: '#9CA3AF', fontSize: 13, lineHeight: 1.6 }}>
        <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>✎</div>
        <div>点击画布中的元素</div>
        <div>可进行样式和布局编辑</div>
      </div>
    </div>
  )

  const renderTabBar = () => (
    <div style={{
      display: 'flex',
      borderBottom: '1px solid #E5E7EB',
      backgroundColor: '#F9FAFB',
    }}>
      <button
        onClick={() => setActiveTab('styles')}
        style={{
          flex: 1,
          padding: '10px 12px',
          border: 'none',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          fontSize: 13,
          fontWeight: activeTab === 'styles' ? 600 : 400,
          color: activeTab === 'styles' ? '#3B82F6' : '#6B7280',
          borderBottom: activeTab === 'styles' ? '2px solid #3B82F6' : '2px solid transparent',
          transition: 'all 0.15s',
        }}
      >
        <Palette size={14} />
        样式
      </button>
      <button
        onClick={() => setActiveTab('layout')}
        style={{
          flex: 1,
          padding: '10px 12px',
          border: 'none',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          fontSize: 13,
          fontWeight: activeTab === 'layout' ? 600 : 400,
          color: activeTab === 'layout' ? '#3B82F6' : '#6B7280',
          borderBottom: activeTab === 'layout' ? '2px solid #3B82F6' : '2px solid transparent',
          transition: 'all 0.15s',
        }}
      >
        <Layout size={14} />
        布局
      </button>
    </div>
  )

  const renderLayoutTab = () => {
    if (!selectedElement) return null
    const isLocked = selectedElement.locked
    const currentStyle = isLocked ? inputDisabledStyle : inputStyle

    return (
      <div
        key="layout"
        style={{
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          animation: 'slideInRight 0.25s ease-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1F2937' }}>
            {elementTypeLabels[selectedElement.type]}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => onToggleLock(selectedElement.id)}
              style={{
                padding: 6,
                border: '1px solid #D1D5DB',
                borderRadius: 6,
                backgroundColor: isLocked ? '#FEF3C7' : '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              title={isLocked ? '解锁' : '锁定'}
            >
              {isLocked ? <Lock size={14} color="#B45309" /> : <Unlock size={14} color="#6B7280" />}
            </button>
            <button
              onClick={() => onDeleteElement(selectedElement.id)}
              style={{
                padding: 6,
                border: '1px solid #FECACA',
                borderRadius: 6,
                backgroundColor: '#FEF2F2',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              title="删除元素"
            >
              <Trash2 size={14} color="#DC2626" />
            </button>
          </div>
        </div>

        <div>
          <label style={labelStyle}>位置</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>X</div>
              <input
                type="number"
                style={currentStyle}
                value={selectedElement.x}
                disabled={isLocked}
                onChange={(e) => handleNumberInput('x', e.target.value)}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Y</div>
              <input
                type="number"
                style={currentStyle}
                value={selectedElement.y}
                disabled={isLocked}
                onChange={(e) => handleNumberInput('y', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div>
          <label style={labelStyle}>尺寸</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>宽度</div>
              <input
                type="number"
                style={currentStyle}
                value={selectedElement.width}
                disabled={isLocked}
                onChange={(e) => handleNumberInput('width', e.target.value)}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>高度</div>
              <input
                type="number"
                style={currentStyle}
                value={selectedElement.height}
                disabled={isLocked}
                onChange={(e) => handleNumberInput('height', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div>
          <label style={labelStyle}>旋转</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              min={-360}
              max={360}
              step={15}
              style={{ ...currentStyle, flex: 1 }}
              value={selectedElement.rotation}
              disabled={isLocked}
              onChange={(e) => handleNumberInput('rotation', e.target.value)}
            />
            <span style={{ fontSize: 13, color: '#6B7280' }}>°</span>
          </div>
        </div>
      </div>
    )
  }

  const renderStylesTab = () => {
    if (!selectedElement) return null
    const isLocked = selectedElement.locked
    const currentStyle = isLocked ? inputDisabledStyle : inputStyle

    return (
      <div
        key="styles"
        style={{
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          animation: 'slideInRight 0.25s ease-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1F2937' }}>
            {elementTypeLabels[selectedElement.type]}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => onToggleLock(selectedElement.id)}
              style={{
                padding: 6,
                border: '1px solid #D1D5DB',
                borderRadius: 6,
                backgroundColor: isLocked ? '#FEF3C7' : '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              title={isLocked ? '解锁' : '锁定'}
            >
              {isLocked ? <Lock size={14} color="#B45309" /> : <Unlock size={14} color="#6B7280" />}
            </button>
            <button
              onClick={() => onDeleteElement(selectedElement.id)}
              style={{
                padding: 6,
                border: '1px solid #FECACA',
                borderRadius: 6,
                backgroundColor: '#FEF2F2',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              title="删除元素"
            >
              <Trash2 size={14} color="#DC2626" />
            </button>
          </div>
        </div>

        <div>
          <label style={labelStyle}>背景颜色</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4, marginBottom: 8 }}>
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => !isLocked && onUpdateElement(selectedElement.id, { backgroundColor: color })}
                disabled={isLocked}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  border: selectedElement.backgroundColor === color ? '2px solid #3B82F6' : '1px solid #D1D5DB',
                  backgroundColor: color,
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  padding: 0,
                  transition: 'transform 0.1s',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="color"
              value={selectedElement.backgroundColor === 'transparent' ? '#FFFFFF' : selectedElement.backgroundColor}
              disabled={isLocked}
              onChange={(e) => onUpdateElement(selectedElement.id, { backgroundColor: e.target.value })}
              style={{
                width: 32,
                height: 32,
                border: '1px solid #D1D5DB',
                borderRadius: 6,
                padding: 2,
                cursor: isLocked ? 'not-allowed' : 'pointer',
                backgroundColor: '#FFFFFF',
              }}
            />
            <input
              type="text"
              style={{ ...currentStyle, flex: 1 }}
              value={selectedElement.backgroundColor}
              disabled={isLocked}
              onChange={(e) => handleTextInput('backgroundColor', e.target.value)}
              placeholder="#FFFFFF"
            />
            <button
              onClick={() => !isLocked && onUpdateElement(selectedElement.id, { backgroundColor: 'transparent' })}
              disabled={isLocked}
              style={{
                padding: '6px 8px',
                fontSize: 11,
                border: '1px solid #D1D5DB',
                borderRadius: 6,
                backgroundColor: isLocked ? '#F3F4F6' : '#FFFFFF',
                color: isLocked ? '#9CA3AF' : '#374151',
                cursor: isLocked ? 'not-allowed' : 'pointer',
              }}
            >
              透明
            </button>
          </div>
        </div>

        <div>
          <label style={labelStyle}>边框</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <select
              style={currentStyle}
              value={selectedElement.borderStyle}
              disabled={isLocked}
              onChange={(e) => handleTextInput('borderStyle', e.target.value)}
            >
              <option value="solid">实线</option>
              <option value="dashed">虚线</option>
              <option value="dotted">点线</option>
            </select>
            <div>
              <input
                type="number"
                min={0}
                max={5}
                style={currentStyle}
                value={selectedElement.borderWidth}
                disabled={isLocked}
                onChange={(e) => handleNumberInput('borderWidth', e.target.value)}
                placeholder="宽度"
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="color"
              value={selectedElement.borderColor === 'transparent' ? '#FFFFFF' : selectedElement.borderColor}
              disabled={isLocked}
              onChange={(e) => onUpdateElement(selectedElement.id, { borderColor: e.target.value })}
              style={{
                width: 32,
                height: 32,
                border: '1px solid #D1D5DB',
                borderRadius: 6,
                padding: 2,
                cursor: isLocked ? 'not-allowed' : 'pointer',
                backgroundColor: '#FFFFFF',
              }}
            />
            <input
              type="text"
              style={{ ...currentStyle, flex: 1 }}
              value={selectedElement.borderColor}
              disabled={isLocked}
              onChange={(e) => handleTextInput('borderColor', e.target.value)}
              placeholder="#000000"
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>圆角: {selectedElement.borderRadius}px</label>
          <input
            type="range"
            min={0}
            max={20}
            value={selectedElement.borderRadius}
            disabled={isLocked}
            onChange={(e) => handleNumberInput('borderRadius', e.target.value)}
            style={{
              width: '100%',
              cursor: isLocked ? 'not-allowed' : 'pointer',
              accentColor: '#3B82F6',
            }}
          />
        </div>

        {(selectedElement.type === 'text' || selectedElement.type === 'dateLabel') && (
          <>
            <div>
              <label style={labelStyle}>文本内容</label>
              <input
                type="text"
                style={currentStyle}
                value={selectedElement.text || ''}
                disabled={isLocked}
                onChange={(e) => handleTextInput('text', e.target.value)}
                placeholder="输入文本..."
              />
            </div>
            <div>
              <label style={labelStyle}>字体设置</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>字号</div>
                  <input
                    type="number"
                    min={8}
                    max={72}
                    style={currentStyle}
                    value={selectedElement.fontSize || 14}
                    disabled={isLocked}
                    onChange={(e) => handleNumberInput('fontSize', e.target.value)}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>颜色</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="color"
                      value={selectedElement.fontColor || '#000000'}
                      disabled={isLocked}
                      onChange={(e) => onUpdateElement(selectedElement.id, { fontColor: e.target.value })}
                      style={{
                        width: 28,
                        height: 28,
                        border: '1px solid #D1D5DB',
                        borderRadius: 6,
                        padding: 2,
                        cursor: isLocked ? 'not-allowed' : 'pointer',
                        backgroundColor: '#FFFFFF',
                      }}
                    />
                    <input
                      type="text"
                      style={{ ...currentStyle, flex: 1 }}
                      value={selectedElement.fontColor || ''}
                      disabled={isLocked}
                      onChange={(e) => handleTextInput('fontColor', e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>
                  字间距: {selectedElement.letterSpacing || 0}px
                </div>
                <input
                  type="range"
                  min={-2}
                  max={8}
                  value={selectedElement.letterSpacing || 0}
                  disabled={isLocked}
                  onChange={(e) => handleNumberInput('letterSpacing', e.target.value)}
                  style={{
                    width: '100%',
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    accentColor: '#3B82F6',
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div style={panelStyle}>
      {renderAddButtons()}

      {selectedElement ? (
        <>
          {renderTabBar()}
          <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
            {activeTab === 'styles' ? renderStylesTab() : renderLayoutTab()}
          </div>
        </>
      ) : selectedCount > 1 ? (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
        }}>
          <div style={{ color: '#9CA3AF', fontSize: 13 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>📦</div>
            已选择 {selectedCount} 个元素
          </div>
        </div>
      ) : (
        renderEmptyState()
      )}

      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #E5E7EB',
        backgroundColor: '#F9FAFB',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        <div>
          <label style={labelStyle}>保存模板</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              style={{ ...inputStyle, flex: 1 }}
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="模板名称..."
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
            />
            <button
              onClick={handleSaveTemplate}
              disabled={!templateName.trim()}
              style={{
                padding: '6px 12px',
                fontSize: 13,
                fontWeight: 500,
                border: 'none',
                borderRadius: 6,
                backgroundColor: templateName.trim() ? '#3B82F6' : '#9CA3AF',
                color: '#FFFFFF',
                cursor: templateName.trim() ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.15s',
              }}
            >
              保存
            </button>
          </div>
        </div>

        <button
          onClick={onExportPNG}
          disabled={isExporting}
          style={{
            padding: '10px 12px',
            fontSize: 13,
            fontWeight: 600,
            border: 'none',
            borderRadius: 6,
            backgroundColor: isExporting ? '#9CA3AF' : '#10B981',
            color: '#FFFFFF',
            cursor: isExporting ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'background-color 0.15s',
          }}
        >
          {isExporting ? (
            <>
              <div style={{
                width: 14,
                height: 14,
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#FFFFFF',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              导出中...
            </>
          ) : (
            '导出 PNG'
          )}
        </button>
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input:disabled, select:disabled {
          opacity: 0.7;
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #D1D5DB;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #9CA3AF;
        }
      `}</style>
    </div>
  )
}
