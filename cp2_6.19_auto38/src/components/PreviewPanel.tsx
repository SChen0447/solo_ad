import React, { useState } from 'react';
import { Theme } from '../theme/ThemeEngine';
import { hexWithOpacity } from '../theme/colorUtils';

interface PreviewPanelProps {
  theme: Theme;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ theme }) => {
  const [inputValue, setInputValue] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [activeNav, setActiveNav] = useState(0);

  const transitionStyle = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
  const navItems = ['首页', '产品', '关于我们', '联系'];

  const cardShadow = `0 1px 2px ${hexWithOpacity(theme.primary, 0.06)}, 0 4px 12px ${hexWithOpacity(theme.primary, 0.08)}`;
  const cardHoverShadow = `0 4px 8px ${hexWithOpacity(theme.primary, 0.1)}, 0 12px 28px ${hexWithOpacity(theme.primary, 0.12)}`;
  const btnPrimaryShadow = `0 2px 4px ${hexWithOpacity(theme.primary, 0.18)}, 0 1px 3px ${hexWithOpacity(theme.primary, 0.12)}`;
  const btnPrimaryHoverShadow = `0 6px 12px ${hexWithOpacity(theme.primary, 0.24)}, 0 2px 6px ${hexWithOpacity(theme.primary, 0.16)}`;
  const btnPrimaryActiveShadow = `0 1px 2px ${hexWithOpacity(theme.primary, 0.2)}, 0 0 0 3px ${hexWithOpacity(theme.primary, 0.15)}`;
  const btnSecondaryShadow = `0 2px 4px ${hexWithOpacity(theme.secondary, 0.18)}, 0 1px 3px ${hexWithOpacity(theme.secondary, 0.12)}`;
  const btnSecondaryHoverShadow = `0 6px 12px ${hexWithOpacity(theme.secondary, 0.24)}, 0 2px 6px ${hexWithOpacity(theme.secondary, 0.16)}`;
  const btnSecondaryActiveShadow = `0 1px 2px ${hexWithOpacity(theme.secondary, 0.2)}, 0 0 0 3px ${hexWithOpacity(theme.secondary, 0.15)}`;
  const navInnerShadow = `inset 0 -1px 0 ${hexWithOpacity(theme.textOnPrimary, 0.12)}`;

  return (
    <div
      style={{
        padding: '40px',
        background: theme.background,
        height: '100%',
        overflowY: 'auto',
        boxSizing: 'border-box',
        transition: transitionStyle,
      }}
    >
      <h2
        style={{
          fontSize: '20px',
          fontWeight: 700,
          marginBottom: '32px',
          color: theme.textPrimary,
          transition: transitionStyle,
        }}
      >
        实时预览
      </h2>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          maxWidth: '600px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            background: theme.primary,
            borderRadius: theme.borderRadius,
            padding: '0 24px',
            height: '56px',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: `${navInnerShadow}, 0 4px 14px ${hexWithOpacity(theme.primary, 0.22)}`,
            borderBottom: `2px solid ${hexWithOpacity(theme.primaryDark, 0.4)}`,
            transition: transitionStyle,
          }}
        >
          <div
            style={{
              color: theme.textOnPrimary,
              fontWeight: 700,
              fontSize: '16px',
              letterSpacing: '0.3px',
              transition: transitionStyle,
              textShadow: `0 1px 2px ${hexWithOpacity(theme.primaryDark, 0.3)}`,
            }}
          >
            Logo
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {navItems.map((item, index) => {
              const isActive = activeNav === index;
              return (
                <button
                  key={item}
                  onClick={() => setActiveNav(index)}
                  style={{
                    padding: '8px 16px',
                    background: isActive
                      ? hexWithOpacity(theme.textOnPrimary, 0.15)
                      : 'transparent',
                    color: theme.textOnPrimary,
                    border: 'none',
                    borderRadius: theme.borderRadius,
                    fontSize: '14px',
                    fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer',
                    transition: transitionStyle,
                    opacity: isActive ? 1 : 0.85,
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = hexWithOpacity(theme.textOnPrimary, 0.08);
                      e.currentTarget.style.opacity = '1';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.opacity = '0.85';
                    }
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'scale(0.97)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: theme.borderRadius,
            padding: '24px',
            boxShadow: cardShadow,
            border: `1px solid ${hexWithOpacity(theme.primary, 0.06)}`,
            transition: transitionStyle,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = cardHoverShadow;
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.borderColor = hexWithOpacity(theme.primary, 0.12);
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = cardShadow;
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = hexWithOpacity(theme.primary, 0.06);
          }}
        >
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 600,
              marginBottom: '8px',
              color: theme.textPrimary,
              transition: transitionStyle,
              letterSpacing: '-0.2px',
            }}
          >
            示例卡片
          </h3>
          <p
            style={{
              fontSize: '14px',
              lineHeight: '1.7',
              color: theme.textSecondary,
              marginBottom: '16px',
              transition: transitionStyle,
            }}
          >
            这是一个卡片组件示例。调整左侧的配色方案，可以实时看到卡片的背景色、文字颜色、边框和阴影效果的变化。
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '5px 14px',
                background: hexWithOpacity(theme.primary, 0.1),
                color: theme.primary,
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 600,
                transition: transitionStyle,
                border: `1px solid ${hexWithOpacity(theme.primary, 0.2)}`,
              }}
            >
              主色标签
            </span>
            <span
              style={{
                display: 'inline-block',
                padding: '5px 14px',
                background: hexWithOpacity(theme.secondary, 0.1),
                color: theme.secondary,
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 600,
                transition: transitionStyle,
                border: `1px solid ${hexWithOpacity(theme.secondary, 0.2)}`,
              }}
            >
              辅色标签
            </span>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: theme.borderRadius,
            padding: '24px',
            boxShadow: cardShadow,
            border: `1px solid ${hexWithOpacity(theme.primary, 0.06)}`,
            transition: transitionStyle,
          }}
        >
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              marginBottom: '10px',
              color: theme.textPrimary,
              transition: transitionStyle,
            }}
          >
            输入框示例
          </label>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="请输入内容..."
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: `2px solid ${inputFocused ? theme.primary : theme.borderColor}`,
              borderRadius: theme.borderRadius,
              fontSize: '14px',
              color: theme.textPrimary,
              background: inputFocused ? '#ffffff' : theme.background,
              outline: 'none',
              boxSizing: 'border-box',
              transition: transitionStyle,
              boxShadow: inputFocused
                ? `0 0 0 4px ${hexWithOpacity(theme.primary, 0.12)}`
                : 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            style={{
              padding: '12px 24px',
              background: theme.primary,
              color: theme.textOnPrimary,
              border: 'none',
              borderRadius: theme.borderRadius,
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: btnPrimaryShadow,
              transition: transitionStyle,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.primaryDark;
              e.currentTarget.style.boxShadow = btnPrimaryHoverShadow;
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = theme.primary;
              e.currentTarget.style.boxShadow = btnPrimaryShadow;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.background = theme.primaryDark;
              e.currentTarget.style.transform = 'translateY(1px)';
              e.currentTarget.style.boxShadow = btnPrimaryActiveShadow;
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.background = theme.primaryDark;
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = btnPrimaryHoverShadow;
            }}
          >
            主要按钮
          </button>

          <button
            style={{
              padding: '12px 24px',
              background: theme.secondary,
              color: theme.textOnSecondary,
              border: 'none',
              borderRadius: theme.borderRadius,
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: btnSecondaryShadow,
              transition: transitionStyle,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.secondaryDark;
              e.currentTarget.style.boxShadow = btnSecondaryHoverShadow;
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = theme.secondary;
              e.currentTarget.style.boxShadow = btnSecondaryShadow;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.background = theme.secondaryDark;
              e.currentTarget.style.transform = 'translateY(1px)';
              e.currentTarget.style.boxShadow = btnSecondaryActiveShadow;
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.background = theme.secondaryDark;
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = btnSecondaryHoverShadow;
            }}
          >
            次要按钮
          </button>

          <button
            style={{
              padding: '12px 24px',
              background: 'transparent',
              color: theme.primary,
              border: `2px solid ${theme.primary}`,
              borderRadius: theme.borderRadius,
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: transitionStyle,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = hexWithOpacity(theme.primary, 0.06);
              e.currentTarget.style.borderColor = theme.primaryDark;
              e.currentTarget.style.color = theme.primaryDark;
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = theme.primary;
              e.currentTarget.style.color = theme.primary;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.background = hexWithOpacity(theme.primary, 0.12);
              e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.background = hexWithOpacity(theme.primary, 0.06);
              e.currentTarget.style.transform = 'translateY(-1px) scale(1)';
            }}
          >
            轮廓按钮
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(PreviewPanel);
