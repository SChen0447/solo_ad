import { useState } from 'react'
import type { Recipe } from '../types'

interface ProgressPanelProps {
  recipes: Recipe[]
  onUpdateAssignee: (recipeId: string, assignee: string) => void
  getAvatarColor: (name?: string) => string
  getAvatarText: (name?: string) => string
}

function ProgressPanel({
  recipes,
  onUpdateAssignee,
  getAvatarColor,
  getAvatarText
}: ProgressPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')

  const handleStartEdit = (recipe: Recipe) => {
    setEditingId(recipe.id)
    setInputValue(recipe.assignee || '')
  }

  const handleSaveAssignee = (recipeId: string) => {
    onUpdateAssignee(recipeId, inputValue.trim())
    setEditingId(null)
    setInputValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent, recipeId: string) => {
    if (e.key === 'Enter') {
      handleSaveAssignee(recipeId)
    } else if (e.key === 'Escape') {
      setEditingId(null)
      setInputValue('')
    }
  }

  const totalCompleted = recipes.filter(r => r.completed).length
  const totalRecipes = recipes.length

  return (
    <div className="card">
      <h2 className="section-title">
        📊 协作进度
        <span style={{
          fontSize: '13px',
          fontWeight: 'normal',
          color: '#9CA3AF',
          marginLeft: '8px'
        }}>
          已完成 {totalCompleted}/{totalRecipes} 道菜
        </span>
      </h2>

      {recipes.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0' }}>
          暂无食谱，请先添加食谱
        </div>
      ) : (
        <div>
          {recipes.map(recipe => {
            const completedSteps = recipe.steps.filter(s => s.completed).length
            const totalSteps = recipe.steps.length
            const progressPercent = totalSteps > 0
              ? Math.round((completedSteps / totalSteps) * 100)
              : 0

            return (
              <div
                key={recipe.id}
                className="progress-item"
                style={{
                  borderColor: recipe.completed ? '#10B981' : '#E5E7EB',
                  background: recipe.completed ? '#ECFDF5' : 'white'
                }}
              >
                <div className="progress-item-header">
                  <div
                    className="avatar"
                    style={{ background: getAvatarColor(recipe.assignee) }}
                  >
                    {getAvatarText(recipe.assignee)}
                  </div>
                  <div className="progress-item-info">
                    <div className="progress-item-name">
                      {recipe.name}
                      {recipe.completed && (
                        <span style={{
                          marginLeft: '8px',
                          fontSize: '12px',
                          color: '#10B981'
                        }}>
                          ✓ 已完成
                        </span>
                      )}
                    </div>
                    {editingId === recipe.id ? (
                      <input
                        type="text"
                        className="assignee-input"
                        placeholder="负责人姓名"
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onBlur={() => handleSaveAssignee(recipe.id)}
                        onKeyDown={e => handleKeyDown(e, recipe.id)}
                        autoFocus
                        style={{ fontSize: '16px' }}
                      />
                    ) : (
                      <div
                        style={{
                          fontSize: '14px',
                          color: '#6B7280',
                          cursor: 'pointer',
                          padding: '4px 0'
                        }}
                        onClick={() => handleStartEdit(recipe)}
                      >
                        {recipe.assignee ? `👤 ${recipe.assignee}` : '👤 点击分配负责人'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="progress-bar-container">
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="progress-percent">{progressPercent}%</span>
                </div>

                <div style={{
                  marginTop: '8px',
                  fontSize: '12px',
                  color: '#9CA3AF',
                  textAlign: 'right'
                }}>
                  {completedSteps} / {totalSteps} 步完成
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ProgressPanel
