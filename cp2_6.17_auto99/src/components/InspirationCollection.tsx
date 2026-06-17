import { useState, useMemo, useEffect, useRef } from 'react';
import type { InspirationItem } from '../App';

interface Props {
  collection: InspirationItem[];
  onCollectionChange: () => void;
}

type SortOrder = 'desc' | 'asc';

const InspirationCollection = ({ collection, onCollectionChange }: Props) => {
  const [filterTag, setFilterTag] = useState<string>('__all__');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [animKey, setAnimKey] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editTagsInput, setEditTagsInput] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copyTipId, setCopyTipId] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    collection.forEach((item) => item.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [collection]);

  const filtered = useMemo(() => {
    let list = collection.slice(0, 100);
    if (filterTag !== '__all__') {
      list = list.filter((item) => item.tags.includes(filterTag));
    }
    list.sort((a, b) => {
      const diff = a.timestamp - b.timestamp;
      return sortOrder === 'desc' ? -diff : diff;
    });
    return list;
  }, [collection, filterTag, sortOrder]);

  const filteredIds = useMemo(() => new Set(filtered.map((i) => i.id)), [filtered]);

  const allSelectedInView =
    filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id));

  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [filterTag, sortOrder, collection.length]);

  useEffect(() => {
    if (editingId && noteRef.current) {
      noteRef.current.focus();
    }
  }, [editingId]);

  useEffect(() => {
    if (!selectMode) {
      setSelectedIds(new Set());
      setShowDeleteConfirm(false);
    }
  }, [selectMode]);

  const startEdit = (item: InspirationItem) => {
    setEditingId(item.id);
    setEditNote(item.note);
    setEditTagsInput([...item.tags]);
    setTagDraft('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNote('');
    setEditTagsInput([]);
    setTagDraft('');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const item = collection.find((i) => i.id === editingId);
    if (!item) return;
    try {
      await fetch('/api/inspiration/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: item.text,
          note: editNote,
          tags: editTagsInput,
        }),
      });
      onCollectionChange();
    } catch (err) {
      console.error('保存失败:', err);
    } finally {
      cancelEdit();
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await fetch(`/api/inspiration/collection/${id}`, { method: 'DELETE' });
      onCollectionChange();
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const addEditTag = () => {
    const t = tagDraft.trim();
    if (!t) return;
    if (editTagsInput.length >= 3) return;
    if (editTagsInput.includes(t)) {
      setTagDraft('');
      return;
    }
    setEditTagsInput([...editTagsInput, t]);
    setTagDraft('');
  };

  const removeEditTag = (t: string) => {
    setEditTagsInput(editTagsInput.filter((x) => x !== t));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelectedInView) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const batchDelete = async () => {
    const ids = Array.from(selectedIds);
    try {
      for (const id of ids) {
        await fetch(`/api/inspiration/collection/${id}`, { method: 'DELETE' });
      }
      onCollectionChange();
      setSelectedIds(new Set());
      setShowDeleteConfirm(false);
      if (selectedIds.size === filtered.length) {
        setSelectMode(false);
      }
    } catch (err) {
      console.error('批量删除失败:', err);
    }
  };

  const batchExport = () => {
    const items = collection.filter((i) => selectedIds.has(i.id));
    const data = items.map((item) => ({
      id: item.id,
      text: item.text,
      note: item.note,
      tags: item.tags,
      createdAt: new Date(item.timestamp).toISOString(),
    }));
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `灵感收藏_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const shareItem = async (item: InspirationItem) => {
    const text = `💡 ${item.text}\n\n📝 备注：${item.note || '（无）'}\n🏷️ 标签：${item.tags.length ? item.tags.map((t) => '#' + t).join(' ') : '（无）'}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopyTipId(item.id);
      setTimeout(() => setCopyTipId((prev) => (prev === item.id ? null : prev)), 1500);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${mm}`;
  };

  return (
    <>
      <style>{`
        .collection-wrapper {
          display: flex;
          flex-direction: column;
          gap: 24px;
          position: relative;
        }
        .collection-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }
        .collection-title {
          font-size: 24px;
          font-weight: 700;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .collection-count {
          font-size: 14px;
          font-weight: 500;
          padding: 4px 12px;
          border-radius: 999px;
          background: rgba(139, 92, 246, 0.2);
          color: #c4b5fd;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .select-mode-btn {
          padding: 9px 18px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .select-mode-btn.normal {
          background: rgba(139, 92, 246, 0.15);
          color: #c4b5fd;
          border: 1px solid rgba(139, 92, 246, 0.3);
        }
        .select-mode-btn.normal:hover {
          background: rgba(139, 92, 246, 0.28);
          color: #fff;
          transform: translateY(-1px);
        }
        .select-mode-btn.active {
          background: linear-gradient(135deg, #6b46c1 0%, #a855f7 100%);
          color: #fff;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.35);
        }
        .select-mode-btn.active:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(139, 92, 246, 0.45); }

        .filter-bar {
          display: flex;
          gap: 14px;
          align-items: center;
          flex-wrap: wrap;
          padding: 16px 20px;
          background: rgba(30, 30, 46, 0.6);
          border: 1px solid rgba(139, 92, 246, 0.15);
          border-radius: 16px;
          backdrop-filter: blur(4px);
        }
        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .filter-label {
          font-size: 13px;
          color: #9ca3af;
          font-weight: 500;
        }
        .filter-select {
          padding: 8px 34px 8px 14px;
          background: #374151;
          color: #fff;
          border: 1px solid #4b5563;
          border-radius: 10px;
          font-size: 14px;
          outline: none;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .filter-select:hover { border-color: #6b7280; }
        .filter-select:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139,92,246,0.2); }

        .select-all-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
        }
        .select-all-label {
          font-size: 13px;
          color: #9ca3af;
          cursor: pointer;
          user-select: none;
        }
        .custom-checkbox {
          width: 18px;
          height: 18px;
          border-radius: 5px;
          border: 2px solid #4b5563;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #374151;
          transition: all 0.2s ease;
          cursor: pointer;
          flex-shrink: 0;
        }
        .custom-checkbox.checked {
          background: #8b5cf6;
          border-color: #8b5cf6;
        }
        .custom-checkbox.indeterminate {
          background: #8b5cf6;
          border-color: #8b5cf6;
        }
        .custom-check-svg {
          width: 12px;
          height: 12px;
          stroke: #fff;
          stroke-width: 3;
          fill: none;
        }

        .grid-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
          padding-bottom: 100px;
        }

        @keyframes staggerFadeIn {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .collect-card {
          height: 200px;
          background: #2a2a3e;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          position: relative;
          border: 1px solid rgba(255,255,255,0.04);
          transition: all 0.3s ease;
          opacity: 0;
          animation: staggerFadeIn 0.5s ease forwards;
          overflow: hidden;
        }
        .collect-card:hover {
          transform: translateY(-4px);
          border-color: rgba(139, 92, 246, 0.35);
          box-shadow: 0 12px 32px rgba(0,0,0,0.3);
        }
        .collect-card.selected {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.5), 0 12px 32px rgba(139, 92, 246, 0.25);
        }

        .card-checkbox {
          position: absolute;
          top: 12px;
          left: 12px;
          z-index: 10;
          width: 22px;
          height: 22px;
          border-radius: 6px;
          border: 2px solid rgba(255,255,255,0.3);
          background: rgba(42, 42, 62, 0.9);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.25s ease;
          cursor: pointer;
        }
        .card-checkbox.checked {
          background: #8b5cf6;
          border-color: #8b5cf6;
          transform: scale(1.05);
        }
        .card-checkbox:hover {
          border-color: #c4b5fd;
        }

        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.6); }
          60% { opacity: 1; transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        .card-checkbox.checked .custom-check-svg {
          animation: popIn 0.3s ease;
        }

        .card-text {
          color: #fff;
          font-size: 15px;
          line-height: 1.55;
          font-weight: 600;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          flex-shrink: 0;
        }
        .select-mode .card-text { padding-left: 32px; }

        .card-note-wrap {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }
        .card-note-display {
          font-size: 13px;
          line-height: 1.5;
          color: #9ca3af;
          padding: 8px 10px;
          background: rgba(55, 65, 81, 0.5);
          border-radius: 8px;
          cursor: pointer;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          transition: all 0.3s ease;
          border: 1px solid transparent;
          flex: 1;
        }
        .card-note-display:hover {
          border-color: rgba(139, 92, 246, 0.4);
          color: #d1d5db;
        }
        .card-note-display.empty { color: #6b7280; font-style: italic; }
        .card-note-edit {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .card-note-input {
          flex: 1;
          min-height: 0;
          padding: 8px 10px;
          background: #374151;
          color: #fff;
          border: 1px solid #4b5563;
          border-radius: 8px;
          font-size: 13px;
          line-height: 1.5;
          resize: none;
          outline: none;
          transition: all 0.3s ease;
        }
        .card-note-input:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139,92,246,0.2); }
        .edit-tag-row {
          display: flex;
          gap: 6px;
          align-items: center;
          flex-wrap: wrap;
        }
        .edit-tag-input {
          flex: 1;
          min-width: 0;
          padding: 5px 10px;
          background: #374151;
          color: #fff;
          border: 1px solid #4b5563;
          border-radius: 8px;
          font-size: 12px;
          outline: none;
          transition: all 0.3s ease;
        }
        .edit-tag-input:focus { border-color: #8b5cf6; }
        .edit-actions {
          display: flex;
          gap: 6px;
          justify-content: flex-end;
        }
        .edit-btn {
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .edit-btn.save { background: #8b5cf6; color: #fff; }
        .edit-btn.save:hover { background: #7c3aed; }
        .edit-btn.cancel { background: rgba(107, 114, 128, 0.4); color: #d1d5db; }
        .edit-btn.cancel:hover { background: rgba(107, 114, 128, 0.6); }

        .card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          flex-shrink: 0;
        }
        .card-tag {
          padding: 3px 10px;
          border-radius: 999px;
          background: #374151;
          color: #d1d5db;
          font-size: 11px;
          font-weight: 500;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
        }
        .card-tag:hover { transform: scale(1.05); }
        .card-tag-rm {
          display: inline-flex;
          width: 14px;
          height: 14px;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          color: #9ca3af;
          font-size: 10px;
          line-height: 1;
          transition: all 0.2s ease;
        }
        .card-tag-rm:hover { background: rgba(239,68,68,0.3); color: #fca5a5; }

        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
          padding-top: 4px;
          border-top: 1px solid rgba(255,255,255,0.04);
        }
        .card-date {
          font-size: 11px;
          color: #6b7280;
        }
        .card-actions {
          display: flex;
          gap: 4px;
        }
        .icon-btn {
          width: 26px;
          height: 26px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          transition: all 0.2s ease;
          position: relative;
        }
        .icon-btn:hover { background: rgba(139,92,246,0.2); color: #c4b5fd; }
        .icon-btn.del:hover { background: rgba(239,68,68,0.2); color: #fca5a5; }
        .icon-btn.share { position: relative; }
        .icon-btn.share:hover { background: rgba(52, 211, 153, 0.2); color: #6ee7b7; }

        .copy-toast {
          position: absolute;
          bottom: 100%;
          right: 0;
          margin-bottom: 8px;
          padding: 6px 12px;
          background: #10b981;
          color: #fff;
          font-size: 12px;
          font-weight: 500;
          border-radius: 8px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transform: translateY(4px);
          transition: all 0.25s ease;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }
        .copy-toast.show {
          opacity: 1;
          transform: translateY(0);
        }

        .empty-state {
          grid-column: 1 / -1;
          padding: 80px 20px;
          text-align: center;
          color: #6b7280;
        }
        .empty-emoji { font-size: 56px; margin-bottom: 16px; }
        .empty-title { font-size: 18px; font-weight: 600; color: #9ca3af; margin-bottom: 8px; }
        .empty-desc { font-size: 14px; line-height: 1.6; }

        .floating-bar {
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%) translateY(20px);
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 22px;
          background: rgba(30, 30, 46, 0.95);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 16px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.5);
          z-index: 1000;
          opacity: 0;
          pointer-events: none;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .floating-bar.show {
          opacity: 1;
          pointer-events: auto;
          transform: translateX(-50%) translateY(0);
        }
        .selected-info {
          font-size: 14px;
          color: #d1d5db;
          padding-right: 10px;
          border-right: 1px solid rgba(255,255,255,0.1);
        }
        .selected-info strong { color: #fbbf24; font-weight: 600; margin: 0 2px; }

        .batch-btn {
          padding: 9px 18px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
        }
        .batch-btn.export {
          background: rgba(52, 211, 153, 0.15);
          color: #6ee7b7;
          border: 1px solid rgba(52, 211, 153, 0.3);
        }
        .batch-btn.export:hover { background: rgba(52, 211, 153, 0.3); color: #fff; transform: translateY(-1px); }
        .batch-btn.delete {
          background: rgba(239, 68, 68, 0.15);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .batch-btn.delete:hover { background: rgba(239, 68, 68, 0.3); color: #fff; transform: translateY(-1px); }
        .batch-btn.exit {
          background: rgba(107, 114, 128, 0.2);
          color: #d1d5db;
          border: 1px solid rgba(107, 114, 128, 0.3);
        }
        .batch-btn.exit:hover { background: rgba(107, 114, 128, 0.4); color: #fff; }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.25s ease;
        }
        .modal-overlay.show {
          opacity: 1;
          pointer-events: auto;
        }
        .modal-box {
          background: #2a2a3e;
          border: 1px solid rgba(139, 92, 246, 0.25);
          border-radius: 16px;
          padding: 28px;
          width: 90%;
          max-width: 400px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          transform: scale(0.9) translateY(10px);
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .modal-overlay.show .modal-box {
          transform: scale(1) translateY(0);
        }
        .modal-title {
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .modal-desc {
          font-size: 14px;
          color: #9ca3af;
          line-height: 1.6;
          margin-bottom: 22px;
        }
        .modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
        .modal-btn {
          padding: 9px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.25s ease;
          cursor: pointer;
        }
        .modal-btn.cancel {
          background: rgba(107, 114, 128, 0.3);
          color: #d1d5db;
        }
        .modal-btn.cancel:hover { background: rgba(107, 114, 128, 0.5); }
        .modal-btn.danger {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: #fff;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
        }
        .modal-btn.danger:hover { box-shadow: 0 6px 18px rgba(239, 68, 68, 0.5); transform: translateY(-1px); }

        @media (max-width: 768px) {
          .grid-container {
            grid-template-columns: 1fr;
          }
          .filter-bar { flex-direction: column; align-items: stretch; }
          .filter-group { justify-content: space-between; }
          .filter-select { flex: 1; }
          .select-all-wrap { margin-left: 0; }
          .floating-bar {
            bottom: 16px;
            width: calc(100% - 32px);
            padding: 12px 16px;
            gap: 8px;
            flex-wrap: wrap;
          }
          .selected-info { border-right: none; padding-right: 0; font-size: 13px; }
          .batch-btn { flex: 1; justify-content: center; padding: 8px 12px; font-size: 13px; }
        }
      `}</style>

      <div className="collection-wrapper">
        <div className="collection-header">
          <div className="collection-title">
            📚 我的收藏
            <span className="collection-count">{collection.length} 条灵感</span>
          </div>

          <div className="header-actions">
            {collection.length > 0 && (
              <button
                className={`select-mode-btn ${selectMode ? 'active' : 'normal'}`}
                onClick={() => setSelectMode(!selectMode)}
              >
                <span>☑️</span>
                {selectMode ? '取消选择' : '选择模式'}
              </button>
            )}
          </div>
        </div>

        <div className="filter-bar">
          <div className="filter-group">
            <span className="filter-label">🏷️ 标签筛选</span>
            <select
              className="filter-select"
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
            >
              <option value="__all__">全部 ({collection.length})</option>
              {allTags.map((t) => {
                const cnt = collection.filter((i) => i.tags.includes(t)).length;
                return (
                  <option key={t} value={t}>
                    #{t} ({cnt})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="filter-group">
            <span className="filter-label">⏱️ 排序方式</span>
            <select
              className="filter-select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            >
              <option value="desc">收藏时间（最新优先）</option>
              <option value="asc">收藏时间（最早优先）</option>
            </select>
          </div>

          {filterTag !== '__all__' && (
            <div style={{ marginLeft: 'auto' }}>
              <button
                className="edit-btn cancel"
                onClick={() => setFilterTag('__all__')}
              >
                清除筛选
              </button>
            </div>
          )}

          {selectMode && (
            <div className="select-all-wrap">
              <div
                className={`custom-checkbox ${allSelectedInView ? 'checked' : selectedIds.size > 0 && !allSelectedInView ? 'indeterminate' : ''}`}
                onClick={toggleSelectAll}
              >
                {allSelectedInView ? (
                  <svg className="custom-check-svg" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : selectedIds.size > 0 && !allSelectedInView ? (
                  <svg width="10" height="2" fill="#fff"><rect width="10" height="2" /></svg>
                ) : null}
              </div>
              <span className="select-all-label" onClick={toggleSelectAll}>
                {allSelectedInView ? '取消全选' : '全选当前视图'}
              </span>
            </div>
          )}
        </div>

        <div className={`grid-container ${selectMode ? 'select-mode' : ''}`} key={animKey}>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-emoji">
                {collection.length === 0 ? '🪄' : '🔍'}
              </div>
              <div className="empty-title">
                {collection.length === 0 ? '还没有收藏任何灵感' : '没有符合条件的灵感'}
              </div>
              <div className="empty-desc">
                {collection.length === 0
                  ? '前往首页生成并收藏你的第一条创意灵感吧！'
                  : '试试切换筛选标签或排序方式'}
              </div>
            </div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={item.id}
                className={`collect-card ${selectedIds.has(item.id) ? 'selected' : ''}`}
                style={{ animationDelay: `${Math.min(idx * 40, 2000)}ms` }}
              >
                {selectMode && (
                  <div
                    className={`card-checkbox ${selectedIds.has(item.id) ? 'checked' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(item.id);
                    }}
                  >
                    {selectedIds.has(item.id) && (
                      <svg className="custom-check-svg" viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                )}

                <div className="card-text">{item.text}</div>

                <div className="card-note-wrap">
                  {editingId === item.id ? (
                    <div className="card-note-edit">
                      <textarea
                        ref={noteRef}
                        className="card-note-input"
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        placeholder="编辑备注…"
                      />
                      <div className="edit-tag-row">
                        {editTagsInput.map((t) => (
                          <span key={t} className="card-tag">
                            #{t}
                            <button
                              className="card-tag-rm"
                              onClick={() => removeEditTag(t)}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        <input
                          className="edit-tag-input"
                          placeholder={editTagsInput.length >= 3 ? '最多3个标签' : '输入标签…'}
                          value={tagDraft}
                          disabled={editTagsInput.length >= 3}
                          onChange={(e) => setTagDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addEditTag();
                            }
                          }}
                        />
                      </div>
                      <div className="edit-actions">
                        <button className="edit-btn cancel" onClick={cancelEdit}>
                          取消
                        </button>
                        <button className="edit-btn save" onClick={saveEdit}>
                          保存
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`card-note-display ${!item.note ? 'empty' : ''}`}
                      onClick={() => startEdit(item)}
                    >
                      {item.note || '📝 点击编辑备注…'}
                    </div>
                  )}
                </div>

                {editingId !== item.id && (
                  <>
                    <div className="card-tags">
                      {item.tags.length === 0 ? (
                        <span style={{ fontSize: 11, color: '#6b7280' }}>无标签</span>
                      ) : (
                        item.tags.map((t) => (
                          <span
                            key={t}
                            className="card-tag"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFilterTag(t);
                            }}
                            style={{ cursor: filterTag === t ? 'default' : 'pointer' }}
                            title={filterTag === t ? '' : `点击筛选 #${t}`}
                          >
                            #{t}
                          </span>
                        ))
                      )}
                    </div>
                    <div className="card-footer">
                      <span className="card-date">{formatDate(item.timestamp)}</span>
                      <div className="card-actions">
                        <button
                          className="icon-btn share"
                          onClick={() => shareItem(item)}
                          title="分享（复制到剪贴板）"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="18" cy="5" r="3" />
                            <circle cx="6" cy="12" r="3" />
                            <circle cx="18" cy="19" r="3" />
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                          </svg>
                          <div className={`copy-toast ${copyTipId === item.id ? 'show' : ''}`}>
                            ✓ 已复制
                          </div>
                        </button>
                        <button
                          className="icon-btn"
                          onClick={() => startEdit(item)}
                          title="编辑"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          className="icon-btn del"
                          onClick={() => {
                            if (confirm('确定要删除这条灵感吗？')) deleteItem(item.id);
                          }}
                          title="删除"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className={`floating-bar ${selectMode && selectedIds.size > 0 ? 'show' : ''}`}>
          <div className="selected-info">
            已选中 <strong>{selectedIds.size}</strong> 条灵感
          </div>
          <button className="batch-btn export" onClick={batchExport}>
            <span>📤</span>
            批量导出
          </button>
          <button className="batch-btn delete" onClick={() => setShowDeleteConfirm(true)}>
            <span>🗑️</span>
            批量删除
          </button>
          <button className="batch-btn exit" onClick={() => setSelectMode(false)}>
            退出
          </button>
        </div>

        <div className={`modal-overlay ${showDeleteConfirm ? 'show' : ''}`} onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              <span>⚠️</span>
              确认批量删除
            </div>
            <div className="modal-desc">
              确定要删除选中的 <strong style={{ color: '#fca5a5' }}>{selectedIds.size} 条</strong> 灵感吗？
              <br />
              删除后无法恢复，请谨慎操作。
            </div>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowDeleteConfirm(false)}>
                取消
              </button>
              <button className="modal-btn danger" onClick={batchDelete}>
                确认删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default InspirationCollection;
