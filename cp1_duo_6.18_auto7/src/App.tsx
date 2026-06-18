import { useState, useEffect, useCallback } from 'react';
import { RecipeLibrary } from './components/RecipeLibrary';
import { ShoppingList } from './components/ShoppingList';
import { useRecipeStore } from './store/recipeStore';
import type { TabType } from './types';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('recipes');
  const [displayTab, setDisplayTab] = useState<TabType>('recipes');
  const [animClass, setAnimClass] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const generateShoppingList = useRecipeStore((s) => s.generateShoppingList);

  const handleTabChange = useCallback((tab: TabType) => {
    if (tab === activeTab) return;

    const direction = tab === 'shopping' ? 'slide-in-left' : 'slide-in-right';
    setAnimClass(`tab-exit ${tab === 'shopping' ? 'slide-out-left' : 'slide-out-right'}`);

    setTimeout(() => {
      setActiveTab(tab);
      setDisplayTab(tab);
      setAnimClass(direction);
      setMenuOpen(false);

      setTimeout(() => {
        setAnimClass('');
      }, 400);
    }, 200);
  }, [activeTab]);

  const handleGenerateShoppingList = () => {
    generateShoppingList();
    setAnimClass('tab-exit slide-out-left');

    setTimeout(() => {
      setActiveTab('shopping');
      setDisplayTab('shopping');
      setAnimClass('slide-in-left');
      setMenuOpen(false);

      setTimeout(() => {
        setAnimClass('');
      }, 400);
    }, 200);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="nav-brand">
            <span className="brand-icon">🍳</span>
            <span className="brand-text">我的食谱</span>
          </div>

          <div className="nav-tabs desktop-tabs">
            <button
              className={`nav-tab ${activeTab === 'recipes' ? 'active' : ''}`}
              onClick={() => handleTabChange('recipes')}
            >
              📖 食谱库
            </button>
            <button
              className={`nav-tab ${activeTab === 'shopping' ? 'active' : ''}`}
              onClick={() => handleTabChange('shopping')}
            >
              🛒 购物清单
            </button>
          </div>

          <button
            className={`hamburger ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="菜单"
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        {menuOpen && (
          <div className="mobile-menu">
            <button
              className={`mobile-tab ${activeTab === 'recipes' ? 'active' : ''}`}
              onClick={() => handleTabChange('recipes')}
            >
              📖 食谱库
            </button>
            <button
              className={`mobile-tab ${activeTab === 'shopping' ? 'active' : ''}`}
              onClick={() => handleTabChange('shopping')}
            >
              🛒 购物清单
            </button>
          </div>
        )}
      </nav>

      <main className="main-content">
        <div className={`tab-panel ${animClass}`}>
          {displayTab === 'recipes' ? (
            <RecipeLibrary onGenerateShoppingList={handleGenerateShoppingList} />
          ) : (
            <ShoppingList />
          )}
        </div>
      </main>
    </div>
  );
}
