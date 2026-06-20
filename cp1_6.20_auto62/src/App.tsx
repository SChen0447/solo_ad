import { useState, useRef, useCallback, useEffect } from 'react';
import ControlPanel from './components/ControlPanel';
import GridPreview from './components/GridPreview';
import ColorPicker from './components/ColorPicker';
import TemplatePanel from './components/TemplatePanel';
import {
  GridConfig,
  Template,
  getDefaultGridConfig,
  captureThumbnail,
  serializeTemplate,
  deserializeTemplate,
  MAX_TEMPLATES,
  MAX_COLOR_HISTORY
} from './utils/gridUtils';

export default function App() {
  const [gridConfig, setGridConfig] = useState<GridConfig>(getDefaultGridConfig());
  const [templates, setTemplates] = useState<Template[]>([]);
  const [colorHistory, setColorHistory] = useState<string[]>([]);

  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [colorPickerPosition, setColorPickerPosition] = useState({ x: 0, y: 0 });
  const [activeCellKey, setActiveCellKey] = useState<string | null>(null);

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const gridPreviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedTemplates = localStorage.getItem('grid-templates');
    const savedColorHistory = localStorage.getItem('grid-color-history');
    if (savedTemplates) {
      try {
        setTemplates(JSON.parse(savedTemplates));
      } catch {}
    }
    if (savedColorHistory) {
      try {
        setColorHistory(JSON.parse(savedColorHistory));
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('grid-templates', JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem('grid-color-history', JSON.stringify(colorHistory));
  }, [colorHistory]);

  const handleConfigChange = useCallback((changes: Partial<GridConfig>) => {
    setGridConfig(prev => ({ ...prev, ...changes }));
  }, []);

  const handleCellClick = useCallback((cellKey: string, position: { x: number; y: number }) => {
    setActiveCellKey(cellKey);
    setColorPickerPosition(position);
    setColorPickerOpen(true);
  }, []);

  const handleColorConfirm = useCallback((color: string) => {
    if (!activeCellKey) return;
    setGridConfig(prev => ({
      ...prev,
      cellColors: { ...prev.cellColors, [activeCellKey]: color }
    }));
  }, [activeCellKey]);

  const handleAddColorToHistory = useCallback((color: string) => {
    setColorHistory(prev => {
      const filtered = prev.filter(c => c.toLowerCase() !== color.toLowerCase());
      const next = [color, ...filtered].slice(0, MAX_COLOR_HISTORY);
      return next;
    });
  }, []);

  const handleSaveTemplateClick = useCallback(() => {
    const now = new Date();
    const defaultName = `布局 ${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setTemplateName(defaultName);
    setSaveModalOpen(true);
  }, []);

  const handleSaveTemplateConfirm = useCallback(async () => {
    if (templates.length >= MAX_TEMPLATES) {
      alert(`最多只能保存 ${MAX_TEMPLATES} 个模板，请先删除一些旧模板`);
      return;
    }

    let thumbnail = '';
    if (gridPreviewRef.current) {
      try {
        thumbnail = await captureThumbnail(gridPreviewRef.current, 200, 150);
      } catch (e) {
        console.warn('Failed to capture thumbnail', e);
      }
    }

    const name = templateName.trim() || '未命名布局';
    const template = serializeTemplate(gridConfig, name, thumbnail);
    setTemplates(prev => [template, ...prev]);
    setSaveModalOpen(false);
    setTemplateName('');
  }, [templates.length, templateName, gridConfig]);

  const handleLoadTemplate = useCallback((template: Template) => {
    setGridConfig(deserializeTemplate(template));
  }, []);

  const handleDeleteTemplate = useCallback((templateId: string) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId));
  }, []);

  const handleReorderTemplates = useCallback((fromIndex: number, toIndex: number) => {
    setTemplates(prev => {
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  }, []);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#1e1e2e',
      padding: '16px',
      gap: '16px'
    }}>
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 4px'
      }}>
        <h1 style={{
          fontSize: '20px',
          fontWeight: 700,
          color: '#e0e0e0',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{
            fontSize: '28px',
            display: 'inline-block'
          }}>🎨</span>
          CSS Grid Layout Designer
          <span style={{
            fontSize: '12px',
            fontWeight: 400,
            color: '#6a6a8a',
            backgroundColor: '#282840',
            padding: '3px 10px',
            borderRadius: '4px',
            marginLeft: '8px'
          }}>
            v1.0
          </span>
        </h1>
        <div style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          fontSize: '12px',
          color: '#8a8aaa'
        }}>
          <span>提示：点击单元格可设置背景颜色</span>
        </div>
      </header>

      <div style={{
        flex: 1,
        display: 'flex',
        gap: '16px',
        minHeight: 0
      }}>
        <div style={{
          width: '280px',
          flexShrink: 0,
          minWidth: '240px'
        }}>
          <ControlPanel
            config={gridConfig}
            onChange={handleConfigChange}
            onSaveTemplate={handleSaveTemplateClick}
          />
        </div>

        <div style={{
          flex: 1,
          minWidth: 0
        }}>
          <GridPreview
            ref={gridPreviewRef}
            config={gridConfig}
            onCellClick={handleCellClick}
          />
        </div>
      </div>

      <div>
        <TemplatePanel
          templates={templates}
          onLoad={handleLoadTemplate}
          onDelete={handleDeleteTemplate}
          onReorder={handleReorderTemplates}
        />
      </div>

      <ColorPicker
        isOpen={colorPickerOpen}
        position={colorPickerPosition}
        initialColor={activeCellKey && gridConfig.cellColors[activeCellKey] ? stripAlpha(gridConfig.cellColors[activeCellKey]) : '#4fc3f7'}
        colorHistory={colorHistory}
        onConfirm={handleColorConfirm}
        onClose={() => {
          setColorPickerOpen(false);
          setActiveCellKey(null);
        }}
        onAddToHistory={handleAddColorToHistory}
      />

      {saveModalOpen && (
        <div
          onClick={() => setSaveModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'modalFadeIn 0.3s ease-out'
          }}
        >
          <style>{`
            @keyframes modalFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes modalScaleIn {
              from { opacity: 0; transform: scale(0.85); }
              to { opacity: 1; transform: scale(1); }
            }
          `}</style>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#282840',
              borderRadius: '12px',
              padding: '24px',
              width: '400px',
              maxWidth: '90vw',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              animation: 'modalScaleIn 0.2s ease-out'
            }}
          >
            <h3 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#e0e0e0',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>💾</span>
              保存模板
            </h3>

            <label style={{
              display: 'block',
              fontSize: '13px',
              color: '#a0a0c0',
              marginBottom: '8px'
            }}>
              模板名称
            </label>
            <input
              type="text"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveTemplateConfirm()}
              placeholder="输入模板名称..."
              autoFocus
              style={{
                width: '100%',
                padding: '10px 14px',
                backgroundColor: '#1e1e2e',
                border: '1px solid #4a4a6a',
                borderRadius: '6px',
                color: '#e0e0e0',
                fontSize: '14px',
                outline: 'none',
                marginBottom: '20px',
                transition: 'border-color 0.15s ease'
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#4fc3f7')}
              onBlur={e => (e.currentTarget.style.borderColor = '#4a4a6a')}
            />

            <div style={{
              backgroundColor: '#1e1e2e',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '20px',
              fontSize: '12px',
              color: '#8a8aaa'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>网格大小</span>
                <span style={{ color: '#c0c0e0', fontFamily: 'monospace' }}>{gridConfig.columns} × {gridConfig.rows}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>行高</span>
                <span style={{ color: '#c0c0e0', fontFamily: 'monospace' }}>{gridConfig.rowHeight}px</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>间距</span>
                <span style={{ color: '#c0c0e0', fontFamily: 'monospace' }}>{gridConfig.columnGap}px / {gridConfig.rowGap}px</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>已着色单元格</span>
                <span style={{ color: '#c0c0e0', fontFamily: 'monospace' }}>{Object.keys(gridConfig.cellColors).length}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setSaveModalOpen(false)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '6px',
                  border: '1px solid #4a4a6a',
                  backgroundColor: 'transparent',
                  color: '#a0a0c0',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#3a3a5a')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                取消
              </button>
              <button
                onClick={handleSaveTemplateConfirm}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#4fc3f7',
                  color: '#1e1e2e',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#81d4fa')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#4fc3f7')}
              >
                确认保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function stripAlpha(color: string): string {
  if (color.startsWith('#')) return color;
  const rgbaMatch = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!rgbaMatch) return '#4fc3f7';
  const [, r, g, b] = rgbaMatch;
  const toHex = (n: string) => {
    const hex = parseInt(n).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
