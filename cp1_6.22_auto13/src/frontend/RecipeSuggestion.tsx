import { useState } from 'react';
import type { Recipe } from './App';

interface Props {
  recipes: Recipe[];
  isLoading: boolean;
  onGetRecommendations: () => void;
  onLogMeal: (recipe: Recipe, mealType: string, servings: number) => Promise<boolean>;
  userIngredientIds: number[];
}

const MEAL_TYPES = [
  { key: 'breakfast', label: '早餐', icon: '🌅' },
  { key: 'lunch', label: '午餐', icon: '☀️' },
  { key: 'dinner', label: '晚餐', icon: '🌙' },
  { key: 'snack', label: '加餐', icon: '🍎' },
];

function RecipeSuggestion({ recipes, isLoading, onGetRecommendations, onLogMeal }: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [modalRecipe, setModalRecipe] = useState<Recipe | null>(null);
  const [selectedMealType, setSelectedMealType] = useState('lunch');
  const [servings, setServings] = useState(1);
  const [isLogging, setIsLogging] = useState(false);

  const handleCardClick = (recipeId: number) => {
    setExpandedId(expandedId === recipeId ? null : recipeId);
  };

  const openLogModal = (recipe: Recipe, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalRecipe(recipe);
    setSelectedMealType('lunch');
    setServings(1);
  };

  const closeModal = () => {
    setModalRecipe(null);
  };

  const handleLogMeal = async () => {
    if (!modalRecipe) return;
    setIsLogging(true);
    const success = await onLogMeal(modalRecipe, selectedMealType, servings);
    setIsLogging(false);
    if (success) {
      closeModal();
      alert('记录成功！');
    }
  };

  const renderStars = (difficulty: number) => {
    return '★'.repeat(difficulty) + '☆'.repeat(5 - difficulty);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🍳 菜谱推荐</h2>
        <button
          className="btn-scale"
          style={styles.recommendBtn}
          onClick={onGetRecommendations}
          disabled={isLoading}
        >
          {isLoading ? '推荐中...' : '✨ 推荐菜谱'}
        </button>
      </div>

      {recipes.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>
            {isLoading ? '正在为您寻找美味菜谱...' : '点击上方按钮，根据您的食材推荐菜谱'}
          </p>
        </div>
      ) : (
        <div style={styles.cardsContainer}>
          <div style={styles.cardsScroll}>
            {recipes.map(recipe => (
              <div
                key={recipe.id}
                className="recipe-card"
                style={{
                  ...styles.recipeCard,
                  ...(expandedId === recipe.id ? styles.recipeCardExpanded : {}),
                }}
                onClick={() => handleCardClick(recipe.id)}
              >
                <div style={styles.cardHeader}>
                  <h3 style={styles.recipeName}>{recipe.name}</h3>
                  <span style={styles.matchBadge}>
                    {Math.round(recipe.match_ratio * 100)}% 匹配
                  </span>
                </div>

                <div style={styles.metaRow}>
                  <span style={styles.metaItem}>⏱️ {recipe.cook_time} 分钟</span>
                  <span style={styles.difficulty}>{renderStars(recipe.difficulty)}</span>
                </div>

                <div style={styles.ingredientsSection}>
                  <p style={styles.sectionLabel}>所需食材：</p>
                  <div style={styles.ingredientsList}>
                    {recipe.ingredients.map((ing, idx) => (
                      <div
                        key={idx}
                        style={{
                          ...styles.ingredientChip,
                          backgroundColor: ing.is_available ? ing.ingredient_color : '#E0E0E0',
                          color: ing.is_available ? '#333333' : '#999999',
                        }}
                      >
                        <span>{ing.ingredient_icon}</span>
                        <span style={styles.ingredientChipName}>{ing.ingredient_name}</span>
                        {!ing.is_available && <span style={styles.missingTag}>未获取</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {expandedId === recipe.id && (
                  <div style={styles.stepsSection}>
                    <p style={styles.sectionLabel}>烹饪步骤：</p>
                    <div style={styles.stepsList}>
                      {recipe.steps.map((step, idx) => (
                        <div key={idx} style={styles.stepItem}>
                          <div style={styles.stepNumber}>{idx + 1}</div>
                          <p style={styles.stepText}>{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={styles.cardFooter}>
                  <div style={styles.nutritionInfo}>
                    <span style={styles.nutritionItem}>🔥 {recipe.calories_per_serving} 千卡/份</span>
                  </div>
                  <button
                    className="btn-scale"
                    style={styles.logBtn}
                    onClick={(e) => openLogModal(recipe, e)}
                  >
                    📝 记录用餐
                  </button>
                </div>

                <div style={styles.expandHint}>
                  {expandedId === recipe.id ? '收起步骤 ▲' : '展开步骤 ▼'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {modalRecipe && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>记录用餐</h3>
              <button style={styles.closeBtn} onClick={closeModal}>×</button>
            </div>

            <div style={styles.modalRecipeInfo}>
              <span style={styles.modalRecipeName}>{modalRecipe.name}</span>
              <span style={styles.modalRecipeCalories}>
                {modalRecipe.calories_per_serving} 千卡/份
              </span>
            </div>

            <div style={styles.mealTypeSection}>
              <p style={styles.sectionLabel}>用餐时间</p>
              <div style={styles.mealTypeTabs}>
                {MEAL_TYPES.map(type => (
                  <button
                    className="meal-type-tab"
                    key={type.key}
                    style={{
                      ...styles.mealTypeTab,
                      ...(selectedMealType === type.key ? styles.mealTypeTabActive : {}),
                    }}
                    onClick={() => setSelectedMealType(type.key)}
                  >
                    <span style={styles.mealTypeIcon}>{type.icon}</span>
                    <span>{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.servingsSection}>
              <p style={styles.sectionLabel}>摄入份量</p>
              <div style={styles.servingsControl}>
                <button
                  style={styles.servingsBtn}
                  onClick={() => setServings(Math.max(0.5, servings - 0.25))}
                >
                  -
                </button>
                <span style={styles.servingsValue}>{servings.toFixed(2)} 份</span>
                <button
                  style={styles.servingsBtn}
                  onClick={() => setServings(Math.min(2, servings + 0.25))}
                >
                  +
                </button>
              </div>
              <div style={styles.servingsSlider}>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.25"
                  value={servings}
                  onChange={e => setServings(parseFloat(e.target.value))}
                  style={styles.rangeInput}
                />
                <div style={styles.rangeLabels}>
                  <span>0.5份</span>
                  <span>1份</span>
                  <span>1.5份</span>
                  <span>2份</span>
                </div>
              </div>
            </div>

            <div style={styles.summarySection}>
              <p style={styles.summaryLabel}>预计摄入：</p>
              <div style={styles.summaryGrid}>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryValue}>
                    {Math.round(modalRecipe.calories_per_serving * servings)}
                  </span>
                  <span style={styles.summaryUnit}>千卡</span>
                </div>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryValue}>
                    {Math.round(modalRecipe.protein_per_serving * servings)}g
                  </span>
                  <span style={styles.summaryUnit}>蛋白质</span>
                </div>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryValue}>
                    {Math.round(modalRecipe.carbs_per_serving * servings)}g
                  </span>
                  <span style={styles.summaryUnit}>碳水</span>
                </div>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryValue}>
                    {Math.round(modalRecipe.fat_per_serving * servings)}g
                  </span>
                  <span style={styles.summaryUnit}>脂肪</span>
                </div>
              </div>
            </div>

            <button
              className="btn-scale"
              style={{ ...styles.confirmBtn, opacity: isLogging ? 0.7 : 1 }}
              onClick={handleLogMeal}
              disabled={isLogging}
            >
              {isLogging ? '记录中...' : '✓ 确认记录'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: '15px',
    border: '1px solid #E0E0E0',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    flexShrink: 0,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333333',
  },
  recommendBtn: {
    padding: '10px 20px',
    backgroundColor: '#F5A623',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'transform 0.2s ease, background-color 0.2s',
  },
  emptyState: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '60px 20px',
  },
  emptyText: {
    fontSize: '15px',
    color: '#999999',
  },
  cardsContainer: {
    overflow: 'hidden',
  },
  cardsScroll: {
    display: 'flex',
    gap: '16px',
    overflowX: 'auto',
    paddingBottom: '10px',
  },
  recipeCard: {
    minWidth: '320px',
    maxWidth: '320px',
    backgroundColor: '#FAFAFA',
    borderRadius: '12px',
    border: '1px solid #E8E8E8',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  recipeCardExpanded: {
    minWidth: '360px',
    maxWidth: '360px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  recipeName: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333333',
  },
  matchBadge: {
    fontSize: '12px',
    color: '#FFFFFF',
    backgroundColor: '#F5A623',
    padding: '3px 8px',
    borderRadius: '10px',
    fontWeight: '500',
    flexShrink: 0,
    marginLeft: '10px',
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    fontSize: '13px',
    color: '#666666',
  },
  difficulty: {
    fontSize: '14px',
    color: '#F5A623',
    letterSpacing: '1px',
  },
  ingredientsSection: {},
  sectionLabel: {
    fontSize: '13px',
    color: '#888888',
    marginBottom: '8px',
    fontWeight: '500',
  },
  ingredientsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  ingredientChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
  },
  ingredientChipName: {
    fontSize: '12px',
  },
  missingTag: {
    fontSize: '10px',
    opacity: 0.7,
    marginLeft: '2px',
  },
  stepsSection: {
    paddingTop: '4px',
    borderTop: '1px dashed #E0E0E0',
  },
  stepsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  stepItem: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    backgroundColor: '#F5A623',
    color: '#FFFFFF',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepText: {
    fontSize: '13px',
    color: '#555555',
    lineHeight: 1.5,
    flex: 1,
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: '8px',
    borderTop: '1px solid #E8E8E8',
  },
  nutritionInfo: {},
  nutritionItem: {
    fontSize: '12px',
    color: '#888888',
  },
  logBtn: {
    padding: '6px 14px',
    backgroundColor: '#F5A623',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'transform 0.2s ease',
  },
  expandHint: {
    textAlign: 'center',
    fontSize: '11px',
    color: '#BBBBBB',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '480px',
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: '24px',
    position: 'relative',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333333',
  },
  closeBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#F0F0F0',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666666',
  },
  modalRecipeInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: '12px 16px',
    borderRadius: '10px',
    marginBottom: '20px',
  },
  modalRecipeName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333333',
  },
  modalRecipeCalories: {
    fontSize: '14px',
    color: '#F5A623',
    fontWeight: '500',
  },
  mealTypeSection: {
    marginBottom: '20px',
  },
  mealTypeTabs: {
    display: 'flex',
    gap: '8px',
  },
  mealTypeTab: {
    flex: 1,
    padding: '10px 8px',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#666666',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  mealTypeTabActive: {
    borderColor: '#F5A623',
    backgroundColor: '#FFF8E1',
    color: '#F5A623',
    fontWeight: '500',
  },
  mealTypeIcon: {
    fontSize: '18px',
  },
  servingsSection: {
    marginBottom: '20px',
  },
  servingsControl: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    marginBottom: '12px',
  },
  servingsBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '1px solid #E0E0E0',
    backgroundColor: '#FFFFFF',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666666',
  },
  servingsValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#F5A623',
    minWidth: '80px',
    textAlign: 'center',
  },
  servingsSlider: {},
  rangeInput: {
    width: '100%',
    accentColor: '#F5A623',
    margin: '8px 0',
  },
  rangeLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#999999',
  },
  summarySection: {
    backgroundColor: '#F8F8F8',
    borderRadius: '10px',
    padding: '14px',
    marginBottom: '20px',
  },
  summaryLabel: {
    fontSize: '13px',
    color: '#888888',
    marginBottom: '10px',
  },
  summaryGrid: {
    display: 'flex',
    justifyContent: 'space-around',
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  summaryValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333333',
  },
  summaryUnit: {
    fontSize: '12px',
    color: '#999999',
  },
  confirmBtn: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#F5A623',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
  },
};

export default RecipeSuggestion;
