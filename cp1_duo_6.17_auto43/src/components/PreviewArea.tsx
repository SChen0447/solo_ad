import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { IParams } from '../types';

interface PreviewAreaProps {
  params: IParams;
  text: string;
}

const PreviewArea: React.FC<PreviewAreaProps> = React.memo(({ params, text }) => {
  const textRef = useRef<HTMLDivElement>(null);
  const [lineStats, setLineStats] = useState({ lines: 0, avgCharsPerLine: 0 });

  const textStyle = useMemo(() => ({
    fontFamily: `'${params.fontFamily}', system-ui, -apple-system, sans-serif`,
    fontSize: `${params.fontSize}px`,
    lineHeight: params.lineHeight,
    letterSpacing: `${params.letterSpacing}em`,
    textAlign: params.textAlign,
    color: '#eaeaea',
    transition: 'all 0.3s ease',
    wordBreak: 'break-word' as const,
    whiteSpace: 'pre-wrap' as const
  }), [params]);

  const containerStyle = useMemo(() => ({
    width: `${params.containerWidth}px`,
    maxWidth: '100%',
    margin: '0 auto',
    transition: 'width 0.3s ease'
  }), [params.containerWidth]);

  const computeLineStats = useCallback(() => {
    const element = textRef.current;
    if (!element) return;

    const textContent = element.textContent || '';
    if (textContent.length === 0) {
      setLineStats({ lines: 0, avgCharsPerLine: 0 });
      return;
    }

    try {
      const range = document.createRange();
      let lineCount = 1;
      let lastTop: number | null = null;

      const allText = textContent.replace(/\n/g, ' ');
      const chars = Array.from(allText);

      for (let i = 0; i < chars.length; i++) {
        try {
          if (element.firstChild) {
            range.setStart(element.firstChild, Math.min(i, element.firstChild.textContent?.length || 0));
            const rect = range.getBoundingClientRect();

            if (lastTop !== null && rect.top > lastTop + 1) {
              lineCount++;
            }
            lastTop = rect.top;
          }
        } catch (e) {
          break;
        }
      }

      const totalChars = chars.filter(c => c !== ' ' && c !== '\n').length;
      const avgCharsPerLine = lineCount > 0 ? Math.round(totalChars / lineCount) : 0;

      setLineStats({ lines: lineCount, avgCharsPerLine });
    } catch (err) {
      const lineHeightPx = params.fontSize * params.lineHeight;
      const approximateLines = Math.ceil(element.scrollHeight / lineHeightPx);
      const totalChars = textContent.replace(/\s/g, '').length;
      const avgCharsPerLine = approximateLines > 0 ? Math.round(totalChars / approximateLines) : 0;
      
      setLineStats({ lines: approximateLines, avgCharsPerLine });
    }
  }, [params.fontSize, params.lineHeight]);

  useEffect(() => {
    const timer = setTimeout(computeLineStats, 50);

    const resizeObserver = new ResizeObserver(() => {
      computeLineStats();
    });

    if (textRef.current) {
      resizeObserver.observe(textRef.current);
    }

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [computeLineStats, params, text]);

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#1a1a2e',
      overflow: 'hidden',
      position: 'relative'
    }} className="preview-area">
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '24px',
        zIndex: 10,
        display: 'flex',
        gap: '16px',
        fontSize: '13px',
        color: '#8892b0'
      }}>
        <div style={{
          backgroundColor: 'rgba(22, 33, 62, 0.9)',
          padding: '6px 12px',
          borderRadius: '6px',
          backdropFilter: 'blur(4px)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
        }}>
          <span style={{ color: '#e94560', fontWeight: 600 }}>{lineStats.lines}</span> 行
        </div>
        <div style={{
          backgroundColor: 'rgba(22, 33, 62, 0.9)',
          padding: '6px 12px',
          borderRadius: '6px',
          backdropFilter: 'blur(4px)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
        }}>
          <span style={{ color: '#e94560', fontWeight: 600 }}>{lineStats.avgCharsPerLine}</span> 字/行
        </div>
      </div>

      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '60px 40px 40px',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <div style={containerStyle}>
          <div
            ref={textRef}
            style={textStyle}
          >
            {text}
          </div>
        </div>
      </div>

      <style>{`
        .preview-area ::-webkit-scrollbar {
          width: 8px;
        }
        .preview-area ::-webkit-scrollbar-track {
          background: #1a1a2e;
        }
        .preview-area ::-webkit-scrollbar-thumb {
          background: #16213e;
          border-radius: 4px;
        }
        .preview-area ::-webkit-scrollbar-thumb:hover {
          background: #e94560;
        }
      `}</style>
    </div>
  );
});

PreviewArea.displayName = 'PreviewArea';

export default PreviewArea;
