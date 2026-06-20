import React, { useState, useRef, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiEye, FiTrash2, FiDownload, FiSave } from 'react-icons/fi';
import { ThemeVars, SavedTheme, ThemeSide } from './themeTypes';
import { ThemeContext } from './App';

interface ThemeManagerProps {
  leftVars: ThemeVars;
  rightVars: ThemeVars;
  leftPreviewRef: React.RefObject<HTMLDivElement>;
  rightPreviewRef: React.RefObject<HTMLDivElement>;
  activeSide: ThemeSide;
}

const captureElement = (element: HTMLElement): string | null => {
  try {
    const canvas = document.createElement('canvas');
    const rect = element.getBoundingClientRect();
    const scale = 2;
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.scale(scale, scale);
    ctx.fillStyle = '#f0f2f5';
    ctx.fillRect(0, 0, rect.width, rect.height);

    const style = window.getComputedStyle(element);
    const bgColor = style.backgroundColor || '#ffffff';
    ctx.fillStyle = bgColor;
    if (style.borderRadius) {
      const radius = parseFloat(style.borderRadius);
      roundRect(ctx, 0, 0, rect.width, rect.height, radius);
      ctx.fill();
    } else {
      ctx.fillRect(0, 0, rect.width, rect.height);
    }

    const children = element.querySelectorAll('*');
    ctx.font = '14px -apple-system, sans-serif';
    ctx.fillStyle = '#1f2937';
    ctx.fillText('组件预览快照', 20, 30);
    ctx.font = '12px -apple-system, sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.fillText(`${rect.width.toFixed(0)} x ${rect.height.toFixed(0)}`, 20, 50);

    return canvas.toDataURL('image/png');
  } catch (e) {
    console.error('Screenshot failed:', e);
    return null;
  }
};

const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

const ThemeManager: React.FC<ThemeManagerProps> = ({
  leftVars,
  rightVars,
  leftPreviewRef,
  rightPreviewRef,
  activeSide,
}) => {
  const context = useContext(ThemeContext);
  const [themes, setThemes] = useState<SavedTheme[]>([]);
  const [themeName, setThemeName] = useState('');
  const [focused, setFocused] = useState(false);
  const [exporting, setExporting] = useState(false);

  const currentVars = activeSide === 'left' ? leftVars : rightVars;

  const handleSave = () => {
    if (!themeName.trim() || themeName.length > 20) return;

    const newTheme: SavedTheme = {
      id: Date.now().toString(),
      name: themeName.trim(),
      vars: { ...currentVars },
      createdAt: Date.now(),
    };

    setThemes((prev) => [newTheme, ...prev]);
    setThemeName('');
  };

  const handleLoad = (theme: SavedTheme) => {
    if (activeSide === 'left' && context) {
      context.setLeftVars({ ...theme.vars });
    } else if (context) {
      context.setRightVars({ ...theme.vars });
    }
  };

  const handleDelete = (id: string) => {
    setThemes((prev) => prev.filter((t) => t.id !== id));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      let leftSnapshot: string | null = null;
      let rightSnapshot: string | null = null;

      if (leftPreviewRef.current) {
        leftSnapshot = captureElement(leftPreviewRef.current);
      }
      if (rightPreviewRef.current) {
        rightSnapshot = captureElement(rightPreviewRef.current);
      }

      const report = {
        exportedAt: new Date().toISOString(),
        leftTheme: {
          name: '左侧主题',
          vars: leftVars,
          snapshot: leftSnapshot,
        },
        rightTheme: {
          name: '右侧主题',
          vars: rightVars,
          snapshot: rightSnapshot,
        },
        savedThemes: themes,
      };

      const jsonStr = JSON.stringify(report, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `theme-compare-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ padding: '0 16px 20px 16px', borderTop: '1px solid #e5e7eb' }}>
      <h3
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#374151',
          margin: '16px 0 12px 0',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        方案管理
      </h3>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input
          type="text"
          value={themeName}
          onChange={(e) => setThemeName(e.target.value.slice(0, 20))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="方案名称 (最多20字)"
          style={{
            width: '160px',
            height: '36px',
            padding: '0 10px',
            backgroundColor: '#ffffff',
            borderRadius: '6px',
            border: `1px solid ${focused ? leftVars['--primary'] : '#d1d5db'}`,
            fontSize: '13px',
            outline: 'none',
            transition: 'border-color 0.2s ease',
            boxSizing: 'border-box',
          }}
          maxLength={20}
        />
        <button
          onClick={handleSave}
          disabled={!themeName.trim()}
          style={{
            flex: 1,
            height: '36px',
            backgroundColor: themeName.trim() ? currentVars['--primary'] : '#d1d5db',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: themeName.trim() ? 'pointer' : 'not-allowed',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
        >
          <FiSave size={14} />
          保存当前
        </button>
      </div>

      <button
        onClick={handleExport}
        disabled={exporting}
        style={{
          width: '100%',
          height: '38px',
          backgroundColor: '#fff',
          color: '#374151',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          cursor: exporting ? 'not-allowed' : 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '16px',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          if (!exporting) {
            e.currentTarget.style.borderColor = '#d1d5db';
            e.currentTarget.style.backgroundColor = '#f9fafb';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#e5e7eb';
          e.currentTarget.style.backgroundColor = '#fff';
        }}
      >
        <FiDownload size={14} />
        {exporting ? '导出中...' : '导出对比报告 (JSON)'}
      </button>

      <div style={{ marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>
          已保存方案 ({themes.length})
        </span>
      </div>

      <div
        style={{
          maxHeight: '240px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <AnimatePresence>
          {themes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                padding: '20px',
                textAlign: 'center',
                color: '#9ca3af',
                fontSize: '12px',
              }}
            >
              暂无保存的方案
            </motion.div>
          ) : (
            themes.map((theme) => (
              <motion.div
                key={theme.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  height: '48px',
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  gap: '10px',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fff';
                }}
              >
                <div style={{ display: 'flex', gap: '4px' }}>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '3px',
                      backgroundColor: theme.vars['--primary'],
                      border: '1px solid rgba(0,0,0,0.1)',
                    }}
                  />
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '3px',
                      backgroundColor: theme.vars['--secondary'],
                      border: '1px solid rgba(0,0,0,0.1)',
                    }}
                  />
                </div>
                <span
                  style={{
                    flex: 1,
                    fontSize: '13px',
                    color: '#374151',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {theme.name}
                </span>
                <div style={{ display: 'flex', gap: '2px' }}>
                  <button
                    onClick={() => handleLoad(theme)}
                    title="加载方案"
                    style={{
                      width: '32px',
                      height: '32px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#6b7280',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e5e7eb';
                      e.currentTarget.style.color = theme.vars['--primary'];
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#6b7280';
                    }}
                  >
                    <FiEye size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(theme.id)}
                    title="删除方案"
                    style={{
                      width: '32px',
                      height: '32px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#6b7280',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#fee2e2';
                      e.currentTarget.style.color = '#ef4444';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#6b7280';
                    }}
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ThemeManager;
