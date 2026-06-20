import { useRef, useState } from 'react';
import { useRecipeContext } from '../App';
import { exportRecipesToJson, downloadJsonFile, readFileAsText, importRecipesFromJson, formatMinutes } from '../utils';
import './RecipeList.css';

function RecipeList() {
  const { recipes, currentRecipe, selectRecipe, addRecipe, importRecipes, deleteRecipe } = useRecipeContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newRecipeName, setNewRecipeName] = useState('');
  const [newRecipeDesc, setNewRecipeDesc] = useState('');

  const handleExport = () => {
    const json = exportRecipesToJson(recipes);
    downloadJsonFile(json, `recipes-${new Date().toISOString().slice(0, 10)}.json`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await readFileAsText(file);
      const imported = importRecipesFromJson(text);
      importRecipes(imported);
    } catch (err) {
      console.error('Import failed:', err);
      alert('导入失败：文件格式不正确');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateRecipe = () => {
    if (!newRecipeName.trim()) return;

    addRecipe({
      name: newRecipeName.trim(),
      description: newRecipeDesc.trim(),
      steps: [],
    });

    setNewRecipeName('');
    setNewRecipeDesc('');
    setIsCreating(false);
  };

  const handleCancelCreate = () => {
    setNewRecipeName('');
    setNewRecipeDesc('');
    setIsCreating(false);
  };

  const getTotalDuration = (recipe: { steps: { duration: number }[] }) => {
    return recipe.steps.reduce((sum, step) => sum + step.duration, 0);
  };

  return (
    <div className="recipe-list">
      <div className="recipe-list-header">
        <h1 className="recipe-list-title">食谱列表</h1>
        <div className="recipe-list-actions">
          <button className="btn btn-sm" onClick={handleImportClick} title="导入食谱">
            导入
          </button>
          <button className="btn btn-sm" onClick={handleExport} title="导出食谱">
            导出
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      </div>

      <button className="btn btn-primary add-recipe-btn" onClick={() => setIsCreating(true)}>
        + 新建食谱
      </button>

      {isCreating && (
        <div className="create-recipe-form">
          <input
            type="text"
            placeholder="食谱名称"
            value={newRecipeName}
            onChange={(e) => setNewRecipeName(e.target.value)}
            className="recipe-input"
            autoFocus
          />
          <textarea
            placeholder="食谱描述（可选）"
            value={newRecipeDesc}
            onChange={(e) => setNewRecipeDesc(e.target.value)}
            className="recipe-textarea"
            rows={2}
          />
          <div className="form-actions">
            <button className="btn btn-sm btn-primary" onClick={handleCreateRecipe}>
              创建
            </button>
            <button className="btn btn-sm" onClick={handleCancelCreate}>
              取消
            </button>
          </div>
        </div>
      )}

      <div className="recipe-cards">
        {recipes.map((recipe) => (
          <div
            key={recipe.id}
            className={`recipe-card ${currentRecipe?.id === recipe.id ? 'active' : ''}`}
            onClick={() => selectRecipe(recipe.id)}
          >
            <div className="recipe-card-content">
              <h3 className="recipe-card-title">{recipe.name}</h3>
              {recipe.description && (
                <p className="recipe-card-desc">{recipe.description}</p>
              )}
              <div className="recipe-card-meta">
                <span>{recipe.steps.length} 个步骤</span>
                <span>·</span>
                <span>约 {formatMinutes(getTotalDuration(recipe))}</span>
              </div>
            </div>
            <button
              className="recipe-delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`确定要删除"${recipe.name}"吗？`)) {
                  deleteRecipe(recipe.id);
                }
              }}
              title="删除食谱"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {recipes.length === 0 && (
        <div className="empty-recipes">
          <p>还没有食谱</p>
          <p className="empty-hint">点击上方按钮创建第一个食谱吧</p>
        </div>
      )}
    </div>
  );
}

export default RecipeList;
