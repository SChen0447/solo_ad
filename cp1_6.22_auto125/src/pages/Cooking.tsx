import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecipeById } from '../services/api';
import type { Recipe } from '../types';
import './Cooking.css';

function Cooking() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [animateKey, setAnimateKey] = useState(0);

  useEffect(() => {
    if (id) {
      loadRecipe(id);
    }
  }, [id]);

  async function loadRecipe(recipeId: string) {
    try {
      const data = await getRecipeById(recipeId);
      setRecipe(data);
    } catch (error) {
      console.error('加载菜谱失败:', error);
    } finally {
      setLoading(false);
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setAnimateKey(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (recipe && currentStep < recipe.steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setAnimateKey(prev => prev + 1);
    }
  };

  const handleBack = () => {
    navigate('/recommend');
  };

  if (loading) {
    return <div className="page-container"><div className="loading">加载中...</div></div>;
  }

  if (!recipe) {
    return (
      <div className="page-container">
        <div className="error-state">
          <p>菜谱不存在</p>
          <button className="btn-primary" onClick={handleBack}>返回推荐</button>
        </div>
      </div>
    );
  }

  const totalSteps = recipe.steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="page-container cooking-page">
      <div className="cooking-header">
        <button className="btn-back" onClick={handleBack}>
          ← 返回
        </button>
        <h1 className="recipe-title">{recipe.name}</h1>
        <div className="step-count">
          第 {currentStep + 1} 步 / 共 {totalSteps} 步
        </div>
      </div>

      <div className="cooking-card-container">
        <div
          key={animateKey}
          className="cooking-card"
          style={{
            width: '600px',
            height: '400px',
            borderRadius: '16px',
            backgroundColor: '#1e293b',
            color: 'white'
          }}
        >
          <div className="step-number">
            步骤 {currentStep + 1}
          </div>
          <div className="step-content">
            <p className="step-text">{recipe.steps[currentStep]}</p>
          </div>

          <div className="card-footer">
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="nav-buttons">
              <button
                className="btn-nav"
                onClick={handlePrev}
                disabled={currentStep === 0}
              >
                上一步
              </button>
              <button
                className="btn-nav btn-next"
                onClick={handleNext}
                disabled={currentStep === totalSteps - 1}
              >
                {currentStep === totalSteps - 1 ? '完成' : '下一步'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="ingredients-summary">
        <h3>食材清单</h3>
        <div className="ingredient-list">
          {recipe.ingredients.map((ing, idx) => (
            <div key={idx} className="ingredient-item">
              <span className="ingredient-name">{ing.name}</span>
              <span className="ingredient-amount">{ing.quantity} {ing.unit}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="steps-overview">
        <h3>步骤概览</h3>
        <div className="steps-list">
          {recipe.steps.map((step, idx) => (
            <div
              key={idx}
              className={`step-overview-item ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'completed' : ''}`}
              onClick={() => {
                setCurrentStep(idx);
                setAnimateKey(prev => prev + 1);
              }}
            >
              <span className="step-index">{idx + 1}</span>
              <span className="step-preview">{step.slice(0, 30)}{step.length > 30 ? '...' : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Cooking;
