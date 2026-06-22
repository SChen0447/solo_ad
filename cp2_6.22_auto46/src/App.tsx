import { useState, useEffect, useCallback } from 'react'
import type { Recipe, ShoppingItem, Notification, FloatingTip } from './types'
import RecipeCard from './components/RecipeCard'
import ShoppingList from './components/ShoppingList'
import ProgressPanel from './components/ProgressPanel'

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : ''

const AVATAR_COLORS = [
  '#F87171', '#FB923C', '#FBBF24', '#A3E635',
  '#34D399', '#22D3EE', '#818CF8', '#F472B6'
]

function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState<Notification | null>(null)
  const [floatingTip, setFloatingTip] = useState<FloatingTip | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)

  const fetchRecipes = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/recipes`)
      const data = await res.json()
      setRecipes(data)
    } catch (error) {
      console.error('Failed to fetch recipes:', error)
    }
  }, [])

  const fetchShoppingList = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/shopping-list`)
      const data = await res.json()
      setShoppingList(data)
    } catch (error) {
      console.error('Failed to fetch shopping list:', error)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchRecipes(), fetchShoppingList()])
      setLoading(false)
    }
    loadData()
  }, [fetchRecipes, fetchShoppingList])

  const showToast = useCallback((message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 2000)
  }, [])

  const showNotification = useCallback((recipeName: string) => {
    const id = Date.now().toString()
    setNotification({
      id,
      type: 'success',
      message: `🎉 ${recipeName} 全部完成啦！`,
      visible: true
    })
    setFloatingTip({
      id,
      title: '✨ 一道菜完成了',
      description: `${recipeName} 已经全部准备就绪，可以端上桌享用啦！记得和大家分享美食的快乐~`,
      visible: true
    })
    setTimeout(() => {
      setNotification(null)
    }, 3500)
  }, [])

  const handleStepComplete = useCallback(async (recipeId: string, stepId: string, completed: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/api/recipes/${recipeId}/steps/${stepId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed, actualTime: completed ? 10 : undefined })
      })
      const data = await res.json()
      
      if (data.allCompleted && completed) {
        const recipe = recipes.find(r => r.id === recipeId)
        if (recipe) {
          showNotification(recipe.name)
        }
      }
      
      await fetchRecipes()
      await fetchShoppingList()
    } catch (error) {
      console.error('Failed to update step:', error)
    }
  }, [recipes, fetchRecipes, fetchShoppingList, showNotification])

  const handleDeleteRecipe = useCallback(async (recipeId: string) => {
    try {
      await fetch(`${API_BASE}/api/recipes/${recipeId}`, {
        method: 'DELETE'
      })
      await fetchRecipes()
      await fetchShoppingList()
      showToast('食谱已删除')
    } catch (error) {
      console.error('Failed to delete recipe:', error)
    }
  }, [fetchRecipes, fetchShoppingList, showToast])

  const handleSaveRecipe = useCallback(async (recipeData: Partial<Recipe>) => {
    try {
      if (editingRecipe) {
        await fetch(`${API_BASE}/api/recipes/${editingRecipe.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recipeData)
        })
        showToast('食谱已更新')
      } else {
        await fetch(`${API_BASE}/api/recipes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recipeData)
        })
        showToast('食谱已创建')
      }
      await fetchRecipes()
      await fetchShoppingList()
      setShowAddModal(false)
      setEditingRecipe(null)
    } catch (error) {
      console.error('Failed to save recipe:', error)
    }
  }, [editingRecipe, fetchRecipes, fetchShoppingList, showToast])

  const handleTogglePurchase = useCallback(async (itemId: string, purchased: boolean) => {
    try {
      await fetch(`${API_BASE}/api/shopping-list/${itemId}/purchase`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchased })
      })
      await fetchShoppingList()
    } catch (error) {
      console.error('Failed to update purchase:', error)
    }
  }, [fetchShoppingList])

  const handleExportList = useCallback(() => {
    const text = shoppingList
      .map(item => `${item.purchased ? '[✓]' : '[ ]'} ${item.name} ${item.quantity}${item.unit}`)
      .join('\n')
    
    const fullText = `🛒 购物清单\n${'='.repeat(20)}\n${text}\n${'='.repeat(20)}\n共 ${shoppingList.length} 项食材`
    
    navigator.clipboard.writeText(fullText).then(() => {
      showToast('清单已复制到剪贴板')
    }).catch(() => {
      showToast('复制失败，请手动复制')
    })
  }, [shoppingList, showToast])

  const handleUpdateAssignee = useCallback(async (recipeId: string, assignee: string) => {
    try {
      await fetch(`${API_BASE}/api/recipes/${recipeId}/assignee`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignee })
      })
      await fetchRecipes()
    } catch (error) {
      console.error('Failed to update assignee:', error)
    }
  }, [fetchRecipes])

  const getAvatarColor = (name?: string): string => {
    if (!name) return '#9CA3AF'
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
  }

  const getAvatarText = (name?: string): string => {
    if (!name) return '?'
    return name.charAt(0)
  }

  const handleEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe)
    setShowAddModal(true)
  }

  if (loading) {
    return (
      <div className="app-container">
        <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
          加载中...
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      {notification && (
        <div className="notification-banner">
          <span className="notification-icon">✔</span>
          <span>{notification.message}</span>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}

      {floatingTip && (
        <div className="floating-tip">
          <div className="floating-tip-header">
            <div className="floating-tip-title">{floatingTip.title}</div>
            <button
              className="floating-tip-close"
              onClick={() => setFloatingTip(null)}
            >
              ✕
            </button>
          </div>
          <div className="floating-tip-desc">{floatingTip.description}</div>
        </div>
      )}

      <header className="app-header">
        <h1>🍳 多人协作食谱管理</h1>
        <p>家庭聚餐好帮手，分工做菜不慌乱</p>
      </header>

      <div className="main-layout">
        <div className="left-panel">
          <div className="card">
            <h2 className="section-title">📋 食谱列表</h2>
            <button
              className="add-recipe-btn"
              onClick={() => {
                setEditingRecipe(null)
                setShowAddModal(true)
              }}
            >
              + 添加新食谱
            </button>
            <div className="recipe-list">
              {recipes.map(recipe => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onDelete={handleDeleteRecipe}
                  onEdit={handleEditRecipe}
                  onStepComplete={handleStepComplete}
                  avatarColor={getAvatarColor(recipe.assignee)}
                  avatarText={getAvatarText(recipe.assignee)}
                />
              ))}
              {recipes.length === 0 && (
                <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '20px' }}>
                  暂无食谱，点击上方按钮添加
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="right-panel">
          <ShoppingList
            items={shoppingList}
            onTogglePurchase={handleTogglePurchase}
            onExport={handleExportList}
          />
          <ProgressPanel
            recipes={recipes}
            onUpdateAssignee={handleUpdateAssignee}
            getAvatarColor={getAvatarColor}
            getAvatarText={getAvatarText}
          />
        </div>
      </div>

      {showAddModal && (
        <RecipeFormModal
          recipe={editingRecipe}
          onClose={() => {
            setShowAddModal(false)
            setEditingRecipe(null)
          }}
          onSave={handleSaveRecipe}
        />
      )}
    </div>
  )
}

function RecipeFormModal({
  recipe,
  onClose,
  onSave
}: {
  recipe: Recipe | null
  onClose: () => void
  onSave: (data: any) => void
}) {
  const [name, setName] = useState(recipe?.name || '')
  const [cuisine, setCuisine] = useState(recipe?.cuisine || 'chinese')
  const [ingredients, setIngredients] = useState(
    recipe?.ingredients.map(i => ({ ...i })) || [
      { id: '', name: '', quantity: 0, unit: 'g' }
    ]
  )
  const [steps, setSteps] = useState(
    recipe?.steps.map(s => ({ ...s })) || [
      { id: '', stepNumber: 1, description: '', estimatedTime: 10, completed: false }
    ]
  )

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { id: '', name: '', quantity: 0, unit: 'g' }])
  }

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const handleIngredientChange = (index: number, field: string, value: any) => {
    const newIngredients = [...ingredients]
    ;(newIngredients[index] as any)[field] = value
    setIngredients(newIngredients)
  }

  const handleAddStep = () => {
    setSteps([...steps, {
      id: '',
      stepNumber: steps.length + 1,
      description: '',
      estimatedTime: 10,
      completed: false
    }])
  }

  const handleRemoveStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index)
    newSteps.forEach((s, i) => { s.stepNumber = i + 1 })
    setSteps(newSteps)
  }

  const handleStepChange = (index: number, field: string, value: any) => {
    const newSteps = [...steps]
    ;(newSteps[index] as any)[field] = value
    setSteps(newSteps)
  }

  const handleSubmit = () => {
    if (!name.trim()) {
      alert('请输入菜名')
      return
    }
    const validIngredients = ingredients.filter(i => i.name.trim())
    const validSteps = steps.filter(s => s.description.trim())
    if (validIngredients.length === 0) {
      alert('请至少添加一个食材')
      return
    }
    if (validSteps.length === 0) {
      alert('请至少添加一个步骤')
      return
    }
    onSave({
      name,
      cuisine,
      ingredients: validIngredients,
      steps: validSteps
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{recipe ? '编辑食谱' : '添加新食谱'}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="form-group">
          <label>菜名</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="请输入菜名"
          />
        </div>

        <div className="form-group">
          <label>菜系</label>
          <select value={cuisine} onChange={e => setCuisine(e.target.value as any)}>
            <option value="chinese">中餐</option>
            <option value="western">西餐</option>
            <option value="japanese">日料</option>
            <option value="other">其他</option>
          </select>
        </div>

        <div className="section-subtitle">食材清单</div>
        {ingredients.map((ing, index) => (
          <div key={index} className="ingredient-item">
            <input
              type="text"
              placeholder="食材名称"
              value={ing.name}
              onChange={e => handleIngredientChange(index, 'name', e.target.value)}
            />
            <input
              type="number"
              className="qty-input"
              placeholder="数量"
              value={ing.quantity || ''}
              onChange={e => handleIngredientChange(index, 'quantity', parseFloat(e.target.value) || 0)}
            />
            <input
              type="text"
              className="unit-input"
              placeholder="单位"
              value={ing.unit}
              onChange={e => handleIngredientChange(index, 'unit', e.target.value)}
            />
            <button
              className="remove-item-btn"
              onClick={() => handleRemoveIngredient(index)}
            >
              ✕
            </button>
          </div>
        ))}
        <button className="add-item-btn" onClick={handleAddIngredient}>
          + 添加食材
        </button>

        <div className="section-subtitle">烹饪步骤</div>
        {steps.map((step, index) => (
          <div key={index} className="step-edit-item">
            <span style={{ width: '24px', textAlign: 'center', color: '#6B7280' }}>
              {step.stepNumber}
            </span>
            <input
              type="text"
              placeholder="步骤描述"
              value={step.description}
              onChange={e => handleStepChange(index, 'description', e.target.value)}
            />
            <input
              type="number"
              style={{ width: '80px', flex: 'none' }}
              placeholder="分钟"
              value={step.estimatedTime || ''}
              onChange={e => handleStepChange(index, 'estimatedTime', parseInt(e.target.value) || 0)}
            />
            <button
              className="remove-item-btn"
              onClick={() => handleRemoveStep(index)}
            >
              ✕
            </button>
          </div>
        ))}
        <button className="add-item-btn" onClick={handleAddStep}>
          + 添加步骤
        </button>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={handleSubmit}>保存</button>
        </div>
      </div>
    </div>
  )
}

export default App
