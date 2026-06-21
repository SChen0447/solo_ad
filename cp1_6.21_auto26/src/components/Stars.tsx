import { Star } from 'lucide-react'

interface Props {
  value: number
  interactive?: boolean
  onChange?: (v: number) => void
  size?: 'sm' | 'md' | 'lg'
  allowClear?: boolean
}

export function Stars({ value, interactive = false, onChange, size = 'sm', allowClear = false }: Props) {
  const px = size === 'lg' ? 'w-7 h-7' : size === 'md' ? 'w-5 h-5' : 'w-4 h-4'

  if (!interactive) {
    return (
      <span className={`star-picker ${size === 'sm' ? 'card-rating' : size === 'md' ? 'list-rating' : ''}`} aria-label={`评分 ${value} 星`}>
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} className={`${px} ${i < value ? 'star-on' : 'star-off'}`} />
        ))}
      </span>
    )
  }

  const click = (n: number) => {
    if (!onChange) return
    if (allowClear && n === value) onChange(0)
    else onChange(n)
  }

  return (
    <span className={`star-picker ${size === 'lg' ? 'form-star-rating' : ''}`} role="radiogroup" aria-label="评分">
      {Array.from({ length: 5 }, (_, i) => {
        const n = i + 1
        return (
          <button
            key={i}
            type="button"
            className="star-btn"
            onClick={() => click(n)}
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} 星`}
          >
            <Star className={`${px} ${i < value ? 'star-on' : 'star-off'}`} />
          </button>
        )
      })}
    </span>
  )
}
