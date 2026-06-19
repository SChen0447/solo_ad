import React, { useState, useEffect, useRef } from 'react';
import type { SampleConfig } from '../types';

interface PreviewCardProps {
  sample: SampleConfig;
  index: number;
  isExiting?: boolean;
  enterDelay?: number;
}

export default React.memo(function PreviewCard({ sample, index, isExiting, enterDelay = 0 }: PreviewCardProps) {
  const [bgFlash, setBgFlash] = useState(false);
  const [fontOpacity, setFontOpacity] = useState(1);
  const [entered, setEntered] = useState(enterDelay === 0);
  const prevFontRef = useRef(sample.fontFamily);
  const prevSizeRef = useRef(sample.fontSize);
  const prevLineHeightRef = useRef(sample.lineHeight);

  useEffect(() => {
    if (enterDelay > 0) {
      const timer = setTimeout(() => setEntered(true), enterDelay);
      return () => clearTimeout(timer);
    }
  }, [enterDelay]);

  useEffect(() => {
    if (prevFontRef.current !== sample.fontFamily) {
      setFontOpacity(0);
      const timer = setTimeout(() => {
        prevFontRef.current = sample.fontFamily;
        setFontOpacity(1);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [sample.fontFamily]);

  useEffect(() => {
    if (prevSizeRef.current !== sample.fontSize || prevLineHeightRef.current !== sample.lineHeight) {
      prevSizeRef.current = sample.fontSize;
      prevLineHeightRef.current = sample.lineHeight;
      setBgFlash(true);
      const timer = setTimeout(() => setBgFlash(false), 200);
      return () => clearTimeout(timer);
    }
  }, [sample.fontSize, sample.lineHeight]);

  const backgroundColor = bgFlash ? '#f8f8f8' : '#ffffff';

  return (
    <div
      style={{
        width: 300,
        minHeight: 120,
        background: backgroundColor,
        border: '0.5px solid #e0e0e0',
        borderRadius: 4,
        padding: 16,
        position: 'relative',
        transition: isExiting
          ? 'transform 0.3s ease-in, opacity 0.3s ease-in, background-color 0.2s ease'
          : entered
            ? 'transform 0.3s ease-out, opacity 0.3s ease-out, background-color 0.2s ease'
            : 'none',
        transform: isExiting ? 'scale(0.8)' : entered ? 'scale(1)' : 'scale(0.8)',
        opacity: isExiting ? 0 : entered ? 1 : 0,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          fontFamily: `"${sample.fontFamily}", sans-serif`,
          fontSize: sample.fontSize,
          lineHeight: sample.lineHeight,
          fontWeight: sample.fontWeight,
          color: sample.color,
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          whiteSpace: 'pre-wrap',
          transition: 'opacity 0.15s ease, font-size 0.2s ease, line-height 0.2s ease',
          opacity: fontOpacity,
        }}
      >
        {sample.text || '请输入文字内容...'}
      </div>
      <div style={{
        display: 'flex',
        gap: 12,
        marginTop: 12,
        paddingTop: 8,
        borderTop: '1px solid #f0f0f0',
        fontSize: 11,
        color: '#999',
        fontFamily: 'Source Code Pro, monospace',
      }}>
        <span>{sample.fontSize}px</span>
        <span>LH {sample.lineHeight.toFixed(1)}</span>
        <span>W{sample.fontWeight}</span>
      </div>
    </div>
  );
});
