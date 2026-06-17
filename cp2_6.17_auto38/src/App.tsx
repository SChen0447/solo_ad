import { useState, useCallback, useRef, useEffect } from 'react';
import SideBySideView from '@/components/SideBySideView';
import Toolbar from '@/components/Toolbar';
import EditorPane from '@/components/EditorPane';
import HelpModal from '@/components/HelpModal';
import { compare, getMergedCode } from '@/utils/diffEngine';
import type { DiffResult, SupportedLanguage } from '@/types';

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

const HELP_CONTENT = (
  <>
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
      <li>按 ESC 键或点击遮罩层可关闭弹窗</li>
    </ul>
  </>
);

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

  const leftTextareaRef = useRef<HTMLTextAreaElement>(null);
  const rightTextareaRef = useRef<HTMLTextAreaElement>(null);
  const isSyncingScroll = useRef(false);

  const runCompare = useCallback(
    (left: string, right: string) => {
      if (left.trim() && right.trim()) {
        setDiffResult(compare(left, right));
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
    copyToClipboard(getMergedCode(leftCode, rightCode));
  }, [leftCode, rightCode, copyToClipboard]);

  const handleDividerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
    },
    []
  );

  useEffect(() => {
    if (!isDragging) return;

    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      setSplitRatio(Math.max(0.2, Math.min(0.8, ratio)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };

    const handleMouseLeave = () => {
      setIsDragging(false);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, [isDragging]);

  useEffect(() => {
    if (!isDragging) return;

    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    const handleTouchMove = (e: TouchEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = (e.touches[0].clientX - rect.left) / rect.width;
      setSplitRatio(Math.max(0.2, Math.min(0.8, ratio)));
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };

    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, [isDragging]);

  return (
    <div className="app-container">
      <Toolbar
        language={language}
        onLanguageChange={setLanguage}
        onCopyLeft={handleCopyLeft}
        onCopyRight={handleCopyRight}
        onCopyMerged={handleCopyMerged}
      />

      <div className="editor-container" ref={containerRef}>
        <EditorPane
          title="旧版本"
          value={leftCode}
          onChange={handleLeftChange}
          onScroll={handleLeftScroll}
          placeholder="在此粘贴或输入旧版代码..."
          ref={leftTextareaRef}
          style={{ width: `${splitRatio * 100}%` }}
        />

        <div
          className={`divider ${isDragging ? 'divider-active' : ''}`}
          onMouseDown={handleDividerMouseDown}
          onTouchStart={handleDividerMouseDown}
        />

        <EditorPane
          title="新版本"
          value={rightCode}
          onChange={handleRightChange}
          onScroll={handleRightScroll}
          placeholder="在此粘贴或输入新版代码..."
          ref={rightTextareaRef}
          style={{ width: `${(1 - splitRatio) * 100}%` }}
        />
      </div>

      {diffResult && (
        <div className="diff-section">
          <div className="diff-header">差异对比结果</div>
          <SideBySideView diffResult={diffResult} language={language} />
        </div>
      )}

      {copyToast && <div className="copy-toast">复制成功</div>}

      <button
        className="help-btn"
        onClick={() => setShowHelp(true)}
        aria-label="帮助"
      >
        &lt;/&gt;
      </button>

      <HelpModal visible={showHelp} onClose={() => setShowHelp(false)}>
        {HELP_CONTENT}
      </HelpModal>
    </div>
  );
}
