import React, { useRef, useState, useCallback } from 'react';
import { useGradientStore, generateCSSGradient } from './state';

export const Preview: React.FC = () => {
  const previewRef = useRef<HTMLDivElement>(null);
  const centerDraggingRef = useRef(false);
  const [copied, setCopied] = useState(false);

  const config = useGradientStore((s) => s.config);
  const setCenter = useGradientStore((s) => s.setCenter);

  const cssCode = `background: ${generateCSSGradient(config)};`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cssCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback
      const textarea = document.createElement('textarea');
      textarea.value = cssCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleCenterDown = (e: React.PointerEvent) => {
    if (config.type !== 'radial') return;
    e.stopPropagation();
    centerDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePreviewMove = useCallback(
    (e: React.PointerEvent) => {
      if (!centerDraggingRef.current || !previewRef.current) return;
      const rect = previewRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const percentX = (x / rect.width) * 100;
      const percentY = (y / rect.height) * 100;
      setCenter(
        Math.max(0, Math.min(100, percentX)),
        Math.max(0, Math.min(100, percentY))
      );
    },
    [setCenter]
  );

  const handlePreviewUp = useCallback((e: React.PointerEvent) => {
    if (centerDraggingRef.current) {
      centerDraggingRef.current = false;
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    }
  }, []);

  const gradientStyle = {
    background: generateCSSGradient(config),
  };

  return (
    <div className="preview-section">
      <div
        ref={previewRef}
        className={`preview-box ${config.type === 'radial' ? 'draggable-center' : ''}`}
        style={gradientStyle}
        onPointerMove={handlePreviewMove}
        onPointerUp={handlePreviewUp}
        onPointerCancel={handlePreviewUp}
      >
        {config.type === 'radial' && (
          <div
            className="center-handle"
            style={{
              left: `${config.centerX}%`,
              top: `${config.centerY}%`,
            }}
            onPointerDown={handleCenterDown}
            title="拖动调整中心点"
          />
        )}
      </div>

      <div className="code-section">
        <div className="code-header">
          <span className="code-label">CSS 代码</span>
          <button
            className={`copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
          >
            {copied ? '已复制!' : '复制代码'}
          </button>
        </div>
        <div className="code-block">
          <code>{cssCode}</code>
        </div>
      </div>
    </div>
  );
};
