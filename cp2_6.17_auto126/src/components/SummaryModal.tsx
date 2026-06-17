import React, { useEffect, useState, useRef, useCallback } from 'react';

interface Props {
  open: boolean;
  summaryText: string;
  onClose: () => void;
}

const SummaryModal: React.FC<Props> = ({ open, summaryText, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
    }
  }, [open, mounted]);

  const handleAnimationEnd = useCallback(() => {
    if (closing) {
      setMounted(false);
      setClosing(false);
    }
  }, [closing]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const handleClose = useCallback(() => {
    if (closing) return;
    onClose();
  }, [closing, onClose]);

  const handleCopy = useCallback(async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(summaryText);
      } else {
        const ta = document.createElement('textarea');
        ta.value = summaryText;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.warn('复制失败:', e);
    }
  }, [summaryText]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  if (!mounted) return null;

  const modalClass = `summary-modal${closing ? ' summary-modal--leave' : ' summary-modal--enter'}`;

  return (
    <div className="summary-modal__overlay" onClick={handleClose}>
      <div
        className={modalClass}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={handleAnimationEnd}
        role="dialog"
        aria-modal="true"
        aria-label="站会总结"
      >
        <div className="summary-modal__header">
          <h2 className="summary-modal__title">📋 站会总结</h2>
          <button
            className="summary-modal__close"
            onClick={handleClose}
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <div className="summary-modal__body">
          <pre className="summary-modal__text">{summaryText}</pre>
        </div>

        <div className="summary-modal__footer">
          <div className={`copy-toast${copied ? ' copy-toast--show' : ''}`}>
            ✓ 已复制
          </div>
          <button
            className={`btn btn--primary${copied ? ' btn--copied' : ''}`}
            onClick={handleCopy}
          >
            {copied ? '已复制到剪贴板' : '📄 一键复制'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SummaryModal;
