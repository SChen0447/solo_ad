import React, { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import CanvasBoard from './components/CanvasBoard';
import ControlPanel from './components/ControlPanel';

const COLORS = ['#FF0000', '#0000FF', '#00AA00', '#000000', '#8B00FF'];
const COLOR_NAMES = ['红', '蓝', '绿', '黑', '紫'];
const THICKNESSES = [3, 6, 10];

interface OnlineUser {
  id: string;
  color: string;
}

interface BoardHandle {
  clear: () => void;
  undo: () => void;
  sync: () => void;
  savePng: () => void;
  getUndoCount: () => number;
}

const useIsNarrow = () => {
  const [isNarrow, setIsNarrow] = useState(false);
  useLayoutEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 600);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isNarrow;
};

const App: React.FC = () => {
  const [brushColor, setBrushColor] = useState<string>(COLORS[0]);
  const [brushThickness, setBrushThickness] = useState<number>(THICKNESSES[1]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const userIdRef = useRef<string>(uuidv4());
  const boardRef = useRef<BoardHandle>(null);
  const isNarrow = useIsNarrow();

  useEffect(() => {
    const simulatedUsers: OnlineUser[] = [
      { id: userIdRef.current, color: COLORS[0] },
      { id: uuidv4(), color: COLORS[1] },
      { id: uuidv4(), color: COLORS[2] },
    ];
    setOnlineUsers(simulatedUsers);
  }, []);

  useEffect(() => {
    setOnlineUsers(prev =>
      prev.map(u => (u.id === userIdRef.current ? { ...u, color: brushColor } : u))
    );
  }, [brushColor]);

  const handleClear = useCallback(() => {
    boardRef.current?.clear();
  }, []);

  const handleUndo = useCallback(() => {
    boardRef.current?.undo();
  }, []);

  const handleSync = useCallback(() => {
    boardRef.current?.sync();
  }, []);

  const handleSavePng = useCallback(() => {
    boardRef.current?.savePng();
  }, []);

  const handleUndoCountChange = useCallback((count: number) => {
    setUndoCount(count);
  }, []);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: isNarrow ? 'column' : 'row',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      overflow: 'hidden',
      background: '#FAFAFA',
    }}>
      <div style={{
        width: isNarrow ? '100%' : '70%',
        height: isNarrow ? '70%' : '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isNarrow ? '8px' : '16px',
      }}>
        <CanvasBoard
          ref={boardRef}
          brushColor={brushColor}
          brushThickness={brushThickness}
          onlineUsers={onlineUsers}
          userId={userIdRef.current}
          onUndoCountChange={handleUndoCountChange}
        />
      </div>
      <div style={{
        width: isNarrow ? '100%' : '30%',
        height: isNarrow ? '30%' : '100%',
        display: 'flex',
        alignItems: isNarrow ? 'flex-start' : 'center',
        justifyContent: 'center',
        padding: isNarrow ? '8px' : '0',
      }}>
        <ControlPanel
          brushColor={brushColor}
          brushThickness={brushThickness}
          onlineUsers={onlineUsers}
          colors={COLORS}
          colorNames={COLOR_NAMES}
          thicknesses={THICKNESSES}
          undoCount={undoCount}
          onColorChange={setBrushColor}
          onThicknessChange={setBrushThickness}
          onSync={handleSync}
          onClear={handleClear}
          onUndo={handleUndo}
          onSavePng={handleSavePng}
          isNarrow={isNarrow}
        />
      </div>
    </div>
  );
};

export default App;
