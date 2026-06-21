import React, { forwardRef, useDeferredValue, useMemo } from 'react';
import type { TypographyParams } from './ControlPanel';

interface TypographyPreviewProps {
  text: string;
  params: TypographyParams;
  label?: string;
}

const TypographyPreview = forwardRef<HTMLDivElement, TypographyPreviewProps>(({
  text,
  params,
  label,
}, ref) => {
  const deferredFontSize = useDeferredValue(params.fontSize);
  const deferredLineHeight = useDeferredValue(params.lineHeight);
  const deferredLetterSpacing = useDeferredValue(params.letterSpacing);

  const paragraphs = useMemo(() => {
    const trimmed = text.trim();
    if (!trimmed) return [];
    return trimmed.split(/\n{2,}/);
  }, [text]);

  const contentStyle: React.CSSProperties = {
    fontFamily: params.font,
    fontSize: `${deferredFontSize}px`,
    lineHeight: deferredLineHeight,
    letterSpacing: `${deferredLetterSpacing}em`,
    color: params.color,
    transition: 'font-size 0.1s ease, line-height 0.1s ease, letter-spacing 0.1s ease, color 0.2s ease',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
  };

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: params.backgroundColor,
        transition: 'background-color 0.2s ease',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {label && (
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          padding: '4px 10px',
          backgroundColor: 'rgba(255,255,255,0.9)',
          color: '#495057',
          fontSize: '11px',
          fontWeight: 600,
          borderRadius: '4px',
          border: '1px solid #dee2e6',
          zIndex: 10,
          pointerEvents: 'none',
        }}>
          {label}
        </div>
      )}
      <div
        style={{
          flex: 1,
          padding: '40px 36px',
          overflowY: 'auto',
          scrollBehavior: 'smooth',
        }}
      >
        <div style={contentStyle}>
          {paragraphs.length === 0 ? (
            <p style={{ opacity: 0.4, margin: 0 }}>
              请在左侧输入框中输入文本内容...
            </p>
          ) : (
            paragraphs.map((paragraph, idx) => (
              <p
                key={idx}
                style={{
                  margin: idx > 0 ? `${deferredFontSize * deferredLineHeight}px 0` : 0,
                }}
              >
                {paragraph}
              </p>
            ))
          )}
        </div>
      </div>
      <style>{`
        div::-webkit-scrollbar {
          width: 6px;
        }
        div::-webkit-scrollbar-track {
          background: transparent;
        }
        div::-webkit-scrollbar-thumb {
          background: #ced4da;
          border-radius: 3px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: #adb5bd;
        }
      `}</style>
    </div>
  );
});

TypographyPreview.displayName = 'TypographyPreview';

export default React.memo(TypographyPreview);
