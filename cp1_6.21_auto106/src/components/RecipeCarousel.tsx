import { useMemo } from 'react'
import { ChefHat, Check, X, Scroll } from 'lucide-react'
import type { InventoryItem, Recipe } from '../utils/helpers'

interface Props {
  recipes: Recipe[]
  inventory: InventoryItem[]
  visible: boolean
}

export default function RecipeCarousel({ recipes, inventory, visible }: Props) {
  const availableNames = useMemo(
    () => new Set(inventory.map((item) => item.name)),
    [inventory]
  )

  if (!visible) return null
  if (recipes.length === 0) {
    return (
      <div className="mb-6 p-5 rounded-2xl bg-white/60 backdrop-blur-sm text-center text-gray-500">
        <ChefHat size={32} className="mx-auto mb-2 opacity-50" />
        暂无可推荐的菜谱
      </div>
    )
  }

  return (
    <div className="mb-6 fade-in">
      <div className="flex items-center gap-2 mb-4 px-1">
        <ChefHat size={22} className="text-amber-600" />
        <h2 className="text-lg font-bold text-gray-800">智能推荐菜谱</h2>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 md:mx-0 md:px-0">
        {recipes.map((recipe, idx) => {
          const matchedCount = recipe.ingredients.filter(
            (ing) => availableNames.has(ing.name)
          ).length
          const totalRequired = recipe.ingredients.filter((i) => i.required).length

          return (
            <div
              key={recipe.id}
              className="flex-shrink-0 w-72 rounded-2xl p-5 paper-texture shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1 fade-in"
              style={{
                background: `linear-gradient(135deg, #FFF8F0 0%, #FFE8D6 100%)`,
                animationDelay: `${idx * 80}ms`,
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-800">
                  {recipe.name}
                </h3>
                <span className="text-xs px-2 py-1 rounded-full bg-white/60 text-amber-700 font-medium">
                  {matchedCount}/{recipe.ingredients.length} 食材可用
                </span>
              </div>

              <div className="space-y-1.5 mb-4">
                {recipe.ingredients.map((ing, i) => {
                  const has = availableNames.has(ing.name)
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-sm"
                    >
                      {has ? (
                        <Check size={14} className="text-green-600 flex-shrink-0" />
                      ) : (
                        <X size={14} className="text-gray-400 flex-shrink-0" />
                      )}
                      <span
                        className={
                          has
                            ? 'text-green-700 font-medium'
                            : 'text-gray-500'
                        }
                      >
                        {ing.name}
                        {!ing.required && (
                          <span className="text-xs text-gray-400 ml-1">（可选）</span>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>

              <button
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-white transition-all duration-300 hover:opacity-90 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #E8A87C 0%, #C38D9E 100%)',
                }}
              >
                <Scroll size={16} />
                开始烹饪
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
