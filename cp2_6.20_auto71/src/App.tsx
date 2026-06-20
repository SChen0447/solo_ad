import React, { useState, useRef, useCallback, useEffect } from 'react';
import VersionManager from './components/VersionManager';
import ComparisonView from './components/ComparisonView';
import AnnotationLayer from './components/AnnotationLayer';

interface VersionItem {
  id: string;
  thumbnailUrl: string;
  fullUrl: string;
  fileName: string;
  width: number;
  height: number;
  uploadTime: number;
  versionNumber: string;
}

interface AnnotationItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: 'rect' | 'circle';
  text: string;
  versionId: string;
}

type CompareMode = 'opacity' | 'split';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function generateThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const thumbW = 180;
        const thumbH = 120;
        canvas.width = thumbW;
        canvas.height = thumbH;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#F5F5F5';
        ctx.fillRect(0, 0, thumbW, thumbH);
        const imgAspect = img.width / img.height;
        const thumbAspect = thumbW / thumbH;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (imgAspect > thumbAspect) {
          sw = img.height * thumbAspect;
          sx = (img.width - sw) / 2;
        } else {
          sh = img.width / thumbAspect;
          sy = (img.height - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, thumbW, thumbH);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function App() {
  const [versionList, setVersionList] = useState<VersionItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<[string, string]>(['', '']);
  const [compareMode, setCompareMode] = useState<CompareMode>('opacity');
  const [opacity, setOpacity] = useState(50);
  const [sliderPos, setSliderPos] = useState(50);
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [annotationShape, setAnnotationShape] = useState<'rect' | 'circle'>('rect');
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, ox: 0, oy: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);

  const selectedA = versionList.find(v => v.id === selectedIds[0]) || null;
  const selectedB = versionList.find(v => v.id === selectedIds[1]) || null;

  const handleUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const validFiles = Array.from(files).filter(f => {
      const isJpgPng = f.type === 'image/jpeg' || f.type === 'image/png';
      const isUnder5MB = f.size <= 5 * 1024 * 1024;
      return isJpgPng && isUnder5MB;
    }).slice(0, 10);

    const newVersions: VersionItem[] = [];
    for (const file of validFiles) {
      try {
        const thumbnailUrl = await generateThumbnail(file);
        const fullUrl = URL.createObjectURL(file);
        const img = new Image();
        const dims = await new Promise<{ w: number; h: number }>((resolve) => {
          img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
          img.onerror = () => resolve({ w: 0, h: 0 });
          img.src = fullUrl;
        });
        const versionNum = versionList.length + newVersions.length + 1;
        newVersions.push({
          id: generateId(),
          thumbnailUrl,
          fullUrl,
          fileName: file.name,
          width: dims.w,
          height: dims.h,
          uploadTime: Date.now(),
          versionNumber: `v${versionNum}.0`,
        });
      } catch {
        // skip failed files
      }
    }

    setVersionList(prev => {
      const updated = [...prev, ...newVersions];
      return updated;
    });

    if (newVersions.length > 0) {
      setSelectedIds(prev => {
        if (!prev[0]) return [newVersions[0].id, prev[1]];
        if (!prev[1]) return [prev[0], newVersions[0].id];
        return prev;
      });
    }

    e.target.value = '';
  }, [versionList.length]);

  const handleSelectVersion = useCallback((id: string, _index: number) => {
    setSelectedIds(prev => {
      if (prev[0] === id || prev[1] === id) return prev;
      if (!prev[0]) return [id, ''] as [string, string];
      if (!prev[1]) return [prev[0], id] as [string, string];
      return [prev[1], id] as [string, string];
    });
  }, []);

  const handleAddAnnotation = useCallback((annotation: Omit<AnnotationItem, 'id'>) => {
    const newAnnotation: AnnotationItem = {
      ...annotation,
      id: generateId(),
      versionId: selectedIds[0],
    };
    setAnnotations(prev => [...prev, newAnnotation]);
  }, [selectedIds]);

  const handleUpdateAnnotation = useCallback((id: string, updates: Partial<AnnotationItem>) => {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const handleDeleteAnnotation = useCallback((id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  }, []);

  const handleExportAnnotations = useCallback(() => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const data = annotations.map(a => ({
      x: Math.round(a.x),
      y: Math.round(a.y),
      width: Math.round(a.width),
      height: Math.round(a.height),
      shape: a.shape,
      text: a.text,
      versionId: a.versionId,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `annotations_${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [annotations]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpaceHeld(false);
        setIsPanning(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (spaceHeld) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY, ox: offsetX, oy: offsetY });
    }
  }, [spaceHeld, offsetX, offsetY]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setOffsetX(panStart.ox + dx);
      setOffsetY(panStart.oy + dy);
    }
  }, [isPanning, panStart]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => {
      const next = Math.max(0.5, Math.min(3, prev + delta));
      return Math.round(next * 10) / 10;
    });
  }, []);

  const handleOpacitySlider = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    setOpacity(Math.round(pct));
  }, []);

  const handleSliderPos = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    setSliderPos(Math.round(pct));
  }, []);

  const canvasCursor = spaceHeld ? (isPanning ? 'grabbing' : 'grab') : 'default';

  return (
    <div className="app-layout">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div className="toolbar">
        <div className="toolbar-group">
          <button className="btn" onClick={handleUpload}>
            <span>↑</span> Upload
          </button>
        </div>

        <div className="toolbar-separator" />

        <div className="toolbar-group">
          <button
            className={`btn${isAnnotating ? '' : ' btn-outline'}`}
            onClick={() => setIsAnnotating(!isAnnotating)}
          >
            ✎ Add Annotation
          </button>
          {isAnnotating && (
            <div className="annotation-shape-selector">
              <button
                className={`shape-btn${annotationShape === 'rect' ? ' active' : ''}`}
                onClick={() => setAnnotationShape('rect')}
                title="Rectangle"
              >
                ▭
              </button>
              <button
                className={`shape-btn${annotationShape === 'circle' ? ' active' : ''}`}
                onClick={() => setAnnotationShape('circle')}
                title="Circle"
              >
                ○
              </button>
            </div>
          )}
        </div>

        <div className="toolbar-separator" />

        <div className="toolbar-group">
          <span className="mode-label">Mode:</span>
          <button
            className={`btn-icon${compareMode === 'opacity' ? ' active' : ''}`}
            onClick={() => setCompareMode('opacity')}
            title="Opacity Blend"
          >
            ◐
          </button>
          <button
            className={`btn-icon${compareMode === 'split' ? ' active' : ''}`}
            onClick={() => setCompareMode('split')}
            title="Split View"
          >
            ▌▌
          </button>
        </div>

        {compareMode === 'opacity' && (
          <div className="slider-control">
            <span className="mode-label">Opacity</span>
            <div className="slider-track" onClick={handleOpacitySlider}>
              <div className="slider-fill" style={{ width: `${opacity}%` }} />
              <div className="slider-thumb" style={{ left: `${opacity}%` }} />
            </div>
            <span className="mode-label">{opacity}%</span>
          </div>
        )}

        <div className="toolbar-spacer" />

        <button className="btn btn-outline" onClick={handleExportAnnotations}>
          ↓ Export
        </button>
      </div>

      <div className="main-area">
        <div className={`side-panel${panelCollapsed ? ' collapsed' : ''}`}>
          {!panelCollapsed && (
            <>
              <div className="side-panel-toggle" onClick={() => setPanelCollapsed(true)}>
                ◀
              </div>
              <div className="panel-title">Version Info</div>
              {selectedA && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#6C63FF', marginBottom: 6 }}>
                    Version A: {selectedA.versionNumber}
                  </div>
                  <div className="panel-field">
                    <div className="panel-field-label">File Name</div>
                    <div className="panel-field-value">{selectedA.fileName}</div>
                  </div>
                  <div className="panel-field">
                    <div className="panel-field-label">Dimensions</div>
                    <div className="panel-field-value">{selectedA.width} × {selectedA.height}</div>
                  </div>
                  <div className="panel-field">
                    <div className="panel-field-label">Uploaded</div>
                    <div className="panel-field-value">
                      {new Date(selectedA.uploadTime).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )}
              {selectedB && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#6C63FF', marginBottom: 6 }}>
                    Version B: {selectedB.versionNumber}
                  </div>
                  <div className="panel-field">
                    <div className="panel-field-label">File Name</div>
                    <div className="panel-field-value">{selectedB.fileName}</div>
                  </div>
                  <div className="panel-field">
                    <div className="panel-field-label">Dimensions</div>
                    <div className="panel-field-value">{selectedB.width} × {selectedB.height}</div>
                  </div>
                  <div className="panel-field">
                    <div className="panel-field-label">Uploaded</div>
                    <div className="panel-field-value">
                      {new Date(selectedB.uploadTime).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )}
              {!selectedA && !selectedB && (
                <div style={{ color: '#888', fontSize: 12, textAlign: 'center', marginTop: 24 }}>
                  Upload images to view version info
                </div>
              )}
              <div style={{ marginTop: 20, borderTop: '1px solid #E5E5E5', paddingTop: 12 }}>
                <div className="panel-title">Annotations</div>
                <div className="panel-field">
                  <div className="panel-field-label">Total</div>
                  <div className="panel-field-value">{annotations.length}</div>
                </div>
              </div>
            </>
          )}
          {panelCollapsed && (
            <div className="side-panel-toggle" onClick={() => setPanelCollapsed(false)}>
              ▶
            </div>
          )}
        </div>

        {panelCollapsed && (
          <button className="float-panel-toggle" onClick={() => setPanelCollapsed(false)}>
            ▶
          </button>
        )}

        <div
          ref={canvasAreaRef}
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            cursor: canvasCursor,
          }}
          onWheel={handleWheel}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        >
          {versionList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎨</div>
              <div className="empty-state-text">Upload illustrations to start comparing</div>
              <div className="upload-hint">Supports JPG, PNG • Max 5MB per image • Up to 10 at once</div>
            </div>
          ) : (
            <>
              <ComparisonView
                imageA={selectedA?.fullUrl || null}
                imageB={selectedB?.fullUrl || null}
                mode={compareMode}
                opacity={opacity}
                sliderPos={sliderPos}
                onOpacityChange={setOpacity}
                onSliderChange={setSliderPos}
                scale={scale}
                offsetX={offsetX}
                offsetY={offsetY}
                canvasRef={canvasRef}
                containerRef={containerRef}
              />
              <AnnotationLayer
                annotations={annotations}
                isActive={isAnnotating}
                shape={annotationShape}
                scale={scale}
                offsetX={offsetX}
                offsetY={offsetY}
                onAdd={handleAddAnnotation}
                onUpdate={handleUpdateAnnotation}
                onDelete={handleDeleteAnnotation}
              />
              {compareMode === 'split' && (
                <div
                  className="split-line-handle"
                  style={{
                    left: `${sliderPos}%`,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    const startX = e.clientX;
                    const startPos = sliderPos;
                    const areaEl = canvasAreaRef.current;
                    if (!areaEl) return;
                    const areaWidth = areaEl.clientWidth;
                    const onMove = (me: MouseEvent) => {
                      const dx = me.clientX - startX;
                      const pct = Math.max(0, Math.min(100, startPos + (dx / areaWidth) * 100));
                      setSliderPos(Math.round(pct));
                    };
                    const onUp = () => {
                      window.removeEventListener('mousemove', onMove);
                      window.removeEventListener('mouseup', onUp);
                    };
                    window.addEventListener('mousemove', onMove);
                    window.addEventListener('mouseup', onUp);
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>

      <VersionManager
        versionList={versionList}
        selectedIds={selectedIds}
        onSelectVersion={handleSelectVersion}
        onUpload={handleUpload}
      />
    </div>
  );
}

export default App;
