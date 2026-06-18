import { useEffect, useRef, useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import hljs from 'highlight.js/lib/core';
import css from 'highlight.js/lib/languages/css';
import 'highlight.js/styles/monokai.css';
import { useGradientStore } from '@/store/gradientStore';
import { generateFullCSS } from '@/utils/cssGenerator';
import styles from './ExportModal.module.css';

hljs.registerLanguage('css', css);

export default function ExportModal() {
  const open = useGradientStore((s) => s.exportModalOpen);
  const setOpen = useGradientStore((s) => s.setExportModalOpen);
  const currentScheme = useGradientStore((s) => s.currentScheme);
  const animationParams = useGradientStore((s) => s.animationParams);
  const isPlaying = useGradientStore((s) => s.isPlaying);

  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  const cssCode = generateFullCSS(
    currentScheme.colorStops,
    currentScheme.gradientType,
    currentScheme.angle,
    animationParams,
    isPlaying
  );

  useEffect(() => {
    if (open && codeRef.current) {
      hljs.highlightElement(codeRef.current);
    }
  }, [open, cssCode]);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cssCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = cssCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 500);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setOpen(false);
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>导出 CSS 代码</h3>
          <button
            className={styles.closeBtn}
            onClick={() => setOpen(false)}
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </div>
        <div className={styles.codeArea}>
          <pre>
            <code ref={codeRef} className="language-css">
              {`.gradient-element {
  ${cssCode}
}`}
            </code>
          </pre>
        </div>
        <div className={styles.footer}>
          <span className={styles.info}>
            当前方案：{currentScheme.name} · {currentScheme.colorStops.length} 个颜色停止点
          </span>
          <button
            className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
            onClick={handleCopy}
          >
            {copied ? (
              <span className={styles.check}>
                <Check size={16} /> 已复制
              </span>
            ) : (
              <>
                <Copy size={16} /> 复制代码
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
