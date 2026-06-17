import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Theme, ColorItem } from './types';

interface ThemeManagerProps {
  currentColors: ColorItem[];
  onLoadTheme: (colors: ColorItem[]) => void;
}

const STORAGE_KEY = 'huayang-palette-themes';

export function exportToCSS(colors: ColorItem[]): string {
  const lines = colors.map(c => `  --${c.name}: ${c.value};`);
  return `:root {\n${lines.join('\n')}\n}`;
}

export function exportToJSON(colors: ColorItem[]): string {
  return JSON.stringify(
    colors.reduce((acc, c) => ({ ...acc, [c.name]: c.value }), {}),
    null,
    2
  );
}

const ThemeManager: React.FC<ThemeManagerProps> = ({ currentColors, onLoadTheme }) => {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [themeName, setThemeName] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [currentThumbnail, setCurrentThumbnail] = useState<ColorItem[]>(currentColors);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setThemes(JSON.parse(stored));
      } catch {
        setThemes([]);
      }
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCurrentThumbnail(currentColors);
    }, 50);
    return () => window.clearTimeout(timer);
  }, [currentColors]);

  useEffect(() => {
    const handleColorsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<ColorItem[]>;
      setCurrentThumbnail(customEvent.detail);
    };
    window.addEventListener('palette-colors-updated', handleColorsUpdate);
    return () => window.removeEventListener('palette-colors-updated', handleColorsUpdate);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
  }, [themes]);

  const handleAddTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  const handleRemoveTag = useCallback((tag: string) => {
    setTags(tags.filter(t => t !== tag));
  }, [tags]);

  const handleSaveTheme = useCallback(() => {
    if (!themeName.trim()) return;
    const newTheme: Theme = {
      id: `theme-${Date.now()}`,
      name: themeName.trim(),
      tags: [...tags],
      colors: JSON.parse(JSON.stringify(currentColors)),
      createdAt: Date.now(),
    };
    setThemes(prev => [newTheme, ...prev]);
    setThemeName('');
    setTags([]);
  }, [themeName, tags, currentColors]);

  const handleLoadTheme = useCallback((theme: Theme) => {
    onLoadTheme(theme.colors);
  }, [onLoadTheme]);

  const handleDeleteTheme = useCallback((id: string) => {
    setThemes(prev => prev.filter(t => t.id !== id));
  }, []);

  const copyToClipboard = useCallback(async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(type);
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopySuccess(null);
      }, 2000);
    } catch {
      console.error('复制失败');
    }
  }, []);

  const handleExportCSS = useCallback(() => {
    const css = exportToCSS(currentColors);
    copyToClipboard(css, 'css');
  }, [currentColors, copyToClipboard]);

  const handleExportJSON = useCallback(() => {
    const json = exportToJSON(currentColors);
    copyToClipboard(json, 'json');
  }, [currentColors, copyToClipboard]);

  const renderThumbnail = (colors: ColorItem[], size: 'small' | 'large' = 'small') => {
    const displayColors = colors.slice(0, 5);
    const height = size === 'large' ? '24px' : '16px';
    return (
      <div style={{
        display: 'flex',
        height,
        borderRadius: '4px',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {displayColors.map((c, idx) => (
          <div
            key={idx}
            style={{
              flex: 1,
              backgroundColor: c.value,
              transition: 'background-color 0.4s ease',
              position: 'relative',
            }}
          >
            {c.locked && (
              <span
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  fontSize: size === 'large' ? '10px' : '8px',
                  lineHeight: 1,
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  zIndex: 10,
                }}
                title={`${c.label} 已锁定`}
              >
                🔒
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{
      backgroundColor: '#f5f5f5',
      padding: '16px',
      overflowY: 'auto',
      height: '100%',
      boxSizing: 'border-box',
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#333' }}>主题管理</h3>

      <div style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '16px',
      }}>
        <div style={{ marginBottom: '8px' }}>
          <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>
            当前主题预览
          </label>
          {renderThumbnail(currentThumbnail, 'large')}
        </div>

        <div style={{ marginBottom: '8px' }}>
          <input
            type="text"
            placeholder="主题名称"
            value={themeName}
            onChange={e => setThemeName(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '13px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
            <input
              type="text"
              placeholder="添加标签后回车"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              style={{
                flex: 1,
                padding: '6px 8px',
                fontSize: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
            <button
              onClick={handleAddTag}
              style={{
                padding: '6px 10px',
                fontSize: '12px',
                backgroundColor: '#1976D2',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              添加
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {tags.map(tag => (
              <span
                key={tag}
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  backgroundColor: '#e3f2fd',
                  color: '#1976D2',
                  borderRadius: '12px',
                  cursor: 'pointer',
                }}
                onClick={() => handleRemoveTag(tag)}
              >
                {tag} ×
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={handleSaveTheme}
          disabled={!themeName.trim()}
          style={{
            width: '100%',
            padding: '8px',
            fontSize: '13px',
            backgroundColor: themeName.trim() ? '#4CAF50' : '#ccc',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: themeName.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          保存主题
        </button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#333' }}>导出</h4>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleExportCSS}
            style={{
              flex: 1,
              padding: '8px',
              fontSize: '12px',
              backgroundColor: '#fff',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            CSS 变量
            {copySuccess === 'css' && (
              <span
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: '#4CAF50',
                  color: '#fff',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  animation: 'fadeIn 0.3s ease',
                }}
              >
                ✓ 已复制
              </span>
            )}
          </button>
          <button
            onClick={handleExportJSON}
            style={{
              flex: 1,
              padding: '8px',
              fontSize: '12px',
              backgroundColor: '#fff',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            JSON
            {copySuccess === 'json' && (
              <span
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: '#4CAF50',
                  color: '#fff',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  animation: 'fadeIn 0.3s ease',
                }}
              >
                ✓ 已复制
              </span>
            )}
          </button>
        </div>
      </div>

      <div>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#333' }}>历史主题</h4>
        {themes.length === 0 ? (
          <p style={{ fontSize: '12px', color: '#999', textAlign: 'center', padding: '20px 0' }}>
            暂无保存的主题
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {themes.map(theme => (
              <div
                key={theme.id}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  padding: '10px',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}
                onClick={() => handleLoadTheme(theme)}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                }}
              >
                {renderThumbnail(theme.colors)}
                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#333' }}>{theme.name}</span>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleDeleteTheme(theme.id);
                    }}
                    style={{
                      fontSize: '11px',
                      color: '#f44336',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px 4px',
                    }}
                  >
                    删除
                  </button>
                </div>
                {theme.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                    {theme.tags.map(tag => (
                      <span
                        key={tag}
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          backgroundColor: '#f0f0f0',
                          color: '#666',
                          borderRadius: '8px',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -60%); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
      `}</style>
    </div>
  );
};

export default ThemeManager;
