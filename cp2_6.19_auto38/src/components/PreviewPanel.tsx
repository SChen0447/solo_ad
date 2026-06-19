import React, { useState } from 'react';
import { Theme } from '../theme/ThemeEngine';

interface PreviewPanelProps {
  theme: Theme;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ theme }) => {
  const [inputValue, setInputValue] = useState('');
  const [activeNav, setActiveNav] = useState(0);

  const transitionStyle = 'all 0.3s ease-in-out';

  const navItems = ['首页', '产品', '关于我们', '联系'];

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
            boxShadow: theme.shadow,
            transition: transitionStyle,
          }}
        >
          <div
            style={{
              color: theme.textOnPrimary,
              fontWeight: 700,
              fontSize: '16px',
              transition: transitionStyle,
            }}
          >
            Logo
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {navItems.map((item, index) => (
              <button
                key={item}
                onClick={() => setActiveNav(index)}
                style={{
                  padding: '8px 16px',
                  background: activeNav === index ? theme.primaryLight : 'transparent',
                  color: theme.textOnPrimary,
                  border: 'none',
                  borderRadius: theme.borderRadius,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: transitionStyle,
                  opacity: activeNav === index ? 1 : 0.8,
                }}
                onMouseEnter={(e) => {
                  if (activeNav !== index) {
                    e.currentTarget.style.background = theme.primaryDark;
                    e.currentTarget.style.opacity = '1';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeNav !== index) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.opacity = '0.8';
                  }
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: theme.borderRadius,
            padding: '24px',
            boxShadow: theme.shadow,
            border: `1px solid ${theme.borderColor}`,
            transition: transitionStyle,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = theme.hoverShadow;
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = theme.shadow;
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 600,
              marginBottom: '8px',
              color: theme.textPrimary,
              transition: transitionStyle,
            }}
          >
            示例卡片
          </h3>
          <p
            style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: theme.textSecondary,
              marginBottom: '16px',
              transition: transitionStyle,
            }}
          >
            这是一个卡片组件示例。调整左侧的配色方案，可以实时看到卡片的背景色、文字颜色、边框和阴影效果的变化。
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                background: theme.primary,
                color: theme.textOnPrimary,
                borderRadius: '999px',
                fontSize: '12px',
                transition: transitionStyle,
              }}
            >
              主色标签
            </span>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                background: theme.secondary,
                color: theme.textOnSecondary,
                borderRadius: '999px',
                fontSize: '12px',
                transition: transitionStyle,
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
            boxShadow: theme.shadow,
            border: `1px solid ${theme.borderColor}`,
            transition: transitionStyle,
          }}
        >
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              marginBottom: '8px',
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
            style={{
              width: '100%',
              padding: '12px 16px',
              border: `2px solid ${theme.borderColor}`,
              borderRadius: theme.borderRadius,
              fontSize: '14px',
              color: theme.textPrimary,
              background: theme.background,
              outline: 'none',
              boxSizing: 'border-box',
              transition: transitionStyle,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = theme.primary;
              e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.shadowColor}`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = theme.borderColor;
              e.currentTarget.style.boxShadow = 'none';
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
              boxShadow: theme.shadow,
              transition: transitionStyle,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.primaryDark;
              e.currentTarget.style.boxShadow = theme.hoverShadow;
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = theme.primary;
              e.currentTarget.style.boxShadow = theme.shadow;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
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
              boxShadow: theme.shadow,
              transition: transitionStyle,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.secondaryDark;
              e.currentTarget.style.boxShadow = theme.hoverShadow;
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = theme.secondary;
              e.currentTarget.style.boxShadow = theme.shadow;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
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
              e.currentTarget.style.background = theme.primary;
              e.currentTarget.style.color = theme.textOnPrimary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = theme.primary;
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
