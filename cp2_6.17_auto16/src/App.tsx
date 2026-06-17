import React, { useState, useEffect, useRef, useCallback } from 'react';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import ProjectPanel from './components/ProjectPanel';
import type { CanvasElement, Project, ToolType, OnlineUser } from './types';
import { COLOR_PALETTE, THICKNESS_OPTIONS } from './types';
import * as api from './api';

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [tool, setTool] = useState<ToolType>('select');
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [thickness, setThickness] = useState(THICKNESS_OPTIONS[1]);
  const [stickyShape, setStickyShape] = useState<'rectangle' | 'circle' | 'hexagon'>('rectangle');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [userColor, setUserColor] = useState<string>('');
  const [nickname, setNickname] = useState<string>('');
  const [showNicknameModal, setShowNicknameModal] = useState(true);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [projectSwitching, setProjectSwitching] = useState(false);
  const [clipboard, setClipboard] = useState<CanvasElement | null>(null);
  
  const lastSyncTime = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  const loadProjects = useCallback(async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
      if (data.length > 0 && !currentProjectId) {
        setCurrentProjectId(data[0].id);
      }
    } catch (e) {
      console.error('Failed to load projects:', e);
    }
  }, [currentProjectId]);

  const loadElements = useCallback(async (projectId: string) => {
    try {
      setIsLoading(true);
      const data = await api.getElements(projectId);
      setElements(data);
      lastSyncTime.current = Date.now();
    } catch (e) {
      console.error('Failed to load elements:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (currentProjectId) {
      loadElements(currentProjectId);
    }
  }, [currentProjectId, loadElements]);

  useEffect(() => {
    if (!currentProjectId || showNicknameModal) return;

    const pollInterval = setInterval(async () => {
      try {
        const result = await api.getElementsSince(currentProjectId, lastSyncTime.current);
        
        setElements(prev => {
          const updated = [...prev];
          
          for (const id of result.deleted) {
            const idx = updated.findIndex(e => e.id === id);
            if (idx !== -1) {
              updated.splice(idx, 1);
            }
          }
          
          for (const element of result.elements) {
            const idx = updated.findIndex(e => e.id === element.id);
            if (idx !== -1) {
              updated[idx] = element;
            } else {
              updated.push(element);
            }
          }
          
          return updated;
        });
        
        lastSyncTime.current = Date.now();

        const users = await api.getOnlineUsers(currentProjectId);
        setOnlineUsers(users);
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [currentProjectId, showNicknameModal]);

  useEffect(() => {
    if (!currentUserId || !currentProjectId) return;

    const updateInterval = setInterval(() => {
    }, 2000);

    return () => clearInterval(updateInterval);
  }, [currentUserId, currentProjectId]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentUserId && currentProjectId) {
        api.leaveProject(currentProjectId, currentUserId).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentUserId, currentProjectId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c' && selectedId) {
          const el = elements.find(e => e.id === selectedId);
          if (el && (el.type === 'sticky' || el.type === 'stroke')) {
            setClipboard(el);
          }
        }
        if (e.key === 'v' && clipboard && currentProjectId) {
          e.preventDefault();
          const newEl = {
            ...clipboard,
            x: clipboard.x + 20,
            y: clipboard.y + 20,
          } as Omit<CanvasElement, 'id' | 'updatedAt'>;
          handleAddElement(newEl);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, clipboard, elements, currentProjectId]);

  const handleJoinProject = async () => {
    if (!nickname.trim() || !currentProjectId) return;
    try {
      const result = await api.joinProject(currentProjectId, nickname.trim());
      setCurrentUserId(result.userId);
      setUserColor(result.color);
      setShowNicknameModal(false);
    } catch (e) {
      console.error('Failed to join:', e);
    }
  };

  const handleSelectProject = async (id: string) => {
    if (id === currentProjectId) return;
    
    setProjectSwitching(true);
    setSelectedId(null);
    
    if (currentUserId && currentProjectId) {
      await api.leaveProject(currentProjectId, currentUserId).catch(() => {});
    }
    
    setTimeout(() => {
      setCurrentProjectId(id);
      setElements([]);
      lastSyncTime.current = 0;
      
      setTimeout(async () => {
        if (currentUserId) {
          try {
            const result = await api.joinProject(id, nickname);
            setCurrentUserId(result.userId);
            setUserColor(result.color);
          } catch (e) {
            console.error('Failed to join new project:', e);
          }
        }
        setProjectSwitching(false);
      }, 300);
    }, 300);
  };

  const handleCreateProject = async (name: string) => {
    try {
      const project = await api.createProject(name);
      setProjects(prev => [project, ...prev]);
      handleSelectProject(project.id);
    } catch (e) {
      console.error('Failed to create project:', e);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (projects.length <= 1) return;
    try {
      await api.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      if (currentProjectId === id) {
        const remaining = projects.filter(p => p.id !== id);
        if (remaining.length > 0) {
          handleSelectProject(remaining[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to delete project:', e);
    }
  };

  const handleAddElement = async (element: Omit<CanvasElement, 'id' | 'updatedAt'>) => {
    if (!currentProjectId) return;
    try {
      const newEl = await api.addElement(currentProjectId, element);
      setElements(prev => [...prev, newEl]);
    } catch (e) {
      console.error('Failed to add element:', e);
    }
  };

  const handleUpdateElement = async (id: string, updates: Partial<CanvasElement>) => {
    if (!currentProjectId) return;
    try {
      const updated = await api.updateElement(currentProjectId, id, updates);
      setElements(prev => prev.map(e => e.id === id ? updated : e));
    } catch (e) {
      console.error('Failed to update element:', e);
    }
  };

  const handleDeleteElement = async (id: string) => {
    if (!currentProjectId) return;
    try {
      await api.deleteElement(currentProjectId, id);
      setElements(prev => prev.filter(e => e.id !== id));
    } catch (e) {
      console.error('Failed to delete element:', e);
    }
  };

  const handleCursorMove = useCallback(async (x: number, y: number) => {
    if (!currentProjectId || !currentUserId) return;
    try {
      await api.updateUserCursor(currentProjectId, currentUserId, x, y);
    } catch (e) {
    }
  }, [currentProjectId, currentUserId]);

  const handleExport = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    setIsExporting(true);

    setTimeout(() => {
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvas.width;
      exportCanvas.height = canvas.height;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) {
        setIsExporting(false);
        return;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

      const minX = Math.min(...elements.map(el => {
        if (el.type === 'sticky') return el.x;
        if (el.type === 'stroke') return Math.min(...el.points.map(p => p.x));
        return el.x;
      }), 0) - 50;
      const minY = Math.min(...elements.map(el => {
        if (el.type === 'sticky') return el.y;
        if (el.type === 'stroke') return Math.min(...el.points.map(p => p.y));
        return el.y;
      }), 0) - 50;
      const maxX = Math.max(...elements.map(el => {
        if (el.type === 'sticky') return el.x + el.width;
        if (el.type === 'stroke') return Math.max(...el.points.map(p => p.x));
        return el.x;
      }), 0) + 50;
      const maxY = Math.max(...elements.map(el => {
        if (el.type === 'sticky') return el.y + el.height;
        if (el.type === 'stroke') return Math.max(...el.points.map(p => p.y));
        return el.y;
      }), 0) + 50;

      exportCanvas.width = maxX - minX;
      exportCanvas.height = maxY - minY;
      
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      ctx.translate(-minX, -minY);

      for (const el of elements) {
        if (el.deleted) continue;
        
        if (el.type === 'sticky') {
          ctx.fillStyle = el.bgColor;
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
          ctx.lineWidth = 1;
          
          const radius = 8;
          ctx.beginPath();
          ctx.moveTo(el.x + radius, el.y);
          ctx.lineTo(el.x + el.width - radius, el.y);
          ctx.quadraticCurveTo(el.x + el.width, el.y, el.x + el.width, el.y + radius);
          ctx.lineTo(el.x + el.width, el.y + el.height - radius);
          ctx.quadraticCurveTo(el.x + el.width, el.y + el.height, el.x + el.width - radius, el.y + el.height);
          ctx.lineTo(el.x + radius, el.y + el.height);
          ctx.quadraticCurveTo(el.x, el.y + el.height, el.x, el.y + el.height - radius);
          ctx.lineTo(el.x, el.y + radius);
          ctx.quadraticCurveTo(el.x, el.y, el.x + radius, el.y);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#333';
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          const lines = el.text.split('\n');
          const allLines: string[] = [];
          for (const line of lines) {
            let currentLine = '';
            for (const char of line.split('')) {
              const testLine = currentLine + char;
              if (ctx.measureText(testLine).width > el.width - 20 && currentLine) {
                allLines.push(currentLine);
                currentLine = char;
              } else {
                currentLine = testLine;
              }
            }
            allLines.push(currentLine);
          }
          
          const startY = el.y + el.height / 2 - (allLines.length - 1) * 9;
          for (let i = 0; i < allLines.length; i++) {
            ctx.fillText(allLines[i], el.x + el.width / 2, startY + i * 18);
          }
        } else if (el.type === 'stroke') {
          if (el.points.length < 2) continue;
          ctx.strokeStyle = el.color;
          ctx.lineWidth = el.thickness;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(el.points[0].x, el.points[0].y);
          for (let i = 1; i < el.points.length; i++) {
            ctx.lineTo(el.points[i].x, el.points[i].y);
          }
          ctx.stroke();
        } else if (el.type === 'arrow') {
          const startEl = elements.find(e => e.id === el.startElementId);
          const endEl = elements.find(e => e.id === el.endElementId);
          if (!startEl || !endEl) continue;

          const getCenter = (e: CanvasElement) => {
            if (e.type === 'sticky') return { x: e.x + e.width / 2, y: e.y + e.height / 2 };
            return { x: e.x, y: e.y };
          };
          
          const getEdgeMidpoint = (el: CanvasElement, tx: number, ty: number) => {
            if (el.type !== 'sticky') return getCenter(el);
            const cx = el.x + el.width / 2;
            const cy = el.y + el.height / 2;
            const dx = tx - cx;
            const dy = ty - cy;
            const hw = el.width / 2;
            const hh = el.height / 2;
            if (Math.abs(dx) * hh > Math.abs(dy) * hw) {
              return { x: cx + Math.sign(dx) * hw, y: cy + (dy / Math.abs(dx)) * hw };
            } else {
              return { x: cx + (dx / Math.abs(dy)) * hh, y: cy + Math.sign(dy) * hh };
            }
          };

          const endCenter = getCenter(endEl);
          const startCenter = getCenter(startEl);
          const start = getEdgeMidpoint(startEl, endCenter.x, endCenter.y);
          const end = getEdgeMidpoint(endEl, startCenter.x, startCenter.y);

          ctx.strokeStyle = el.color;
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();

          const angle = Math.atan2(end.y - start.y, end.x - start.x);
          const headLen = 12;
          ctx.fillStyle = el.color;
          ctx.beginPath();
          ctx.moveTo(end.x, end.y);
          ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6));
          ctx.closePath();
          ctx.fill();
        }
      }

      const link = document.createElement('a');
      link.download = `whiteboard-${Date.now()}.png`;
      link.href = exportCanvas.toDataURL('image/png');
      link.click();

      setIsExporting(false);
    }, 2000);
  }, [elements]);

  if (showNicknameModal) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1a1a2e',
      }}>
        <div style={{
          padding: '40px',
          borderRadius: 16,
          backgroundColor: '#16213e',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>
            <i className="fas fa-palette" style={{ color: '#e94560' }}></i>
          </div>
          <h2 style={{ color: '#fff', marginBottom: 8, fontSize: 24 }}>欢迎来到创意白板</h2>
          <p style={{ color: '#888', marginBottom: 24, fontSize: 14 }}>输入你的昵称开始协作</p>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoinProject()}
            placeholder="你的昵称"
            autoFocus
            style={{
              width: 280,
              padding: '12px 16px',
              borderRadius: 8,
              border: '1px solid #444',
              backgroundColor: '#1a1a2e',
              color: '#fff',
              fontSize: 14,
              marginBottom: 16,
              outline: 'none',
            }}
          />
          <br />
          <button
            onClick={handleJoinProject}
            disabled={!nickname.trim()}
            style={{
              padding: '12px 32px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #0f3460, #e94560)',
              color: '#fff',
              cursor: nickname.trim() ? 'pointer' : 'not-allowed',
              fontSize: 14,
              fontWeight: 600,
              opacity: nickname.trim() ? 1 : 0.5,
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (nickname.trim()) {
                e.currentTarget.style.transform = 'scale(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            加入
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#1a1a2e',
    }}>
      <Toolbar
        tool={tool}
        onToolChange={setTool}
        color={color}
        onColorChange={setColor}
        thickness={thickness}
        onThicknessChange={setThickness}
        stickyShape={stickyShape}
        onStickyShapeChange={setStickyShape}
        onExport={handleExport}
        isExporting={isExporting}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <ProjectPanel
          projects={projects}
          currentProjectId={currentProjectId}
          onSelectProject={handleSelectProject}
          onCreateProject={handleCreateProject}
          onDeleteProject={handleDeleteProject}
          isCollapsed={isPanelCollapsed}
          onToggleCollapse={() => setIsPanelCollapsed(!isPanelCollapsed)}
          elements={elements}
        />

        <div style={{
          flex: 1,
          display: 'flex',
          position: 'relative',
          opacity: projectSwitching || isLoading ? 0.3 : 1,
          transition: 'opacity 0.3s ease',
        }}>
          {isLoading && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#666',
              fontSize: 14,
            }}>
              <i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i>
              加载中...
            </div>
          )}
          
          {!isLoading && (
            <Canvas
              elements={elements}
              tool={tool}
              color={color}
              thickness={thickness}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onAddElement={handleAddElement}
              onUpdateElement={handleUpdateElement}
              onDeleteElement={handleDeleteElement}
              onlineUsers={onlineUsers}
              currentUserId={currentUserId}
              onCursorMove={handleCursorMove}
              stickyShape={stickyShape}
            />
          )}

          {onlineUsers.length > 0 && (
            <div style={{
              position: 'absolute',
              top: 16,
              right: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              backgroundColor: 'rgba(22, 33, 62, 0.9)',
              padding: '12px',
              borderRadius: 8,
              minWidth: 150,
            }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
                在线用户 ({onlineUsers.length})
              </div>
              {onlineUsers.map(user => (
                <div key={user.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: '#fff',
                }}>
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: user.color,
                    opacity: user.id === currentUserId ? 1 : 0.7,
                  }} />
                  <span style={{ opacity: user.id === currentUserId ? 1 : 0.7 }}>
                    {user.nickname}
                    {user.id === currentUserId && ' (你)'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isExporting && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}>
            <i className="fas fa-cog fa-spin" style={{
              fontSize: 48,
              color: '#e94560',
            }}></i>
            <span style={{ color: '#fff', fontSize: 16 }}>正在导出图片...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
