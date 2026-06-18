import { useState, useEffect, useCallback } from 'react';
import WebFontLoader from 'webfontloader';
import FontSelector from './FontSelector';
import ComparisonPanel from './ComparisonPanel';
import FavoriteManager from './FavoriteManager';
import {
  FontSettings,
  FavoriteItem,
  CHINESE_FONTS,
  ENGLISH_FONTS,
  DEFAULT_LEFT,
  DEFAULT_RIGHT,
  DEFAULT_TEXT,
} from './types';

const FAVORITES_KEY = 'font_preview_favorites';
const STORAGE_KEY_LEFT = 'font_preview_left';
const STORAGE_KEY_RIGHT = 'font_preview_right';
const STORAGE_KEY_TEXT = 'font_preview_text';

function App() {
  const [leftSettings, setLeftSettings] = useState<FontSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LEFT);
      return saved ? JSON.parse(saved) : DEFAULT_LEFT;
    } catch {
      return DEFAULT_LEFT;
    }
  });

  const [rightSettings, setRightSettings] = useState<FontSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RIGHT);
      return saved ? JSON.parse(saved) : DEFAULT_RIGHT;
    } catch {
      return DEFAULT_RIGHT;
    }
  });

  const [sampleText, setSampleText] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TEXT);
      return saved ?? DEFAULT_TEXT;
    } catch {
      return DEFAULT_TEXT;
    }
  });

  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [syncScroll, setSyncScroll] = useState<boolean>(true);
  const [lockComparison, setLockComparison] = useState<boolean>(false);

  useEffect(() => {
    const googleFonts: string[] = [];
    const families: string[] = [];

    [leftSettings, rightSettings].forEach((settings) => {
      const zhFont = CHINESE_FONTS.find((f) => f.value === settings.chineseFont);
      const enFont = ENGLISH_FONTS.find((f) => f.value === settings.englishFont);

      if (zhFont?.isGoogle) {
        const baseName = zhFont.value.replace(/"/g, '');
        if (!googleFonts.includes(baseName)) {
          googleFonts.push(baseName);
          families.push(`${baseName}:100,300,400,500,700,900`);
        }
      }
      if (enFont?.isGoogle) {
        const baseName = enFont.value.replace(/"/g, '');
        if (!googleFonts.includes(baseName)) {
          googleFonts.push(baseName);
          families.push(`${baseName}:100,300,400,500,700,900`);
        }
      }
    });

    if (families.length > 0) {
      WebFontLoader.load({
        google: { families },
      });
    }
  }, [leftSettings.chineseFont, leftSettings.englishFont, rightSettings.chineseFont, rightSettings.englishFont]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LEFT, JSON.stringify(leftSettings));
    } catch {}
  }, [leftSettings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RIGHT, JSON.stringify(rightSettings));
    } catch {}
  }, [rightSettings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TEXT, sampleText);
    } catch {}
  }, [sampleText]);

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch {}
  }, [favorites]);

  const getFontLabel = useCallback((fontValue: string, type: 'zh' | 'en'): string => {
    const list = type === 'zh' ? CHINESE_FONTS : ENGLISH_FONTS;
    return list.find((f) => f.value === fontValue)?.label || fontValue;
  }, []);

  const isCurrentFavorited = useCallback((): boolean => {
    return favorites.some(
      (f) =>
        JSON.stringify(f.left) === JSON.stringify(leftSettings) &&
        JSON.stringify(f.right) === JSON.stringify(rightSettings)
    );
  }, [favorites, leftSettings, rightSettings]);

  const toggleFavorite = useCallback(() => {
    setFavorites((prev) => {
      const existingIndex = prev.findIndex(
        (f) =>
          JSON.stringify(f.left) === JSON.stringify(leftSettings) &&
          JSON.stringify(f.right) === JSON.stringify(rightSettings)
      );
      if (existingIndex >= 0) {
        return prev.filter((_, i) => i !== existingIndex);
      }
      const zhLabel = getFontLabel(leftSettings.chineseFont, 'zh');
      const enLabel = getFontLabel(leftSettings.englishFont, 'en');
      const name = `${zhLabel}+${enLabel} ${leftSettings.fontSize}px`;
      const newItem: FavoriteItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        left: { ...leftSettings },
        right: { ...rightSettings },
        name,
        createdAt: Date.now(),
      };
      return [...prev, newItem];
    });
  }, [leftSettings, rightSettings, getFontLabel]);

  const loadFavorite = useCallback((item: FavoriteItem) => {
    setLeftSettings({ ...item.left });
    setRightSettings({ ...item.right });
  }, []);

  const deleteFavorite = useCallback((id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const updateLeftSetting = useCallback(
    <K extends keyof FontSettings>(key: K, value: FontSettings[K]) => {
      setLeftSettings((prev) => ({ ...prev, [key]: value }));
      if (lockComparison) {
        setRightSettings((prev) => ({ ...prev, [key]: value }));
      }
    },
    [lockComparison]
  );

  const updateRightSetting = useCallback(
    <K extends keyof FontSettings>(key: K, value: FontSettings[K]) => {
      setRightSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      if (text.length <= 500) {
        setSampleText(text);
      } else {
        setSampleText(text.slice(0, 500));
      }
    },
    []
  );

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  };

  return (
    <div style={{ minHeight: '100vh', padding: '24px 32px', backgroundColor: '#f9fafb' }}>
      <header
        style={{
          textAlign: 'center',
          marginBottom: '24px',
          padding: '16px 0',
        }}
      >
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#111827',
            margin: 0,
          }}
        >
          字体排版预览工具
        </h1>
      </header>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
        <textarea
          value={sampleText}
          onChange={handleTextChange}
          placeholder="请输入示例文本（最多500字）..."
          style={{
            width: '80%',
            maxWidth: '1200px',
            maxHeight: '240px',
            minHeight: '120px',
            padding: '16px',
            borderRadius: '8px',
            backgroundColor: '#f3f4f6',
            border: '1px solid #e5e7eb',
            fontSize: '14px',
            resize: 'vertical',
            outline: 'none',
            color: '#1f2937',
            lineHeight: '1.6',
            fontFamily: 'inherit',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#3b82f6';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#e5e7eb';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '5%', marginBottom: '24px' }}>
        <div style={{ width: '45%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FontSelector
            settings={leftSettings}
            onSettingChange={updateLeftSetting}
            title="左栏设置"
          />
        </div>
        <div style={{ width: '10%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={() => setSyncScroll(!syncScroll)}
            style={{
              ...buttonStyle,
              backgroundColor: syncScroll ? '#3b82f6' : '#ffffff',
              color: syncScroll ? '#ffffff' : '#374151',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {syncScroll ? '同步滚动' : '独立滚动'}
          </button>
          <button
            onClick={() => setLockComparison(!lockComparison)}
            style={{
              ...buttonStyle,
              backgroundColor: lockComparison ? '#f59e0b' : '#ffffff',
              color: lockComparison ? '#ffffff' : '#374151',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {lockComparison ? '已锁定' : '锁定对比'}
          </button>
        </div>
        <div style={{ width: '45%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FontSelector
            settings={rightSettings}
            onSettingChange={updateRightSetting}
            title="右栏设置"
          />
        </div>
      </div>

      <ComparisonPanel
        leftSettings={leftSettings}
        rightSettings={rightSettings}
        sampleText={sampleText}
        syncScroll={syncScroll}
        isFavorited={isCurrentFavorited()}
        onToggleFavorite={toggleFavorite}
      />

      <FavoriteManager
        favorites={favorites}
        onLoadFavorite={loadFavorite}
        onDeleteFavorite={deleteFavorite}
      />
    </div>
  );
}

export default App;
