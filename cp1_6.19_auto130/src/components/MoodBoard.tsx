import { useState, useRef, useEffect, useCallback } from 'react';
import type { MoodBoard as MoodBoardType, BackgroundTexture, Color } from '../types/colors';
import { useAppStore } from '../stores/appStore';
import { isLightColor } from '../utils/colorEngine';
import './MoodBoard.css';

const BACKGROUND_TEXTURES: { type: BackgroundTexture; name: string }[] = [
  { type: 'solid', name: '纯色' },
  { type: 'marble', name: '大理石纹' },
  { type: 'watercolor', name: '水彩晕染' },
  { type: 'paper', name: '纸张质感' },
  { type: 'geometric', name: '几何图案' },
  { type: 'gradient', name: '渐变' },
];

function getBackgroundStyle(background: BackgroundTexture, color: string): React.CSSProperties {
  switch (background) {
    case 'marble':
      return {
        background: `linear-gradient(135deg, ${color} 0%, #f5f5f5 50%, ${color} 100%)`,
        backgroundImage: `radial-gradient(circle at 20% 80%, rgba(255,255,255,0.3) 0%, transparent 50%),
                          radial-gradient(circle at 80% 20%, rgba(200,200,200,0.3) 0%, transparent 50%),
                          linear-gradient(135deg, ${color}, #f0f0f0)`,
      };
    case 'watercolor':
      return {
        background: `radial-gradient(ellipse at 30% 30%, ${color}88 0%, transparent 50%),
                     radial-gradient(ellipse at 70% 70%, ${color}66 0%, transparent 50%),
                     ${color}22`,
      };
    case 'paper':
      return {
        background: `${color}`,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`,
      };
    case 'geometric':
      return {
        background: `${color}`,
        backgroundImage: `linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%),
                          linear-gradient(-45deg, rgba(255,255,255,0.1) 25%, transparent 25%),
                          linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.1) 75%),
                          linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.1) 75%)`,
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
      };
    case 'gradient':
      return {
        background: `linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%)`,
      };
    default:
      return { background: color };
  }
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

interface MoodBoardCardProps {
  board: MoodBoardType;
  onSelect: () => void;
  onDelete: () => void;
  isFlipped: boolean;
  onFlip: () => void;
}

function MoodBoardCard({ board, onSelect, onDelete, isFlipped, onFlip }: MoodBoardCardProps) {
  const bgStyle = getBackgroundStyle(board.background, board.backgroundColor);

  return (
    <div className="moodboard-card-wrapper" onClick={onSelect}>
      <div className={`moodboard-card ${isFlipped ? 'flipped' : ''}`}>
        <div className="card-face card-front">
          <div className="card-preview" style={bgStyle}>
            {board.items.slice(0, 6).map((item, idx) => (
              <div
                key={item.id}
                className="card-preview-item"
                style={{
                  left: `${10 + (idx % 3) * 30}%`,
                  top: `${15 + Math.floor(idx / 3) * 35}%`,
                  backgroundColor: item.color?.hex || 'transparent',
                  color: item.color ? (isLightColor(item.color.hex) ? '#333' : '#fff') : '#333',
                  fontSize: item.text ? '10px' : undefined,
                }}
              >
                {item.type === 'color' ? '' : item.text?.slice(0, 8)}
              </div>
            ))}
          </div>
          <div className="card-info">
            <span className="card-title">{board.name}</span>
            <span className="card-count">{board.items.length} 个元素</span>
          </div>
          <button
            className="card-flip-btn"
            onClick={(e) => {
              e.stopPropagation();
              onFlip();
            }}
          >
            ⓘ
          </button>
        </div>
        <div className="card-face card-back">
          <div className="card-back-content">
            <h4>备注</h4>
            <p>{board.note || '暂无备注'}</p>
            <div className="card-back-actions">
              <button
                className="btn btn-danger btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BoardEditorProps {
  board: MoodBoardType;
  onClose: () => void;
}

function BoardEditor({ board, onClose }: BoardEditorProps) {
  const { updateMoodBoardItem, removeItemFromMoodBoard, setMoodBoardBackground, addItemToMoodBoard, createTextItem } =
    useAppStore();
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [newText, setNewText] = useState('');
  const [bgColor, setBgColor] = useState(board.backgroundColor);
  const boardRef = useRef<HTMLDivElement>(null);

  const bgStyle = getBackgroundStyle(board.background, bgColor);

  const handleMouseDown = (e: React.MouseEvent, itemId: string) => {
    const item = board.items.find((i) => i.id === itemId);
    if (!item || !boardRef.current) return;

    const rect = boardRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left - item.x,
      y: e.clientY - rect.top - item.y,
    });
    setDraggingItem(itemId);
    setSelectedItem(itemId);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingItem || !boardRef.current) return;

      const rect = boardRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width - 60, e.clientX - rect.left - dragOffset.x));
      const y = Math.max(0, Math.min(rect.height - 40, e.clientY - rect.top - dragOffset.y));

      updateMoodBoardItem(board.id, draggingItem, { x, y });
    },
    [draggingItem, dragOffset, board.id, updateMoodBoardItem]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingItem(null);
  }, []);

  useEffect(() => {
    if (draggingItem) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingItem, handleMouseMove, handleMouseUp]);

  const handleAddText = () => {
    if (newText.trim()) {
      const item = createTextItem(newText, 100, 100);
      addItemToMoodBoard(board.id, item);
      setNewText('');
      setShowTextInput(false);
    }
  };

  const handleBgColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setBgColor(color);
    setMoodBoardBackground(board.id, board.background, color);
  };

  const handleBgTypeChange = (type: BackgroundTexture) => {
    setMoodBoardBackground(board.id, type, bgColor);
  };

  const handleExport = () => {
    if (!boardRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = 2;
    canvas.width = 800 * scale;
    canvas.height = 600 * scale;
    ctx.scale(scale, scale);

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 800, 600);

    board.items.forEach((item) => {
      if (item.type === 'color' && item.color) {
        ctx.fillStyle = item.color.hex;
        ctx.fillRect(item.x, item.y, 80, 80);
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.strokeRect(item.x, item.y, 80, 80);
      } else if (item.type === 'text' && item.text) {
        ctx.fillStyle = item.textColor || '#000';
        ctx.font = `${item.fontSize || 16}px ${item.fontFamily || 'sans-serif'}`;
        ctx.fillText(item.text, item.x, item.y + (item.fontSize || 16));
      }
    });

    const link = document.createElement('a');
    link.download = `${board.name}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Delete' && selectedItem) {
        removeItemFromMoodBoard(board.id, selectedItem);
        setSelectedItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, selectedItem, board.id, removeItemFromMoodBoard]);

  return (
    <div className="board-editor-overlay" onClick={onClose}>
      <div className="board-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="editor-header">
          <h3>{board.name}</h3>
          <div className="editor-actions">
            <button className="btn btn-primary btn-sm" onClick={handleExport}>
              导出 PNG
            </button>
            <button className="close-btn" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        <div className="editor-body">
          <div className="editor-sidebar">
            <div className="sidebar-section">
              <h4>背景纹理</h4>
              <div className="texture-grid">
                {BACKGROUND_TEXTURES.map((tex) => (
                  <button
                    key={tex.type}
                    className={`texture-btn ${board.background === tex.type ? 'active' : ''}`}
                    onClick={() => handleBgTypeChange(tex.type)}
                    style={getBackgroundStyle(tex.type, bgColor)}
                    title={tex.name}
                  />
                ))}
              </div>
            </div>

            <div className="sidebar-section">
              <h4>背景颜色</h4>
              <input
                type="color"
                value={bgColor}
                onChange={handleBgColorChange}
                className="color-input"
              />
            </div>

            <div className="sidebar-section">
              <h4>添加文字</h4>
              {showTextInput ? (
                <div className="text-input-group">
                  <input
                    type="text"
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder="输入文字..."
                    className="text-input"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
                  />
                  <button className="btn btn-primary btn-sm" onClick={handleAddText}>
                    添加
                  </button>
                </div>
              ) : (
                <button className="btn btn-secondary btn-block" onClick={() => setShowTextInput(true)}>
                  + 添加文字标签
                </button>
              )}
            </div>

            <div className="sidebar-section">
              <p className="hint-text">提示：拖拽颜色块可移动位置，Delete 键删除选中元素</p>
            </div>
          </div>

          <div
            ref={boardRef}
            className="board-canvas"
            style={bgStyle}
            onClick={() => setSelectedItem(null)}
          >
            {board.items.map((item) => (
              <div
                key={item.id}
                className={`board-item ${item.type} ${selectedItem === item.id ? 'selected' : ''} ${draggingItem === item.id ? 'dragging' : ''}`}
                style={{
                  left: item.x,
                  top: item.y,
                  backgroundColor: item.color?.hex || 'transparent',
                  color: item.type === 'text' ? item.textColor || '#000' : undefined,
                  fontSize: item.type === 'text' ? `${item.fontSize || 16}px` : undefined,
                }}
                onMouseDown={(e) => handleMouseDown(e, item.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedItem(item.id);
                }}
              >
                {item.type === 'text' ? item.text : ''}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface MoodBoardProps {
  onDropColor?: (color: Color, boardId: string) => void;
}

export default function MoodBoard({ onDropColor }: MoodBoardProps) {
  const { state, addMoodBoard, deleteMoodBoard } = useAppStore();
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [editingBoard, setEditingBoard] = useState<MoodBoardType | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');

  const toggleFlip = (id: string) => {
    setFlippedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCreateBoard = () => {
    if (newBoardName.trim()) {
      addMoodBoard(newBoardName.trim());
      setNewBoardName('');
      setShowCreateModal(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, boardId: string) => {
    e.preventDefault();
    const colorHex = e.dataTransfer.getData('color/hex');
    const colorName = e.dataTransfer.getData('color/name');
    if (colorHex && onDropColor) {
      import('../utils/colorEngine').then(({ createColor }) => {
        const color = createColor(colorHex);
        color.name = colorName || color.name;
        onDropColor(color, boardId);
      });
    }
  };

  return (
    <div className="moodboard-container">
      <div className="moodboard-header">
        <h2>灵感板</h2>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + 新建灵感板
        </button>
      </div>

      {state.moodBoards.length === 0 ? (
        <div className="empty-moodboards">
          <div className="empty-icon">🎨</div>
          <p>还没有灵感板，创建一个开始收集你的配色灵感吧！</p>
        </div>
      ) : (
        <div className="moodboard-grid">
          {state.moodBoards.map((board) => (
            <div
              key={board.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, board.id)}
            >
              <MoodBoardCard
                board={board}
                onSelect={() => setEditingBoard(board)}
                onDelete={() => deleteMoodBoard(board.id)}
                isFlipped={flippedCards.has(board.id)}
                onFlip={() => toggleFlip(board.id)}
              />
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content glass-effect" onClick={(e) => e.stopPropagation()}>
            <h3>新建灵感板</h3>
            <input
              type="text"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder="输入灵感板名称..."
              className="modal-input"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateBoard()}
            />
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleCreateBoard}>
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {editingBoard && (
        <BoardEditor board={editingBoard} onClose={() => setEditingBoard(null)} />
      )}
    </div>
  );
}
