import { useState, useEffect } from 'react';
import { MindMapNode } from '@typeDefs/index';
import './NodeEditor.css';

interface NodeEditorProps {
  node: MindMapNode;
  onUpdate: (updates: Partial<MindMapNode>) => void;
  onClose: () => void;
}

const COLORS = [
  '#1a73e8',
  '#34a853',
  '#fbbc04',
  '#ea4335',
  '#9334e6',
  '#e91e63',
  '#00bcd4',
  '#ff9800',
];

const NodeEditor = ({ node, onUpdate, onClose }: NodeEditorProps) => {
  const [text, setText] = useState(node.text);
  const [color, setColor] = useState(node.color);

  useEffect(() => {
    setText(node.text);
    setColor(node.color);
  }, [node.id, node.text, node.color]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  const handleTextBlur = () => {
    if (text !== node.text) {
      onUpdate({ text });
    }
  };

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    onUpdate({ color: newColor });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTextBlur();
      onClose();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="node-editor-overlay" onClick={onClose}>
      <div
        className="node-editor-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="editor-header">
          <h3 className="editor-title">编辑节点</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="editor-content">
          <div className="form-group">
            <label className="form-label">节点文本</label>
            <input
              type="text"
              className="form-input"
              value={text}
              onChange={handleTextChange}
              onBlur={handleTextBlur}
              onKeyDown={handleKeyDown}
              autoFocus
              placeholder="输入节点内容..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">节点颜色</label>
            <div className="color-picker">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`color-option ${color === c ? 'active' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => handleColorChange(c)}
                />
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">节点信息</label>
            <div className="node-info">
              <div className="info-row">
                <span className="info-label">层级</span>
                <span className="info-value">{node.level + 1}</span>
              </div>
              <div className="info-row">
                <span className="info-label">子节点数</span>
                <span className="info-value">{node.children.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="editor-footer">
          <button className="btn btn-primary" onClick={onClose}>
            完成
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeEditor;
