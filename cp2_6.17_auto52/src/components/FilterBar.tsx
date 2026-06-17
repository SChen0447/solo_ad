import { getTagColor } from '../utils/bookmarkParser';
import './FilterBar.css';

interface FilterBarProps {
  tags: string[];
  selectedTag: string | null;
  onTagSelect: (tag: string | null) => void;
}

export function FilterBar({ tags, selectedTag, onTagSelect }: FilterBarProps) {
  const handleTagClick = (tag: string) => {
    if (selectedTag === tag) {
      onTagSelect(null);
    } else {
      onTagSelect(tag);
    }
  };

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="filter-bar">
      <div className="filter-bar-label">标签:</div>
      <div className="tag-cloud">
        {tags.map((tag, index) => {
          const isSelected = selectedTag === tag;
          const bgColor = getTagColor(index, tags.length);
          return (
            <button
              key={tag}
              className={`tag-bubble ${isSelected ? 'selected' : ''}`}
              style={{
                background: isSelected
                  ? `linear-gradient(135deg, ${bgColor}, #E040FB)`
                  : `linear-gradient(135deg, ${bgColor}99, #E040FB99)`,
              }}
              onClick={() => handleTagClick(tag)}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
