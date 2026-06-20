import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import ThemeSelector from './story/ThemeSelector';
import StoryPanel from './components/StoryPanel';
import CanvasView from './components/CanvasView';
import ParticleBackground from './components/ParticleBackground';
import FloatingToolbar from './components/FloatingToolbar';
import HistorySidebar from './components/HistorySidebar';
import { storyModule } from './story/StoryModule';
import { useAppStore } from './store';
import { parseKeywords, StoryRecord } from './store/types';

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    isGenerating,
    generationProgress,
    modelLoadingState,
    modelLoadingProgress,
    activeThemeId,
    currentTheme,
    setIsGenerating,
    setGenerationProgress,
    setModelLoadingState,
    setModelLoadingProgress,
    setCurrentStory,
    setDisplayedStory,
    appendDisplayedChar,
    addStoryToHistory,
    setSceneData,
    resetGeneration,
  } = useAppStore();

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const streamText = useCallback(async (text: string) => {
    for (let i = 0; i < text.length; i++) {
      appendDisplayedChar(text[i]);
      setGenerationProgress(Math.min(100, Math.round((i + 1) / text.length * 100)));
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }, [appendDisplayedChar, setGenerationProgress]);

  const handleGenerate = useCallback(async () => {
    if (isGenerating) return;

    const themeName = currentTheme || '奇幻';
    const fullPrompt = themeName + '：' + (prompt.trim() || '写一段精彩的故事');

    resetGeneration();
    setIsGenerating(true);

    try {
      const storyText = await storyModule.generateStory(
        fullPrompt,
        (chunk) => {},
        (progress) => {
          setModelLoadingProgress(progress);
          if (progress < 100) {
            setModelLoadingState('loading');
          } else {
            setModelLoadingState('ready');
          }
        }
      );

      setCurrentStory(storyText);
      await streamText(storyText);

      const sceneData = parseKeywords(storyText, themeName);
      setSceneData(sceneData);

      const record: StoryRecord = {
        id: generateId(),
        title: storyText.slice(0, 20) + (storyText.length > 20 ? '...' : ''),
        content: storyText,
        theme: themeName,
        keywords: sceneData.terrain.concat(sceneData.buildings, [sceneData.weather]),
        createdAt: Date.now(),
      };
      addStoryToHistory(record);
    } catch (err) {
      console.error('生成故事失败:', err);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(100);
    }
  }, [isGenerating, currentTheme, prompt, resetGeneration, setIsGenerating, setCurrentStory, streamText, setSceneData, addStoryToHistory, setModelLoadingProgress, setModelLoadingState]);

  useEffect(() => {
    if (activeThemeId && currentTheme) {
      handleGenerate();
    }
  }, [activeThemeId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const showProgress = isGenerating;
  const progressPercent = isGenerating ? generationProgress : 0;

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      color: '#e0e0ff',
      fontFamily: '"PingFang SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, sans-serif',
      overflow: 'hidden',
    }}>
      <ParticleBackground />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        <header style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: 800,
            margin: 0,
            background: 'linear-gradient(135deg, #87CEEB 0%, #6c63ff 50%, #DDA0DD 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'breathing 3s ease-in-out infinite',
            letterSpacing: '2px',
          }}>
            ✨ 故事生成与可视化
          </h1>
          <p style={{ color: '#8080b0', marginTop: '8px', fontSize: '14px' }}>
            选择主题或输入提示词，AI将为你生成故事并绘制像素风场景
          </p>
        </header>

        <style>{`
          @keyframes breathing {
            0%, 100% { opacity: 1; filter: brightness(1); }
            50% { opacity: 0.85; filter: brightness(1.1); }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          ::-webkit-scrollbar {
            width: 6px;
          }
          ::-webkit-scrollbar-track {
            background: rgba(30, 30, 60, 0.3);
            border-radius: 3px;
          }
          ::-webkit-scrollbar-thumb {
            background: rgba(108, 99, 255, 0.4);
            border-radius: 3px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(108, 99, 255, 0.6);
          }
        `}</style>

        <ThemeSelector />

        <div style={{ display: 'flex', gap: '24px', marginTop: '8px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 55%', minWidth: '320px' }}>
            <StoryPanel />
          </div>

          <div style={{ flex: '1 1 40%', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{
                color: '#a0a0d0',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '8px',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}>
                场景插画
              </h3>
              <CanvasView />
            </div>

            <div style={{
              background: 'rgba(20, 20, 50, 0.7)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: '12px',
              border: '1px solid rgba(108, 99, 255, 0.2)',
            }}>
              <HistorySidebar />
            </div>
          </div>
        </div>

        <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '600px',
          }}>
            <input
              ref={inputRef}
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="输入故事提示词，或直接选择上方主题..."
              style={{
                width: '100%',
                padding: '14px 140px 14px 18px',
                borderRadius: '8px',
                background: 'rgba(30, 30, 60, 0.8)',
                color: '#e0e0ff',
                border: inputFocused
                  ? '2px solid #6c63ff'
                  : '2px solid rgba(108, 99, 255, 0.3)',
                outline: 'none',
                fontSize: '15px',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                boxShadow: inputFocused
                  ? '0 0 15px rgba(108, 99, 255, 0.3)'
                  : 'none',
                fontFamily: 'inherit',
              }}
              disabled={isGenerating}
            />
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              style={{
                position: 'absolute',
                right: '6px',
                top: '50%',
                transform: 'translateY(-50%)',
                padding: '9px 18px',
                borderRadius: '6px',
                background: isGenerating
                  ? 'rgba(108, 99, 255, 0.3)'
                  : 'linear-gradient(135deg, #6c63ff 0%, #8b5cf6 100%)',
                color: '#fff',
                border: 'none',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'opacity 0.2s, transform 0.2s',
                opacity: isGenerating ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isGenerating) {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-50%) scale(1.03)';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-50%) scale(1)';
              }}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 0.5s linear infinite' }} />
                  生成中
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  生成故事
                </>
              )}
            </button>
          </div>

          {showProgress && (
            <div style={{
              width: '100%',
              maxWidth: '600px',
              height: '4px',
              background: 'rgba(30, 30, 60, 0.8)',
              borderRadius: '2px',
              overflow: 'hidden',
              marginTop: '4px',
            }}>
              <div
                style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(90deg, #6c63ff 0%, #8b5cf6 50%, #DDA0DD 100%)',
                  transition: 'width 0.1s linear',
                  borderRadius: '2px',
                }}
              />
            </div>
          )}

          {modelLoadingState === 'loading' && (
            <p style={{ fontSize: '12px', color: '#8080b0', marginTop: '4px' }}>
              模型加载中 {modelLoadingProgress}%，首次加载可能需要几秒...
            </p>
          )}
        </div>

        <FloatingToolbar />
      </div>
    </div>
  );
};

export default App;
