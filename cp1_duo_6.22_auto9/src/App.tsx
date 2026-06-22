import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import RecipeEditor from './RecipeEditor';
import ShoppingList from './ShoppingList';
import VersionCompare from './VersionCompare';
import {
  Recipe,
  RecipeVersion,
  PageView,
  Ingredient,
  IngredientCategory,
  Step,
} from './types';

const STORAGE_KEYS = {
  RECIPES: 'recipe_collab_recipes',
  VERSIONS: 'recipe_collab_versions',
};

function createSampleRecipes(): Recipe[] {
  const id1 = uuidv4();
  const id2 = uuidv4();
  return [
    {
      id: id1,
      title: '番茄炒蛋',
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 3600000,
      ingredients: [
        { id: uuidv4(), name: '番茄', quantity: '3', unit: '个', substitute: '圣女果', category: 'vegetable' as IngredientCategory },
        { id: uuidv4(), name: '鸡蛋', quantity: '3', unit: '个', substitute: '鸭蛋', category: 'other' as IngredientCategory },
        { id: uuidv4(), name: '葱花', quantity: '1', unit: '小把', substitute: '葱粉', category: 'vegetable' as IngredientCategory },
        { id: uuidv4(), name: '盐', quantity: '2', unit: '克', substitute: '海盐', category: 'seasoning' as IngredientCategory },
        { id: uuidv4(), name: '白糖', quantity: '5', unit: '克', substitute: '', category: 'seasoning' as IngredientCategory },
      ],
      steps: [
        { id: uuidv4(), description: '番茄切块，鸡蛋打散加少许盐搅匀。', imageUrl: null },
        { id: uuidv4(), description: '热锅下油，倒入蛋液炒至金黄盛出备用。', imageUrl: null },
        { id: uuidv4(), description: '锅中再加少许油，下番茄翻炒出汁。', imageUrl: null },
        { id: uuidv4(), description: '加入炒好的鸡蛋，加盐和糖调味，翻炒均匀，出锅撒葱花即可。', imageUrl: null },
      ],
    },
    {
      id: id2,
      title: '清炒时蔬',
      createdAt: Date.now() - 172800000,
      updatedAt: Date.now() - 7200000,
      ingredients: [
        { id: uuidv4(), name: '西兰花', quantity: '1', unit: '颗', substitute: '花椰菜', category: 'vegetable' as IngredientCategory },
        { id: uuidv4(), name: '胡萝卜', quantity: '1', unit: '根', substitute: '', category: 'vegetable' as IngredientCategory },
        { id: uuidv4(), name: '蒜末', quantity: '3', unit: '瓣', substitute: '', category: 'vegetable' as IngredientCategory },
        { id: uuidv4(), name: '生抽', quantity: '10', unit: '毫升', substitute: '酱油', category: 'seasoning' as IngredientCategory },
      ],
      steps: [
        { id: uuidv4(), description: '西兰花切小朵，胡萝卜切片，分别焯水后过凉水沥干。', imageUrl: null },
        { id: uuidv4(), description: '热锅下油，爆香蒜末。', imageUrl: null },
        { id: uuidv4(), description: '下西兰花和胡萝卜翻炒均匀，加生抽调味即可出锅。', imageUrl: null },
      ],
    },
  ];
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function App() {
  const [currentView, setCurrentView] = useState<PageView>('list');
  const [recipes, setRecipes] = useState<Recipe[]>(() =>
    loadFromStorage(STORAGE_KEYS.RECIPES, createSampleRecipes())
  );
  const [versions, setVersions] = useState<RecipeVersion[]>(() =>
    loadFromStorage(STORAGE_KEYS.VERSIONS, [])
  );
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [compareRecipeId, setCompareRecipeId] = useState<string | null>(null);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.RECIPES, recipes);
  }, [recipes]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.VERSIONS, versions);
  }, [versions]);

  const createNewRecipe = useCallback(() => {
    const newRecipe: Recipe = {
      id: uuidv4(),
      title: '新菜谱',
      ingredients: [],
      steps: [{ id: uuidv4(), description: '', imageUrl: null }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setRecipes((prev) => [newRecipe, ...prev]);
    setEditingRecipeId(newRecipe.id);
    setCurrentView('editor');
  }, []);

  const openRecipeEditor = useCallback((id: string) => {
    setEditingRecipeId(id);
    setCurrentView('editor');
  }, []);

  const openVersionCompare = useCallback((id: string) => {
    setCompareRecipeId(id);
    setCurrentView('versions');
  }, []);

  const deleteRecipe = useCallback((id: string) => {
    if (window.confirm('确定要删除这个菜谱吗？')) {
      setRecipes((prev) => prev.filter((r) => r.id !== id));
      setVersions((prev) => prev.filter((v) => v.recipeId !== id));
    }
  }, []);

  const saveRecipe = useCallback(
    (updated: Recipe, saveNote: string) => {
      setRecipes((prev) =>
        prev.map((r) =>
          r.id === updated.id ? { ...updated, updatedAt: Date.now() } : r
        )
      );
      const newVersion: RecipeVersion = {
        id: uuidv4(),
        recipeId: updated.id,
        title: updated.title,
        ingredients: JSON.parse(JSON.stringify(updated.ingredients)) as Ingredient[],
        steps: JSON.parse(JSON.stringify(updated.steps)) as Step[],
        createdAt: Date.now(),
        note: saveNote || `保存于 ${formatDate(Date.now())}`,
      };
      setVersions((prev) => [newVersion, ...prev]);
    },
    []
  );

  const restoreVersion = useCallback(
    (version: RecipeVersion) => {
      if (!window.confirm('确定要恢复到此版本吗？当前内容将被覆盖。')) return;
      setRecipes((prev) =>
        prev.map((r) =>
          r.id === version.recipeId
            ? {
                ...r,
                title: version.title,
                ingredients: JSON.parse(JSON.stringify(version.ingredients)) as Ingredient[],
                steps: JSON.parse(JSON.stringify(version.steps)) as Step[],
                updatedAt: Date.now(),
              }
            : r
        )
      );
      const restoreVersionNote: RecipeVersion = {
        id: uuidv4(),
        recipeId: version.recipeId,
        title: version.title,
        ingredients: JSON.parse(JSON.stringify(version.ingredients)) as Ingredient[],
        steps: JSON.parse(JSON.stringify(version.steps)) as Step[],
        createdAt: Date.now(),
        note: `恢复自版本: ${version.note}`,
      };
      setVersions((prev) => [restoreVersionNote, ...prev]);
    },
    []
  );

  const editingRecipe = recipes.find((r) => r.id === editingRecipeId) || null;
  const recipeVersions = versions.filter((v) => v.recipeId === compareRecipeId);

  const renderRecipeList = () => (
    <div className="page-fade">
      <div className="page-header">
        <h1 className="page-title">🍳 菜谱列表</h1>
        <button className="btn btn-primary" onClick={createNewRecipe}>
          + 新建菜谱
        </button>
      </div>
      {recipes.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">🍽️</div>
          <div className="empty-state-title">还没有菜谱</div>
          <div>点击右上角按钮创建你的第一个菜谱吧</div>
        </div>
      ) : (
        <div className="recipe-list">
          {recipes.map((r) => (
            <div key={r.id} className="card card-hover recipe-card">
              <div className="recipe-card-header">
                <div>
                  <div className="recipe-card-title">{r.title}</div>
                  <div className="recipe-card-meta">
                    更新于 {formatDate(r.updatedAt)}</div>
                </div>
                <div className="recipe-card-actions">
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      openRecipeEditor(r.id);
                    }}
                  >
                    编辑
                  </button>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      openVersionCompare(r.id);
                    }}
                  >
                    版本
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteRecipe(r.id);
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
              <div className="recipe-card-meta">
                🥕 {r.ingredients.length} 种食材 · 👨‍🍳 {r.steps.length} 个步骤
              </div>
              {r.ingredients.length > 0 && (
                <div className="recipe-card-meta">
                {r.ingredients.slice(0, 3).map((ing) => (
                  <span key={ing.id} style={{ marginRight: 8 }}>
                    {ing.name}
                  </span>
                ))}
                {r.ingredients.length > 3 && (
                  <span>等 {r.ingredients.length} 项</span>
                )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-logo">
            <span className="app-logo-icon">🥘</span>
            <span>食谱协作平台</span>
          </div>
          <nav className="nav-tabs">
            <button
              className={`nav-tab ${currentView === 'list' ? 'active' : ''}`}
              onClick={() => setCurrentView('list')}
            >
              菜谱列表
            </button>
            <button
              className={`nav-tab ${currentView === 'editor' ? 'active' : ''}`}
              onClick={() => {
                if (!editingRecipe) return;
                setCurrentView('editor');
              }}
              disabled={!editingRecipe}
              style={!editingRecipe ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              编辑器
            </button>
            <button
              className={`nav-tab ${currentView === 'shopping' ? 'active' : ''}`}
              onClick={() => setCurrentView('shopping')}
            >
              🛒 购物清单
            </button>
            <button
              className={`nav-tab ${currentView === 'versions' ? 'active' : ''}`}
              onClick={() => {
                if (!compareRecipeId) return;
                setCurrentView('versions');
              }}
              disabled={!compareRecipeId}
              style={!compareRecipeId ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              版本对比
            </button>
          </nav>
        </div>
      </header>

      <main className="app-main">
        {currentView === 'list' && renderRecipeList()}

        {currentView === 'editor' && editingRecipe && (
          <RecipeEditor
            key={editingRecipe.id}
            recipe={editingRecipe}
            onSave={saveRecipe}
            onBack={() => setCurrentView('list')}
          />
        )}

        {currentView === 'shopping' && (
          <ShoppingList recipes={recipes} />
        )}

        {currentView === 'versions' && compareRecipeId && (
          <VersionCompare
            recipeId={compareRecipeId}
            versions={recipeVersions}
            onRestore={restoreVersion}
            onBack={() => setCurrentView('list')}
          />
        )}
      </main>
    </div>
  );
}
