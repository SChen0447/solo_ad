import React, { useMemo, useState, memo } from 'react';
import { useColorStore, CoreColor } from '../stores/colorStore';
import { lightenColor, getContrastColor } from '../utils/colorUtils';

const DEFAULT_COLOR = '#6B7280';
const DEFAULT_SCALE = [
  '#F3F4F6',
  '#E5E7EB',
  '#D1D5DB',
  '#9CA3AF',
  '#6B7280',
  '#4B5563',
  '#374151',
  '#1F2937',
  '#111827',
];

const getCoreScale = (coreColors: CoreColor[], coreId: string | null): string[] => {
  if (!coreId) return DEFAULT_SCALE;
  const core = coreColors.find((c) => c.id === coreId);
  return core ? core.scale : DEFAULT_SCALE;
};

interface PreviewButtonProps {
  color: string;
}

const PreviewButton = memo<PreviewButtonProps>(({ color }) => {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const bgColor = hovered ? lightenColor(color, 10) : color;
  const textColor = getContrastColor(color);

  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        padding: '10px 24px',
        backgroundColor: bgColor,
        color: textColor,
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'background-color 0.3s ease, transform 0.1s ease',
        transform: pressed ? 'scale(0.95)' : 'scale(1)',
        outline: 'none',
      }}
    >
      主要按钮
    </button>
  );
});

PreviewButton.displayName = 'PreviewButton';

interface PreviewInputProps {
  color: string;
}

const PreviewInput = memo<PreviewInputProps>(({ color }) => {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ position: 'relative', width: '280px' }}>
      <input
        type="text"
        placeholder="请输入内容..."
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          padding: '10px 14px',
          border: `2px solid ${color}`,
          borderRadius: '8px',
          fontSize: '14px',
          outline: 'none',
          backgroundColor: '#FFFFFF',
          transition: focused ? 'none' : 'border-color 0.3s ease',
        }}
      />
      {focused && (
        <div
          style={{
            position: 'absolute',
            top: '-3px',
            left: '-3px',
            right: '-3px',
            bottom: '-3px',
            borderRadius: '10px',
            border: `2px solid ${color}`,
            opacity: 0.35,
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
});

PreviewInput.displayName = 'PreviewInput';

interface PreviewNavbarProps {
  navBgColor: string;
  linkColor: string;
}

const PreviewNavbar = memo<PreviewNavbarProps>(({ navBgColor, linkColor }) => {
  const textColor = getContrastColor(navBgColor);
  const activeLinkColor = linkColor || textColor;

  return (
    <div
      style={{
        width: '100%',
        height: '56px',
        backgroundColor: navBgColor,
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        transition: 'background-color 0.3s ease',
      }}
    >
      <div
        style={{
          fontSize: '16px',
          fontWeight: 700,
          color: textColor,
          marginRight: '40px',
        }}
      >
        BrandLogo
      </div>
      <nav style={{ display: 'flex', gap: '28px', flex: 1 }}>
        {['首页', '产品', '关于我们'].map((item, idx) => (
          <a
            key={item}
            href="#"
            onClick={(e) => e.preventDefault()}
            style={{
              fontSize: '14px',
              fontWeight: idx === 0 ? 600 : 500,
              color: idx === 0 ? activeLinkColor : textColor,
              opacity: idx === 0 ? 1 : 0.85,
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'color 0.3s ease, opacity 0.3s ease',
            }}
          >
            {item}
          </a>
        ))}
      </nav>
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.2)',
          border: `2px solid ${textColor}`,
        }}
      />
    </div>
  );
});

PreviewNavbar.displayName = 'PreviewNavbar';

interface PreviewCardProps {
  shadowColor: string;
  accentColor: string;
}

const PreviewCard = memo<PreviewCardProps>(({ shadowColor, accentColor }) => {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: '360px',
        backgroundColor: '#FFFFFF',
        borderRadius: '14px',
        padding: '24px',
        boxShadow: `0 8px 24px ${shadowColor}33, 0 2px 8px ${shadowColor}1A`,
        transition: 'box-shadow 0.3s ease',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '8px',
          borderRadius: '4px',
          background: `linear-gradient(90deg, ${shadowColor}, ${accentColor})`,
          marginBottom: '18px',
        }}
      />
      <h3
        style={{
          fontSize: '18px',
          fontWeight: 700,
          color: '#111827',
          marginBottom: '8px',
        }}
      >
        品牌卡片示例
      </h3>
      <p
        style={{
          fontSize: '13px',
          color: '#6B7280',
          lineHeight: 1.6,
          marginBottom: '16px',
        }}
      >
        这是一个应用了当前选中色阶阴影效果的卡片组件，顶部的渐变条展示了色彩过渡效果。
      </p>
      <div
        style={{
          display: 'flex',
          gap: '8px',
        }}
      >
        <div
          style={{
            flex: 1,
            height: '6px',
            borderRadius: '3px',
            backgroundColor: shadowColor,
            opacity: 0.6,
          }}
        />
        <div
          style={{
            flex: 1,
            height: '6px',
            borderRadius: '3px',
            backgroundColor: shadowColor,
            opacity: 0.4,
          }}
        />
        <div
          style={{
            flex: 0.6,
            height: '6px',
            borderRadius: '3px',
            backgroundColor: shadowColor,
            opacity: 0.25,
          }}
        />
      </div>
    </div>
  );
});

PreviewCard.displayName = 'PreviewCard';

export const UIPreview: React.FC = () => {
  const selected = useColorStore((s) => s.selected);
  const coreColors = useColorStore((s) => s.coreColors);

  const currentScale = useMemo(
    () => getCoreScale(coreColors, selected.coreId),
    [coreColors, selected.coreId]
  );

  const selectedColor = selected.hex || DEFAULT_COLOR;
  const selectedIndex = selected.scaleIndex ?? 4;

  const navBgColor = currentScale[6] || DEFAULT_SCALE[6];
  const navLinkColor = selectedColor;

  const mainColor = selectedColor;
  const cardShadowColor = selectedColor;
  const cardAccentColor = currentScale[Math.max(0, selectedIndex - 2)] || selectedColor;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '780px',
        margin: '0 auto',
        padding: '24px',
      }}
    >
      <div style={{ marginBottom: '32px' }}>
        <h2
          style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#111827',
            marginBottom: '4px',
          }}
        >
          UI 组件实时预览
        </h2>
        <p style={{ fontSize: '14px', color: '#6B7280' }}>
          点击左侧色阶即可查看应用效果
          {selected.hex && (
            <span style={{ marginLeft: '12px', fontFamily: 'monospace', color: '#3B82F6', fontWeight: 600 }}>
              当前: {selected.hex}
            </span>
          )}
        </p>
      </div>

      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ marginBottom: '32px' }}>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '16px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            导航栏
          </div>
          <PreviewNavbar navBgColor={navBgColor} linkColor={navLinkColor} />
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '32px',
            marginBottom: '32px',
          }}
        >
          <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              主按钮
            </div>
            <PreviewButton color={mainColor} />
          </div>

          <div style={{ flex: '1 1 280px', minWidth: '260px' }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              输入框
            </div>
            <PreviewInput color={mainColor} />
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '16px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            卡片
          </div>
          <PreviewCard shadowColor={cardShadowColor} accentColor={cardAccentColor} />
        </div>
      </div>
    </div>
  );
};

export default UIPreview;
