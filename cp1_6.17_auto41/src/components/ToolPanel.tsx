import React from 'react';
import { Paintbrush, Eraser, Trash2, Plus } from 'lucide-react';
import type { PixelColor, ToolType } from '../types';
import { COLOR_PALETTE } from '../types';

interface ToolPanelProps {
  selectedColor: PixelColor;
  currentTool: ToolType;
  onColorSelect: (color: PixelColor) => void;
  onToolChange: (tool: ToolType) => void;
  onClearCanvas: () => void;
  onAddKeyFrame: () => void;
  keyFrameCount: number;
}

const ToolPanel: React.FC<ToolPanelProps> = ({
  selectedColor,
  currentTool,
  onColorSelect,
  onToolChange,
  onClearCanvas,
  onAddKeyFrame,
  keyFrameCount,
}) => {
  const isColorSelected = (color: PixelColor) =>
    color.r === selectedColor.r &&
    color.g === selectedColor.g &&
    color.b === selectedColor.b &&
    color.a === selectedColor.a;

  return (
    <div className="tool-panel">
      <div className="tool-section">
        <h3 className="tool-section-title">调色板</h3>
        <div className="color-palette">
          {COLOR_PALETTE.map((color, index) => (
            <button
              key={index}
              className={`color-swatch ${isColorSelected(color) && currentTool === 'brush' ? 'active' : ''}`}
              style={{
                backgroundColor: `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 255})`,
              }}
              onClick={() => {
                onColorSelect(color);
                onToolChange('brush');
              }}
              title={`颜色 ${index + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="tool-section">
        <h3 className="tool-section-title">工具</h3>
        <div className="tool-buttons">
          <button
            className={`tool-button ${currentTool === 'brush' ? 'active' : ''}`}
            onClick={() => onToolChange('brush')}
            title="画笔"
          >
            <Paintbrush size={20} />
          </button>
          <button
            className={`tool-button ${currentTool === 'eraser' ? 'active' : ''}`}
            onClick={() => onToolChange('eraser')}
            title="橡皮擦"
          >
            <Eraser size={20} />
          </button>
        </div>
      </div>

      <div className="tool-section">
        <h3 className="tool-section-title">操作</h3>
        <div className="tool-buttons vertical">
          <button
            className="tool-button action"
            onClick={onAddKeyFrame}
            title="添加关键帧"
          >
            <Plus size={20} />
            <span className="keyframe-badge">{keyFrameCount}</span>
          </button>
          <button
            className="tool-button action danger"
            onClick={onClearCanvas}
            title="清除画布"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <div className="tool-section current-color">
        <h3 className="tool-section-title">当前颜色</h3>
        <div
          className="current-color-swatch"
          style={{
            backgroundColor:
              currentTool === 'eraser'
                ? 'transparent'
                : `rgba(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b}, ${selectedColor.a / 255})`,
          }}
        />
        <span className="current-tool-label">
          {currentTool === 'eraser' ? '橡皮擦' : '画笔'}
        </span>
      </div>
    </div>
  );
};

export default ToolPanel;
