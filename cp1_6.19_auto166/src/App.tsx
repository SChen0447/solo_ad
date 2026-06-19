import { useState, useEffect } from 'react';
import { ChefHat, Home, User } from 'lucide-react';
import RecipeCard from '@/components/RecipeCard';
import RecipeDetail from '@/components/RecipeDetail';
import UserCenter from '@/components/UserCenter';
import { fetchRecipes, getCurrentUserId } from '@/data/recipeData';
import type { RecipeListItem } from '@/data/recipeData';

type Page = 'home' | 'detail' | 'user';

export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const data = await fetchRecipes();
      setRecipes(data);
    } catch {}
    setLoading(false);
  };

  const handleRecipeClick = (id: string) => {
    setSelectedRecipeId(id);
    setPage('detail');
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setPage('home');
    loadRecipes();
  };

  const handleUserClick = () => {
    setPage('user');
    window.scrollTo(0, 0);
  };

  const handleHomeClick = () => {
    setPage('home');
    loadRecipes();
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-50 bg-cream/80 backdrop-blur-md border-b border-warm-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={handleHomeClick}
            className="flex items-center gap-2 btn-hover group"
          >
            <ChefHat size={24} className="text-burnt transition-transform group-hover:rotate-12" />
            <span className="font-display text-xl font-bold text-charcoal">味聚</span>
          </button>

          <nav className="flex items-center gap-1">
            <button
              onClick={handleHomeClick}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 btn-hover
                ${page === 'home' || page === 'detail' ? 'bg-burnt/10 text-burnt' : 'text-warm-gray hover:text-burnt hover:bg-burnt/5'}
              `}
            >
              <Home size={16} />
              <span className="hidden sm:inline">首页</span>
            </button>
            <button
              onClick={handleUserClick}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 btn-hover
                ${page === 'user' ? 'bg-burnt/10 text-burnt' : 'text-warm-gray hover:text-burnt hover:bg-burnt/5'}
              `}
            >
              <User size={16} />
              <span className="hidden sm:inline">个人中心</span>
            </button>
          </nav>
        </div>
      </header>

      <main>
        {page === 'home' && (
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="text-center mb-10">
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-charcoal mb-3">
                发现美味，分享快乐
              </h1>
              <p className="text-warm-gray text-sm sm:text-base max-w-lg mx-auto">
                团队菜谱共享平台 — 分享你的拿手菜谱，探索更多美食灵感
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                    <div className="w-full h-56 bg-warm-border/30" />
                    <div className="p-4 space-y-3">
                      <div className="h-5 bg-warm-border/30 rounded w-2/3" />
                      <div className="h-4 bg-warm-border/30 rounded w-1/3" />
                      <div className="h-4 bg-warm-border/30 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-8">
                {recipes.map((recipe, i) => (
                  <div
                    key={recipe.id}
                    className="animate-float-up"
                    style={{ animationDelay: `${i * 0.06}s` }}
                  >
                    <RecipeCard recipe={recipe} onClick={handleRecipeClick} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {page === 'detail' && selectedRecipeId && (
          <RecipeDetail recipeId={selectedRecipeId} onBack={handleBack} />
        )}

        {page === 'user' && (
          <UserCenter userId={getCurrentUserId()} onRecipeClick={handleRecipeClick} />
        )}
      </main>

      <footer className="border-t border-warm-border py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm text-warm-gray">
            味聚 — 团队菜谱共享平台
          </p>
        </div>
      </footer>
    </div>
  );
}
