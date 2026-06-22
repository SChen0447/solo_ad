import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import type { PlantCategory } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
}

interface FormData {
  name: string
  category: PlantCategory
  maturityDays: string
  waterFrequency: string
  fertilizeFrequency: string
  imageUrl: string
}

interface FormErrors {
  name?: string
  maturityDays?: string
  waterFrequency?: string
  fertilizeFrequency?: string
  imageUrl?: string
}

export default function AddPlantModal({ open, onClose }: Props) {
  const { addPlant } = useApp()
  const [formData, setFormData] = useState<FormData>({
    name: '',
    category: 'leaf',
    maturityDays: '',
    waterFrequency: '',
    fertilizeFrequency: '',
    imageUrl: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)

  if (!open) return null

  const validate = (): FormErrors => {
    const e: FormErrors = {}
    if (!formData.name.trim()) e.name = '请输入植物名称'
    const maturityDays = Number(formData.maturityDays)
    if (!formData.maturityDays || isNaN(maturityDays) || maturityDays <= 0) {
      e.maturityDays = '请输入有效的天数（大于0）'
    }
    const waterFrequency = Number(formData.waterFrequency)
    if (!formData.waterFrequency || isNaN(waterFrequency) || waterFrequency <= 0) {
      e.waterFrequency = '请输入有效的浇水频率'
    }
    const fertilizeFrequency = Number(formData.fertilizeFrequency)
    if (!formData.fertilizeFrequency || isNaN(fertilizeFrequency) || fertilizeFrequency <= 0) {
      e.fertilizeFrequency = '请输入有效的施肥频率'
    }
    return e
  }

  const handleChange = (field: keyof FormData, value: string) => {
    const newData = { ...formData, [field]: value }
    setFormData(newData)
    const newErrors = { ...errors }
    delete newErrors[field as keyof FormErrors]
    if (field === 'name' && !value.trim()) newErrors.name = '请输入植物名称'
    if (
      field === 'maturityDays' || field === 'waterFrequency' || field === 'fertilizeFrequency'
    ) {
      const n = Number(value)
      if (!value || isNaN(n) || n <= 0) {
        if (field === 'maturityDays') newErrors.maturityDays = '请输入有效的天数（大于0）'
        if (field === 'waterFrequency') newErrors.waterFrequency = '请输入有效的浇水频率'
        if (field === 'fertilizeFrequency') newErrors.fertilizeFrequency = '请输入有效的施肥频率'
      }
    }
    setErrors(newErrors)
  }

  const handleSubmit = async () => {
    const validationErrors = validate()
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setSubmitting(true)
    try {
      await addPlant({
        name: formData.name.trim(),
        category: formData.category,
        maturityDays: Number(formData.maturityDays),
        waterFrequency: Number(formData.waterFrequency),
        fertilizeFrequency: Number(formData.fertilizeFrequency),
        imageUrl: formData.imageUrl.trim() || 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400',
      })
      setFormData({
        name: '',
        category: 'leaf',
        maturityDays: '',
        waterFrequency: '',
        fertilizeFrequency: '',
        imageUrl: '',
      })
      setErrors({})
      onClose()
    } catch (e) {
      console.error('Failed to add plant:', e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">添加植物</div>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div>
          <div className="form-group">
            <label className="form-label">植物名称</label>
            <input
              className={`form-input ${errors.name ? 'error' : ''}`}
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="如：生菜"
            />
            {errors.name && <div className="form-error">{errors.name}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">分类</label>
            <select
              className="form-select"
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value as PlantCategory)}
            >
              <option value="leaf">叶菜类</option>
              <option value="fruit">果实类</option>
              <option value="root">根茎类</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">预计成熟周期（天）</label>
            <input
              className={`form-input ${errors.maturityDays ? 'error' : ''}`}
              type="number"
              min="1"
              value={formData.maturityDays}
              onChange={(e) => handleChange('maturityDays', e.target.value)}
              placeholder="如：45"
            />
            {errors.maturityDays && <div className="form-error">{errors.maturityDays}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">浇水频率（天）</label>
            <input
              className={`form-input ${errors.waterFrequency ? 'error' : ''}`}
              type="number"
              min="1"
              value={formData.waterFrequency}
              onChange={(e) => handleChange('waterFrequency', e.target.value)}
              placeholder="如：2"
            />
            {errors.waterFrequency && <div className="form-error">{errors.waterFrequency}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">施肥周期（天）</label>
            <input
              className={`form-input ${errors.fertilizeFrequency ? 'error' : ''}`}
              type="number"
              min="1"
              value={formData.fertilizeFrequency}
              onChange={(e) => handleChange('fertilizeFrequency', e.target.value)}
              placeholder="如：10"
            />
            {errors.fertilizeFrequency && (
              <div className="form-error">{errors.fertilizeFrequency}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">图片URL（可选）</label>
            <input
              className="form-input"
              value={formData.imageUrl}
              onChange={(e) => handleChange('imageUrl', e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '添加中...' : '添加'}
          </button>
        </div>
      </div>
    </div>
  )
}
