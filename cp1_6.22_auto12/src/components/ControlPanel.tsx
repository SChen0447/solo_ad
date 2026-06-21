import React, { useState, useRef } from 'react';
import { AnimationStyle } from '../utils/animationEngine';

interface ControlPanelProps {
  text: string;
  onTextChange: (v: string) => void;
  animationStyle: AnimationStyle;
  onAnimationStyleChange: (v: AnimationStyle) => void;
  duration: number;
  onDurationChange: (v: number) => void;
  fontSize: number;
  onFontSizeChange: (v: number) => void;
  color: string;
  onColorChange: (v: string) => void;
  waveAmplitude: number;
  onWaveAmplitudeChange: (v: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onExportGIF: () => void;
  onExportMP4: () => void;
  isExportingGIF: boolean;
  isExportingMP4: boolean;
}

const ANIMATION_STYLES: { key: AnimationStyle; label: string; icon: string }[] = [
  { key: 'typewriter', label: '逐字打印', icon: '⌨️' },
  { key: 'rotate', label: '旋转凝聚', icon: '🔄' },
  { key: 'wave', label: '波浪起伏', icon: '🌊' },
  { key: 'particle', label: '粒子消散', icon: '✨' },
  { key: 'neon', label: '霓虹闪烁', icon: '💡' },
];

const PRESET_COLORS = [
  '#ff6b6b', '#ff8e53', '#feca57', '#48dbfb',
  '#00d2ff', '#3a7bd5', '#a29bfe', '#fd79a8',
  '#55efc4', '#00b894', '#e17055', '#6c5ce7',
];

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: '10px',
  padding: '16px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
  border: '1px solid rgba(255,255,255,0.06)',
  transition: 'all 0.2s ease',
};

const labelStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--text-secondary)',
  marginBottom: '8px',
  fontWeight: 500,
  letterSpacing: '0.3px',
};

const gradientBtn = (disabled: boolean): React.CSSProperties => ({
  background: disabled
    ? 'linear-gradient(135deg, #555 0%, #666 100%)'
    : 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
  color: 'white',
  padding: '10px 16px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.6 : 1,
  letterSpacing: '0.3px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  boxShadow: disabled ? 'none' : '0 3px 10px rgba(58,123,213,0.35)',
});

const ControlPanel: React.FC<ControlPanelProps> = ({
  text,
  onTextChange,
  animationStyle,
  onAnimationStyleChange,
  duration,
  onDurationChange,
  fontSize,
  onFontSizeChange,
  color,
  onColorChange,
  waveAmplitude,
  onWaveAmplitudeChange,
  isPlaying,
  onTogglePlay,
  onExportGIF,
  onExportMP4,
  isExportingGIF,
  isExportingMP4,
}) => {
  const [pulsingStyle, setPulsingStyle] = useState<AnimationStyle | null>(null);
  const colorPickerRef = useRef<HTMLInputElement>(null);
  const [selectedColorIdx, setSelectedColorIdx] = useState<number | null>(0);

  const handleStyleClick = (key: AnimationStyle) => {
    onAnimationStyleChange(key);
    setPulsingStyle(key);
    setTimeout(() => setPulsingStyle(null), 300);
  };

  const handleColorClick = (c: string, idx: number) => {
    onColorChange(c);
    setSelectedColorIdx(idx);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v.length <= 20) onTextChange(v);
  };

  const spinner = (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );

  return (
    <div
      className="scrollable"
      style={{
        width: '100%',
        maxWidth: '320px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '4px 2px 16px 4px',
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse-pop { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }`}</style>

      {/* 文本输入卡片 */}
      <div style={cardStyle}>
        <div style={labelStyle}>品牌名称</div>
        <input
          type="text"
          value={text}
          onChange={handleTextChange}
          maxLength={20}
          placeholder="输入你的名字（最多20字）"
          style={{
            width: '100%',
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.04)',
            border: '1.5px solid var(--border-normal)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: '14px',
            transition: 'all 0.3s ease',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-normal)')}
        />
        <div
          style={{
            fontSize: '11px',
            color: '#6a6a8a',
            marginTop: '6px',
            textAlign: 'right',
          }}
        >
          {text.length} / 20
        </div>
      </div>

      {/* 动画风格卡片 */}
      <div style={cardStyle}>
        <div style={labelStyle}>动画风格</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
          }}
        >
          {ANIMATION_STYLES.map((s) => {
            const isActive = animationStyle === s.key;
            const isPulsing = pulsingStyle === s.key;
            return (
              <button
                key={s.key}
                onClick={() => handleStyleClick(s.key)}
                style={{
                  padding: '10px 6px',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(0,210,255,0.2) 0%, rgba(58,123,213,0.2) 100%)'
                    : 'rgba(255,255,255,0.03)',
                  border: isActive
                    ? '1.5px solid var(--border-focus)'
                    : '1.5px solid var(--border-normal)',
                  borderRadius: '8px',
                  color: isActive ? '#00d2ff' : 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: isActive ? 600 : 400,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease',
                  animation: isPulsing ? 'pulse-pop 0.3s ease' : undefined,
                }}
              >
                <span style={{ fontSize: '18px' }}>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 参数调节卡片 */}
      <div style={cardStyle}>
        <div style={{ ...labelStyle, marginBottom: '14px' }}>参数调节</div>

        <div style={{ marginBottom: '14px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>动画时长</span>
            <span
              style={{
                fontSize: '12px',
                color: '#00d2ff',
                fontWeight: 600,
                background: 'rgba(0,210,255,0.1)',
                padding: '2px 8px',
                borderRadius: '10px',
              }}
            >
              {duration.toFixed(1)}s
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            step="0.5"
            value={duration}
            onChange={(e) => onDurationChange(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>字体大小</span>
            <span
              style={{
                fontSize: '12px',
                color: '#00d2ff',
                fontWeight: 600,
                background: 'rgba(0,210,255,0.1)',
                padding: '2px 8px',
                borderRadius: '10px',
              }}
            >
              {fontSize}px
            </span>
          </div>
          <input
            type="range"
            min="24"
            max="72"
            step="2"
            value={fontSize}
            onChange={(e) => onFontSizeChange(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        {animationStyle === 'wave' && (
          <div style={{ marginBottom: '14px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>波浪振幅</span>
              <span
                style={{
                  fontSize: '12px',
                  color: '#00d2ff',
                  fontWeight: 600,
                  background: 'rgba(0,210,255,0.1)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                }}
              >
                {waveAmplitude}px
              </span>
            </div>
            <input
              type="range"
              min="8"
              max="20"
              step="1"
              value={waveAmplitude}
              onChange={(e) => onWaveAmplitudeChange(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        )}

        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            文字颜色
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: '8px',
              marginBottom: '8px',
            }}
          >
            {PRESET_COLORS.map((c, idx) => (
              <button
                key={c}
                onClick={() => handleColorClick(c, idx)}
                aria-label={`颜色 ${c}`}
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: '50%',
                  background: c,
                  border: selectedColorIdx === idx ? '2.5px solid #ffffff' : '2px solid transparent',
                  boxShadow:
                    selectedColorIdx === idx
                      ? `0 0 0 2px ${c}, 0 4px 10px rgba(0,0,0,0.3)`
                      : '0 2px 6px rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  transform: selectedColorIdx === idx ? 'scale(1.2)' : 'scale(1)',
                  padding: 0,
                }}
              />
            ))}
          </div>
          <button
            onClick={() => colorPickerRef.current?.click()}
            style={{
              width: '100%',
              padding: '8px',
              background: 'rgba(255,255,255,0.04)',
              border: '1.5px dashed var(--border-normal)',
              borderRadius: '8px',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '14px',
                height: '14px',
                borderRadius: '4px',
                background: color,
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            />
            自定义颜色
          </button>
          <input
            ref={colorPickerRef}
            type="color"
            value={color}
            onChange={(e) => {
              onColorChange(e.target.value);
              setSelectedColorIdx(null);
            }}
            style={{ display: 'none' }}
          />
        </div>

        <div style={{ marginTop: '14px' }}>
          <button
            onClick={onTogglePlay}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: '8px',
              background: isPlaying
                ? 'linear-gradient(135deg, #e17055 0%, #d63031 100%)'
                : 'linear-gradient(135deg, #00b894 0%, #00cec9 100%)',
              color: 'white',
              fontSize: '13px',
              fontWeight: 600,
              boxShadow: isPlaying
                ? '0 3px 10px rgba(214,48,49,0.35)'
                : '0 3px 10px rgba(0,206,201,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            {isPlaying ? '⏸ 暂停动画' : '▶ 播放动画'}
          </button>
        </div>
      </div>

      {/* 导出卡片 */}
      <div style={cardStyle}>
        <div style={{ ...labelStyle, marginBottom: '12px' }}>导出动画</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={onExportGIF}
            disabled={isExportingGIF || isExportingMP4}
            style={gradientBtn(isExportingGIF || isExportingMP4)}
          >
            {isExportingGIF ? (
              <>
                {spinner}
                <span>生成中...</span>
              </>
            ) : (
              <>
                <span>🎞️</span>
                <span>导出 GIF</span>
              </>
            )}
          </button>
          <button
            onClick={onExportMP4}
            disabled={isExportingGIF || isExportingMP4}
            style={gradientBtn(isExportingGIF || isExportingMP4)}
          >
            {isExportingMP4 ? (
              <>
                {spinner}
                <span>录制中...</span>
              </>
            ) : (
              <>
                <span>📹</span>
                <span>导出 MP4</span>
              </>
            )}
          </button>
        </div>
        <div
          style={{
            marginTop: '10px',
            fontSize: '11px',
            color: '#6a6a8a',
            lineHeight: 1.6,
          }}
        >
          GIF: 5fps / MP4: 30fps，文件不超过5MB
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
