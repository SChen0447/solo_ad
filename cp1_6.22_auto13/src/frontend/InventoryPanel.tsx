import { useState, useRef, useEffect } from 'react';
import type { Ingredient, UserIngredient } from './App';

interface Props {
  allIngredients: Ingredient[];
  userIngredients: UserIngredient[];
  onAddIngredient: (id: number) => void;
  onRemoveIngredient: (id: number) => void;
}

function InventoryPanel({ allIngredients, userIngredients, onAddIngredient, onRemoveIngredient }: Props) {
  const [searchText, setSearchText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const userIngredientIds = userIngredients.map(i => i.id);
  
  const filteredSuggestions = allIngredients.filter(ing =>
    !userIngredientIds.includes(ing.id) &&
    ing.name.toLowerCase().includes(searchText.toLowerCase())
  ).slice(0, 8);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddIngredient = (ingredient: Ingredient) => {
    onAddIngredient(ingredient.id);
    setSearchText('');
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredSuggestions.length > 0) {
      handleAddIngredient(filteredSuggestions[0]);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🥬 食材库存</h2>
        <span style={styles.count}>{userIngredients.length} 种</span>
      </div>

      <div style={styles.searchContainer} ref={suggestionsRef}>
        <input
          type="text"
          style={styles.searchInput}
          placeholder="搜索食材..."
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
        />
        {showSuggestions && searchText && (
          <div style={styles.suggestions}>
            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.map(ing => (
                <div
                  key={ing.id}
                  className="suggestion-item"
                  style={styles.suggestionItem}
                  onClick={() => handleAddIngredient(ing)}
                >
                  <span style={styles.suggestionIcon}>{ing.icon}</span>
                  <span style={styles.suggestionName}>{ing.name}</span>
                </div>
              ))
            ) : (
              <div style={styles.noSuggestions}>未找到相关食材</div>
            )}
          </div>
        )}
      </div>

      <div style={styles.ingredientsList}>
        {userIngredients.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>暂无食材</p>
            <p style={styles.emptyHint}>在上方搜索框添加食材</p>
          </div>
        ) : (
          <div style={styles.ingredientsGrid}>
            {userIngredients.map(ing => (
              <div
                key={ing.id}
                className="ingredient-card"
                style={{ ...styles.ingredientCard, backgroundColor: ing.color }}
              >
                <button
                  className="delete-btn"
                  style={styles.deleteBtn}
                  onClick={() => onRemoveIngredient(ing.id)}
                >
                  ×
                </button>
                <div style={styles.ingredientIcon}>{ing.icon}</div>
                <div style={styles.ingredientName}>{ing.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '20px',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexShrink: 0,
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333333',
  },
  count: {
    fontSize: '14px',
    color: '#888888',
    backgroundColor: '#F5F5F5',
    padding: '4px 10px',
    borderRadius: '12px',
  },
  searchContainer: {
    position: 'relative',
    marginBottom: '16px',
    flexShrink: 0,
  },
  searchInput: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  suggestions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    marginTop: '4px',
    maxHeight: '240px',
    overflowY: 'auto',
    zIndex: 100,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  suggestionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  suggestionIcon: {
    fontSize: '20px',
  },
  suggestionName: {
    fontSize: '14px',
    color: '#333333',
  },
  noSuggestions: {
    padding: '12px 14px',
    color: '#999999',
    fontSize: '14px',
    textAlign: 'center',
  },
  ingredientsList: {
    flex: 1,
    overflowY: 'auto',
  },
  ingredientsGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
  },
  ingredientCard: {
    position: 'relative',
    width: 'calc(33.33% - 7px)',
    borderRadius: '12px',
    padding: '12px 8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    cursor: 'default',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  },
  deleteBtn: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'rgba(255, 80, 80, 0.8)',
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    padding: 0,
    opacity: 0,
    transition: 'opacity 0.2s',
  },
  ingredientIcon: {
    fontSize: '28px',
  },
  ingredientName: {
    fontSize: '12px',
    color: '#333333',
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
  },
  emptyText: {
    fontSize: '16px',
    color: '#999999',
    marginBottom: '8px',
  },
  emptyHint: {
    fontSize: '13px',
    color: '#BBBBBB',
  },
};

export default InventoryPanel;
