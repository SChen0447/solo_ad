import React, { useState, useRef, useCallback } from 'react';
import { Share2, Link, Copy, Check, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import PuzzleCanvas, { ImageItem, BorderStyle, LayoutMode } from './components/PuzzleCanvas';
import Toolbar from './components/Toolbar';
import { copyLink, copyImage } from './utils/shareHelper';
import { toPng } from 'html-to-image';

const App: React.FC = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [backgroundColor, setBackgroundColor] = useState<string>('#f3f4f6');
  const [borderStyle, setBorderStyle] = useState<BorderStyle>('none');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('compact');

  const [showPreview, setShowPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  const handleGeneratePreview = useCallback(async () => {
    if (images.length === 0) {
      setPreviewError('请先上传至少一张图片');
      return;
    }

    setIsGenerating(true);
    setPreviewError(null);

    try {
      const canvas = canvasRef.current;
      if (!canvas) {
        throw new Error('画布元素未找到');
      }

      const rect = canvas.getBoundingClientRect();
      const scale = Math.max(1, 1200 / rect.width);

      const dataUrl = await toPng(canvas, {
        backgroundColor: backgroundColor,
        pixelRatio: scale,
        cacheBust: true,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });

      setPreviewImage(dataUrl);
      setShowPreview(true);
    } catch (err) {
      setPreviewError('生成预览失败，请重试');
      console.error('Preview generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [images.length, backgroundColor]);

  const handleCopyLink = async () => {
    const success = await copyLink();
    if (success) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    }
  };

  const handleCopyImage = async () => {
    if (!previewImage) return;
    const success = await copyImage(previewImage);
    if (success) {
      setImageCopied(true);
      setTimeout(() => setImageCopied(false), 1500);
    }
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setPreviewImage('');
    setLinkCopied(false);
    setImageCopied(false);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <ImageIcon size={28} color="#3b82f6" />
            <h1>图片拼贴分享板</h1>
          </div>
          <p className="subtitle">拖拽排序 · 自定义样式 · 一键分享</p>
        </div>
      </header>

      <main className="main-content">
        <div className="workspace">
          <div className="canvas-area">
            <PuzzleCanvas
              ref={canvasRef as React.RefObject<HTMLDivElement>}
              images={images}
              backgroundColor={backgroundColor}
              borderStyle={borderStyle}
              layoutMode={layoutMode}
              onImagesChange={setImages}
            />
          </div>

          <aside className="sidebar">
            <Toolbar
              backgroundColor={backgroundColor}
              borderStyle={borderStyle}
              layoutMode={layoutMode}
              onBackgroundColorChange={setBackgroundColor}
              onBorderStyleChange={setBorderStyle}
              onLayoutModeChange={setLayoutMode}
            />
          </aside>
        </div>

        <div className="share-section">
          <div className="share-info">
            <span className="image-count">
              已添加 <strong>{images.length}</strong> 张图片
            </span>
            {images.length > 0 && (
              <span className="canvas-size-hint">
                画布尺寸: 1000 × 自适应
              </span>
            )}
          </div>

          <button
            className="share-btn"
            onClick={handleGeneratePreview}
            disabled={isGenerating || images.length === 0}
          >
            {isGenerating ? (
              <>
                <Loader2 size={18} className="spinning" />
                <span>生成中...</span>
              </>
            ) : (
              <>
                <Share2 size={18} />
                <span>生成拼图并分享</span>
              </>
            )}
          </button>

          {previewError && (
            <div className="preview-error">{previewError}</div>
          )}
        </div>
      </main>

      {showPreview && (
        <div className="modal-overlay" onClick={handleClosePreview}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>拼图预览</h3>
              <button className="close-btn" onClick={handleClosePreview}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="preview-wrapper">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt="拼图预览"
                    className="preview-image"
                  />
                ) : (
                  <div className="preview-placeholder">
                    <Loader2 size={32} className="spinning" />
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                className={`action-btn ${linkCopied ? 'success' : ''}`}
                onClick={handleCopyLink}
              >
                {linkCopied ? (
                  <>
                    <Check size={16} />
                    <span>已复制链接</span>
                  </>
                ) : (
                  <>
                    <Link size={16} />
                    <span>复制链接</span>
                  </>
                )}
              </button>

              <button
                className={`action-btn primary ${imageCopied ? 'success' : ''}`}
                onClick={handleCopyImage}
                disabled={!previewImage}
              >
                {imageCopied ? (
                  <>
                    <Check size={16} />
                    <span>已复制图片</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span>复制图片</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
            'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
          background: #f9fafb;
          color: #1f2937;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .app-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .app-header {
          background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
          color: white;
          padding: 24px 32px;
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.15);
        }

        .header-content {
          max-width: 1400px;
          margin: 0 auto;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 4px;
        }

        .logo h1 {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }

        .subtitle {
          font-size: 13px;
          opacity: 0.9;
          margin-left: 38px;
        }

        .main-content {
          flex: 1;
          max-width: 1400px;
          margin: 0 auto;
          padding: 32px;
          width: 100%;
        }

        .workspace {
          display: flex;
          gap: 24px;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .canvas-area {
          flex: 1;
          min-width: 0;
        }

        .sidebar {
          flex-shrink: 0;
          position: sticky;
          top: 24px;
        }

        .share-section {
          background: white;
          border-radius: 12px;
          padding: 20px 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .share-info {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .image-count {
          font-size: 14px;
          color: #6b7280;
        }

        .image-count strong {
          color: #3b82f6;
          font-size: 16px;
          font-weight: 700;
        }

        .canvas-size-hint {
          font-size: 13px;
          color: #9ca3af;
          padding: 4px 10px;
          background: #f3f4f6;
          border-radius: 6px;
        }

        .share-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 28px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease-out;
          box-shadow: 0 4px 12px rgba(59,