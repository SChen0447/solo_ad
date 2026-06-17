import React, { useEffect, useState, useRef } from 'react';

interface Props {
  open: boolean;
  summaryText: string;
  onClose: () => void;
}

const SummaryModal: React.FC<Props> = ({ open, summaryText, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState<'in' | 'out' | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setAnimating('in');
      const t = window.setTimeout(() => setAnimating(null), 320);
      return () => window.clearTimeout(t);
    } else if (visible) {
      setAnimating('out');
      const t = window.setTimeout(() => {
        setVisible(false);
        setAnimating(null);
      }, 260);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleCopy = async () => {
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
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.warn('复制失败:', e);
    }
  };

  if (!visible) return null;

  const modalClass = `summary-modal${
    animating === 'in' ? ' summary-modal--enter' : ''
  }${animating === 'out' ? ' summary-modal--leave' : ''}`;

  return (
    <div className="summary-modal__overlay" onClick={onClose}>
      <div
        className={modalClass}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="站会总结"
      >
        <div className="summary-modal__header">
          <h2 className="summary-modal__title">📋 站会总结</h2>
          <button
            className="summary-modal__close"
            onClick={onClose}
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
