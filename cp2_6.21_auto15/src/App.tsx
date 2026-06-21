import React, { useState, useCallback, useRef } from 'react';
import { MessageSquarePlus, Download, Layers, Columns, PanelLeftClose, PanelLeftOpen, Upload } from 'lucide-react';
import VersionManager from './components/VersionManager';
import ComparisonView from './components/ComparisonView';
import AnnotationLayer from './components/AnnotationLayer';
import type { VersionItem, Annotation, CompareMode } from './types';

const generateId = () => Math.random().toString(36).substring(2, 10);

const generateThumbnail = (file: File): Promise<{ url: string; thumbUrl: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const tw = 180;
        const th = 120;
        canvas.width = tw;
        canvas.height = th;
        const ctx = canvas.getContext('2d')!;
        const scale = Math.max(tw / img.width, th / img.height);
        const sw = img.width * scale;
        const sh = img.height * scale;
        ctx.drawImage(img, (tw - sw) / 2, (th - sh) / 2, sw, sh);
        const thumbUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve({ url: dataUrl, thumbUrl, width: img.width, height: img.height });
      };
      img.onerror = reject;
      img.src = dataUrl;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const App: React.FC = () => {
  const [versionList, setVersionList] = useState<VersionItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<[string, string]>(['', '']);
  const [compareMode, setCompareMode] = useState<CompareMode>('opacity');
  const [opacity, setOpacity] = useState(0.5);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleUpload = useCallback(async (files: FileList) => {
    const fileArr = Array.from(files).filter(f => {
      const ext = f.name.toLowerCase();
      return (ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.png')) && f.size <= 5 * 1024 * 1024;
    }).slice(0, 10);

    const newVersions: VersionItem[] = [];
    const startIdx = versionList.length + 1;

    for (let i = 0; i < fileArr.length; i++) {
      try {
        const { url, thumbUrl, width, height } = await generateThumbnail(fileArr[i]);
        const versionNumber = `v${(startIdx + i - 1) / 1 + 0.0}`;
        newVersions.push({
          id: generateId(),
          versionNumber: `v${(startIdx + i).toFixed(1)}`,
          fileName: fileArr[i].name,
          originalUrl: url,
          thumbnailUrl: thumbUrl,
          width,
          height,
          uploadTime: new Date(),
        });
      } catch (err) {
        console.error('Failed to load image:', fileArr[i].name, err);
      }
    }

    setVersionList(prev => [...prev, ...newVersions]);

    if (newVersions.length > 0) {
      setSelectedIds(prev => {
        if (!prev[0]) return [newVersions[0].id, prev[1] || ''];
        if (!prev[1]) return [prev[0], newVersions[0].id];
        return [prev[0], newVersions[0].id];
      });
    }
  }, [versionList.length]);

  const handleSelectVersion = useCallback((id: string, slot: 0 | 1) => {
    setSelectedIds(prev => {
      const next: [string, string] = [...prev];
      next[slot] = id;
      return next;
    });
  }, []);

  const selectedA = versionList.find(v => v.id === selectedIds[0]);
  const selectedB = versionList.find(v => v.id === selectedIds[1]);

  const handleAnnotationAdd = useCallback((ann: Omit<Annotation, 'id'>) => {
    setAnnotations(prev => [...prev, { ...ann, id: generateId() }]);
  }, []);

  const handleAnnotationUpdate = useCallback((id: string, updates: Partial<Annotation>) => {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const handleAnnotationDelete = useCallback((id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  }, []);

  const handleExport = useCallback(() => {
    const data = annotations.map(a => ({
      id: a.id,
      shape: a.shape,
      x: Math.round(a.x * 100) / 100,
      y: Math.round(a.y * 100) / 100,
      width: Math.round(a.width * 100) / 100,
      height: Math.round(a.height * 100) / 100,
      text: a.text,
      versionId: a.versionId,
    }));
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    a.href = url;
    a.download = `annotations_${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [annotations]);

  const handleUploadBtnClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.jpg,.jpeg,.png';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) handleUpload(files);
    };
    input.click();
  };

  const currentVersion = selectedA || selectedB;

  return (
    <div className="app-layout">
      <div className="toolbar">
        <button className="toolbar-btn" onClick={handleUploadBtnClick}>
          <Upload size={15} />
          上传图片
        </button>

        <div className="toolbar-separator" />

        <button
          className={`toolbar-btn${isAnnotating ? '' : '-outline'}`}
          onClick={() => setIsAnnotating(!isAnnotating)}
        >
          <MessageSquarePlus size={15} />
          {isAnnotating ? '批注中...' : '添加批注'}
        </button>

        <button className="toolbar-btn-outline" onClick={handleExport}>
          <Download size={15} />
          导出批注
        </button>

        <div className="toolbar-separator" />

        <div className="compare-mode-group">
          <button
            className={`compare-mode-btn${compareMode === 'opacity' ? ' active' : ''}`}
            onClick={() => setCompareMode('opacity')}
            title="透明度混合"
          >
            <Layers size={16} />
          </button>
          <button
            className={`compare-mode-btn${compareMode === 'split' ? ' active' : ''}`}
            onClick={() => setCompareMode('split')}
            title="分割对比"
          >
            <Columns size={16} />
          </button>
        </div>

        <div className="zoom-display">
          缩放 {Math.round(scale * 100)}%
        </div>
      </div>

      <div className="main-area">
        <div className={`side-panel${panelCollapsed ? ' collapsed' : ''}`}>
          <button
            className="panel-toggle"
            onClick={() => setPanelCollapsed(!panelCollapsed)}
          >
            {panelCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
          {!panelCollapsed && (
            <div className="panel-content">
              {currentVersion ? (
                <>
                  <div className="panel-field">
                    <span className="panel-label">文件名</span>
                    <span className="panel-value">{currentVersion.fileName}</span>
                  </div>
                  <div className="panel-field">
                    <span className="panel-label">尺寸</span>
                    <span className="panel-value">{currentVersion.width} x {currentVersion.height}</span>
                  </div>
                  <div className="panel-field">
                    <span className="panel-label">版本</span>
                    <span className="panel-value">{currentVersion.versionNumber}</span>
                  </div>
                  <div className="panel-field">
                    <span className="panel-label">上传时间</span>
                    <span className="panel-value">
                      {currentVersion.uploadTime.toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--color-muted)', fontSize: 12 }}>
                  上传图片后查看版本属性
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
          <ComparisonView
            imageA={selectedA?.originalUrl || null}
            imageB={selectedB?.originalUrl || null}
            compareMode={compareMode}
            opacity={opacity}
            onOpacityChange={setOpacity}
            scale={scale}
            offsetX={offsetX}
            offsetY={offsetY}
            onScaleChange={setScale}
            onOffsetChange={(x, y) => { setOffsetX(x); setOffsetY(y); }}
            canvasRef={canvasRef}
          />
          <AnnotationLayer
            annotations={annotations}
            isAnnotating={isAnnotating}
            scale={scale}
            offsetX={offsetX}
            offsetY={offsetY}
            canvasWidth={0}
            canvasHeight={0}
            onAdd={handleAnnotationAdd}
            onUpdate={handleAnnotationUpdate}
            onDelete={handleAnnotationDelete}
            currentVersionId={selectedIds[0] || selectedIds[1]}
          />
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
};

export default App;
