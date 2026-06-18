import React, { useEffect, useState, useRef, useCallback, useSyncExternalStore } from 'react';
import {
  useTimelineStore,
  EventCategory,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
} from './timelineStore';
import TimelineCanvas from './TimelineCanvas';
import StatsPanel from './StatsPanel';
import {
  parseCSVToEvents,
  parseJSONToEvents,
  exportEventsToJSON,
} from './timeAnalyzer';

function useIsMobile() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('resize', cb);
      return () => window.removeEventListener('resize', cb);
    },
    () => window.innerWidth < 768
  );
}

const CATEGORIES: EventCategory[] = ['sleep', 'work', 'study', 'exercise', 'leisure', 'other'];

export default function App() {
  const loadFromStorage = useTimelineStore((s) => s.loadFromStorage);
  const events = useTimelineStore((s) => s.events);
  const selectedDate = useTimelineStore((s) => s.selectedDate);
  const setSelectedDate = useTimelineStore((s) => s.setSelectedDate);
  const editingEventId = useTimelineStore((s) => s.editingEventId);
  const setEditingEventId = useTimelineStore((s) => s.setEditingEventId);
  const updateEvent = useTimelineStore((s) => s.updateEvent);
  const importEvents = useTimelineStore((s) => s.importEvents);

  const [contextMenu, setContextMenu] = useState<{
    eventId: string;
    x: number;
    y: number;
  } | null>(null);

  const [statsPanelOpen, setStatsPanelOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const isMobile = useIsMobile();
  const [importText, setImportText] = useState('');
  const [exportInfo, setExportInfo] = useState<{ sizeKB: string; count: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    const handler = () => setContextMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  const editingEvent = editingEventId
    ? events.find((e) => e.id === editingEventId) || null
    : null;

  const [editTitle, setEditTitle] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editCategory, setEditCategory] = useState<EventCategory>('other');

  useEffect(() => {
    if (editingEvent) {
      setEditTitle(editingEvent.title);
      setEditNote(editingEvent.note);
      setEditCategory(editingEvent.category);
    }
  }, [editingEvent]);

  const handleEditSave = () => {
    if (!editingEventId) return;
    updateEvent(editingEventId, {
      title: editTitle.slice(0, 50),
      note: editNote.slice(0, 200),
      category: editCategory,
    });
    setEditingEventId(null);
  };

  const handleContextMenu = useCallback((id: string | null, x: number, y: number) => {
    if (id) {
      setContextMenu({ eventId: id, x, y });
    } else {
      setContextMenu(null);
    }
  }, []);

  const handleContextAction = (action: 'delete' | `category-${string}`) => {
    if (!contextMenu) return;
    if (action === 'delete') {
      useTimelineStore.getState().deleteEvent(contextMenu.eventId);
    } else if (action.startsWith('category-')) {
      const cat = action.replace('category-', '') as EventCategory;
      updateEvent(contextMenu.eventId, { category: cat });
    }
    setContextMenu(null);
  };

  const handleImportJSON = () => {
    const parsed = parseJSONToEvents(importText);
    if (parsed.length > 0) {
      importEvents(parsed);
      setImportModalOpen(false);
      setImportText('');
    }
  };

  const handleImportCSV = () => {
    const parsed = parseCSVToEvents(importText);
    if (parsed.length > 0) {
      importEvents(parsed);
      setImportModalOpen(false);
      setImportText('');
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (file.name.endsWith('.csv')) {
        const parsed = parseCSVToEvents(text);
        if (parsed.length > 0) importEvents(parsed);
      } else {
        const parsed = parseJSONToEvents(text);
        if (parsed.length > 0) importEvents(parsed);
      }
      setImportModalOpen(false);
      setImportText('');
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    const result = exportEventsToJSON(events);
    setExportInfo({ sizeKB: result.sizeKB, count: result.count });
    const blob = new Blob([result.json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-axis-${selectedDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const navigateDate = (offset: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    const newDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setSelectedDate(newDate);
  };

  const goToday = () => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setSelectedDate(today);
  };

  return (
    <div style={styles.root}>
      <nav style={styles.navbar}>
        <div style={styles.navLeft}>
          <span style={styles.brand}>⏱ 时间轴优化器</span>
          <div style={styles.dateNav}>
            <button style={styles.navBtn} onClick={() => navigateDate(-1)}>
              ◀
            </button>
            <span style={styles.dateDisplay}>{selectedDate}</span>
            <button style={styles.navBtn} onClick={() => navigateDate(1)}>
              ▶
            </button>
            <button style={styles.todayBtn} onClick={goToday}>
              今天
            </button>
          </div>
        </div>
        <div style={styles.navRight}>
          <button style={styles.actionBtn} onClick={() => setImportModalOpen(true)}>
            导入
          </button>
          <button style={styles.actionBtn} onClick={handleExport}>
            导出
          </button>
          {exportInfo && (
            <span style={styles.exportInfo}>
              {exportInfo.count}条 · {exportInfo.sizeKB}KB
            </span>
          )}
          {isMobile && (
            <button
              style={styles.mobileStatsBtn}
              onClick={() => setStatsPanelOpen(!statsPanelOpen)}
            >
              📊
            </button>
          )}
        </div>
      </nav>

      <div style={styles.main}>
        <div style={styles.timelineArea} data-timeline-area>
          <TimelineCanvas
            onEditEvent={(id) => setEditingEventId(id)}
            onContextMenu={handleContextMenu}
          />
        </div>
        <div
          style={{
            ...styles.statsArea,
            ...(isMobile
              ? statsPanelOpen
                ? styles.statsAreaMobileOpen
                : styles.statsAreaMobileClosed
              : {}),
          }}
        >
          <StatsPanel />
          {isMobile && (
            <button
              style={styles.closeStatsBtn}
              onClick={() => setStatsPanelOpen(false)}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {contextMenu && (
        <div
          style={{
            ...styles.contextMenu,
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {CATEGORIES.map((cat) => (
            <div
              key={cat}
              style={styles.contextMenuItem}
              onClick={() => handleContextAction(`category-${cat}`)}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: CATEGORY_COLORS[cat],
                  marginRight: 8,
                }}
              />
              {CATEGORY_LABELS[cat]}
            </div>
          ))}
          <div style={styles.contextMenuDivider} />
          <div
            style={{ ...styles.contextMenuItem, color: '#d48a8a' }}
            onClick={() => handleContextAction('delete')}
          >
            删除事件
          </div>
        </div>
      )}

      {editingEvent && (
        <div style={styles.modalOverlay} onClick={() => setEditingEventId(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>编辑事件</h3>
            <div style={styles.formGroup}>
              <label style={styles.label}>标题</label>
              <input
                style={styles.input}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={50}
                autoFocus
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>备注（200字以内）</label>
              <textarea
                style={styles.textarea}
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                maxLength={200}
                rows={3}
              />
              <span style={styles.charCount}>{editNote.length}/200</span>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>类型</label>
              <div style={styles.categoryGrid}>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    style={{
                      ...styles.categoryBtn,
                      background:
                        editCategory === cat
                          ? CATEGORY_COLORS[cat]
                          : 'rgba(255,255,255,0.05)',
                      color: editCategory === cat ? '#fff' : 'rgba(255,255,255,0.5)',
                      borderColor:
                        editCategory === cat
                          ? CATEGORY_COLORS[cat]
                          : 'rgba(255,255,255,0.1)',
                    }}
                    onClick={() => setEditCategory(cat)}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>
            <div style={styles.modalActions}>
              <button
                style={styles.cancelBtn}
                onClick={() => setEditingEventId(null)}
              >
                取消
              </button>
              <button style={styles.saveBtn} onClick={handleEditSave}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {importModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setImportModalOpen(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>导入数据</h3>
            <div style={styles.formGroup}>
              <label style={styles.label}>粘贴JSON或CSV数据</label>
              <textarea
                style={{ ...styles.textarea, height: 120 }}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder='JSON格式: [{"title":"...","category":"work","startHour":9,"duration":2,"date":"2024-01-01"}]&#10;CSV格式: title,category,startHour,duration,date'
              />
            </div>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setImportModalOpen(false)}>
                取消
              </button>
              <button style={styles.saveBtn} onClick={handleImportJSON}>
                导入JSON
              </button>
              <button
                style={{ ...styles.saveBtn, background: 'rgba(139,125,168,0.5)' }}
                onClick={handleImportCSV}
              >
                导入CSV
              </button>
            </div>
            <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
              <label style={styles.label}>或从文件导入</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv"
                onChange={handleFileImport}
                style={{ color: '#aaa', fontSize: 12, marginTop: 6 }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: '100vw',
    height: '100vh',
    background: 'linear-gradient(180deg, #1e1e2e 0%, #2d2d44 100%)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  navbar: {
    height: 52,
    background: 'rgba(30,30,46,0.75)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    flexShrink: 0,
    zIndex: 100,
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
  },
  brand: {
    fontSize: 16,
    fontWeight: 700,
    color: '#e0e0e0',
    letterSpacing: '0.5px',
  },
  dateNav: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  navBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 4,
    color: '#bbb',
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: 12,
  },
  dateDisplay: {
    color: '#ddd',
    fontSize: 14,
    fontWeight: 600,
    minWidth: 100,
    textAlign: 'center' as const,
  },
  todayBtn: {
    background: 'rgba(107,143,113,0.3)',
    border: '1px solid rgba(107,143,113,0.4)',
    borderRadius: 4,
    color: '#b0d4b5',
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: 11,
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 4,
    color: '#bbb',
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: 12,
    transition: 'background 0.2s',
  },
  exportInfo: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  mobileStatsBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 4,
    color: '#bbb',
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: 16,
  },
  main: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    position: 'relative',
  },
  timelineArea: {
    flex: '0 0 70%',
    maxWidth: '70%',
    height: '100%',
    position: 'relative',
  },
  statsArea: {
    flex: '0 0 30%',
    maxWidth: '30%',
    height: '100%',
    background: 'rgba(26,26,42,0.6)',
    borderLeft: '1px solid rgba(255,255,255,0.06)',
    overflowY: 'auto',
    position: 'relative',
  },
  statsAreaMobileOpen: {
    position: 'fixed',
    right: 0,
    top: 52,
    bottom: 0,
    width: '85%',
    maxWidth: 'none',
    flex: 'none',
    zIndex: 200,
    background: 'rgba(26,26,42,0.95)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    transition: 'transform 0.3s ease',
    transform: 'translateX(0)',
  },
  statsAreaMobileClosed: {
    position: 'fixed',
    right: 0,
    top: 52,
    bottom: 0,
    width: '85%',
    maxWidth: 'none',
    flex: 'none',
    zIndex: 200,
    transform: 'translateX(100%)',
    transition: 'transform 0.3s ease',
  },
  closeStatsBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    background: 'rgba(255,255,255,0.08)',
    border: 'none',
    borderRadius: 4,
    color: '#bbb',
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: 14,
  },
  contextMenu: {
    position: 'fixed',
    background: 'rgba(30,30,50,0.95)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: '4px 0',
    minWidth: 140,
    zIndex: 500,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  contextMenuItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  contextMenuDivider: {
    height: 1,
    background: 'rgba(255,255,255,0.08)',
    margin: '4px 0',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 400,
  },
  modal: {
    background: 'rgba(36,36,56,0.97)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 24,
    width: 420,
    maxWidth: '90vw',
    boxShadow: '0 16px 64px rgba(0,0,0,0.5)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#eee',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    display: 'block',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    background: 'rgba(255,255,255,0.05)',
    color: '#ddd',
    fontSize: 14,
    outline: 'none',
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    background: 'rgba(255,255,255,0.05)',
    color: '#ddd',
    fontSize: 13,
    outline: 'none',
    resize: 'vertical' as const,
  },
  charCount: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    display: 'block',
    textAlign: 'right' as const,
    marginTop: 2,
  },
  categoryGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  categoryBtn: {
    padding: '6px 12px',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 20,
  },
  cancelBtn: {
    padding: '8px 16px',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    background: 'transparent',
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    fontSize: 13,
  },
  saveBtn: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: 6,
    background: 'rgba(107,143,113,0.5)',
    color: '#b0d4b5',
    cursor: 'pointer',
    fontSize: 13,
  },
};
