import { Search, X, Hash } from 'lucide-react';
import { Tag, TagColors } from '@/model/CardModel';
import { useMindStore } from '@/store/useMindStore';

export default function SearchBar() {
  const searchQuery = useMindStore((s) => s.searchQuery);
  const setSearchQuery = useMindStore((s) => s.setSearchQuery);
  const activeTags = useMindStore((s) => s.activeTags);
  const toggleTag = useMindStore((s) => s.toggleTag);

  return (
    <div className="flex items-center gap-2 flex-wrap px-4 py-3">
      <div className="relative flex items-center backdrop-blur-[12px] bg-white/[0.08] border border-white/[0.15] rounded-full px-4 py-2 text-sm font-body text-white/90">
        <Search size={16} className="text-white/50 shrink-0" />
        <input
          type="text"
          placeholder="搜索卡片..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent outline-none ml-2 w-40 placeholder:text-white/30"
        />
        {searchQuery && (
          <X
            size={14}
            className="text-white/50 cursor-pointer shrink-0"
            onClick={() => setSearchQuery('')}
          />
        )}
      </div>

      {Object.values(Tag).map((tag) => {
        const isActive = activeTags.includes(tag);
        const color = TagColors[tag];
        return (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className="flex items-center gap-1 px-3 py-1 rounded-full text-xs transition-all duration-200"
            style={
              isActive
                ? { backgroundColor: `${color}30`, color }
                : { backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }
            }
          >
            <Hash size={12} />
            {tag}
          </button>
        );
      })}
    </div>
  );
}
