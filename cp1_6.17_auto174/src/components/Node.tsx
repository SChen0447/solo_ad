import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDrag } from 'react-dnd';
import { MindMapNode, getLevelColor } from '../types';

interface NodeProps {
  node: MindMapNode;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdateText: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: (id: string, x: number, y: number) => void;
  scale: number;
  isNew?: boolean;
  isDragging?: boolean;
}

export const Node: React.FC<NodeProps> = ({
  node,
  isSelected,
  onSelect,
  onUpdateText,
  onDelete,
  onToggleCollapse,
  scale,
  isNew = false,
  isDragging = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(node.text);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

  const [{ isDragging: dndDragging }, drag] = useDrag(() => ({
    type: 'NODE',
    item: { id: node.id, type: 'NODE' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [node.id]);

  useEffect(() => {
    setEditText(node.text);
  }, [node.text]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (editText.trim() && editText !== node.text) {
      onUpdateText(node.id, editText.trim());
    } else {
      setEditText(node.text);
    }
  }, [editText, node.id, node.text, onUpdateText]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsEditing(false);
      if (editText.trim() && editText !== node.text) {
        onUpdateText(node.id, editText.trim());
      } else {
        setEditText(node.text);
      }
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditText(node.text);
    }
  }, [editText, node.id, node.text, onUpdateText]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(node.id);
  }, [node.id, onDelete]);

  const handleToggleCollapse = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleCollapse(node.id);
  }, [node.id, onToggleCollapse]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.id);
  }, [node.id, onSelect]);

  const bgColor = getLevelColor(node.level);

  const nodeStyle: React.CSSProperties = {
    position: 'absolute',
    left: node.x - node.width / 2,
    top: node.y - node.height / 2,
    width: node.width,
    height: node.height,
    borderRadius: '10px',
    backgroundColor: bgColor,
    color: node.level < 3 ? '#ffffff' : '#2C3E50',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'grab',
    userSelect: 'none',
    transition: 'transform 0.1s ease-out, box-shadow 0.2s ease, opacity 0.2s ease',
    transform: isHovered && !isEditing ? 'scale(1.1)' : 'scale(1)',
    boxShadow: isSelected
      ? '0 0 0 3px #3498DB, 0 4px 12px rgba(0,0,0,0.3)'
      : isDragging || dndDragging
      ? '0 8px 24px rgba(0,0,0,0.4)'
      : '0 2px 8px rgba(0,0,0,0.2)',
    opacity: isDragging || dndDragging ? 0.7 : 1,
    border: isEditing ? '2px solid #3498DB' : 'none',
    animation: isNew ? 'bounceIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
    zIndex: isSelected || isHovered ? 10 : 1,
    fontSize: '14px',
    fontWeight: 500,
    textAlign: 'center',
    padding: '8px',
    wordBreak: 'break-word',
    overflow: 'hidden',
  };

  drag(nodeRef);

  return (
    <div
      ref={nodeRef}
      style={nodeStyle}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {node.children.length > 0 && (
        <button
          onClick={handleToggleCollapse}
      style={{
        position: 'absolute',
        top: '-8px',
        left: '-8px',
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        backgroundColor: '#3498DB',
        color: 'white',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        transition: 'transform 0.2s ease',
        transform: node.collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
        padding: 0,
        zIndex: 20,
      }}
      title={node.collapsed ? '展开' : '折叠'}
    >
      ▼
      </button>
    )}

    {isEditing ? (
      <input
        ref={inputRef}
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        style={{
          width: '90%',
          backgroundColor: 'transparent',
          border: 'none',
          outline: 'none',
          color: node.level < 3 ? '#ffffff' : '#2C3E50',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: 500,
          fontFamily: 'inherit',
        }}
      />
    ) : (
      <span style={{ pointerEvents: 'none' }}>{node.text}</span>
    )}

    {isHovered && !isEditing && (
      <button
        onClick={handleDelete}
        style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: '#E74C3C',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
          padding: 0,
          zIndex: 20,
        }}
        title="删除节点"
      >
        ×
      </button>
    )}
    </div>
  );
};
