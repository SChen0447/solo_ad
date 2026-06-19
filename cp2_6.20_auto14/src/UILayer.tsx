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

    return () => {
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
    if (!canvasCoreRef.current) return null;

    return members
      .filter(m => m.id !== userId && m.cursor && m.isOnline)
      .map(member => {
        if (!member.cursor) return null;
        const screenPos = canvasCoreRef.current!.worldToScreen(member.cursor.x, member.cursor.y);
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (!canvasRect) return null;

        return (
          <div
          key={member.id}
          style={{
            position: 'absolute',
            left: screenPos.x - canvasRect.left,
            top: screenPos.y - canvasRect.top,
            pointerEvents: 'none',
            zIndex: 10,
            transition: 'left 0.05s linear',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M2 2 L18 8 L12 12 L10 18 Z" fill={member.color} stroke="white" strokeWidth="1" />
          </svg>
          {member.showNameTag && (
            <div
              style={{
                position: 'absolute',
                left: 20,
                top: -5,
                background: member.color,
                color: 'white',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                opacity: member.nameTagOpacity,
                transition: 'opacity 0.1s linear',
                boxShadow: `0 0 8px ${member.color}`,
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
              ...(currentTool === 'brush' ? styles.toolButtonActive : {}),
            }}
            onClick={() => setCurrentTool('brush')}
            title="画笔工具 (B)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19l7-7 3 3-7 7-3-3z"/>
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
              <path d="M2 2l7.586 7.586"/>
              <circle cx="11" cy="11" r="2"/>
            </svg>
          </button>
          <button
            style={{
              ...styles.toolButton,
              ...(currentTool === 'pan' ? styles.toolButtonActive : {}),
            }}
            onClick={() => setCurrentTool('pan')}
            title="平移工具 (H)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/>
              <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/>
              <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/>
              <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
            </svg>
          </button>
        </div>

        <div style={styles.divider} />

        <div style={styles.toolGroup}>
          <button
            style={{
              ...styles.toolButton,
              position: 'relative',
            }}
            onClick={() => setShowColorPicker(!showColorPicker)}
            title="画笔颜色"
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: brushColor,
                border: '2px solid rgba(255,255,255,0.3)',
                boxShadow: `0 0 8px ${brushColor}`,
              }}
            />
          </button>
          {showColorPicker && (
            <div style={styles.colorPicker}>
              {colors.map(color => (
                <button
                  key={color}
                  style={{
                    ...styles.colorOption,
                    background: color,
                    ...(brushColor === color ? { boxShadow: `0 0 0 2px #0ea5e9` } : {}),
                  }}
                  onClick={() => {
                    setBrushColor(color);
                    setShowColorPicker(false);
                  }}
                />
              ))}
            </div>
          )}
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
          <span style={styles.sliderLabel}>透明度</span>
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

      <div style={{ ...styles.memberPanel, opacity: isPanelVisible ? 1 : 0, pointerEvents: isPanelVisible ? 'auto' : 'none' }}>
        <div style={styles.panelHeader}>
          <span style={styles.panelTitle}>在线成员</span>
          <span style={styles.memberCount}>{members.length}</span>
        </div>
        <div style={styles.memberList}>
          {members.map(member => (
            <div key={member.id} style={styles.memberItem}>
              <div style={styles.avatarContainer}>
                <img
                  src={member.avatar}
                  alt={member.name}
                  style={styles.avatar}
                />
                <div
                  style={{
                    ...styles.onlineDot,
                    backgroundColor: member.isOnline ? '#22c55e' : '#666',
                  }}
                />
              </div>
              <div style={styles.memberInfo}>
                <span style={styles.memberName}>{member.name}</span>
                <span style={{ ...styles.memberStatus, color: member.color }}>
                  {member.isDrawing ? '绘画中...' : member.cursor ? '浏览中' : '在线'}
                </span>
              </div>
              <div
                style={{
                  ...styles.memberColor,
                  backgroundColor: member.color,
                  boxShadow: `0 0 6px ${member.color}`,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <button
        style={styles.togglePanelBtn}
        onClick={() => setIsPanelVisible(!isPanelVisible)}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ transform: isPanelVisible ? 'rotate(0deg)' : 'rotate(180deg)' }}
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
        <button style={styles.importButton} onClick={handleImportClick}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span style={{ marginLeft: 8 }}>导入图片</span>
        </button>
        <p style={styles.importHint}>支持拖拽或点击上传 PNG/JPG/SVG</p>
      </div>

      {editingImage && (
        <div style={styles.modalOverlay} onClick={handleCancelEdit}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>编辑图片说明</h3>
            <input
              type="text"
              style={styles.modalInput}
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
              <button style={styles.modalCancel} onClick={handleCancelEdit}>取消</button>
              <button style={styles.modalConfirm} onClick={handleSaveLabel}>确定</button>
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
    gap: 8,
    padding: '10px 16px',
    backgroundColor: '#16213e',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
    zIndex: 100,
    animation: 'fadeIn 0.3s ease-out',
  },
  toolGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  toolButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    border: 'none',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    color: 'rgba(255, 255, 255, 0.7)',
    cursor: 'pointer',
    transition: 'all 0.1s ease',
  },
  toolButtonActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.2)',
    color: '#0ea5e9',
    boxShadow: '0 0 10px rgba(14, 165, 233, 0.5)',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    margin: '0 8px',
  },
  sliderContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 8px',
  },
  sliderLabel: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.6)',
    minWidth: 36,
  },
  slider: {
    width: 80,
    height: 4,
    WebkitAppearance: 'none',
    appearance: 'none',
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    outline: 'none',
    cursor: 'pointer',
  },
  sliderValue: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.5)',
    minWidth: 36,
    textAlign: 'right',
  },
  zoomInfo: {
    padding: '0 12px',
    minWidth: 50,
    textAlign: 'center',
  },
  zoomText: {
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.6)',
    fontVariantNumeric: 'tabular-nums',
  },
  colorPicker: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 8,
    display: 'flex',
    gap: 6,
    padding: 10,
    backgroundColor: '#16213e',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
    zIndex: 200,
    animation: 'fadeIn 0.2s ease-out',
  },
  colorOption: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    transition: 'transform 0.1s ease',
  },
  memberPanel: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 240,
    backgroundColor: '#16213e',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
    zIndex: 100,
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    overflow: 'hidden',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  panelTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  memberCount: {
    fontSize: '12px',
    color: '#0ea5e9',
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  memberList: {
    maxHeight: 300,
    overflowY: 'auto',
    padding: '8px 0',
  },
  memberItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 16px',
    transition: 'background-color 0.15s ease',
  },
  avatarContainer: {
    position: 'relative',
    width: 36,
    height: 36,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid transparent',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: '50%',
    border: '2px solid #16213e',
  },
  memberInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  memberName: {
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: 500,
  },
  memberStatus: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  memberColor: {
    width: 10,
    height: 10,
    borderRadius: '50%',
  },
  togglePanelBtn: {
    position: 'absolute',
    top: 35,
    right: 260,
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16213e',
    border: 'none',
    borderRadius: '6px',
    color: 'rgba(255, 255, 255, 0.7)',
    cursor: 'pointer',
    zIndex: 99,
    transition: 'all 0.2s ease',
  },
  fileImport: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    zIndex: 100,
    animation: 'fadeIn 0.3s ease-out',
  },
  importButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 20px',
    backgroundColor: '#0f3460',
    color: '#0ea5e9',
    border: '1px solid rgba(14, 165, 233, 0.3)',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.15s ease',
    boxShadow: '0 0 15px rgba(14, 165, 233, 0.2)',
  },
  importHint: {
    marginTop: 8,
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease-out',
  },
  modal: {
    width: 360,
    backgroundColor: '#16213e',
    borderRadius: '12px',
    padding: 24,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    animation: 'fadeIn 0.25s ease-out',
  },
  modalTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
  },
  modalInput: {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: '#0f3460',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    marginBottom: 20,
    transition: 'border-color 0.15s ease',
  },
  modalButtons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancel: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '6px',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  modalConfirm: {
    padding: '8px 20px',
    backgroundColor: '#0ea5e9',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: '0 0 10px rgba(14, 165, 233, 0.5)',
  },
};

export default UILayer;
