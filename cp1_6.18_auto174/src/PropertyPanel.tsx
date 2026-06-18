import React from 'react';
import { useCanvasStore } from './store';
import {
  COLOR_PALETTE,
  MIN_BORDER_RADIUS,
  MAX_BORDER_RADIUS,
  NODE_MIN_HEIGHT,
  NODE_MAX_HEIGHT,
  MIN_LINE_WIDTH,
  MAX_LINE_WIDTH,
  PROPERTY_PANEL_WIDTH,
} from './types';

const LINE_COLORS = [
  '#667eea',
  '#f5576c',
  '#00f2fe',
  '#38f9d7',
  '#fee140',
  '#ff9a9e',
  '#fbc2eb',
  '#a6c1ee',
];

export const PropertyPanel: React.FC = () => {
  const {
    selectedNodeId,
    selectedConnectionId,
    nodes,
    connections,
    updateNode,
    updateConnection,
  } = useCanvasStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedConnection = connections.find((c) => c.id === selectedConnectionId);

  if (!selectedNode && !selectedConnection) {
    return (
      <div className="property-panel" style={{ width: PROPERTY_PANEL_WIDTH }}>
        <div className="panel-header">
          <h3>属性面板</h3>
        </div>
        <div className="panel-empty">
          <p>选择节点或连线</p>
          <p>以编辑其属性</p>
        </div>
      </div>
    );
  }

  if (selectedNode) {
    return (
      <div className="property-panel" style={{ width: PROPERTY_PANEL_WIDTH }}>
        <div className="panel-header">
          <h3>节点属性</h3>
        </div>
        <div className="panel-content">
          <div className="property-group">
            <label className="property-label">名称</label>
            <input
              type="text"
              value={selectedNode.label}
              onChange={(e) => updateNode(selectedNode.id, { label: e.target.value })}
              className="property-input"
            />
          </div>

          <div className="property-group">
            <label className="property-label">颜色</label>
            <div className="color-palette">
              {COLOR_PALETTE.map((color, index) => (
                <button
                  key={index}
                  className={`color-swatch ${selectedNode.color === color ? 'active' : ''}`}
                  style={{ background: color }}
                  onClick={() => updateNode(selectedNode.id, { color })}
                />
              ))}
            </div>
          </div>

          <div className="property-group">
            <label className="property-label">
              圆角: {selectedNode.borderRadius}px
            </label>
            <input
              type="range"
              min={MIN_BORDER_RADIUS}
              max={MAX_BORDER_RADIUS}
              value={selectedNode.borderRadius}
              onChange={(e) =>
                updateNode(selectedNode.id, { borderRadius: Number(e.target.value) })
              }
              className="property-range"
            />
          </div>

          <div className="property-group">
            <label className="property-label">
              高度: {selectedNode.height}px
            </label>
            <input
              type="range"
              min={NODE_MIN_HEIGHT}
              max={NODE_MAX_HEIGHT}
              value={selectedNode.height}
              onChange={(e) =>
                updateNode(selectedNode.id, { height: Number(e.target.value) })
              }
              className="property-range"
            />
          </div>

          <div className="property-group">
            <label className="property-label">类型</label>
            <div className="property-type">
              {selectedNode.type === 'start' && '开始节点'}
              {selectedNode.type === 'action' && '操作节点'}
              {selectedNode.type === 'decision' && '判断节点'}
              {selectedNode.type === 'end' && '结束节点'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedConnection) {
    return (
      <div className="property-panel" style={{ width: PROPERTY_PANEL_WIDTH }}>
        <div className="panel-header">
          <h3>连线属性</h3>
        </div>
        <div className="panel-content">
          <div className="property-group">
            <label className="property-label">标签</label>
            <input
              type="text"
              value={selectedConnection.label}
              onChange={(e) =>
                updateConnection(selectedConnection.id, { label: e.target.value })
              }
              className="property-input"
            />
          </div>

          <div className="property-group">
            <label className="property-label">
              线宽: {selectedConnection.lineWidth}px
            </label>
            <input
              type="range"
              min={MIN_LINE_WIDTH}
              max={MAX_LINE_WIDTH}
              value={selectedConnection.lineWidth}
              onChange={(e) =>
                updateConnection(selectedConnection.id, {
                  lineWidth: Number(e.target.value),
                })
              }
              className="property-range"
            />
          </div>

          <div className="property-group">
            <label className="property-label">线型</label>
            <div className="line-style-options">
              {(['solid', 'dashed', 'dotted'] as const).map((style) => (
                <button
                  key={style}
                  className={`line-style-btn ${
                    selectedConnection.lineStyle === style ? 'active' : ''
                  }`}
                  onClick={() =>
                    updateConnection(selectedConnection.id, { lineStyle: style })
                  }
                >
                  {style === 'solid' && '实线'}
                  {style === 'dashed' && '虚线'}
                  {style === 'dotted' && '点线'}
                </button>
              ))}
            </div>
          </div>

          <div className="property-group">
            <label className="property-label">颜色</label>
            <div className="color-palette">
              {LINE_COLORS.map((color, index) => (
                <button
                  key={index}
                  className={`color-swatch line-color ${
                    selectedConnection.color === color ? 'active' : ''
                  }`}
                  style={{ background: color }}
                  onClick={() =>
                    updateConnection(selectedConnection.id, { color })
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
