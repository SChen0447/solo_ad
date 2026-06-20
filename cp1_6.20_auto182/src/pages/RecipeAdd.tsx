import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { recipeApi, type Ingredient, type Step } from '../utils/api'

const CUISINE_OPTIONS = [
  { value: 'chinese', label: '中餐' },
  { value: 'western', label: '西餐' },
  { value: 'japanese', label: '日料' },
  { value: 'southeast', label: '东南亚' },
  { value: 'baking', label: '烘焙' },
]

const UNIT_OPTIONS = ['克', '千克', '毫升', '升', '个', '勺', '杯', '适量']

export default function RecipeAdd() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [cuisine, setCuisine] = useState('chinese')
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: '', quantity: 0, unit: '克' },
  ])
  const [steps, setSteps] = useState<Step[]>([{ description: '', image: undefined }])
  const [coverImage, setCoverImage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: 0, unit: '克' }])
  }

  const removeIngredient = (index: number) => {
    if (ingredients.length <= 1) return
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const updateIngredient = (index: number, field: keyof Ingredient, value: string | number) => {
    const newIngredients = [...ingredients]
    if (field === 'quantity') {
      newIngredients[index][field] = parseFloat(value as string) || 0
    } else {
      ;(newIngredients[index] as any)[field] = value
    }
    setIngredients(newIngredients)
  }

  const addStep = () => {
    if (steps.length >= 10) return
    setSteps([...steps, { description: '', image: undefined }])
  }

  const removeStep = (index: number) => {
    if (steps.length <= 1) return
    setSteps(steps.filter((_, i) => i !== index))
  }

  const updateStep = (index: number, field: keyof Step, value: string) => {
    const newSteps = [...steps]
    ;(newSteps[index] as any)[field] = value
    setSteps(newSteps)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, stepIndex?: number) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 800 * 1024) {
      alert('图片大小不能超过 800KB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      if (stepIndex !== undefined) {
        updateStep(stepIndex, 'image', dataUrl)
      } else {
        setCoverImage(dataUrl)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      alert('请输入菜名')
      return
    }

    const validIngredients = ingredients.filter((i) => i.name.trim() && i.quantity > 0)
    if (validIngredients.length === 0) {
      alert('请至少添加一个有效食材')
      return
    }

    const validSteps = steps.filter((s) => s.description.trim())
    if (validSteps.length === 0) {
      alert('请至少添加一个步骤')
      return
    }

    setSubmitting(true)
    try {
      await recipeApi.createRecipe({
        name: name.trim(),
        cuisine,
        ingredients: validIngredients,
        steps: validSteps,
        image: coverImage || 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=delicious%20food%20dish%20professional%20photography&image_size=square',
      })
      alert('发布成功！')
      navigate('/recipes')
    } catch (err) {
      console.error('Failed to create recipe:', err)
      alert('发布失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-container">
      <h2 className="page-title">发布新菜谱</h2>
      <form className="form-container" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>菜名 *</label>
          <input
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 30))}
            placeholder="最多30个字符"
            maxLength={30}
          />
          <span style={{ fontSize: 12, color: '#999' }}>{name.length}/30</span>
        </div>

        <div className="form-group">
          <label>菜系分类 *</label>
          <select
            className="form-select"
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
          >
            {CUISINE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>成品图片</label>
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={(e) => handleImageUpload(e)}
            style={{ marginBottom: 10 }}
          />
          {coverImage && (
            <img
              src={coverImage}
              alt="成品预览"
              className="step-image-preview"
              style={{ maxHeight: 250 }}
            />
          )}
        </div>

        <div className="form-group">
          <label>食材列表 *</label>
          <AnimatePresence>
            {ingredients.map((ing, idx) => (
              <motion.div
                key={idx}
                className="ingredient-row"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <input
                  type="text"
                  className="ingredient-name-input"
                  placeholder="食材名称"
                  value={ing.name}
                  onChange={(e) => updateIngredient(idx, 'name', e.target.value)}
                />
                <input
                  type="number"
                  className="ingredient-qty-input"
                  placeholder="数量"
                  value={ing.quantity || ''}
                  onChange={(e) => updateIngredient(idx, 'quantity', e.target.value)}
                  min="0"
                  step="0.1"
                />
                <select
                  className="ingredient-unit-select"
                  value={ing.unit}
                  onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-remove"
                  onClick={() => removeIngredient(idx)}
                >
                  删除
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          <button type="button" className="btn-add" onClick={addIngredient}>
            + 添加食材
          </button>
        </div>

        <div className="form-group">
          <label>制作步骤 * (最多10步)</label>
          {steps.map((step, idx) => (
            <div key={idx} className="step-item">
              <div className="step-item-header">
                <span className="step-number">第 {idx + 1} 步</span>
                <button
                  type="button"
                  className="btn-remove"
                  onClick={() => removeStep(idx)}
                  style={{ padding: '4px 10px' }}
                >
                  删除
                </button>
              </div>
              <textarea
                className="form-textarea"
                placeholder="描述这一步的做法"
                value={step.description}
                onChange={(e) => updateStep(idx, 'description', e.target.value)}
                rows={3}
              />
              <div style={{ marginTop: 8 }}>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(e) => handleImageUpload(e, idx)}
                  style={{ fontSize: 12 }}
                />
                {step.image && (
                  <img
                    src={step.image}
                    alt={`步骤${idx + 1}预览`}
                    className="step-image-preview"
                  />
                )}
              </div>
            </div>
          ))}
          {steps.length < 10 && (
            <button type="button" className="btn-add" onClick={addStep}>
              + 添加步骤
            </button>
          )}
        </div>

        <button
          type="submit"
          className="btn-submit"
          disabled={submitting}
          style={{ opacity: submitting ? 0.7 : 1 }}
        >
          {submitting ? '发布中...' : '发布菜谱'}
        </button>
      </form>
    </div>
  )
}
