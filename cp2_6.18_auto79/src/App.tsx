import React, { useState, useRef, useCallback } from 'react';
import PuzzleCanvas, { ImageItem } from './components/PuzzleCanvas';
import Toolbar, { BorderStyle, LayoutMode } from './components/Toolbar';
import { validateFile, generateThumbnail, canvasToBase64 } from './utils/imageHelper';
import { copyLink, copyImage } from './utils/shareHelper';

const App: React.FC = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [backgroundColor, setBackgroundColor] = useState<string>('#f3f4f6');
  const [borderStyle, setBorderStyle] = useState<BorderStyle>('none');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('compact');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [copyLinkStatus, setCopyLinkStatus] = useState<'idle' | 'success'>('idle');
  const [copyImageStatus, setCopyImageStatus] = useState<'idle' | 'success'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      
      setUploadError(null);
      const file = files[0];
      
      if (!validateFile(file)) {
        if (!['image/jpeg', 'image/png'].includes(file.type)) {
          setUploadError('仅支持 JPG 和 PNG 格式的图片');
        } else if (file.size > 5 * 1024 * 1024) {
          setUploadError('图片大小不能超过 5MB');
        }
        return;
      }
      
      try {
        const result = await generateThumbnail(file);
        const newImage: ImageItem = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          thumbnail: result.thumbnail,
          original: result.original
        };
        setImages((prev) => [...prev, newImage]);
      } catch (error) {
        setUploadError('图片处理失败，请重试');
        console.error('Image processing error:', error);
      }
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
      handleFileUpload(e.dataTransfer.files);
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  }, []);

  const handleGeneratePreview = useCallback(async () => {
    if (!canvasRef.current || images.length === 0) return;
    
    setIsGenerating(true);
    setPreviewImage(null);
    
    try {
      const base64 = await canvasToBase64(canvasRef.current, 1200);
      setPreviewImage(base64);
    } catch (error) {
      console.error('Failed to generate preview:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [images.length]);

  const handleCopyLink = useCallback(async () => {
    const success = await copyLink();
    if (success) {
      setCopyLinkStatus('success');
      setTimeout(() => setCopyLinkStatus('idle'), 1500);
    }
  }, []);

  const handleCopyImage = useCallback(async () => {
    if (!previewImage) return;
    
    const success = await copyImage(previewImage);
    if (success) {
      setCopyImageStatus('success');
      setTimeout(() => setCopyImageStatus('idle'), 1500);
    }
  }, [previewImage]);

  const handleClosePreview = useCallback(() => {
    setPreviewImage(null);
  }, []);

  const handleImagesReorder = useCallback((newImages: ImageItem[]) => {
    setImages(newImages);
  }, []);

  return (
    <div
      className={`app ${isDraggingOver ? 'dragging-over' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <header className="app-header">
        <h1 className="app-title">图片拼贴与分享板</h1>
        <div className="header-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="file-input"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
          <button
            className="btn btn-primary upload-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="btn-icon">+</span>
            上传图片
          </button>
          {images.length > 0 && (
            <button
              className="btn btn-secondary share-btn"
              onClick={handleGeneratePreview}
              disabled={isGenerating}
            >
              {isGenerating ? '生成中...' : '生成分享'}
            </button>
          )}
        </div>
        {uploadError && (
          <div className="error-message">{uploadError}</div>
        )}
      </header>

      <main className="app-main">
        <PuzzleCanvas
          images={images}
          backgroundColor={backgroundColor}
          borderStyle={borderStyle}
          layoutMode={layoutMode}
          onImagesReorder={handleImagesReorder}
          canvasRef={canvasRef}
        />
        <Toolbar
          backgroundColor={backgroundColor}
          onBackgroundColorChange={setBackgroundColor}
          borderStyle={borderStyle}
          onBorderStyleChange={setBorderStyle}
          layoutMode={layoutMode}
          onLayoutModeChange={setLayoutMode}
        />
      </main>

      {isDraggingOver && (
        <div className="drop-overlay">
          <div className="drop-content">
            <div className="drop-icon">📁</div>
            <p>松开鼠标上传图片</p>
          </div>
        </div>
      )}

      {previewImage && (
        <div className="preview-modal" onClick={handleClosePreview}>
          <div className="preview-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={handleClosePreview}>
              ×
            </button>
            <h3>拼图预览</h3>
            <div className="preview-image-container">
              <img src={previewImage} alt="拼图预览" />
            </div>
            <div className="preview-actions">
              <button
                className={`btn btn-outline ${copyLinkStatus === 'success' ? 'success' : ''}`}
                onClick={handleCopyLink}
              >
                {copyLinkStatus === 'success' ? (
                  <>
                    <span className="check-icon">✓</span>
                    已复制链接
                  </>
                ) : (
                  '复制链接'
                )}
              </button>
              <button
                className={`btn btn-primary ${copyImageStatus === 'success' ? 'success' : ''}`}
                onClick={handleCopyImage}
              >
                {copyImageStatus === 'success' ? (
                  <>
                    <span className="check-icon">✓</span>
                    已复制图片
                  </>
                ) : (
                  '复制图片'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
            'Helvetica Neue', Arial, sans-serif;
          background: #f9fafb;
        }

        .app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .app.dragging-over::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(59, 130, 246, 0.1);
          z-index: 998;
          pointer-events: none;
        }

        .app-header {
          padding: 16px 24px;
          background: #ffffff;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .app-title {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: #1f2937;
        }

        .header-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .file-input {
          display: none;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease-out;
          font-family: inherit;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #3b82f6;
          color: #ffffff;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .btn-primary.success {
          background: #10b981;
        }

        .btn-secondary {
          background: #1f2937;
          color: #ffffff;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #111827;
          transform: translateY(-1px);
        }

        .btn-outline {
          background: #ffffff;
          color: #374151;
          border: 2px solid #e5e7eb;
        }

        .btn-outline:hover {
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .btn-outline.success {
          background: #ecfdf5;
          border-color: #10b981;
          color: #059669;
        }

        .btn-icon {
          font-size: 18px;
          font-weight: 600;
        }

        .check-icon {
          font-size: 14px;
          font-weight: 700;
        }

        .error-message {
          padding: 10px 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #dc2626;
          font-size: 14px;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .app-main {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        .drop-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(59, 130, 246, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
        }

        .drop-content {
          text-align: center;
          color: #ffffff;
        }

        .drop-icon {
          font-size: 64px;
          margin-bottom: 16px;
          animation: bounce 0.5s ease-out infinite alternate;
        }

        .drop-content p {
          font-size: 24px;
          font-weight: 600;
          margin: 0;
        }

        @keyframes bounce {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(-10px);
          }
        }

        .preview-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .preview-content {
          background: #ffffff;
          border-radius: 16px;
          padding: 24px;
          max-width: 90%;
          max-height: 90%;
          display: flex;
          flex-direction: column;
          position: relative;
          animation: scaleIn 0.3s ease-out;
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .preview-content h3 {
          margin: 0 0 16px 0;
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
        }

        .close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 32px;
          height: 32px;
          border: none;
          background: #f3f4f6;
          border-radius: 50%;
          font-size: 24px;
          cursor: pointer;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease-out;
          line-height: 1;
          padding: 0;
        }

        .close-btn:hover {
          background: #e5e7eb;
          color: #374151;
          transform: rotate(90deg);
        }

        .preview-image-container {
          flex: 1;
          overflow: auto;
          margin-bottom: 20px;
          display: flex;
          justify-content: center;
          background: #f9fafb;
          border-radius: 8px;
          padding: 16px;
        }

        .preview-image-container img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .preview-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        @media (max-width: 1024px) {
          .app-header {
            padding: 12px 16px;
          }

          .app-title {
            font-size: 20px;
          }

          .btn {
            padding: 8px 16px;
            font-size: 13px;
          }

          .preview-content {
            padding: 16px;
          }

          .preview-actions {
            flex-direction: column;
          }

          .preview-actions .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
