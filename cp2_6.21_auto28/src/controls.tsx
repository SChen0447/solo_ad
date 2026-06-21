import React, { useRef, ChangeEvent, CSSProperties } from 'react';
import { FontInfo } from './fontLoader';
import { TextAlign } from './typesetter';

export interface ControlValues {
  fontSize: number;
  letterSpacing: number;
  lineHeightFactor: number;
  textAlign: TextAlign;
  text: string;
  showGuides: boolean;
  compareMode: boolean;
}

export interface ControlsProps {
  fontInfo: FontInfo | null;
  loadError: string | null;
  isLoading: boolean;
  values: ControlValues;
  onUploadFont: (file: File) => void;
  onChange: (key: keyof ControlValues, value: any) => void;
  onGenerateCard: () => void;
  mobileExpanded: boolean;
  onToggleMobileExpand: () => void;
}

const sliderTrackStyle: CSSProperties = {
  height: 4,
  borderRadius: 2,
  background: '#E0E0E0',
  position: 'relative' as const,
  flex: 1,
};

const sliderThumbStyle: CSSProperties = {
  position: 'absolute' as const,
  top: '50%',
  width: 16,
  height: 16,
  borderRadius: '50%',
  background: '#FFFFFF',
  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  transform: 'translate(-50%, -50%)',
  pointerEvents: 'none' as const,
  border: 'none',
  cursor: 'pointer',
};

const sliderFillStyle: CSSProperties = {
  position: 'absolute' as const,
  left: 0,
  top: 0,
  height: '100%',
  borderRadius: 2,
  background: '#1976D2',
  pointerEvents: 'none' as const,
};

const Slider: React.FC<{
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  label: string;
  unit?: string;
}> = ({ min, max, step, value, onChange, label, unit = '' }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#333', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 14, color: '#333', fontVariantNumeric: 'tabular-nums' }}>
          {value.toFixed(step < 1 ? 1 : 0)}{unit}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ ...sliderTrackStyle }}>
          <div style={{ ...sliderFillStyle, width: `${percent}%` }} />
          <div style={{ ...sliderThumbStyle, left: `${percent}%` }} />
          <input
            ref={inputRef}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
              margin: 0,
              padding: 0,
            }}
          />
        </div>
      </div>
    </div>
  );
};

const Controls: React.FC<ControlsProps> = ({
  fontInfo,
  loadError,
  isLoading,
  values,
  onUploadFont,
  onChange,
  onGenerateCard,
  mobileExpanded,
  onToggleMobileExpand,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFileClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadFont(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange('text', e.target.value);
  };

  const renderFontCard = () => {
    if (isLoading) {
      return (
        <div style={fontCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
            <div style={spinnerStyle} />
          </div>
        </div>
      );
    }

    if (loadError) {
      return (
        <div style={fontCardStyle}>
          <div style={{ color: '#D32F2F', fontSize: 12 }}>{loadError}</div>
        </div>
      );
    }

    if (!fontInfo) {
      return (
        <div style={fontCardStyle}>
          <div style={{ fontSize: 12, color: '#666' }}>未上传字体，预览区将使用系统默认字体</div>
        </div>
      );
    }

    return (
      <div style={fontCardStyle}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#222', marginBottom: 6 }}>
          {fontInfo.fullName}
        </div>
        <div style={{ fontSize: 12, color: '#666', lineHeight: 1.6 }}>
          <div>字族: {fontInfo.familyName}</div>
          <div>样式: {fontInfo.subfamilyName}</div>
          <div>字形数: {fontInfo.glyphCount.toLocaleString()}</div>
          <div>字符范围: {fontInfo.charRanges.join('、') || '未知'}</div>
        </div>
      </div>
    );
  };

  const uploadButtonClick = (e: React.MouseEvent) => {
    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)';
    setTimeout(() => {
      (e.currentTarget as HTMLButtonElement).style.transform = '';
    }, 100);
    handleFileClick();
  };

  const generateButtonClick = (e: React.MouseEvent) => {
    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)';
    setTimeout(() => {
      (e.currentTarget as HTMLButtonElement).style.transform = '';
    }, 100);
    onGenerateCard();
  };

  return (
    <div style={panelStyle}>
      {mobileExpanded === false ? null : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16, overflowY: 'auto', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#222' }}>字体排印实验室</div>
          </div>

          {renderFontCard()}

          <button
            onClick={uploadButtonClick}
            style={uploadButtonStyle}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>上传字体文件</span>
            <span style={{ fontSize: 11, color: '#999' }}>.woff2/.ttf 5MB</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".woff2,.woff,.ttf,.otf"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 13, color: '#333', fontWeight: 500 }}>文本内容</div>
            <textarea
              ref={textareaRef}
              value={values.text}
              onChange={handleTextChange}
              placeholder="在这里输入要预览的文本..."
              style={textareaStyle}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#1976D2')}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#333')}
            />
          </div>

          <div style={dividerStyle} />

          <Slider
            label="字体大小"
            min={12}
            max={200}
            step={1}
            value={values.fontSize}
            onChange={(v) => onChange('fontSize', v)}
            unit="px"
          />

          <Slider
            label="字距"
            min={-5}
            max={20}
            step={0.5}
            value={values.letterSpacing}
            onChange={(v) => onChange('letterSpacing', v)}
            unit="px"
          />

          <Slider
            label="行距"
            min={0.8}
            max={3.0}
            step={0.1}
            value={values.lineHeightFactor}
            onChange={(v) => onChange('lineHeightFactor', v)}
            unit="x"
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 13, color: '#333', fontWeight: 500 }}>对齐方式</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['left', 'center', 'right', 'justify'] as TextAlign[]).map((align) => (
                <button
                  key={align}
                  onClick={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)';
                    setTimeout(() => {
                      (e.currentTarget as HTMLButtonElement).style.transform = '';
                    }, 100);
                    onChange('textAlign', align);
                  }}
                  style={{
                    ...alignButtonStyle,
                    background: values.textAlign === align ? '#1976D2' : '#F5F5F5',
                    color: values.textAlign === align ? '#FFFFFF' : '#333',
                  }}
                  title={alignLabel(align)}
                >
                  {alignIcon(align)}
                </button>
              ))}
            </div>
          </div>

          <div style={dividerStyle} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#333', fontWeight: 500 }}>显示参考线</span>
            <button
              onClick={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)';
                setTimeout(() => {
                  (e.currentTarget as HTMLButtonElement).style.transform = '';
                }, 100);
                onChange('showGuides', !values.showGuides);
              }}
              style={{
                ...guideToggleStyle,
                background: values.showGuides ? '#1976D2' : '#9E9E9E',
              }}
              title="显示/隐藏参考线和网格"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#333', fontWeight: 500 }}>对比模式</span>
            <div style={compareSwitchTrack}>
              <div style={{
                ...compareSwitchThumb,
                left: values.compareMode ? 18 : 1,
              }} />
              <input
                type="checkbox"
                checked={values.compareMode}
                onChange={(e) => onChange('compareMode', e.target.checked)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  margin: 0,
                  cursor: 'pointer',
                }}
              />
            </div>
          </div>

          <div style={{ flex: 1 }} />

          <button
            onClick={generateButtonClick}
            style={generateCardStyle}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span>生成测试卡片</span>
          </button>
        </div>
      )}

      {mobileExpanded === false && (
        <button
          onClick={onToggleMobileExpand}
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            background: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 700,
            color: '#1976D2',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
          展开控制面板
        </button>
      )}
    </div>
  );
};

const alignLabel = (align: TextAlign): string => {
  switch (align) {
    case 'left': return '左对齐';
    case 'center': return '居中';
    case 'right': return '右对齐';
    case 'justify': return '两端对齐';
  }
};

const alignIcon = (align: TextAlign) => {
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 };
  switch (align) {
    case 'left':
      return (
        <svg {...common}>
          <line x1="17" y1="10" x2="3" y2="10" />
          <line x1="21" y1="6" x2="3" y2="6" />
          <line x1="21" y1="14" x2="3" y2="14" />
          <line x1="17" y1="18" x2="3" y2="18" />
        </svg>
      );
    case 'center':
      return (
        <svg {...common}>
          <line x1="18" y1="10" x2="6" y2="10" />
          <line x1="21" y1="6" x2="3" y2="6" />
          <line x1="21" y1="14" x2="3" y2="14" />
          <line x1="18" y1="18" x2="6" y2="18" />
        </svg>
      );
    case 'right':
      return (
        <svg {...common}>
          <line x1="21" y1="10" x2="7" y2="10" />
          <line x1="21" y1="6" x2="3" y2="6" />
          <line x1="21" y1="14" x2="3" y2="14" />
          <line x1="21" y1="18" x2="7" y2="18" />
        </svg>
      );
    case 'justify':
      return (
        <svg {...common}>
          <line x1="21" y1="10" x2="3" y2="10" />
          <line x1="21" y1="6" x2="3" y2="6" />
          <line x1="21" y1="14" x2="3" y2="14" />
          <line x1="21" y1="18" x2="3" y2="18" />
        </svg>
      );
  }
};

const panelStyle: CSSProperties = {
  width: 320,
  background: '#FFFFFF',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  borderTopLeftRadius: 8,
  borderTopRightRadius: 8,
  borderBottomLeftRadius: 0,
  borderBottomRightRadius: 0,
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  overflow: 'hidden',
  height: '100%',
};

const fontCardStyle: CSSProperties = {
  width: '100%',
  padding: 12,
  borderRadius: 8,
  background: '#F5F5F5',
  boxSizing: 'border-box',
};

const spinnerStyle: CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: '50%',
  border: '3px solid #E0E0E0',
  borderTopColor: '#1976D2',
  animation: 'spin 1s linear infinite',
};

const textareaStyle: CSSProperties = {
  width: '100%',
  height: 120,
  borderRadius: 6,
  border: '1px solid #CCC',
  padding: 10,
  fontSize: 13,
  fontFamily: 'inherit',
  resize: 'vertical',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s ease',
  lineHeight: 1.5,
};

const dividerStyle: CSSProperties = {
  height: 1,
  background: '#EEEEEE',
  margin: '4px 0',
};

const uploadButtonStyle: CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '10px 12px',
  borderRadius: 8,
  border: '2px dashed #CCCCCC',
  background: '#FAFAFA',
  color: '#666',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  boxSizing: 'border-box',
};

const alignButtonStyle: CSSProperties = {
  flex: 1,
  padding: '8px 0',
  borderRadius: 6,
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s ease',
};

const guideToggleStyle: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 4,
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.2s ease, transform 0.1s ease',
};

const compareSwitchTrack: CSSProperties = {
  width: 40,
  height: 22,
  borderRadius: 11,
  background: '#CCC',
  position: 'relative' as const,
  transition: 'background 0.2s ease',
  cursor: 'pointer',
};

const compareSwitchThumb: CSSProperties = {
  position: 'absolute' as const,
  top: 2,
  width: 18,
  height: 18,
  borderRadius: 9,
  background: 'white',
  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  transition: 'left 0.2s ease',
  pointerEvents: 'none' as const,
};

const generateCardStyle: CSSProperties = {
  width: '100%',
  height: 42,
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  color: 'white',
  fontSize: 14,
  fontWeight: 600,
  background: 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)',
  transition: 'all 0.15s ease',
  boxSizing: 'border-box',
};

export default Controls;
