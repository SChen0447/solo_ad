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

  const range = document.createRange();
  const textNode = element.firstChild;
  if (!textNode) {
    return { lineCount: 0, avgCharsPerLine: 0 };
  }

  let lineCount = 0;
  let prevBottom: number | null = null;

  for (let i = 0; i < text.length; i++) {
    try {
      range.setStart(textNode, i);
      const rect = range.getBoundingClientRect();

      if (prevBottom === null || rect.bottom > prevBottom + 1) {
        lineCount++;
        prevBottom = rect.bottom;
      }
    } catch {
      break;
    }
  }

  const totalChars = text.replace(/\s/g, '').length;
  const avgCharsPerLine = lineCount > 0 ? totalChars / lineCount : 0;

  return { lineCount, avgCharsPerLine };
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
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  }), [fontFamily, params]);

  useEffect(() => {
    if (!textRef.current) return;

    const updateStats = () => {
      if (textRef.current) {
        const stats = calculateLineStats(textRef.current, text);
        setLineStats(stats);
      }
    };

    const rafId = requestAnimationFrame(updateStats);
    return () => cancelAnimationFrame(rafId);
  }, [params, text]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (textRef.current) {
        const stats = calculateLineStats(textRef.current, text);
        setLineStats(stats);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [params, text]);

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
