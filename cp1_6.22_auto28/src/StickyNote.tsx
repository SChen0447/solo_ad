import React, { useState, useRef, useEffect } from 'react';
import { StickyNote as StickyNoteType, MACARON_COLORS } from './types';
import './StickyNote.css';

interface StickyNoteProps {
  sticky: StickyNoteType;
  isSelected: boolean;
  hasVoted: boolean;
  onSelect: () => void;
  onContentChange: (content: string) => void;
  onColorChange: (color: string) => void;
  onVote: () => void;
  onDelete: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onConnectionStart: (e: React.MouseEvent) => void;
  onConnectionEnd: () => StickyNoteType | null;
  isDragging?: boolean;
}

const StickyNote: React.FC<StickyNoteProps> = ({
  sticky,
  isSelected,
  hasVoted,
  onSelect,
  onContentChange,
  onColorChange,
  onVote,
  onDelete,
  onDragStart,
  onConnectionStart,
  isDragging = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [editContent, setEditContent] = useState(sticky.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditContent(sticky.content);
  }, [sticky.content]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editContent !== sticky.content) {
      onContentChange(editContent.substring(0, 200));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditContent(sticky.content);
      setIsEditing(false);
    }
  };

  const handleVoteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onVote();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  const handleColorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowColorPicker(!showColorPicker);
  };

  const handleColorSelect = (color: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onColorChange(color);
    setShowColorPicker(false);
  };

  const handleConnectionMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConnectionStart(e);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return;
    e.stopPropagation();
    onSelect();
    onDragStart(e);
  };

  return (
    <div
      className={`sticky-note ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{
        backgroundColor: sticky.color,
        left: sticky.x,
        top: sticky.y,
        width: sticky.width,
        height: sticky.height,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      <div className="sticky-header">
        <button
          className="color-btn"
          onClick={handleColorClick}
          style={{ backgroundColor: sticky.color }}
          title="更换颜色"
        />
        {showColorPicker && (
          <div className="color-picker" onClick={(e) => e.stopPropagation()}>
            {MACARON_COLORS.map((color) => (
              <button
                key={color}
                className={`color-option ${sticky.color === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={(e) => handleColorSelect(color, e)}
              />
            ))}
          </div>
        )}
        <button
          className="delete-btn"
          onClick={handleDeleteClick}
          title="删除便签"
        >
          ×
        </button>
      </div>

      <div className="sticky-content">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            maxLength={200}
            className="sticky-textarea"
          />
        ) : (
          <p className="sticky-text">{sticky.content || '双击编辑...'}</p>
        )}
      </div>

      <div className="sticky-footer">
        <div className="vote-section" onClick={handleVoteClick}>
          <span className={`thumb-icon ${hasVoted ? 'voted' : ''}`}>
            {hasVoted ? '👍' : '👍🏻'}
          </span>
          <span className="vote-count">{sticky.votes}</span>
        </div>
      </div>

      <div
        className="connection-point"
        onMouseDown={handleConnectionMouseDown}
        title="拖拽创建连接"
      />
    </div>
  );
};

export default StickyNote;
