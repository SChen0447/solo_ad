import React from 'react';
import { Undo2, Redo2, StickyNote, Square, PenTool, MousePointer2, History } from 'lucide-react';
import { useWhiteboardStore } from '@/store';

const Toolbar: React.FC = () => {
  const tool = useWhiteboardStore(s => s.tool);
  const setTool = useWhiteboardStore(s => s.setTool);
  const undo = useWhiteboardStore(s => s.undo);
  const redo = useWhiteboardStore(s => s.redo);
  const toggleSidebar = useWhiteboardStore(s => s.toggleSidebar);
  const sidebarOpen = useWhiteboardStore(s => s.sidebarOpen);
  const historyState = useWhiteboardStore(s => s.historyState);

  const canUndo = historyState.past.length > 0;
  const canRedo = historyState.future.length > 0;

  const toolButtons = [
    { id: 'select' as const, icon: MousePointer2, label: '选择' },
    { id: 'sticky' as const, icon: StickyNote, label: '便签' },
    { id: 'rectangle' as const, icon: Square, label: '矩形' },
    { id: 'path' as const, icon: PenTool, label: '手绘' },
  ];

  return (
    <div style={styles.toolbar}>
      <div style={styles.group}>
        {toolButtons.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            title={label}
            onClick={() => setTool(id)}
            style={{
              ...styles.button,
              ...(tool === id ? styles.activeButton : {}),
            }}
          >
            <Icon size={18} />
            <span style={styles.buttonLabel}>{label}</span>
          </button>
        ))}
      </div>

      <div style={styles.separator} />

      <div style={styles.group}>
        <button
          title="撤销 (Ctrl+Z)"
          onClick={undo}
          disabled={!canUndo}
          style={{
            ...styles.button,
            ...(!canUndo ? styles.disabledButton : {}),
          }}
        >
          <Undo2 size={18} />
          <span style={styles.buttonLabel}>撤销</span>
        </button>
        <button
          title="重做 (Ctrl+Shift+Z)"
          onClick={redo}
          disabled={!canRedo}
          style={{
            ...styles.button,
            ...(!canRedo ? styles.disabledButton : {}),
          }}
        >
          <Redo2 size={18} />
          <span style={styles.buttonLabel}>重做</span>
        </button>
      </div>

      <div style={styles.separator} />

      <div style={styles.group}>
        <button
          title="操作历史"
          onClick={toggleSidebar}
          style={{
            ...styles.button,
            ...(sidebarOpen ? styles.activeButton : {}),
          }}
        >
          <History size={18} />
          <span style={styles.buttonLabel}>历史</span>
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    height: 56,
    background: '#FFFFFF',
    borderBottom: '1px solid #E2E8F0',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    gap: 8,
    zIndex: 100,
    flexShrink: 0,
  },
  group: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  separator: {
    width: 1,
    height: 28,
    background: '#E2E8F0',
    margin: '0 8px',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    border: 'none',
    borderRadius: 8,
    background: 'transparent',
    color: '#475569',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    transition: 'all 0.2s ease',
    outline: 'none',
  },
  activeButton: {
    background: '#EEF2FF',
    color: '#6366F1',
    boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.15)',
  },
  disabledButton: {
    opacity: 0.35,
    cursor: 'not-allowed',
  },
  buttonLabel: {
    fontSize: 13,
  },
};

export default Toolbar;
