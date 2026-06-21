import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Trash2, Layers } from 'lucide-react';
import { ThemeSwitcher, Theme } from './components/ThemeSwitcher';
import { BoardView } from './components/BoardView';
import { Board, PRESET_COLORS, boardManager } from './modules/boardManager/BoardManager';
import { cardManager } from './modules/cardManager/CardManager';

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>('light');
  const [boards, setBoards] = useState<Board[]>([]);
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>('vermilion');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem('inspiration_theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('inspiration_theme', theme);
  }, [theme]);

  const loadBoards = useCallback(async () => {
    setIsLoading(true);
    await boardManager.init();
    setBoards(boardManager.getBoards());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return;
    await boardManager.createBoard(newBoardName, selectedColor);
    setBoards(boardManager.getBoards());
    setShowCreateModal(false);
    setNewBoardName('');
    setSelectedColor('vermilion');
  };

  const handleDeleteBoard = async (e: React.MouseEvent, boardId: string) => {
    e.stopPropagation();
    if (confirm('确定要删除这个灵感板吗？所有卡片也会被删除。')) {
      await boardManager.deleteBoard(boardId);
      setBoards(boardManager.getBoards());
    }
  };

  const handleOpenBoard = async (board: Board) => {
    await cardManager.init(board.id);
    setCurrentBoard(board);
  };

  const handleBack = () => {
    setCurrentBoard(null);
    loadBoards();
  };

  const getCardCount = (boardId: string): number => {
    try {
      const stored = sessionStorage.getItem(`card_count_${boardId}`);
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  };

  if (currentBoard) {
    return (
      <div className={`app-container theme-${theme}`}>
        <div className="app-header">
          <ThemeSwitcher theme={theme} onToggle={toggleTheme} />
        </div>
        <div className="app-content">
          <BoardView
            boardId={currentBoard.id}
            boardName={currentBoard.name}
            theme={theme}
            onBack={handleBack}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`app-container theme-${theme}`}>
      <div className="app-header">
        <ThemeSwitcher theme={theme} onToggle={toggleTheme} />
      </div>
      <div className="app-content">
        <div className="boards-header">
          <div className="boards-title-wrap">
            <Layers size={28} />
            <h1 className="boards-title">我的灵感板</h1>
          </div>
          <button className="create-board-btn" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} />
            <span>新建灵感板</span>
          </button>
        </div>

        {isLoading ? (
          <div className="loading-state">
            <p>加载中...</p>
          </div>
        ) : (
          <>
            {boards.length === 0 ? (
              <div className="empty-state boards-empty">
                <p>还没有灵感板</p>
                <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                  创建第一个灵感板
                </button>
              </div>
            ) : (
              <div className="boards-grid">
                {boards.map(board => (
                  <div
                    key={board.id}
                    className="board-card"
                    style={{ background: board.coverColor }}
                    onClick={() => handleOpenBoard(board)}
                  >
                    <button
                      className="board-delete-btn"
                      onClick={(e) => handleDeleteBoard(e, board.id)}
                      title="删除灵感板"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="board-card-count">
                      {getCardCount(board.id)} 张卡片
                    </div>
                    <div className="board-card-name">{board.name}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>新建灵感板</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>灵感板名称</label>
                <input
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder="输入灵感板名称"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>选择封面色</label>
                <div className="color-picker">
                  {Object.entries(PRESET_COLORS).map(([key, value]) => (
                    <button
                      key={key}
                      className={`color-option ${selectedColor === key ? 'selected' : ''}`}
                      style={{ background: value.gradient }}
                      onClick={() => setSelectedColor(key)}
                      title={value.name}
                    >
                      <span className="color-name">{value.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>取消</button>
              <button
                className="btn-primary"
                onClick={handleCreateBoard}
                disabled={!newBoardName.trim()}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
