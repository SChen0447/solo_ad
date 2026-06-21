import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import ChatPanel from './components/ChatPanel';
import UserList from './components/UserList';
import StickerPanel from './components/StickerPanel';
import type {
  User,
  Path,
  TextItem,
  StickerItem,
  HistoryState,
  ChatMessage,
  ToolType,
  StickerType
} from './types';
import './styles/app.css';

type ViewState = 'lobby' | 'whiteboard';

function App() {
  const [view, setView] = useState<ViewState>('lobby');
  const [nickname, setNickname] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [roomId, setRoomId] = useState('');
  const [userId, setUserId] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const [paths, setPaths] = useState<Path[]>([]);
  const [texts, setTexts] = useState<TextItem[]>([]);
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  
  const [selectedTool, setSelectedTool] = useState<ToolType>('pencil');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const [selectedSize, setSelectedSize] = useState(3);
  const [textFontSize, setTextFontSize] = useState(24);
  
  const [historyIndex, setHistoryIndex] = useState(0);
  const [historyLength, setHistoryLength] = useState(1);
  
  const [showStickerPanel, setShowStickerPanel] = useState(false);
  const [selectedStickerType, setSelectedStickerType] = useState<StickerType>('smile');
  const [copiedTip, setCopiedTip] = useState(false);
  const [nicknameError, setNicknameError] = useState('');
  const [undoRedoAnimating, setUndoRedoAnimating] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);
  const remoteDrawingRef = useRef<Map<string, { points: { x: number; y: number }[]; color: string; size: number; tool: string }>>(new Map());

  useEffect(() => {
    const socket = io('http://localhost:3001', {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('roomCreated', ({ roomId, userId }) => {
      setRoomId(roomId);
      setUserId(userId);
      setView('whiteboard');
    });

    socket.on('roomJoined', ({ roomId, userId, users }) => {
      setRoomId(roomId);
      setUserId(userId);
      setUsers(users);
      setView('whiteboard');
    });

    socket.on('error', ({ message }) => {
      alert(message);
    });

    socket.on('fullState', (data) => {
      setPaths(data.paths || []);
      setTexts(data.texts || []);
      setStickers(data.stickers || []);
      setUsers(data.users || []);
      setHistoryIndex(data.historyIndex || 0);
      setHistoryLength(data.historyLength || 1);
    });

    socket.on('userJoined', ({ user }) => {
      setUsers(prev => [...prev, user]);
    });

    socket.on('userLeft', ({ userId }) => {
      setUsers(prev => prev.filter(u => u.id !== userId));
    });

    socket.on('drawStart', (data) => {
      remoteDrawingRef.current.set(data.pathId, {
        points: [{ x: data.x, y: data.y }],
        color: data.color,
        size: data.size,
        tool: data.tool
      });
    });

    socket.on('drawMove', (data) => {
      const drawing = remoteDrawingRef.current.get(data.pathId);
      if (drawing) {
        drawing.points.push({ x: data.x, y: data.y });
      }
    });

    socket.on('drawEnd', (data) => {
      remoteDrawingRef.current.delete(data.pathId);
      setHistoryIndex(data.historyIndex);
      setHistoryLength(data.historyLength);
    });

    socket.on('textAdded', ({ text, historyIndex, historyLength }) => {
      setTexts(prev => [...prev, text]);
      setHistoryIndex(historyIndex);
      setHistoryLength(historyLength);
    });

    socket.on('stickerAdded', ({ sticker, historyIndex, historyLength }) => {
      setStickers(prev => [...prev, sticker]);
      setHistoryIndex(historyIndex);
      setHistoryLength(historyLength);
    });

    socket.on('stickerMoved', ({ stickerId, x, y, historyIndex, historyLength }) => {
      setStickers(prev => prev.map(s => 
        s.id === stickerId ? { ...s, x, y } : s
      ));
      setHistoryIndex(historyIndex);
      setHistoryLength(historyLength);
    });

    socket.on('canvasUndo', (state) => {
      setUndoRedoAnimating(true);
      setTimeout(() => {
        setPaths(state.paths || []);
        setTexts(state.texts || []);
        setStickers(state.stickers || []);
        setHistoryIndex(state.historyIndex);
        setHistoryLength(state.historyLength);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setUndoRedoAnimating(false);
          });
        });
      }, 250);
    });

    socket.on('canvasRedo', (state) => {
      setUndoRedoAnimating(true);
      setTimeout(() => {
        setPaths(state.paths || []);
        setTexts(state.texts || []);
        setStickers(state.stickers || []);
        setHistoryIndex(state.historyIndex);
        setHistoryLength(state.historyLength);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setUndoRedoAnimating(false);
          });
        });
      }, 250);
    });

    socket.on('canvasCleared', ({ historyIndex, historyLength }) => {
      setPaths([]);
      setTexts([]);
      setStickers([]);
      setHistoryIndex(historyIndex);
      setHistoryLength(historyLength);
    });

    socket.on('messageReceived', (message) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const validateNickname = (name: string): string => {
    if (name.length < 2 || name.length > 10) {
      return '昵称长度需在2-10个字符之间';
    }
    const filtered = name.replace(/[<>\\/\'\"&;]/g, '');
    if (filtered !== name) {
      return '昵称包含非法字符';
    }
    return '';
  };

  const handleCreateRoom = () => {
    const error = validateNickname(nickname);
    if (error) {
      setNicknameError(error);
      return;
    }
    setNicknameError('');
    socketRef.current?.emit('createRoom', { nickname });
  };

  const handleJoinRoom = () => {
    const error = validateNickname(nickname);
    if (error) {
      setNicknameError(error);
      return;
    }
    if (!roomIdInput || roomIdInput.length !== 6 || !/^\d+$/.test(roomIdInput)) {
      setNicknameError('请输入有效的6位数字邀请码');
      return;
    }
    setNicknameError('');
    socketRef.current?.emit('joinRoom', { roomId: roomIdInput, nickname });
  };

  const handleUndo = useCallback(() => {
    socketRef.current?.emit('undo');
  }, []);

  const handleRedo = useCallback(() => {
    socketRef.current?.emit('redo');
  }, []);

  const handleClear = useCallback(() => {
    if (confirm('确定要清空画布吗？')) {
      socketRef.current?.emit('clearCanvas');
    }
  }, []);

  const handleSendMessage = useCallback((text: string) => {
    socketRef.current?.emit('sendMessage', { text });
  }, []);

  const handleShare = useCallback(() => {
    const link = `${window.location.origin}/?room=${roomId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedTip(true);
      setTimeout(() => setCopiedTip(false), 2000);
    });
  }, [roomId]);

  const handleExport = useCallback(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (paths.length === 0 && texts.length === 0 && stickers.length === 0) {
      canvas.width = 800;
      canvas.height = 600;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const link = document.createElement('a');
      link.download = `whiteboard_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      return;
    }

    const allX: number[] = [];
    const allY: number[] = [];

    paths.forEach(path => {
      path.points.forEach(pt => {
        allX.push(pt.x - path.size / 2);
        allX.push(pt.x + path.size / 2);
        allY.push(pt.y - path.size / 2);
        allY.push(pt.y + path.size / 2);
      });
    });

    texts.forEach(textItem => {
      ctx.font = `${textItem.fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`;
      ctx.textBaseline = 'alphabetic';
      const metrics = ctx.measureText(textItem.text);
      
      let xMin, xMax, yMin, yMax;
      if ((metrics as any).actualBoundingBoxLeft !== undefined) {
        xMin = textItem.x - (metrics as any).actualBoundingBoxLeft;
        xMax = textItem.x + (metrics as any).actualBoundingBoxRight;
        yMin = textItem.y - (metrics as any).actualBoundingBoxAscent;
        yMax = textItem.y + (metrics as any).actualBoundingBoxDescent;
      } else {
        xMin = textItem.x;
        xMax = textItem.x + metrics.width;
        yMin = textItem.y - textItem.fontSize;
        yMax = textItem.y;
      }
      allX.push(xMin, xMax);
      allY.push(yMin, yMax);
    });

    stickers.forEach(sticker => {
      const stickerSize = 40;
      const stickerPadding = 4;
      allX.push(sticker.x - stickerPadding);
      allX.push(sticker.x + stickerSize + stickerPadding);
      allY.push(sticker.y - stickerPadding);
      allY.push(sticker.y + stickerSize + stickerPadding);
    });

    const padding = 20;
    const minX = Math.min(...allX) - padding;
    const minY = Math.min(...allY) - padding;
    const maxX = Math.max(...allX) + padding;
    const maxY = Math.max(...allY) + padding;

    canvas.width = maxX - minX;
    canvas.height = maxY - minY;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-minX, -minY);

    paths.forEach(path => {
      if (path.points.length < 2) return;
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (path.tool === 'pencil' || path.tool === 'eraser') {
        if (path.tool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
        }
        ctx.beginPath();
        ctx.moveTo(path.points[0].x, path.points[0].y);
        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(path.points[i].x, path.points[i].y);
        }
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      } else if (path.tool === 'rectangle') {
        const start = path.points[0];
        const end = path.points[path.points.length - 1];
        ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
      } else if (path.tool === 'circle') {
        const start = path.points[0];
        const end = path.points[path.points.length - 1];
        const radiusX = Math.abs(end.x - start.x) / 2;
        const radiusY = Math.abs(end.y - start.y) / 2;
        const centerX = start.x + (end.x - start.x) / 2;
        const centerY = start.y + (end.y - start.y) / 2;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (path.tool === 'line') {
        const start = path.points[0];
        const end = path.points[path.points.length - 1];
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
    });

    texts.forEach(textItem => {
      ctx.fillStyle = textItem.color;
      ctx.font = `${textItem.fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`;
      ctx.fillText(textItem.text, textItem.x, textItem.y);
    });

    ctx.restore();

    const link = document.createElement('a');
    link.download = `whiteboard_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [paths, texts, stickers]);

  const handleAddText = useCallback((textItem: TextItem) => {
    socketRef.current?.emit('addText', textItem);
  }, []);

  const handleAddSticker = useCallback((sticker: StickerItem) => {
    socketRef.current?.emit('addSticker', sticker);
  }, []);

  const handleMoveSticker = useCallback((stickerId: string, x: number, y: number) => {
    socketRef.current?.emit('moveSticker', { stickerId, x, y });
  }, []);

  const handleStickerSelect = (type: StickerType) => {
    setSelectedStickerType(type);
    setSelectedTool('sticker');
    setShowStickerPanel(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (view !== 'whiteboard') return;
      
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (e.ctrlKey && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, handleUndo, handleRedo]);

  if (view === 'lobby') {
    return (
      <div className="lobby-container">
        <div className="lobby-card">
          <h1 className="lobby-title">在线涂鸦白板</h1>
          <p className="lobby-subtitle">实时协作，创意无限</p>
          
          <div className="lobby-input-group">
            <label className="lobby-label">昵称</label>
            <input
              type="text"
              className="lobby-input"
              placeholder="请输入昵称（2-10个字符）"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={10}
            />
          </div>

          <div className="lobby-input-group">
            <label className="lobby-label">邀请码</label>
            <input
              type="text"
              className="lobby-input"
              placeholder="加入房间时输入6位邀请码"
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
            />
          </div>

          {nicknameError && <p className="lobby-error">{nicknameError}</p>}

          <div className="lobby-buttons">
            <button className="lobby-btn primary" onClick={handleCreateRoom}>
              创建房间
            </button>
            <button className="lobby-btn secondary" onClick={handleJoinRoom}>
              加入房间
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="canvas-area">
        <Canvas
          paths={paths}
          texts={texts}
          stickers={stickers}
          selectedTool={selectedTool}
          selectedColor={selectedColor}
          selectedSize={selectedSize}
          textFontSize={textFontSize}
          userId={userId}
          socket={socketRef.current}
          remoteDrawings={remoteDrawingRef.current}
          onAddText={handleAddText}
          onAddSticker={handleAddSticker}
          onMoveSticker={handleMoveSticker}
          stickerType={selectedTool === 'sticker' ? selectedStickerType : null}
          undoRedoAnimating={undoRedoAnimating}
        />
      </div>
      
      <div className="sidebar">
        <div className="room-info">
          <span className="room-label">房间号</span>
          <span className="room-id">{roomId}</span>
        </div>

        <Toolbar
          selectedTool={selectedTool}
          selectedColor={selectedColor}
          selectedSize={selectedSize}
          textFontSize={textFontSize}
          historyIndex={historyIndex}
          historyLength={historyLength}
          onToolChange={setSelectedTool}
          onColorChange={setSelectedColor}
          onSizeChange={setSelectedSize}
          onTextFontSizeChange={setTextFontSize}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClear}
          onExport={handleExport}
          onShare={handleShare}
          copiedTip={copiedTip}
          onStickerPanelToggle={() => setShowStickerPanel(!showStickerPanel)}
          showStickerPanel={showStickerPanel}
        />

        {showStickerPanel && (
          <StickerPanel onSelect={handleStickerSelect} />
        )}

        <div className="sidebar-section">
          <h3 className="section-title">在线用户 ({users.length})</h3>
          <UserList users={users} currentUserId={userId} />
        </div>

        <div className="sidebar-section chat-section">
          <h3 className="section-title">聊天</h3>
          <ChatPanel messages={messages} onSendMessage={handleSendMessage} currentUserId={userId} />
        </div>
      </div>
    </div>
  );
}

export default App;
