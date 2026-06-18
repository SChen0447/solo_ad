import { useState, useRef, useEffect } from 'react';
import { X, Plus, Check, GitCompare } from 'lucide-react';
import { useThemeStore, ColorScheme } from '@/stores/themeStore';

interface SchemeCardProps {
  scheme: ColorScheme;
  isSelected: boolean;
  isCompareSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  onToggleCompare: () => void;
}

function SchemeCard({
  scheme,
  isSelected,
  isCompareSelected,
  onSelect,
  onDelete,
  onRename,
  onToggleCompare,
}: SchemeCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(scheme.name);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditName(scheme.name);
  };

  const handleSaveName = () => {
    if (editName.trim()) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(scheme.name);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  const handleCompareToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleCompare();
  };

  return (
    <div
      className={`relative rounded-xl p-4 cursor-pointer transition-all duration-150 ${
        isHovered ? 'bg-[#f1f5f9]' : 'bg-white'
      }`}
      style={{
        boxShadow: isSelected
          ? `0 0 0 2px ${scheme.primary}`
          : '0 1px 3px rgba(0,0,0,0.1)',
        border: isSelected ? 'none' : '1px solid #f1f5f9',
      }}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-white/95 rounded-xl flex flex-col items-center justify-center z-10">
          <p className="text-sm text-gray-700 mb-3 font-medium">确认删除？</p>
          <div className="flex gap-2">
            <button
              onClick={handleConfirmDelete}
              className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors btn-bounce btn-hover"
            >
              删除
            </button>
            <button
              onClick={handleCancelDelete}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-300 transition-colors btn-bounce"
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 px-2 py-1 text-sm font-medium border-2 rounded-lg focus:outline-none mr-2"
            style={{ borderColor: scheme.primary }}
          />
        ) : (
          <div
            className="flex-1 text-sm font-semibold text-gray-800 truncate"
            onDoubleClick={handleDoubleClick}
            title="双击重命名"
          >
            {scheme.name}
          </div>
        )}

        {!isEditing && isHovered && !showDeleteConfirm && (
          <div className="flex gap-1 ml-2">
            <button
              onClick={handleCompareToggle}
              className={`p-1 rounded-full transition-colors ${
                isCompareSelected
                  ? 'text-blue-500 bg-blue-50'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
              title={isCompareSelected ? '取消对比' : '添加对比'}
            >
              <GitCompare size={14} />
            </button>
            <button
              onClick={handleDeleteClick}
              className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="删除方案"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {isCompareSelected && !isHovered && !showDeleteConfirm && (
          <div className="p-1 rounded-full text-blue-500 bg-blue-50">
            <GitCompare size={14} />
          </div>
        )}
      </div>

      <div className="flex gap-1.5 mb-3">
        <div
          className="flex-1 h-8 rounded-lg shadow-inner"
          style={{ backgroundColor: scheme.primary }}
          title={`主色: ${scheme.primary}`}
        />
        <div
          className="flex-1 h-8 rounded-lg shadow-inner"
          style={{ backgroundColor: scheme.secondary }}
          title={`辅色: ${scheme.secondary}`}
        />
        <div
          className="flex-1 h-8 rounded-lg shadow-inner border border-gray-200"
          style={{ backgroundColor: scheme.background }}
          title={`背景色: ${scheme.background}`}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{formatDate(scheme.createdAt)}</span>
        {isEditing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSaveName();
            }}
            className="p-1 rounded-full text-green-500 hover:bg-green-50 transition-colors"
          >
            <Check size={14} />
          </button>
        )}
      </div>

      {isCompareSelected && (
        <div
          className="absolute top-2 right-2 w-2 h-2 rounded-full"
          style={{ backgroundColor: scheme.primary }}
        />
      )}
    </div>
  );
}

export function SchemeList() {
  const {
    schemes,
    currentScheme,
    selectedForCompare,
    tempColors,
    addScheme,
    selectScheme,
    deleteScheme,
    updateScheme,
    toggleCompare,
  } = useThemeStore();

  const handleAddScheme = () => {
    const name = `方案 ${schemes.length + 1}`;
    addScheme({
      name,
      primary: tempColors.primary,
      secondary: tempColors.secondary,
      background: tempColors.background,
    });
  };

  return (
    <div className="w-[240px] bg-white border-r border-gray-100 flex flex-col h-full">
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">配色方案</h3>
        <button
          onClick={handleAddScheme}
          className="w-full py-2.5 px-4 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 transition-all btn-bounce btn-hover"
          style={{ backgroundColor: tempColors.primary }}
        >
          <Plus size={16} />
          新建方案
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
        {schemes.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-50 flex items-center justify-center">
              <span className="text-2xl">🎨</span>
            </div>
            <p className="text-sm text-gray-400">暂无配色方案</p>
            <p className="text-xs text-gray-300 mt-1">点击上方按钮创建</p>
          </div>
        ) : (
          schemes.map((scheme) => (
            <SchemeCard
              key={scheme.id}
              scheme={scheme}
              isSelected={currentScheme?.id === scheme.id}
              isCompareSelected={selectedForCompare.includes(scheme.id)}
              onSelect={() => selectScheme(scheme.id)}
              onDelete={() => deleteScheme(scheme.id)}
              onRename={(name) => updateScheme(scheme.id, { name })}
              onToggleCompare={() => toggleCompare(scheme.id)}
            />
          ))
        )}
      </div>

      {selectedForCompare.length > 0 && (
        <div className="p-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            已选择 {selectedForCompare.length}/2 个方案进行对比
          </p>
        </div>
      )}
    </div>
  );
}
