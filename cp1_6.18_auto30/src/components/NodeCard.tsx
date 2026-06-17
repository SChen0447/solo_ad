import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Pencil, Trash2, Play } from 'lucide-react';
import type { StoryNode } from '@shared/types';
import { NODE_WIDTH, NODE_HEIGHT, CONNECTION_HANDLE_SIZE } from '@/utils/connectLines';

interface NodeCardProps {
  node: StoryNode;
  isSelected: boolean;
  isEditingByOther: boolean;
  otherUserName?: string;
  otherUserColor?: string;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent, nodeId: string) => void;
  onDrag: (nodeId: string, x: number, y: number) => void;
  onDragEnd: (nodeId: string, x: number, y: number) => void;
  onUpdate: (node: StoryNode) => void;
  onDelete: (nodeId: string) => void;
  onStartConnection: (e: React.MouseEvent, nodeId: string) => void;
  onPreview: (nodeId: string) => void;
  scale: number;
}

export const NodeCard: React.FC<NodeCardProps> = ({
  node,
  isSelected,
  isEditingByOther,
  otherUserName,
  otherUserColor,
  onSelect,
  onDragStart,
  onDrag,
  onDragEnd,
  onUpdate,
  onDelete,
  onStartConnection,
  onPreview,
  scale,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(node.title);
  const [editContent, setEditContent] = useState(node.content);
  const [isDragging, setIsDragging] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditTitle(node.title);
    setEditContent(node.content);
  }, [node.title, node.content]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isEditing) return;
    
    const target = e.target as HTMLElement;
    if (target.closest('.connection-handle') || target.closest('.node-menu')) return;
    
    e.stopPropagation();
    onSelect();
    
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffsetRef.current = {
        x: (e.clientX - rect.left) / scale,
        y: (e.clientY - rect.top) / scale,
      };
    }
    
    setIsDragging(true);
    onDragStart(e, node.id);
  }, [isEditing, onSelect, onDragStart, node.id, scale]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragOffsetRef.current.x * scale;
    const newY = e.clientY - dragOffsetRef.current.y * scale;
    
    onDrag(node.id, newX, newY);
  }, [isDragging, node.id, onDrag, scale]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    setIsDragging(false);
    const newX = e.clientX - dragOffsetRef.current.x * scale;
    const newY = e.clientY - dragOffsetRef.current.y * scale;
    onDragEnd(node.id, newX, newY);
  }, [isDragging, node.id, onDragEnd, scale]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleSave = () => {
    onUpdate({
      ...node,
      title: editTitle || 'Untitled',
      content: editContent,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(node.title);
    setEditContent(node.content);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const renderContent = (content: string) => {
    const lines = content.split('\n').slice(0, 4);
    return lines.map((line, i) => (
      <p key={i} className="text-sm leading-relaxed">
        {line || '\u00A0'}
      </p>
    ));
  };

  return (
    <div
      ref={cardRef}
      className={`absolute rounded-lg cursor-move select-none transition-shadow duration-300 ${
        isSelected ? 'z-20' : 'z-10'
      } ${isDragging ? 'opacity-90' : ''}`}
      style={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        left: node.x,
        top: node.y,
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(8px)',
        border: isEditingByOther
          ? `2px solid ${otherUserColor || '#ff6b6b'}`
          : '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: isSelected
          ? '0 0 15px rgba(100, 200, 255, 0.6)'
          : '0 4px 6px rgba(0, 0, 0, 0.3)',
        animation: isEditingByOther ? 'pulse-border 1.5s ease-in-out infinite' : 'none',
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowMenu(!showMenu);
      }}
    >
      <style>{`
        @keyframes pulse-border {
          0%, 100% {
            box-shadow: 0 0 5px ${otherUserColor || '#ff6b6b'};
          }
          50% {
            box-shadow: 0 0 20px ${otherUserColor || '#ff6b6b'}, 0 0 30px ${otherUserColor || '#ff6b6b'};
          }
        }
        @keyframes arrow-flow {
          0% { stroke-dashoffset: 20; }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>

      {isEditingByOther && (
        <div
          className="absolute -top-6 left-1/2 transform -translate-x-1/2 px-2 py-0.5 rounded text-xs text-white whitespace-nowrap"
          style={{ backgroundColor: otherUserColor || '#ff6b6b' }}
        >
          {otherUserName || '有人正在编辑'}
        </div>
      )}

      <div
        className="connection-handle absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full cursor-crosshair transition-all duration-200 hover:scale-150"
        style={{
          width: CONNECTION_HANDLE_SIZE * 1.5,
          height: CONNECTION_HANDLE_SIZE * 1.5,
          background: 'rgba(100, 200, 255, 0.8)',
          border: '2px solid rgba(255, 255, 255, 0.9)',
        }}
        title="输入连接点"
      />

      <div
        className="connection-handle absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 rounded-full cursor-crosshair transition-all duration-200 hover:scale-150"
        style={{
          width: CONNECTION_HANDLE_SIZE * 1.5,
          height: CONNECTION_HANDLE_SIZE * 1.5,
          background: 'rgba(255, 150, 100, 0.8)',
          border: '2px solid rgba(255, 255, 255, 0.9)',
        }}
        title="拖拽创建连线"
        onMouseDown={(e) => {
          e.stopPropagation();
          onStartConnection(e, node.id);
        }}
      />

      {isEditing ? (
        <div className="h-full flex flex-col p-3 gap-2">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 bg-white/20 border border-white/30 rounded text-white font-bold text-sm focus:outline-none focus:border-blue-400"
            placeholder="节点标题"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-gray-200 text-sm resize-none focus:outline-none focus:border-blue-400"
            placeholder="输入故事内容（支持Markdown）..."
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={(e) => { e.stopPropagation(); handleCancel(); }}
              className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
            >
              取消
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleSave(); }}
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-400 transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="p-3 h-full flex flex-col">
            <h3 className="font-bold text-white text-sm mb-2 truncate pr-8">
              {node.title || '未命名节点'}
            </h3>
            <div className="flex-1 text-gray-300 text-xs overflow-hidden">
              {renderContent(node.content)}
              {node.content.split('\n').length > 4 && (
                <p className="text-gray-500 text-xs mt-1">...</p>
              )}
            </div>
          </div>

          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="node-menu p-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              title="编辑"
            >
              <Pencil size={12} className="text-white" />
            </button>
            <button
              className="node-menu p-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); onPreview(node.id); }}
              title="预览"
            >
              <Play size={12} className="text-white" />
            </button>
            <button
              className="node-menu p-1 rounded bg-red-500/30 hover:bg-red-500/50 transition-colors"
              onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
              title="删除"
            >
              <Trash2 size={12} className="text-white" />
            </button>
          </div>
        </>
      )}

      {showMenu && !isEditing && (
        <div
          className="node-menu absolute top-full left-0 mt-1 bg-gray-800 rounded shadow-lg z-30 overflow-hidden"
          style={{ minWidth: 120 }}
        >
          <button
            className="w-full px-3 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center gap-2"
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); setShowMenu(false); }}
          >
            <Pencil size={14} /> 编辑
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center gap-2"
            onClick={(e) => { e.stopPropagation(); onPreview(node.id); setShowMenu(false); }}
          >
            <Play size={14} /> 预览
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-900/50 flex items-center gap-2"
            onClick={(e) => { e.stopPropagation(); onDelete(node.id); setShowMenu(false); }}
          >
            <Trash2 size={14} /> 删除
          </button>
        </div>
      )}
    </div>
  );
};
