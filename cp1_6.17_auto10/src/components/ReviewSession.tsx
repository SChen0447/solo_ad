import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Deck, Card, ReviewHistory } from '../types';
import { getDueCards, calculateSM2 } from '../utils/sm2';
import { simpleMarkdown } from '../App';

interface Props {
  decks: Deck[];
  onUpdateCard: (deckId: string, cardId: string, updater: (c: Card) => Card) => void;
  onAddReviewRecord: (record: ReviewHistory) => void;
  onNavigateBack: () => void;
}

type Quality = 0 | 3 | 5;

const QUALITY_LABELS: Record<Quality, { label: string; sub: string }> = {
  0: { label: '困难', sub: '重新学习' },
  3: { label: '一般', sub: '勉强记住' },
  5: { label: '容易', sub: '轻松回忆' },
};

export default function ReviewSession({
  decks,
  onUpdateCard,
  onAddReviewRecord,
  onNavigateBack,
}: Props) {
  const { deckId } = useParams<{ deckId: string }>();

  const deck = useMemo(() => decks.find((d) => d.id === deckId) || null, [decks, deckId]);

  const initialQueue = useMemo(() => {
    if (!deck) return [] as Card[];
    return getDueCards(deck.cards);
  }, [deck]);

  const [queue, setQueue] = useState<Card[]>(initialQueue);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionReviewed, setSessionReviewed] = useState(0);
  const [sessionMastered, setSessionMastered] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    setQueue(initialQueue);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [initialQueue]);

  const currentCard: Card | null = queue[currentIndex] || null;
  const totalDue = queue.length;
  const progressPct = totalDue > 0 ? (sessionReviewed / totalDue) * 100 : 0;

  const handleFlip = useCallback(() => {
    if (animating || !currentCard) return;
    setIsFlipped((v) => !v);
  }, [animating, currentCard]);

  const handleRate = useCallback(
    (quality: Quality) => {
      if (!currentCard || !deck || animating) return;
      setAnimating(true);

      const previousInterval = currentCard.interval;
      const result = calculateSM2(currentCard, quality);

      onUpdateCard(deck.id, currentCard.id, (c) => ({
        ...c,
        easinessFactor: result.easinessFactor,
        interval: result.interval,
        repetitions: result.repetitions,
        nextReviewDate: result.nextReviewDate,
        lastReviewedAt: Date.now(),
      }));

      const record: ReviewHistory = {
        cardId: currentCard.id,
        deckId: deck.id,
        reviewedAt: Date.now(),
        quality,
        previousInterval,
        newInterval: result.interval,
      };
      onAddReviewRecord(record);

      const nextReviewed = sessionReviewed + 1;
      setSessionReviewed(nextReviewed);
      if (result.interval >= 21) {
        setSessionMastered((v) => v + 1);
      }

      if (quality < 3) {
        setQueue((prev) => {
          const copy = [...prev];
          const current = copy[currentIndex];
          if (current) {
            copy.splice(currentIndex, 1);
            const insertAt = Math.min(currentIndex + 3, copy.length);
            copy.splice(insertAt, 0, {
              ...current,
              ...result,
              lastReviewedAt: Date.now(),
            });
          }
          return copy;
        });
      } else {
        setCurrentIndex((idx) => idx + 1);
      }

      setTimeout(() => {
        setIsFlipped(false);
        setAnimating(false);
      }, 200);
    },
    [currentCard, deck, animating, currentIndex, sessionReviewed, onUpdateCard, onAddReviewRecord]
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!currentCard) return;
      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (isFlipped) {
        if (e.key === '1' || e.key.toLowerCase() === 'h') handleRate(0);
        else if (e.key === '2' || e.key.toLowerCase() === 'g') handleRate(3);
        else if (e.key === '3' || e.key.toLowerCase() === 'e') handleRate(5);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentCard, isFlipped, handleFlip, handleRate]);

  if (!deck) {
    return (
      <div className="empty-state">
        <div className="empty-icon">❓</div>
        <div className="empty-title">牌组不存在</div>
        <div className="empty-desc">该牌组可能已被删除</div>
        <button className="btn btn-primary" onClick={onNavigateBack}>
          返回首页
        </button>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="review-container">
        <div className="review-header">
          <button className="btn btn-outline btn-sm" onClick={onNavigateBack}>
            ← 返回牌组
          </button>
        </div>

        <div className="empty-state" style={{ padding: '80px 24px' }}>
          <div className="empty-icon">🎉</div>
          <div className="empty-title">复习完成！</div>
          <div className="empty-desc">
            本次会话共复习 <strong style={{ color: 'var(--color-accent)' }}>{sessionReviewed}</strong> 张卡片，
            其中 <strong style={{ color: 'var(--color-success)' }}>{sessionMastered}</strong> 张达到掌握程度
          </div>

          <div className="dashboard-grid" style={{ marginTop: 40, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <div className="stat-card-header" style={{ justifyContent: 'center' }}>
                <span className="stat-icon blue">✅</span>
              </div>
              <div className="stat-value" style={{ marginBottom: 4 }}>{sessionReviewed}</div>
              <div className="stat-label">已复习</div>
            </div>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <div className="stat-card-header" style={{ justifyContent: 'center' }}>
                <span className="stat-icon green">🎯</span>
              </div>
              <div className="stat-value" style={{ marginBottom: 4 }}>{sessionMastered}</div>
              <div className="stat-label">新掌握</div>
            </div>
          </div>

          <div style={{ marginTop: 32, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={onNavigateBack}>
              返回牌组
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setQueue(getDueCards(decks.find(d => d.id === deckId)?.cards || []));
                setCurrentIndex(0);
                setIsFlipped(false);
                setSessionReviewed(0);
                setSessionMastered(0);
              }}
            >
              🔄 再来一轮
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="review-container">
      <div className="review-header">
        <button className="btn btn-outline btn-sm" onClick={onNavigateBack}>
          ← 返回
        </button>
        <div className="review-progress-info">
          <span className="review-counter">
            {Math.min(sessionReviewed + 1, totalDue)} / {totalDue}
          </span>
          <div className="review-progress-bar">
            <div
              className="review-progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flashcard-wrapper">
        <div
          className={`flashcard ${isFlipped ? 'flipped' : ''}`}
          onClick={handleFlip}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleFlip();
            }
          }}
        >
          <div className="flashcard-face flashcard-front">
            <div className="flashcard-label">❓ 问题</div>
            <div
              className="flashcard-content markdown-preview"
              style={{ background: 'transparent', border: 'none', padding: 0 }}
              dangerouslySetInnerHTML={{ __html: simpleMarkdown(currentCard.front) }}
            />
            <div className="flashcard-hint">
              💡 点击卡片查看答案（空格键）
            </div>
          </div>
          <div className="flashcard-face flashcard-back">
            <div className="flashcard-label">✅ 答案</div>
            <div
              className="flashcard-content markdown-preview"
              style={{ background: 'transparent', border: 'none', padding: 0 }}
              dangerouslySetInnerHTML={{ __html: simpleMarkdown(currentCard.back) }}
            />
            <div className="flashcard-hint">
              🎯 选择下方难度等级（H/G/E 键或 1/2/3）
            </div>
          </div>
        </div>
      </div>

      <div className="rating-buttons" style={{ pointerEvents: isFlipped && !animating ? 'auto' : 'none' }}>
        <button
          className="rating-btn rating-hard"
          onClick={(e) => {
            e.stopPropagation();
            handleRate(0);
          }}
          disabled={!isFlipped || animating}
          tabIndex={isFlipped ? 0 : -1}
        >
          <span>😓 {QUALITY_LABELS[0].label}</span>
          <span className="rating-sub">{QUALITY_LABELS[0].sub}</span>
        </button>
        <button
          className="rating-btn rating-good"
          onClick={(e) => {
            e.stopPropagation();
            handleRate(3);
          }}
          disabled={!isFlipped || animating}
          tabIndex={isFlipped ? 0 : -1}
        >
          <span>🤔 {QUALITY_LABELS[3].label}</span>
          <span className="rating-sub">{QUALITY_LABELS[3].sub}</span>
        </button>
        <button
          className="rating-btn rating-easy"
          onClick={(e) => {
            e.stopPropagation();
            handleRate(5);
          }}
          disabled={!isFlipped || animating}
          tabIndex={isFlipped ? 0 : -1}
        >
          <span>😄 {QUALITY_LABELS[5].label}</span>
          <span className="rating-sub">{QUALITY_LABELS[5].sub}</span>
        </button>
      </div>

      <div style={{ marginTop: 40, textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          gap: 24,
          padding: '12px 24px',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-pill)',
          boxShadow: 'var(--shadow-sm)',
          fontSize: 13,
          color: 'var(--color-text-secondary)',
        }}>
          <span>牌组: <strong style={{ color: 'var(--color-primary)' }}>{deck.name}</strong></span>
          <span>间隔: {currentCard.interval}天</span>
          <span>难度: {currentCard.easinessFactor.toFixed(2)}</span>
          <span>已复习: {sessionReviewed}</span>
        </div>
      </div>
    </div>
  );
}
