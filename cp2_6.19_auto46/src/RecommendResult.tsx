import type { RecommendedRecipe } from './types';

interface RecommendResultProps {
  recommendations: RecommendedRecipe[];
  isLoading: boolean;
  userIngredients: string[];
  onFavoriteToggle: (recipeId: number) => void;
  favorites: Set<number>;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '32px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#e65100',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  summary: {
    fontSize: '13px',
    color: '#888',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#999',
    fontSize: '15px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
  },
  card: {
    backgroundColor: '#fffaf5',
    borderRadius: '12px',
    padding: '16px',
    border: '2px solid #ffe0b2',
    transition: 'all 0.3s ease',
    position: 'relative',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '10px',
    gap: '8px',
  },
  cardTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#222',
    flex: 1,
  },
  scoreBadge: {
    fontSize: '12px',
    fontWeight: 'bold',
    padding: '4px 10px',
    borderRadius: '12px',
    color: 'white',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  ingredientsWrap: {
    marginTop: '10px',
  },
  ingredientsLabel: {
    fontSize: '12px',
    color: '#999',
    marginBottom: '6px',
  },
  ingredientsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '5px',
  },
  matchedChip: {
    fontSize: '11px',
    padding: '4px 9px',
    borderRadius: '10px',
    backgroundColor: '#C8E6C9',
    color: '#2e7d32',
    fontWeight: 600,
  },
  missingChip: {
    fontSize: '11px',
    padding: '4px 9px',
    borderRadius: '10px',
    backgroundColor: '#FFCDD2',
    color: '#c62828',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#999',
  },
  emptyEmoji: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  favoriteBtn: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.9)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s',
  },
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#4caf50';
  if (score >= 60) return '#ff9800';
  if (score >= 40) return '#ffc107';
  return '#9e9e9e';
};

function RecommendResult({
  recommendations,
  isLoading,
  userIngredients,
  onFavoriteToggle,
  favorites,
}: RecommendResultProps) {
  const gridStyle = {
    ...styles.grid,
    '@media (max-width: 1024px)': { gridTemplateColumns: 'repeat(3, 1fr)' },
    '@media (max-width: 768px)': { gridTemplateColumns: 'repeat(2, 1fr)' },
    '@media (max-width: 480px)': { gridTemplateColumns: '1fr' },
  } as React.CSSProperties;

  const topMatch = recommendations.length > 0 ? recommendations[0].matchScore : 0;
  const hasPerfectMatch = recommendations.some((r) => r.matchScore === 100);

  const handleFavClick = (e: React.MouseEvent, recipeId: number) => {
    e.stopPropagation();
    onFavoriteToggle(recipeId);
  };

  return (
    <section style={styles.container} className="fade-in">
      <div style={styles.header}>
        <div style={styles.title}>
          <span>✨</span>
          <span>为你推荐的菜谱</span>
        </div>
        <div style={styles.summary}>
          根据你拥有的 {userIngredients.length} 种食材，共找到 {recommendations.length} 个推荐菜谱
          {hasPerfectMatch && ' 🎉 有完美匹配！'}
          {!hasPerfectMatch && topMatch > 0 && ` (最高匹配度 ${topMatch}%)`}
        </div>
      </div>

      {isLoading ? (
        <div style={styles.loading}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🍳</div>
          正在为你智能匹配菜谱...
        </div>
      ) : recommendations.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyEmoji}>🤔</div>
          <div>暂无推荐结果，请先添加食材后点击推荐</div>
        </div>
      ) : (
        <div style={gridStyle}>
          {recommendations.map((recipe) => {
            const isFav = favorites.has(recipe.id);
            return (
              <div
                key={recipe.id}
                style={{
                  ...styles.card,
                  borderColor:
                    recipe.matchScore === 100
                      ? '#66bb6a'
                      : recipe.matchScore >= 60
                        ? '#ffb74d'
                        : '#ffe0b2',
                  backgroundColor:
                    recipe.matchScore === 100
                      ? '#f1f8e9'
                      : recipe.matchScore >= 60
                        ? '#fff8e1'
                        : '#fffaf5',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                    '0 6px 20px rgba(0,0,0,0.12)';
                  (e.currentTarget as HTMLDivElement).style.transform =
                    'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                  (e.currentTarget as HTMLDivElement).style.transform =
                    'translateY(0)';
                }}
              >
                <button
                  style={styles.favoriteBtn}
                  onClick={(e) => handleFavClick(e, recipe.id)}
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

                <div style={styles.cardHeader}>
                  <div style={styles.cardTitle}>
                    <span style={{ fontSize: '24px' }}>{recipe.emoji}</span>
                    <span>{recipe.name}</span>
                  </div>
                </div>

                <div
                  style={{
                    ...styles.scoreBadge,
                    backgroundColor: getScoreColor(recipe.matchScore),
                    display: 'inline-block',
                    marginBottom: '8px',
                  }}
                >
                  {recipe.matchScore === 100
                    ? '💯 完美匹配'
                    : `匹配度 ${recipe.matchScore}%`}
                </div>

                <div style={{ fontSize: '12px', color: '#888', lineHeight: '1.4' }}>
                  {recipe.description}
                </div>

                <div style={styles.ingredientsWrap}>
                  <div style={styles.ingredientsLabel}>
                    所需食材（{recipe.matchedIngredients.length}/{recipe.ingredients.length} 已拥有）
                  </div>
                  <div style={styles.ingredientsList}>
                    {recipe.ingredients.map((ing) => {
                      const isMatched = recipe.matchedIngredients.includes(ing.name);
                      return (
                        <span
                          key={ing.name}
                          style={isMatched ? styles.matchedChip : styles.missingChip}
                          title={isMatched ? '已拥有' : '需要购买'}
                        >
                          {isMatched ? '✓ ' : '✗ '}
                          {ing.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default RecommendResult;
