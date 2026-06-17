import { useState, useCallback } from 'react';
import type { Review, DiffLine } from './types';
import { computeDiff } from './utils/diffUtils';
import DiffView from './components/DiffView';
import SummaryPanel from './components/SummaryPanel';

const MAX_CHARS = 5000;

function App() {
  const [oldCode, setOldCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [isCompared, setIsCompared] = useState(false);
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [leftWidth, setLeftWidth] = useState(45);
  const [copied, setCopied] = useState(false);

  const handleCompare = useCallback(() => {
    const result = computeDiff(oldCode, newCode);
    setDiffLines(result);
    setIsCompared(true);
  }, [oldCode, newCode]);

  const handleAddReview = useCallback((review: Review) => {
    setReviews(prev => {
      const filtered = prev.filter(r => r.lineNumber !== review.lineNumber);
      return [...filtered, review];
    });
  }, []);

  const handleDeleteReview = useCallback((lineNumber: number) => {
    setReviews(prev => prev.filter(r => r.lineNumber !== lineNumber));
  }, []);

  const handleReset = useCallback(() => {
    setIsCompared(false);
    setDiffLines([]);
    setReviews([]);
  }, []);

  const handleExport = useCallback(() => {
    if (reviews.length === 0) return;
    const ratingMap: Record<string, string> = {
      pass: '通过',
      fail: '不通过',
      needs_review: '需修改',
    };
    const report = reviews
      .sort((a, b) => a.lineNumber - b.lineNumber)
      .map(r => `行号${r.lineNumber}：${ratingMap[r.rating] || r.rating} - ${r.comment}`)
      .join('\n');
    navigator.clipboard.writeText(report).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [reviews]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftWidth;
    const containerWidth = window.innerWidth - 300;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.min(70, Math.max(20, startWidth + (delta / containerWidth) * 100));
      setLeftWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [leftWidth]);

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-title">代码变更差异标注与评审协作看板</div>
        <div className="navbar-actions">
          {isCompared && (
            <button className="btn-reset" onClick={handleReset}>重新对比</button>
          )}
          <button
            className="btn-export"
            onClick={handleExport}
            disabled={reviews.length === 0}
          >
            导出评审报告
          </button>
          {copied && <span className="copy-toast">已复制</span>}
        </div>
      </nav>

      <div className="main-content">
        <div className="workspace">
          {!isCompared ? (
            <div className="input-panel" style={{ width: '100%' }}>
              <div className="input-group">
                <label>旧版代码</label>
                <textarea
                  value={oldCode}
                  onChange={e => {
                    if (e.target.value.length <= MAX_CHARS) setOldCode(e.target.value);
                  }}
                  placeholder="粘贴旧版代码..."
                  className="code-input"
                />
                <span className="char-count">{oldCode.length}/{MAX_CHARS}</span>
              </div>
              <div className="input-group">
                <label>新版代码</label>
                <textarea
                  value={newCode}
                  onChange={e => {
                    if (e.target.value.length <= MAX_CHARS) setNewCode(e.target.value);
                  }}
                  placeholder="粘贴新版代码..."
                  className="code-input"
                />
                <span className="char-count">{newCode.length}/{MAX_CHARS}</span>
              </div>
              <button className="btn-compare" onClick={handleCompare}>
                对比
              </button>
            </div>
          ) : (
            <>
              <div
                className="input-panel-collapsed"
                style={{ width: `${leftWidth}%` }}
              >
                <div className="collapsed-header">
                  <span className="collapsed-label">旧版</span>
                  <pre className="collapsed-code">{oldCode}</pre>
                </div>
                <div className="collapsed-header">
                  <span className="collapsed-label">新版</span>
                  <pre className="collapsed-code">{newCode}</pre>
                </div>
              </div>
              <div
                className="divider"
                onMouseDown={handleMouseDown}
              />
              <div
                className="diff-area"
                style={{ width: `${100 - leftWidth}%` }}
              >
                <DiffView
                  diffLines={diffLines}
                  reviews={reviews}
                  onAddReview={handleAddReview}
                  onDeleteReview={handleDeleteReview}
                />
              </div>
            </>
          )}
        </div>

        {isCompared && (
          <SummaryPanel reviews={reviews} />
        )}
      </div>
    </div>
  );
}

export default App;
