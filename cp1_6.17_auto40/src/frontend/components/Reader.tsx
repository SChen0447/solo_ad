import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { EditorAPI } from '../api/EditorAPI';
import { StoryPage } from '../types';

const Reader: React.FC = () => {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();
  const [pages, setPages] = useState<StoryPage[]>([]);
  const [storyTitle, setStoryTitle] = useState('');
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [visitedPages, setVisitedPages] = useState<Set<number>>(new Set([0]));
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [loading, setLoading] = useState(true);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (storyId) {
      EditorAPI.getStory(storyId).then(story => {
        setStoryTitle(story.title);
        setPages(story.pages);
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    }
  }, [storyId]);

  const currentPage = pages[currentPageIndex];
  const totalPages = pages.length;
  const progress = totalPages > 0 ? (visitedPages.size / totalPages) * 100 : 0;

  useEffect(() => {
    if (currentPage?.musicUrl && audioElement) {
      audioElement.pause();
    }
    if (currentPage?.musicUrl) {
      const audio = new Audio(currentPage.musicUrl);
      audio.loop = true;
      audio.volume = 0.3;
      audio.play().catch(() => {});
      setAudioElement(audio);
    }
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, [currentPageIndex, currentPage?.musicUrl]);

  const handleOptionClick = useCallback((targetIndex: number) => {
    if (targetIndex >= 0 && targetIndex < pages.length) {
      setSlideDirection(targetIndex > currentPageIndex ? 'left' : 'right');
      setCurrentPageIndex(targetIndex);
      setVisitedPages(prev => new Set([...prev, targetIndex]));
    }
  }, [currentPageIndex, pages.length]);

  const pageVariants = {
    initial: (direction: 'left' | 'right') => ({
      x: direction === 'left' ? 300 : -300,
      opacity: 0
    }),
    animate: {
      x: 0,
      opacity: 1
    },
    exit: (direction: 'left' | 'right') => ({
      x: direction === 'left' ? -300 : 300,
      opacity: 0
    })
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingText}>加载中...</div>
      </div>
    );
  }

  if (!currentPage) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingText}>故事不存在或为空</div>
        <button onClick={() => navigate('/')} style={styles.backHomeButton}>
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        ...styles.container,
        backgroundColor: currentPage.backgroundColor || '#FFFAF0',
        backgroundImage: currentPage.backgroundImage ? `url(${currentPage.backgroundImage})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div style={styles.header}>
        <button onClick={() => navigate('/')} style={styles.closeButton}>
          × 退出阅读
        </button>
        <div style={styles.storyTitle}>{storyTitle}</div>
        <div style={styles.pageIndicator}>
          第 {currentPageIndex + 1} / {totalPages} 页
        </div>
      </div>

      <div style={styles.contentWrapper}>
        <AnimatePresence mode="wait" custom={slideDirection}>
          <motion.div
            key={currentPageIndex}
            custom={slideDirection}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            style={styles.card}
          >
            <h1 style={styles.cardTitle}>{currentPage.title}</h1>
            <div style={styles.cardContent}>
              {currentPage.content.split('\n').map((paragraph, idx) => (
                <p key={idx} style={styles.paragraph}>{paragraph}</p>
              ))}
            </div>
            <div style={styles.optionsContainer}>
              {currentPage.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleOptionClick(option.targetPageIndex)}
                  style={styles.optionButton}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.transform = 'scale(1.05)';
                    (e.target as HTMLButtonElement).style.backgroundColor = '#D2691E';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.transform = 'scale(1)';
                    (e.target as HTMLButtonElement).style.backgroundColor = '#E07A2F';
                  }}
                >
                  {option.text}
                </button>
              ))}
              {currentPage.options.length === 0 && (
                <div style={styles.endingText}>— 故事结束 —</div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={styles.progressBarContainer}>
        <div style={styles.progressBarBackground}>
          <motion.div
            style={styles.progressBarFill}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div style={styles.progressText}>
          已阅读 {visitedPages.size} / {totalPages} 页 ({Math.round(progress)}%)
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#333333',
    transition: 'background-color 0.5s ease-in-out'
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFAF0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    gap: '24px'
  },
  loadingText: {
    fontSize: '24px',
    color: '#8B7355',
    fontWeight: '500'
  },
  backHomeButton: {
    padding: '12px 32px',
    backgroundColor: '#E07A2F',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 32px',
    backgroundColor: 'rgba(255, 250, 240, 0.9)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(222, 184, 135, 0.5)'
  },
  closeButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#8B7355',
    border: '1px solid #DEB887',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  storyTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#5D4E37'
  },
  pageIndicator: {
    fontSize: '14px',
    color: '#8B7355',
    fontWeight: '500'
  },
  contentWrapper: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    minHeight: 'calc(100vh - 180px)',
    overflow: 'hidden'
  },
  card: {
    width: '100%',
    maxWidth: '600px',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: '48px',
    borderRadius: '16px',
    boxShadow: 'inset 0 2px 12px rgba(0, 0, 0, 0.08), 0 8px 32px rgba(0, 0, 0, 0.12)',
    position: 'relative'
  },
  cardTitle: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: '32px',
    textAlign: 'center',
    lineHeight: '1.3'
  },
  cardContent: {
    marginBottom: '40px'
  },
  paragraph: {
    fontSize: '17px',
    lineHeight: '2',
    color: '#444444',
    marginBottom: '16px',
    textAlign: 'justify',
    textIndent: '2em'
  },
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  optionButton: {
    padding: '16px 28px',
    backgroundColor: '#E07A2F',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(224, 122, 47, 0.3)'
  },
  endingText: {
    textAlign: 'center',
    fontSize: '18px',
    color: '#8B7355',
    fontStyle: 'italic',
    padding: '24px 0'
  },
  progressBarContainer: {
    padding: '16px 32px 24px',
    backgroundColor: 'rgba(255, 250, 240, 0.9)',
    backdropFilter: 'blur(10px)',
    borderTop: '1px solid rgba(222, 184, 135, 0.5)'
  },
  progressBarBackground: {
    height: '6px',
    backgroundColor: '#DEB887',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '8px'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#E07A2F',
    borderRadius: '3px'
  },
  progressText: {
    fontSize: '12px',
    color: '#8B7355',
    textAlign: 'center'
  }
};

export default Reader;
