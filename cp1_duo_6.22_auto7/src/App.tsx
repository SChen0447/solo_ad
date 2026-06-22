import { useState, useCallback } from 'react';
import CommentInput from '@/modules/commentInput/CommentInput';
import WordCloud from '@/modules/wordCloud/WordCloud';
import TrendChart from '@/modules/trendChart/TrendChart';
import { analyzeComments } from '@/modules/commentInput/analysisEngine';
import type { Comment, KeywordResult } from '@/shared/types';

const MAX_SELECTED = 5;

function App() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [keywords, setKeywords] = useState<KeywordResult[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const handleAnalyze = useCallback(() => {
    if (comments.length === 0) return;
    const result = analyzeComments(comments);
    setKeywords(result);
    setSelectedWords([]);
    setHasAnalyzed(true);
  }, [comments]);

  const handleWordSelect = useCallback((word: string) => {
    setSelectedWords(prev => {
      if (prev.includes(word)) {
        return prev.filter(w => w !== word);
      }
      if (prev.length >= MAX_SELECTED) {
        return [...prev.slice(1), word];
      }
      return [...prev, word];
    });
  }, []);

  return (
    <div style={styles.app}>
      <header style={styles.topBar}>
        <div>
          <h1 style={styles.brand}>评论分析仪表盘</h1>
          <p style={styles.subtitle}>
            从用户评论中提取高频关键词，快速发现产品优缺点与趋势
          </p>
        </div>
        <div style={styles.stats}>
          <div style={styles.stat}>
            <span style={styles.statNum}>{comments.length}</span>
            <span style={styles.statLabel}>评论</span>
          </div>
          <div style={styles.stat}>
            <span style={styles.statNum}>{keywords.length}</span>
            <span style={styles.statLabel}>关键词</span>
          </div>
          <div style={styles.stat}>
            <span style={styles.statNum}>{selectedWords.length}/{MAX_SELECTED}</span>
            <span style={styles.statLabel}>对比</span>
          </div>
        </div>
      </header>

      <main style={styles.main} data-role="app-main">
        <section style={styles.left}>
          <CommentInput
            comments={comments}
            onCommentsChange={setComments}
            onAnalyze={handleAnalyze}
            hasAnalyzed={hasAnalyzed}
          />
        </section>

        <section style={styles.center}>
          <WordCloud
            keywords={keywords}
            selectedWords={selectedWords}
            onWordSelect={handleWordSelect}
          />
        </section>

        <section style={styles.right}>
          <TrendChart
            keywords={keywords}
            selectedWords={selectedWords}
          />
        </section>
      </main>

      <footer style={styles.footer}>
        <span>基于规则引擎分析 · 本地运行无数据上传</span>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    fontFamily: "'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif",
    display: 'flex',
    flexDirection: 'column',
  },
  topBar: {
    padding: '20px 32px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #eeeeee',
    flexWrap: 'wrap',
    gap: 12,
  },
  brand: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: '#1a237e',
    letterSpacing: 0.5,
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: 12,
    color: '#9e9e9e',
    letterSpacing: 0.2,
  },
  stats: {
    display: 'flex',
    gap: 20,
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: 48,
  },
  statNum: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1a237e',
    lineHeight: 1,
  },
  statLabel: {
    fontSize: 10,
    color: '#9e9e9e',
    marginTop: 4,
  },
  main: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'minmax(280px, 1fr) minmax(360px, 1.4fr) minmax(320px, 1fr)',
    gap: 16,
    padding: 16,
    maxHeight: 'calc(100vh - 130px)',
  },
  left: {
    height: '100%',
    minHeight: 520,
  },
  center: {
    height: '100%',
    minHeight: 520,
  },
  right: {
    height: '100%',
    minHeight: 520,
  },
  footer: {
    padding: '8px 32px 12px',
    textAlign: 'center',
    fontSize: 11,
    color: '#bdbdbd',
    letterSpacing: 0.5,
  },
};

export default App;

// ============================================================
// Media query fallback (CSS-in-JS responsive)
// ============================================================
if (typeof window !== 'undefined') {
  const mq = window.matchMedia('(max-width: 767px)');
  const apply = () => {
    const main = document.querySelector('main[data-role="app-main"]');
    if (main instanceof HTMLElement) {
      if (mq.matches) {
        main.style.display = 'flex';
        main.style.flexDirection = 'column';
        main.style.maxHeight = 'none';
      } else {
        main.style.display = 'grid';
        main.style.flexDirection = 'row';
        main.style.maxHeight = 'calc(100vh - 130px)';
      }
    }
  };
  mq.addEventListener('change', apply);
  requestAnimationFrame(apply);
}
