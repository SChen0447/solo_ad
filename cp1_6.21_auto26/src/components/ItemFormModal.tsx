import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { CreateItemInput, MediaItem, MediaType, UpdateItemInput } from '../types'
import { Stars } from './Stars'
import { TagsInput } from './TagsInput'

interface Props {
  open: boolean
  mode: 'create' | 'edit'
  existing?: MediaItem
  tagSuggestions: string[]
  onClose: () => void
  onSubmit: (data: CreateItemInput | UpdateItemInput) => Promise<void>
}

interface FormState {
  type: MediaType
  title: string
  creator: string
  year: string
  coverUrl: string
  rating: number
  tags: string[]
}

const DEFAULT_STATE: FormState = {
  type: 'book',
  title: '',
  creator: '',
  year: '',
  coverUrl: '',
  rating: 0,
  tags: []
}

type Errors = Partial<Record<keyof FormState, string>>

export function ItemFormModal({ open, mode, existing, tagSuggestions, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<FormState>(DEFAULT_STATE)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      if (existing && mode === 'edit') {
        setForm({
          type: existing.type,
          title: existing.title,
          creator: existing.creator,
          year: String(existing.year),
          coverUrl: existing.coverUrl,
          rating: existing.rating,
          tags: [...existing.tags]
        })
      } else {
        setForm(DEFAULT_STATE)
      }
      setErrors({})
      setSubmitting(false)
    }
  }, [open, mode, existing])

  const isEdit = mode === 'edit'
  const title = isEdit ? '编辑收藏' : '添加新收藏'

  function validate(): boolean {
    const e: Errors = {}
    if (!form.title.trim()) e.title = '请输入标题'
    if (!form.creator.trim()) e.creator = '请输入创作者'
    const y = Number(form.year)
    if (!form.year || Number.isNaN(y) || y <= 0 || !Number.isFinite(y)) e.year = '请输入有效的年份'
    else if (y > new Date().getFullYear() + 1) e.year = '年份不合法'
    if (!isEdit && !form.coverUrl.trim()) e.coverUrl = '请输入封面图片URL'
    if (form.rating < 1 || form.rating > 5) e.rating = '请选择1-5星评分'
    if (form.tags.length > 5) e.tags = '最多添加5个标签'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const payload = isEdit
        ? {
            type: form.type,
            title: form.title.trim(),
            creator: form.creator.trim(),
            year: Number(form.year),
            rating: form.rating,
            tags: form.tags
          } satisfies UpdateItemInput
        : {
            type: form.type,
            title: form.title.trim(),
            creator: form.creator.trim(),
            year: Number(form.year),
            coverUrl: form.coverUrl.trim(),
            rating: form.rating,
            tags: form.tags
          } satisfies CreateItemInput
      await onSubmit(payload)
      onClose()
    } catch (err) {
      setErrors({ title: (err as Error).message || '提交失败，请重试' })
    } finally {
      setSubmitting(false)
    }
  }

  const filteredSuggestions = useMemo(() => tagSuggestions, [tagSuggestions])

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="form-title">
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 id="form-title" className="modal-title">{title}</h3>
          <button type="button" className="modal-close" aria-label="关闭" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            <div className="form-row">
              <label className="form-label" htmlFor="f-type">
                媒体类型<span className="req">*</span>
              </label>
              <div className="type-pill-group" role="radiogroup" id="f-type">
                {(['book', 'movie', 'music'] as MediaType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={form.type === t}
                    className={`type-pill ${form.type === t ? 'active' : ''}`}
                    onClick={() => setForm(s => ({ ...s, type: t }))}
                    disabled={submitting}
                  >
                    {t === 'book' ? '书籍' : t === 'movie' ? '电影' : '音乐'}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-row two-col">
              <div>
                <label className="form-label" htmlFor="f-title">标题<span className="req">*</span></label>
                <input
                  id="f-title"
                  className="form-input"
                  value={form.title}
                  onChange={e => setForm(s => ({ ...s, title: e.target.value }))}
                  disabled={submitting}
                  placeholder="如：百年孤独"
                />
                {errors.title && <div className="form-error">{errors.title}</div>}
              </div>
              <div>
                <label className="form-label" htmlFor="f-creator">创作者<span className="req">*</span></label>
                <input
                  id="f-creator"
                  className="form-input"
                  value={form.creator}
                  onChange={e => setForm(s => ({ ...s, creator: e.target.value }))}
                  disabled={submitting}
                  placeholder="如：加西亚·马尔克斯"
                />
                {errors.creator && <div className="form-error">{errors.creator}</div>}
              </div>
            </div>

            <div className="form-row two-col">
              <div>
                <label className="form-label" htmlFor="f-year">年份<span className="req">*</span></label>
                <input
                  id="f-year"
                  type="number"
                  className="form-input"
                  value={form.year}
                  onChange={e => setForm(s => ({ ...s, year: e.target.value }))}
                  disabled={submitting}
                  placeholder="1967"
                  min="1000"
                  max={String(new Date().getFullYear() + 1)}
                />
                {errors.year && <div className="form-error">{errors.year}</div>}
              </div>
              <div>
                <label className="form-label">个人评分<span className="req">*</span></label>
                <Stars value={form.rating} size="lg" interactive allowClear onChange={v => setForm(s => ({ ...s, rating: v }))} />
                {errors.rating && <div className="form-error">{errors.rating}</div>}
              </div>
            </div>

            <div className="form-row">
              <label className="form-label" htmlFor="f-cover">
                封面图片URL{!isEdit && <span className="req">*</span>}
              </label>
              <input
                id="f-cover"
                className="form-input"
                value={form.coverUrl}
                onChange={e => setForm(s => ({ ...s, coverUrl: e.target.value }))}
                disabled={submitting || isEdit}
                placeholder="https://..."
              />
              {isEdit && <div className="tag-hint">封面图片URL创建后不可修改</div>}
              {errors.coverUrl && <div className="form-error">{errors.coverUrl}</div>}
            </div>

            <div className="form-row">
              <label className="form-label">自定义标签</label>
              <TagsInput
                value={form.tags}
                onChange={v => setForm(s => ({ ...s, tags: v }))}
                suggestions={filteredSuggestions}
                disabled={submitting}
                max={5}
              />
              {errors.tags && <div className="form-error">{errors.tags}</div>}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>取消</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? '保存中…' : isEdit ? '保存修改' : '添加收藏'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
