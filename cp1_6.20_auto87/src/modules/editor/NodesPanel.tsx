import React from 'react';
import type { NodeType } from '../utils/stateManager';

interface NodeTemplate {
  type: NodeType;
  label: string;
  icon: string;
  color: string;
  defaultLabel: string;
}

const NODE_TEMPLATES: NodeTemplate[] = [
  {
    type: 'start',
    label: '开始',
    icon: '▶',
    color: '#48bb78',
    defaultLabel: '开始',
  },
  {
    type: 'process',
    label: '处理',
    icon: '⚙',
    color: '#5a67d8',
    defaultLabel: '处理节点',
  },
  {
    type: 'decision',
    label: '判断',
    icon: '◆',
    color: '#ed8936',
    defaultLabel: '判断节点',
  },
  {
    type: 'end',
    label: '结束',
    icon: '■',
    color: '#e53e3e',
    defaultLabel: '结束',
  },
];

interface NodesPanelProps {
  onDragStart?: (event: React.DragEvent, type: NodeType) => void;
}

const NodesPanel: React.FC<NodesPanelProps> = ({ onDragStart }) => {
  const handleDragStart = (event: React.DragEvent, template: NodeTemplate) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(template));
    event.dataTransfer.effectAllowed = 'move';

    const dragImage = document.createElement('div');
    dragImage.style.width = '160px';
    dragImage.style.height = '80px';
    dragImage.style.background = '#fff';
    dragImage.style.border = `2px solid ${template.color}`;
    dragImage.style.borderRadius = '8px';
    dragImage.style.opacity = '0.85';
    dragImage.style.padding = '8px';
    dragImage.style.fontSize = '12px';
    dragImage.style.fontFamily = 'Inter, sans-serif';
    dragImage.style.display = 'flex';
    dragImage.style.flexDirection = 'column';
    dragImage.style.gap = '4px';
    dragImage.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    dragImage.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;">
        <div style="width:20px;height:20px;border-radius:4px;background:${template.color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">${template.icon}</div>
        <span style="font-size:10px;font-weight:600;color:${template.color};text-transform:uppercase;letter-spacing:0.5px;">${template.label}</span>
      </div>
      <div style="font-size:11px;color:#2d3748;font-weight:500;margin-top:4px;">${template.defaultLabel}</div>
    `;
    document.body.appendChild(dragImage);
    event.dataTransfer.setDragImage(dragImage, 80, 40);
    setTimeout(() => document.body.removeChild(dragImage), 0);

    onDragStart?.(event, template.type);
  };

  return (
    <aside className="nodes-panel">
      <div className="nodes-panel-title">节点面板</div>
      {NODE_TEMPLATES.map((template) => (
        <div
          key={template.type}
          className="node-item"
          draggable
          onDragStart={(e) => handleDragStart(e, template)}
        >
          <div
            className="node-item-icon"
            style={{ background: template.color }}
          >
            {template.icon}
          </div>
          <span className="node-item-label">{template.label}</span>
        </div>
      ))}
    </aside>
  );
};

export default NodesPanel;
