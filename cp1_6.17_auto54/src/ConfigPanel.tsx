import { useState } from 'react';
import { themes, fonts } from './utils';

interface ConfigPanelProps {
  onGenerate: (title: string, themeIndex: number, fontIndex: number) => void;
  initialTitle: string;
  initialThemeIndex: number;
  initialFontIndex: number;
}

const rippleStyle = {
  position: 'relative' as const,
  overflow: 'hidden' as const
};

function ConfigPanel({ onGenerate, initialTitle, initialThemeIndex, initialFontIndex }: ConfigPanelProps) {
  const [title, setTitle] = useState(initialTitle);
  const [themeIndex, setThemeIndex] = useState(initialThemeIndex);
  const [fontIndex, setFontIndex] = useState(initialFontIndex);

  const handleRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(255, 255, 255, 0.5);
      transform: scale(0);
      animation: ripple-animation 0.6s ease-out;
      pointer-events: none;
    `;
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  };

  return (
    <div
      style={{
        width: 320,
        background: '#2d2d2d',
        borderRadius: 12,
        padding: 24,
        margin: 16,
        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.3), 0 4px 20px rgba(0,0,0,0.3)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        overflowY: 'auto',
        flexShrink: 0
      }}
    >
      <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', background: 'linear-gradient(135deg, #667eea, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        仪表盘配置
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 14, fontWeight: 500, color: '#ccc' }}>仪表盘标题</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="请输入仪表盘标题"
          style={{
            padding: '12px 14px',
            borderRadius: 8,
            border: '1px solid #444',
            background: '#1f1f1f',
            color: '#fff',
            fontSize: 14,
            outline: 'none',
            transition: 'border-color 0.2s',
            fontFamily: 'inherit'
          }}
          onFocus={(e) => (e.target.style.borderColor = '#667eea')}
          onBlur={(e) => (e.target.style.borderColor = '#444')}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label style={{ fontSize: 14, fontWeight: 500, color: '#ccc' }}>主题配色方案</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {themes.map((theme, idx) => (
            <div
              key={theme.name}
              onClick={() => setThemeIndex(idx)}
              style={{
                padding: 10,
                borderRadius: 8,
                border: themeIndex === idx ? '2px solid #667eea' : '2px solid transparent',
                background: '#1f1f1f',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                transform: themeIndex === idx ? 'scale(1.02)' : 'scale(1)'
              }}
            >
              <div style={{ display: 'flex', gap: 4 }}>
                {theme.colors.slice(0, 5).map((color, i) => (
                  <div
                    key={i}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      background: color
                    }}
                  />
                ))}
              </div>
              <span style={{ fontSize: 12, color: '#ddd' }}>{theme.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 14, fontWeight: 500, color: '#ccc' }}>字体选择</label>
        {fonts.map((font, idx) => (
          <div
            key={font.value}
            onClick={() => setFontIndex(idx)}
            style={{
              padding: 12,
              borderRadius: 8,
              border: fontIndex === idx ? '2px solid #667eea' : '2px solid transparent',
              background: '#1f1f1f',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: font.value,
              fontSize: 15,
              color: fontIndex === idx ? '#fff' : '#aaa',
              transform: fontIndex === idx ? 'scale(1.02)' : 'scale(1)'
            }}
          >
            {font.name}
          </div>
        ))}
      </div>

      <button
        onClick={(e) => {
          handleRipple(e);
          onGenerate(title, themeIndex, fontIndex);
        }}
        style={{
          ...rippleStyle,
          padding: '14px 20px',
          borderRadius: 10,
          border: 'none',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          color: '#fff',
          fontSize: 16,
          fontWeight: 600,
          cursor: 'pointer',
          marginTop: 8,
          transition: 'filter 0.2s, transform 0.2s',
          fontFamily: 'inherit',
          boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.filter = 'brightness(1.1)';
          e.currentTarget.style.transform = 'scale(1.02)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = 'brightness(1)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        生成仪表盘
      </button>

      <style>{`
        @keyframes ripple-animation {
          from { transform: scale(0); opacity: 0.5; }
          to { transform: scale(4); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default ConfigPanel;
