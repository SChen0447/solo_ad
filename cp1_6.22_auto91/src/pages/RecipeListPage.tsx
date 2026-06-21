import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ChefHat } from 'lucide-react'
import RecipeCard from '@/components/RecipeCard'

interface RecipeListItem {
  id: string
  title: string
  coverImage: string
  description: string
  prepTime: number
  cookTime: number
  servings: number
  author: string
  createdAt: string
}

export default function RecipeListPage() {
  const [recipes, setRecipes] = useState<RecipeListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/recipes?limit=20')
      .then(res => res.json())
      .then(data => {
        if (data.success) setRecipes(data.data)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-orange-100 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <ChefHat size={32} className="text-warm-orange" />
            <h1 className="font-serif text-2xl font-bold text-warm-orange m-0">味集</h1>
          </Link>
          <Link
            to="/create"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-medium no-underline bg-gradient-to-r from-green-start to-green-end hover:shadow-lg transition-shadow duration-300 relative overflow-hidden ripple-btn"
          >
            <Plus size={18} />
            创建食谱
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="font-serif text-3xl font-bold text-gray-800 mb-2">探索美味食谱</h2>
          <p className="text-gray-500">发现、创建和分享你的独家料理</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-[300px] rounded-2xl bg-white animate-pulse overflow-hidden" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                <div className="w-full h-[156px] bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
            {recipes.map((recipe, index) => (
              <div key={recipe.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s`, opacity: 0 }}>
                <RecipeCard
                  id={recipe.id}
                  title={recipe.title}
                  coverImage={recipe.coverImage}
                  description={recipe.description}
                  cookTime={recipe.cookTime}
                  author={recipe.author}
                  index={index}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="bg-white/60 border-t border-orange-100 mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-gray-400 text-sm">
          味集 - 让每一道菜都有故事
        </div>
      </footer>
    </div>
  )
}
