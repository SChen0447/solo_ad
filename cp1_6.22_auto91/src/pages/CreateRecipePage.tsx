import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Upload, ArrowLeft, ArrowRight, Check, ChefHat, Image as ImageIcon } from 'lucide-react'
import type { Ingredient, Step, RecipeFormData } from '@/types'

const STEP_LABELS = ['基本信息', '食材清单', '烹饪步骤']

export default function CreateRecipePage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const stepFileInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const [form, setForm] = useState<RecipeFormData>({
    title: '',
    coverImage: '',
    description: '',
    prepTime: 0,
    cookTime: 0,
    servings: 1,
    ingredients: [{ name: '', amount: '' }],
    steps: [{ text: '', image: '' }],
    author: '',
  })

  const updateField = <K extends keyof RecipeFormData>(key: K, value: RecipeFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleImageUpload = async (file: File, type: 'cover' | 'step', stepIndex?: number) => {
    const formData = new FormData()
    formData.append('image', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.success) {
        if (type === 'cover') {
          updateField('coverImage', data.url)
        } else if (stepIndex !== undefined) {
          const newSteps = [...form.steps]
          newSteps[stepIndex] = { ...newSteps[stepIndex], image: data.url }
          updateField('steps', newSteps)
        }
      }
    } catch {
      console.error('图片上传失败')
    }
  }

  const addIngredient = () => {
    updateField('ingredients', [...form.ingredients, { name: '', amount: '' }])
  }

  const removeIngredient = (index: number) => {
    if (form.ingredients.length <= 1) return
    updateField('ingredients', form.ingredients.filter((_, i) => i !== index))
  }

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const updated = form.ingredients.map((ing, i) => i === index ? { ...ing, [field]: value } : ing)
    updateField('ingredients', updated)
  }

  const addStep = () => {
    updateField('steps', [...form.steps, { text: '', image: '' }])
  }

  const removeStep = (index: number) => {
    if (form.steps.length <= 1) return
    updateField('steps', form.steps.filter((_, i) => i !== index))
  }

  const updateStep = (index: number, field: keyof Step, value: string) => {
    const updated = form.steps.map((step, i) => i === index ? { ...step, [field]: value } : step)
    updateField('steps', updated)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        navigate(`/recipe/${data.data.id}`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const canNext = () => {
    if (currentStep === 0) return form.title.trim() !== '' && form.description.trim() !== ''
    if (currentStep === 1) return form.ingredients.some(i => i.name.trim() !== '')
    if (currentStep === 2) return form.steps.some(s => s.text.trim() !== '')
    return true
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-orange-100 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-warm-orange transition-colors bg-transparent border-0 cursor-pointer">
            <ArrowLeft size={20} />
            <span>返回</span>
          </button>
          <div className="flex items-center gap-2">
            <ChefHat size={28} className="text-warm-orange" />
            <span className="font-serif text-xl font-bold text-warm-orange">味集</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="font-serif text-3xl font-bold text-gray-800 mb-6">创建新食谱</h1>

        <div className="flex items-center justify-center mb-10">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                    i < currentStep ? 'bg-teal-dark text-white' :
                    i === currentStep ? 'bg-warm-orange text-white scale-110' :
                    'bg-gray-200 text-gray-400'
                  }`}
                >
                  {i < currentStep ? <Check size={18} /> : i + 1}
                </div>
                <span className={`text-xs mt-2 ${i <= currentStep ? 'text-teal-dark font-medium' : 'text-gray-400'}`}>{label}</span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={`w-16 md:w-24 h-1 mx-2 rounded-full transition-all duration-300 ${i < currentStep ? 'bg-teal-dark' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-6 md:p-8" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          {currentStep === 0 && (
            <div className="space-y-5 animate-fade-in-up">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">食谱标题 *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => updateField('title', e.target.value)}
                  placeholder="给你的食谱起个响亮的名字"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-warm-orange focus:ring-[3px] focus:ring-orange-200/30 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">封面图片</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleImageUpload(file, 'cover')
                  }}
                />
                {form.coverImage ? (
                  <div className="relative w-full h-48 rounded-lg overflow-hidden group">
                    <img src={form.coverImage} alt="封面预览" className="w-full h-full object-cover" />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white bg-transparent border-0 cursor-pointer"
                    >
                      <ImageIcon size={24} className="mr-2" /> 更换图片
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-warm-orange hover:text-warm-orange transition-colors bg-transparent cursor-pointer"
                  >
                    <Upload size={24} className="mb-2" />
                    <span className="text-sm">点击上传封面图片</span>
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">简短描述 *</label>
                <textarea
                  value={form.description}
                  onChange={e => updateField('description', e.target.value)}
                  placeholder="用一两句话描述你的食谱亮点"
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:border-warm-orange focus:ring-[3px] focus:ring-orange-200/30 transition-all"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">准备时间(分钟)</label>
                  <input
                    type="number"
                    value={form.prepTime || ''}
                    onChange={e => updateField('prepTime', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-warm-orange focus:ring-[3px] focus:ring-orange-200/30 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">烹饪时间(分钟)</label>
                  <input
                    type="number"
                    value={form.cookTime || ''}
                    onChange={e => updateField('cookTime', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-warm-orange focus:ring-[3px] focus:ring-orange-200/30 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">食用人数</label>
                  <input
                    type="number"
                    value={form.servings || ''}
                    onChange={e => updateField('servings', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-warm-orange focus:ring-[3px] focus:ring-orange-200/30 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">作者昵称</label>
                <input
                  type="text"
                  value={form.author}
                  onChange={e => updateField('author', e.target.value)}
                  placeholder="你的昵称"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-warm-orange focus:ring-[3px] focus:ring-orange-200/30 transition-all"
                />
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-serif text-lg font-bold text-gray-800">食材清单</h3>
                <button onClick={addIngredient} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-warm-orange border border-warm-orange/30 hover:bg-warm-orange/5 transition-colors text-sm bg-transparent cursor-pointer">
                  <Plus size={16} /> 添加食材
                </button>
              </div>
              {form.ingredients.map((ing, i) => (
                <div key={i} className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s`, opacity: 0 }}>
                  <span className="w-6 text-center text-sm text-gray-400 flex-shrink-0">{i + 1}</span>
                  <input
                    type="text"
                    placeholder="食材名称"
                    value={ing.name}
                    onChange={e => updateIngredient(i, 'name', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-warm-orange focus:ring-[3px] focus:ring-orange-200/30 transition-all"
                  />
                  <input
                    type="text"
                    placeholder="用量"
                    value={ing.amount}
                    onChange={e => updateIngredient(i, 'amount', e.target.value)}
                    className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-warm-orange focus:ring-[3px] focus:ring-orange-200/30 transition-all"
                  />
                  <button
                    onClick={() => removeIngredient(i)}
                    disabled={form.ingredients.length <= 1}
                    className="p-2 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-30 bg-transparent border-0 cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-serif text-lg font-bold text-gray-800">烹饪步骤</h3>
                <button onClick={addStep} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-warm-orange border border-warm-orange/30 hover:bg-warm-orange/5 transition-colors text-sm bg-transparent cursor-pointer">
                  <Plus size={16} /> 添加步骤
                </button>
              </div>
              {form.steps.map((step, i) => (
                <div key={i} className="flex gap-4 animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s`, opacity: 0 }}>
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-warm-orange text-white flex items-center justify-center font-bold text-sm mt-2">
                    {i + 1}
                  </div>
                  <div className="flex-1 space-y-2">
                    <textarea
                      placeholder={`第${i + 1}步：描述操作...`}
                      value={step.text}
                      onChange={e => updateStep(i, 'text', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:border-warm-orange focus:ring-[3px] focus:ring-orange-200/30 transition-all"
                    />
                    <input
                      ref={el => { stepFileInputRefs.current[i] = el }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) handleImageUpload(file, 'step', i)
                      }}
                    />
                    {step.image ? (
                      <div className="relative w-full h-32 rounded-lg overflow-hidden group">
                        <img src={step.image} alt={`步骤${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => stepFileInputRefs.current[i]?.click()}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs flex items-center justify-center bg-transparent border-0 cursor-pointer"
                        >
                          更换图片
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => stepFileInputRefs.current[i]?.click()}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-400 hover:text-warm-orange border border-gray-200 rounded-lg hover:border-warm-orange/30 transition-colors bg-transparent cursor-pointer"
                      >
                        <ImageIcon size={14} /> 添加步骤图片
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => removeStep(i)}
                    disabled={form.steps.length <= 1}
                    className="p-2 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-30 bg-transparent border-0 cursor-pointer self-start mt-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={() => setCurrentStep(s => s - 1)}
              disabled={currentStep === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-gray-500 border border-gray-200 hover:border-gray-300 transition-colors disabled:opacity-30 bg-transparent cursor-pointer"
            >
              <ArrowLeft size={16} /> 上一步
            </button>
            {currentStep < 2 ? (
              <button
                onClick={() => setCurrentStep(s => s + 1)}
                disabled={!canNext()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden ripple-btn cursor-pointer"
                style={{ background: 'linear-gradient(to right, #ed8936, #dd6b20)' }}
              >
                下一步 <ArrowRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || !canNext()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden ripple-btn cursor-pointer"
                style={{ background: 'linear-gradient(to right, #48bb78, #38a169)' }}
              >
                <Check size={16} /> {submitting ? '发布中...' : '发布食谱'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
