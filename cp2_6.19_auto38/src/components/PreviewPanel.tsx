import React, { useState, useMemo } from 'react';
import { Theme } from '../theme/ThemeEngine';
import { hexWithOpacity, getRelativeLuminance, hexToRgb } from '../theme/colorUtils';

interface PreviewPanelProps {
  theme: Theme;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ theme }) => {
  const [inputValue, setInputValue] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [activeNav, setActiveNav] = useState(0);

  const isDarkBg = useMemo(() => {
    return getRelativeLuminance(hexToRgb(theme.background)) < 0.5;
  }, [theme.background]);

  const isDarkPrimary = useMemo(() => {
    return getRelativeLuminance(hexToRgb(theme.primary)) < 0.5;
  }, [theme.primary]);

  const colorTransition = 'background-color 0.25s cubic-bezier(0.4, 0, 0.6, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.6, 1), border-color 0.25s cubic-bezier(0.4, 0, 0.6, 1), color 0.25s cubic-bezier(0.4, 0, 0.6, 1)';
  const transformTransition = 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)';
  const allTransition = `${colorTransition}, ${transformTransition}`;

  const navItems = ['首页', '产品', '关于我们', '联系'];

  const neutralShadow = 'rgba(0, 0, 0, 0.06)';
  const neutralShadowHover = 'rgba(0, 0, 0, 0.1)';
  const neutralShadowStrong = 'rgba(0, 0, 0, 0.12)';

  const cardShadow = `0 1px 2px ${neutralShadow}, 0 4px 12px ${hexWithOpacity(theme.primary, isDarkPrimary ? 0.25 : 0.08)}`;
  const cardHoverShadow = `0 4px 8px ${neutralShadowHover}, 0 12px 28px ${hexWithOpacity(theme.primary, isDarkPrimary ? 0.35 : 0.12)}`;

  const btnPrimaryShadow = `0 2px 4px ${hexWithOpacity(theme.primary, 0.25)}, 0 1px 3px ${neutralShadow}`;
  const btnPrimaryHoverShadow = `0 6px 14px ${hexWithOpacity(theme.primary, 0.32)}, 0 2px 6px ${neutralShadowHover}`;
  const btnPrimaryActiveShadow = `0 1px 2px ${neutralShadowStrong}, 0 0 0 3px ${hexWithOpacity(theme.primaryDark, 0.3)}`;

  const btnSecondaryShadow = `0 2px 4px ${hexWithOpacity(theme.secondary, 0.25)}, 0 1px 3px ${neutralShadow}`;
  const btnSecondaryHoverShadow = `0 6px 14px ${hexWithOpacity(theme.secondary, 0.32)}, 0 2px 6px ${neutralShadowHover}`;
  const btnSecondaryActiveShadow = `0 1px 2px ${neutralShadowStrong}, 0 0 0 3px ${hexWithOpacity(theme.secondaryDark, 0.3)}`;

  const navBottomBorder = hexWithOpacity('#000000', 0.15);
  const navOuterShadow = `0 4px 14px ${hexWithOpacity(theme.primary, isDarkPrimary ? 0.4 : 0.22)}`;

  const cardBg = isDarkBg ? hexWithOpacity('#ffffff', 0.04) : '#ffffff';
  const cardBorder = isDarkBg
    ? hexWithOpacity('#ffffff', 0.08)
    : hexWithOpacity(theme.primary, 0.06);
  const cardHoverBorder = isDarkBg
    ? hexWithOpacity('#ffffff', 0.14)
    : hexWithOpacity(theme.primary, 0.12);

  const inputBg = isDarkBg ? hexWithOpacity('#ffffff', 0.04) : theme.background;
  const inputFocusBg = isDarkBg ? hexWithOpacity('#ffffff', 0.08) : '#ffffff';

  return (
    <div
      style={{
        padding: '40px',
        background: theme.background,
        height: '100%',
        overflowY: 'auto',
        boxSizing: 'border-box',
        transition: colorTransition,
      }}
    >
      <h2
        style={{
          fontSize: '20px',
          fontWeight: 700,
          marginBottom: '32px',
          color: theme.textPrimary,
          transition: colorTransition,
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
            boxShadow: navOuterShadow,
            borderBottom: `2px solid ${navBottomBorder}`,
            transition: colorTransition,
          }}
        >
          <div
            style={{
              color: theme.textOnPrimary,
              fontWeight: 700,
              fontSize: '16px',
              letterSpacing: '0.3px',
              transition: colorTransition,
              textShadow: `0 1px 2px ${hexWithOpacity('#000000', 0.2)}`,
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
                    transition: allTransition,
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
            background: cardBg,
            borderRadius: theme.borderRadius,
            padding: '24px',
            boxShadow: cardShadow,
            border: `1px solid ${cardBorder}`,
            transition: allTransition,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = cardHoverShadow;
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.borderColor = cardHoverBorder;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = cardShadow;
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = cardBorder;
          }}
        >
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 600,
              marginBottom: '8px',
              color: theme.textPrimary,
              transition: colorTransition,
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
              transition: colorTransition,
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
                transition: colorTransition,
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
                transition: colorTransition,
                border: `1px solid ${hexWithOpacity(theme.secondary, 0.2)}`,
              }}
            >
              辅色标签
            </span>
          </div>
        </div>

        <div
          style={{
            background: cardBg,
            borderRadius: theme.borderRadius,
            padding: '24px',
            boxShadow: cardShadow,
            border: `1px solid ${cardBorder}`,
            transition: allTransition,
          }}
        >
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              marginBottom: '10px',
              color: theme.textPrimary,
              transition: colorTransition,
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
              background: inputFocused ? inputFocusBg : inputBg,
              outline: 'none',
              boxSizing: 'border-box',
              transition: allTransition,
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
              transition: allTransition,
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
              transition: allTransition,
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
              transition: allTransition,
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
