import React, { memo, useMemo, useCallback } from 'react';
import { ColorItem } from './types';

interface ThemePreviewProps {
  colors: ColorItem[];
}

function getColorValue(colors: ColorItem[], name: string, fallback: string): string {
  const found = colors.find(c => c.name === name);
  return found ? found.value : fallback;
}

const ThemePreview: React.FC<ThemePreviewProps> = ({ colors }) => {
  const primary = getColorValue(colors, 'primary', '#1976D2');
  const secondary = getColorValue(colors, 'secondary', '#9C27B0');
  const background = getColorValue(colors, 'background', '#F5F5F5');
  const text = getColorValue(colors, 'text', '#333333');
  const buttonHover = getColorValue(colors, 'buttonHover', '#1565C0');
  const surface = getColorValue(colors, 'surface', '#FFFFFF');
  const border = getColorValue(colors, 'border', '#DDDDDD');
  const navBg = getColorValue(colors, 'navBg', '#333333');
  const alertBg = getColorValue(colors, 'alertBg', '#FFF3CD');

  const cssVars = useMemo(() => ({
    '--color-primary': primary,
    '--color-secondary': secondary,
    '--color-background': background,
    '--color-text': text,
    '--color-button-hover': buttonHover,
    '--color-surface': surface,
    '--color-border': border,
    '--color-nav-bg': navBg,
    '--color-alert-bg': alertBg,
  }), [primary, secondary, background, text, buttonHover, surface, border, navBg, alertBg]);

  const handlePrimaryBtnEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = buttonHover;
  }, [buttonHover]);

  const handlePrimaryBtnLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = '';
  }, []);

  const handleOutlineBtnEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = `${primary}15`;
  }, [primary]);

  const handleOutlineBtnLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = '';
  }, []);

  const handleInputFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = primary;
    e.currentTarget.style.boxShadow = `0 0 0 3px ${primary}20`;
  }, [primary]);

  const handleInputBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = '';
    e.currentTarget.style.boxShadow = '';
  }, []);

  const primaryButtonStyle: React.CSSProperties = {
    padding: '10px 20px',
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.4s ease, transform 0.2s ease',
  };

  const outlineButtonStyle: React.CSSProperties = {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    color: 'var(--color-primary)',
    border: '1px solid var(--color-primary)',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.4s ease',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    fontSize: '14px',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    boxSizing: 'border-box',
    backgroundColor: '#fff',
    outline: 'none',
    transition: 'border-color 0.4s ease, box-shadow 0.4s ease',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-surface)',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
    transition: 'background-color 0.4s ease, box-shadow 0.4s ease',
  };

  return (
    <div
      style={{
        ...cssVars,
        backgroundColor: 'var(--color-background)',
        padding: '24px',
        overflowY: 'auto',
        height: '100%',
        boxSizing: 'border-box',
        transition: 'background-color 0.4s ease',
      } as React.CSSProperties}
    >
      <div style={{ marginBottom: '24px' }}>
        <h2
          style={{
            margin: '0 0 6px 0',
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--color-text)',
            transition: 'color 0.4s ease',
          }}
        >
          实时预览
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            color: 'var(--color-text)',
            opacity: 0.6,
            transition: 'color 0.4s ease',
          }}
        >
          左侧调整颜色，此处即时预览主题效果 · 所有过渡动画时长 0.4s
        </p>
      </div>

      <nav
        style={{
          backgroundColor: 'var(--color-nav-bg)',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          borderRadius: '8px',
          marginBottom: '20px',
          transition: 'background-color 0.4s ease, height 0.4s ease',
        }}
      >
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>花样调色盘</span>
        <div style={{ marginLeft: '40px', display: 'flex', gap: '24px' }}>
          <a href="#" style={{ color: '#fff', textDecoration: 'none', fontSize: '14px', opacity: 0.95 }}>首页</a>
          <a href="#" style={{ color: '#fff', textDecoration: 'none', fontSize: '14px', opacity: 0.7 }}>组件</a>
          <a href="#" style={{ color: '#fff', textDecoration: 'none', fontSize: '14px', opacity: 0.7 }}>文档</a>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button
            style={{
              padding: '8px 18px',
              backgroundColor: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.4s ease',
            }}
            onMouseEnter={handlePrimaryBtnEnter}
            onMouseLeave={handlePrimaryBtnLeave}
          >
            立即开始
          </button>
        </div>
      </nav>

      <div
        style={{
          backgroundColor: 'var(--color-alert-bg)',
          color: '#856404',
          padding: '12px 18px',
          borderRadius: '6px',
          marginBottom: '20px',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          transition: 'background-color 0.4s ease',
        }}
      >
        <span style={{ fontSize: '18px' }}>💡</span>
        <span>提示：拖动左侧色相滑块或点击推荐色，即可实时查看主题在各组件上的效果。</span>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ ...cardStyle, flex: 1, minWidth: '260px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'var(--color-primary)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '24px',
              transition: 'background-color 0.4s ease',
            }}
          >
            🎨
          </div>
          <h3
            style={{
              margin: '0 0 8px 0',
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--color-text)',
              transition: 'color 0.4s ease',
            }}
          >
            卡片组件
          </h3>
          <p
            style={{
              margin: '0 0 16px 0',
              fontSize: '14px',
              color: 'var(--color-text)',
              opacity: 0.7,
              lineHeight: 1.6,
              transition: 'color 0.4s ease',
            }}
          >
            这是一张卡片组件示例，展示了主题颜色应用在内容容器上的效果。卡片通常用于展示相关的信息集合。
          </p>
          <button
            style={primaryButtonStyle}
            onMouseEnter={handlePrimaryBtnEnter}
            onMouseLeave={handlePrimaryBtnLeave}
          >
            了解更多
          </button>
        </div>

        <div style={{ ...cardStyle, flex: 1, minWidth: '260px' }}>
          <h3
            style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--color-text)',
              transition: 'color 0.4s ease',
            }}
          >
            表单输入
          </h3>
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                color: 'var(--color-text)',
                marginBottom: '6px',
                fontWeight: 500,
                transition: 'color 0.4s ease',
              }}
            >
              用户名
            </label>
            <input
              type="text"
              placeholder="请输入用户名"
              style={inputStyle}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                color: 'var(--color-text)',
                marginBottom: '6px',
                fontWeight: 500,
                transition: 'color 0.4s ease',
              }}
            >
              密码
            </label>
            <input
              type="password"
              placeholder="请输入密码"
              style={inputStyle}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              style={{ ...primaryButtonStyle, flex: 1, padding: '10px 16px' }}
              onMouseEnter={handlePrimaryBtnEnter}
              onMouseLeave={handlePrimaryBtnLeave}
            >
              主按钮
            </button>
            <button
              style={{ ...outlineButtonStyle, flex: 1, padding: '10px 16px' }}
              onMouseEnter={handleOutlineBtnEnter}
              onMouseLeave={handleOutlineBtnLeave}
            >
              次按钮
            </button>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <h3
          style={{
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--color-text)',
            transition: 'color 0.4s ease',
          }}
        >
          主题颜色变量
        </h3>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {colors.map((c) => (
            <div key={c.name} style={{ textAlign: 'center', minWidth: '70px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  backgroundColor: c.value,
                  margin: '0 auto 8px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  border: '2px solid #fff',
                  transition: 'background-color 0.4s ease, transform 0.2s ease',
                }}
              />
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--color-text)',
                  marginBottom: '2px',
                  transition: 'color 0.4s ease',
                }}
              >
                {c.label}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--color-text)',
                  opacity: 0.5,
                  fontFamily: 'monospace',
                  textTransform: 'uppercase',
                  transition: 'color 0.4s ease',
                }}
              >
                {c.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default memo(ThemePreview);
