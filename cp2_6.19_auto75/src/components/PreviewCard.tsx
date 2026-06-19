import { useEffect, useRef, useState } from 'react';
import { TypographySample } from '@/types';

interface PreviewCardProps {
  sample: TypographySample;
  index: number;
  staggerDelay?: number;
}

export default function PreviewCard({ sample, index, staggerDelay = 0 }: PreviewCardProps) {
  const [bgFlash, setBgFlash] = useState(false);
  const [fontTransition, setFontTransition] = useState<'idle' | 'fadeOut' | 'fadeIn'>('idle');
  const prevFontRef = useRef(sample.fontFamily);
  const prevSizeRef = useRef(sample.fontSize);
  const prevLineHeightRef = useRef(sample.lineHeight);
  const [displayFont, setDisplayFont] = useState(sample.fontFamily);
  const [entering, setEntering] = useState(true);
  const [scaleAnim, setScaleAnim] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setEntering(false), 50 + staggerDelay);
    return () => clearTimeout(timer);
  }, [staggerDelay]);

  useEffect(() => {
    if (prevFontRef.current !== sample.fontFamily) {
      setFontTransition('fadeOut');
      const fadeOutTimer = setTimeout(() => {
        setDisplayFont(sample.fontFamily);
        setFontTransition('fadeIn');
        prevFontRef.current = sample.fontFamily;
        const fadeInTimer = setTimeout(() => setFontTransition('idle'), 150);
        return () => clearTimeout(fadeInTimer);
      }, 150);
      return () => clearTimeout(fadeOutTimer);
    }
  }, [sample.fontFamily]);

  useEffect(() => {
    if (prevSizeRef.current !== sample.fontSize || prevLineHeightRef.current !== sample.lineHeight) {
      setBgFlash(true);
      let scaleTimer: ReturnType<typeof setTimeout> | null = null;
      if (prevSizeRef.current !== sample.fontSize) {
        setScaleAnim(true);
        scaleTimer = setTimeout(() => setScaleAnim(false), 200);
      }
      prevSizeRef.current = sample.fontSize;
      prevLineHeightRef.current = sample.lineHeight;
      const timer = setTimeout(() => {
        setBgFlash(false);
        setScaleAnim(false);
      }, 200);
      return () => {
        clearTimeout(timer);
        if (scaleTimer) clearTimeout(scaleTimer);
      };
    }
  }, [sample.fontSize, sample.lineHeight]);

  const fontOpacity =
    fontTransition === 'fadeOut' ? 0 :
    fontTransition === 'fadeIn' ? 1 :
    1;

  const fontTransitionStyle =
    fontTransition !== 'idle' ? 'opacity 0.15s ease-in-out' : 'opacity 0s';

  return (
    <div
      className={`preview-card ${entering ? 'preview-card-entering' : ''}`}
      style={{ animationDelay: `${staggerDelay}ms` }}
    >
      <div className="preview-card-header">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          Sample {index + 1}
        </span>
        <span className="text-[10px] font-mono text-gray-300">
          {sample.fontFamily}
        </span>
      </div>
      <div
        className={`preview-card-body ${bgFlash ? 'preview-card-flash' : ''}`}
      >
        <p
          className={`${scaleAnim ? 'preview-text-scale' : 'preview-text'}`}
          style={{
            fontFamily: `'${displayFont}', sans-serif`,
            fontSize: `${sample.fontSize}px`,
            lineHeight: sample.lineHeight,
            fontWeight: sample.fontWeight,
            color: sample.color,
            opacity: fontOpacity,
            transition: fontTransitionStyle,
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
          }}
        >
          {sample.text}
        </p>
      </div>
      <div className="preview-card-footer">
        <span className="preview-tag">{sample.fontSize}px</span>
        <span className="preview-tag">LH {sample.lineHeight.toFixed(1)}</span>
        <span className="preview-tag">W{sample.fontWeight}</span>
      </div>
    </div>
  );
}
