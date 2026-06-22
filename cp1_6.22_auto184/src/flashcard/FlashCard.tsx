import { useState, useRef, useEffect } from 'react';
import type { Note } from '../types';
import { LANGUAGE_LABELS } from '../types';
import './FlashCard.css';

interface Props {
  dueNotes: Note[];
  onReview: (noteId: string, known: boolean) => void;
}

function formatNextDate(intervalDays: number): string {
  const d = new Date(Date.now() + intervalDays * 86400000);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function FlashCard({ dueNotes, onReview }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [slideOut, setSlideOut] = useState(false);
  const [toast, setToast] = useState<{ type: 'known' | 'unknown'; message: string } | null>(null);
  const slideTimer = useRef<number | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [dueNotes.length]);

  useEffect(() => {
    return () => {
      if (slideTimer.current) window.clearTimeout(slideTimer.current);
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const currentNote = dueNotes[currentIndex];

  const handleFlip = () => {
    if (slideOut) return;
    setIsFlipped(f => !f);
  };

  const handleAnswer = (known: boolean) => {
    if (!currentNote || slideOut) return;
    const nextInterval = known
      ? (currentNote.reviewCount === 0 ? 3 : currentNote.reviewCount === 1 ? 7 : currentNote.reviewCount === 2 ? 14 : currentNote.intervalDays * 2)
      : 1;
    const message = known
      ? `认识！下次复习：${formatNextDate(nextInterval)}`
      : `需巩固，明天再复习（${formatNextDate(1)}）`;
    setToast({ type: known ? 'known' : 'unknown', message });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2300);

    setSlideOut(true);
    const noteId = currentNote.id;
    slideTimer.current = window.setTimeout(() => {
      onReview(noteId, known);
      setSlideOut(false);
      setIsFlipped(false);
      if (currentIndex + 1 >= dueNotes.length) {
        setCurrentIndex(0);
      } else {
        setCurrentIndex(i => i + 1);
      }
    }, 400);
  };

  if (dueNotes.length === 0) {
    return (
      <div className="flashcard-page">
        <div className="flashcard-empty">
          <div className="flashcard-empty-icon">🎉</div>
          <div className="flashcard-empty-title">今日复习完成！</div>
          <div className="flashcard-empty-desc">
            所有待复习的词汇都已经过了一遍，明天继续加油！也可以去笔记页面添加更多生词。
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flashcard-page">
      {toast && (
        <div className={`flashcard-toast ${toast.type === 'known' ? 'flashcard-toast-known' : 'flashcard-toast-unknown'}`}>
          {toast.message}
        </div>
      )}
      <div className="flashcard-progress">
        {currentIndex + 1} / {dueNotes.length} 张待复习
      </div>
      <div className={`flashcard-container ${slideOut ? 'slide-out' : ''}`} key={currentNote.id + (slideOut ? '-out' : '')}>
        <div
          className={`flashcard ${isFlipped ? 'flipped' : ''}`}
          onClick={handleFlip}
          role="button"
          aria-label="点击翻转卡片"
        >
          <div className="flashcard-face flashcard-front">
            <span className="flashcard-lang-tag">{LANGUAGE_LABELS[currentNote.language]}</span>
            <div className="flashcard-word">{currentNote.word}</div>
            <div className="flashcard-hint">点击卡片查看释义</div>
          </div>
          <div className="flashcard-face flashcard-back">
            <div className="flashcard-meaning">{currentNote.meaning}</div>
            {currentNote.example1 && <div className="flashcard-example">• {currentNote.example1}</div>}
            {currentNote.example2 && <div className="flashcard-example">• {currentNote.example2}</div>}
            <div className="flashcard-hint" style={{ marginTop: 'auto' }}>点击卡片翻回</div>
          </div>
        </div>
      </div>
      <div className="flashcard-actions">
        <button className="flashcard-btn flashcard-btn-unknown" onClick={() => handleAnswer(false)}>
          不认识
        </button>
        <button className="flashcard-btn flashcard-btn-known" onClick={() => handleAnswer(true)}>
          认识
        </button>
      </div>
    </div>
  );
}
