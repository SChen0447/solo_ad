import React, { useState, useMemo, useCallback } from 'react';
import {
  Meeting,
  RetroItem,
  ActionItem as ActionItemType,
  ItemCategory,
  createItem,
  deleteItem,
  reorderItems,
  toggleActionComplete,
  updateMeeting as apiUpdateMeeting
} from '../api';
import RetroCard from './RetroCard';
import ActionItem from './ActionItem';
import ChartPanel from './ChartPanel';

interface RetroBoardProps {
  meeting: Meeting;
  onUpdate: (meeting: Meeting) => void;
}

interface AddFormData {
  category: ItemCategory;
  content: string;
  assignee: string;
  dueDate: string;
}

interface DragState {
  category: ItemCategory | null;
  draggingId: string | null;
  fromIndex: number;
}

const COLUMN_CONFIG: Array<{
  key: ItemCategory;
  label: string;
  labelClass: string;
  icon: string;
}> = [
  { key: 'good', label: '做得好', labelClass: 'label-good', icon: '✨' },
  { key: 'improve', label: '待改进', labelClass: 'label-improve', icon: '🔧' },
  { key: 'action', label: '行动项', labelClass: 'label-action', icon: '🎯' }
];

const RetroBoard: React.FC<RetroBoardProps> = ({ meeting, onUpdate }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [addCategory, setAddCategory] = useState<ItemCategory>('good');
  const [addForm, setAddForm] = useState<AddFormData>({
    category: 'good',
    content: '',
    assignee: '',
    dueDate: ''
  });
  const [dragStates, setDragStates] = useState<Record<ItemCategory, DragState>>({
    good: { category: null, draggingId: null, fromIndex: -1 },
    improve: { category: null, draggingId: null, fromIndex: -1 },
    action: { category: null, draggingId: null, fromIndex: -1 }
  });
  const [bounceCounts, setBounceCounts] = useState<Record<ItemCategory, number>>({
    good: 0,
    improve: 0,
    action: 0
  });
  const [sortedLists, setSortedLists] = useState<{
    good: RetroItem[];
    improve: RetroItem[];
    action: ActionItemType[];
  }>({
    good: [...meeting.items.good].sort((a, b) => a.order - b.order),
    improve: [...meeting.items.improve].sort((a, b) => a.order - b.order),
    action: [...meeting.items.action].sort((a, b) => a.order - b.order)
  });

  const updateSortedListsFromMeeting = useCallback(
    (m: Meeting) => {
      setSortedLists({
        good: [...m.items.good].sort((a, b) => a.order - b.order),
        improve: [...m.items.improve].sort((a, b) => a.order - b.order),
        action: [...m.items.action].sort((a, b) => a.order - b.order)
      });
    },
    []
  );

  const triggerCountBounce = (category: ItemCategory) => {
    setBounceCounts((prev) => ({ ...prev, [category]: prev[category] + 1 }));
  };

  const openAddModal = (category: ItemCategory) => {
    setAddCategory(category);
    setAddForm({
      category,
      content: '',
      assignee: meeting.members[0] || '',
      dueDate: ''
    });
    setShowAddModal(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.content.trim()) return;

    try {
      let newItem;
      if (addCategory === 'action') {
        newItem = (await createItem(meeting.id, 'action', {
          content: addForm.content.trim(),
          assignee: addForm.assignee,
          dueDate: addForm.dueDate
        })) as ActionItemType;
        setSortedLists((prev) => ({
          ...prev,
          action: [...prev.action, newItem]
        }));
      } else {
        newItem = (await createItem(meeting.id, addCategory, {
          content: addForm.content.trim()
        })) as RetroItem;
        setSortedLists((prev) => ({
          ...prev,
          [addCategory]: [...(prev[addCategory] as RetroItem[]), newItem]
        }));
      }

      const updatedItems = {
        ...meeting.items,
        [addCategory]: sortedLists[addCategory]
      };
      const updated: Meeting = {
        ...meeting,
        items: {
          good: addCategory === 'good' ? [...meeting.items.good, newItem as RetroItem] : meeting.items.good,
          improve: addCategory === 'improve' ? [...meeting.items.improve, newItem as RetroItem] : meeting.items.improve,
          action: addCategory === 'action' ? [...meeting.items.action, newItem as ActionItemType] : meeting.items.action
        }
      };
      onUpdate(updated);
      triggerCountBounce(addCategory);
      setShowAddModal(false);
      setAddForm({ category: 'good', content: '', assignee: '', dueDate: '' });
    } catch (err) {
      console.error('添加要点失败:', err);
    }
  };

  const handleDeleteItem = async (category: ItemCategory, itemId: string) => {
    try {
      await deleteItem(meeting.id, category, itemId);
      setSortedLists((prev) => ({
        ...prev,
        [category]: (prev[category] as Array<RetroItem | ActionItemType>).filter(
          (i) => i.id !== itemId
        )
      }));
      const newItems = {
        ...meeting.items,
        [category]: meeting.items[category].filter((i) => i.id !== itemId)
      };
      onUpdate({ ...meeting, items: newItems });
      triggerCountBounce(category);
    } catch (err) {
      console.error('删除要点失败:', err);
    }
  };

  const handleToggleComplete = async (actionId: string) => {
    try {
      const updated = await toggleActionComplete(meeting.id, actionId);
      setSortedLists((prev) => ({
        ...prev,
        action: prev.action.map((a) => (a.id === actionId ? updated : a))
      }));
      const newActionItems = meeting.items.action.map((a) =>
        a.id === actionId ? updated : a
      );
      onUpdate({ ...meeting, items: { ...meeting.items, action: newActionItems } });
      triggerCountBounce('action');
    } catch (err) {
      console.error('更新行动项状态失败:', err);
    }
  };

  const handleDragStart = (category: ItemCategory, id: string, index: number) => {
    setDragStates((prev) => ({
      ...prev,
      [category]: { category, draggingId: id, fromIndex: index }
    }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (category: ItemCategory, toIndex: number) => {
    const dragState = dragStates[category];
    if (!dragState.draggingId || dragState.fromIndex === toIndex) {
      return;
    }

    const fromIndex = dragState.fromIndex;
    const list = [...sortedLists[category]] as Array<RetroItem | ActionItemType>;
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    const orderedIds = list.map((i) => i.id);

    const newList = list as any;
    setSortedLists((prev) => ({ ...prev, [category]: newList }));

    setDragStates((prev) => ({
      ...prev,
      [category]: { category: null, draggingId: null, fromIndex: -1 }
    }));

    try {
      await reorderItems(meeting.id, category, orderedIds);
    } catch (err) {
      console.error('排序失败:', err);
    }
  };

  const handleDragEnd = (category: ItemCategory) => {
    setDragStates((prev) => ({
      ...prev,
      [category]: { category: null, draggingId: null, fromIndex: -1 }
    }));
  };

  const handleExport = () => {
    const exportData = {
      title: meeting.title,
      date: meeting.date,
      members: meeting.members,
      exportedAt: new Date().toISOString(),
      summary: {
        goodCount: sortedLists.good.length,
        improveCount: sortedLists.improve.length,
        actionTotal: sortedLists.action.length,
        actionCompleted: sortedLists.action.filter((a) => a.completed).length,
        completionRate:
          sortedLists.action.length > 0
            ? Math.round(
                (sortedLists.action.filter((a) => a.completed).length /
                  sortedLists.action.length) *
                  100
              )
            : 0
      },
      items: {
        good: sortedLists.good.map(({ id, ...rest }) => rest),
        improve: sortedLists.improve.map(({ id, ...rest }) => rest),
        action: sortedLists.action.map(({ id, ...rest }) => rest)
      }
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeTitle = meeting.title.replace(/[\\/:*?"<>|]/g, '_');
    a.href = url;
    a.download = `复盘报告_${safeTitle}_${meeting.date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const allActions = useMemo(() => sortedLists.action, [sortedLists.action]);

  return (
    <div className="retro-board">
      <div className="retro-header">
        <div className="retro-header-info">
          <h2>{meeting.title}</h2>
          <p>
            📅 {meeting.date}
            {meeting.members.length > 0 && (
              <span style={{ marginLeft: '16px' }}>
                👥 {meeting.members.join(' · ')}
              </span>
            )}
          </p>
        </div>
        <div className="retro-actions">
          <button className="btn btn-secondary" onClick={handleExport}>
            📥 导出报告
          </button>
        </div>
      </div>

      <div className="retro-columns">
        {COLUMN_CONFIG.map((col) => {
          const list = sortedLists[col.key] as Array<RetroItem | ActionItemType>;
          const dragState = dragStates[col.key];
          const bounceKey = bounceCounts[col.key];

          return (
            <div className="retro-column" key={col.key}>
              <div className="retro-column-header">
                <div className="retro-column-title">
                  <span className={`column-label ${col.labelClass}`}>
                    {col.icon} {col.label}
                  </span>
                  <span
                    className={`count-badge ${bounceKey > 0 ? 'bounce' : ''}`}
                    key={bounceKey}
                  >
                    {list.length}
                  </span>
                </div>
                <button
                  className="add-btn"
                  onClick={() => openAddModal(col.key)}
                  title={`添加${col.label}`}
                >
                  +
                </button>
              </div>

              <div className="retro-card-list">
                {col.key === 'action'
                  ? (sortedLists.action as ActionItemType[]).map((item, idx) => (
                      <ActionItem
                        key={item.id}
                        item={item}
                        index={idx}
                        onToggleComplete={handleToggleComplete}
                        onDelete={(id) => handleDeleteItem('action', id)}
                        onDragStart={(e, id, i) => handleDragStart('action', id, i)}
                        onDragOver={handleDragOver}
                        onDrop={(e, i) => handleDrop('action', i)}
                        onDragEnd={() => handleDragEnd('action')}
                        isDragging={dragState.draggingId === item.id}
                      />
                    ))
                  : (sortedLists[col.key] as RetroItem[]).map((item, idx) => (
                      <RetroCard
                        key={item.id}
                        item={item}
                        index={idx}
                        onDelete={(id) => handleDeleteItem(col.key, id)}
                        onDragStart={(e, id, i) => handleDragStart(col.key, id, i)}
                        onDragOver={handleDragOver}
                        onDrop={(e, i) => handleDrop(col.key, i)}
                        onDragEnd={() => handleDragEnd(col.key)}
                        isDragging={dragState.draggingId === item.id}
                      />
                    ))}
              </div>
            </div>
          );
        })}
      </div>

      <ChartPanel allActions={allActions} members={meeting.members} />

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">
              添加{COLUMN_CONFIG.find((c) => c.key === addCategory)?.label}
            </h2>
            <form onSubmit={handleAddSubmit}>
              <div className="form-group">
                <label className="form-label">分类</label>
                <select
                  className="form-select"
                  value={addCategory}
                  onChange={(e) => setAddCategory(e.target.value as ItemCategory)}
                >
                  {COLUMN_CONFIG.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.icon} {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">内容 *</label>
                <textarea
                  className="form-textarea"
                  placeholder="请输入内容..."
                  value={addForm.content}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, content: e.target.value }))
                  }
                  autoFocus
                />
              </div>
              {addCategory === 'action' && (
                <>
                  <div className="form-group">
                    <label className="form-label">负责人</label>
                    <select
                      className="form-select"
                      value={addForm.assignee}
                      onChange={(e) =>
                        setAddForm((prev) => ({ ...prev, assignee: e.target.value }))
                      }
                    >
                      <option value="">-- 选择负责人 --</option>
                      {meeting.members.map((m, i) => (
                        <option key={i} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">截止日期</label>
                    <input
                      type="date"
                      className="form-input"
                      value={addForm.dueDate}
                      onChange={(e) =>
                        setAddForm((prev) => ({ ...prev, dueDate: e.target.value }))
                      }
                    />
                  </div>
                </>
              )}
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!addForm.content.trim()}
                >
                  添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RetroBoard;
