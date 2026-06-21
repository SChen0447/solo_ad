import React, { useState, useRef, useEffect } from 'react';
import { getPresetTags, getCustomTags, addCustomTag, searchTags } from '../services/cardService';
import type { TagItem } from '../services/cardService';

interface TagManagerProps {
  activeTag: string | null;
  onTagSelect: (tag: string | null) => void;
  onTagsChange: () => void;
}

const TagManager: React.FC<TagManagerProps> = ({ activeTag, onTagSelect, onTagsChange }) => {
  const [customInput, setCustomInput] = useState('');
  const [suggestions, setSuggestions] = useState<TagItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allTags, setAllTags] = useState<TagItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshTags();
  }, []);

  const refreshTags = () => {
    setAllTags([...getPresetTags(), ...getCustomTags()]);
  };

  const handleInputChange = (value: string) => {
    setCustomInput(value);
    if (value.trim()) {
      setSuggestions(searchTags(value));
      setShowSuggestions(true);
    } else {
      setSuggestions(getPresetTags());
      setShowSuggestions(false);
    }
  };

  const handleAddTag = (tagName?: string) => {
    const name = tagName || customInput.trim();
    if (!name) return;

    const existing = allTags.find(t => t.name === name);
    if (existing) {
      onTagSelect(existing.name);
    } else {
      addCustomTag(name);
      refreshTags();
      onTagsChange();
    }

    setCustomInput('');
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (tag: TagItem) => {
    onTagSelect(tag.name);
    setCustomInput('');
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  return (
    <div className="tag-section">
      <div className="tag-section-label">标签筛选</div>

      <div className="tag-list">
        {allTags.map(tag => (
          <span
            key={tag.name}
            className={`tag-bubble ${activeTag === tag.name ? 'active' : ''}`}
            style={{
              background: tag.color,
              outline: activeTag === tag.name ? '2px solid var(--color-primary)' : 'none',
              outlineOffset: '2px',
            }}
            onClick={() => onTagSelect(activeTag === tag.name ? null : tag.name)}
          >
            {tag.name}
          </span>
        ))}
      </div>

      <div className="tag-input-wrapper">
        <input
          ref={inputRef}
          className="tag-input"
          type="text"
          placeholder="搜索或添加自定义标签..."
          value={customInput}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (customInput.trim()) {
              setSuggestions(searchTags(customInput));
              setShowSuggestions(true);
            }
          }}
          onBlur={() => {
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleAddTag();
            }
          }}
        />

        {showSuggestions && suggestions.length > 0 && (
          <div className="tag-suggestions suggestion-enter">
            {suggestions.map(tag => (
              <div
                key={tag.name}
                className="tag-suggestion-item"
                onMouseDown={() => handleSuggestionClick(tag)}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: tag.color,
                    marginRight: '8px',
                    verticalAlign: 'middle',
                  }}
                />
                {tag.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TagManager;
