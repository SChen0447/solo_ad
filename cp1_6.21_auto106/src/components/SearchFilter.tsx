import { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import type { Category } from '../utils/helpers'
import { CATEGORIES, getCategoryColor } from '../utils/helpers'

interface Props {
  searchTerm: string
  onSearchChange: (value: string) => void
  selectedCategory: Category | null
  onCategoryChange: (cat: Category | null) => void
}

export default function SearchFilter({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
}: Props) {
  const [localValue, setLocalValue] = useState(searchTerm)
  const [bouncingCat, setBouncingCat] = useState<Category | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => onSearchChange(localValue), 300)
    return () => clearTimeout(timer)
  }, [localValue, onSearchChange])

  const handleCategoryClick = (cat: Category | null) => {
    onCategoryChange(cat)
    setBouncingCat(cat)
    setTimeout(() => setBouncingCat(null), 300)
  }

  return (
    <div className="mb-6 space-y-4">
      <div className="relative w-full max-w-md mx-auto md:mx-0">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder="搜索食材名称..."
          className="w-full pl-11 pr-10 py-3 rounded-full border-2 border-gray-200 bg-white/70 backdrop-blur-sm
            focus:border-[#98D8C8] focus:ring-4 focus:ring-[#98D8C8]/20 outline-none
            transition-all duration-300 ease-in-out text-sm"
        />
        {localValue && (
          <button
            onClick={() => setLocalValue('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 justify-center md:justify-start">
        <button
          onClick={() => handleCategoryClick(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ease-in-out
            ${
              selectedCategory === null
                ? 'bounce-animation text-white shadow-md'
                : 'bg-transparent border-2 border-gray-300 text-gray-600 hover:border-gray-400'
            }`}
          style={
            selectedCategory === null
              ? { backgroundColor: '#98D8C8' }
              : undefined
          }
        >
          全部
        </button>

        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat
          const isBouncing = bouncingCat === cat
          return (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ease-in-out
                ${
                  isSelected
                    ? `${isBouncing ? 'bounce-animation' : ''} text-white shadow-md`
                    : 'bg-transparent border-2 border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              style={
                isSelected
                  ? { backgroundColor: getCategoryColor(cat) }
                  : undefined
              }
            >
              {cat}
            </button>
          )
        })}
      </div>
    </div>
  )
}
