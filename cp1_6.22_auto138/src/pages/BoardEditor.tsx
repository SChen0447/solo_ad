import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { User, BaseElement, ToolType, Operation, HistorySnapshot } from '../types';
import { useSocket } from '../hooks/useSocket';
import Toolbar from '../components/Toolbar';
import UserList from '../components/UserList';
import Canvas from '../components/Canvas';
import { formatDate } from '../utils';

interface BoardEditorProps {
  user: User;
  onUpdateName: (name: string) => void;
  navigate: (path: string) => void;
}

function BoardEditor({ user, onUpdateName, navigate }: BoardEditorProps) {
  const { id } = useParams<{ id: string }>();
  const boardId = id || '';
  
  const [elements, setElements] = useState<BaseElement[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentTool, setCurrentTool] = useState<ToolType>('select');
  const [currentColor, setCurrentColor] = useState('#3b82f6');
  const [currentLineWidth, setCurrentLineWidth] = useState(2);
  const [boardName, setBoardName] = useState('白板');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [showUserPopup, setShowUserPopup] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const remoteCursorsRef = useRef<Map<string, { x: number; y: number; user: User }>>(new Map());
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (boardId) {
      fetch(`/api/boards/${boardId}`)
        .then(res => res.json())
        .then(data => {
          setBoardName(data.name);
          setElements(data.elements);
        })
        .catch(err => console.error('Failed to load board:', err));
      
      loadHistory();
    }
  }, [boardId]);

  const loadHistory = async () => {
    try {
      const response = await fetch(`/api/boards/${boardId}/history`);
      const data = await response.json() as HistorySnapshot[];
      setHistory(data.reverse());
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const handleElementsInit = useCallback((newElements: BaseElement[]) => {
    setElements(newElements);
  }, []);

  const handleElementAdded = useCallback((element: BaseElement) => {
    setElements(prev => [...prev, element]);
  }, []);

  const handleElementUpdated = useCallback((data: { elementId: string; updates: Partial<BaseElement> }) => {
    setElements(prev => prev.map(el => 
      el.id === data.elementId ? { ...el, ...data.updates } : el
    ));
  }, []);

  const handleElementDeleted = useCallback((elementId: string) => {
    setElements(prev => prev.filter(el => el.id !== elementId));
  }, []);

  const handleElementsRestore = useCallback((data: { elements: BaseElement[]; userId: string }) => {
    setElements(data.elements);
  }, []);

  const handleUserJoined = useCallback((joinedUser: User) => {
    setUsers(prev => {
      if (prev.find(u => u.id === joinedUser.id)) return prev;
      return [...prev, joinedUser];
    });
  }, []);

  const handleUserLeft = useCallback((leftUser: User) => {
    setUsers(prev => prev.filter(u => u.id !== leftUser.id));
    remoteCursorsRef.current.delete(leftUser.id);
    forceUpdate(x => x + 1);
  }, []);

  const handleUserUpdated = useCallback((updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  }, []);

  const handleUsersList = useCallback((usersList: User[]) => {
    setUsers(usersList);
  }, []);

  const handleBoardUndone = useCallback((data: { operation: Operation; userId: string }) => {
    const op = data.operation;
    if (op.type === 'add' && op.element) {
      setElements(prev => [...prev, op.element!]);
    } else if (op.type === 'delete' && op.element) {
      setElements(prev => prev.filter(el => el.id !== op.element!.id));
    } else if (op.type === 'update' && op.element) {
      setElements(prev => prev.map(el => 
        el.id === op.element!.id ? { ...el, ...op.element! } : el
      ));
    }
  }, []);

  const handleBoardRedone = useCallback((data: { operation: Operation; userId: string }) => {
    const op = data.operation;
    if (op.type === 'add' && op.element) {
      setElements(prev => [...prev, op.element!]);
    } else if (op.type === 'delete' && op.element) {
      setElements(prev => prev.filter(el => el.id !== op.element!.id));
    } else if (op.type === 'update' && op.element) {
      setElements(prev => prev.map(el => 
        el.id === op.element!.id ? { ...el, ...op.element! } : el
      ));
    }
  }, []);

  const handleCursorMoved = useCallback((data: { userId: string; x: number; y: number }) => {
    const cursorUser = users.find(u => u.id === data.userId);
    if (cursorUser) {
      remoteCursorsRef.current.set(data.userId, {
        x: data.x,
        y: data.y,
        user: cursorUser
      });
      forceUpdate(x => x + 1);
    }
  }, [users]);

  const {
    sendElementAdd,
    sendElementUpdate,
    sendElementDelete,
    sendUndo,
    sendRedo,
    sendCursorMove
  } = useSocket({
    boardId,
    userId: user.id,
    onElementsInit: handleElementsInit,
    onElementAdded: handleElementAdded,
    onElementUpdated: handleElementUpdated,
    onElementDeleted: handleElementDeleted,
    onElementsRestore: handleElementsRestore,
    onUserJoined: handleUserJoined,
    onUserLeft: handleUserLeft,
    onUserUpdated: handleUserUpdated,
    onUsersList: handleUsersList,
    onBoardUndone: handleBoardUndone,
    onBoardRedone: handleBoardRedone,
    onCursorMoved: handleCursorMoved
  });

  const handleElementAdd = useCallback((element: BaseElement) => {
    setElements(prev => [...prev, element]);
    sendElementAdd(element);
  }, [sendElementAdd]);

  const handleElementUpdate = useCallback((elementId: string, updates: Partial<BaseElement>) => {
    setElements(prev => prev.map(el => 
      el.id === elementId ? { ...el, ...updates } : el
    ));
    sendElementUpdate(elementId, updates);
  }, [sendElementUpdate]);

  const handleElementDelete = useCallback((elementId: string) => {
    setElements(prev => prev.filter(el => el.id !== elementId));
    sendElementDelete(elementId);
  }, [sendElementDelete]);

  const handleUndo = useCallback(() => {
    sendUndo();
  }, [sendUndo]);

  const handleRedo = useCallback(() => {
    sendRedo();
  }, [sendRedo]);

  const handleSave = useCallback(async () => {
    try {
      await fetch(`/api/boards/${boardId}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, userName: user.name })
      });
      loadHistory();
      alert('保存成功！');
    } catch (err) {
      console.error('Failed to save snapshot:', err);
      alert('保存失败');
    }
  }, [boardId, user.id, user.name]);

  const handleRestore = async (snapshotId: string) => {
    if (!confirm('确定要恢复到此版本吗？当前内容将被覆盖。')) return;
    
    try {
      await fetch(`/api/boards/${boardId}/history/${snapshotId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, userName: user.name })
      });
      setShowHistory(false);
      loadHistory();
    } catch (err) {
      console.error('Failed to restore snapshot:', err);
      alert('恢复失败');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleSave]);

  return (
    <div className="board-editor-page">
      <header className="editor-header">
        <Toolbar
          currentTool={currentTool}
          onToolChange={setCurrentTool}
          currentColor={currentColor}
          onColorChange={setCurrentColor}
          currentLineWidth={currentLineWidth}
          onLineWidthChange={setCurrentLineWidth}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onSave={handleSave}
          onShowHistory={() => setShowHistory(true)}
          onBack={() => navigate('/')}
          boardName={boardName}
          isMobile={false}
        />
      </header>

      <div className="editor-main">
        <div className="canvas-container">
          <Canvas
            elements={elements}
            onElementAdd={handleElementAdd}
            onElementUpdate={handleElementUpdate}
            onElementDelete={handleElementDelete}
            onCursorMove={sendCursorMove}
            currentTool={currentTool}
            currentColor={currentColor}
            currentLineWidth={currentLineWidth}
            remoteCursors={remoteCursorsRef.current}
          />
        </div>

        <aside className="sidebar-right">
          <h3 className="sidebar-title">在线用户 ({users.length})</h3>
          <UserList users={users} currentUserId={user.id} />
          
          {isMobile && (
            <div style={{ marginTop: 20 }}>
              <h3 className="sidebar-title">颜色</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#111827'].map(color => (
                  <button
                    key={color}
                    className={`color-swatch ${currentColor === color ? 'active' : ''}`}
                    style={{ 
                      backgroundColor: color, 
                      width: 24, 
                      height: 24, 
                      borderRadius: '50%',
                      border: currentColor === color ? '2px solid white' : '2px solid transparent',
                      cursor: 'pointer'
                    }}
                    onClick={() => setCurrentColor(color)}
                  />
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {isMobile && (
        <>
          <div className="mobile-toolbar">
            <Toolbar
              currentTool={currentTool}
              onToolChange={setCurrentTool}
              currentColor={currentColor}
              onColorChange={setCurrentColor}
              currentLineWidth={currentLineWidth}
              onLineWidthChange={setCurrentLineWidth}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onSave={handleSave}
              onShowHistory={() => setShowHistory(true)}
              onBack={() => navigate('/')}
              boardName={boardName}
              isMobile={true}
            />
          </div>
          <button 
            className="mobile-user-btn"
            onClick={() => setShowUserPopup(!showUserPopup)}
          >
            👥
          </button>
          {showUserPopup && (
            <div className="user-popup">
              <h3 className="sidebar-title">在线用户 ({users.length})</h3>
              <UserList users={users} currentUserId={user.id} isPopup={true} />
            </div>
          )}
        </>
      )}

      {showHistory && (
        <div className="history-modal" onClick={() => setShowHistory(false)}>
          <div className="history-modal-content" onClick={e => e.stopPropagation()}>
            <div className="history-modal-header">
              <h2 className="history-modal-title">历史版本</h2>
              <button 
                className="btn btn-secondary btn-active"
                onClick={() => setShowHistory(false)}
              >
                关闭
              </button>
            </div>
            <div className="history-list">
              {history.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px', 
                  color: '#64748b' 
                }}>
                  暂无历史版本，点击保存按钮创建第一个快照
                </div>
              ) : (
                history.map(snapshot => (
                  <div 
                    key={snapshot.id}
                    className="history-item"
                    onClick={() => handleRestore(snapshot.id)}
                  >
                    <div className="history-item-meta">
                      <span className="history-item-time">
                        {formatDate(snapshot.createdAt)}
                      </span>
                      <span className="history-item-creator">
                        {snapshot.createdByName}
                      </span>
                    </div>
                    <div className="history-item-preview">
                      包含 {snapshot.elements.length} 个元素
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BoardEditor;
