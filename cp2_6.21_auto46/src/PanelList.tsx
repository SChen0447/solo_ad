import React, { useState, useRef, useEffect } from 'react';
import { useApp, SUBJECT_COLORS, Panel, SubjectType } from './store';

const subjectOptions: { value: SubjectType; label: string }[] = [
  { value: 'scene', label: '场景' },
  { value: 'character', label: '人物' },
  { value: 'object', label: '物品' },
];

function PanelCard({
  panel,
  isSelected,
  onSelect,
  onDelete,
  onEditDescription,
  onSetSubject,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  panel: Panel;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onEditDescription: (desc: string) => void;
  onSetSubject: (type: SubjectType) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(panel.description);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditText(panel.description);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editText.trim() && editText !== panel.description) {
      onEditDescription(editText.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditText(panel.description);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showDeleteConfirm) {
      onDelete();
    } else {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 2000);
    }
  };

  const truncateDesc = (text: string, maxLen = 18) => {
    return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
  };

  return (
    <div
      draggable={!isEditing}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onSelect}
      onDoubleClick={handleDoubleClick}
      style={{
        width: 180,
        height: 80,
        borderRadius: 6,
        backgroundColor: '#2D2D2D',
        border: isSelected ? '2px solid #F59E0B' : '2px solid transparent',
        padding: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        transition: 'all 0.3s ease-in-out',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: 60,
          height: 40,
          borderRadius: 4,
          backgroundColor: SUBJECT_COLORS[panel.subjectType],
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 600,
          color: '#fff',
        }}
      >
        {panel.order}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {isEditing ? (
          <input
            ref={inputRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              fontSize: 12,
              padding: '2px 4px',
              borderRadius: 3,
              backgroundColor: '#1F2937',
              color: '#fff',
              border: '1px solid #F59E0B',
            }}
          />
        ) : (
          <div
            style={{
              fontSize: 12,
              color: '#fff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={panel.description}
          >
            {truncateDesc(panel.description)}
          </div>
        )}
        <select
          value={panel.subjectType}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onSetSubject(e.target.value as SubjectType)}
          style={{
            fontSize: 10,
            padding: '1px 4px',
            borderRadius: 3,
            backgroundColor: '#1F2937',
            color: '#fff',
            border: '1px solid #4B5563',
            cursor: 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          {subjectOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={handleDeleteClick}
        style={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: 18,
          height: 18,
          borderRadius: 3,
          backgroundColor: showDeleteConfirm ? '#EF4444' : '#4B5563',
          color: '#fff',
          fontSize: 11,
          lineHeight: '18px',
          textAlign: 'center',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.2s ease',
        }}
        title={showDeleteConfirm ? '再次点击确认删除' : '删除分镜'}
      >
        {showDeleteConfirm ? '!' : '×'}
      </button>
    </div>
  );
}

export default function PanelList() {
  const { state, dispatch } = useApp();
  const dragIdRef = useRef<string | null>(null);

  const handleAddPanel = () => {
    dispatch({ type: 'ADD_PANEL' });
  };

  const handleSelect = (id: string) => {
    dispatch({ type: 'SELECT_PANEL', payload: id });
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_PANEL', payload: id });
  };

  const handleEditDescription = (id: string, description: string) => {
    dispatch({ type: 'EDIT_PANEL_DESCRIPTION', payload: { id, description } });
  };

  const handleSetSubject = (id: string, subjectType: SubjectType) => {
    dispatch({ type: 'SET_PANEL_SUBJECT', payload: { id, subjectType } });
  };

  const handleDragStart = (id: string, e: React.DragEvent) => {
    dragIdRef.current = id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetId: string, e: React.DragEvent) => {
    e.preventDefault();
    const draggedId = dragIdRef.current || e.dataTransfer.getData('text/plain');
    if (!draggedId || draggedId === targetId) return;

    const newOrder = state.panels.map((p) => p.id);
    const fromIdx = newOrder.indexOf(draggedId);
    const toIdx = newOrder.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, draggedId);
    dispatch({ type: 'REORDER_PANELS', payload: newOrder });
    dragIdRef.current = null;
  };

  return (
    <div
      style={{
        width: 220,
        backgroundColor: '#2D2D44',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #1F2937',
      }}
    >
      <div
        style={{
          padding: 12,
          borderBottom: '1px solid #1F2937',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>分镜列表</h3>
        <button
          onClick={handleAddPanel}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            backgroundColor: '#F59E0B',
            color: '#fff',
            fontSize: 18,
            lineHeight: '28px',
            textAlign: 'center',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="添加分镜"
        >
          +
        </button>
      </div>
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {state.panels.length === 0 && (
          <div style={{ color: '#6B7280', fontSize: 12, textAlign: 'center', padding: 20 }}>
            暂无分镜，点击 + 添加
          </div>
        )}
        {state.panels.map((panel) => (
          <PanelCard
            key={panel.id}
            panel={panel}
            isSelected={state.selectedPanelId === panel.id}
            onSelect={() => handleSelect(panel.id)}
            onDelete={() => handleDelete(panel.id)}
            onEditDescription={(desc) => handleEditDescription(panel.id, desc)}
            onSetSubject={(type) => handleSetSubject(panel.id, type)}
            onDragStart={(e) => handleDragStart(panel.id, e)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(panel.id, e)}
          />
        ))}
      </div>
    </div>
  );
}
