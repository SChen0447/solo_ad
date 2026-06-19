import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Annotation,
  getSelectionRange,
  getSelectionCoords,
  getTextOffset,
  highlightText,
  clearAllHighlights,
  HighlightCoords,
} from './highlightUtils';

interface DocumentAreaProps {
  documentContent: string;
  annotations: Annotation[];
  onCreateAnnotation: (text: string, start: number, end: number) => Annotation;
}

export default function DocumentArea({
  documentContent,
  annotations,
  onCreateAnnotation,
}: DocumentAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [toolbarCoords, setToolbarCoords] = useState<HighlightCoords>({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  });
  const [currentRange, setCurrentRange] = useState<Range | null>(null);

  const applyAllHighlights = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    clearAllHighlights(container);

    const sorted = [...annotations].sort((a, b) => a.startOffset - b.startOffset);

    for (const annotation of sorted) {
      highlightText(container, annotation);
    }
  }, [annotations]);

  useEffect(() => {
    applyAllHighlights();
  }, [applyAllHighlights]);

  const handleMouseUp = useCallback(() => {
    setTimeout(() => {
      const range = getSelectionRange();
      if (!range || !containerRef.current) {
        setToolbarVisible(false);
        setCurrentRange(null);
        return;
      }

      if (!containerRef.current.contains(range.commonAncestorContainer)) {
        setToolbarVisible(false);
        setCurrentRange(null);
        return;
      }

      const text = range.toString().trim();
      if (text.length === 0) {
        setToolbarVisible(false);
        setCurrentRange(null);
        return;
      }

      const coords = getSelectionCoords(range);
      setToolbarCoords(coords);
      setCurrentRange(range.cloneRange());
      setToolbarVisible(true);
    }, 10);
  }, []);

  const handleHighlightAndAnnotate = useCallback(() => {
    if (!currentRange || !containerRef.current) return;

    const text = currentRange.toString().trim();
    if (text.length === 0) return;

    const startOffset = getTextOffset(
      containerRef.current,
      currentRange.startContainer,
      currentRange.startOffset
    );
    const endOffset = getTextOffset(
      containerRef.current,
      currentRange.endContainer,
      currentRange.endOffset
    );

    if (startOffset === -1 || endOffset === -1) return;

    window.getSelection()?.removeAllRanges();

    onCreateAnnotation(text, startOffset, endOffset);

    setToolbarVisible(false);
    setCurrentRange(null);
  }, [currentRange, onCreateAnnotation]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-toolbar]')) return;
    },
    []
  );

  const paragraphs = documentContent.split('\n\n');

  return (
    <div
      style={styles.wrapper}
      onMouseUp={handleMouseUp}
      onMouseDown={handleMouseDown}
    >
      <div style={styles.header}>
        <div style={styles.headerIcon}>📄</div>
        <div>
          <div style={styles.headerTitle}>协作文档</div>
          <div style={styles.headerSubtitle}>团队审阅与批注</div>
        </div>
      </div>
      <div ref={containerRef} style={styles.content}>
        {paragraphs.map((p, i) => (
          <p key={i} style={styles.paragraph}>
            {p}
          </p>
        ))}
      </div>

      {toolbarVisible && (
        <div
          data-toolbar="true"
          style={{
            ...styles.toolbar,
            top: toolbarCoords.top - 44,
            left: toolbarCoords.left,
          }}
          className="annotation-toolbar"
        >
          <button
            style={styles.toolbarButton}
            onClick={handleHighlightAndAnnotate}
            className="toolbar-btn"
          >
            🖍️ 高亮并批注
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    width: '70%',
    height: '100vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f8f9fa',
    position: 'relative',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '20px 32px',
    borderBottom: '1px solid #e9ecef',
    backgroundColor: '#ffffff',
    flexShrink: 0,
  },
  headerIcon: {
    fontSize: '28px',
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f0fe',
    borderRadius: '10px',
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#212529',
    lineHeight: 1.3,
  },
  headerSubtitle: {
    fontSize: '13px',
    color: '#6c757d',
    lineHeight: 1.4,
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '28px 32px',
    lineHeight: 1.85,
    fontSize: '15px',
    color: '#212529',
  },
  paragraph: {
    marginBottom: '20px',
    textIndent: '2em',
  },
  toolbar: {
    position: 'fixed',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    animation: 'toolbarPop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  toolbarButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0, 123, 255, 0.35)',
    whiteSpace: 'nowrap',
    transition: 'background-color 0.15s ease',
  },
};
