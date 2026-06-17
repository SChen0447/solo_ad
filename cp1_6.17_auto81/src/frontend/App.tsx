import React, { useState, useRef, useCallback } from 'react';
import CanvasViewer from './components/CanvasViewer';
import AnnotationPanel from './components/AnnotationPanel';
import { uploadDesign, extractComponent, saveAnnotations } from './services/apiService';
import type { Component, BoundingBox, ImageInfo, ExportData } from './types';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

const App: React.FC = () => {
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [components, setComponents] = useState<Component[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showError = useCallback((message: string) => {
    setError(message);
    setTimeout(() => setError(null), 3000);
  }, []);

  const getImageBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const base64 = canvas.toDataURL('image/png').split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('无法获取Canvas上下文'));
        }
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      showError('请上传PNG或JPG格式的图片');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      showError('文件大小不能超过5MB');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await uploadDesign(file);
      const url = URL.createObjectURL(file);

      setImageInfo({
        fileId: response.fileId,
        filename: response.filename,
        width: response.width,
        height: response.height,
        url
      });
      setComponents([]);
    } catch (err) {
      showError('文件上传失败，请重试');
      console.error('Upload error:', err);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleBoxSelect = async (bbox: BoundingBox) => {
    if (!imageInfo) return;

    setIsLoading(true);
    setError(null);

    try {
      const imageBase64 = await getImageBase64(imageInfo.url);
      const response = await extractComponent(imageBase64, bbox);

      setComponents((prev) => [...prev, response.component]);
    } catch (err) {
      showError('组件识别失败，请重试');
      console.error('Extract error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearImage = () => {
    if (imageInfo) {
      URL.revokeObjectURL(imageInfo.url);
    }
    setImageInfo(null);
    setComponents([]);
  };

  const handleUpdateComponent = useCallback((id: string, updates: Partial<Component>) => {
    setComponents((prev) =>
      prev.map((comp) =>
        comp.id === id ? { ...comp, ...updates } : comp
      )
    );
  }, []);

  const handleDeleteComponent = useCallback((id: string) => {
    setComponents((prev) =>
      prev.filter((comp) => comp.id !== id)
    );
  }, []);

  const handleReorder = useCallback((startIndex: number, endIndex: number) => {
    setComponents((prev) => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  }, []);

  const triggerExport = () => {
    const filename = prompt('请输入导出文件名：', 'components');
    if (!filename) return;

    const exportData: ExportData = {
      components: components.map(({ id, type, color, width, height, borderRadius, x, y }) => ({
        id,
        type,
        color,
        width,
        height,
        borderRadius,
        x,
        y
      }))
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename.replace(/\.json$/i, '')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    saveAnnotations(components).catch((err) => {
      console.error('Save annotations error:', err);
    });
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <path d="M2 2l7.586 7.586" />
              <circle cx="11" cy="11" r="2" />
            </svg>
            设计稿组件识别与属性标注
          </h1>
          <div className="header-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg"
              onChange={handleFileUpload}
              className="file-input"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="upload-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              上传设计稿
            </label>
          </div>
        </div>
      </header>

      {error && (
        <div className="error-toast" style={{ animation: 'fadeIn 0.2s ease-out' }}>
          {error}
        </div>
      )}

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <span>处理中...</span>
        </div>
      )}

      <main className="app-main">
        <div className="canvas-section">
          <CanvasViewer
            imageInfo={imageInfo}
            components={components}
            onBoxSelect={handleBoxSelect}
            onClearImage={handleClearImage}
          />
        </div>
        <div className="panel-section">
          <AnnotationPanel
            components={components}
            onUpdateComponent={handleUpdateComponent}
            onDeleteComponent={handleDeleteComponent}
            onExport={triggerExport}
            onReorder={handleReorder}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
