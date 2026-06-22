import { ToolType, PRESET_COLORS, LINE_WIDTHS } from '../types';
import './Toolbar.css';

interface ToolbarProps {
  currentTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  currentColor: string;
  onColorChange: (color: string) => void;
  currentLineWidth: number;
  onLineWidthChange: (width: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onShowHistory: () => void;
  onBack: () => void;
  boardName: string;
  isMobile?: boolean;
}

const TOOLS: { type: ToolType; icon: string; label: string }[] = [
  { type: 'select', icon: '↖', label: '选择' },
  { type: 'rectangle', icon: '▢', label: '矩形' },
  { type: 'ellipse', icon: '○', label: '椭圆' },
  { type: 'line', icon: '╱', label: '线条' },
  { type: 'freehand', icon: '✎', label: '画笔' },
  { type: 'sticky', icon: '■', label: '便签' },
  { type: 'connector', icon: '⟷', label: '连接线' },
  { type: 'text', icon: 'T', label: '文字' }
];

function Toolbar({
  currentTool,
  onToolChange,
  currentColor,
  onColorChange,
  currentLineWidth,
  onLineWidthChange,
  onUndo,
  onRedo,
  onSave,
  onShowHistory,
  onBack,
  boardName,
  isMobile = false
}: ToolbarProps) {
  const toolbarClass = isMobile ? 'toolbar mobile' : 'toolbar';
  const buttonSize = isMobile ? 32 : 40;

  return (
    <div className={toolbarClass}>
      <div className="toolbar-group">
        <button 
          className="toolbar-btn back-btn btn-active"
          style={{ width: buttonSize, height: buttonSize }}
          onClick={onBack}
          title="返回"
        >
          ←
        </button>
        {!isMobile && <span className="board-name">{boardName}</span>}
      </div>

      <div className="toolbar-group">
        {TOOLS.map(tool => (
          <button
            key={tool.type}
            className={`toolbar-btn tool-btn btn-active ${currentTool === tool.type ? 'active' : ''}`}
            style={{ width: buttonSize, height: buttonSize }}
            onClick={() => onToolChange(tool.type)}
            title={tool.label}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      <div className="toolbar-group">
        <button 
          className="toolbar-btn action-btn btn-active"
          style={{ width: buttonSize, height: buttonSize }}
          onClick={onUndo}
          title="撤销"
        >
          ↶
        </button>
        <button 
          className="toolbar-btn action-btn btn-active"
          style={{ width: buttonSize, height: buttonSize }}
          onClick={onRedo}
          title="重做"
        >
          ↷
        </button>
        <button 
          className="toolbar-btn save-btn btn-active"
          style={{ width: buttonSize, height: buttonSize }}
          onClick={onSave}
          title="保存"
        >
          💾
        </button>
        <button 
          className="toolbar-btn action-btn btn-active"
          style={{ width: buttonSize, height: buttonSize }}
          onClick={onShowHistory}
          title="历史版本"
        >
          🕐
        </button>
      </div>

      {!isMobile && (
        <>
          <div className="toolbar-group">
            <div className="color-picker">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  className={`color-swatch ${currentColor === color ? 'active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => onColorChange(color)}
                  title={color}
                />
              ))}
            </div>
          </div>

          <div className="toolbar-group">
            <div className="line-width-picker">
              {LINE_WIDTHS.map(width => (
                <button
                  key={width}
                  className={`line-width-btn btn-active ${currentLineWidth === width ? 'active' : ''}`}
                  onClick={() => onLineWidthChange(width)}
                  title={`${width}px`}
                >
                  <div 
                    className="line-width-preview"
                    style={{ height: width, width: 20 }}
                  />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Toolbar;
