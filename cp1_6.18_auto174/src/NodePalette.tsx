import React from 'react';
import { NODE_TEMPLATES, NodeType, PALETTE_WIDTH } from './types';

interface NodePaletteProps {
  onDragStart: (e: React.DragEvent, type: NodeType) => void;
  isCollapsed?: boolean;
}

export const NodePalette: React.FC<NodePaletteProps> = ({ onDragStart, isCollapsed }) => {
  if (isCollapsed) {
    return (
      <div className="palette-collapsed">
        {NODE_TEMPLATES.map((template) => (
          <div
            key={template.type}
            className="palette-item-collapsed"
            draggable
            onDragStart={(e) => onDragStart(e, template.type)}
            title={template.label}
          >
            <span className="palette-icon">{template.icon}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="node-palette" style={{ width: PALETTE_WIDTH }}>
      <div className="palette-header">
        <h3>节点模板</h3>
      </div>
      <div className="palette-list">
        {NODE_TEMPLATES.map((template) => (
          <div
            key={template.type}
            className="palette-item"
            draggable
            onDragStart={(e) => onDragStart(e, template.type)}
          >
            <div
              className="palette-item-icon"
              style={{ background: template.defaultColor }}
            >
              <span>{template.icon}</span>
            </div>
            <span className="palette-item-label">{template.label}</span>
          </div>
        ))}
      </div>
      <div className="palette-tips">
        <p>拖拽节点到画布</p>
        <p>空格键+拖拽平移画布</p>
        <p>滚轮缩放画布</p>
      </div>
    </div>
  );
};
