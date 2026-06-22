import { useState, useEffect, KeyboardEvent } from 'react';
import { User, BoardInfo } from '../types';
import { getRelativeTime, getInitials } from '../utils';

interface BoardListProps {
  user: User;
  onUpdateName: (name: string) => void;
  navigate: (path: string) => void;
}

function BoardList({ user, onUpdateName, navigate }: BoardListProps) {
  const [boards, setBoards] = useState<BoardInfo[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user.name);

  useEffect(() => {
    loadBoards();
  }, []);

  const loadBoards = async () => {
    try {
      const response = await fetch('/api/boards');
      const data = await response.json() as BoardInfo[];
      setBoards(data);
    } catch (error) {
      console.error('Failed to load boards:', error);
    }
  };

  const handleCreateBoard = async () => {
    try {
      const response = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `白板 ${new Date().toLocaleDateString('zh-CN')}` })
      });
      const newBoard = await response.json() as BoardInfo;
      navigate(`/board/${newBoard.id}`);
    } catch (error) {
      console.error('Failed to create board:', error);
    }
  };

  const handleNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameConfirm();
    }
  };

  const handleNameConfirm = () => {
    if (nameInput.trim()) {
      onUpdateName(nameInput.trim());
      setEditingName(false);
    }
  };

  return (
    <div className="board-list-page">
      <div className="page-header">
        <div className="header-left">
          <h1 className="page-title">我的白板</h1>
          <div className="user-profile">
            <div 
              className="user-avatar" 
              style={{ backgroundColor: user.avatarColor }}
            >
              {getInitials(user.name)}
            </div>
            {editingName ? (
              <div className="name-input-container">
                <input
                  type="text"
                  className="name-input"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={handleNameKeyDown}
                  autoFocus
                />
                <button className="btn btn-primary btn-active" onClick={handleNameConfirm}>
                  确认
                </button>
              </div>
            ) : (
              <span 
                style={{ cursor: 'pointer', color: '#94a3b8' }}
                onClick={() => {
                  setNameInput(user.name);
                  setEditingName(true);
                }}
              >
                {user.name}
              </span>
            )}
          </div>
        </div>
        <button 
          className="create-board-btn rotate-hover"
          onClick={handleCreateBoard}
          title="新建白板"
        >
          +
        </button>
      </div>
      
      <div className="boards-grid">
        {boards.map(board => (
          <div
            key={board.id}
            className="board-card"
            onClick={() => navigate(`/board/${board.id}`)}
          >
            <div className="board-name">{board.name}</div>
            <div className="board-meta">
              <div className="board-meta-item">
                最后编辑：{getRelativeTime(board.updatedAt)}
              </div>
              <div className="board-meta-item">
                创建于：{new Date(board.createdAt).toLocaleDateString('zh-CN')}
              </div>
              <div className="board-meta-item">
                参与者：{board.participantCount} 人
              </div>
            </div>
          </div>
        ))}
        
        {boards.length === 0 && (
          <div style={{ 
            gridColumn: '1 / -1', 
            textAlign: 'center', 
            padding: '60px 20px',
            color: '#64748b'
          }}>
            <p style={{ fontSize: '18px', marginBottom: '12px' }}>还没有白板</p>
            <p>点击右上角的 + 按钮创建第一个白板</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default BoardList;
