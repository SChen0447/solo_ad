import React, { useState, useRef, useEffect } from 'react';
import { useApp, SUBJECT_COLORS, Panel, SubjectType, CanvasElement } from './store';

const subjectOptions: { value: SubjectType; label: string }[] = [
  { value: 'scene', label: '场景' },
  { value: 'character', label: '人物' },
  { value: 'object', label: '物品' },
];

function MiniElementRenderer({ element, canvasW, canvasH, scale }: {
  element: CanvasElement; canvasW: number; canvasH: number; scale: number;
}) {
  const { type, width, height, fill, stroke, text, tailDirection, rotation, x, y } = element;
  const w = Math.max(1, width * scale);
  const h = Math.max(1, height * scale);
  const sw = Math.max(0.5, 1 * scale);
  const fontSize = Math.max(5, 10 * scale);
  const textColor = fill === '#1F2937' || fill === '#111827' ? '#FFFFFF' : '#374151';
  const tx = x * scale;
  const ty = y * scale;

  const commonTransform = {
    position: 'absolute' as const,
    left: tx,
    top: ty,
    transform: `rotate(${rotation}deg)`,
    transformOrigin: 'center center',
    width: w,
    height: h,
    pointerEvents: 'none' as const,
  };

  switch (type) {
    case 'rectangle':
      return (
        <svg width={w} height={h} style={commonTransform}>
          <rect x={sw} y={sw} width={Math.max(1, w - sw * 2)} height={Math.max(1, h - sw * 2)} rx={Math.max(0.5, 2 * scale)} fill={fill} stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case 'circle':
      return (
        <svg width={w} height={h} style={commonTransform}>
          <ellipse cx={w / 2} cy={h / 2} rx={Math.max(1, w / 2 - sw)} ry={Math.max(1, h / 2 - sw)} fill={fill} stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case 'triangle':
      return (
        <svg width={w} height={h} style={commonTransform}>
          <polygon points={`${w / 2},${sw} ${Math.max(1, w - sw)},${Math.max(1, h - sw)} ${sw},${Math.max(1, h - sw)}`} fill={fill} stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case 'dialogBox':
      return (
        <div style={commonTransform}>
          <svg width={w} height={h} style={{ position: 'absolute', inset: 0 }}>
            <rect x={sw} y={sw} width={Math.max(1, w - sw * 2)} height={Math.max(1, h - sw * 2)} fill={fill} stroke={stroke} strokeWidth={sw} rx={Math.max(0.5, 2 * scale)} />
          </svg>
          {text && (
            <div style={{
              position: 'absolute',
              top: 2 * scale,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '90%',
              fontSize,
              color: textColor,
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.2,
              pointerEvents: 'none',
            }}>
              {text}
            </div>
          )}
        </div>
      );
    case 'speechBubble': {
      const dir = tailDirection ?? 90;
      const rad = (dir * Math.PI) / 180;
      const tailLen = Math.max(4, 12 * scale);
      const cx = w / 2;
      const cy = h;
      const tipX = cx + Math.cos(rad) * tailLen;
      const tipY = cy + Math.sin(rad) * tailLen;
      const baseW = Math.max(4, 12 * scale);
      const perpX = Math.cos(rad + Math.PI / 2);
      const perpY = Math.sin(rad + Math.PI / 2);
      const leftX = cx + perpX * (baseW / 2);
      const leftY = cy + perpY * (baseW / 2);
      const rightX = cx - perpX * (baseW / 2);
      const rightY = cy - perpY * (baseW / 2);
      const totalW = Math.max(w, Math.ceil(tipX + 4));
      const totalH = Math.max(h, Math.ceil(tipY + 4));
      const r = Math.max(1, 4 * scale);
      const path = [
        `M${sw},${sw + r}`,
        `Q${sw},${sw} ${sw + r},${sw}`,
        `L${w - sw - r},${sw}`,
        `Q${w - sw},${sw} ${w - sw},${sw + r}`,
        `L${w - sw},${cy - r}`,
        `Q${w - sw},${cy} ${w - sw - r},${cy}`,
        `L${rightX.toFixed(1)},${rightY.toFixed(1)}`,
        `L${tipX.toFixed(1)},${tipY.toFixed(1)}`,
        `L${leftX.toFixed(1)},${leftY.toFixed(1)}`,
        `L${sw + r},${cy}`,
        `Q${sw},${cy} ${sw},${cy - r}`,
        'Z',
      ].join(' ');
      return (
        <div style={{ ...commonTransform, width: totalW, height: totalH }}>
          <svg width={totalW} height={totalH} style={{ position: 'absolute', inset: 0 }}>
            <path d={path} fill={fill} stroke={stroke} strokeWidth={sw} />
          </svg>
          {text && (
            <div style={{
              position: 'absolute',
              top: 2 * scale,
              left: '50%',
              transform: 'translateX(-50%)',
              width: w,
              fontSize,
              color: textColor,
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.2,
              pointerEvents: 'none',
            }}>
              {text}
            </div>
          )}
        </div>
      );
    }
  }
}

function PanelThumbnail({ panel }: { panel: Panel }) {
  const PREVIEW_W = 60;
  const PREVIEW_H = 40;
  const CANVAS_BASE_W = 600;
  const CANVAS_BASE_H = 400;
  const scaleX = PREVIEW_W / CANVAS_BASE_W;
  const scaleY = PREVIEW_H / CANVAS_BASE_H;
  const scale = Math.min(scaleX, scaleY, 0.12);
  const borderColor = SUBJECT_COLORS[panel.subjectType];

  if (panel.elements.length === 0) {
    return (
      <div
        style={{
          width: PREVIEW_W,
          height: PREVIEW_H,
          borderRadius: 4,
          backgroundColor: borderColor,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          color: '#fff',
          boxShadow: `0 2px 8px ${borderColor}44`,
          transition: 'background-color 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1 }}>{panel.order}</span>
        <span style={{ fontSize: 8, opacity: 0.85, lineHeight: 1 }}>
          {panel.subjectType === 'scene' ? '场景' : panel.subjectType === 'character' ? '人物' : '物品'}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        width: PREVIEW_W,
        height: PREVIEW_H,
        borderRadius: 4,
        backgroundColor: '#F5F5F5',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
        border: `1.5px solid ${borderColor}`,
        boxShadow: `0 2px 8px ${borderColor}44`,
        transition: 'border-color 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 2,
          top: 2,
          padding: '0 3px',
          borderRadius: 2,
          backgroundColor: `${borderColor}`,
          color: '#fff',
          fontSize: 7,
          fontWeight: 600,
          lineHeight: '10px',
          zIndex: 2,
        }}
      >
        #{panel.order}
      </div>
      {panel.elements.map((el) => (
        <MiniElementRenderer key={el.id} element={el} canvasW={PREVIEW_W} canvasH={PREVIEW_H} scale={scale} />
      ))}
    </div>
  );
}

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
      <PanelThumbnail panel={panel} />
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
