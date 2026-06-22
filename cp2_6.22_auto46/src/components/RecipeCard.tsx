import { useState } from 'react'
import type { Recipe, Step } from '../types'

interface RecipeCardProps {
  recipe: Recipe
  onDelete: (id: string) => void
  onEdit: (recipe: Recipe) => void
  onStepComplete: (recipeId: string, stepId: string, completed: boolean) => void
  avatarColor: string
  avatarText: string
}

const cuisineNames: Record<string, string> = {
  chinese: '中餐',
  western: '西餐',
  japanese: '日料',
  other: '其他'
}

function RecipeCard({
  recipe,
  onDelete,
  onEdit,
  onStepComplete,
  avatarColor,
  avatarText
}: RecipeCardProps) {
  const [showDetail, setShowDetail] = useState(false)

  const completedSteps = recipe.steps.filter(s => s.completed).length
  const totalSteps = recipe.steps.length
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

  const ingredientPreview = recipe.ingredients
    .slice(0, 3)
    .map(i => i.name)
    .join('、')

  const totalEstimatedTime = recipe.steps.reduce((sum, s) => sum + s.estimatedTime, 0)

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`确定要删除「${recipe.name}」吗？`)) {
      onDelete(recipe.id)
    }
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit(recipe)
  }

  return (
    <>
      <div
        className={`recipe-card ${recipe.cuisine}`}
        onClick={() => setShowDetail(true)}
      >
        <div className="recipe-card-header">
          <h3>{recipe.name}</h3>
          <div className="recipe-card-actions">
            <button
              className="action-btn"
              onClick={handleEdit}
              title="编辑"
            >
              ✎
            </button>
            <button
              className="action-btn delete"
              onClick={handleDelete}
              title="删除"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="recipe-card-info">
          <span className={`cuisine-tag ${recipe.cuisine}`}>
            {cuisineNames[recipe.cuisine]}
          </span>
          {recipe.assignee && (
            <span style={{ marginLeft: '8px', fontSize: '12px' }}>
              👤 {recipe.assignee}
            </span>
          )}
        </div>

        <div className="recipe-card-ingredients">
          🥗 {ingredientPreview}
          {recipe.ingredients.length > 3 && ` 等${recipe.ingredients.length}样`}
        </div>

        <div className="recipe-card-steps">
          <span>📝 {completedSteps}/{totalSteps} 步</span>
          <span>⏱ 约 {totalEstimatedTime} 分钟</span>
        </div>
      </div>

      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{recipe.name}</h2>
                <span className={`cuisine-tag ${recipe.cuisine}`} style={{ marginTop: '8px' }}>
                  {cuisineNames[recipe.cuisine]}
                </span>
              </div>
              <button className="close-btn" onClick={() => setShowDetail(false)}>
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#374151' }}>
                🥗 所需食材
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {recipe.ingredients.map(ing => (
                  <span
                    key={ing.id}
                    style={{
                      padding: '4px 12px',
                      background: '#FFF7ED',
                      borderRadius: '16px',
                      fontSize: '13px',
                      color: '#92400E'
                    }}
                  >
                    {ing.name} {ing.quantity}{ing.unit}
                  </span>
                ))}
              </div>
            </div>

            <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#374151' }}>
              👨‍🍳 烹饪步骤
            </h3>

            {recipe.steps.map(step => (
              <StepItem
                key={step.id}
                step={step}
                onToggle={(completed) => onStepComplete(recipe.id, step.id, completed)}
              />
            ))}

            <div className="modal-footer">
              <div style={{ marginRight: 'auto', color: '#6B7280', fontSize: '14px' }}>
                完成进度：{progressPercent}% ({completedSteps}/{totalSteps} 步)
              </div>
              <button className="btn-secondary" onClick={() => setShowDetail(false)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function StepItem({
  step,
  onToggle
}: {
  step: Step
  onToggle: (completed: boolean) => void
}) {
  const actualTime = step.completed ? step.actualTime || step.estimatedTime : 0
  const timePercent = step.estimatedTime > 0
    ? Math.min(100, Math.round((actualTime / step.estimatedTime) * 100))
    : 0

  return (
    <div className={`step-item ${step.completed ? 'completed' : ''}`}>
      <div className="step-header">
        <div
          className={`custom-checkbox ${step.completed ? 'checked' : ''}`}
          onClick={() => onToggle(!step.completed)}
        />
        <div className="step-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="step-number">{step.stepNumber}</span>
            <span className="step-description">{step.description}</span>
          </div>
          <div className="step-time-bar">
            <div
              className="step-time-fill"
              style={{ width: `${timePercent}%` }}
            />
          </div>
          <div className="step-time-info">
            <span>实际：{step.completed ? actualTime : 0} 分钟</span>
            <span>预计：{step.estimatedTime} 分钟</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RecipeCard
