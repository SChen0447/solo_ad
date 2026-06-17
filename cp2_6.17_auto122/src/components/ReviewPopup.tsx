import { useState, useRef, useCallback, useEffect, RefObject } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Review, ReviewRating, PopupPosition } from '../types';

const MAX_COMMENT = 200;
const POPUP_WIDTH = 320;
const POPUP_HEIGHT_EST = 280;

interface ReviewPopupProps {
  lineNumber: number;
  existingReview?: Review;
  containerRef: RefObject<HTMLDivElement | null>;
  onSubmit: (review: Review) => void;
  onDelete: (lineNumber: number) => void;
}

const RATING_CONFIG: Array<{ value: ReviewRating; label: string; color: string }> = [
  { value: 'pass', label: '通过', color: '#28a745' },
  { value: 'fail', label: '不通过', color: '#dc3545' },
  { value: 'needs_review', label: '需修改', color: '#ffc107' },
];

const RATING_DOT_COLOR: Record<string, string> = {
  pass: '#28a745',
  fail: '#dc3545',
  needs_review: '#ffc107',
};

function ReviewPopup({ lineNumber, existingReview, containerRef, onSubmit, onDelete }: ReviewPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [comment, setComment] = useState(existingReview?.comment ?? '');
  const [rating, setRating] = useState<ReviewRating | null>(existingReview?.rating ?? null);
  const [position, setPosition] = useState<PopupPosition>('right');
  const [posStyle, setPosStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !containerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const spaceRight = viewportW - triggerRect.right;
    const spaceLeft = triggerRect.left;
    const spaceBelow = viewportH - triggerRect.bottom;
    const spaceAbove = triggerRect.top;

    let pos: PopupPosition = 'right';
    let style: React.CSSProperties = {};

    if (spaceRight >= POPUP_WIDTH) {
      pos = 'right';
      style = {
        left: triggerRect.right - containerRect.left + 4,
        top: triggerRect.top - containerRect.top,
      };
    } else if (spaceLeft >= POPUP_WIDTH) {
      pos = 'left';
      style = {
        right: containerRect.right - triggerRect.left + 4,
        top: triggerRect.top - containerRect.top,
      };
    } else if (spaceBelow >= POPUP_HEIGHT_EST) {
      pos = 'bottom';
      style = {
        left: Math.max(0, triggerRect.left - containerRect.left),
        top: triggerRect.bottom - containerRect.top + 4,
      };
    } else if (spaceAbove >= POPUP_HEIGHT_EST) {
      pos = 'top';
      style = {
        left: Math.max(0, triggerRect.left - containerRect.left),
        bottom: containerRect.bottom - triggerRect.top + 4,
      };
    } else {
      pos = spaceBelow >= spaceAbove ? 'bottom' : 'top';
      style = {
        left: Math.max(0, triggerRect.left - containerRect.left),
        top: pos === 'bottom' ? triggerRect.bottom - containerRect.top + 4 : undefined,
        bottom: pos === 'top' ? containerRect.bottom - triggerRect.top + 4 : undefined,
      };
    }

    setPosition(pos);
    setPosStyle(style);
  }, [containerRef]);

  const handleOpen = useCallback(() => {
    if (isOpen) return;
    if (existingReview) {
      setComment(existingReview.comment);
      setRating(existingReview.rating);
    }
    setIsOpen(true);
    setIsClosing(false);
    calculatePosition();
  }, [isOpen, existingReview, calculatePosition]);

  const handleClose = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsClosing(true);
    closeTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setComment('');
      setRating(null);
      closeTimeoutRef.current = null;
    }, 200);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!rating) return;
    const review: Review = {
      id: existingReview?.id ?? uuidv4(),
      lineNumber,
      rating,
      comment: comment.trim(),
      timestamp: Date.now(),
    };
    onSubmit(review);
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsClosing(true);
    closeTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setComment('');
      setRating(null);
      closeTimeoutRef.current = null;
    }, 200);
  }, [rating, comment, lineNumber, existingReview, onSubmit]);

  const handleDelete = useCallback(() => {
    onDelete(lineNumber);
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsClosing(true);
    closeTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setComment('');
      setRating(null);
      closeTimeoutRef.current = null;
    }, 200);
  }, [lineNumber, onDelete]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, handleClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleResize = () => calculatePosition();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, calculatePosition]);

  const charCount = comment.length;
  const isOverLimit = charCount > MAX_COMMENT;
  const isNearLimit = charCount >= MAX_COMMENT * 0.8 && charCount > 0 && !isOverLimit;
  let countColor = '#6c757d';
  if (isNearLimit) countColor = '#ffc107';
  if (isOverLimit) countColor = '#dc3545';

  return (
    <>
      <div
        className="review-trigger"
        ref={triggerRef}
        onClick={handleOpen}
      >
        {existingReview && (
          <span
            className="review-dot"
            style={{ backgroundColor: RATING_DOT_COLOR[existingReview.rating] }}
          />
        )}
        {!existingReview && <span className="review-dot-placeholder" />}
      </div>

      {isOpen && (
        <div
          ref={popupRef}
          className={`review-popup popup-${position} ${isClosing ? 'popup-closing' : 'popup-opening'}`}
          style={posStyle}
        >
          <div className="popup-header">
            <span>第{lineNumber}行评审</span>
            <button className="popup-close" onClick={handleClose}>×</button>
          </div>
          <textarea
            className="popup-textarea"
            value={comment}
            onChange={e => {
              const val = e.target.value;
              if (val.length <= MAX_COMMENT) setComment(val);
            }}
            placeholder="输入评审意见..."
            maxLength={MAX_COMMENT}
          />
          <div className="char-counter" style={{ color: countColor }}>
            {charCount}/{MAX_COMMENT}
          </div>
          <div className="popup-ratings">
            {RATING_CONFIG.map(cfg => (
              <button
                key={cfg.value}
                className={`rating-btn ${rating === cfg.value ? 'rating-active' : ''}`}
                style={{
                  borderColor: cfg.color,
                  color: rating === cfg.value ? '#fff' : cfg.color,
                  backgroundColor: rating === cfg.value ? cfg.color : 'transparent',
                }}
                onClick={() => setRating(cfg.value)}
              >
                {cfg.label}
              </button>
            ))}
          </div>
          <div className="popup-actions">
            {existingReview && (
              <button className="btn-delete-review" onClick={handleDelete}>
                删除评审
              </button>
            )}
            <button
              className="btn-submit-review"
              onClick={handleSubmit}
              disabled={!rating}
            >
              提交
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default ReviewPopup;
