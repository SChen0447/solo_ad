import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ThemeSelector from './ThemeSelector';
import FilterBar from './FilterBar';
import GalleeryList from './GalleeryList';
import ThemePreviewFloat from './ThemePreviewFloat';
import { ComponentItem, Theme, CategoryType, defaultTheme } from './componentData';

function App() {
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<Theme>(defaultTheme);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleToggleFavorite = useCallback(async (componentId: number) => {
    try {
      const response = await axios.post('/api/favorites', { id: componentId });
      if (response.data.success) {
        setFavorites((prev) =>
          response.data.isFavorite
            ? [...prev, componentId]
            : prev.filter((id) => id !== componentId)
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      return false;
    }
  }, []);

  const filteredComponents = components.filter((comp) => {
    const matchesCategory = selectedCategory === 'all' || comp.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
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
          />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <GalleeryList
          components={filteredComponents}
          theme={selectedTheme}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
        />
      </main>
      <ThemePreviewFloat theme={selectedTheme} />
    </div>
  );
}

export default App;
