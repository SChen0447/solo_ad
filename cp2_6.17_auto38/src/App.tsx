import { useState, useCallback, useRef, useEffect } from 'react';
import SideBySideView from '@/components/SideBySideView';
import { compare, getMergedCode, type DiffResult } from '@/utils/diffEngine';
import type { SupportedLanguage } from '@/utils/highlighter';

const LANGUAGES: { value: SupportedLanguage; label: string }[] = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
];

function useDebounce<T extends (...args: never[]) => void>(
  fn: T,
  delay: number
): T {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const fnRef = useRef(fn);
  fnRef.current = fn;

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fnRef.current(...args), delay);
    }) as T,
    [delay]
  );
}

export default function App() {
  const [leftCode, setLeftCode] = useState('');
  const [rightCode, setRightCode] = useState('');
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [language, setLanguage] = useState<SupportedLanguage>('javascript');
  const [copyToast, setCopyToast] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const runCompare = useCallback(
    (left: string, right: string) => {
      if (left.trim() && right.trim()) {
        const result = compare(left, right);
        setDiffResult(result);
      } else {
        setDiffResult(null);
      }
    },
    []
  );

  const debouncedCompare = useDebounce(runCompare, 300);

  const handleLeftChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setLeftCode(val);
      debouncedCompare(val, rightCode);
    },
    [rightCode, debouncedCompare]
  );

  const handleRightChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setRightCode(val);
      debouncedCompare(leftCode, val);
    },
    [leftCode, debouncedCompare]
  );

  const leftTextareaRef = useRef<HTMLTextAreaElement>(null);
  const rightTextareaRef = useRef<HTMLTextAreaElement>(null);
  const isSyncingScroll = useRef(false);

  const handleLeftScroll = useCallback(
    (e: React.UIEvent<HTMLTextAreaElement>) => {
      if (isSyncingScroll.current) return;
      isSyncingScroll.current = true;
      if (rightTextareaRef.current) {
        rightTextareaRef.current.scrollTop = e.currentTarget.scrollTop;
      }
      requestAnimationFrame(() => {
        isSyncingScroll.current = false;
      });
    },
    []
  );

  const handleRightScroll = useCallback(
    (e: React.UIEvent<HTMLTextAreaElement>) => {
      if (isSyncingScroll.current) return;
      isSyncingScroll.current = true;
      if (leftTextareaRef.current) {
        leftTextareaRef.current.scrollTop = e.currentTarget.scrollTop;
      }
      requestAnimationFrame(() => {
        isSyncingScroll.current = false;
      });
    },
    []
  );

  const showCopyToast = useCallback(() => {
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 1500);
  }, []);

  const copyToClipboard = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text).then(showCopyToast).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showCopyToast();
      });
    },
    [showCopyToast]
  );

  const handleCopyLeft = useCallback(() => {
    copyToClipboard(leftCode);
  }, [leftCode, copyToClipboard]);

  const handleCopyRight = useCallback(() => {
    copyToClipboard(rightCode);
  }, [rightCode, copyToClipboard]);

  const handleCopyMerged = useCallback(() => {
    const merged = getMergedCode(leftCode, rightCode);
    copyToClipboard(merged);
  }, [leftCode, rightCode, copyToClipboard]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
    },
    []
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      setSplitRatio(Math.max(0.2, Math.min(0.8, ratio)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    if (!isDragging) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = (e.touches[0].clientX - rect.left) / rect.width;
      setSplitRatio(Math.max(0.2, Math.min(0.8, ratio)));
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  return (
    <div className="app-container">
      <header className="toolbar">
        <div className="toolbar-left">
          <select
            className="language-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
        <div className="toolbar-right">
          <button className="toolbar-btn" onClick={handleCopyLeft}>
            <span className="btn-icon">←</span>
            <span className="btn-text">复制左版</span>
          </button>
          <button className="toolbar-btn" onClick={handleCopyRight}>
            <span className="btn-icon">→</span>
            <span className="btn-text">复制右版</span>
          </button>
          <button className="toolbar-btn" onClick={handleCopyMerged}>
            <span className="btn-icon">↔</span>
            <span className="btn-text">复制合并版</span>
          </button>
        </div>
      </header>

      <div className="editor-container" ref={containerRef}>
        <div
          className="editor-pane"
          style={{ width: `${splitRatio * 100}%` }}
        >
          <div className="pane-header">旧版本</div>
          <textarea
            ref={leftTextareaRef}
            className="code-textarea"
            value={leftCode}
            onChange={handleLeftChange}
            onScroll={handleLeftScroll}
            placeholder="在此粘贴或输入旧版代码..."
            spellCheck={false}
          />
        </div>

        <div
          className={`divider ${isDragging ? 'divider-active' : ''}`}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
        />

        <div
          className="editor-pane"
          style={{ width: `${(1 - splitRatio) * 100}%` }}
        >
          <div className="pane-header">新版本</div>
          <textarea
            ref={rightTextareaRef}
            className="code-textarea"
            value={rightCode}
            onChange={handleRightChange}
            onScroll={handleRightScroll}
            placeholder="在此粘贴或输入新版代码..."
            spellCheck={false}
          />
        </div>
      </div>

      {diffResult && (
        <div className="diff-section">
          <div className="diff-header">差异对比结果</div>
          <SideBySideView diffResult={diffResult} language={language} />
        </div>
      )}

      {copyToast && (
        <div className="copy-toast">复制成功</div>
      )}

      <button
        className="help-btn"
        onClick={() => setShowHelp(true)}
        aria-label="帮助"
      >
        &lt;/&gt;
      </button>

      {showHelp && (
        <div className="modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>使用帮助</h2>
            <ul>
              <li>在左侧文本框输入或粘贴旧版代码</li>
              <li>在右侧文本框输入或粘贴新版代码</li>
              <li>输入代码后系统自动进行差异对比（防抖300ms）</li>
              <li>
                <span style={{ color: '#2d6a4f' }}>绿色背景</span>：新增行　
                <span style={{ color: '#c0392b' }}>红色背景</span>：删除行　
                <span style={{ color: '#e67e22' }}>黄色背景</span>：修改行
              </li>
              <li>点击高亮行可查看差异说明气泡</li>
              <li>工具栏可切换语言、复制代码版本</li>
              <li>拖拽中间分隔线可调整左右区域宽度</li>
              <li>合并版规则：保留未修改行 + 新增/修改行，忽略删除行</li>
            </ul>
            <button
              className="modal-close-btn"
              onClick={() => setShowHelp(false)}
            >
              知道了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
