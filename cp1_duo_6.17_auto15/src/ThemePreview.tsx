import React, { memo } from 'react';
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
  const background = getColorValue(colors, 'background', '#ffffff');
  const text = getColorValue(colors, 'text', '#333333');
  const buttonHover = getColorValue(colors, 'buttonHover', '#1565C0');

  const cssVars: React.CSSProperties = {
    '--preview-primary': primary,
    '--preview-secondary': secondary,
    '--preview-background': background,
    '--preview-text': text,
    '--preview-button-hover': buttonHover,
    '--preview-border': '#ddd',
    '--preview-nav-bg': '#333333',
    '--preview-alert-bg': '#FFF3CD',
    '--preview-alert-text': '#856404',
    '--preview-card-shadow': '0 2px 8px rgba(0,0,0,0.1)',
  } as React.CSSProperties;

  return (
    <div style={{
      ...cssVars,
      backgroundColor: background,
      padding: '24px',
      overflowY: 'auto',
      height: '100%',
      boxSizing: 'border-box',
      transition: 'background-color 0.4s ease, color 0.4s ease',
    }}>
      <h3 style={{
        margin: '0 0 20px 0',
        fontSize: '18px',
        color: text,
        transition: 'color 0.4s ease',
      }}>
        实时预览
      </h3>

      <nav style={{
        backgroundColor: 'var(--preview-nav-bg)',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        borderRadius: '8px',
        marginBottom: '20px',
        transition: 'all 0.4s ease',
      }}>
        <span style={{ color: '#fff', fontWeight: 600, fontSize: '16px' }}>导航栏</span>
        <div style={{ marginLeft: '30px', display: 'flex', gap: '20px' }}>
          <a href="#" style={{ color: '#fff', textDecoration: 'none', fontSize: '14px', opacity: 0.9 }}>首页</a>
          <a href="#" style={{ color: '#fff', textDecoration: 'none', fontSize: '14px', opacity: 0.9 }}>产品</a>
          <a href="#" style={{ color: '#fff', textDecoration: 'none', fontSize: '14px', opacity: 0.9 }}>关于</a>
        </div>
      </nav>

      <div style={{
        backgroundColor: 'var(--preview-alert-bg)',
        color: 'var(--preview-alert-text)',
        padding: '12px 16px',
        borderRadius: '6px',
        marginBottom: '20px',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span>💡</span>
        <span>提示：这是一条提示条信息，用于展示警告或通知内容。</span>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: 'var(--preview-card-shadow)',
          flex: 1,
          minWidth: '240px',
          transition: 'box-shadow 0.4s ease',
        }}>
          <h4 style={{
            margin: '0 0 10px 0',
            fontSize: '16px',
            color: text,
            transition: 'color 0.4s ease',
          }}>
            卡片标题
          </h4>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: text,
            opacity: 0.7,
            lineHeight: 1.6,
            transition: 'color 0.4s ease',
          }}>
            这是一张卡片组件，用于展示内容摘要。卡片通常包含标题、描述和操作按钮。
          </p>
          <button style={{
            marginTop: '14px',
            padding: '8px 16px',
            backgroundColor: primary,
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'background-color 0.4s ease',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = buttonHover;
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = primary;
          }}
          >
            了解更多
          </button>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: 'var(--preview-card-shadow)',
          flex: 1,
          minWidth: '240px',
          transition: 'box-shadow 0.4s ease',
        }}>
          <h4 style={{
            margin: '0 0 10px 0',
            fontSize: '16px',
            color: text,
            transition: 'color 0.4s ease',
          }}>
            表单输入
          </h4>
          <input
            type="text"
            placeholder="请输入内容..."
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              boxSizing: 'border-box',
              marginBottom: '12px',
              outline: 'none',
              transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = primary;
              e.target.style.boxShadow = `0 0 0 3px ${primary}20`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#ddd';
              e.target.style.boxShadow = 'none';
            }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{
              flex: 1,
              padding: '10px',
              backgroundColor: primary,
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.4s ease',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = buttonHover;
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = primary;
            }}
            >
              主按钮
            </button>
            <button style={{
              flex: 1,
              padding: '10px',
              backgroundColor: 'transparent',
              color: primary,
              border: `1px solid ${primary}`,
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.4s ease',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = `${primary}10`;
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
            >
              次按钮
            </button>
          </div>
        </div>
      </div>

      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: 'var(--preview-card-shadow)',
        transition: 'box-shadow 0.4s ease',
      }}>
        <h4 style={{
          margin: '0 0 12px 0',
          fontSize: '16px',
          color: text,
          transition: 'color 0.4s ease',
        }}>
          颜色变量展示
        </h4>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {colors.map(c => (
            <div key={c.name} style={{ textAlign: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                backgroundColor: c.value,
                margin: '0 auto 6px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                transition: 'background-color 0.4s ease',
              }} />
              <div style={{ fontSize: '11px', color: text, opacity: 0.7, transition: 'color 0.4s ease' }}>
                {c.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default memo(ThemePreview);
