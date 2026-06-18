import React, { useState, useCallback } from 'react';
import CodeEditor from './CodeEditor';
import PreviewCard from './PreviewCard';
import { themes, defaultCode } from './themes';
import type { Theme } from './themes';
import './styles.css';

const themeKeys = Object.keys(themes);

const App: React.FC = () => {
  const [code, setCode] = useState(defaultCode);
  const [currentThemeName, setCurrentThemeName] = useState('starry-night');
  const [language, setLanguage] = useState<'javascript' | 'css' | 'html'>('javascript');
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [fontSize, setFontSize] = useState(14);
  const [borderRadius, setBorderRadius] = useState(16);
  const [cardTitle, setCardTitle] = useState('Code Snapshot');

  const currentTheme: Theme = themes[currentThemeName];

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
  }, []);

  const handleThemeChange = useCallback((themeName: string) => {
    setCurrentThemeName(themeName);
  }, []);

  const handleLanguageChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as 'javascript' | 'css' | 'html');
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Code Snapshot</h1>
        <p>将代码片段转换为精美的分享卡片</p>
      </header>

      <div className="main-layout">
        <div className="left-panel">
          <CodeEditor
            code={code}
            onCodeChange={handleCodeChange}
            theme={currentTheme}
            language={language}
            showLineNumbers={showLineNumbers}
            fontSize={fontSize}
            onShowLineNumbersChange={setShowLineNumbers}
            onFontSizeChange={setFontSize}
            borderRadius={borderRadius}
            onBorderRadiusChange={setBorderRadius}
          />
        </div>

        <div className="right-panel">
          <div className="theme-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>主题风格</h3>
              <select
                className="language-select"
                value={language}
                onChange={handleLanguageChange}
              >
                <option value="javascript">JavaScript</option>
                <option value="css">CSS</option>
                <option value="html">HTML</option>
              </select>
            </div>

            <div className="theme-cards">
              {themeKeys.map((key) => {
                const t = themes[key];
                const isActive = key === currentThemeName;
                return (
                  <div
                    key={key}
                    className={`theme-card${isActive ? ' active' : ''}`}
                    style={{ background: t.cardBackground }}
                    onClick={() => handleThemeChange(key)}
                  >
                    <div
                      className="theme-card-name"
                      style={{ color: t.titleColor }}
                    >
                      {t.displayName}
                    </div>
                    <div
                      className="theme-card-preview"
                      style={{ color: t.textColor }}
                    >
                      <span style={{ color: t.keywordColor }}>const</span>{' '}
                      <span style={{ color: t.functionColor }}>x</span> ={' '}
                      <span style={{ color: t.stringColor }}>"hello"</span>;
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <PreviewCard
            code={code}
            theme={currentTheme}
            language={language}
            showLineNumbers={showLineNumbers}
            fontSize={fontSize}
            borderRadius={borderRadius}
            cardTitle={cardTitle}
            onCardTitleChange={setCardTitle}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
