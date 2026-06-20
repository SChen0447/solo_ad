import React, { useState, useRef, useEffect } from 'react';
import { CompareView } from './components/CompareView';
import { syncScroll } from './modules/syncScroll';
import { downloadReport } from './modules/exportReport';
import type { Annotation, ImageData } from './types';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const App: React.FC = () => {
  const [imageA, setImageA] = useState<ImageData | null>(null);
  const [imageB, setImageB] = useState<ImageData | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [zoom, setZoom] = useState(1);

  const refA = useRef<HTMLDivElement>(null);
  const refB = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!refA.current || !refB.current) return;

    const sync = syncScroll(refA, refB, {
      minZoom: 0.5,
      maxZoom: 2,
      zoomStep: 0.1,
      onZoomChange: (newZoom) => setZoom(newZoom),
    });

    sync.attach();

    return () => {
      sync.detach();
    };
  }, [imageA, imageB]);

  const loadImage = (file: File, target: 'A' | 'B'): Promise<ImageData> => {
    return new Promise((resolve, reject) => {
      if (file.size > MAX_FILE_SIZE) {
        reject(new Error('文件大小超过10MB限制'));
        return;
      }
      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        reject(new Error('仅支持PNG和JPG格式'));
        return;
      }

      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        resolve({
          url,
          title: target === 'A' ? '方案A' : '方案B',
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = url;
    });
  };

  const handleFile = async (file: File, target: 'A' | 'B') => {
    try {
      const data = await loadImage(file, target);
      if (target === 'A') {
        setImageA(data);
        setAnnotations(prev => prev.filter(a => a.target !== 'A'));
      } else {
        setImageB(data);
        setAnnotations(prev => prev.filter(a => a.target !== 'B'));
      }
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleTitleChange = (target: 'A' | 'B', title: string) => {
    if (target === 'A') {
      setImageA(prev => prev ? { ...prev, title } : null);
    } else {
      setImageB(prev => prev ? { ...prev, title } : null);
    }
  };

  const handleDeleteImage = (target: 'A' | 'B') => {
    if (target === 'A') {
      setImageA(null);
      setAnnotations(prev => prev.filter(a => a.target !== 'A'));
    } else {
      setImageB(null);
      setAnnotations(prev => prev.filter(a => a.target !== 'B'));
    }
  };

  const handleAddAnnotation = (annotation: Annotation) => {
    setAnnotations(prev => [...prev, annotation]);
  };

  const handleUpdateAnnotation = (annotation: Annotation) => {
    setAnnotations(prev => prev.map(a => a.id === annotation.id ? annotation : a));
  };

  const handleDeleteAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  };

  const handleExportReport = () => {
    if (!imageA || !imageB) {
      alert('请先上传两张图片再导出报告');
      return;
    }
    downloadReport(imageA, imageB, annotations);
  };

  const canExport = imageA && imageB;

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#fafafa',
      overflow: 'hidden',
    }}>
      <header style={{
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        background: '#ffffff',
        borderBottom: '1px solid #e0e0e0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        <h1 style={{
          fontSize: 24,
          fontWeight: 600,
          color: '#1d3557',
        }}>
          布局方案对比与设计注释
        </h1>
        <button
          onClick={handleExportReport}
          disabled={!canExport}
          style={{
            width: 140,
            height: 44,
            background: canExport ? '#3a86ff' : '#aaa',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 500,
            cursor: canExport ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (canExport) {
              e.currentTarget.style.background = '#2a6dd6';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = canExport ? '#3a86ff' : '#aaa';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          导出报告
        </button>
      </header>

      <div style={{
        flex: 1,
        display: 'flex',
        minHeight: 0,
      }}>
        <CompareView
          ref={refA}
          imageData={imageA}
          target="A"
          annotations={annotations}
          onTitleChange={(title) => handleTitleChange('A', title)}
          onDelete={() => handleDeleteImage('A')}
          onAddAnnotation={handleAddAnnotation}
          onUpdateAnnotation={handleUpdateAnnotation}
          onDeleteAnnotation={handleDeleteAnnotation}
          onFileDrop={(file) => handleFile(file, 'A')}
          onFileSelect={(file) => handleFile(file, 'A')}
        />

        <div style={{
          width: 2,
          background: '#a8dadc',
          borderStyle: 'none dashed none dashed',
        }} />

        <CompareView
          ref={refB}
          imageData={imageB}
          target="B"
          annotations={annotations}
          onTitleChange={(title) => handleTitleChange('B', title)}
          onDelete={() => handleDeleteImage('B')}
          onAddAnnotation={handleAddAnnotation}
          onUpdateAnnotation={handleUpdateAnnotation}
          onDeleteAnnotation={handleDeleteAnnotation}
          onFileDrop={(file) => handleFile(file, 'B')}
          onFileSelect={(file) => handleFile(file, 'B')}
        />
      </div>

      <footer style={{
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: '0 24px',
        background: '#ffffff',
        borderTop: '1px solid #e0e0e0',
        fontSize: 13,
        color: '#666',
      }}>
        <span>缩放: {Math.round(zoom * 100)}%</span>
        {imageA && <span>方案A: {imageA.width} × {imageA.height}px</span>}
        {imageB && <span>方案B: {imageB.width} × {imageB.height}px</span>}
        <span style={{ color: '#999' }}>提示: Ctrl + 滚轮缩放，双击图片添加注释</span>
      </footer>
    </div>
  );
};

export default App;
