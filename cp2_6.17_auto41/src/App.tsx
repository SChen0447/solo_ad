import { useState, useEffect, useCallback } from 'react';
import {
  Recipe,
  FridgeItem,
  Ingredient,
  getRecipes,
  addRecipe as apiAddRecipe,
  getFridge,
  addFridgeItem as apiAddFridgeItem,
  deleteFridgeItem as apiDeleteFridgeItem,
} from './utils/api';
import RecipeCard from './components/RecipeCard';
import RecipeDetail from './components/RecipeDetail';
import FridgePage from './components/FridgePage';

type Page = 'home' | 'detail' | 'fridge';
type SyncStatus = 'synced' | 'syncing' | 'error';

function App() {
  const [page, setPage] = useState<Page>('home');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [fridge, setFridge] = useState<FridgeItem[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [showAddForm, setShowAddForm] = useState(false);

  const [newName, setNewName] = useState('');
  const [newCookTime, setNewCookTime] = useState('');
  const [newDifficulty, setNewDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [newCoverImage, setNewCoverImage] = useState('');
  const [newIngredients, setNewIngredients] = useState<Ingredient[]>([
    { name: '', amount: '' },
    { name: '', amount: '' },
  ]);
  const [newSteps, setNewSteps] = useState<string[]>(['']);

  const syncing = useCallback(() => setSyncStatus('syncing'), []);
  const synced = useCallback(() => {
    setTimeout(() => setSyncStatus('synced'), 300);
  }, []);
  const error = useCallback(() => setSyncStatus('error'), []);

  const loadData = useCallback(async () => {
    syncing();
    try {
      const [recipesData, fridgeData] = await Promise.all([getRecipes(), getFridge()]);
      setRecipes(recipesData);
      setFridge(fridgeData);
      synced();
    } catch {
      error();
    }
  }, [syncing, synced, error]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRecipeClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setPage('detail');
  };

  const handleGoHome = () => {
    setPage('home');
    setSelectedRecipe(null);
  };

  const handleGoFridge = () => {
    setPage('fridge');
  };

  const handleAddFridgeItem = async (name: string, quantity: string) => {
    syncing();
    try {
      const newItem = await apiAddFridgeItem({ name, quantity });
      setFridge((prev) => [...prev, newItem]);
      synced();
    } catch {
      error();
    }
  };

  const handleDeleteFridgeItem = async (id: string) => {
    syncing();
    try {
      await apiDeleteFridgeItem(id);
      setFridge((prev) => prev.filter((item) => item.id !== id));
      synced();
    } catch {
      error();
    }
  };

  const handleAddIngredientRow = () => {
    setNewIngredients((prev) => [...prev, { name: '', amount: '' }]);
  };

  const handleRemoveIngredientRow = (index: number) => {
    setNewIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, field: 'name' | 'amount', value: string) => {
    setNewIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing))
    );
  };

  const handleAddStepRow = () => {
    setNewSteps((prev) => [...prev, '']);
  };

  const handleRemoveStepRow = (index: number) => {
    setNewSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStepChange = (index: number, value: string) => {
    setNewSteps((prev) => prev.map((s, i) => (i === index ? value : s)));
  };

  const resetAddForm = () => {
    setNewName('');
    setNewCookTime('');
    setNewDifficulty('easy');
    setNewCoverImage('');
    setNewIngredients([{ name: '', amount: '' }, { name: '', amount: '' }]);
    setNewSteps(['']);
    setShowAddForm(false);
  };

  const handleSubmitRecipe = async () => {
    if (!newName.trim()) return;
    const validIngredients = newIngredients.filter((ing) => ing.name.trim());
    const validSteps = newSteps.filter((s) => s.trim());
    if (validIngredients.length === 0 || validSteps.length === 0) return;

    syncing();
    try {
      const recipe = await apiAddRecipe({
        name: newName.trim(),
        ingredients: validIngredients,
        steps: validSteps,
        cookTime: parseInt(newCookTime) || 30,
        difficulty: newDifficulty,
        coverImage: newCoverImage.trim() || '',
      });
      setRecipes((prev) => [...prev, recipe]);
      resetAddForm();
      synced();
    } catch {
      error();
    }
  };

  const syncText: Record<SyncStatus, string> = {
    synced: '已同步',
    syncing: '同步中...',
    error: '同步错误',
  };

  const renderPage = () => {
    if (page === 'detail' && selectedRecipe) {
      return <RecipeDetail recipe={selectedRecipe} onBack={handleGoHome} />;
    }

    if (page === 'fridge') {
      return (
        <FridgePage
          fridge={fridge}
          recipes={recipes}
          onAddItem={handleAddFridgeItem}
          onDeleteItem={handleDeleteFridgeItem}
          onRecipeClick={handleRecipeClick}
        />
      );
    }

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 className="page-title" style={{ marginBottom: 0 }}>
            📖 我的菜谱
          </h1>
          <button
            className="add-btn"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? '取消' : '+ 添加菜谱'}
          </button>
        </div>

        {showAddForm && (
          <div className="add-recipe-form">
            <h2 className="section-title" style={{ marginTop: 0 }}>
              新增菜谱
            </h2>

            <div className="form-group">
              <label className="form-label">菜名 *</label>
              <input
                type="text"
                placeholder="请输入菜名"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">烹饪时间（分钟）</label>
                <input
                  type="number"
                  placeholder="30"
                  value={newCookTime}
                  onChange={(e) => setNewCookTime(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">难度等级</label>
                <select
                  value={newDifficulty}
                  onChange={(e) =>
                    setNewDifficulty(e.target.value as 'easy' | 'medium' | 'hard')
                  }
                  style={{ width: '100%' }}
                >
                  <option value="easy">低难度</option>
                  <option value="medium">中难度</option>
                  <option value="hard">高难度</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">封面图片URL</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={newCoverImage}
                  onChange={(e) => setNewCoverImage(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">食材列表 *</label>
              {newIngredients.map((ing, index) => (
                <div key={index} className="form-row">
                  <input
                    type="text"
                    placeholder="食材名称"
                    value={ing.name}
                    onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="用量（如：200g）"
                    value={ing.amount}
                    onChange={(e) => handleIngredientChange(index, 'amount', e.target.value)}
                  />
                  {newIngredients.length > 1 && (
                    <button
                      className="remove-btn"
                      onClick={() => handleRemoveIngredientRow(index)}
                    >
                      删除
                    </button>
                  )}
                </div>
              ))}
              <button className="sub-btn" onClick={handleAddIngredientRow} style={{ marginTop: 8 }}>
                + 添加食材
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">烹饪步骤 *</label>
              {newSteps.map((step, index) => (
                <div key={index} className="form-row">
                  <input
                    type="text"
                    placeholder={`步骤 ${index + 1}`}
                    value={step}
                    onChange={(e) => handleStepChange(index, e.target.value)}
                  />
                  {newSteps.length > 1 && (
                    <button
                      className="remove-btn"
                      onClick={() => handleRemoveStepRow(index)}
                    >
                      删除
                    </button>
                  )}
                </div>
              ))}
              <button className="sub-btn" onClick={handleAddStepRow} style={{ marginTop: 8 }}>
                + 添加步骤
              </button>
            </div>

            <div style={{ marginTop: 24 }}>
              <button className="submit-btn" onClick={handleSubmitRecipe}>
                保存菜谱
              </button>
              <button className="sub-btn" onClick={resetAddForm}>
                取消
              </button>
            </div>
          </div>
        )}

        {recipes.length === 0 ? (
          <div className="empty-state">
            还没有菜谱，点击右上角"添加菜谱"来创建第一个菜谱吧！
          </div>
        ) : (
          <div className="recipe-grid">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onClick={() => handleRecipeClick(recipe)}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <nav className="navbar">
        <button className="nav-btn" onClick={handleGoHome}>
          🏠 首页
        </button>
        <span className="navbar-title">🍳 灵感食谱</span>
        <button className="nav-btn" onClick={handleGoFridge}>
          🧊 我的冰箱
        </button>
      </nav>

      <main className="main-content">{renderPage()}</main>

      <div className="sync-status">
        <span className={`sync-dot sync-${syncStatus}`} />
        <span>{syncText[syncStatus]}</span>
      </div>
    </>
  );
}

export default App;
