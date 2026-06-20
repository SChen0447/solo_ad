import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import type { Recipe, ViewMode, Step } from './types';
import RecipeList from './components/RecipeList';
import RecipeDetail from './components/RecipeDetail';
import CookingMode from './components/CookingMode';
import { generateId, playDingSound } from './utils';
import './App.css';

interface RecipeContextType {
  recipes: Recipe[];
  currentRecipe: Recipe | null;
  currentStepIndex: number;
  viewMode: ViewMode;
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt'>) => void;
  updateRecipe: (id: string, recipe: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;
  selectRecipe: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  addStep: (recipeId: string, step: Omit<Step, 'id'>) => void;
  updateStep: (recipeId: string, stepId: string, step: Partial<Step>) => void;
  deleteStep: (recipeId: string, stepId: string) => void;
  reorderSteps: (recipeId: string, fromIndex: number, toIndex: number) => void;
  setCurrentStepIndex: (index: number) => void;
  importRecipes: (recipes: Recipe[]) => void;
  showImportSuccess: boolean;
  setShowImportSuccess: (show: boolean) => void;
}

const RecipeContext = createContext<RecipeContextType | null>(null);

export const useRecipeContext = () => {
  const context = useContext(RecipeContext);
  if (!context) {
    throw new Error('useRecipeContext must be used within RecipeProvider');
  }
  return context;
};

const STORAGE_KEY = 'cooking-recipes';

const getInitialRecipes = (): Recipe[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load recipes from localStorage', e);
  }
  return [
    {
      id: generateId(),
      name: '番茄炒蛋',
      description: '经典家常菜，简单又美味',
      createdAt: Date.now(),
      steps: [
        { id: generateId(), name: '准备食材', description: '番茄2个切块，鸡蛋3个打散加少许盐', duration: 3, hasTimer: false },
        { id: generateId(), name: '炒鸡蛋', description: '热锅倒油，倒入蛋液翻炒至凝固盛出', duration: 2, hasTimer: true },
        { id: generateId(), name: '炒番茄', description: '锅中再加少许油，放入番茄翻炒出汁', duration: 3, hasTimer: true },
        { id: generateId(), name: '混合调味', description: '倒入炒好的鸡蛋，加盐、糖调味，翻炒均匀', duration: 1, hasTimer: false },
      ],
    },
  ];
};

function App() {
  const [recipes, setRecipes] = useState<Recipe[]>(getInitialRecipes);
  const [currentRecipeId, setCurrentRecipeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const dingPlayedRef = useRef<Set<string>>(new Set());

  const currentRecipe = recipes.find((r) => r.id === currentRecipeId) || null;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
    } catch (e) {
      console.error('Failed to save recipes to localStorage', e);
    }
  }, [recipes]);

  const addRecipe = useCallback((recipeData: Omit<Recipe, 'id' | 'createdAt'>) => {
    const newRecipe: Recipe = {
      ...recipeData,
      id: generateId(),
      createdAt: Date.now(),
    };
    setRecipes((prev) => [...prev, newRecipe]);
  }, []);

  const updateRecipe = useCallback((id: string, updates: Partial<Recipe>) => {
    setRecipes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  }, []);

  const deleteRecipe = useCallback((id: string) => {
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    if (currentRecipeId === id) {
      setCurrentRecipeId(null);
      setViewMode('list');
    }
  }, [currentRecipeId]);

  const selectRecipe = useCallback((id: string | null) => {
    setCurrentRecipeId(id);
    if (id) {
      setViewMode('detail');
    } else {
      setViewMode('list');
    }
    setCurrentStepIndex(0);
    dingPlayedRef.current.clear();
  }, []);

  const addStep = useCallback((recipeId: string, stepData: Omit<Step, 'id'>) => {
    const newStep: Step = {
      ...stepData,
      id: generateId(),
    };
    setRecipes((prev) =>
      prev.map((r) =>
        r.id === recipeId ? { ...r, steps: [...r.steps, newStep] } : r
      )
    );
  }, []);

  const updateStep = useCallback((recipeId: string, stepId: string, updates: Partial<Step>) => {
    setRecipes((prev) =>
      prev.map((r) =>
        r.id === recipeId
          ? {
              ...r,
              steps: r.steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s)),
            }
          : r
      )
    );
  }, []);

  const deleteStep = useCallback((recipeId: string, stepId: string) => {
    setRecipes((prev) =>
      prev.map((r) =>
        r.id === recipeId
          ? { ...r, steps: r.steps.filter((s) => s.id !== stepId) }
          : r
      )
    );
  }, []);

  const reorderSteps = useCallback((recipeId: string, fromIndex: number, toIndex: number) => {
    setRecipes((prev) =>
      prev.map((r) => {
        if (r.id !== recipeId) return r;
        const newSteps = [...r.steps];
        const [moved] = newSteps.splice(fromIndex, 1);
        newSteps.splice(toIndex, 0, moved);
        return { ...r, steps: newSteps };
      })
    );
  }, []);

  const importRecipes = useCallback((importedRecipes: Recipe[]) => {
    setRecipes((prev) => {
      const existingIds = new Set(prev.map((r) => r.id));
      const newRecipes = importedRecipes.filter((r) => !existingIds.has(r.id));
      return [...prev, ...newRecipes];
    });
    setShowImportSuccess(true);
  }, []);

  const handleStepComplete = useCallback((stepId: string) => {
    if (!dingPlayedRef.current.has(stepId)) {
      dingPlayedRef.current.add(stepId);
      playDingSound();
    }
  }, []);

  const contextValue: RecipeContextType = {
    recipes,
    currentRecipe,
    currentStepIndex,
    viewMode,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    selectRecipe,
    setViewMode,
    addStep,
    updateStep,
    deleteStep,
    reorderSteps,
    setCurrentStepIndex,
    importRecipes,
    showImportSuccess,
    setShowImportSuccess,
  };

  const renderMainContent = () => {
    if (viewMode === 'cooking' && currentRecipe) {
      return <CookingMode onStepComplete={handleStepComplete} />;
    }
    if (viewMode === 'detail' && currentRecipe) {
      return <RecipeDetail />;
    }
    return (
      <div className="empty-state">
        <h2>欢迎使用烹饪食谱时间线</h2>
        <p>从左侧选择一个食谱开始，或创建新的食谱</p>
      </div>
    );
  };

  return (
    <RecipeContext.Provider value={contextValue}>
      <div className="app-container">
        <aside className="sidebar">
          <RecipeList />
        </aside>
        <main className="main-content">{renderMainContent()}</main>
      </div>
      {showImportSuccess && (
        <div className="modal-overlay" onClick={() => setShowImportSuccess(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <p className="modal-text">成功导入</p>
            <button className="btn btn-primary" onClick={() => setShowImportSuccess(false)}>
              确认
            </button>
          </div>
        </div>
      )}
    </RecipeContext.Provider>
  );
}

export default App;
