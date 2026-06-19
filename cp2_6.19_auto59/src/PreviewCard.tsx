import { useState, useEffect, useRef } from 'react';
import { TypographyConfig } from './types';
import './PreviewCard.css';

interface PreviewCardProps {
  config: TypographyConfig;
  onDelete?: () => void;
  showDelete?: boolean;
  isExiting?: boolean;
  animationDelay?: number;
}

function PreviewCard({
  config,
  onDelete,
  showDelete = true,
  isExiting = false,
  animationDelay = 0,
}: PreviewCardProps) {
  const [isFlashing, setIsFlashing] = useState(false);
  const [isFadingFont, setIsFadingFont] = useState(false);
  const [displayConfig, setDisplayConfig] = useState(config);
  const prevFontSizeRef = useRef(config.fontSize);
  const prevLineHeightRef = useRef(config.lineHeight);
  const prevFontFamilyRef = useRef(config.fontFamily);
  const [isEntering, setIsEntering] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsEntering(false), animationDelay + 300);
    return () => clearTimeout(timer);
  }, [animationDelay]);

  useEffect(() => {
    const fontSizeChanged = prevFontSizeRef.current !== config.fontSize;
    const lineHeightChanged = prevLineHeightRef.current !== config.lineHeight;
    const fontFamilyChanged = prevFontFamilyRef.current !== config.fontFamily;

    if (fontSizeChanged || lineHeightChanged) {
      setIsFlashing(true);
      const timer = setTimeout(() => setIsFlashing(false), 200);
      prevFontSizeRef.current = config.fontSize;
      prevLineHeightRef.current = config.lineHeight;
      return () => clearTimeout(timer);
    }

    if (fontFamilyChanged) {
      setIsFadingFont(true);
      const timer = setTimeout(() => {
        setDisplayConfig(config);
        setIsFadingFont(false);
      }, 150);
      prevFontFamilyRef.current = config.fontFamily;
      return () => clearTimeout(timer);
    }

    setDisplayConfig(config);
  }, [config]);

  const cardClasses = [
    'preview-card',
    isExiting ? 'preview-card--exiting' : '',
    isEntering ? 'preview-card--entering' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const contentClasses = [
    'preview-card__content',
    isFlashing ? 'preview-card__content--flash' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const textClasses = [
    'preview-card__text',
    isFadingFont ? 'preview-card__text--fading' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const textStyle = {
    fontFamily: displayConfig.fontFamily,
    fontSize: `${displayConfig.fontSize}px`,
    lineHeight: displayConfig.lineHeight,
    fontWeight: displayConfig.fontWeight,
    color: displayConfig.color,
  };

  const cardStyle = isEntering ? { animationDelay: `${animationDelay}ms` } : undefined;

  return (
    <div className={cardClasses} style={cardStyle}>
      {showDelete && onDelete && (
        <button className="preview-card__delete" onClick={onDelete} title="删除样本">
          ×
        </button>
      )}
      <div className={contentClasses}>
        <div className={textClasses} style={textStyle}>
          {displayConfig.text}
        </div>
      </div>
      <div className="preview-card__footer">
        <span className="preview-card__footer-item">
          字号<strong>{config.fontSize}px</strong>
        </span>
        <span className="preview-card__footer-item">
          行高<strong>{config.lineHeight.toFixed(2)}</strong>
        </span>
      </div>
    </div>
  );
}

export default PreviewCard;
