import React from 'react'
import { useStoryStore } from '../../store/useStoryStore'

export const StoryEditor: React.FC = () => {
  const {
    selectedNodeId,
    nodes,
    addOption,
    updateOption,
    deleteOption,
    updateNode,
    deleteNode,
    setPreviewMode,
  } = useStoryStore()

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)

  if (!selectedNode) {
    return (
      <div
        style={{
          width: 300,
          backgroundColor: '#252525',
          borderLeft: '1px solid #333',
          padding: '20px',
          color: '#888',
          fontSize: '13px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
        }}
      >
        <div style={{ fontSize: '48px', opacity: 0.3 }}>📝</div>
        <div>选择一个节点进行编辑</div>
        <div style={{ fontSize: '11px', color: '#666', textAlign: 'center', lineHeight: 1.6 }}>
          双击画布创建新节点<br />
          点击节点选中并编辑
        </div>
      </div>
    )
  }

  const otherNodes = nodes.filter((n) => n.id !== selectedNodeId)

  return (
    <div
      style={{
        width: 300,
        backgroundColor: '#252525',
        borderLeft: '1px solid #333',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #333',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '14px',
            color: '#e0e0e0',
            fontWeight: 600,
          }}
        >
          节点编辑
        </h3>
        <button
          onClick={() => setPreviewMode(true)}
          style={{
            padding: '6px 12px',
            fontSize: '11px',
            backgroundColor: '#4fc3f7',
            color: '#1a1a1a',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#81d4fa'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#4fc3f7'
          }}
        >
          ▶ 预览
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              color: '#888',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            节点 ID
          </label>
          <div
            style={{
              padding: '8px 10px',
              backgroundColor: '#1e1e1e',
              borderRadius: '6px',
              fontSize: '11px',
              color: '#666',
              fontFamily: 'monospace',
              border: '1px solid #333',
              userSelect: 'all',
            }}
          >
            {selectedNode.id}
          </div>
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              color: '#888',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            标题
          </label>
          <input
            type="text"
            value={selectedNode.title}
            onChange={(e) => updateNode(selectedNode.id, { title: e.target.value })}
            placeholder="输入节点标题"
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: '#333333',
              border: '1px solid #444',
              borderRadius: '6px',
              color: '#e0e0e0',
              fontSize: '13px',
              outline: 'none',
              transition: 'border-color 0.2s ease',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#4fc3f7'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#444'
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              color: '#888',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            内容
          </label>
          <textarea
            value={selectedNode.content}
            onChange={(e) => updateNode(selectedNode.id, { content: e.target.value })}
            placeholder="输入节点故事内容..."
            rows={6}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: '#333333',
              border: '1px solid #444',
              borderRadius: '6px',
              color: '#e0e0e0',
              fontSize: '13px',
              outline: 'none',
              resize: 'vertical',
              lineHeight: 1.5,
              transition: 'border-color 0.2s ease',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#4fc3f7'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#444'
            }}
          />
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <label
              style={{
                fontSize: '11px',
                color: '#888',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              选项 ({selectedNode.options.length})
            </label>
            <button
              onClick={() => addOption(selectedNode.id)}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                backgroundColor: '#3a3a3a',
                color: '#aaa',
                border: '1px solid #444',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#4fc3f7'
                ;(e.currentTarget as HTMLButtonElement).style.color = '#1a1a1a'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#4fc3f7'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#3a3a3a'
                ;(e.currentTarget as HTMLButtonElement).style.color = '#aaa'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#444'
              }}
            >
              + 添加选项
            </button>
          </div>

          <div style={{ display: 'flex', 'flexDirection': 'column', gap: '10px' }}>
            {selectedNode.options.map((option, idx) => (
              <div
                key={option.id}
                style={{
                  padding: '12px',
                  backgroundColor: '#1e1e1e',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '11px', color: '#666', fontWeight: 600 }}>
                    选项 {idx + 1}
                  </span>
                  <button
                    onClick={() => deleteOption(selectedNode.id, option.id)}
                    style={{
                      padding: '2px 6px',
                      fontSize: '10px',
                      backgroundColor: 'transparent',
                      color: '#666',
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: '3px',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ff6b6b'
                      ;(e.currentTarget as HTMLButtonElement).style.color = '#fff'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                      ;(e.currentTarget as HTMLButtonElement).style.color = '#666'
                    }}
                  >
                    ✕ 删除
                  </button>
                </div>

                <input
                  type="text"
                  value={option.text}
                  onChange={(e) =>
                    updateOption(selectedNode.id, option.id, { text: e.target.value })
                  }
                  placeholder="选项文本"
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    backgroundColor: '#333',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    color: '#e0e0e0',
                    fontSize: '12px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s ease',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4fc3f7'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#444'
                  }}
                />

                <div>
                  <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>
                    指向节点
                  </div>
                  <select
                    value={option.targetNodeId || ''}
                    onChange={(e) =>
                      updateOption(selectedNode.id, option.id, {
                        targetNodeId: e.target.value || null,
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      backgroundColor: '#333',
                      border: '1px solid #444',
                      borderRadius: '4px',
                      color: '#e0e0e0',
                      fontSize: '12px',
                      outline: 'none',
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="">-- 选择节点 --</option>
                    {otherNodes.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.title || '未命名节点'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>
                    条件表达式
                  </div>
                  <input
                    type="text"
                    value={option.condition}
                    onChange={(e) =>
                      updateOption(selectedNode.id, option.id, { condition: e.target.value })
                    }
                    placeholder="如: hasKey=true"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      backgroundColor: '#333',
                      border: '1px solid #444',
                      borderRadius: '4px',
                      color: '#e0e0e0',
                      fontSize: '12px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: 'monospace',
                      transition: 'border-color 0.2s ease',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#4fc3f7'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#444'
                    }}
                  />
                  <div
                    style={{
                      fontSize: '10px',
                      color: '#555',
                      marginTop: '4px',
                      lineHeight: 1.4,
                    }}
                  >
                    格式: 变量名=值<br />
                    留空表示无条件显示
                  </div>
                </div>
              </div>
            ))}

            {selectedNode.options.length === 0 && (
              <div
                style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#555',
                  fontSize: '12px',
                  border: '1px dashed #333',
                  borderRadius: '6px',
                }}
              >
                暂无选项，点击上方按钮添加
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #333' }}>
          <button
            onClick={() => {
              if (confirm('确定删除此节点？')) {
                deleteNode(selectedNode.id)
              }
            }}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '12px',
              backgroundColor: 'transparent',
              color: '#ff6b6b',
              border: '1px solid #ff6b6b',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ff6b6b'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#ff6b6b'
            }}
          >
            删除节点
          </button>
        </div>
      </div>
    </div>
  )
}
