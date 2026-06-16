import React, { useState, useRef } from 'react';
import { Save, Download, Upload, Share2, Trash2, Edit3, Check, X, Copy } from 'lucide-react';
import { saveAs } from 'file-saver';
import { Theme, ThemeColors, COLOR_KEYS, isValidThemeColors } from './types';

const STORAGE_KEY = 'color-theme-studio-themes';

interface ThemeManagerProps {
  currentColors: ThemeColors;
  onLoadTheme: (colors: ThemeColors) => void;
}

function loadThemes(): Theme[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveThemes(themes: Theme[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
}

const ThemeManager: React.FC<ThemeManagerProps> = ({ currentColors, onLoadTheme }) => {
  const [themes, setThemes] = useState<Theme[]>(loadThemes);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('未命名主题');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const handleSave = () => {
    const now = new Date().toISOString();
    const newTheme: Theme = {
      ...currentColors,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name: saveName || '未命名主题',
      createdAt: now,
      updatedAt: now,
    };
    const updated = [newTheme, ...themes];
    setThemes(updated);
    saveThemes(updated);
    setShowSaveModal(false);
    setSaveName('未命名主题');
    showToast('主题已保存');
  };

  const handleLoad = (theme: Theme) => {
    const colors: ThemeColors = {} as ThemeColors;
    COLOR_KEYS.forEach((key) => { colors[key] = theme[key]; });
    onLoadTheme(colors);
    showToast(`已加载主题：${theme.name}`);
  };

  const handleDelete = (id: string) => {
    const updated = themes.filter((t) => t.id !== id);
    setThemes(updated);
    saveThemes(updated);
    showToast('主题已删除');
  };

  const handleRename = (id: string) => {
    const updated = themes.map((t) =>
      t.id === id ? { ...t, name: editingName || t.name, updatedAt: new Date().toISOString() } : t
    );
    setThemes(updated);
    saveThemes(updated);
    setEditingId(null);
  };

  const handleExport = () => {
    const data = {
      name: '未命名主题',
      colors: currentColors,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    saveAs(blob, `theme-${Date.now()}.json`);
    showToast('主题已导出');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.colors && isValidThemeColors(data.colors)) {
          onLoadTheme(data.colors);
          showToast('主题已导入');
        } else if (isValidThemeColors(data)) {
          onLoadTheme(data);
          showToast('主题已导入');
        } else {
          showToast('无效的主题文件');
        }
      } catch {
        showToast('无效的主题文件');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleShare = () => {
    try {
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(currentColors))));
      const url = `${window.location.origin}${window.location.pathname}?theme=${encoded}`;
      navigator.clipboard.writeText(url).then(() => {
        showToast('分享链接已复制到剪贴板');
      }).catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('分享链接已复制到剪贴板');
      });
    } catch {
      showToast('生成分享链接失败');
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div>
      <div className="subsection-title">Theme Manager</div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button className="action-btn primary" onClick={() => setShowSaveModal(true)}>
          <Save size={14} /> Save
        </button>
        <button className="action-btn" onClick={handleExport}>
          <Download size={14} /> Export
        </button>
        <button className="action-btn" onClick={() => fileInputRef.current?.click()}>
          <Upload size={14} /> Import
        </button>
        <button className="action-btn" onClick={handleShare}>
          <Share2 size={14} /> Share
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleImport}
        />
      </div>

      {themes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-secondary)', fontSize: 13 }}>
          No saved themes yet. Click Save to start.
        </div>
      )}

      {themes.map((theme) => (
        <div
          key={theme.id}
          className="theme-manager-card"
          onClick={() => handleLoad(theme)}
        >
          <div className="theme-color-dots">
            <div className="theme-color-dot" style={{ backgroundColor: theme.primary }} />
            <div className="theme-color-dot" style={{ backgroundColor: theme.secondary }} />
            <div className="theme-color-dot" style={{ backgroundColor: theme.accent }} />
            <div className="theme-color-dot" style={{ backgroundColor: theme.background }} />
            <div className="theme-color-dot" style={{ backgroundColor: theme.error }} />
          </div>
          <div className="theme-card-info">
            {editingId === theme.id ? (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                <input
                  className="modal-input"
                  style={{ marginBottom: 0, fontSize: 13, padding: '4px 8px' }}
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRename(theme.id); if (e.key === 'Escape') setEditingId(null); }}
                  autoFocus
                />
                <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleRename(theme.id); }}><Check size={14} /></button>
                <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setEditingId(null); }}><X size={14} /></button>
              </div>
            ) : (
              <div className="theme-card-name">{theme.name}</div>
            )}
            <div className="theme-card-time">{formatDate(theme.createdAt)}</div>
          </div>
          <div className="theme-card-actions" onClick={(e) => e.stopPropagation()}>
            <button
              className="icon-btn"
              onClick={() => { setEditingId(theme.id); setEditingName(theme.name); }}
              title="Rename"
            >
              <Edit3 size={14} />
            </button>
            <button
              className="icon-btn danger"
              onClick={() => handleDelete(theme.id)}
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}

      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Save Theme</h3>
            <input
              className="modal-input"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Theme name"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            />
            <div className="modal-actions">
              <button className="action-btn" onClick={() => setShowSaveModal(false)}>Cancel</button>
              <button className="action-btn primary" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

export default ThemeManager;
