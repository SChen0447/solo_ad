import { useState, useMemo, useEffect } from 'react';
import type { Recipe } from './types';

interface RecipeListProps {
  recipes: Recipe[];
  favorites: Set<number>;
  onFavoriteToggle: (recipeId: number) => void;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: '8px',
  },
  searchBar: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '16px 20px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  searchIcon: {
    fontSize: '20px',
    color: '#999',
  },
  searchInput: {
    flex: 1,
    minWidth: '200px',
    border: 'none',
    outline: 'none',
    fontSize: '15px',
    padding: '8px 0',
    backgroundColor: 'transparent',
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    borderBottom: '2px solid #eee',
    marginBottom: '20px',
    position: 'relative',
  },
  tab: {
    padding: '10px 24px',
    fontSize: '15px',
    fontWeight: '600',
    color: '#888',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    marginBottom: '-2px',
    transition: 'all 0.3s ease',
    backgroundColor: 'transparent',
    border: 'none',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    position: 'relative',
  },
  cardImage: {
    height: '140px',
    backgroundColor: '#f0f0f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '64px',
    backgroundImage: 'linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)',
  },
  cardBody: {
    padding: '16px',
  },
  cardTitle: {
    fontSize: '17px',
    fontWeight: 'bold',
    color: '#222',
    marginBottom: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  cardDesc: {
    fontSize: '13px',
    color: '#777',
    marginBottom: '12px',
    lineHeight: '1.5',
    minHeight: '40px',
  },
  ingredients: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  ingredientChip: {
    fontSize: '11px',
    padding: '3px 8px',
    borderRadius: '10px',
    backgroundColor: '#f5f5f5',
    color: '#666',
  },
  favoriteBtn: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.9)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
    zIndex: 1,
    transition: 'transform 0.2s',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '20px',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '16px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '85vh',
    overflowY: 'auto',
    position: 'relative',
  },
  modalHeader: {
    height: '180px',
    backgroundImage: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderTopLeftRadius: '16px',
    borderTopRightRadius: '16px',
  },
  modalEmoji: {
    fontSize: '100px',
  },
  modalClose: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.9)',
    border: 'none',
    cursor: 'pointer',
    fontSize: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666',
  },
  modalBody: {
    padding: '24px',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#222',
    marginBottom: '8px',
  },
  modalDesc: {
    fontSize: '14px',
    color: '#888',
    marginBottom: '20px',
    lineHeight: '1.6',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#ff6f00',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  ingredientList: {
    listStyle: 'none',
    marginBottom: '24px',
  },
  ingredientItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#fafafa',
    borderRadius: '8px',
    marginBottom: '6px',
    fontSize: '14px',
  },
  stepsList: {
    listStyle: 'none',
    counterReset: 'step',
  },
  stepItem: {
    counterIncrement: 'step',
    padding: '12px 12px 12px 52px',
    position: 'relative',
    marginBottom: '8px',
    backgroundColor: '#fffaf5',
    borderRadius: '8px',
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#444',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#999',
  },
  emptyEmoji: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '16px',
  },
};

function RecipeList({ recipes, favorites, onFavoriteToggle }: RecipeListProps) {
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [animatingRecipes, setAnimatingRecipes] = useState(true);
  const [favAnimatingId, setFavAnimatingId] = useState<number | null>(null);

  useEffect(() => {
    setAnimatingRecipes(true);
    const t = setTimeout(() => setAnimatingRecipes(false), 300);
    return () => clearTimeout(t);
  }, [searchText, activeTab]);

  const filteredRecipes = useMemo(() => {
    const baseList = activeTab === 'favorites'
      ? recipes.filter((r) => favorites.has(r.id))
      : recipes;

    const text = searchText.trim().toLowerCase();
    if (!text) return baseList;

    return baseList.filter(
      (r) =>
        r.name.toLowerCase().includes(text) ||
        r.description.toLowerCase().includes(text) ||
        r.ingredients.some((ing) => ing.name.toLowerCase().includes(text))
    );
  }, [recipes, favorites, searchText, activeTab]);

  const handleCardClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
  };

  const handleFavoriteClick = (e: React.MouseEvent, recipeId: number) => {
    e.stopPropagation();
    setFavAnimatingId(recipeId);
    onFavoriteToggle(recipeId);
    setTimeout(() => setFavAnimatingId(null), 200);
  };

  const handleModalClose = () => {
    setSelectedRecipe(null);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleModalClose();
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleModalClose();
    };
    if (selectedRecipe) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [selectedRecipe]);

  const gridStyle = {
    ...styles.grid,
    '@media (max-width: 768px)': { gridTemplateColumns: 'repeat(2, 1fr)' },
    '@media (max-width: 480px)': { gridTemplateColumns: '1fr' },
  } as React.CSSProperties;

  return (
    <div style={styles.container}>
      <div style={styles.searchBar}>
        <span style={styles.searchIcon}>🔍</span>
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="搜索菜谱名、简介或食材..."
          style={styles.searchInput}
        />
      </div>

      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            color: activeTab === 'all' ? '#ff6f00' : '#888',
            borderBottomColor: activeTab === 'all' ? '#ff6f00' : 'transparent',
          }}
          onClick={() => setActiveTab('all')}
        >
          🍽️ 全部菜谱
        </button>
        <button
          style={{
            ...styles.tab,
            color: activeTab === 'favorites' ? '#ff6f00' : '#888',
            borderBottomColor: activeTab === 'favorites' ? '#ff6f00' : 'transparent',
          }}
          onClick={() => setActiveTab('favorites')}
          className="slide-in"
        >
          ⭐ 我的收藏 ({favorites.size})
        </button>
      </div>

      {filteredRecipes.length === 0 ? (
        <div style={styles.emptyState} className="fade-in">
          <div style={styles.emptyEmoji}>
            {activeTab === 'favorites' ? '🫶' : '🍳'}
          </div>
          <div style={styles.emptyText}>
            {activeTab === 'favorites'
              ? '还没有收藏任何菜谱，快去收藏喜欢的吧～'
              : '没有找到匹配的菜谱，试试其他关键词？'}
          </div>
        </div>
      ) : (
        <div style={gridStyle} className={animatingRecipes ? 'fade-in' : ''}>
          {filteredRecipes.map((recipe) => {
            const isFav = favorites.has(recipe.id);
            const isAnimating = favAnimatingId === recipe.id;
            return (
              <div
                key={recipe.id}
                style={styles.card}
                onClick={() => handleCardClick(recipe)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                    '0 8px 24px rgba(0,0,0,0.15)';
                  (e.currentTarget as HTMLDivElement).style.transform =
                    'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                    '0 2px 8px rgba(0,0,0,0.1)';
                  (e.currentTarget as HTMLDivElement).style.transform =
                    'translateY(0)';
                }}
              >
                <button
                  style={styles.favoriteBtn}
                  onClick={(e) => handleFavoriteClick(e, recipe.id)}
                  className={isAnimating ? 'star-filled' : ''}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform =
                      'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform =
                      'scale(1)';
                  }}
                  aria-label={isFav ? '取消收藏' : '收藏'}
                >
                  {isFav ? '⭐' : '☆'}
                </button>
                <div style={styles.cardImage}>{recipe.emoji}</div>
                <div style={styles.cardBody}>
                  <div style={styles.cardTitle}>
                    <span>{recipe.emoji}</span>
                    <span>{recipe.name}</span>
                  </div>
                  <div style={styles.cardDesc}>{recipe.description}</div>
                  <div style={styles.ingredients}>
                    {recipe.ingredients.slice(0, 4).map((ing) => (
                      <span
                        key={ing.name}
                        style={styles.ingredientChip}
                        title={`${ing.name} ${ing.amount}`}
                      >
                        {ing.name}
                      </span>
                    ))}
                    {recipe.ingredients.length > 4 && (
                      <span style={styles.ingredientChip}>
                        +{recipe.ingredients.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedRecipe && (
        <div style={styles.modalOverlay} onClick={handleOverlayClick}>
          <div style={styles.modalContent} className="modal-enter">
            <div style={styles.modalHeader}>
              <span style={styles.modalEmoji}>{selectedRecipe.emoji}</span>
              <button
                style={styles.modalClose}
                onClick={handleModalClose}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    '#fff';
                  (e.currentTarget as HTMLButtonElement).style.color = '#ff6f00';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    'rgba(255,255,255,0.9)';
                  (e.currentTarget as HTMLButtonElement).style.color = '#666';
                }}
                aria-label="关闭"
              >
                ×
              </button>
            </div>
            <div style={styles.modalBody}>
              <h2 style={styles.modalTitle}>{selectedRecipe.name}</h2>
              <p style={styles.modalDesc}>{selectedRecipe.description}</p>

              <div style={styles.sectionTitle}>
                <span>🥗</span>
                <span>所需食材</span>
              </div>
              <ul style={styles.ingredientList}>
                {selectedRecipe.ingredients.map((ing) => (
                  <li key={ing.name} style={styles.ingredientItem}>
                    <span style={{ color: '#333' }}>{ing.name}</span>
                    <span style={{ color: '#ff6f00', fontWeight: 600 }}>
                      {ing.amount}
                    </span>
                  </li>
                ))}
              </ul>

              <div style={styles.sectionTitle}>
                <span>📝</span>
                <span>详细步骤</span>
              </div>
              <ol style={styles.stepsList}>
                {selectedRecipe.steps.map((step, idx) => (
                  <li
                    key={idx}
                    style={{
                      ...styles.stepItem,
                      counterReset: undefined as unknown as string,
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#ff6f00',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '14px',
                      }}
                    >
                      {idx + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecipeList;
