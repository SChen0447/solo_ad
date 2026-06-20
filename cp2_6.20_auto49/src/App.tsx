import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ThemeSelector, Theme } from './story/ThemeSelector';
import { storyModule, StoryModuleState } from './story/StoryModule';
import { canvasModule } from './canvas/CanvasModule';

interface StoryHistory {
  id: string;
  title: string;
  content: string;
  theme?: string;
  timestamp: Date;
}

interface BackgroundParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseColor: { r: number; g: number; b: number };
  alpha: number;
  targetX: number;
  targetY: number;
}

interface SelectionToolbar {
  visible: boolean;
  x: number;
  y: number;
  text: string;
}

const App: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [storyText, setStoryText] = useState('');
  const [displayedText, setDisplayedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [modelState, setModelState] = useState<StoryModuleState>(storyModule.getState());
  const [history, setHistory] = useState<StoryHistory[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectionToolbar, setSelectionToolbar] = useState<SelectionToolbar>({
    visible: false,
    x: 0,
    y: 0,
    text: '',
  });
  const [highlightRange, setHighlightRange] = useState<{ start: number; end: number } | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<BackgroundParticle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const storyPanelRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    const initParticles = () => {
      const particles: BackgroundParticle[] = [];
      const count = 150;
      const width = window.innerWidth;
      const height = window.innerHeight;

      for (let i = 0; i < count; i++) {
        const colorT = Math.random();
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 1.2 + 0.3,
          vy: (Math.random() - 0.5) * 1.2 + 0.3,
          size: 2 + Math.random() * 2,
          baseColor: {
            r: Math.floor(135 + (221 - 135) * colorT),
            g: Math.floor(206 + (160 - 206) * colorT),
            b: Math.floor(235 + (221 - 235) * colorT),
          },
          alpha: 0.3 + Math.random() * 0.4,
          targetX: 0,
          targetY: 0,
        });
      }
      particlesRef.current = particles;
    };

    initParticles();

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  useEffect(() => {
    const canvas = particleCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      const width = canvas.width;
      const height = canvas.height;
      const mouse = mouseRef.current;

      ctx.clearRect(0, 0, width, height);

      for (const p of particlesRef.current) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 200) {
          const force = (200 - dist) / 200;
          p.targetX = (dx / dist) * force * 20;
          p.targetY = (dy / dist) * force * 20;
        } else {
          p.targetX *= 0.95;
          p.targetY *= 0.95;
        }

        p.x += p.vx + p.targetX * 0.05;
        p.y += p.vy + p.targetY * 0.05;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
        gradient.addColorStop(0, `rgba(${p.baseColor.r}, ${p.baseColor.g}, ${p.baseColor.b}, ${p.alpha})`);
        gradient.addColorStop(1, `rgba(${p.baseColor.r}, ${p.baseColor.g}, ${p.baseColor.b}, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${p.baseColor.r}, ${p.baseColor.g}, ${p.baseColor.b}, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      canvasModule.init(canvasRef.current);
    }

    return () => {
      canvasModule.destroy();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setModelState(storyModule.getState());
    }, 200);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);



  const handleGenerate = useCallback(async (prompt?: string, theme?: Theme) => {
    if (isGenerating) return;

    const finalPrompt = prompt || inputValue.trim();
    if (!finalPrompt && !theme) return;

    setIsGenerating(true);
    setGenerateProgress(0);

    try {
      await storyModule.loadModel();

      const generatePrompt = theme ? theme.prompt : finalPrompt;
      const themeName = theme ? theme.name : undefined;

      const fullText = await storyModule.generateStory({
        prompt: generatePrompt,
        theme: themeName,
        maxLength: 150,
        onProgress: (progress) => setGenerateProgress(progress),
        onToken: (token) => {
          setDisplayedText((prev) => prev + token);
        },
      });

      setStoryText(fullText);
      await canvasModule.renderScene({ storyText: fullText, theme: themeName });

      const title = fullText.slice(0, 20) + (fullText.length > 20 ? '...' : '');
      const newHistory: StoryHistory = {
        id: Date.now().toString(),
        title,
        content: fullText,
        theme: themeName,
        timestamp: new Date(),
      };

      setHistory((prev) => [newHistory, ...prev].slice(0, 5));

      if (theme) {
        setSelectedTheme(theme);
      }
    } catch (error) {
      console.error('生成失败:', error);
    } finally {
      setIsGenerating(false);
      setGenerateProgress(100);
    }
  }, [inputValue, isGenerating]);

  const handleThemeSelect = useCallback((theme: Theme) => {
    setInputValue(theme.prompt);
    handleGenerate(theme.prompt, theme);
  }, [handleGenerate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isGenerating) {
      handleGenerate();
    }
  };

  const handleHistoryClick = (item: StoryHistory) => {
    setStoryText(item.content);
    setDisplayedText(item.content);
    canvasModule.renderScene({ storyText: item.content, theme: item.theme });
  };

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectionToolbar((prev) => ({ ...prev, visible: false }));
      return;
    }

    const range = selection.getRangeAt(0);
    const text = selection.toString().trim();
    
    if (!text || !storyPanelRef.current?.contains(range.commonAncestorContainer)) {
      setSelectionToolbar((prev) => ({ ...prev, visible: false }));
      return;
    }

    const rect = range.getBoundingClientRect();
    setSelectionToolbar({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      text,
    });

    const storyTextContent = storyText;
    const startIdx = storyTextContent.indexOf(text);
    if (startIdx !== -1) {
      setHighlightRange({ start: startIdx, end: startIdx + text.length });
    }
  }, [storyText]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleTextSelection);
    return () => document.removeEventListener('selectionchange', handleTextSelection);
  }, [handleTextSelection]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(selectionToolbar.text);
      setSelectionToolbar((prev) => ({ ...prev, visible: false }));
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleSpeak = () => {
    if (!synthRef.current) return;

    if (isSpeaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      setHighlightRange(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(selectionToolbar.text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      setHighlightRange(null);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setHighlightRange(null);
    };

    synthRef.current.speak(utterance);
    setSelectionToolbar((prev) => ({ ...prev, visible: false }));
  };

  const renderStoryWithHighlight = () => {
    if (!highlightRange) {
      return displayedText.split('').map((char, i) => (
        <span
          key={i}
          style={{
            opacity: 0,
            animation: `fadeIn 0.05s forwards ${i * 0.01}s`,
          }}
        >
          {char}
        </span>
      ));
    }

    const parts: React.ReactNode[] = [];

    if (highlightRange.start > 0) {
      parts.push(<span key="pre">{displayedText.slice(0, highlightRange.start)}</span>);
    }

    parts.push(
      <span
        key="highlight"
        style={{
          backgroundColor: 'rgba(255, 215, 0, 0.5)',
          borderRadius: '2px',
          animation: 'fadeIn 0.3s ease-in-out',
        }}
      >
        {displayedText.slice(highlightRange.start, highlightRange.end)}
      </span>
    );

    if (highlightRange.end < displayedText.length) {
      parts.push(<span key="post">{displayedText.slice(highlightRange.end)}</span>);
    }

    return parts;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={styles.appContainer}>
      <canvas ref={particleCanvasRef} style={styles.particleCanvas} />

      <div style={styles.header}>
        <h1 style={styles.title}>
          <span style={styles.titleText}>AI 故事生成器</span>
        </h1>
        <p style={styles.subtitle}>输入提示词或选择主题，开启你的奇幻之旅</p>
      </div>

      <ThemeSelector onThemeSelect={handleThemeSelect} disabled={isGenerating} />

      <div style={styles.mainContent}>
        <div style={styles.leftPanel}>
          <div
            ref={storyPanelRef}
            style={styles.storyPanel}
            onMouseUp={handleTextSelection}
          >
            <div style={styles.storyHeader}>
              <span style={styles.storyTitle}>📖 故事内容</span>
              {selectedTheme && (
                <span style={{ ...styles.themeBadge, background: selectedTheme.gradient }}>
                  {selectedTheme.icon} {selectedTheme.name}
                </span>
              )}
            </div>
            <div style={styles.storyContent}>
              {displayedText ? (
                renderStoryWithHighlight()
              ) : (
                <span style={styles.placeholderText}>
                  {modelState.isLoading
                    ? `正在加载模型... ${Math.round(modelState.loadProgress)}%`
                    : modelState.error
                    ? `模型加载失败: ${modelState.error}`
                    : '故事将在这里显示，输入提示词或点击上方主题卡片开始...'}
                </span>
              )}
            </div>

            {(isGenerating || (modelState.isLoading && !modelState.isReady)) && (
              <div style={styles.progressContainer}>
                <div style={styles.progressBar}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${modelState.isLoading ? modelState.loadProgress : generateProgress}%`,
                    }}
                  />
                </div>
                <span style={styles.progressText}>
                  {modelState.isLoading
                    ? `加载模型中 ${Math.round(modelState.loadProgress)}%`
                    : `生成中 ${Math.round(generateProgress)}%`}
                </span>
              </div>
            )}
          </div>
        </div>

        <div style={styles.rightPanel}>
          <div style={styles.canvasContainer}>
            <canvas
              ref={canvasRef}
              width={800}
              height={400}
              style={styles.canvas}
            />
            <div style={styles.canvasGlow} />
          </div>
        </div>
      </div>

      <div style={styles.inputSection}>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="输入你的故事开头，例如：在一个神秘的森林里..."
          style={{
            ...styles.input,
            borderColor: inputValue ? '#6c63ff' : '#3a3a5a',
          }}
          disabled={isGenerating}
        />
        <button
          onClick={() => handleGenerate()}
          disabled={isGenerating || !inputValue.trim()}
          style={{
            ...styles.generateButton,
            background: isGenerating || !inputValue.trim()
              ? 'rgba(108, 99, 255, 0.3)'
              : 'linear-gradient(135deg, #6c63ff 0%, #9d4edd 100%)',
            cursor: isGenerating || !inputValue.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {isGenerating ? (
            <span style={styles.spinner} />
          ) : (
            '✨ 生成故事'
          )}
        </button>
      </div>

      {sidebarOpen && (
        <div style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <span style={styles.sidebarTitle}>📜 历史记录</span>
            <button
              onClick={() => setSidebarOpen(false)}
              style={styles.sidebarClose}
            >
              ×
            </button>
          </div>
          <div style={styles.historyList}>
            {history.length === 0 ? (
              <p style={styles.emptyHistory}>暂无历史记录</p>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  style={styles.historyItem}
                  onClick={() => handleHistoryClick(item)}
                >
                  <div style={styles.historyTitle}>{item.title}</div>
                  <div style={styles.historyMeta}>
                    {item.theme && (
                      <span style={styles.historyTheme}>{item.theme}</span>
                    )}
                    <span style={styles.historyTime}>{formatTime(item.timestamp)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          style={styles.sidebarToggle}
        >
          📜
        </button>
      )}

      {selectionToolbar.visible && (
        <div
          style={{
            ...styles.selectionToolbar,
            left: selectionToolbar.x,
            top: selectionToolbar.y,
            transform: 'translateX(-50%) translateY(-100%)',
          }}
        >
          <button style={styles.toolbarButton} onClick={handleCopy}>
            📋 复制
          </button>
          <div style={styles.toolbarDivider} />
          <button
            style={{
              ...styles.toolbarButton,
              color: isSpeaking ? '#ff6b6b' : '#e0e0ff',
            }}
            onClick={handleSpeak}
          >
            {isSpeaking ? '⏹ 停止' : '🔊 朗读'}
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes breathe {
          0%, 100% { 
            text-shadow: 0 0 10px rgba(108, 99, 255, 0.8), 0 0 20px rgba(108, 99, 255, 0.6), 0 0 30px rgba(157, 78, 221, 0.4);
          }
          50% { 
            text-shadow: 0 0 15px rgba(108, 99, 255, 1), 0 0 30px rgba(108, 99, 255, 0.8), 0 0 45px rgba(157, 78, 221, 0.6);
          }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @media (max-width: 1024px) {
          .main-content {
            flex-direction: column !important;
            align-items: center !important;
          }
          .left-panel, .right-panel {
            width: 100% !important;
            max-width: 800px !important;
          }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    position: 'relative',
    minHeight: '100vh',
    padding: '20px',
    zIndex: 1,
  },
  particleCanvas: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 0,
  },
  header: {
    textAlign: 'center',
    marginBottom: '10px',
    position: 'relative',
    zIndex: 1,
  },
  title: {
    fontSize: 'clamp(24px, 4vw, 42px)',
    fontWeight: 800,
    margin: 0,
    background: 'linear-gradient(135deg, #6c63ff 0%, #9d4edd 50%, #ff6b9d 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    animation: 'breathe 3s ease-in-out infinite',
  },
  titleText: {
    display: 'inline-block',
  },
  subtitle: {
    fontSize: '14px',
    color: 'rgba(224, 224, 255, 0.7)',
    marginTop: '8px',
    marginBottom: 0,
  },
  mainContent: {
    display: 'flex',
    gap: '24px',
    padding: '20px 40px',
    maxWidth: '1400px',
    margin: '0 auto',
    position: 'relative',
    zIndex: 1,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  leftPanel: {
    flex: '1 1 500px',
    maxWidth: '55%',
    minWidth: '300px',
  },
  rightPanel: {
    flex: '1 1 400px',
    maxWidth: '40%',
    minWidth: '300px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  storyPanel: {
    background: 'rgba(20, 20, 40, 0.6)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '12px',
    padding: '24px',
    minHeight: '300px',
    maxHeight: '450px',
    overflowY: 'auto',
    border: '1px solid rgba(108, 99, 255, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    userSelect: 'text',
  },
  storyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  storyTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#e0e0ff',
  },
  themeBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#ffffff',
    fontWeight: 500,
  },
  storyContent: {
    fontSize: '16px',
    lineHeight: 1.8,
    color: '#e0e0ff',
    letterSpacing: '0.5px',
  },
  placeholderText: {
    color: 'rgba(224, 224, 255, 0.5)',
    fontStyle: 'italic',
  },
  progressContainer: {
    marginTop: '16px',
  },
  progressBar: {
    height: '6px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #6c63ff 0%, #9d4edd 100%)',
    transition: 'width 0.2s linear',
  },
  progressText: {
    display: 'block',
    marginTop: '8px',
    fontSize: '12px',
    color: 'rgba(224, 224, 255, 0.6)',
    textAlign: 'center',
  },
  canvasContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: '2 / 1',
    maxWidth: '800px',
  },
  canvas: {
    width: '100%',
    height: '100%',
    borderRadius: '8px',
    display: 'block',
    imageRendering: 'pixelated',
  },
  canvasGlow: {
    position: 'absolute',
    top: '-2px',
    left: '-2px',
    right: '-2px',
    bottom: '-2px',
    background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.5), rgba(157, 78, 221, 0.5))',
    borderRadius: '10px',
    zIndex: -1,
    filter: 'blur(8px)',
    opacity: 0.6,
  },
  inputSection: {
    display: 'flex',
    gap: '12px',
    maxWidth: '800px',
    margin: '24px auto',
    padding: '0 20px',
    position: 'relative',
    zIndex: 1,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minWidth: '200px',
    padding: '14px 20px',
    fontSize: '16px',
    borderRadius: '8px',
    border: '2px solid #3a3a5a',
    background: 'rgba(30, 30, 50, 0.8)',
    color: '#ffffff',
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  },
  generateButton: {
    padding: '14px 32px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  spinner: {
    width: '18px',
    height: '18px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: '#ffffff',
    borderRadius: '50%',
    animation: 'spin 0.5s linear infinite',
  },
  sidebar: {
    position: 'fixed',
    right: 0,
    top: 0,
    width: '280px',
    height: '100vh',
    background: 'rgba(15, 15, 35, 0.95)',
    backdropFilter: 'blur(12px)',
    borderLeft: '1px solid rgba(108, 99, 255, 0.3)',
    padding: '20px',
    zIndex: 100,
    overflowY: 'auto',
    transition: 'transform 0.3s ease',
  },
  sidebarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  sidebarTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#e0e0ff',
  },
  sidebarClose: {
    background: 'none',
    border: 'none',
    color: 'rgba(224, 224, 255, 0.6)',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  emptyHistory: {
    color: 'rgba(224, 224, 255, 0.4)',
    textAlign: 'center',
    padding: '40px 0',
  },
  historyItem: {
    padding: '12px',
    background: 'rgba(108, 99, 255, 0.1)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid transparent',
  },
  historyTitle: {
    fontSize: '14px',
    color: '#e0e0ff',
    marginBottom: '6px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  historyMeta: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  historyTheme: {
    fontSize: '11px',
    padding: '2px 8px',
    background: 'rgba(108, 99, 255, 0.3)',
    borderRadius: '4px',
    color: '#b0a8ff',
  },
  historyTime: {
    fontSize: '11px',
    color: 'rgba(224, 224, 255, 0.5)',
  },
  sidebarToggle: {
    position: 'fixed',
    right: '20px',
    top: '20px',
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: 'rgba(108, 99, 255, 0.3)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(108, 99, 255, 0.5)',
    fontSize: '18px',
    cursor: 'pointer',
    zIndex: 99,
    transition: 'all 0.2s ease',
  },
  selectionToolbar: {
    position: 'fixed',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px',
    background: 'rgba(30, 30, 50, 0.8)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    borderRadius: '6px',
    border: '1px solid rgba(108, 99, 255, 0.3)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
    zIndex: 1000,
  },
  toolbarButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#e0e0ff',
    background: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  toolbarDivider: {
    width: '1px',
    height: '20px',
    background: 'rgba(255, 255, 255, 0.1)',
  },
};

export default App;
