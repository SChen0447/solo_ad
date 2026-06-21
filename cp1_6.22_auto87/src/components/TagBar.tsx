import { hashStringToColor, hashStringToTextColor } from '../data/snippets';

interface TagBarProps {
  tags: string[];
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  onClearAll: () => void;
}

export default function TagBar({ tags, selectedTags, onTagToggle, onClearAll }: TagBarProps) {
  const hasSelection = selectedTags.length > 0;

  return (
    <div className="tag-bar-container">
      <div className="tag-bar-scroll">
        {hasSelection && (
          <button className="tag-clear-btn" onClick={onClearAll}>
            清除筛选
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
        {tags.map(tag => {
          const isSelected = selectedTags.includes(tag);
          const bgColor = hashStringToColor(tag);
          const textColor = hashStringToTextColor(tag);

          return (
            <button
              key={tag}
              className={`tag-btn ${isSelected ? 'selected' : ''}`}
              onClick={() => onTagToggle(tag)}
              style={
                isSelected
                  ? { backgroundColor: textColor, color: '#ffffff', borderColor: textColor }
                  : { backgroundColor: '#ffffff', color: '#4a5568' }
              }
            >
              {tag}
              {isSelected && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px' }}>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
      <style>{`
        .tag-bar-container {
          width: 100%;
          overflow: hidden;
        }

        .tag-bar-scroll {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 4px 2px 8px 2px;
          scrollbar-width: thin;
        }

        .tag-clear-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 14px;
          border-radius: 20px;
          background: #fed7d7;
          color: #c53030;
          font-size: 13px;
          font-weight: 500;
          border: 1px solid transparent;
          transition: all 0.2s ease;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .tag-clear-btn:hover {
          background: #feb2b2;
        }

        .tag-clear-btn:active {
          transform: scale(0.95);
        }

        .tag-btn {
          display: flex;
          align-items: center;
          padding: 6px 16px;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s ease;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .tag-btn:hover {
          border-color: #cbd5e0;
          background: #f7fafc;
        }

        .tag-btn:active {
          transform: scale(0.95);
        }

        .tag-btn.selected {
          border: 1px solid transparent;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}
