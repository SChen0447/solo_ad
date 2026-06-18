import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSceneStore } from '../store/sceneStore';
import { importScene } from '../utils/exportImport';
import './SceneList.css';

const SceneList: React.FC = () => {
  const { scenes, activeSceneId, setActiveScene, addScene, reorderScenes, importScenes } = useSceneStore();
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBackground, setNewBackground] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [longPressedIndex, setLongPressedIndex] = useState<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const hasMoved = useRef(false);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      setLongPressedIndex(null);
      setDraggedIndex(null);
      setDragOverIndex(null);
      dragStartPos.current = null;
      hasMoved.current = false;
    };
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const handleCreateScene = () => {
    if (newName.trim()) {
      addScene(newName.trim(), newBackground.trim());
      setNewName('');
      setNewBackground('');
      setShowModal(false);
      setShowPreview(false);
    }
  };

  const handleMouseDown = (index: number, e: React.MouseEvent) => {
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    hasMoved.current = false;
    longPressTimer.current = setTimeout(() => {
      setLongPressedIndex(index);
    }, 300);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragStartPos.current && !hasMoved.current) {
      const dx = Math.abs(e.clientX - dragStartPos.current.x);
      const dy = Math.abs(e.clientY - dragStartPos.current.y);
      if (dx > 3 || dy > 3) {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }
    }
  };

  const handleMouseUpOnCard = (index: number) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    const wasLongPressed = longPressedIndex === index;
    const wasDragged = draggedIndex !== null;
    setTimeout(() => {
      if (!wasLongPressed && !wasDragged && !hasMoved.current) {
        setActiveScene(scenes[index].id);
      }
      setLongPressedIndex(null);
      setDraggedIndex(null);
      setDragOverIndex(null);
      dragStartPos.current = null;
      hasMoved.current = false;
    }, 10);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (longPressedIndex !== index) {
      e.preventDefault();
      return;
    }
    hasMoved.current = true;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.5';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (draggedIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '';
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setLongPressedIndex(null);
      return;
    }
    reorderScenes(draggedIndex, index);
    setDraggedIndex(null);
    setDragOverIndex(null);
    setLongPressedIndex(null);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '';
    setDraggedIndex(null);
    setDragOverIndex(null);
    setLongPressedIndex(null);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { scene, roles, messages } = await importScene(file);
      const sceneId = scene.id;
      importScenes([scene], { [sceneId]: messages });
      const { useRoleStore } = await import('../store/roleStore');
      useRoleStore.getState().importRoles(roles);
    } catch (err) {
      alert('导入失败: ' + (err as Error).message);
    }
    e.target.value = '';
  };

  const renderMarkdownPreview = useCallback((text: string): string => {
    if (!text.trim()) return '<span class="placeholder">暂无内容，在"编辑"标签中输入 Markdown 内容</span>';
    let html = text
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/\n/g, '<br />');
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    return html;
  }, []);

  const truncateDescription = (text: string, maxLength = 60): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const isDraggable = (index: number) => longPressedIndex === index;

  return (
    <div className="scene-list">
      <div className="scene-list-header">
        <h2>场景</h2>
        <button className="new-scene-btn" onClick={() => setShowModal(true)}>
          + 新建场景
        </button>
      </div>

      <div className="scene-list-container">
        {scenes.map((scene, index) => (
          <div
            key={scene.id}
            className={`scene-card ${activeSceneId === scene.id ? 'active' : ''} ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index && draggedIndex !== null && draggedIndex !== index ? 'drag-over' : ''} ${longPressedIndex === index ? 'long-pressed' : ''}`}
            draggable={isDraggable(index)}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            onMouseDown={(e) => handleMouseDown(index, e)}
            onMouseMove={handleMouseMove}
            onMouseUp={() => handleMouseUpOnCard(index)}
            onMouseLeave={() => {
              if (longPressTimer.current) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
              }
            }}
          >
            <div className="scene-card-name">{scene.name}</div>
            <div className="scene-card-desc">
              {scene.worldBackground ? truncateDescription(scene.worldBackground) : '暂无描述'}
            </div>
            {longPressedIndex === index && (
              <div className="drag-hint">拖拽移动</div>
            )}
          </div>
        ))}
        {scenes.length === 0 && (
          <div className="empty-state">还没有场景，点击上方按钮创建一个</div>
        )}
      </div>

      <div className="scene-list-footer">
        <button className="import-btn" onClick={handleImportClick}>
          导入场景
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept=".json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>新建场景</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>场景名称</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="输入场景名称"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>世界背景描述（支持 Markdown）</label>
                <div className="markdown-editor">
                  <div className="editor-tabs">
                    <button
                      className={`tab ${!showPreview ? 'active' : ''}`}
                      onClick={() => setShowPreview(false)}
                      type="button"
                    >
                      ✏️ 编辑
                    </button>
                    <button
                      className={`tab ${showPreview ? 'active' : ''}`}
                      onClick={() => setShowPreview(true)}
                      type="button"
                    >
                      👁️ 预览
                    </button>
                  </div>
                  {!showPreview ? (
                    <textarea
                      value={newBackground}
                      onChange={(e) => setNewBackground(e.target.value)}
                      placeholder={'描述这个世界的背景设定...\n\n支持 Markdown：\n# 标题\n**粗体** *斜体*\n`代码`\n- 列表项'}
                      className="form-textarea"
                      rows={8}
                    />
                  ) : (
                    <div
                      className="markdown-preview"
                      dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(newBackground) }}
                    />
                  )}
                </div>
                {showPreview && newBackground && (
                  <div className="preview-source-hint">
                    点击"编辑"标签修改内容
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-cancel" onClick={() => setShowModal(false)} type="button">
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateScene}
                disabled={!newName.trim()}
                type="button"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SceneList;
