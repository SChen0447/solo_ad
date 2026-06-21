import React, { useState, useEffect, useRef } from 'react';
import { GraphNode } from '../types';
import { getNodeTagColor } from '../utils/conflictDetector';

interface NodeModalProps {
  position: { x: number; y: number };
  node: GraphNode | null;
  onSave: (title: string, description: string, tags: string[]) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const NodeModal: React.FC<NodeModalProps> = ({ position, node, onSave, onDelete, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (node) {
      setTitle(node.title);
      setDescription(node.description);
      setTags(node.tags || []);
    } else {
      setTitle('');
      setDescription('');
      setTags([]);
    }
  }, [node]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 5) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSave(title.trim(), description.trim(), tags);
    }
  };

  const tagColor = getNodeTagColor(title, tags);

  return (
    <div
      ref={modalRef}
      style={{
        position: 'absolute',
        left: Math.min(position.x, window.innerWidth - 280),
        top: Math.min(position.y, window.innerHeight - 400),
        width: 260,
        backgroundColor: '#2d3748',
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        border: `2px solid ${tagColor}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: tagColor,
          }}
        />
        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>
          {node ? '编辑节点' : '新建节点'}
        </span>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', color: '#a0aec0', fontSize: 12, marginBottom: 4 }}>
            标题 <span style={{ color: '#e53e3e' }}>*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 20))}
            placeholder="输入节点标题（最多20字）"
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid #4a5568',
              backgroundColor: '#1a202c',
              color: '#fff',
              fontSize: 13,
              outline: 'none',
            }}
            autoFocus
          />
          <div style={{ fontSize: 10, color: '#718096', textAlign: 'right', marginTop: 2 }}>
            {title.length}/20
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', color: '#a0aec0', fontSize: 12, marginBottom: 4 }}>
            描述
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 100))}
            placeholder="输入描述（最多100字）"
            rows={3}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid #4a5568',
              backgroundColor: '#1a202c',
              color: '#fff',
              fontSize: 13,
              outline: 'none',
              resize: 'none',
            }}
          />
          <div style={{ fontSize: 10, color: '#718096', textAlign: 'right', marginTop: 2 }}>
            {description.length}/100
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', color: '#a0aec0', fontSize: 12, marginBottom: 4 }}>
            标签
          </label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              placeholder="添加标签后回车"
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid #4a5568',
                backgroundColor: '#1a202c',
                color: '#fff',
                fontSize: 12,
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={handleAddTag}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: '#3182ce',
                color: '#fff',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              添加
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: '2px 8px',
                  backgroundColor: tagColor,
                  color: '#fff',
                  borderRadius: 12,
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 12,
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="submit"
            disabled={!title.trim()}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: title.trim() ? '#38a169' : '#4a5568',
              color: '#fff',
              fontSize: 13,
              cursor: title.trim() ? 'pointer' : 'not-allowed',
              fontWeight: 'bold',
            }}
          >
            {node ? '保存' : '创建'}
          </button>
          {node && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: '#e53e3e',
                color: '#fff',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              删除
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default NodeModal;
