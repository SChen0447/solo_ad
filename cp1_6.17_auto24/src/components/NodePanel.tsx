import React, { useState, useEffect } from 'react';
import { MindMapNode } from '../types';

interface NodePanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNode: MindMapNode | null;
  onNodeUpdate: (nodeId: string, updates: Partial<MindMapNode>) => void;
  onAddChildNode: (parentId: string) => void;
  onDeleteNode: (nodeId: string) => void;
}

const PRESET_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#FF8C69',
  '#6B8E23',
];

export const NodePanel: React.FC<NodePanelProps> = ({
  isOpen,
  onClose,
  selectedNode,
  onNodeUpdate,
  onAddChildNode,
  onDeleteNode,
}) => {
  const [text, setText] = useState('');

  useEffect(() => {
    if (selectedNode) {
      setText(selectedNode.text);
    }
  }, [selectedNode]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  const handleTextBlur = () => {
    if (selectedNode && text !== selectedNode.text) {
      onNodeUpdate(selectedNode.id, { text });
    }
  };

  const handleColorChange = (color: string) => {
    if (selectedNode) {
      onNodeUpdate(selectedNode.id, { color });
    }
  };

  const handleAddChild = () => {
    if (selectedNode) {
      onAddChildNode(selectedNode.id);
    }
  };

  const handleDelete = () => {
    if (selectedNode && window.confirm('确定要删除这个节点吗？')) {
      onDeleteNode(selectedNode.id);
    }
  };

  const darkenColor = (color: string, percent: number): string => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max((num >> 16) - amt, 0);
    const G = Math.max(((num >> 8) & 0x00ff) - amt, 0);
    const B = Math.max((num & 0x0000ff) - amt, 0);
    return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
  };

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    right: isOpen ? '0' : '-360px',
    top: '0',
    width: '320px',
    height: '100vh',
    backgroundColor: '#F8F9FA',
    boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.1)',
    transition: 'right 0.3s ease',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    boxSizing: 'border-box',
  };

  const closeButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '15px',
    right: '15px',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    transition: 'background-color 0.2s, transform 0.1s',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '24px',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#333333',
    marginBottom: '8px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const colorGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
  };

  const colorButtonStyle = (color: string, isSelected: boolean): React.CSSProperties => ({
    width: '100%',
    aspectRatio: '1',
    borderRadius: '8px',
    backgroundColor: color,
    border: isSelected ? '2px solid #333333' : '2px solid transparent',
    cursor: 'pointer',
    transition: 'transform 0.1s, border-color 0.2s',
    boxSizing: 'border-box',
  });

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s, transform 0.1s',
    marginBottom: '10px',
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#4ECDC4',
    color: '#ffffff',
  };

  const dangerButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#FF6B6B',
    color: '#ffffff',
  };

  const emptyStateStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#999999',
    fontSize: '14px',
  };

  if (!isOpen) {
    return (
      <div style={panelStyle}>
        <button style={closeButtonStyle} onClick={onClose}>
          →
        </button>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <button
        style={closeButtonStyle}
        onClick={onClose}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#F0F0F0';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#ffffff';
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'scale(0.95)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        ×
      </button>

      <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#333333' }}>
        节点详情
      </h3>

      {selectedNode ? (
        <>
          <div style={sectionStyle}>
            <label style={labelStyle}>节点文本</label>
            <input
              type="text"
              value={text}
              onChange={handleTextChange}
              onBlur={handleTextBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleTextBlur();
                }
              }}
              style={inputStyle}
              placeholder="输入节点文本"
            />
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>节点颜色</label>
            <div style={colorGridStyle}>
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  style={colorButtonStyle(color, selectedNode.color === color)}
                  onClick={() => handleColorChange(color)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'scale(0.95)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                />
              ))}
            </div>
          </div>

          <div style={sectionStyle}>
            <button
              style={primaryButtonStyle}
              onClick={handleAddChild}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = darkenColor('#4ECDC4', 10);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#4ECDC4';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              + 添加子节点
            </button>
          </div>

          <div style={{ marginTop: 'auto' }}>
            <button
              style={dangerButtonStyle}
              onClick={handleDelete}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = darkenColor('#FF6B6B', 10);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FF6B6B';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              删除节点
            </button>
          </div>
        </>
      ) : (
        <div style={emptyStateStyle}>
          <p>请选择一个节点</p>
          <p style={{ fontSize: '12px', marginTop: '8px' }}>
            双击画布空白区域创建新节点
          </p>
        </div>
      )}
    </div>
  );
};
