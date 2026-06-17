import { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ideaApi, getUserId, getUserName, setUserName } from './services/api';
import { wsService } from './services/websocket';
import IdeaBoard from './modules/idea/IdeaBoard';
import MatrixView from './modules/matrix/MatrixView';
import type { Idea, Weights } from './types';

function App() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [weights, setWeights] = useState<Weights>({
    importance_weight: 5.0,
    urgency_weight: 5.0
  });
  const [loading, setLoading] = useState(true);
  const [splitPosition, setSplitPosition] = useState(40);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const response = await ideaApi.getAllIdeas();
        setIdeas(response.ideas);
        setWeights(response.weights);
      } catch (error) {
        console.error('加载初始数据失败:', error);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    wsService.connect();

    const unsubscribers = [
      wsService.onIdeaCreated((idea) => {
        setIdeas((prev) => {
          if (prev.find((i) => i.id === idea.id)) return prev;
          return [idea, ...prev];
        });
      }),
      wsService.onIdeaUpdated((idea) => {
        setIdeas((prev) =>
          prev.map((i) => (i.id === idea.id ? idea : i))
        );
      }),
      wsService.onMatrixUpdated((idea) => {
        setIdeas((prev) =>
          prev.map((i) => (i.id === idea.id ? idea : i))
        );
      }),
      wsService.onWeightsUpdated((data) => {
        setWeights(data.weights);
        setIdeas(data.ideas);
      })
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      wsService.disconnect();
    };
  }, []);

  const handleIdeaCreated = useCallback((idea: Idea) => {
    setIdeas((prev) => [idea, ...prev]);
  }, []);

  const handleIdeaUpdated = useCallback((idea: Idea) => {
    setIdeas((prev) =>
      prev.map((i) => (i.id === idea.id ? idea : i))
    );
  }, []);

  const handleWeightsChange = useCallback(
    async (newWeights: Weights) => {
      try {
        const response = await ideaApi.updateWeights(newWeights);
        setWeights(response.weights);
        setIdeas(response.ideas);
      } catch (error) {
        console.error('更新权重失败:', error);
      }
    },
    []
  );

  const handleSplitDragStart = () => setIsDragging(true);
  const handleSplitDragEnd = () => setIsDragging(false);

  const handleSplitDrag = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !containerRef.current || isMobile) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newPosition = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPosition(Math.max(20, Math.min(80, newPosition)));
    },
    [isDragging, isMobile]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current || isMobile) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newPosition = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPosition(Math.max(20, Math.min(80, newPosition)));
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isMobile]);

  if (loading) {
    return (
      <div className="loading-container">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="loading-spinner"
        />
        <span>加载中...</span>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="header-title"
        >
          <span className="logo-icon">💡</span>
          <h1>创意众筹与优先级矩阵</h1>
        </motion.div>
        <div className="header-user">
          <input
            type="text"
            defaultValue={getUserName()}
            placeholder="输入你的名字"
            className="user-name-input"
            onBlur={(e) => setUserName(e.target.value || '匿名用户')}
          />
        </div>
      </header>

      <div
        ref={containerRef}
        className={`main-content ${isMobile ? 'mobile' : ''}`}
        onMouseMove={handleSplitDrag}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key="ideaboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="ideaboard-section"
            style={{ flexBasis: isMobile ? '100%' : `${splitPosition}%` }}
          >
            <IdeaBoard
              ideas={ideas}
              onIdeaCreated={handleIdeaCreated}
              onIdeaUpdated={handleIdeaUpdated}
              getUserId={getUserId}
              getUserName={getUserName}
            />
          </motion.div>

          {!isMobile && (
            <div
              className={`split-divider ${isDragging ? 'dragging' : ''}`}
              onMouseDown={handleSplitDragStart}
              onMouseUp={handleSplitDragEnd}
            >
              <div className="split-handle" />
            </div>
          )}

          <motion.div
            key="matrixview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="matrix-section"
            style={{ flexBasis: isMobile ? '100%' : `${100 - splitPosition}%` }}
          >
            <MatrixView
              ideas={ideas}
              weights={weights}
              onWeightsChange={handleWeightsChange}
              onIdeaUpdated={handleIdeaUpdated}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function AppWithRoutes() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
    </Routes>
  );
}
