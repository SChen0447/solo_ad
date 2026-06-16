import React, { useState } from 'react';
import { StyleInfo, SizeInfo } from '../services/api';

interface InputPanelProps {
  theme: string;
  onThemeChange: (v: string) => void;
  style: string;
  onStyleChange: (v: string) => void;
  sizes: string[];
  onSizesChange: (v: string[]) => void;
  onGenerate: () => void;
  loading: boolean;
  styles: StyleInfo[];
  sizesList: SizeInfo[];
  progress: number;
  progressComplete: boolean;
}

const sizeIcons: Record<string, string> = {
  instagram: '📷',
  twitter: '🐦',
  linkedin: '💼',
};

const InputPanel: React.FC<InputPanelProps> = ({
  theme,
  onThemeChange,
  style,
  onStyleChange,
  sizes,
  onSizesChange,
  onGenerate,
  loading,
  styles,
  sizesList,
  progress,
  progressComplete,
}) => {
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  const toggleSize = (key: string) => {
    if (sizes.includes(key)) {
      onSizesChange(sizes.filter((s) => s !== key));
    } else {
      onSizesChange([...sizes, key]);
    }
  };

  const canGenerate = theme.trim().length > 0 && sizes.length > 0 && !loading;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        padding: '24px 20px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      <div>
        <div
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#FFFFFF',
            marginBottom: '4px',
            letterSpacing: '0.5px',
          }}
        >
          社交媒体配图生成器
        </div>
        <div style={{ fontSize: '13px', color: '#B0B0C0' }}>
          一键生成多平台统一风格配图
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={labelStyle}>主题文本</label>
        <div style={{ position: 'relative' }}>
          <textarea
            value={theme}
            onChange={(e) => onThemeChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="例如：春季促销 - 全场八折"
            rows={3}
            style={{
              width: '100%',
              resize: 'none',
              background: '#3A3A5C',
              color: '#FFFFFF',
              border: focused ? '1px solid #00B4D8' : '1px solid transparent',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '14px',
              fontFamily: 'inherit',
              outline: 'none',
              transition: 'border 0.2s ease, box-shadow 0.2s ease',
              boxShadow: focused ? '0 0 0 2px rgba(0,180,216,0.15)' : 'none',
              lineHeight: 1.5,
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: '8px',
              height: '2px',
              background: '#00B4D8',
              width: focused ? 'calc(100% - 16px)' : '0%',
              borderRadius: '2px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <div style={{ fontSize: '11px', color: '#6A6A8A', textAlign: 'right' }}>
          使用 &quot; - &quot; 分隔主标题和副标题
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label style={labelStyle}>配图风格</label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
          }}
        >
          {styles.map((s) => {
            const selected = s.key === style;
            const isGradient = s.key === 'gradient_neon';
            return (
              <div
                key={s.key}
                onClick={() => onStyleChange(s.key)}
                style={{
                  cursor: 'pointer',
                  borderRadius: '10px',
                  padding: '10px',
                  border: selected
                    ? '1.5px solid #00B4D8'
                    : '1.5px solid #3A3A5C',
                  background: '#2D2D44',
                  transition: 'all 0.2s ease',
                  boxShadow: selected
                    ? '0 0 12px rgba(0,180,216,0.3)'
                    : 'none',
                  animation: selected ? 'rippleExpand 0.6s ease-out' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!selected) {
                    (e.currentTarget as HTMLDivElement).style.borderColor =
                      '#4A4A6A';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!selected) {
                    (e.currentTarget as HTMLDivElement).style.borderColor =
                      '#3A3A5C';
                  }
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '44px',
                    borderRadius: '6px',
                    background: isGradient
                      ? `linear-gradient(135deg, ${s.preview.bg}, #764BA2)`
                      : s.preview.bg,
                    marginBottom: '8px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '60%',
                      height: '3px',
                      background: s.preview.accent,
                      borderRadius: '2px',
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: selected ? '#FFFFFF' : '#B0B0C0',
                    textAlign: 'center',
                  }}
                >
                  {s.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label style={labelStyle}>尺寸选择（多选）</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sizesList.map((sz) => {
            const checked = sizes.includes(sz.key);
            return (
              <label
                key={sz.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  background: '#2D2D44',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: checked ? '1px solid rgba(0,180,216,0.3)' : '1px solid transparent',
                  transition: 'all 0.2s ease',
                  animation: checked ? 'pulse 0.6s ease-out' : 'none',
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '5px',
                    border: checked ? 'none' : '1.5px solid #4A4A6A',
                    background: checked ? '#00B4D8' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                >
                  {checked && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ animation: 'checkIn 0.3s ease-out' }}
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <div style={{ fontSize: '18px' }}>{sizeIcons[sz.key] || '🖼️'}</div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#FFFFFF',
                    }}
                  >
                    {sz.name}
                  </div>
                  <div
                    style={{ fontSize: '11px', color: '#B0B0C0', marginTop: '2px' }}
                  >
                    {sz.sub}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
        <button
          onClick={onGenerate}
          disabled={!canGenerate}
          onMouseDown={() => canGenerate && setPressed(true)}
          onMouseUp={() => setPressed(false)}
          onMouseLeave={() => setPressed(false)}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '10px',
            border: 'none',
            background: canGenerate
              ? 'linear-gradient(135deg, #00B4D8, #0077B6)'
              : '#3A3A5C',
            color: '#FFFFFF',
            fontSize: '15px',
            fontWeight: 700,
            cursor: canGenerate ? 'pointer' : 'not-allowed',
            opacity: canGenerate ? 1 : 0.6,
            transform: pressed ? 'scale(0.95)' : 'scale(1)',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            letterSpacing: '0.5px',
          }}
        >
          {loading ? (
            <>
              <ProgressCircle progress={progress} complete={progressComplete} />
              <span>{progressComplete ? '生成完成' : '生成中...'}</span>
            </>
          ) : (
            <span>✨ 生成配图</span>
          )}
        </button>
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: '#FFFFFF',
  letterSpacing: '0.3px',
};

const ProgressCircle: React.FC<{ progress: number; complete: boolean }> = ({
  progress,
  complete,
}) => {
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  const strokeColor = complete
    ? '#4ADE80'
    : `rgb(${255 - Math.round(progress * 1.07)}, ${107 + Math.round(progress * 0.73)}, ${107 + Math.round(progress * 1.3)})`;

  return (
    <svg width="22" height="22" viewBox="0 0 24 24">
      {complete ? (
        <svg
          x="2"
          y="2"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#4ADE80"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ animation: 'checkIn 0.5s ease-out' }}
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <>
          <circle
            cx="12"
            cy="12"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="3"
          />
          <circle
            cx="12"
            cy="12"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 12 12)"
            style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.2s' }}
          />
        </>
      )}
    </svg>
  );
};

export default InputPanel;
