import React, { useState } from 'react';
import { useWhiteboardStore } from '@/store/useWhiteboardStore';
import type { NoteColor } from '@/types';
import {
  Pencil, Palette, StickyNote, Undo2, Redo2, Trash2,
  ChevronDown,
} from 'lucide-react';

const COLORS = [
  { value: '#EF4444', label: '红' },
  { value: '#3B82F6', label: '蓝' },
  { value: '#22C55E', label: '绿' },
  { value: '#000000', label: '黑' },
  { value: '#8B5CF6', label: '紫' },
];

const WIDTHS = [
  { value: 1, label: '细' },
  { value: 3, label: '中' },
  { value: 5, label: '粗' },
  { value: 8, label: '特粗' },
];

const NOTE_COLORS: { value: NoteColor; label: string; hex: string }[] = [
  { value: 'yellow', label: '黄色', hex: '#FEF08A' },
  { value: 'pink', label: '粉色', hex: '#FBCFE8' },
  { value: 'lightblue', label: '浅蓝', hex: '#BAE6FD' },
];

export function Toolbar() {
  const {
    penColor, penWidth, noteColor,
    setPenColor, setPenWidth, setNoteColor,
    addNote, undo, redo, clear,
    history, historyIndex,
  } = useWhiteboardStore();

  const [showNoteColors, setShowNoteColors] = useState(false);

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <aside className="toolbar">
      <div className="toolbar-section">
        <div className="toolbar-label">画笔</div>
        <div className="color-grid">
          {COLORS.map(c => (
            <button
              key={c.value}
              className={`tool-btn color-btn ${penColor === c.value ? 'active' : ''}`}
              style={{ backgroundColor: c.value }}
              onClick={() => setPenColor(c.value)}
              title={c.label}
            />
          ))}
        </div>
      </div>

      <div className="toolbar-section">
        <div className="toolbar-label">粗细</div>
        <div className="width-grid">
          {WIDTHS.map(w => (
            <button
              key={w.value}
              className={`tool-btn width-btn ${penWidth === w.value ? 'active' : ''}`}
              onClick={() => setPenWidth(w.value)}
              title={w.label}
            >
              <span
                className="width-dot"
                style={{ width: Math.max(w.value * 2, 4), height: Math.max(w.value * 2, 4) }}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-section">
        <div className="toolbar-label">便签</div>
        <div className="note-color-section">
          <button className="tool-btn action-btn" onClick={addNote} title="添加便签">
            <StickyNote size={20} />
          </button>
          <button
            className={`tool-btn action-btn note-color-toggle ${showNoteColors ? 'active' : ''}`}
            onClick={() => setShowNoteColors(!showNoteColors)}
            title="便签颜色"
          >
            <Palette size={16} />
            <ChevronDown size={12} />
          </button>
        </div>
        {showNoteColors && (
          <div className="note-color-dropdown">
            {NOTE_COLORS.map(nc => (
              <button
                key={nc.value}
                className={`note-color-option ${noteColor === nc.value ? 'selected' : ''}`}
                style={{ backgroundColor: nc.hex }}
                onClick={() => { setNoteColor(nc.value); setShowNoteColors(false); }}
                title={nc.label}
              />
            ))}
          </div>
        )}
      </div>

      <div className="toolbar-section">
        <div className="toolbar-label">操作</div>
        <button
          className={`tool-btn action-btn ${!canUndo ? 'disabled' : ''}`}
          onClick={undo}
          disabled={!canUndo}
          title="撤销"
        >
          <Undo2 size={20} />
        </button>
        <button
          className={`tool-btn action-btn ${!canRedo ? 'disabled' : ''}`}
          onClick={redo}
          disabled={!canRedo}
          title="重做"
        >
          <Redo2 size={20} />
        </button>
      </div>

      <div className="toolbar-section toolbar-bottom">
        <button className="tool-btn action-btn danger" onClick={clear} title="清空画布">
          <Trash2 size={20} />
        </button>
      </div>
    </aside>
  );
}
