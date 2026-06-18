import { useState, FormEvent, ChangeEvent, ClipboardEvent, useRef } from 'react'
import type { Asset } from '../App'

interface AssetFormProps {
  onAdd: (asset: Omit<Asset, 'id'>) => void
}

interface FormErrors {
  date?: string
  category?: string
  name?: string
  value?: string
}

const getToday = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const defaultCategories = ['现金', '股票', '基金', '加密货币']

export default function AssetForm({ onAdd }: AssetFormProps) {
  const [date, setDate] = useState(getToday())
  const [category, setCategory] = useState('现金')
  const [customCategory, setCustomCategory] = useState('')
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const [name, setName] = useState('')
  const [rawValue, setRawValue] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const valueInputRef = useRef<HTMLInputElement>(null)

  const formatNumber = (value: string) => {
    const cleanValue = value.replace(/,/g, '')
    if (cleanValue === '') return ''
    const parts = cleanValue.split('.')
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    const decimalPart = parts.length > 1 ? '.' + parts[1].slice(0, 2) : ''
    return integerPart + decimalPart
  }

  const countValidChars = (str: string, upToIndex: number): number => {
    let count = 0
    for (let i = 0; i < upToIndex && i < str.length; i++) {
      if ((str[i] >= '0' && str[i] <= '9') || str[i] === '.') {
        count++
      }
    }
    return count
  }

  const findPositionByCharCount = (str: string, targetCount: number): number => {
    let count = 0
    for (let i = 0; i < str.length; i++) {
      if ((str[i] >= '0' && str[i] <= '9') || str[i] === '.') {
        if (count >= targetCount) {
          return i
        }
        count++
      }
    }
    return str.length
  }

  const processValueInput = (inputValue: string, cursorPos: number) => {
    const cleanInput = inputValue.replace(/[^0-9.]/g, '')
    const dotIndex = cleanInput.indexOf('.')
    let processedInput = cleanInput
    if (dotIndex !== -1) {
      const secondDotIndex = cleanInput.indexOf('.', dotIndex + 1)
      if (secondDotIndex !== -1) {
        processedInput =
          cleanInput.slice(0, secondDotIndex) + cleanInput.slice(secondDotIndex + 1)
      }
    }
    const formatted = formatNumber(processedInput)
    const validCharsBefore = countValidChars(inputValue, cursorPos)
    const newCursorPos = findPositionByCharCount(formatted, validCharsBefore)
    return { formatted, newCursorPos }
  }

  const handleValueChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const selectionStart = input.selectionStart || 0
    const { formatted, newCursorPos } = processValueInput(input.value, selectionStart)
    setRawValue(formatted)
    if (errors.value) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors.value
        return newErrors
      })
    }
    requestAnimationFrame(() => {
      if (valueInputRef.current) {
        valueInputRef.current.selectionStart = newCursorPos
        valueInputRef.current.selectionEnd = newCursorPos
      }
    })
  }

  const handleValuePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const input = e.currentTarget
    const pasteText = e.clipboardData.getData('text')
    const selectionStart = input.selectionStart || 0
    const selectionEnd = input.selectionEnd || 0
    const newValue =
      input.value.slice(0, selectionStart) + pasteText + input.value.slice(selectionEnd)
    const newCursorPos = selectionStart + pasteText.replace(/[^0-9.]/g, '').length
    const { formatted, newCursorPos: finalCursorPos } = processValueInput(newValue, newCursorPos)
    setRawValue(formatted)
    if (errors.value) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors.value
        return newErrors
      })
    }
    requestAnimationFrame(() => {
      if (valueInputRef.current) {
        valueInputRef.current.selectionStart = finalCursorPos
        valueInputRef.current.selectionEnd = finalCursorPos
      }
    })
  }

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setName(value)
    if (errors.name && value.trim()) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors.name
        return newErrors
      })
    }
  }

  const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    if (value === 'custom') {
      setIsCustomCategory(true)
      setCategory('')
    } else {
      setIsCustomCategory(false)
      setCategory(value)
      setCustomCategory('')
    }
  }

  const validate = (): boolean => {
    const newErrors: FormErrors = {}
    const finalCategory = isCustomCategory ? customCategory.trim() : category
    const numericValue = parseFloat(rawValue.replace(/,/g, ''))

    if (!date) {
      newErrors.date = '请选择日期'
    }

    if (!finalCategory) {
      newErrors.category = '请选择或输入资产类别'
    }

    if (!name.trim()) {
      newErrors.name = '资产名称不能为空'
    } else if (name.length > 30) {
      newErrors.name = '资产名称不能超过30个字符'
    }

    if (!rawValue || isNaN(numericValue)) {
      newErrors.value = '请输入资产市值'
    } else if (numericValue <= 0) {
      newErrors.value = '市值必须为正数'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const finalCategory = isCustomCategory ? customCategory.trim() : category
    const numericValue = parseFloat(rawValue.replace(/,/g, ''))

    onAdd({
      date,
      category: finalCategory,
      name: name.trim(),
      value: numericValue,
    })

    setCategory('现金')
    setIsCustomCategory(false)
    setCustomCategory('')
    setName('')
    setRawValue('')
    setErrors({})
  }

  return (
    <div className="form-card">
      <h3>添加资产记录</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label>记录日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={errors.date ? 'error' : ''}
            />
            {errors.date && <span className="error-message">{errors.date}</span>}
          </div>

          <div className="form-group">
            <label>资产类别</label>
            {!isCustomCategory ? (
              <select
                value={category}
                onChange={handleCategoryChange}
                className={errors.category ? 'error' : ''}
              >
                {defaultCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="custom">自定义...</option>
              </select>
            ) : (
              <input
                type="text"
                placeholder="输入自定义类别"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className={errors.category ? 'error' : ''}
              />
            )}
            {errors.category && <span className="error-message">{errors.category}</span>}
          </div>

          <div className="form-group">
            <label>资产名称 (最多30字)</label>
            <input
              type="text"
              placeholder="例如：贵州茅台"
              value={name}
              maxLength={30}
              onChange={handleNameChange}
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label>资产市值 (CNY)</label>
            <input
              ref={valueInputRef}
              type="text"
              placeholder="0.00"
              value={rawValue}
              onChange={handleValueChange}
              onPaste={handleValuePaste}
              className={errors.value ? 'error' : ''}
            />
            {errors.value && <span className="error-message">{errors.value}</span>}
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            提交记录
          </button>
        </div>
      </form>
    </div>
  )
}
