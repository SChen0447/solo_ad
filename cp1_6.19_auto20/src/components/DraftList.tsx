import React, { useState } from 'react';
import { Search, Plus, Trash2 } from 'lucide-react';
import { useEditorStore, formatRelativeTime, type Draft } from '../stores/editorStore';

const DraftCard: React.FC<{
  draft: Draft;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}> = ({ draft, isActive, onClick, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const truncateTitle = (title: string, maxLength: number = 20): string => {
    if (title.length <= maxLength) return title;
    return title.slice(0, maxLength) + '...';
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`确定要删除"${truncateTitle(draft.title)}"吗？`)) {
      onDelete();
    }
  };

  return (
    <div
      className={`draft-card p-4 mb-2 rounded-lg cursor-pointer transition-all duration-200 ease-out relative ${
        isActive
          ? 'bg-white shadow-md border-l-4 border-[#4a90d9]'
          : 'bg-white/60 hover:bg-white hover:shadow-sm border-l-4 border-transparent'
      }`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        animation: 'fadeIn 200ms ease-out',
      }}
    >
      <div className="flex justify-between items-start">
        <h3 className="font-medium text-[#2c3e50] text-sm leading-tight flex-1 pr-2">
          {truncateTitle(draft.title)}
        </h3>
        <button
          className={`p-1 rounded transition-all duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          } hover:bg-[#e74c3c]/10 text-[#999] hover:text-[#e74c3c]`}
          onClick={handleDelete}
          aria-label="删除草稿"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <p className="text-xs text-[#999] mt-2">
        {formatRelativeTime(draft.updatedAt)}
      </p>
    </div>
  );
};

export const DraftList: React.FC = () => {
  const {
    drafts,
    currentDraftId,
    searchQuery,
    createDraft,
    deleteDraft,
    loadDraft,
    setSearchQuery,
    getFilteredDrafts,
  } = useEditorStore();

  const filteredDrafts = getFilteredDrafts();

  return (
    <div className="w-[320px] bg-[#f8f9fa] h-full flex flex-col border-r border-[#e0e0e0]">
      <div className="p-4 border-b border-[#e0e0e0]">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]"
            size={18}
          />
          <input
            type="text"
            placeholder="搜索草稿..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[#e0e0e0] rounded-lg text-sm focus:outline-none focus:border-[#4a90d9] transition-colors duration-200"
          />
        </div>
      </div>

      <div className="p-4 border-b border-[#e0e0e0]">
        <button
          onClick={createDraft}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-[#4a90d9] text-white rounded-lg hover:bg-[#357abd] transition-all duration-200 ease-out hover:shadow-md active:scale-98"
        >
          <Plus size={18} />
          <span>新建草稿</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {filteredDrafts.length === 0 ? (
          <div className="text-center text-[#999] py-8">
            {searchQuery ? '未找到匹配的草稿' : '暂无草稿，点击上方按钮创建'}
          </div>
        ) : (
          filteredDrafts.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              isActive={draft.id === currentDraftId}
              onClick={() => loadDraft(draft.id)}
              onDelete={() => deleteDraft(draft.id)}
            />
          ))
        )}
      </div>

      <div className="p-3 border-t border-[#e0e0e0] text-xs text-[#999] text-center">
        共 {drafts.length} 篇草稿
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .active\:scale-98:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  );
};
