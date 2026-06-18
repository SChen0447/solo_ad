import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import hljs from 'highlight.js';
import { useCodeReviewStore, type Annotation } from './store';

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

interface CodeLineProps {
  lineNumber: number;
  content: string;
  language: string;
  isSelected: boolean;
  annotations: Annotation[];
  isBlinking: boolean;
  onMouseDown: (line: number) => void;
  onMouseEnter: (line: number) => void;
}

function CodeLine({
  lineNumber,
  content,
  language,
  isSelected,
  annotations,
  isBlinking,
  onMouseDown,
  onMouseEnter,
}: CodeLineProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipTimer, setTooltipTimer] = useState<number | null>(null);

  const lineAnnotations = annotations.filter((a) => a.lineNumber === lineNumber);

  const highlightedContent = useMemo(() => {
    try {
      const result = hljs.highlight(content || ' ', { language });
      return result.value;
    } catch (e) {
      return content || ' ';
    }
  }, [content, language]);

  const handleMouseEnter = () => {
    if (lineAnnotations.length > 0) {
      const timer = window.setTimeout(() => {
        setTooltipVisible(true);
      }, 300);
      setTooltipTimer(timer);
    }
  };

  const handleMouseLeave = () => {
    if (tooltipTimer) {
      clearTimeout(tooltipTimer);
      setTooltipTimer(null);
    }
    setTooltipVisible(false);
  };

  const classes = [
    'code-line',
    isSelected ? 'selected' : '',
    isBlinking ? 'blink' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      onMouseDown={(e) => {
        e.preventDefault();
        onMouseDown(lineNumber);
      }}
      onMouseEnter={() => onMouseEnter(lineNumber)}
      onMouseOver={handleMouseEnter}
      onMouseOut={handleMouseLeave}
    >
      <span className="line-number">{lineNumber}</span>
      <span
        className="line-content"
        dangerouslySetInnerHTML={{ __html: `<code class="hljs language-${language}">${highlightedContent}</code>` }}
      />
      {lineAnnotations.length > 0 && (
        <>
          <div
            className="annotation-dot"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          />
          {tooltipVisible && (
            <div className="tooltip visible">
              {lineAnnotations.map((a) => (
                <div key={a.id} style={{ marginBottom: lineAnnotations.indexOf(a) < lineAnnotations.length - 1 ? 6 : 0 }}>
                  {a.content}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function SharePreview() {
  const snippet = useCodeReviewStore((state) => state.getCurrentSnippet());
  const currentView = useCodeReviewStore((state) => state.currentView);
  const selectedLines = useCodeReviewStore((state) => state.selectedLines);
  const setSelectedLines = useCodeReviewStore((state) => state.setSelectedLines);
  const addAnnotation = useCodeReviewStore((state) => state.addAnnotation);
  const generateShareLink = useCodeReviewStore((state) => state.generateShareLink);
  const saveToLocalStorage = useCodeReviewStore((state) => state.saveToLocalStorage);
  const setView = useCodeReviewStore((state) => state.setView);

  const [isSelecting, setIsSelecting] = useState(false);
  const [startLine, setStartLine] = useState<number | null>(null);
  const [showAnnotationInput, setShowAnnotationInput] = useState(false);
  const [annotationContent, setAnnotationContent] = useState('');
  const [blinkingLine, setBlinkingLine] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const codeLinesRef = useRef<HTMLDivElement>(null);

  const isShareView = currentView === 'share';

  const codeLines = useMemo(() => {
    if (!snippet) return [];
    return snippet.code.split('\n');
  }, [snippet]);

  const sortedAnnotations = useMemo(() => {
    if (!snippet) return [];
    return [...snippet.annotations].sort((a, b) => b.createdAt - a.createdAt);
  }, [snippet]);

  const isLineSelected = useCallback(
    (lineNumber: number) => {
      if (!selectedLines) return false;
      const [start, end] = selectedLines;
      return lineNumber >= Math.min(start, end) && lineNumber <= Math.max(start, end);
    },
    [selectedLines]
  );

  const handleLineMouseDown = useCallback(
    (line: number) => {
      if (isShareView) return;
      setIsSelecting(true);
      setStartLine(line);
      setSelectedLines([line, line]);
    },
    [setSelectedLines, isShareView]
  );

  const handleLineMouseEnter = useCallback(
    (line: number) => {
      if (!isSelecting || startLine === null || isShareView) return;
      setSelectedLines([startLine, line]);
    },
    [isSelecting, startLine, setSelectedLines, isShareView]
  );

  const handleMouseUp = useCallback(() => {
    setIsSelecting(false);
  }, []);

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  const handleAddAnnotation = () => {
    if (!selectedLines) return;
    setAnnotationContent('');
    setShowAnnotationInput(true);
  };

  const handleSubmitAnnotation = () => {
    if (!selectedLines || !annotationContent.trim()) return;
    const lineNumber = Math.min(selectedLines[0], selectedLines[1]);
    addAnnotation(lineNumber, annotationContent.trim());
    setShowAnnotationInput(false);
    setAnnotationContent('');
  };

  const handleCancelAnnotation = () => {
    setShowAnnotationInput(false);
    setAnnotationContent('');
  };

  const handleClearSelection = () => {
    setSelectedLines(null);
  };

  const handleAnnotationClick = (annotation: Annotation) => {
    setBlinkingLine(annotation.lineNumber);
    const codeCard = codeLinesRef.current;
    if (codeCard) {
      const lineElements = codeCard.querySelectorAll('.code-line');
      const targetLine = lineElements[annotation.lineNumber - 1];
      if (targetLine) {
        targetLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    setTimeout(() => setBlinkingLine(null), 900);
  };

  const handleCopyLink = () => {
    const link = generateShareLink();
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSave = () => {
    saveToLocalStorage();
    setView('share');
  };

  if (!snippet) {
    return <div>加载中...</div>;
  }

  return (
    <div className={isShareView ? 'share-layout' : ''}>
      <div className={isShareView ? 'code-panel' : ''}>
        {isShareView && (
          <div className="share-link-box">
            <span>{generateShareLink()}</span>
            <button className="button button-secondary" onClick={handleCopyLink}>
              {copied ? '已复制' : '复制链接'}
            </button>
          </div>
        )}

        {!isShareView && (
          <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
            <button className="button button-secondary" onClick={() => setView('editor')}>
              返回编辑
            </button>
            <button className="button button-primary" onClick={handleSave}>
              保存并分享
            </button>
          </div>
        )}

        <div className="code-card">
          {selectedLines && !isShareView && (
            <div className="floating-toolbar">
              <button className="toolbar-button primary" onClick={handleAddAnnotation}>
                添加批注
              </button>
              <button className="toolbar-button" onClick={handleClearSelection}>
                取消选择
              </button>
            </div>
          )}

          <div className="code-lines" ref={codeLinesRef}>
            {codeLines.map((line, index) => (
              <CodeLine
                key={index}
                lineNumber={index + 1}
                content={line}
                language={snippet.language}
                isSelected={isLineSelected(index + 1)}
                annotations={snippet.annotations}
                isBlinking={blinkingLine === index + 1}
                onMouseDown={handleLineMouseDown}
                onMouseEnter={handleLineMouseEnter}
              />
            ))}
          </div>
        </div>
      </div>

      {isShareView && (
        <div className="annotations-panel">
          <div className="annotations-list">
            <div className="annotations-list-header">
              批注列表 ({sortedAnnotations.length})
            </div>
            {sortedAnnotations.length === 0 ? (
              <div className="empty-annotations">暂无批注</div>
            ) : (
              sortedAnnotations.map((annotation) => (
                <div
                  key={annotation.id}
                  className="annotation-item"
                  onClick={() => handleAnnotationClick(annotation)}
                >
                  <div className="annotation-item-header">
                    <span className="annotation-line-tag">第 {annotation.lineNumber} 行</span>
                    <span className="annotation-time">
                      {formatDate(annotation.createdAt)}
                    </span>
                  </div>
                  <div className="annotation-preview">
                    {truncateText(annotation.content, 40)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {showAnnotationInput && (
        <div className="annotation-input-modal" onClick={handleCancelAnnotation}>
          <div className="annotation-input-box" onClick={(e) => e.stopPropagation()}>
            <h4>添加批注</h4>
            <textarea
              value={annotationContent}
              onChange={(e) => setAnnotationContent(e.target.value)}
              placeholder="请输入批注内容..."
              autoFocus
            />
            <div className="annotation-input-actions">
              <button className="button button-secondary" onClick={handleCancelAnnotation}>
                取消
              </button>
              <button
                className="button button-primary"
                onClick={handleSubmitAnnotation}
                disabled={!annotationContent.trim()}
              >
                提交
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
