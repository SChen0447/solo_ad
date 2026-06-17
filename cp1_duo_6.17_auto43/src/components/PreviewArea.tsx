import React, { useRef, useEffect, useState, useMemo } from 'react';
import { TypographyParams } from '../utils/generateCode';

interface PreviewAreaProps {
  params: TypographyParams;
  text: string;
}

const PreviewArea: React.FC<PreviewAreaProps> = React.memo(({ params, text }) => {
  const textRef = useRef<HTMLDivElement>(null);
  const [lineStats, setLineStats] = useState({ lines: 0, avgCharsPerLine: 0 });

  const textStyle = useMemo(() => ({
    fontFamily: params.fontFamily === 'system-ui' ? 'system-ui, -apple-system, sans-serif' : `'${params.fontFamily}', sans-serif`,
    fontSize: `${params.fontSize}px`,
    lineHeight: params.lineHeight,
    letterSpacing: `${params.letterSpacing}em`,
    textAlign: params.textAlign,
    color: '#eaeaea',
    transition: 'all 0.3s ease',
    wordBreak: 'break-word' as const
  }), [params]);

  const containerStyle = useMemo(() => ({
    width: `${params.containerWidth}px`,
    maxWidth: '100%',
    margin: '0 auto',
    transition: 'width 0.3s ease'
  }), [params.containerWidth]);

  useEffect(() => {
    if (!textRef.current) return;

    const computeStats = () => {
      const element = textRef.current;
      if (!element) return;

      const range = document.createRange();
      const lines: number[] = [];
      let currentLineTop: number | null = null;
      let lineCount = 0;

      const textContent = element.textContent || '';
      if (textContent.length === 0) {
        setLineStats({ lines: 0, avgCharsPerLine: 0 });
        return;
      }

      for (let i = 0; i < textContent.length; i++) {
        try {
          range.setStart(element.firstChild as Node, i);
          const rect = range.getBoundingClientRect();
          
          if (currentLineTop === null || rect.top > currentLineTop + 1) {
            currentLineTop = rect.top;
            lineCount++;
            lines.push(i);
          }
        } catch (e) {
          break;
        }
      }

      if (lineCount === 0) {
        lineCount = 1;
      }

      const totalChars = textContent.replace(/\s/g, '').length;
      const avgCharsPerLine = Math.round(totalChars / lineCount);

      setLineStats({ lines: lineCount, avgCharsPerLine });
    };

    const timer = setTimeout(computeStats, 50);

    const resizeObserver = new ResizeObserver(() => {
      computeStats();
    });

    if (textRef.current) {
      resizeObserver.observe(textRef.current);
    }

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [params, text]);

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#1a1a2e',
      overflow: 'hidden',
      position: 'relative'
    }}>
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
          backdropFilter: 'blur(4px)'
        }}>
          <span style={{ color: '#e94560', fontWeight: 600 }}>{lineStats.lines}</span> 行
        </div>
        <div style={{
          backgroundColor: 'rgba(22, 33, 62, 0.9)',
          padding: '6px 12px',
          borderRadius: '6px',
          backdropFilter: 'blur(4px)'
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
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #1a1a2e;
        }
        ::-webkit-scrollbar-thumb {
          background: #16213e;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #e94560;
        }
      `}</style>
    </div>
  );
});

PreviewArea.displayName = 'PreviewArea';

export default PreviewArea;
