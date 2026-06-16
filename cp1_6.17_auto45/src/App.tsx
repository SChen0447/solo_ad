import React, { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import InputPanel from './components/InputPanel';
import StoryBoard from './components/StoryBoard';
import ImageCard from './components/ImageCard';
import { generateImage, hexToDataUrl, checkHealth } from './utils/api';
import type { ComicCard } from './types';

const App: React.FC = () => {
  const [cards, setCards] = useState<ComicCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    const init = async () => {
      const health = await checkHealth();
      setServerStatus(health.status === 'healthy' ? 'online' : 'offline');

      if (cards.length === 0) {
        addNewCard();
      }
    };
    init();
  }, []);

  const addNewCard = useCallback(() => {
    if (cards.length >= 20) return;

    const newCard: ComicCard = {
      id: uuidv4(),
      prompt: '',
      imageData: null,
      speechBubbles: [],
      narration: null,
      status: 'idle',
      progress: 0,
    };

    setCards((prev) => [...prev, newCard]);
    setSelectedCardId(newCard.id);
  }, [cards.length]);

  const handleGenerate = useCallback(
    async (prompt: string) => {
      if (isGenerating) return;

      let targetCardId = selectedCardId;

      if (!targetCardId || cards.find((c) => c.id === targetCardId)?.status === 'completed') {
        if (cards.length >= 20) {
          alert('已达到最大卡片数量（20张）');
          return;
        }

        const newCard: ComicCard = {
          id: uuidv4(),
          prompt,
          imageData: null,
          speechBubbles: [],
          narration: null,
          status: 'loading',
          progress: 0,
        };

        setCards((prev) => [...prev, newCard]);
        targetCardId = newCard.id;
        setSelectedCardId(targetCardId);
      } else {
        setCards((prev) =>
          prev.map((c) =>
            c.id === targetCardId
              ? { ...c, prompt, status: 'loading', progress: 0, imageData: null }
              : c
          )
        );
      }

      setIsGenerating(true);

      try {
        const response = await generateImage(prompt, (progress) => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === targetCardId ? { ...c, progress } : c
            )
          );
        });

        if (response.success && response.image) {
          const dataUrl = hexToDataUrl(response.image);

          setCards((prev) =>
            prev.map((c) =>
              c.id === targetCardId
                ? {
                    ...c,
                    imageData: dataUrl,
                    status: 'completed',
                    progress: 100,
                    prompt: response.prompt,
                  }
                : c
            )
          );
        } else {
          setCards((prev) =>
            prev.map((c) =>
              c.id === targetCardId
                ? { ...c, status: 'error', progress: 100, error: response.error || '生成失败' }
                : c
            )
          );
        }
      } catch (error: unknown) {
        setCards((prev) =>
          prev.map((c) =>
            c.id === targetCardId
              ? {
                  ...c,
                  status: 'error',
                  progress: 100,
                  error: error instanceof Error ? error.message : '生成失败',
                }
              : c
          )
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [isGenerating, selectedCardId, cards]
  );

  const handleSelectCard = useCallback((cardId: string) => {
    setSelectedCardId(cardId);
  }, []);

  const handleReorderCards = useCallback((newCards: ComicCard[]) => {
    setCards(newCards);
  }, []);

  const handleUpdateCard = useCallback(
    (cardId: string, updates: Partial<ComicCard>) => {
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, ...updates } : c))
      );
    },
    []
  );

  const selectedCard = selectedCardId ? cards.find((c) => c.id === selectedCardId) : null;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🎨 AI 漫画生成与分镜故事板</h1>
          <div className={`server-status ${serverStatus}`}>
            <span className="status-dot"></span>
            <span className="status-text">
              {serverStatus === 'checking'
                ? '连接中...'
                : serverStatus === 'online'
                ? '服务器在线'
                : '服务器离线'}
            </span>
          </div>
        </div>
      </header>

      <main className="app-main">
        <section className="input-section">
          <InputPanel
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            selectedCardId={selectedCardId}
          />
        </section>

        <section className="preview-section">
          <h2 className="section-title">预览区</h2>
          <div className="preview-container">
            {selectedCard ? (
              <ImageCard
                key={selectedCard.id}
                card={selectedCard}
                isExpanded={true}
                onUpdateCard={(updates) => handleUpdateCard(selectedCard.id, updates)}
              />
            ) : (
              <div className="empty-preview">
                <span className="empty-icon">🖼️</span>
                <p>选择一张卡片进行编辑</p>
              </div>
            )}
          </div>
        </section>

        <section className="storyboard-section">
          <StoryBoard
            cards={cards}
            selectedCardId={selectedCardId}
            onAddCard={addNewCard}
            onSelectCard={handleSelectCard}
            onReorderCards={handleReorderCards}
            onUpdateCard={handleUpdateCard}
            maxCards={20}
          />
        </section>
      </main>

      <footer className="app-footer">
        <p>拖拽卡片调整顺序 · 点击卡片展开编辑 · 支持滚轮缩放图像</p>
      </footer>

      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #F5F0E8;
          color: #333333;
          min-height: 100vh;
        }

        .app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .app-header {
          background: #ffffff;
          border-bottom: 1px solid #e0e0e0;
          padding: 16px 24px;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .header-content {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .app-header h1 {
          font-size: 24px;
          font-weight: 700;
          color: #333333;
        }

        .server-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 13px;
          transition: all 0.3s;
        }

        .server-status.checking {
          background: #fff8e1;
          color: #f57c00;
        }

        .server-status.online {
          background: #e8f5e9;
          color: #388e3c;
        }

        .server-status.offline {
          background: #ffebee;
          color: #d32f2f;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .server-status.checking .status-dot {
          background: #f57c00;
        }

        .server-status.online .status-dot {
          background: #4caf50;
        }

        .server-status.offline .status-dot {
          background: #f44336;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .app-main {
          flex: 1;
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .input-section {
          animation: slideDown 0.5s ease-out;
        }

        .preview-section {
          animation: fadeIn 0.5s ease-out 0.1s both;
        }

        .storyboard-section {
          animation: slideUp 0.5s ease-out 0.2s both;
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #333333;
          margin-bottom: 12px;
        }

        .preview-container {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          min-height: 400px;
          background: #ffffff;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
        }

        .empty-preview {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          color: #999999;
          min-height: 300px;
        }

        .empty-icon {
          font-size: 64px;
        }

        .empty-preview p {
          font-size: 16px;
        }

        .app-footer {
          background: #ffffff;
          border-top: 1px solid #e0e0e0;
          padding: 16px 24px;
          text-align: center;
          color: #999999;
          font-size: 13px;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          .app-header {
            padding: 12px 16px;
          }

          .header-content {
            flex-direction: column;
            gap: 8px;
            align-items: flex-start;
          }

          .app-header h1 {
            font-size: 20px;
          }

          .app-main {
            padding: 16px;
            gap: 16px;
          }

          .preview-container {
            padding: 12px;
            min-height: auto;
          }

          .section-title {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
