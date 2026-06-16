import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Editor from './components/Editor';
import Reader from './components/Reader';
import { EditorAPI } from './api/EditorAPI';
import { StorySummary } from './types';

const Marketplace: React.FC = () => {
  const navigate = useNavigate();
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleStories, setVisibleStories] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    EditorAPI.getAllStories().then(data => {
      setStories(data);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const storyId = entry.target.getAttribute('data-story-id');
            if (storyId) {
              setVisibleStories(prev => new Set([...prev, storyId]));
            }
          }
        });
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, [stories]);

  const setCardRef = (el: HTMLDivElement | null, storyId: string) => {
    if (el && observerRef.current) {
      el.setAttribute('data-story-id', storyId);
      observerRef.current.observe(el);
    }
  };

  const createNewStory = () => {
    navigate('/editor');
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner} />
        <div style={styles.loadingText}>加载故事市场...</div>
      </div>
    );
  }

  return (
    <div style={styles.marketplaceContainer}>
      <header style={styles.marketplaceHeader}>
        <div>
          <h1 style={styles.marketplaceTitle}>互动故事书平台</h1>
          <p style={styles.marketplaceSubtitle}>创建和分享你的互动叙事故事</p>
        </div>
        <button onClick={createNewStory} style={styles.createButton}>
          + 创作新故事
        </button>
      </header>

      <div style={styles.storiesGrid}>
        {stories.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📖</div>
            <h3 style={styles.emptyTitle}>还没有故事</h3>
            <p style={styles.emptyText}>点击上方按钮创建你的第一个互动故事吧！</p>
          </div>
        ) : (
          stories.map((story) => (
            <motion.div
              key={story.story_id}
              ref={(el) => setCardRef(el, story.story_id)}
              initial={{ opacity: 0, y: 20 }}
              animate={visibleStories.has(story.story_id) ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4 }}
              className="story-card"
              style={{
                ...styles.storyCard,
                backgroundColor: story.cover_color || '#FFE4C4',
                backgroundImage: story.cover_image ? `url(${story.cover_image})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
              whileHover={{ y: -10, transition: { duration: 0.3 } }}
            >
              <div className="story-card-overlay" style={styles.storyCardOverlay}>
                <h3 style={styles.storyCardTitle}>{story.title}</h3>
                <p style={styles.storyCardDesc}>
                  {story.description || '暂无描述'}
                </p>
                <div style={styles.storyCardMeta}>
                  <span style={styles.pageCount}>{story.total_pages} 页</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/read/${story.story_id}`);
                  }}
                  style={styles.startReadingButton}
                >
                  开始阅读
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Marketplace />} />
      <Route path="/editor" element={<Editor />} />
      <Route path="/editor/:storyId" element={<Editor />} />
      <Route path="/read/:storyId" element={<Reader />} />
    </Routes>
  );
};

const styles: Record<string, React.CSSProperties> = {
  marketplaceContainer: {
    minHeight: '100vh',
    backgroundColor: '#FFFAF0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#333333'
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFAF0',
    gap: '16px'
  },
  loadingSpinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #DEB887',
    borderTopColor: '#E07A2F',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    fontSize: '18px',
    color: '#8B7355'
  },
  marketplaceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '40px 60px',
    backgroundColor: '#FFE4C4',
    borderBottom: '1px solid #DEB887'
  },
  marketplaceTitle: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#5D4E37',
    margin: 0,
    marginBottom: '8px'
  },
  marketplaceSubtitle: {
    fontSize: '16px',
    color: '#8B7355',
    margin: 0
  },
  createButton: {
    padding: '14px 32px',
    backgroundColor: '#E07A2F',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(224, 122, 47, 0.3)',
    transition: 'all 0.2s'
  },
  storiesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '32px',
    padding: '48px 60px'
  },
  storyCard: {
    aspectRatio: '3 / 4',
    borderRadius: '16px',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
    transition: 'box-shadow 0.3s'
  },
  storyCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '24px',
    background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    opacity: 0,
    transform: 'translateY(20px)',
    transition: 'all 0.3s ease'
  },
  storyCardTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: 'white',
    margin: 0,
    textAlign: 'center'
  },
  storyCardDesc: {
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.9)',
    margin: 0,
    lineHeight: '1.5',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  },
  storyCardMeta: {
    display: 'flex',
    justifyContent: 'center'
  },
  pageCount: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.8)',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: '4px 12px',
    borderRadius: '12px'
  },
  startReadingButton: {
    padding: '10px 24px',
    backgroundColor: '#E07A2F',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    alignSelf: 'center',
    marginTop: '8px'
  },
  emptyState: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
    gap: '16px'
  },
  emptyIcon: {
    fontSize: '64px'
  },
  emptyTitle: {
    fontSize: '24px',
    color: '#5D4E37',
    margin: 0
  },
  emptyText: {
    fontSize: '16px',
    color: '#8B7355',
    margin: 0
  }
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .story-card:hover .story-card-overlay {
    opacity: 1 !important;
    transform: translateY(0) !important;
  }
  @media (max-width: 1024px) {
    .editor-main { flex-direction: column !important; }
    .editor-sidebar { width: 100% !important; height: auto !important; border-right: none !important; border-bottom: 1px solid #DEB887 !important; }
    .editor-preview { width: 100% !important; border-left: none !important; border-top: 1px solid #DEB887 !important; }
    .page-list { display: flex !important; overflow-x: auto !important; overflow-y: hidden !important; padding: 12px !important; gap: 8px !important; }
    .page-thumbnail { min-width: 150px !important; margin-bottom: 0 !important; }
  }
  @media (max-width: 768px) {
    .marketplace-header { flex-direction: column !important; gap: 16px !important; padding: 24px !important; text-align: center !important; }
    .stories-grid { grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)) !important; padding: 24px !important; gap: 20px !important; }
    .reader-card { padding: 32px 24px !important; max-width: 100% !important; margin: 0 16px !important; }
    .reader-card h1 { font-size: 24px !important; }
    .reader-card p { font-size: 15px !important; }
  }
`;
document.head.appendChild(styleSheet);

export default App;
