import React, { forwardRef } from 'react';
import { FontSettings } from './types';

interface TextPreviewProps {
  settings: FontSettings;
  sampleText: string;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

const TextPreview = forwardRef<HTMLDivElement, TextPreviewProps>(
  ({ settings, sampleText, onScroll }, ref) => {
    const { chineseFont, englishFont, fontSize, lineHeight, fontWeight } = settings;

    const paragraphs = sampleText.split(/\n\n+/);

    return (
      <div
        ref={ref}
        onScroll={onScroll}
        style={{
          width: '100%',
          minHeight: '400px',
          height: '100%',
          padding: '24px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflowY: 'auto',
          color: '#1f2937',
          fontSize: `${fontSize}px`,
          lineHeight: lineHeight,
          fontWeight: fontWeight,
          transition: 'font-size 0.2s ease, line-height 0.2s ease, font-weight 0.2s ease, font-family 0.2s ease',
        }}
      >
        {paragraphs.map((para, idx) => (
          <p
            key={idx}
            style={{
              marginBottom: idx < paragraphs.length - 1 ? `${fontSize * lineHeight}px` : 0,
              textIndent: `${fontSize * 2}px`,
              fontFamily: `${englishFont}, ${chineseFont}, sans-serif`,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {para}
          </p>
        ))}
      </div>
    );
  }
);

TextPreview.displayName = 'TextPreview';

export default TextPreview;
