import React, { useRef, useState, useMemo, useEffect } from 'react';
import type { TypographyParams } from '../utils/textSample';
import { FONT_OPTIONS, TEXT_SAMPLE } from '../utils/textSample';

interface PreviewAreaProps {
  params: TypographyParams;
  text?: string;
}

interface LineStats {
  lineCount: number;
  avgCharsPerLine: number;
}

const calculateLineStats = (element: HTMLElement, text: string): LineStats => {
  if (!element || !text.trim()) {
    return { lineCount: 0, avgCharsPerLine: 0 };
  }

  try {
    const range = document.createRange();
    range.selectNodeContents(element);
    const rects = range.getClientRects();

    let lineCount = 0;
    let lastBottom = -Infinity;

    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      if (rect.height > 0 && Math.abs(rect.bottom - lastBottom) > 1) {
        lineCount++;
        lastBottom = rect.bottom;
      }
    }

    if (lineCount === 0) {
      const lineHeight = parseFloat(getComputedStyle(element).lineHeight) || 
        parseFloat(getComputedStyle(element).fontSize) * 1.6;
      lineCount = Math.max(1, Math.round(element.offsetHeight / lineHeight));
    }

    const totalChars = text.replace(/\s/g, '').length;
    const avgCharsPerLine = lineCount > 0 ? totalChars / lineCount : 0;

    return { lineCount, avgCharsPerLine };
  } catch {
    const lineHeight = params => {
      const el = element as HTMLElement;
      const style = getComputedStyle(el);
      const lh = parseFloat(style.lineHeight);
      const fs = parseFloat(style.fontSize);
      return isNaN(lh) ? fs * 1.6 : lh;
    };
    const lh = lineHeight(null);
    const lineCount = Math.max(1, Math.round(element.offsetHeight / lh));
    const totalChars = text.replace(/\s/g, '').length;
    return { lineCount, avgCharsPerLine: lineCount > 0 ? totalChars / lineCount : 0 };
  }
};

export const PreviewArea: React.FC<PreviewAreaProps> = React.memo(({ params, text = TEXT_SAMPLE }) => {
  const textRef = useRef<HTMLDivElement>(null);
  const [lineStats, setLineStats] = useState<LineStats>({ lineCount: 0, avgCharsPerLine: 0 });

  const fontOption = useMemo(
    () => FONT_OPTIONS.find(f => f.name === params.fontFamily),
    [params.fontFamily]
  );

  const fontFamily = fontOption?.cssValue || 'sans-serif';

  const previewStyle: React.CSSProperties = useMemo(() => ({
    fontFamily,
    fontSize: `${params.fontSize}px`,
    lineHeight: params.lineHeight,
    letterSpacing: `${params.letterSpacing}em`,
    textAlign: params.textAlign,
    maxWidth: `${params.containerWidth}px`,
    width: `${params.containerWidth}px`,
    transition: 'font-family 0.3s ease, font-size 0.3s ease, line-height 0.3s ease, letter-spacing 0.3s ease, text-align 0.3s ease'
  }), [fontFamily, params]);

  const updateStats = useMemo(() => () => {
    if (textRef.current) {
      const stats = calculateLineStats(textRef.current, text);
      setLineStats(stats);
    }
  }, [text]);

  useEffect(() => {
    let rafId1: number;
    let rafId2: number;
    let timerId: ReturnType<typeof setTimeout>;

    rafId1 = requestAnimationFrame(updateStats);
    rafId2 = requestAnimationFrame(() => {
      requestAnimationFrame(updateStats);
    });
    timerId = setTimeout(updateStats, 400);

    return () => {
      cancelAnimationFrame(rafId1);
      cancelAnimationFrame(rafId2);
      clearTimeout(timerId);
    };
  }, [params, text, updateStats]);

  useEffect(() => {
    const handleResize = () => {
      requestAnimationFrame(updateStats);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateStats]);

  return (
    <div className="preview-area">
      <div className="preview-header">
        <h2 className="preview-title">实时预览</h2>
        <div className="stats-display">
          <span className="stat-item">
            <span className="stat-label">行数</span>
            <span className="stat-value">{lineStats.lineCount}</span>
          </span>
          <span className="stat-divider">|</span>
          <span className="stat-item">
            <span className="stat-label">平均字符/行</span>
            <span className="stat-value">{lineStats.avgCharsPerLine.toFixed(1)}</span>
          </span>
        </div>
      </div>

      <div className="preview-content">
        <div className="preview-container" style={{ maxWidth: `${params.containerWidth}px` }}>
          <div
            ref={textRef}
            className="preview-text"
            style={previewStyle}
          >
            {text}
          </div>
          <div className="cursor-indicator" />
        </div>
      </div>

      <style>{`
        .preview-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          background-color: #1a1a2e;
          overflow: hidden;
        }

        .preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid #0f3460;
          background-color: #16213e;
        }

        .preview-title {
          font-size: 16px;
          font-weight: 600;
          color: #eaeaea;
        }

        .stats-display {
          display: flex;
          align-items: center;
          gap: 12px;
          font-family: 'Source Code Pro', monospace;
        }

        .stat-item {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }

        .stat-label {
          font-size: 11px;
          color: #a0a0a0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-value {
          font-size: 14px;
          font-weight: 600;
          color: #e94560;
          font-variant-numeric: tabular-nums;
        }

        .stat-divider {
          color: #0f3460;
          font-size: 14px;
        }

        .preview-content {
          flex: 1;
          overflow: auto;
          padding: 40px;
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }

        .preview-content::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .preview-content::-webkit-scrollbar-track {
          background: #1a1a2e;
        }

        .preview-content::-webkit-scrollbar-thumb {
          background: #0f3460;
          border-radius: 4px;
        }

        .preview-container {
          position: relative;
          width: 100%;
          margin: 0 auto;
          padding: 32px;
          background-color: #16213e;
          border-radius: 12px;
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.3),
            0 2px 8px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          transition: max-width 0.3s ease;
        }

        .preview-text {
          color: #eaeaea;
          word-break: break-word;
          overflow-wrap: break-word;
          white-space: pre-wrap;
        }

        .cursor-indicator {
          position: absolute;
          bottom: 32px;
          left: 32px;
          width: 8px;
          height: 2px;
          background-color: #e94560;
          animation: cursor-blink 1s step-end infinite, cursor-pulse 2s ease-in-out infinite;
          border-radius: 1px;
        }

        @keyframes cursor-blink {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }

        @keyframes cursor-pulse {
          0%, 100% {
            transform: scaleX(1);
            box-shadow: 0 0 0 rgba(233, 69, 96, 0);
          }
          50% {
            transform: scaleX(2);
            box-shadow: 0 0 8px rgba(233, 69, 96, 0.6);
          }
        }

        @media (max-width: 768px) {
          .preview-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
            padding: 16px;
          }

          .preview-content {
            padding: 16px;
          }

          .preview-container {
            padding: 20px;
          }

          .cursor-indicator {
            bottom: 20px;
            left: 20px;
          }
        }
      `}</style>
    </div>
  );
});

PreviewArea.displayName = 'PreviewArea';

export default PreviewArea;
