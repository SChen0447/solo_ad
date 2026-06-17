import React, { useState, useEffect } from 'react';
import { Theme } from '../types';
import ColorPicker from './ColorPicker';
import ExportModal from './ExportModal';

interface ThemePanelProps {
  themes: Theme[];
  setThemes: React.Dispatch<React.SetStateAction<Theme[]>>;
  currentThemeId: string;
  setCurrentThemeId: (id: string) => void;
  compareMode: boolean;
  compareThemeId: string;
  setCompareThemeId: (id: string) => void;
  onToggleCompare: () => void;
}

const STORAGE_KEY = 'css-theme-preview-themes';

const ThemePanel: React.FC<ThemePanelProps> = ({
  themes,
  setThemes,
  currentThemeId,
  setCurrentThemeId,
  compareMode,
  compareThemeId,
  setCompareThemeId,
  onToggleCompare
}) => {
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [isNewTheme, setIsNewTheme] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setThemes(parsed);
          return;
        }
      } catch {
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
  }, [themes]);

  const currentTheme = themes.find(t => t.id === currentThemeId) || themes[0];
  const compareTheme = themes.find(t => t.id === compareThemeId) || themes[1];

  const handleAddTheme = () => {
    const newTheme: Theme = {
      id: Date.now().toString(),
      name: '新主题',
      primary: '#6C63FF',
      secondary: '#FF6584',
      background: '#1a1a2e',
      text: '#ffffff'
    };
    setEditingTheme(newTheme);
    setIsNewTheme(true);
  };

  const handleEditTheme = (theme: Theme) => {
    setEditingTheme({ ...theme });
    setIsNewTheme(false);
  };

  const handleSaveTheme = () => {
    if (!editingTheme) return;

    if (isNewTheme) {
      setThemes(prev => [...prev, editingTheme]);
      setCurrentThemeId(editingTheme.id);
    } else {
      setThemes(prev => prev.map(t => t.id === editingTheme.id ? editingTheme : t));
    }
    setEditingTheme(null);
  };

  const handleDeleteTheme = (id: string) => {
    if (themes.length <= 1) {
      alert('至少需要保留一个主题');
      return;
    }
    setThemes(prev => prev.filter(t => t.id !== id));
    if (currentThemeId === id) {
      const remaining = themes.filter(t => t.id !== id);
      setCurrentThemeId(remaining[0].id);
    }
    if (compareThemeId === id) {
      const remaining = themes.filter(t => t.id !== id && t.id !== currentThemeId);
      if (remaining.length > 0) {
        setCompareThemeId(remaining[0].id);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingTheme(null);
  };

  const updateEditingField = (field: keyof Theme, value: string) => {
    setEditingTheme(prev => prev ? { ...prev, [field]: value } : null);
  };

  const panelStyle: React.CSSProperties = isMobile
    ? {
        width: '100%',
        height: 60,
        backgroundColor: 'rgba(30,30,40,0.95)',
        borderRadius: 0,
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        flexShrink: 0,
        position: 'relative',
        zIndex: 10
      }
    : {
        width: 320,
        backgroundColor: 'rgba(30,30,40,0.85)',
        borderRadius: 12,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        flexShrink: 0,
        backdropFilter: 'blur(10px)',
        overflow: 'auto'
      };

  if (isMobile) {
    return (
      <>
        <div style={panelStyle}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              style={{
                height: 36,
                padding: '0 14px',
                borderRadius: 8,
                backgroundColor: currentTheme.primary,
                color: '#fff',
                border: 'none',
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              {currentTheme.name}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: 4,
                  width: 200,
                  backgroundColor: '#2a2a3e',
                  borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  overflow: 'hidden',
                  zIndex: 100
                }}
              >
                {themes.map(theme => (
                  <div
                    key={theme.id}
                    onClick={() => {
                      setCurrentThemeId(theme.id);
                      setShowDropdown(false);
                    }}
                    style={{
                      padding: '10px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      backgroundColor: theme.id === currentThemeId ? 'rgba(108,99,255,0.2)' : 'transparent',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      fontSize: 13,
                      color: '#fff'
                    }}
                  >
                    <div style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      backgroundColor: theme.primary,
                      border: '2px solid ' + theme.secondary
                    }} />
                    {theme.name}
                  </div>
                ))}
                <div
                  onClick={() => {
                    handleAddTheme();
                    setShowDropdown(false);
                  }}
                  style={{
                    padding: '10px 14px',
                    cursor: 'pointer',
                    color: '#6C63FF',
                    fontSize: 13,
                    borderTop: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  + 添加新主题
                </div>
              </div>
            )}
          </div>

          <div style={{ flex: 1 }} />

          <button
            onClick={onToggleCompare}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: 'none',
              backgroundColor: compareMode ? currentTheme.primary : 'rgba(255,255,255,0.1)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            title="对比模式"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="6" y="6" width="14" height="14" rx="2" />
              <rect x="2" y="2" width="14" height="14" rx="2" opacity="0.5" />
            </svg>
          </button>

          <button
            onClick={() => setExportModalOpen(true)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: 'none',
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.3s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'rotate(360deg)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'rotate(0deg)'}
            title="导出"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </div>

        {editingTheme && (
          <MobileThemeEditor
            editingTheme={editingTheme}
            updateEditingField={updateEditingField}
            handleSaveTheme={handleSaveTheme}
            handleCancelEdit={handleCancelEdit}
            isNewTheme={isNewTheme}
          />
        )}

        <ExportModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          currentTheme={currentTheme}
          allThemes={themes}
          primaryColor={currentTheme.primary}
        />
      </>
    );
  }

  return (
    <>
      <div style={panelStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>主题管理</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onToggleCompare}
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                border: 'none',
                backgroundColor: compareMode ? currentTheme.primary : 'rgba(255,255,255,0.1)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              title="对比模式"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="6" y="6" width="14" height="14" rx="2" />
                <rect x="2" y="2" width="14" height="14" rx="2" opacity="0.5" />
              </svg>
            </button>
            <button
              onClick={() => setExportModalOpen(true)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                border: 'none',
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'rotate(360deg)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'rotate(0deg)'}
              title="导出"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
          </div>
        </div>

        {!editingTheme && !compareMode && (
          <div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>主题列表</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflow: 'auto' }}>
              {themes.map(theme => (
                <div
                  key={theme.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderRadius: 8,
                    backgroundColor: theme.id === currentThemeId ? 'rgba(108,99,255,0.2)' : 'rgba(255,255,255,0.04)',
                    border: theme.id === currentThemeId ? `1px solid ${theme.primary}` : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setCurrentThemeId(theme.id)}
                >
                  <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: theme.primary,
                    border: '2px solid ' + theme.secondary,
                    marginRight: 10
                  }} />
                  <span style={{ flex: 1, fontSize: 13, color: '#fff' }}>{theme.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEditTheme(theme); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#888',
                      cursor: 'pointer',
                      padding: 4,
                      marginRight: 4
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteTheme(theme.id); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#888',
                      cursor: 'pointer',
                      padding: 4
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleAddTheme}
              style={{
                width: '100%',
                marginTop: 10,
                height: 38,
                borderRadius: 8,
                border: '1px dashed rgba(255,255,255,0.2)',
                backgroundColor: 'transparent',
                color: '#888',
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#6C63FF';
                e.currentTarget.style.color = '#6C63FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                e.currentTarget.style.color = '#888';
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              添加主题
            </button>
          </div>
        )}

        {compareMode && !editingTheme && (
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>主题 A</div>
              <select
                value={currentThemeId}
                onChange={(e) => setCurrentThemeId(e.target.value)}
                style={{
                  width: '100%',
                  height: 36,
                  padding: '0 10px',
                  borderRadius: 8,
                  border: '1px solid #444',
                  backgroundColor: '#2a2a3e',
                  color: '#fff',
                  fontSize: 13,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {themes.map(theme => (
                  <option key={theme.id} value={theme.id}>{theme.name}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>主题 B</div>
              <select
                value={compareThemeId}
                onChange={(e) => setCompareThemeId(e.target.value)}
                style={{
                  width: '100%',
                  height: 36,
                  padding: '0 10px',
                  borderRadius: 8,
                  border: '1px solid #444',
                  backgroundColor: '#2a2a3e',
                  color: '#fff',
                  fontSize: 13,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {themes.filter(t => t.id !== currentThemeId).map(theme => (
                  <option key={theme.id} value={theme.id}>{theme.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {editingTheme && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#888' }}>
                {isNewTheme ? '新建主题' : '编辑主题'}
              </span>
              <button
                onClick={handleCancelEdit}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 18 }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: '#ccc', display: 'block', marginBottom: 6 }}>主题名称</span>
              <input
                type="text"
                value={editingTheme.name}
                onChange={(e) => updateEditingField('name', e.target.value)}
                style={{
                  width: '100%',
                  height: 36,
                  padding: '0 12px',
                  borderRadius: 8,
                  border: '1px solid #444',
                  backgroundColor: '#2a2a3e',
                  color: '#fff',
                  fontSize: 13,
                  outline: 'none'
                }}
                placeholder="输入主题名称"
              />
            </div>

            <ColorPicker
              label="主色"
              value={editingTheme.primary}
              onChange={(v) => updateEditingField('primary', v)}
            />
            <ColorPicker
              label="辅色"
              value={editingTheme.secondary}
              onChange={(v) => updateEditingField('secondary', v)}
            />
            <ColorPicker
              label="背景色"
              value={editingTheme.background}
              onChange={(v) => updateEditingField('background', v)}
            />
            <ColorPicker
              label="文字色"
              value={editingTheme.text}
              onChange={(v) => updateEditingField('text', v)}
            />

            <button
              onClick={handleSaveTheme}
              style={{
                height: 40,
                marginTop: 8,
                borderRadius: 8,
                border: 'none',
                backgroundColor: editingTheme.primary,
                color: '#fff',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              保存主题
            </button>
          </div>
        )}

        {!editingTheme && !compareMode && currentTheme && (
          <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>当前主题变量</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(['primary', 'secondary', 'background', 'text'] as const).map(key => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    backgroundColor: currentTheme[key],
                    border: '1px solid rgba(255,255,255,0.2)'
                  }} />
                  <span style={{ fontSize: 11, color: '#aaa', fontFamily: 'monospace' }}>
                    --{key}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        currentTheme={currentTheme}
        allThemes={themes}
        primaryColor={currentTheme.primary}
      />
    </>
  );
};

interface MobileThemeEditorProps {
  editingTheme: Theme;
  updateEditingField: (field: keyof Theme, value: string) => void;
  handleSaveTheme: () => void;
  handleCancelEdit: () => void;
  isNewTheme: boolean;
}

const MobileThemeEditor: React.FC<MobileThemeEditorProps> = ({
  editingTheme,
  updateEditingField,
  handleSaveTheme,
  handleCancelEdit,
  isNewTheme
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-end'
      }}
      onClick={handleCancelEdit}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxHeight: '85vh',
          backgroundColor: '#1e1e28',
          borderRadius: '16px 16px 0 0',
          padding: 20,
          overflow: 'auto',
          animation: 'slideUp 0.3s ease-out'
        }}
      >
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>
            {isNewTheme ? '新建主题' : '编辑主题'}
          </span>
          <button
            onClick={handleCancelEdit}
            style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 24 }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: '#ccc', display: 'block', marginBottom: 6 }}>主题名称</span>
          <input
            type="text"
            value={editingTheme.name}
            onChange={(e) => updateEditingField('name', e.target.value)}
            style={{
              width: '100%',
              height: 40,
              padding: '0 12px',
              borderRadius: 8,
              border: '1px solid #444',
              backgroundColor: '#2a2a3e',
              color: '#fff',
              fontSize: 14,
              outline: 'none'
            }}
          />
        </div>

        <ColorPicker label="主色" value={editingTheme.primary} onChange={(v) => updateEditingField('primary', v)} />
        <ColorPicker label="辅色" value={editingTheme.secondary} onChange={(v) => updateEditingField('secondary', v)} />
        <ColorPicker label="背景色" value={editingTheme.background} onChange={(v) => updateEditingField('background', v)} />
        <ColorPicker label="文字色" value={editingTheme.text} onChange={(v) => updateEditingField('text', v)} />

        <button
          onClick={handleSaveTheme}
          style={{
            width: '100%',
            height: 44,
            marginTop: 12,
            borderRadius: 10,
            border: 'none',
            backgroundColor: editingTheme.primary,
            color: '#fff',
            fontSize: 15,
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          保存主题
        </button>
      </div>
    </div>
  );
};

export default ThemePanel;
