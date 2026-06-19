import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CanvasCore, type Path, type ImageItem } from './CanvasCore';
import { CollaborationManager, type Member } from './CollaborationManager';
import { FileManager } from './FileManager';

interface UILayerProps {
  userId: string;
  userName: string;
}

const UILayer: React.FC<UILayerProps> = ({ userId, userName }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasCoreRef = useRef<CanvasCore | null>(null);
  const collaborationRef = useRef<CollaborationManager | null>(null);
  const fileManagerRef = useRef<FileManager | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentTool, setCurrentTool] = useState<'brush' | 'select' | 'pan'>('brush');
  const [brushColor, setBrushColor] = useState('#0ea5e9');
  const [brushWidth, setBrushWidth] = useState(3);
  const [brushOpacity, setBrushOpacity] = useState(1);
  const [members, setMembers] = useState<Member[]>([]);
  const [scale, setScale] = useState(1);
  const [editingImage, setEditingImage] = useState<ImageItem | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [tick, setTick] = useState(0);

  const colors = ['#0ea5e9', '#f43f5e', '#a855f7', '#22c55e', '#f59e0b', '#ffffff', '#1a1a2e'];

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvasCore = new CanvasCore(canvasRef.current, userId);
    const collaboration = new CollaborationManager(userId, userName);
    const fileManager = new FileManager(canvasCore, userId);

    canvasCoreRef.current = canvasCore;
    collaborationRef.current = collaboration;
    fileManagerRef.current = fileManager;

    setMembers(collaboration.getMembers());
    setScale(canvasCore.getScale());

    const unsubscribeCanvas = canvasCore.subscribe(() => {
      setScale(canvasCore.getScale());
      setTick(t => (t + 1) % 1000000);
    });

    const handleMembersUpdate = () => {
      setMembers([...collaboration.getMembers()]);
    };

    collaboration.on('members-updated', handleMembersUpdate);

    const handlePathStarted = (path: Path) => {
      canvasCore.addPath(path);
    };

    const handlePathUpdated = (path: Path) => {
      canvasCore.addPath(path);
    };

    const handlePathCompleted = (path: Path) => {
      canvasCore.addPath(path);
    };

    collaboration.on('path-started', handlePathStarted);
    collaboration.on('path-updated', handlePathUpdated);
    collaboration.on('path-completed', handlePathCompleted);

    const handleEditImage = (image: ImageItem) => {
      setEditingImage(image);
      setEditLabel(image.label);
    };

    fileManager.on('edit-image', handleEditImage);

    const canvas = canvasRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const point = canvasCore.screenToWorld(e.clientX, e.clientY);
      collaboration.updateCurrentUserCursor(point);
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    const handleDrop = (e: DragEvent) => {
      fileManager.handleDrop(e);
    };

    const handleDragOver = (e: DragEvent) => {
      fileManager.handleDragOver(e);
    };

    canvas.addEventListener('drop', handleDrop);
    canvas.addEventListener('dragover', handleDragOver);

    const animFrame = () => {
      setTick(t => (t + 1) % 1000000);
    };
    let rafId: number;
    const loop = () => {
      animFrame();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      unsubscribeCanvas();
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('drop', handleDrop);
      canvas.removeEventListener('dragover', handleDragOver);
      canvasCore.destroy();
      collaboration.destroy();
      fileManager.destroy();
    };
  }, [userId, userName]);

  useEffect(() => {
    if (canvasCoreRef.current) {
      canvasCoreRef.current.setTool(currentTool);
    }
  }, [currentTool]);

  useEffect(() => {
    if (canvasCoreRef.current) {
      canvasCoreRef.current.setBrushSettings({
        color: brushColor,
        width: brushWidth,
        opacity: brushOpacity,
      });
    }
  }, [brushColor, brushWidth, brushOpacity]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      fileManagerRef.current?.handleFile(files[i]);
    }
    e.target.value = '';
  }, []);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleSaveLabel = useCallback(() => {
    if (editingImage && fileManagerRef.current) {
      fileManagerRef.current.updateImageLabel(editingImage.id, editLabel);
      setEditingImage(null);
    }
  }, [editingImage, editLabel]);

  const handleCancelEdit = useCallback(() => {
    setEditingImage(null);
  }, []);

  const renderCursors = () => {
    if (!canvasCoreRef.current || !canvasRef.current) return null;
    const canvasRect = canvasRef.current.getBoundingClientRect();

    return members
      .filter(m => m.id !== userId && m.cursor && m.isOnline)
      .map(member => {
        if (!member.cursor) return null;
        const screenPos = canvasCoreRef.current!.worldToScreen(member.cursor.x, member.cursor.y);
        const shouldShowTag = member.showNameTag || member.nameTagOpacity > 0.01;
        const opacityValue = Math.max(0, Math.min(1, member.nameTagOpacity));

        return (
          <div
            key={member.id}
            style={{
              position: 'absolute',
              left: screenPos.x - canvasRect.left,
              top: screenPos.y - canvasRect.top,
              pointerEvents: 'none',
              zIndex: 10,
              willChange: 'transform',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path
                d="M2 2 L19 8 L13 12 L10 19 Z"
                fill={member.color}
                stroke="white"
                strokeWidth="1.5"
              />
            </svg>
            {shouldShowTag && (
              <div
                style={{
                  position: 'absolute',
                  left: 22,
                  top: -8,
                  background: member.color,
                  color: 'white',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  opacity: opacityValue,
                  transition: 'opacity 0.8s ease-out',
                  boxShadow: `0 0 12px ${member.color}80, 0 2px 8px rgba(0,0,0,0.3)`,
                  letterSpacing: '0.3px',
                }}
              >
                {member.name}
              </div>
            )}
          </div>
        );
      });
  };

  return (
    <div style={styles.container}>
      <canvas ref={canvasRef} style={styles.canvas} />

      {renderCursors()}

      <div style={styles.toolbar}>
        <div style={styles.toolGroup}>
          <button
            style={{
              ...styles.toolButton,
              ...(currentTool === 'brush' ? styles.toolButtonActive : null),
            }}
            onClick={() => setCurrentTool('brush')}
            title="画笔工具"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19l7-7 3 3-7 7-3-3z"/>
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
              <path d="M2 2l7.586 7.586"/>
              <circle cx="11" cy="11" r="2"/>
            </svg>
          </button>
          <button
            style={{
              ...styles.toolButton,
              ...(currentTool === 'pan' ? styles.toolButtonActive : null),
            }}
            onClick={() => setCurrentTool('pan')}
            title="平移工具"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/>
              <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/>
              <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/>
              <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
            </svg>
          </button>
        </div>

        <div style={styles.divider} />

        <div style={styles.toolGroup}>
          <div style={{ position: 'relative' }}>
            <button
              style={{
                ...styles.toolButton,
                ...styles.colorButton,
              }}
              onClick={() => setShowColorPicker(!showColorPicker)}
              title="画笔颜色"
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: brushColor,
                  border: '2px solid rgba(255,255,255,0.4)',
                  boxShadow: `0 0 10px ${brushColor}, 0 0 18px ${brushColor}60`,
                }}
              />
            </button>
            {showColorPicker && (
              <div style={styles.colorPicker}>
                {colors.map(color => {
                  const isSelected = brushColor === color;
                  return (
                    <button
                      key={color}
                      style={{
                        ...styles.colorOption,
                        background: color,
                        boxShadow: isSelected
                          ? `0 0 0 3px #0ea5e9, 0 0 14px ${color}`
                          : `0 0 6px ${color}80`,
                      }}
                      onClick={() => {
                        setBrushColor(color);
                        setShowColorPicker(false);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div style={styles.toolGroup}>
          <div style={styles.sliderContainer}>
            <span style={styles.sliderLabel}>粗细</span>
            <input
              type="range"
              min="1"
              max="20"
              value={brushWidth}
              onChange={(e) => setBrushWidth(Number(e.target.value))}
              style={styles.slider}
            />
            <span style={styles.sliderValue}>{brushWidth}px</span>
          </div>
        </div>

        <div style={styles.toolGroup}>
          <div style={styles.sliderContainer}>
            <span style={styles.sliderLabel}>透明</span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={brushOpacity}
              onChange={(e) => setBrushOpacity(Number(e.target.value))}
              style={styles.slider}
            />
            <span style={styles.sliderValue}>{Math.round(brushOpacity * 100)}%</span>
          </div>
        </div>

        <div style={styles.divider} />

        <div style={styles.zoomInfo}>
          <span style={styles.zoomText}>{Math.round(scale * 100)}%</span>
        </div>
      </div>

      <div
        style={{
          ...styles.memberPanel,
          opacity: isPanelVisible ? 1 : 0,
          transform: isPanelVisible ? 'translateX(0)' : 'translateX(20px)',
          pointerEvents: isPanelVisible ? 'auto' : 'none',
        }}
      >
        <div style={styles.panelHeader}>
          <span style={styles.panelTitle}>在线成员</span>
          <span style={styles.memberCount}>{members.length}</span>
        </div>
        <div style={styles.memberList}>
          {members.map(member => {
            const isMe = member.id === userId;
            return (
              <div
                key={member.id}
                style={{
                  ...styles.memberItem,
                  ...(isMe ? styles.memberItemMe : null),
                }}
              >
                <div style={styles.avatarContainer}>
                  <img
                    src={member.avatar}
                    alt={member.name}
                    style={{
                      ...styles.avatar,
                      borderColor: member.color + '60',
                    }}
                  />
                  <div
                    style={{
                      ...styles.onlineDot,
                      backgroundColor: member.isOnline ? '#22c55e' : '#666',
                      boxShadow: member.isOnline ? '0 0 8px #22c55e' : 'none',
                    }}
                  />
                </div>
                <div style={styles.memberInfo}>
                  <span style={styles.memberName}>
                    {member.name}
                    {isMe && <span style={styles.meTag}>（我）</span>}
                  </span>
                  <span style={{ ...styles.memberStatus, color: member.color }}>
                    {member.isDrawing ? '✏️ 绘画中...' : member.cursor ? '👁️ 浏览中' : '🟢 在线'}
                  </span>
                </div>
                <div
                  style={{
                    ...styles.memberColor,
                    backgroundColor: member.color,
                    boxShadow: `0 0 8px ${member.color}`,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <button
        style={{
          ...styles.togglePanelBtn,
          right: isPanelVisible ? 272 : 24,
          boxShadow: '0 0 10px #0ea5e980, 0 2px 8px rgba(0,0,0,0.3)',
        }}
        onClick={() => setIsPanelVisible(!isPanelVisible)}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isPanelVisible ? 'rotate(0deg)' : 'rotate(180deg)',
            transition: 'transform 0.3s ease',
          }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      <div style={styles.fileImport}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/svg+xml"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileInput}
        />
        <button
          style={{
            ...styles.importButton,
            boxShadow: '0 0 12px #0ea5e980, 0 0 24px #0ea5e940',
          }}
          onClick={handleImportClick}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span style={{ marginLeft: 10 }}>导入图片</span>
        </button>
        <p style={styles.importHint}>支持 PNG / JPG / SVG · 可拖拽上传</p>
      </div>

      {editingImage && (
        <div style={styles.modalOverlay} onClick={handleCancelEdit}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
            <h3 style={styles.modalTitle}>编辑图片说明</h3>
            <input
              type="text"
              style={{
                ...styles.modalInput,
                boxShadow: '0 0 0 2px transparent',
              }}
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              placeholder="输入图片说明文字..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveLabel();
                if (e.key === 'Escape') handleCancelEdit();
              }}
            />
            <div style={styles.modalButtons}>
              <button
                style={{
                  ...styles.modalCancel,
                  boxShadow: '0 0 8px rgba(255,255,255,0.05)',
                }}
                onClick={handleCancelEdit}
              >
                取消
              </button>
              <button
                style={{
                  ...styles.modalConfirm,
                  boxShadow: '0 0 14px #0ea5e9a0, 0 0 28px #0ea5e950',
                }}
                onClick={handleSaveLabel}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
  },
  canvas: {
    display: 'block',
    width: '100%',
    height: '100%',
    cursor: 'crosshair',
  },
  toolbar: {
    position: 'absolute',
    top: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 14px',
    backgroundColor: '#16213e',
    borderRadius: '14px',
    border: '1px solid rgba(14, 165, 233, 0.15)',
    boxShadow: '0 6px 30px rgba(0, 0, 0, 0.5), 0 0 30px rgba(14, 165, 233, 0.05)',
    zIndex: 100,
    animation: 'fadeIn 0.3s ease-out',
    backdropFilter: 'blur(10px)',
  },
  toolGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  toolButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    border: '1px solid transparent',
    borderRadius: '10px',
    backgroundColor: 'transparent',
    color: 'rgba(255, 255, 255, 0.65)',
    cursor: 'pointer',
    transition: 'all 0.12s ease-out',
  },
  toolButtonActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.18)',
    color: '#0ea5e9',
    borderColor: 'rgba(14, 165, 233, 0.35)',
    boxShadow: '0 0 10px #0ea5e970, inset 0 0 12px rgba(14, 165, 233, 0.1)',
  },
  colorButton: {
    boxShadow: '0 0 8px #0ea5e940',
  },
  divider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    margin: '0 6px',
  },
  sliderContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 8px',
  },
  sliderLabel: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.55)',
    minWidth: 32,
    fontWeight: 500,
  },
  slider: {
    width: 80,
    height: 4,
    WebkitAppearance: 'none',
    appearance: 'none',
    background: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    outline: 'none',
    cursor: 'pointer',
  },
  sliderValue: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.5)',
    minWidth: 40,
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  },
  zoomInfo: {
    padding: '0 10px 0 14px',
    minWidth: 54,
    textAlign: 'center',
    borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
  },
  zoomText: {
    fontSize: '13px',
    color: '#0ea5e9',
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 600,
    textShadow: '0 0 10px #0ea5e960',
  },
  colorPicker: {
    position: 'absolute',
    top: 'calc(100% + 10px)',
    left: 0,
    display: 'flex',
    gap: 8,
    padding: 12,
    backgroundColor: '#16213e',
    borderRadius: '12px',
    border: '1px solid rgba(14, 165, 233, 0.2)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), 0 0 20px rgba(14, 165, 233, 0.08)',
    zIndex: 200,
    animation: 'fadeIn 0.2s ease-out',
  },
  colorOption: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    border: '2px solid rgba(255, 255, 255, 0.15)',
    cursor: 'pointer',
    transition: 'all 0.12s ease-out',
  },
  memberPanel: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 248,
    backgroundColor: '#16213e',
    borderRadius: '14px',
    border: '1px solid rgba(14, 165, 233, 0.15)',
    boxShadow: '0 6px 30px rgba(0, 0, 0, 0.5), 0 0 30px rgba(14, 165, 233, 0.05)',
    zIndex: 100,
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    overflow: 'hidden',
    backdropFilter: 'blur(10px)',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  },
  panelTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: '0.3px',
  },
  memberCount: {
    fontSize: '12px',
    color: '#0ea5e9',
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    padding: '3px 10px',
    borderRadius: '10px',
    fontWeight: 600,
    boxShadow: '0 0 10px #0ea5e940',
  },
  memberList: {
    maxHeight: 340,
    overflowY: 'auto',
    padding: '6px 0',
  },
  memberItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 18px',
    transition: 'background-color 0.15s ease',
  },
  memberItemMe: {
    backgroundColor: 'rgba(14, 165, 233, 0.05)',
  },
  avatarContainer: {
    position: 'relative',
    width: 38,
    height: 38,
    flexShrink: 0,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid transparent',
    background: '#0f3460',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 11,
    height: 11,
    borderRadius: '50%',
    border: '2px solid #16213e',
  },
  memberInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    minWidth: 0,
  },
  memberName: {
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.92)',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  meTag: {
    color: '#0ea5e9',
    fontWeight: 600,
    fontSize: '12px',
  },
  memberStatus: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.45)',
  },
  memberColor: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  togglePanelBtn: {
    position: 'absolute',
    top: 36,
    width: 30,
    height: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16213e',
    border: '1px solid rgba(14, 165, 233, 0.2)',
    borderRadius: '8px',
    color: '#0ea5e9',
    cursor: 'pointer',
    zIndex: 99,
    transition: 'all 0.2s ease-out',
  },
  fileImport: {
    position: 'absolute',
    bottom: 26,
    left: 26,
    zIndex: 100,
    animation: 'fadeIn 0.35s ease-out',
  },
  importButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 22px',
    backgroundColor: '#0f3460',
    color: '#0ea5e9',
    border: '1px solid rgba(14, 165, 233, 0.4)',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    transition: 'all 0.15s ease-out',
  },
  importHint: {
    marginTop: 10,
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.35)',
    paddingLeft: 4,
    letterSpacing: '0.2px',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease-out',
    backdropFilter: 'blur(4px)',
  },
  modal: {
    width: 380,
    backgroundColor: '#16213e',
    borderRadius: '16px',
    padding: 28,
    border: '1px solid rgba(14, 165, 233, 0.2)',
    boxShadow: '0 12px 48px rgba(0, 0, 0, 0.6), 0 0 40px rgba(14, 165, 233, 0.08)',
    animation: 'fadeIn 0.25s ease-out',
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: '12px',
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    boxShadow: '0 0 16px rgba(14, 165, 233, 0.15)',
  },
  modalTitle: {
    fontSize: '17px',
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: 18,
    letterSpacing: '0.3px',
  },
  modalInput: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: '#0f3460',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    marginBottom: 22,
    transition: 'all 0.15s ease-out',
    boxSizing: 'border-box',
  },
  modalButtons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancel: {
    padding: '10px 18px',
    backgroundColor: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease-out',
  },
  modalConfirm: {
    padding: '10px 22px',
    backgroundColor: '#0ea5e9',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease-out',
  },
};

export default UILayer;
