import React, { useState, useEffect, useRef, useCallback } from 'react';
import CodePreview, { CodePreviewHandle } from '../preview/CodePreview';
import { computeDiff } from '../../services/api';
import type { DiffResult } from '../../types';
import './DiffVisualizer.css';

interface DiffVisualizerProps {
  originalCode: string;
  modifiedCode: string;
}

const DiffVisualizer: React.FC<DiffVisualizerProps> = ({ originalCode, modifiedCode }) => {
  const originalRef = useRef<CodePreviewHandle>(null);
  const modifiedRef = useRef<CodePreviewHandle>(null);
  const [originalLoaded, setOriginalLoaded] = useState(false);
  const [modifiedLoaded, setModifiedLoaded] = useState(false);
  const [isComputing, setIsComputing] = useState(false);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'diff' | 'side-by-side' | 'overlay'>('diff');
  const [overlayOpacity, setOverlayOpacity] = useState(50);

  const computeDiffImages = useCallback(async () => {
    if (!originalLoaded || !modifiedLoaded) return;
    if (!originalRef.current || !modifiedRef.current) return;

    setIsComputing(true);
    setError(null);

    try {
      const originalScreenshot = await originalRef.current.getScreenshot();
      const modifiedScreenshot = await modifiedRef.current.getScreenshot();

      if (!originalScreenshot || !modifiedScreenshot) {
        setError('无法获取预览截图');
        setIsComputing(false);
        return;
      }

      const result = await computeDiff(originalScreenshot, modifiedScreenshot);
      setDiffResult(result);
    } catch (err) {
      console.error('Diff computation failed:', err);
      setError('差异计算失败，请稍后重试');
    } finally {
      setIsComputing(false);
    }
  }, [originalLoaded, modifiedLoaded]);

  useEffect(() => {
    if (originalLoaded && modifiedLoaded) {
      const timer = setTimeout(() => {
        computeDiffImages();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [originalCode, modifiedCode, originalLoaded, modifiedLoaded, computeDiffImages]);

  const handleDownload = () => {
    if (!diffResult) return;

    const link = document.createElement('a');
    link.download = `diff-${Date.now()}.png`;
    link.href = diffResult.diffImage;
    link.click();
  };

  return (
    <div className="diff-visualizer">
      <div className="diff-toolbar">
        <div className="view-modes">
          <button
            className={`mode-btn ${viewMode === 'diff' ? 'active' : ''}`}
            onClick={() => setViewMode('diff')}
          >
            差异视图
          </button>
          <button
            className={`mode-btn ${viewMode === 'side-by-side' ? 'active' : ''}`}
            onClick={() => setViewMode('side-by-side')}
          >
            并排对比
          </button>
          <button
            className={`mode-btn ${viewMode === 'overlay' ? 'active' : ''}`}
            onClick={() => setViewMode('overlay')}
          >
            叠加对比
          </button>
        </div>
        {diffResult && (
          <div className="diff-actions">
            <span className="diff-stats">
              差异像素: {diffResult.diffPixels.toLocaleString()}
            </span>
            <button className="download-btn" onClick={handleDownload}>
              导出PNG
            </button>
          </div>
        )}
      </div>

      {isComputing && (
        <div className="diff-loading">
          <div className="loading-spinner"></div>
          <span>正在计算视觉差异...</span>
        </div>
      )}

      {error && (
        <div className="diff-error">
          <span className="error-icon">!</span>
          <span>{error}</span>
        </div>
      )}

      {viewMode === 'diff' && diffResult && (
        <div className="diff-view">
          <img
            src={diffResult.diffImage}
            alt="Diff result"
            className="diff-image"
          />
        </div>
      )}

      {viewMode === 'side-by-side' && (
        <div className="side-by-side-view">
          <div className="preview-panel">
            <div className="panel-label">原始版本</div>
            <CodePreview
              ref={originalRef}
              code={originalCode}
              onLoad={() => setOriginalLoaded(true)}
            />
          </div>
          <div className="preview-panel">
            <div className="panel-label">修改版本</div>
            <CodePreview
              ref={modifiedRef}
              code={modifiedCode}
              onLoad={() => setModifiedLoaded(true)}
            />
          </div>
        </div>
      )}

      {viewMode === 'overlay' && diffResult && (
        <div className="overlay-view">
          <div className="overlay-container">
            <img
              src={diffResult.diffImage}
              alt="Diff overlay"
              className="overlay-image"
              style={{ opacity: overlayOpacity / 100 }}
            />
          </div>
          <div className="opacity-slider">
            <label>不透明度: {overlayOpacity}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={overlayOpacity}
              onChange={(e) => setOverlayOpacity(Number(e.target.value))}
            />
          </div>
        </div>
      )}

      <div style={{ display: 'none' }}>
        <CodePreview
          ref={originalRef}
          code={originalCode}
          onLoad={() => setOriginalLoaded(true)}
        />
        <CodePreview
          ref={modifiedRef}
          code={modifiedCode}
          onLoad={() => setModifiedLoaded(true)}
        />
      </div>
    </div>
  );
};

export default DiffVisualizer;
