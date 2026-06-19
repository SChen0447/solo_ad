import { useState, useRef, useEffect } from 'react';

interface IngredientInputProps {
  ingredients: string[];
  userIngredients: string[];
  onAdd: (ingredient: string) => void;
  onRemove: (ingredient: string) => void;
  onRecommend: () => void;
}

const SOFT_COLORS = [
  '#E3F2FD',
  '#FCE4EC',
  '#E8F5E9',
  '#FFF3E0',
  '#F3E5F5',
  '#E0F7FA',
  '#FFF9C4',
  '#F1F8E9',
  '#FFEBEE',
  '#EDE7F6',
  '#E8EAF6',
  '#E0F2F1',
];

const getColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SOFT_COLORS[Math.abs(hash) % SOFT_COLORS.length];
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
  },
  inputWrapper: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
  },
  inputContainer: {
    position: 'relative',
    flex: 1,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '15px',
    border: '2px solid #ffe0b2',
    borderRadius: '10px',
    backgroundColor: 'white',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  recommendBtn: {
    padding: '12px 28px',
    fontSize: '15px',
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: '#ff6f00',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: '10px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    maxHeight: '220px',
    overflowY: 'auto',
    zIndex: 100,
  },
  dropdownItem: {
    padding: '10px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#444',
    borderBottom: '1px solid #f5f5f5',
  },
  tagsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    minHeight: '36px',
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 8px 6px 12px',
    borderRadius: '20px',
    fontSize: '14px',
    color: '#444',
    gap: '6px',
    transition: 'transform 0.2s, opacity 0.2s',
  },
  tagRemoveBtn: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'rgba(0,0,0,0.1)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    lineHeight: '1',
    color: '#666',
    transition: 'background-color 0.2s',
  },
  emptyHint: {
    fontSize: '13px',
    color: '#999',
    padding: '4px 0',
  },
};

function IngredientInput({
  ingredients,
  userIngredients,
  onAdd,
  onRemove,
  onRecommend,
}: IngredientInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [removingTag, setRemovingTag] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredIngredients = ingredients.filter(
    (ing) =>
      ing.toLowerCase().includes(inputValue.toLowerCase().trim()) &&
      !userIngredients.includes(ing)
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (filteredIngredients.length > 0) {
        onAdd(filteredIngredients[0]);
      } else {
        onAdd(inputValue.trim());
      }
      setInputValue('');
      setShowDropdown(false);
    }
  };

  const handleSelect = (ingredient: string) => {
    onAdd(ingredient);
    setInputValue('');
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const handleRemove = (ingredient: string) => {
    setRemovingTag(ingredient);
    setTimeout(() => {
      onRemove(ingredient);
      setRemovingTag(null);
    }, 200);
  };

  return (
    <div style={styles.container} ref={containerRef}>
      <div style={styles.inputWrapper}>
        <div style={styles.inputContainer}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            placeholder="输入食材名称，如：番茄、鸡蛋、土豆...（回车添加）"
            style={{
              ...styles.input,
              borderColor: inputValue ? '#ff6f00' : '#ffe0b2',
            }}
          />
          {showDropdown && inputValue && filteredIngredients.length > 0 && (
            <div style={styles.dropdown} className="fade-in">
              {filteredIngredients.slice(0, 10).map((ing) => (
                <div
                  key={ing}
                  style={styles.dropdownItem}
                  onClick={() => handleSelect(ing)}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = '#fff3e0';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = 'white';
                  }}
                >
                  {ing}
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          style={styles.recommendBtn}
          onClick={onRecommend}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#e65100';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ff6f00';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
          }}
        >
          🍳 推荐菜谱
        </button>
      </div>

      <div style={styles.tagsContainer}>
        {userIngredients.length === 0 ? (
          <div style={styles.emptyHint}>还没有添加食材，快来输入你手边的食材吧～</div>
        ) : (
          userIngredients.map((ing) => (
            <span
              key={ing}
              className={removingTag === ing ? 'tag-remove' : ''}
              style={{
                ...styles.tag,
                backgroundColor: getColor(ing),
              }}
            >
              {ing}
              <button
                style={styles.tagRemoveBtn}
                onClick={() => handleRemove(ing)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    'rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    'rgba(0,0,0,0.1)';
                }}
                aria-label={`删除${ing}`}
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  );
}

export default IngredientInput;
