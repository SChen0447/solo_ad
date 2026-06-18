import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Variant, TemplateType } from './types';
import { getDifferingFields } from './utils/diff';

interface PreviewContentProps {
  variant: Variant;
  template: TemplateType;
  differingFields?: Set<string>;
  highlightSide?: 'left' | 'right';
}

const PreviewContent: React.FC<PreviewContentProps> = React.memo(({ variant, template, differingFields, highlightSide }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [variant.bgUrl]);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(true);
  };

  const shouldHighlight = (field: string) => {
    return differingFields?.has(field) ?? false;
  };

  const bgStyle = useMemo(() => {
    if (imageError || !variant.bgUrl) {
      return {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      };
    }
    return {
      backgroundImage: `url('${variant.bgUrl}')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }, [variant.bgUrl, imageError]);

  const renderHighlightClass = (field: string, side: 'left' | 'right') => {
    if (!shouldHighlight(field)) return '';
    return `diff-highlight diff-${side === 'left' ? 'red' : 'green'}`;
  };

  if (template === TemplateType.LANDING) {
    return (
      <div className="preview-inner">
        {!imageLoaded && <div className="image-spinner" />}
        <div
          className={`landing-container ${imageLoaded ? 'fade-in' : ''}`}
          style={bgStyle}
          onLoad={handleImageLoad}
          onError={handleImageError}
        >
          <div className="landing-overlay" />
          <div className="landing-content">
            <h1
              className={`variant-title ${highlightSide ? renderHighlightClass('title', highlightSide) : ''}`}
              style={{ fontSize: `${variant.fontSize}px` }}
            >
              {variant.title}
            </h1>
            <p
              className={`variant-description ${highlightSide ? renderHighlightClass('description', highlightSide) : ''}`}
              style={{ fontSize: `${variant.fontSize * 0.4}px` }}
            >
              {variant.description}
            </p>
            <button
              className={`variant-btn ${highlightSide ? renderHighlightClass('btnColor', highlightSide) : ''} ${highlightSide ? renderHighlightClass('btnText', highlightSide) : ''}`}
              style={{ backgroundColor: variant.btnColor }}
            >
              {variant.btnText}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (template === TemplateType.REGISTER) {
    return (
      <div className="preview-inner">
        {!imageLoaded && <div className="image-spinner" />}
        <div className={`register-container ${imageLoaded ? 'fade-in' : ''}`}>
          <div
            className={`register-bg ${highlightSide ? renderHighlightClass('bgUrl', highlightSide) : ''}`}
            style={bgStyle}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
          <div className="register-form">
            <div className="register-content">
              <h1
                className={`variant-title ${highlightSide ? renderHighlightClass('title', highlightSide) : ''}`}
                style={{ fontSize: `${variant.fontSize}px`, color: '#1f2937' }}
              >
                {variant.title}
              </h1>
              <p
                className={`variant-description ${highlightSide ? renderHighlightClass('description', highlightSide) : ''}`}
                style={{ fontSize: `${variant.fontSize * 0.38}px` }}
              >
                {variant.description}
              </p>
              <input type="email" className="preview-input" placeholder="请输入邮箱" />
              <input type="password" className="preview-input" placeholder="请输入密码" />
              <button
                className={`variant-btn ${highlightSide ? renderHighlightClass('btnColor', highlightSide) : ''} ${highlightSide ? renderHighlightClass('btnText', highlightSide) : ''}`}
                style={{ backgroundColor: variant.btnColor, width: '100%', marginTop: '16px' }}
              >
                {variant.btnText}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-inner">
      {!imageLoaded && <div className="image-spinner" />}
      <div className={`modal-container ${imageLoaded ? 'fade-in' : ''}`}>
        <div className="modal-card">
          <div
            className={`modal-bg ${highlightSide ? renderHighlightClass('bgUrl', highlightSide) : ''}`}
            style={bgStyle}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
          <div className="modal-content">
            <h1
              className={`variant-title ${highlightSide ? renderHighlightClass('title', highlightSide) : ''}`}
              style={{ fontSize: `${variant.fontSize}px`, color: '#1f2937' }}
            >
              {variant.title}
            </h1>
            <p
              className={`variant-description ${highlightSide ? renderHighlightClass('description', highlightSide) : ''}`}
              style={{ fontSize: `${variant.fontSize * 0.38}px` }}
            >
              {variant.description}
            </p>
            <button
              className={`variant-btn ${highlightSide ? renderHighlightClass('btnColor', highlightSide) : ''} ${highlightSide ? renderHighlightClass('btnText', highlightSide) : ''}`}
              style={{ backgroundColor: variant.btnColor }}
            >
              {variant.btnText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

PreviewContent.displayName = 'PreviewContent';

interface PreviewProps {
  variant: Variant | null;
  template: TemplateType;
  compareMode: boolean;
  compareVariants: [Variant | null, Variant | null];
}

export const Preview: React.FC<PreviewProps> = React.memo(({ variant, template, compareMode, compareVariants }) => {
  const previewRef = useRef<HTMLDivElement>(null);

  const differingFields = useMemo(() => {
    if (compareMode && compareVariants[0] && compareVariants[1]) {
      return getDifferingFields(compareVariants[0], compareVariants[1]);
    }
    return new Set<string>();
  }, [compareMode, compareVariants]);

  if (compareMode && compareVariants[0] && compareVariants[1]) {
    return (
      <div className="preview-wrapper" ref={previewRef}>
        <div className="compare-container">
          <div className="compare-pane">
            <div className="compare-label label-left">
              <span className="compare-letter">A</span>
              <span>{compareVariants[0].name}</span>
            </div>
            <PreviewContent
              variant={compareVariants[0]}
              template={template}
              differingFields={differingFields}
              highlightSide="left"
            />
          </div>
          <div className="compare-divider" />
          <div className="compare-pane">
            <div className="compare-label label-right">
              <span className="compare-letter">B</span>
              <span>{compareVariants[1].name}</span>
            </div>
            <PreviewContent
              variant={compareVariants[1]}
              template={template}
              differingFields={differingFields}
              highlightSide="right"
            />
          </div>
        </div>
      </div>
    );
  }

  if (!variant) {
    return (
      <div className="preview-wrapper">
        <div className="preview-empty">请选择一个变体查看预览</div>
      </div>
    );
  }

  return (
    <div className="preview-wrapper" ref={previewRef}>
      <PreviewContent variant={variant} template={template} />
    </div>
  );
});

Preview.displayName = 'Preview';
