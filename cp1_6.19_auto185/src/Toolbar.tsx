import React, { useState } from 'react';
import { CardManager } from './CardManager';
import { ConnectionManager } from './ConnectionManager';

interface ToolbarProps {
  cardManager: CardManager;
  connectionManager: ConnectionManager;
  onAddCard: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ cardManager, connectionManager, onAddCard }) => {
  const [canUndo, setCanUndo] = useState(cardManager.canUndo());
  const [canRedo, setCanRedo] = useState(cardManager.canRedo());
  const [showSaveCheck, setShowSaveCheck] = useState(false);

  const refreshUndoRedo = () => {
    setCanUndo(cardManager.canUndo());
    setCanRedo(cardManager.canRedo());
  };

  React.useEffect(() => {
    const unsub = cardManager.subscribe(refreshUndoRedo);
    return unsub;
  }, [cardManager]);

  const handleUndo = () => {
    cardManager.undo();
  };

  const handleRedo = () => {
    cardManager.redo();
  };

  const handleSave = () => {
    const data = {
      cards: cardManager.toJSON(),
      connections: connectionManager.toJSON(),
      savedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspiration-board-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowSaveCheck(true);
    setTimeout(() => setShowSaveCheck(false), 1500);
  };

  return (
    <div className="toolbar">
      <button
        className="toolbar-btn"
        onClick={onAddCard}
        title="添加卡片"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <div className="toolbar-divider" />

      <button
        className="toolbar-btn"
        onClick={handleUndo}
        disabled={!canUndo}
        title="撤销 (Ctrl+Z)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.7 3L3 13" />
        </svg>
      </button>
      <button
        className="toolbar-btn"
        onClick={handleRedo}
        disabled={!canRedo}
        title="重做 (Ctrl+Y / Ctrl+Shift+Z)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 7v6h-6" />
          <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.7 3L21 13" />
        </svg>
      </button>

      <div className="toolbar-divider" />

      <button
        className="toolbar-btn"
        onClick={handleSave}
        title="保存为JSON文件"
      >
        {showSaveCheck ? (
          <span className="toolbar-check">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
        )}
      </button>
    </div>
  );
};
