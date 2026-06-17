import React, { useState, useEffect } from 'react';
import { Theme } from './types';
import ThemePanel from './components/ThemePanel';
import PreviewPanel from './components/PreviewPanel';

const defaultThemes: Theme[] = [
  {
    id: '1',
    name: '默认主题',
    primary: '#6C63FF',
    secondary: '#FF6584',
    background: '#1a1a2e',
    text: '#ffffff'
  },
  {
    id: '2',
    name: '海洋蓝',
    primary: '#00B4D8',
    secondary: '#48CAE4',
    background: '#03045E',
    text: '#ffffff'
  },
  {
    id: '3',
    name: '森林绿',
    primary: '#2D6A4F',
    secondary: '#40916C',
    background: '#081C15',
    text: '#ffffff'
  }
];

const App: React.FC = () => {
  const [themes, setThemes] = useState<Theme[]>(defaultThemes);
  const [currentThemeId, setCurrentThemeId] = useState<string>('1');
  const [compareMode, setCompareMode] = useState(false);
  const [compareThemeId, setCompareThemeId] = useState<string>('2');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && compareMode) {
        setCompareMode(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [compareMode]);

  const currentTheme = themes.find(t => t.id === currentThemeId) || themes[0];
  const compareTheme = themes.find(t => t.id === compareThemeId) || themes[1] || null;

  const handleToggleCompare = () => {
    if (!compareMode && themes.length < 2) {
      return;
    }
    setCompareMode(!compareMode);
    if (!compareMode) {
      const nextCompareId = themes.find(t => t.id !== currentThemeId);
      if (nextCompareId) {
        setCompareThemeId(nextCompareId.id);
      }
    }
  };

  return (
    <div className={`app-container ${isMobile ? 'mobile' : ''}`}>
      <div className={`theme-panel-wrapper ${isMobile ? 'mobile' : ''}`}>
        <ThemePanel
          themes={themes}
          setThemes={setThemes}
          currentThemeId={currentThemeId}
          setCurrentThemeId={setCurrentThemeId}
          compareMode={compareMode}
          compareThemeId={compareThemeId}
          setCompareThemeId={setCompareThemeId}
          onToggleCompare={handleToggleCompare}
        />
      </div>
      <div className="preview-panel-wrapper">
        <PreviewPanel
          currentTheme={currentTheme}
          compareTheme={compareMode ? compareTheme : null}
          compareMode={compareMode}
        />
      </div>
    </div>
  );
};

export default App;
