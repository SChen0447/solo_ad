import { useState, useRef, useEffect, useCallback } from 'react';
import { NewsItem } from './types';
import './styles/ArticleDetail.css';

interface ArticleDetailProps {
  article: NewsItem;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

function ArticleDetail({ article, onClose, isFavorite, onToggleFavorite }: ArticleDetailProps) {
  const summaryRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const paragraphRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  const paragraphs = article.content.split('\n\n');
  const summarySentences = article.summary.split('。').filter(s => s.trim());

  const scrollToParagraph = useCallback((index: number) => {
    const targetIndex = article.highlights[index] || 0;
    const targetElement = paragraphRefs.current[targetIndex];
    if (targetElement && contentRef.current) {
      const container = contentRef.current;
      const elementTop = targetElement.offsetTop - container.offsetTop;
      container.scrollTo({
        top: elementTop - 20,
        behavior: 'smooth'
      });
    }
  }, [article.highlights]);

  const handleSummaryScroll = useCallback(() => {
    if (!isSyncing && summaryRef.current && contentRef.current) {
      setIsSyncing(true);
      const summaryEl = summaryRef.current;
      const contentEl = contentRef.current;
      const scrollRatio = summaryEl.scrollTop / (summaryEl.scrollHeight - summaryEl.clientHeight);
      const targetScroll = scrollRatio * (contentEl.scrollHeight - contentEl.clientHeight);
      contentEl.scrollTop = targetScroll;
      requestAnimationFrame(() => setIsSyncing(false));
    }
  }, [isSyncing]);

  const handleContentScroll = useCallback(() => {
    if (!isSyncing && summaryRef.current && contentRef.current) {
      setIsSyncing(true);
      const summaryEl = summaryRef.current;
      const contentEl = contentRef.current;
      const scrollRatio = contentEl.scrollTop / (contentEl.scrollHeight - contentEl.clientHeight);
      const targetScroll = scrollRatio * (summaryEl.scrollHeight - summaryEl.clientHeight);
      summaryEl.scrollTop = targetScroll;
      requestAnimationFrame(() => setIsSyncing(false));
    }
  }, [isSyncing]);

  useEffect(() => {
    paragraphRefs.current = paragraphRefs.current.slice(0, paragraphs.length);
  }, [paragraphs.length]);

  return (
    <div className="article-detail">
      <div className="detail-header">
        <button className="back-btn" onClick={onClose}>
          ← 返回列表
        </button>
        <div className="detail-header-actions">
          <span className="ai-badge">
            <span className="ai-icon">✨</span>
            {article.ai_tag}
          </span>
          <button
            className={`favorite-btn-large ${isFavorite ? 'favorited' : ''}`}
            onClick={onToggleFavorite}
          >
            {isFavorite ? '⭐ 已收藏' : '☆ 收藏'}
          </button>
        </div>
      </div>

      <h1 className="article-title">{article.title}</h1>
      
      <div className="article-meta">
        <span className="meta-category">{article.category}</span>
        <span className="meta-divider">·</span>
        <span className="meta-read-time">约 5 分钟阅读</span>
      </div>

      <div className="comparison-container">
        <div 
          className="summary-panel"
          ref={summaryRef}
          onScroll={handleSummaryScroll}
        >
          <div className="panel-header">
            <span className="panel-icon">🤖</span>
            <h2>AI 摘要</h2>
          </div>
          <div className="summary-content">
            {summarySentences.map((sentence, index) => (
              <p
                key={index}
                className={`summary-sentence ${index < article.highlights.length ? 'highlighted' : ''}`}
                onClick={() => index < article.highlights.length && scrollToParagraph(index)}
              >
                {sentence.trim()}。
              </p>
            ))}
          </div>
          <div className="summary-tip">
            💡 点击高亮句子可跳转至原文对应段落
          </div>
        </div>

        <div className="divider-line" />

        <div 
          className="content-panel"
          ref={contentRef}
          onScroll={handleContentScroll}
        >
          <div className="panel-header">
            <span className="panel-icon">📄</span>
            <h2>原文全文</h2>
          </div>
          <div className="article-content">
            {paragraphs.map((para, index) => (
              <p
                key={index}
                ref={el => paragraphRefs.current[index] = el}
                className={`content-paragraph ${article.highlights.includes(index) ? 'highlighted-paragraph' : ''}`}
              >
                {para}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArticleDetail;
