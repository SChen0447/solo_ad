import { Undo2, Redo2, AlignLeft, AlignRight, AlignCenterHorizontal, AlignCenterVertical, AlignStartVertical, AlignEndVertical, Grid3X3 } from 'lucide-react'

interface ToolbarProps {
  paperSize: 'A5' | 'A6' | 'B6'
  onPaperSizeChange: (size: 'A5' | 'A6' | 'B6') => void
  onUndo: () => void
  onRedo: () => void
  onAlign: (alignment: 'top' | 'bottom' | 'left' | 'right' | 'centerH' | 'centerV') => void
  onToggleGrid: () => void
  showGrid: boolean
}

export default function Toolbar({
  paperSize,
  onPaperSizeChange,
  onUndo,
  onRedo,
  onAlign,
  onToggleGrid,
  showGrid,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <select
          className="toolbar-select"
          value={paperSize}
          onChange={(e) => onPaperSizeChange(e.target.value as 'A5' | 'A6' | 'B6')}
        >
          <option value="A5">A5</option>
          <option value="A6">A6</option>
          <option value="B6">B6</option>
        </select>
      </div>
      <div className="toolbar-center">
        <div className="toolbar-align-group">
          <button
            className="toolbar-icon-btn"
            onClick={() => onAlign('top')}
            title="顶部对齐"
          >
            <AlignStartVertical size={16} />
          </button>
          <button
            className="toolbar-icon-btn"
            onClick={() => onAlign('bottom')}
            title="底部对齐"
          >
            <AlignEndVertical size={16} />
          </button>
          <button
            className="toolbar-icon-btn"
            onClick={() => onAlign('left')}
            title="左对齐"
          >
            <AlignLeft size={16} />
          </button>
          <button
            className="toolbar-icon-btn"
            onClick={() => onAlign('right')}
            title="右对齐"
          >
            <AlignRight size={16} />
          </button>
          <button
            className="toolbar-icon-btn"
            onClick={() => onAlign('centerH')}
            title="水平居中"
          >
            <AlignCenterHorizontal size={16} />
          </button>
          <button
            className="toolbar-icon-btn"
            onClick={() => onAlign('centerV')}
            title="垂直居中"
          >
            <AlignCenterVertical size={16} />
          </button>
        </div>
      </div>
      <div className="toolbar-right">
        <button
          className="toolbar-circle-btn"
          onClick={onUndo}
          title="撤销"
        >
          <Undo2 size={16} />
        </button>
        <button
          className="toolbar-circle-btn"
          onClick={onRedo}
          title="重做"
        >
          <Redo2 size={16} />
        </button>
        <button
          className={`toolbar-circle-btn ${showGrid ? 'active' : ''}`}
          onClick={onToggleGrid}
          title="切换网格"
        >
          <Grid3X3 size={16} />
        </button>
      </div>
    </div>
  )
}
