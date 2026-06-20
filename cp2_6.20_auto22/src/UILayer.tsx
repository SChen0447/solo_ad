import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CanvasCore, type BrushSettings, type ImageElementData, type Point } from './CanvasCore';
import { CollaborationManager, type Member } from './CollaborationManager';
import { FileManager, type DragHandle } from './FileManager';

const COLORS = ['#0ea5e9', '#f43f5e', '#8b5cf6', '#10b981', '#f59e0b', '#ffffff', '#000000'];

export const UILayer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasCoreRef = useRef<CanvasCore | null>(null);
  const collaborationRef = useRef<CollaborationManager | null>(null);
  const fileManagerRef = useRef<FileManager | null>(null);

  const [brushSettings, setBrushSettings] = useState<BrushSettings>({ color: '#0ea5e9', thickness: 4, opacity: 1 });
  const [members, setMembers] = useState<Member[]>([]);
  const [images, setImages] = useState<ImageElementData[]>([]);
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [editImageId, setEditImageId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isBrushActive, setIsBrushActive] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvasCore = new CanvasCore(canvasRef.current);
    const collaboration = new CollaborationManager();
    const fileManager = new FileManager();

    canvasCoreRef.current = canvasCore;
    collaborationRef.current = collaboration;
    fileManagerRef.current = fileManager;

    setBrushSettings(canvasCore.getBrushSettings());
    setViewport(canvasCore.getViewport());

    collaboration.onMembersChange(setMembers);
    fileManager.onImagesChange(setImages);
    fileManager.onEditChange((state) => {
      setEditImageId(state.imageId);
      if (state.imageId) {
        const img = fileManager.getImages().find(i => i.id === state.imageId);
        setEditCaption(img?.caption || '');
      }
    });

    canvasCore.subscribe(() => {
      setBrushSettings(canvasCore.getBrushSettings());
      setViewport(canvasCore.getViewport());
    });

    fileManager.setAddImageCallback((img) => canvasCore.addImageElement(img));
    fileManager.setUpdateImageCallback((id, updates) => canvasCore.updateImageElement(id, updates));
    collaboration.onRemotePath((path) => canvasCore.addRemotePath(path));

    const handleCanvasMouseMove = (e: MouseEvent) => {
      if (!canvasCoreRef.current || !collaborationRef.current) return;
      if (fileManagerRef.current?.getDragState()) {
        const worldPos = canvasCoreRef.current.screenToWorld(e.clientX, e.clientY);
        fileManagerRef.current.updateDrag(worldPos.x, worldPos.y);
        return;
      }
      const worldPos = canvasCoreRef.current.screenToWorld(e.clientX, e.clientY);
      collaborationRef.current.broadcastAction({ type: 'cursor_move', data: worldPos });
    };

    const handleCanvasMouseUp = () => {
      if (fileManagerRef.current?.getDragState()) {
        fileManagerRef.current.endDrag();
      }
    };

    canvasRef.current.addEventListener('mousemove', handleCanvasMouseMove);
    window.addEventListener('mouseup', handleCanvasMouseUp);

    setIsReady(true);

    return () => {
      canvasRef.current?.removeEventListener('mousemove', handleCanvasMouseMove);
      window.removeEventListener('mouseup', handleCanvasMouseUp);
      canvasCore.destroy();
      collaboration.destroy();
      fileManager.destroy();
    };
  }, []);

  const handleColorChange = useCallback((color: string) => {
    canvasCoreRef.current?.setBrushSettings({ color });
  }, []);

  const handleThicknessChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    canvasCoreRef.current?.setBrushSettings({ thickness: Number(e.target.value) });
  }, []);

  const handleOpacityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    canvasCoreRef.current?.setBrushSettings({ opacity: Number(e.target.value) });
  }, []);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && canvasCoreRef.current && fileManagerRef.current) {
      const vp = canvasCoreRef.current.getViewport();
      const centerX = -vp.x / vp.scale;
      const centerY = -vp.y / vp.scale;
      fileManagerRef.current.handleFiles(e.target.files, centerX, centerY);
    }
    e.target.value = '';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && canvasCoreRef.current && fileManagerRef.current) {
      const vp = canvasCoreRef.current.getViewport();
      const centerX = -vp.x / vp.scale;
      const centerY = -vp.y / vp.scale;
      fileManagerRef.current.handleFiles(e.dataTransfer.files, centerX, centerY);
    }
  }, []);

  const handleImageMouseDown = useCallback((e: React.MouseEvent, imageId: string, handle: DragHandle) => {
    if (!canvasCoreRef.current || !fileManagerRef.current) return;
    e.stopPropagation();
    e.preventDefault();
    const worldPos = canvasCoreRef.current.screenToWorld(e.clientX, e.clientY);
    fileManagerRef.current.startDrag(imageId, handle, worldPos.x, worldPos.y);
  }, []);

  const handleImageDoubleClick = useCallback((e: React.MouseEvent, imageId: string) => {
    if (!fileManagerRef.current) return;
    e.stopPropagation();
    fileManagerRef.current.startEdit(imageId);
  }, []);

  const handleCaptionSubmit = useCallback(() => {
    if (editImageId && fileManagerRef.current) {
      fileManagerRef.current.updateCaption(editImageId, editCaption);
      fileManagerRef.current.endEdit();
    }
  }, [editImageId, editCaption]);

  const handleCaptionKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCaptionSubmit();
    } else if (e.key === 'Escape') {
      fileManagerRef.current?.endEdit();
    }
  }, [handleCaptionSubmit]);

  const getHandleCursor = (handle: DragHandle | null): string => {
    switch (handle) {
      case 'nw': case 'se': return 'nwse-resize';
      case 'ne': case 'sw': return 'nesw-resize';
      case 'move': return 'move';
      default: return 'crosshair';
    }
  };

  const editingImage = editImageId ? images.find(i => i.id === editImageId) : null;
  const currentUserId = collaborationRef.current?.getCurrentUserId() || '';

  return (
    <div className="whiteboard-container">
      <canvas
        ref={canvasRef}
        className="whiteboard-canvas"
        style={{ cursor: 'crosshair' }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      />

      {isReady && (
        <div className="whiteboard-overlay">
          {images.map(img => (
            <div
              key={img.id}
              className="image-wrapper"
              style={{
                left: viewport.x + img.x * viewport.scale,
                top: viewport.y + img.y * viewport.scale,
                width: img.width * viewport.scale,
                height: img.height * viewport.scale,
                cursor: getHandleCursor('move')
              }}
              onMouseDown={(e) => handleImageMouseDown(e, img.id, 'move')}
              onDoubleClick={(e) => handleImageDoubleClick(e, img.id)}
            >
              {(['nw', 'ne', 'sw', 'se'] as const).map(h => (
                <div
                  key={h}
                  className={`resize-handle handle-${h}`}
                  style={{ cursor: getHandleCursor(h) }}
                  onMouseDown={(e) => handleImageMouseDown(e, img.id, h)}
                />
              ))}
            </div>
          ))}

          {members.filter(m => m.id !== currentUserId && m.cursorPos).map(m => (
            <div
              key={`cursor-${m.id}`}
              className="member-cursor"
              style={{
                left: viewport.x + m.cursorPos!.x * viewport.scale,
                top: viewport.y + m.cursorPos!.y * viewport.scale,
                opacity: m.labelOpacity > 0 ? 1 : 0.5
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill={m.color}>
                <path d="M5 3l14 9-7 2-2 7z" />
              </svg>
              <div
                className="member-label"
                style={{
                  backgroundColor: m.color,
                  opacity: m.labelOpacity
                }}
              >
                {m.name}
              </div>
            </div>
          ))}

          {editingImage && (
            <div
              className="caption-edit-popup"
              style={{
                left: viewport.x + editingImage.x * viewport.scale + editingImage.width * viewport.scale / 2,
                top: viewport.y + (editingImage.y + editingImage.height + 30) * viewport.scale
              }}
            >
              <input
                type="text"
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                onKeyDown={handleCaptionKeyDown}
                onBlur={handleCaptionSubmit}
                placeholder="输入文字说明..."
                autoFocus
                className="caption-input"
              />
            </div>
          )}
        </div>
      )}

      {isDragOver && (
        <div className="drag-overlay">
          <div className="drag-overlay-content">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>释放以上传图片</span>
          </div>
        </div>
      )}

      <div className="toolbar">
        <div className="tool-section">
          <button
            className={`tool-btn ${isBrushActive ? 'active' : ''}`}
            onClick={() => setIsBrushActive(true)}
            title="画笔工具 (按住空格键+拖拽平移,滚轮缩放)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <path d="M2 2l7.586 7.586" />
              <circle cx="11" cy="11" r="2" />
            </svg>
          </button>
        </div>

        <div className="tool-divider" />

        <div className="tool-section">
          <div className="color-picker">
            {COLORS.map(color => (
              <button
                key={color}
                className={`color-swatch ${brushSettings.color === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorChange(color)}
              />
            ))}
          </div>
        </div>

        <div className="tool-divider" />

        <div className="tool-section">
          <div className="slider-group">
            <span className="slider-label">粗细</span>
            <input
              type="range"
              min="1"
              max="30"
              value={brushSettings.thickness}
              onChange={handleThicknessChange}
              className="slider"
            />
            <span className="slider-value">{brushSettings.thickness}px</span>
          </div>
        </div>

        <div className="tool-divider" />

        <div className="tool-section">
          <div className="slider-group">
            <span className="slider-label">透明度</span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={brushSettings.opacity}
              onChange={handleOpacityChange}
              className="slider"
            />
            <span className="slider-value">{Math.round(brushSettings.opacity * 100)}%</span>
          </div>
        </div>

        <div className="tool-divider" />

        <div className="tool-section">
          <div className="zoom-info">
            <span>缩放: {Math.round(viewport.scale * 100)}%</span>
          </div>
        </div>
      </div>

      <div className="member-panel">
        <div className="panel-header">
          <span className="panel-title">在线成员</span>
          <span className="member-count">{members.filter(m => m.isOnline).length}</span>
        </div>
        <div className="member-list">
          {members.map(member => (
            <div key={member.id} className="member-item">
              <div className="avatar-wrapper">
                <img src={member.avatar} alt={member.name} className="avatar" />
                {member.isOnline && <div className="online-dot" />}
              </div>
              <div className="member-info">
                <span className="member-name">{member.name}</span>
                {member.id === currentUserId && (
                  <span className="member-tag">你</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="import-section">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/svg+xml"
          multiple
          onChange={handleFileSelect}
          className="hidden-file-input"
        />
        <button className="import-btn" onClick={handleImportClick}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span>导入图片</span>
        </button>
        <div className="hint-text">支持 PNG / JPG / SVG</div>
      </div>
    </div>
  );
};
