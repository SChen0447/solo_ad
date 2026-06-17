import React, { useEffect, useState } from 'react';
import { CanvasBoard } from './CanvasBoard';
import { useSocket } from './hooks/useSocket';
import { useCanvasStore } from './store';
import { PRESET_COLORS } from './types';

const App: React.FC = () => {
  const socket = useSocket();
  const {
    currentStyle,
    setCurrentStyle,
    zoom,
    setZoom,
    nodes,
    connections,
    setAIPanelOpen,
    isAIPanelOpen,
    roomId,
    setRoomId,
    currentUser,
    setCurrentUser,
    resetCanvas,
  } = useCanvasStore();

  const [userName, setUserName] = useState('');
  const [inputRoomId, setInputRoomId] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    socket.connect();
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [socket]);

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const generateUserId = () => {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };

  const getRandomColor = () => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleCreateRoom = () => {
    if (!userName.trim()) return;
    
    const userId = generateUserId();
    const newRoomId = generateRoomId();
    const color = getRandomColor();
    
    setCurrentUser({
      id: userId,
      name: userName.trim(),
      color,
      cursorX: 0,
      cursorY: 0,
      lastActive: Date.now(),
    });
    
    setRoomId(newRoomId);
    socket.joinRoom(newRoomId, { id: userId, name: userName.trim(), color });
    setIsJoined(true);
    resetCanvas();
  };

  const handleJoinRoom = () => {
    if (!userName.trim() || !inputRoomId.trim()) return;
    
    const userId = generateUserId();
    const color = getRandomColor();
    
    setCurrentUser({
      id: userId,
      name: userName.trim(),
      color,
      cursorX: 0,
      cursorY: 0,
      lastActive: Date.now(),
    });
    
    setRoomId(inputRoomId.trim().toUpperCase());
    socket.joinRoom(inputRoomId.trim().toUpperCase(), { id: userId, name: userName.trim(), color });
    setIsJoined(true);
  };

  const handleExportJSON = () => {
    const data = {
      nodes,
      connections,
      version: '1.0',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `concept-map-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (data.nodes && data.connections) {
            console.log('Imported data:', data);
            alert('导入成功！（演示模式：请刷新后查看效果）');
          }
        } catch (err) {
          alert('文件格式错误');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleExportPNG = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `concept-map-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + 0.2, 5);
    setZoom(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 0.2, 0.5);
    setZoom(newZoom);
  };

  const handleAIAnalysis = () => {
    setAIPanelOpen(!isAIPanelOpen);
  };

  const buttonStyle: React.CSSProperties = {
    transition: 'transform 0.15s ease-out',
    cursor: 'pointer',
  };

  const buttonActiveStyle: React.CSSProperties = {
    transform: 'scale(0.95)',
  };

  if (!isJoined) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F0F0F0',
        }}
      >
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 40,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            width: '100%',
            maxWidth: 400,
          }}
        >
          <h1
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: '#333',
              marginBottom: 8,
              textAlign: 'center',
            }}
          >
            协作概念图
          </h1>
          <p
            style={{
              fontSize: 14,
              color: '#666',
              marginBottom: 32,
              textAlign: 'center',
            }}
          >
            实时协作，智能梳理知识结构
          </p>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                fontSize: 14,
                color: '#333',
                marginBottom: 8,
                display: 'block',
                fontWeight: 500,
              }}
            >
              昵称
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="请输入您的昵称"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 8,
                border: '1px solid #ddd',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#45B7D1';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#ddd';
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                fontSize: 14,
                color: '#333',
                marginBottom: 8,
                display: 'block',
                fontWeight: 500,
              }}
            >
              房间号
            </label>
            <input
              type="text"
              value={inputRoomId}
              onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
              placeholder="留空则创建新房间"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 8,
                border: '1px solid #ddd',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
                letterSpacing: 2,
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#45B7D1';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#ddd';
              }}
            />
          </div>

          <button
            onClick={inputRoomId.trim() ? handleJoinRoom : handleCreateRoom}
            disabled={!userName.trim()}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: userName.trim() ? '#45B7D1' : '#ccc',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 500,
              cursor: userName.trim() ? 'pointer' : 'not-allowed',
              ...buttonStyle,
            }}
            onMouseDown={(e) => {
              if (userName.trim()) {
                e.currentTarget.style.transform = buttonActiveStyle.transform;
              }
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {inputRoomId.trim() ? '加入房间' : '创建房间'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Toolbar */}
      <div
        style={{
          height: 56,
          backgroundColor: '#fff',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 12,
          zIndex: 10,
        }}
      >
        {isMobile && (
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#f5f5f5',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            ☰
          </button>
        )}

        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#333',
          }}
        >
          协作概念图
        </div>

        <div
          style={{
            padding: '6px 12px',
            backgroundColor: '#f0f7fa',
            borderRadius: 6,
            fontSize: 13,
            color: '#45B7D1',
            fontWeight: 500,
            letterSpacing: 1,
          }}
        >
          房间: {roomId}
        </div>

        <div style={{ flex: 1 }} />

        <button
          onClick={handleAIAnalysis}
          style={{
            padding: '8px 16px',
            backgroundColor: '#96CEB4',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            ...buttonStyle,
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = buttonActiveStyle.transform;
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          AI 分析
        </button>

        <button
          onClick={handleImportJSON}
          style={{
            padding: '8px 16px',
            backgroundColor: '#fff',
            color: '#666',
            border: '1px solid #ddd',
            borderRadius: 8,
            fontSize: 14,
            cursor: 'pointer',
            ...buttonStyle,
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = buttonActiveStyle.transform;
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          导入
        </button>

        <div style={{ position: 'relative' }}>
          <button
            onClick={handleExportJSON}
            style={{
              padding: '8px 16px',
              backgroundColor: '#45B7D1',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              ...buttonStyle,
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = buttonActiveStyle.transform;
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            导出
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 8px',
            backgroundColor: '#f5f5f5',
            borderRadius: 6,
          }}
        >
          <button
            onClick={handleZoomOut}
            style={{
              width: 24,
              height: 24,
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: 18,
              color: '#666',
            }}
          >
            −
          </button>
          <span style={{ fontSize: 13, color: '#666', minWidth: 40, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            style={{
              width: 24,
              height: 24,
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: 18,
              color: '#666',
            }}
          >
            +
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
        {/* Left Sidebar */}
        {(!isMobile || showSidebar) && (
          <div
            style={{
              width: isMobile ? 200 : 220,
              backgroundColor: '#fff',
              borderRight: '1px solid #e0e0e0',
              padding: 16,
              overflowY: 'auto',
              position: isMobile ? 'absolute' : 'relative',
              left: 0,
              top: 0,
              bottom: 0,
              zIndex: isMobile ? 20 : 1,
              transition: 'transform 0.3s ease',
            }}
          >
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#333',
                marginBottom: 12,
              }}
            >
              节点形状
            </h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              <button
                onClick={() => setCurrentStyle({ shape: 'rectangle' })}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 8,
                  border: currentStyle.shape === 'rectangle' ? '2px solid #45B7D1' : '1px solid #ddd',
                  backgroundColor: currentStyle.shape === 'rectangle' ? '#f0f7fa' : '#fff',
                  cursor: 'pointer',
                  fontSize: 24,
                  ...buttonStyle,
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = buttonActiveStyle.transform;
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                ▢
              </button>
              <button
                onClick={() => setCurrentStyle({ shape: 'circle' })}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 8,
                  border: currentStyle.shape === 'circle' ? '2px solid #45B7D1' : '1px solid #ddd',
                  backgroundColor: currentStyle.shape === 'circle' ? '#f0f7fa' : '#fff',
                  cursor: 'pointer',
                  fontSize: 24,
                  ...buttonStyle,
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = buttonActiveStyle.transform;
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                ●
              </button>
            </div>

            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#333',
                marginBottom: 12,
              }}
            >
              填充颜色
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                marginBottom: 24,
              }}
            >
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setCurrentStyle({ fillColor: color })}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    borderRadius: 8,
                    backgroundColor: color,
                    border: currentStyle.fillColor === color ? '3px solid #333' : '2px solid transparent',
                    cursor: 'pointer',
                    ...buttonStyle,
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = buttonActiveStyle.transform;
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                />
              ))}
            </div>

            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#333',
                marginBottom: 12,
              }}
            >
              连线箭头
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { value: 'none', label: '无箭头' },
                { value: 'one-way', label: '单向箭头' },
                { value: 'two-way', label: '双向箭头' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setCurrentStyle({ arrowType: option.value as 'none' | 'one-way' | 'two-way' })}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: currentStyle.arrowType === option.value ? '2px solid #45B7D1' : '1px solid #ddd',
                    backgroundColor: currentStyle.arrowType === option.value ? '#f0f7fa' : '#fff',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: '#333',
                    textAlign: 'left',
                    ...buttonStyle,
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = buttonActiveStyle.transform;
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div
              style={{
                marginTop: 24,
                padding: 12,
                backgroundColor: '#f9f9f9',
                borderRadius: 8,
                fontSize: 12,
                color: '#888',
                lineHeight: 1.6,
              }}
            >
              <p style={{ marginBottom: 8, fontWeight: 500, color: '#666' }}>操作提示</p>
              <p>• 双击画布创建节点</p>
              <p>• 拖拽移动节点</p>
              <p>• 右键节点创建连线</p>
              <p>• Delete 删除选中项</p>
              <p>• 滚轮缩放画布</p>
            </div>
          </div>
        )}

        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative' }}>
          <CanvasBoard socket={socket} />
        </div>

        {/* AI Panel (simplified) */}
        {isAIPanelOpen && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: 320,
              backgroundColor: '#fff',
              borderLeft: '1px solid #e0e0e0',
              boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.05)',
              zIndex: 15,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '16px',
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>
                AI 分析结果
              </h3>
              <button
                onClick={() => setAIPanelOpen(false)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: '#f5f5f5',
                  cursor: 'pointer',
                  fontSize: 16,
                  color: '#666',
                }}
              >
                ×
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              <div
                style={{
                  padding: 24,
                  textAlign: 'center',
                  color: '#999',
                  fontSize: 14,
                }}
              >
                点击开始分析按钮
                <br />
                检测概念图中的逻辑问题
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
