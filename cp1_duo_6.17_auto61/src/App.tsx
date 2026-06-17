import { useState, useEffect, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import ThemeSelector from './ThemeSelector';
import FilterBar from './FilterBar';
import GalleeryList from './GalleeryList';
import ThemePreviewFloat from './ThemePreviewFloat';
import { ComponentItem, Theme, CategoryType, FavoriteItem, defaultTheme } from './componentData';

function App() {
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<Theme>(defaultTheme);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [favoritesLoading, setFavoritesLoading] = useState(true);

  const favoriteIds = favorites.map((fav) => fav.component_id);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [componentsRes, themesRes, favoritesRes] = await Promise.all([
          axios.get('/api/components'),
          axios.get('/api/themes'),
          axios.get('/api/favorites')
        ]);
        setComponents(componentsRes.data);
        setThemes(themesRes.data);
        if (themesRes.data.length > 0) {
          setSelectedTheme(themesRes.data[0]);
        }
        setFavorites(favoritesRes.data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
        setFavoritesLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', selectedTheme.primaryColor);
    document.documentElement.style.setProperty('--secondary-color', selectedTheme.secondaryColor);
    document.documentElement.style.setProperty('--bg-color', selectedTheme.bgColor);
    document.documentElement.style.setProperty('--font-family', selectedTheme.fontFamily);
  }, [selectedTheme]);

  const handleThemeChange = useCallback((theme: Theme) => {
    setSelectedTheme(theme);
  }, []);

  const handleCategoryChange = useCallback((category: CategoryType) => {
    setSelectedCategory(category);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleShowFavoritesChange = useCallback((show: boolean) => {
    setShowFavoritesOnly(show);
  }, []);

  const handleAddFavorite = useCallback(async (componentId: number): Promise<{ success: boolean; error?: string }> => {
    const prevFavorites = [...favorites];
    const tempFavorite: FavoriteItem = {
      component_id: componentId,
      created_at: new Date().toISOString()
    };
    setFavorites((prev) => [...prev, tempFavorite]);

    try {
      const response = await axios.post('/api/favorites', { component_id: componentId });
      if (response.data.success) {
        setFavorites((prev) =>
          prev.map((fav) =>
            fav.component_id === componentId && fav.created_at === tempFavorite.created_at
              ? response.data.favorite
              : fav
          )
        );
        return { success: true };
      }
      setFavorites(prevFavorites);
      return { success: false, error: '添加收藏失败' };
    } catch (error) {
      setFavorites(prevFavorites);
      const axiosError = error as AxiosError<{ error?: string }>;
      if (axiosError.response?.status === 409) {
        return { success: false, error: '该组件已在收藏列表中' };
      }
      if (axiosError.response?.status === 400) {
        return { success: false, error: axiosError.response.data.error || '请求参数错误' };
      }
      if (axiosError.code === 'ERR_NETWORK') {
        return { success: false, error: '网络错误，请检查网络连接' };
      }
      return { success: false, error: '服务器错误，请稍后重试' };
    }
  }, [favorites]);

  const handleRemoveFavorite = useCallback(async (componentId: number): Promise<{ success: boolean; error?: string }> => {
    const prevFavorites = [...favorites];
    setFavorites((prev) => prev.filter((fav) => fav.component_id !== componentId));

    try {
      const response = await axios.delete(`/api/favorites/${componentId}`);
      if (response.data.success) {
        return { success: true };
      }
      setFavorites(prevFavorites);
      return { success: false, error: '取消收藏失败' };
    } catch (error) {
      setFavorites(prevFavorites);
      const axiosError = error as AxiosError<{ error?: string }>;
      if (axiosError.response?.status === 404) {
        return { success: false, error: '该收藏不存在' };
      }
      if (axiosError.code === 'ERR_NETWORK') {
        return { success: false, error: '网络错误，请检查网络连接' };
      }
      return { success: false, error: '服务器错误，请稍后重试' };
    }
  }, [favorites]);

  const filteredComponents = components.filter((comp) => {
    const matchesCategory = selectedCategory === 'all' || comp.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFavorites = !showFavoritesOnly || favoriteIds.includes(comp.id);
    return matchesCategory && matchesSearch && matchesFavorites;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-[#f9fafb] border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold mb-4" style={{ color: '#1f2937' }}>
            Component Gallery
          </h1>
          <ThemeSelector
            themes={themes}
            selectedTheme={selectedTheme}
            onThemeChange={handleThemeChange}
          />
          <FilterBar
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            primaryColor={selectedTheme.primaryColor}
            showFavoritesOnly={showFavoritesOnly}
            onShowFavoritesChange={handleShowFavoritesChange}
            favoritesLoading={favoritesLoading}
          />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <GalleeryList
          components={filteredComponents}
          theme={selectedTheme}
          favorites={favorites}
          onAddFavorite={handleAddFavorite}
          onRemoveFavorite={handleRemoveFavorite}
        />
      </main>
      <ThemePreviewFloat theme={selectedTheme} />
    </div>
  );
}

export default App;
