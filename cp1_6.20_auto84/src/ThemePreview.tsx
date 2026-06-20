import React, { useState, useEffect, useMemo } from 'react';
import {
  ColorPaletteData,
  darkenColor,
  getContrastText,
  withAlpha
} from './colorUtils';

interface ThemePreviewProps {
  palette: ColorPaletteData;
  isMobile: boolean;
}

function rgba(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const NavBar: React.FC<{ palette: ColorPaletteData; isMobile: boolean }> = ({ palette, isMobile }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const primary = palette.primary.hex;
  const textColor = getContrastText(primary);
  const navStyle: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    width: '100%',
    height: 60,
    background: rgba(primary),
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    color: textColor,
    zIndex: 10,
    transition: 'background 0.3s ease',
    borderBottom: `1px solid ${rgba(primary, 0.9)}`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
  };

  const navLinks = ['首页', '组件', '文档', '关于'];

  return (
    <div style={navStyle}>
      <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: 0.4, paddingRight: 24, flexShrink: 0 }}>
        🎨 Palette
      </div>
      {!isMobile ? (
        <div style={{ display: 'flex', gap: 22, flex: 1 }}>
          {navLinks.map((l, i) => (
            <span
              key={l}
              style={{
                fontSize: 13,
                opacity: i === 0 ? 1 : 0.8,
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                fontWeight: i === 0 ? 600 : 400
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLSpanElement).style.opacity = '1'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLSpanElement).style.opacity = i === 0 ? '1' : '0.8'; }}
            >
              {l}
            </span>
          ))}
        </div>
      ) : (
        <div style={{ flex: 1 }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {!isMobile && (
          <div
            style={{
              fontSize: 12,
              padding: '5px 12px',
              border: `1px solid ${textColor}55`,
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
          >
            登录
          </div>
        )}
        {isMobile && (
          <div
            onClick={() => setMenuOpen(v => !v)}
            style={{
              width: 34,
              height: 34,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
              borderRadius: 6
            }}
          >
            {[0, 1, 2].map(i => (
              <div
                key={i}
                style={{
                  width: 20,
                  height: 2,
                  borderRadius: 2,
                  background: textColor,
                  transition: 'all 0.25s ease',
                  transform: menuOpen
                    ? (i === 0 ? 'rotate(45deg) translateY(6px)' : i === 2 ? 'rotate(-45deg) translateY(-6px)' : 'scaleX(0)')
                    : 'none',
                  opacity: menuOpen && i === 1 ? 0 : 1
                }}
              />
            ))}
          </div>
        )}
      </div>
      {isMobile && menuOpen && (
        <div
          style={{
            position: 'absolute',
            top: 60,
            left: 0,
            right: 0,
            background: primary,
            backdropFilter: 'blur(8px)',
            padding: '8px 16px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            animation: 'fadeSlide 0.2s ease-out'
          }}
        >
          {navLinks.map((l, i) => (
            <div
              key={l}
              style={{
                padding: '10px 4px',
                fontSize: 14,
                color: textColor,
                opacity: i === 0 ? 1 : 0.85,
                borderBottom: i < navLinks.length - 1 ? `1px solid ${textColor}22` : 'none',
                cursor: 'pointer'
              }}
            >
              {l}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const PreviewButton: React.FC<{ palette: ColorPaletteData; label?: string }> = ({ palette, label = '主要按钮' }) => {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const primary = palette.primary.hex;
  const textColor = getContrastText(primary);
  const displayedColor = hovered ? darkenColor(primary, 0.12) : primary;
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        display: 'inline-block',
        background: displayedColor,
        color: textColor,
        border: 'none',
        borderRadius: 8,
        padding: '10px 24px',
        fontSize: 14,
        fontWeight: 600,
        letterSpacing: 0.2,
        cursor: 'pointer',
        transform: pressed ? 'scale(0.95) translateY(0)' : hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow: hovered
          ? `0 8px 18px ${rgba(primary, 0.3)}`
          : `0 2px 6px ${rgba(primary, 0.22)}`,
        outline: 'none'
      }}
    >
      {label}
    </button>
  );
};

const TextBox: React.FC<{ palette: ColorPaletteData }> = ({ palette }) => {
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState('Hello World');
  const primary = palette.primary.hex;
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: '#555, marginBottom: 6, fontWeight: 500 }}>
        用户名
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="请输入..."
        style={{
          width: '100%',
          padding: '8px 12px',
          fontSize: 14,
          borderRadius: 6,
          border: `1.5px solid ${focused ? primary : '#ddd'}`,
          outline: 'none',
          transition: 'all 0.2s ease',
          boxShadow: focused ? `0 0 0 3px ${rgba(primary, 0.2)}` : 'none',
          background: '#fff',
          color: '#222'
        }}
      />
    </div>
  );
};

const Tag: React.FC<{ palette: ColorPaletteData }> = ({ palette }) => {
  const bg = palette.functional.success.hex;
  const text = getContrastText(bg);
  return (
    <span
      style={{
        display: 'inline-block',
        background: bg,
        color: text,
        padding: '4px 8px',
        fontSize: 12,
        fontWeight: 500,
        borderRadius: 4,
        letterSpacing: 0.2
      }}
    >
      已发布
    </span>
  );
};

const Card: React.FC<{ palette: ColorPaletteData; isMobile: boolean }> = ({ palette, isMobile }) => {
  const primary = palette.primary.hex;
  const lightGray = palette.neutral.lightGray.hex;
  const darkGray = palette.neutral.darkGray.hex;
  return (
    <div
      style={{
        width: isMobile ? '100%' : 320,
        maxWidth: isMobile ? 'none' : 320,
        padding: 24,
        borderRadius: 12,
        background: lightGray,
        transition: 'background 0.3s ease, box-shadow 0.3s ease',
        boxShadow: `0 4px 12px ${rgba(primary, 0.12)}`,
        border: '1px solid rgba(255,255,255,0.6)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: `linear-gradient(135deg, ${primary}, ${darkenColor(primary, 0.2)})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: getContrastText(primary),
            fontSize: 18,
            fontWeight: 700,
            boxShadow: `0 3px 10px ${rgba(primary, 0.3)}`
          }}
        >
            C
          </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: darkGray }}>配色方案卡片</div>
          <div style={{ fontSize: 12, color: `${darkGray}aa`, marginTop: 2 }}>示例卡片组件预览
        </div>
        <Tag palette={palette} />
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.65, color: darkGray, marginBottom: 18 }}>
        这是一个典型的卡片组件示例，展示了当前配色方案在实际UI上的应用效果。您可以通过左侧调色板实时调整颜色，感受视觉变化。
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <TextBox palette={palette} />
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
        <PreviewButton palette={palette} label="确认操作" />
        <button
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            background: 'transparent',
            color: primary,
            border: `1.5px solid ${primary}`,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            const t = e.currentTarget as HTMLButtonElement;
            t.style.background = rgba(primary, 0.1);
          }}
          onMouseLeave={(e) => {
            const t = e.currentTarget as HTMLButtonElement;
            t.style.background = 'transparent';
          }}
        >
          取消
        </button>
      </div>
    </div>
  );
};

const Alert: React.FC<{ palette: ColorPaletteData }> = ({ palette }) => {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
      {(['success', 'warning', 'error'] as const).map((kind) => {
        const token = palette.functional[kind];
        const label = kind === 'success' ? '操作成功' : kind === 'warning' ? '请注意' : '发生错误';
        const text = getContrastText(token.hex);
        return (
          <div
            key={kind}
            style={{
              flex: 1,
              minWidth: 120,
              padding: '10px 14px',
              borderRadius: 8,
              background: rgba(hex(token.hex),
              color: text,
              fontSize: 13,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'background 0.3s ease',
              border: `1px solid ${rgba(token.hex, 0.2)}`
            }}
          >
            <span style={{ fontSize: 16 }}>
              {kind === 'success' ? '✓' : kind === 'warning' ? '!' : '✕'}
            </span>
            {label}
          </div>
        );
      })}
    </div>
  );
};

function hex(s: string) { return s; }

export const ThemePreview: React.FC<ThemePreviewProps> = React.memo(({ palette, isMobile }) => {
  const bg = palette.neutral.lightGray.hex;
  const previewBg = useMemo(() => lightenOrFallback(bg, 0.55), [bg]);

  return (
    <div
      style={{
        minHeight: '100%',
        background: previewBg,
        transition: 'background 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <NavBar palette={palette} isMobile={isMobile} />
      <div
        style={{
          padding: isMobile ? 16 : 28,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          alignItems: isMobile ? 'stretch' : 'flex-start'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: palette.neutral.darkGray.hex }}>
            主题预览
          </div>
          <div style={{ fontSize: 12, color: `${palette.neutral.darkGray.hex}aa` }}>
            以下组件将实时响应调色板变化
          </div>
        </div>
        <Card palette={palette} isMobile={isMobile} />
        <Alert palette={palette} />
        <div
          style={{
            padding: 16,
            borderRadius: 10,
            background: '#ffffffaa',
            border: '1px solid rgba(0,0,0,0.04)',
            width: isMobile ? '100%' : 320,
            maxWidth: isMobile ? 'none' : 320
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 10 }}>
            按钮类型示例
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  background: i === 0 ? palette.primary.hex : i === 1 ? palette.secondary[0].hex : i === 2 ? palette.secondary[1].hex : '#e6e6e6',
                  color: i === 3 ? '#333' : getContrastText(i === 0 ? palette.primary.hex : i === 1 ? palette.secondary[0].hex : palette.secondary[1].hex),
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                {['主色', '辅色1', '辅色2', '默认'][i]}
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fadeSlide {
          0% { transform: translateY(-4px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
});

function lightenOrFallback(hexColor: string, amount: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);
  if (!m) return '#f5f5f5';
  let r = parseInt(m[1], 16);
  let g = parseInt(m[2], 16);
  let b = parseInt(m[3], 16);
  r = Math.min(255, Math.round(r + (255 - r) * amount));
  g = Math.min(255, Math.round(g + (255 - g) * amount));
  b = Math.min(255, Math.round(b + (255 - b) * amount));
  const out = `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
  return out.toUpperCase();
}

ThemePreview.displayName = 'ThemePreview';

export default ThemePreview;
