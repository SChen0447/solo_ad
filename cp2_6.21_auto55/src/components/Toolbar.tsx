import '../styles/toolbar.css';

interface ToolbarProps {
  selectedTool: any;
  selectedColor: string;
  selectedSize: number;
  textFontSize: number;
  historyIndex: number;
  historyLength: number;
  onToolChange: (tool: any) => void;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  onTextFontSizeChange: (size: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onExport: () => void;
  onShare: () => void;
  copiedTip: boolean;
  onStickerPanelToggle: () => void;
  showStickerPanel: boolean;
}

const COLORS = [
  '#000000', '#374151', '#6B7280', '#9CA3AF',
  '#EF4444', '#F97316', '#F59E0B', '#84CC16',
  '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'
];

const TOOLS: { key: string; icon: string; label: string }[] = [
  { key: 'pencil', icon: '✏️', label: '铅笔' },
  { key: 'eraser', icon: '🧹', label: '橡皮' },
  { key: 'rectangle', icon: '▭', label: '矩形' },
  { key: 'circle', icon: '○', label: '圆形' },
  { key: 'line', icon: '╱', label: '直线' },
  { key: 'text', icon: 'T', label: '文字' },
];

function Toolbar(props: ToolbarProps) {
  const {
    selectedTool,
    selectedColor,
    selectedSize,
    textFontSize,
    historyIndex,
    historyLength,
    onToolChange,
    onColorChange,
    onSizeChange,
    onTextFontSizeChange,
    onUndo,
    onRedo,
    onClear,
    onExport,
    onShare,
    copiedTip,
    onStickerPanelToggle,
    showStickerPanel
  } = props;

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <h3 className="toolbar-section-title">绘图工具</h3>
        <div className="tool-buttons">
          {TOOLS.map(tool => (
            <button
              key={tool.key}
              className={`tool-btn ${selectedTool === tool.key ? 'active' : ''}`}
              onClick={() => onToolChange(tool.key as any)}
              title={tool.label}
            >
              <span className="tool-icon">{tool.icon}</span>
            </button>
          ))}
          <button
            className={`tool-btn ${showStickerPanel ? 'active' : ''}`}
            onClick={onStickerPanelToggle}
            title="贴纸"
          >
            <span className="tool-icon">🎨</span>
          </button>
        </div>
      </div>

      <div className="toolbar-section">
        <h3 className="toolbar-section-title">颜色</h3>
        <div className="color-palette">
          {COLORS.map(color => (
            <button
              key={color}
              className={`color-swatch ${selectedColor === color ? 'selected' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => onColorChange(color)}
            />
          ))}
        </div>
      </div>

      <div className="toolbar-section">
        <h3 className="toolbar-section-title">
          {selectedTool === 'text' ? '字号' : '粗细'}
          <span className="size-value">
            {selectedTool === 'text' ? textFontSize : selectedSize}px
          </span>
        </h3>
        <input
          type="range"
          className="size-slider"
          min={selectedTool === 'text' ? 14 : 1}
          max={selectedTool === 'text' ? 48 : 20}
          value={selectedTool === 'text' ? textFontSize : selectedSize}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (selectedTool === 'text') {
              onTextFontSizeChange(val);
            } else {
              onSizeChange(val);
            }
          }}
        />
      </div>

      <div className="toolbar-section">
        <div className="history-indicator">
          第 {historyIndex + 1}/{historyLength} 步
        </div>
        <div className="action-buttons">
          <button 
            className="action-btn undo-redo" 
            onClick={onUndo}
            disabled={historyIndex === 0}
          >
            ↩ 撤销
          </button>
          <button 
            className="action-btn undo-redo" 
            onClick={onRedo}
            disabled={historyIndex >= historyLength - 1}
          >
            ↪ 重做
          </button>
          <button className="action-btn clear" onClick={onClear}>
            🗑 清空
          </button>
          <button className="action-btn export" onClick={onExport}>
            💾 导出PNG
          </button>
          <button className="action-btn share" onClick={onShare}>
            {copiedTip ? '✓ 已复制' : '🔗 分享'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Toolbar;
