import React, { useState, useRef, useEffect } from 'react';
import { CardData, Priority, Participant } from '../types';

interface CardProps {
  card: CardData;
  participants: Participant[];
  clientId: string;
  isDragging?: boolean;
  onDragStart: (e: React.DragEvent, cardId: string) => void;
  onDragEnd: () => void;
  onEdit: (cardId: string, updates: Partial<CardData>) => void;
  onDelete: (cardId: string) => void;
  onLock: (cardId: string) => void;
  onUnlock: (cardId: string) => void;
}

const priorityColors: Record<Priority, string> = {
  high: '#ff6b6b',
  medium: '#ffd93d',
  low: '#6bcb77'
};

const priorityLabels: Record<Priority, string> = {
  high: '高',
  medium: '中',
  low: '低'
};

export const Card: React.FC<CardProps> = ({
  card,
  participants,
  clientId,
  isDragging,
  onDragStart,
  onDragEnd,
  onEdit,
  onDelete,
  onLock,
  onUnlock
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [editDescription, setEditDescription] = useState(card.description);
  const [editAssignee, setEditAssignee] = useState(card.assignee);
  const [editPriority, setEditPriority] = useState<Priority>(card.priority);
  const cardRef = useRef<HTMLDivElement>(null);

  const isLocked = !!card.lockedBy && card.lockedBy !== clientId;
  const lockedByMe = card.lockedBy === clientId;

  const lockedByUser = participants.find(p => p.id === card.lockedBy);

  useEffect(() => {
    if (!isEditing) {
      setEditTitle(card.title);
      setEditDescription(card.description);
      setEditAssignee(card.assignee);
      setEditPriority(card.priority);
    }
  }, [card, isEditing]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        if (isEditing) {
          handleSave();
        }
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExpanded, isEditing]);

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) return;
    
    if (!isExpanded) {
      onLock(card.id);
    }
    setIsExpanded(true);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) return;
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editTitle.trim()) {
      onEdit(card.id, {
        title: editTitle.trim(),
        description: editDescription,
        assignee: editAssignee,
        priority: editPriority
      });
    }
    setIsEditing(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定删除此卡片吗？')) {
      onDelete(card.id);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (isLocked || isEditing) {
      e.preventDefault();
      return;
    }
    onDragStart(e, card.id);
  };

  const handleDragEnd = () => {
    onDragEnd();
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div
      ref={cardRef}
      className={`kanban-card ${isDragging ? 'dragging' : ''} ${isLocked ? 'locked' : ''} ${isExpanded ? 'expanded' : ''}`}
      draggable={!isLocked && !isEditing}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleCardClick}
    >
      <div className="card-header">
        <span className="card-priority" style={{ backgroundColor: priorityColors[card.priority] }}>
          {priorityLabels[card.priority]}
        </span>
        {isLocked && (
          <span className="card-lock-badge" title={`${lockedByUser?.name || '他人'}正在编辑`}>
            🔒
          </span>
        )}
      </div>

      {isEditing ? (
        <input
          className="card-title-input"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          autoFocus
        />
      ) : (
        <h4 className="card-title">{card.title}</h4>
      )}

      {isExpanded && (
        <div className="card-details" onClick={(e) => e.stopPropagation()}>
          <div className="card-detail-section">
            <label>描述</label>
            {isEditing ? (
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="card-textarea"
                placeholder="添加描述..."
              />
            ) : (
              <p className="card-description">{card.description || '暂无描述'}</p>
            )}
          </div>

          <div className="card-detail-section">
            <label>负责人</label>
            {isEditing ? (
              <select
                value={editAssignee}
                onChange={(e) => setEditAssignee(e.target.value)}
                className="card-select"
              >
                <option value="">未分配</option>
                {participants.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            ) : (
              <p className="card-assignee">{card.assignee || '未分配'}</p>
            )}
          </div>

          <div className="card-detail-section">
            <label>优先级</label>
            {isEditing ? (
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value as Priority)}
                className="card-select"
              >
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            ) : (
              <span className="card-priority-badge" style={{ backgroundColor: priorityColors[card.priority] }}>
                {priorityLabels[card.priority]}优先级
              </span>
            )}
          </div>

          <div className="card-detail-section">
            <label>创建时间</label>
            <p className="card-date">{formatDate(card.createdAt)}</p>
          </div>

          <div className="card-actions">
            {isEditing ? (
              <>
                <button className="btn btn-primary" onClick={handleSave}>保存</button>
                <button className="btn btn-secondary" onClick={() => {
                  setIsEditing(false);
                  onUnlock(card.id);
                  setIsExpanded(false);
                }}>取消</button>
              </>
            ) : (
              <>
                <button className="btn btn-primary" onClick={handleEditClick}>编辑</button>
                <button className="btn btn-danger" onClick={handleDelete}>删除</button>
                <button className="btn btn-secondary" onClick={() => {
                  onUnlock(card.id);
                  setIsExpanded(false);
                }}>关闭</button>
              </>
            )}
          </div>
        </div>
      )}

      {!isExpanded && (
        <div className="card-footer">
          {card.assignee && <span className="card-assignee-mini">{card.assignee}</span>}
        </div>
      )}
    </div>
  );
};
