import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import WorldBuilder from './worldBuilder';
import StoryFork from './storyFork';
import { useState, useEffect } from 'react';
import axios from 'axios';

interface World {
  id: number;
  name: string;
  description: string;
  characters: any[];
  chapters: any[];
}

const CARD_COLORS = ['#FEF3C7', '#FCE7F3', '#DBEAFE', '#D1FAE5'];

function App() {
  const navigate = useNavigate();
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorlds();
  }, []);

  const loadWorlds = async () => {
    try {
      const res = await axios.get('/api/worlds');
      setWorlds(res.data);
    } catch (e) {
      console.error('加载世界观失败', e);
    }
    setLoading(false);
  };

  const getCardColor = (index: number) => {
    const colorCounts: Record<string, number> = {};
    for (let i = 0; i < index; i++) {
      const c = CARD_COLORS[i % CARD_COLORS.length];
      colorCounts[c] = (colorCounts[c] || 0) + 1;
    }
    for (let i = 0; i < CARD_COLORS.length; i++) {
      const c = CARD_COLORS[(index + i) % CARD_COLORS.length];
      if ((colorCounts[c] || 0) < 3) {
        return c;
      }
    }
    return CARD_COLORS[index % CARD_COLORS.length];
  };

  return (
    <div className="app">
      <nav className="navbar">
        <h1 className="nav-title" onClick={() => navigate('/')}>📖 同人小说接龙</h1>
        <div className="nav-links">
          <Link to="/" className="nav-link">首页</Link>
          <Link to="/world-builder" className="nav-link">世界观管理</Link>
          <Link to="/story" className="nav-link">接龙写作</Link>
        </div>
      </nav>

      <AnimatePresence mode="wait">
        <Routes>
          <Route
            path="/"
            element={
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="home-page"
              >
                <div className="home-header">
                  <h2>探索世界观</h2>
                  <p>选择一个世界观，开始你的接龙之旅</p>
                  <button className="btn-primary" onClick={() => navigate('/world-builder')}>
                    + 创建新世界观
                  </button>
                </div>

                {loading ? (
                  <div className="loading">加载中...</div>
                ) : worlds.length === 0 ? (
                  <div className="empty-state">
                    <p>还没有世界观，快去创建一个吧！</p>
                  </div>
                ) : (
                  <div className="world-grid">
                    {worlds.map((world, index) => (
                      <motion.div
                        key={world.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.05, ease: 'easeOut' }}
                        className="world-card"
                        style={{ backgroundColor: getCardColor(index) }}
                        onClick={() => navigate(`/story/${world.id}`)}
                        whileHover={{ scale: 1.05, boxShadow: '0px 8px 24px rgba(99,102,241,0.15)' }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <h3 className="world-card-name">{world.name}</h3>
                        <p className="world-card-desc">
                          {world.description.length > 60 ? world.description.slice(0, 60) + '...' : world.description}
                        </p>
                        <div className="world-card-badges">
                          <span className="badge badge-left">{world.chapters.length}章</span>
                          <span className="badge badge-right">{world.characters.length}人</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            }
          />
          <Route path="/world-builder" element={<WorldBuilder onWorldCreated={loadWorlds} />} />
          <Route path="/story" element={
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="story-page"
            >
              <div className="empty-state">
                <p>请从首页选择一个世界观开始接龙</p>
                <button className="btn-primary" onClick={() => navigate('/')}>返回首页</button>
              </div>
            </motion.div>
          } />
          <Route path="/story/:worldId" element={<StoryFork />} />
        </Routes>
      </AnimatePresence>
    </div>
  );
}

export default App;
