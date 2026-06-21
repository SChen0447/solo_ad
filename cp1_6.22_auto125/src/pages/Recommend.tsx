import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRecommendations, getFamilyMembers } from '../services/api';
import type { RecommendedRecipe, FamilyMember } from '../types';
import './Recommend.css';

function Recommend() {
  const [recipes, setRecipes] = useState<RecommendedRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadFamilyMembers();
    handleRecommend();
  }, []);

  async function loadFamilyMembers() {
    try {
      const data = await getFamilyMembers();
      setFamilyMembers(data);
    } catch (error) {
      console.error('加载家庭成员失败:', error);
    }
  }

  const handleRecommend = async () => {
    setLoading(true);
    try {
      const data = await getRecommendations(keyword, onlyAvailable);
      setRecipes(data);
    } catch (error) {
      console.error('获取推荐失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRecommend();
    }
  };

  const handleStartCooking = (recipeId: string) => {
    navigate(`/cooking/${recipeId}`);
  };

  const getAllergenTags = () => {
    const allergens = new Set<string>();
    familyMembers.forEach(member => {
      member.allergens.forEach(a => allergens.add(a));
    });
    return Array.from(allergens);
  };

  const allergenTags = getAllergenTags();

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>智能菜谱推荐</h1>
      </div>

      <div className="search-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="输入菜名关键词搜索..."
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyPress={handleKeyPress}
            className="search-input"
          />
          <button className="btn-primary search-btn" onClick={handleRecommend}>
            搜索推荐
          </button>
        </div>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={e => setOnlyAvailable(e.target.checked)}
            className="checkbox"
          />
          仅使用现有食材
        </label>
      </div>

      {allergenTags.length > 0 && (
        <div className="filter-info">
          <span className="filter-label">考虑过敏原：</span>
          {allergenTags.map(tag => (
            <span key={tag} className="allergen-tag">{tag}</span>
          ))}
        </div>
      )}

      {loading ? (
        <div className="loading">正在为您匹配最优菜谱...</div>
      ) : (
        <>
          {recipes.length === 0 ? (
            <div className="empty-state">
              <p>暂无匹配的菜谱，试试其他关键词吧</p>
            </div>
          ) : (
            <div className="recipe-grid">
              {recipes.map(recipe => (
                <div
                  key={recipe.id}
                  className="recipe-card"
                  onClick={() => handleStartCooking(recipe.id)}
                >
                  <div className="match-badge">
                    {recipe.matchScore}%
                  </div>
                  <div className="recipe-image">
                    🍽️
                  </div>
                  <h3 className="recipe-name">{recipe.name}</h3>
                  <div className="recipe-meta">
                    <span>食材匹配 {recipe.matchedIngredients}/{recipe.totalIngredients}</span>
                  </div>
                  <div className="recipe-tags">
                    {recipe.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="recipe-tag">{tag}</span>
                    ))}
                  </div>
                  <div className="recipe-ingredients">
                    <p className="ingredients-title">所需食材：</p>
                    <ul>
                      {recipe.ingredients.slice(0, 4).map((ing, idx) => (
                        <li key={idx}>
                          {ing.name} {ing.quantity}{ing.unit}
                        </li>
                      ))}
                      {recipe.ingredients.length > 4 && (
                        <li className="more-ingredients">...还有 {recipe.ingredients.length - 4} 种</li>
                      )}
                    </ul>
                  </div>
                  <button className="btn-cook" onClick={(e) => {
                    e.stopPropagation();
                    handleStartCooking(recipe.id);
                  }}>
                    开始烹饪
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Recommend;
