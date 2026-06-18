import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useStoryStore } from './store';
import { Paragraph } from '../shared/types';

const ParagraphBlock: React.FC<{
  paragraph: Paragraph;
  isActive: boolean;
  isHighlighted: boolean;
  highlightedBy: string;
  onClick: () => void;
  onFork: () => void;
  onContentChange: (content: string) => void;
  onActivate: () => void;
}> = ({ paragraph, isActive, isHighlighted, highlightedBy, onClick, onFork, onContentChange, onActivate }) => {
  const [content, setContent] = useState(paragraph.content);
  const [showHistory, setShowHistory] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(paragraph.content.length > 5000);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setContent(paragraph.content);
  }, [paragraph.content]);

  useEffect(() => {
    if (isActive && textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, [isActive]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onContentChange(val);
    }, 150);
  };

  const displayContent = isCollapsed && content.length > 5000
    ? content.slice(0, 200)
    : content;

  const timeStr = new Date(paragraph.updatedAt).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`paragraph-block${isHighlighted ? ' highlighted' : ''}`}
      style={{
        ...styles.block,
        backgroundColor: isHighlighted ? '#FFFDE7' : '#fff',
        transition: 'background-color 0.5s ease',
      }}
      onClick={onClick}
    >
      <div style={styles.blockHeader}>
        <span style={styles.authorName}>{paragraph.authorName || '匿名'}</span>
        <span style={styles.blockTime}>{timeStr}</span>
        {isHighlighted && highlightedBy && (
          <span style={styles.highlightBadge}>{highlightedBy} 编辑</span>
        )}
      </div>

      {isActive ? (
        <textarea
          ref={textAreaRef}
          style={styles.textarea}
          value={content}
          onChange={handleChange}
          onFocus={onActivate}
          placeholder="在这里写下你的故事段落..."
        />
      ) : (
        <div
          style={styles.contentDisplay}
          onClick={() => { onActivate(); }}
        >
          {displayContent || (
            <span style={styles.placeholder}>点击编辑此段落...</span>
          )}
        </div>
      )}

      {content.length > 5000 && (
        <button
          style={styles.collapseBtn}
          onClick={(e) => { e.stopPropagation(); setIsCollapsed(!isCollapsed); }}
        >
          {isCollapsed ? '展开全文' : '收起'}
        </button>
      )}

      <div style={styles.blockFooter}>
        <button
          style={styles.historyBtn}
          onClick={(e) => { e.stopPropagation(); setShowHistory(!showHistory); }}
        >
          📝 修改历史 ({paragraph.history.length})
        </button>
        {showHistory && paragraph.history.length > 0 && (
          <div style={styles.historyDropdown}>
            {paragraph.history.map((entry, i) => (
              <div key={i} style={styles.historyItem}>
                <div style={styles.historyMeta}>
                  <span style={styles.historyAuthor}>{entry.authorName}</span>
                  <span style={styles.historyTime}>
                    {new Date(entry.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={styles.historyContent}>
                  {entry.content.length > 60
                    ? entry.content.slice(0, 60) + '...'
                    : entry.content}
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          className="fork-btn"
          style={styles.forkBtn}
          onClick={(e) => { e.stopPropagation(); onFork(); }}
        >
          🔀 分叉
        </button>
      </div>
    </div>
  );
};

const Editor: React.FC = () => {
  const {
    story,
    addParagraph,
    updateParagraph,
    forkParagraph,
    activeParagraphId,
    setActiveParagraph,
    highlightParagraphs,
  } = useStoryStore();

  const editorRef = useRef<HTMLDivElement>(null);

  const paragraphs = story?.paragraphs || [];

  const rootParagraphs = paragraphs.filter((p) => p.parentId === null);

  const getChildren = useCallback(
    (parentId: string): Paragraph[] =>
      paragraphs.filter((p) => p.parentId === parentId),
    [paragraphs]
  );

  const renderParagraphChain = (paragraph: Paragraph, depth: number = 0): React.ReactNode => {
    const children = getChildren(paragraph.id);
    const hl = highlightParagraphs.get(paragraph.id);
    const isActive = activeParagraphId === paragraph.id;

    return (
      <div key={paragraph.id} style={{ marginBottom: 20 }}>
        <div id={`paragraph-${paragraph.id}`}>
          <ParagraphBlock
            paragraph={paragraph}
            isActive={isActive}
            isHighlighted={!!hl}
            highlightedBy={hl?.updatedBy || ''}
            onClick={() => setActiveParagraph(paragraph.id)}
            onFork={() => forkParagraph(paragraph.id)}
            onContentChange={(content) => updateParagraph(paragraph.id, content)}
            onActivate={() => setActiveParagraph(paragraph.id)}
          />
        </div>

        {children.length > 0 && (
          <div style={{ marginLeft: depth === 0 ? 0 : 24, marginTop: 12 }}>
            {children.length > 1 && (
              <div style={styles.branchLabel}>
                {children.length} 个分支
              </div>
            )}
            {children.map((child) => renderParagraphChain(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const handleAddNew = useCallback(() => {
    const lastRoot = rootParagraphs[rootParagraphs.length - 1];
    addParagraph(lastRoot ? lastRoot.id : null);
  }, [rootParagraphs, addParagraph]);

  useEffect(() => {
    if (activeParagraphId) {
      const el = document.getElementById(`paragraph-${activeParagraphId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeParagraphId]);

  return (
    <div ref={editorRef} style={styles.editor}>
      {paragraphs.length === 0 && (
        <div style={styles.emptyState}>
          <p style={styles.emptyTitle}>✨ 开始你的故事</p>
          <p style={styles.emptySub}>点击下方按钮添加第一个段落</p>
        </div>
      )}

      {rootParagraphs.map((p) => renderParagraphChain(p))}

      <div
        className="add-paragraph-area"
        style={styles.addParagraphArea}
        onClick={handleAddNew}
      >
        <span style={styles.addParagraphIcon}>+</span>
        <span style={styles.addParagraphText}>添加新段落</span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  editor: {
    maxWidth: 800,
    margin: '0 auto',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 0',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 600,
    color: '#333',
    marginBottom: 8,
  },
  emptySub: {
    color: '#888',
    fontSize: 14,
  },
  block: {
    background: '#fff',
    borderRadius: 8,
    border: '1px solid #ddd',
    padding: 16,
    transition: 'background-color 0.5s ease',
  },
  blockHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  authorName: {
    fontWeight: 600,
    fontSize: 14,
    color: '#2196F3',
  },
  blockTime: {
    fontSize: 12,
    color: '#aaa',
  },
  highlightBadge: {
    fontSize: 11,
    background: '#FFF9C4',
    color: '#F57F17',
    padding: '2px 8px',
    borderRadius: 4,
  },
  contentDisplay: {
    minHeight: 48,
    fontSize: 15,
    lineHeight: 1.7,
    color: '#333',
    cursor: 'text',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  placeholder: {
    color: '#bbb',
    fontStyle: 'italic' as const,
  },
  textarea: {
    width: '100%',
    minHeight: 80,
    border: '1px solid #e0e0e0',
    borderRadius: 6,
    padding: 10,
    fontSize: 15,
    lineHeight: 1.7,
    resize: 'vertical' as const,
    outline: 'none',
    fontFamily: 'inherit',
    background: '#FAFBFC',
  },
  collapseBtn: {
    background: 'none',
    border: '1px solid #ddd',
    borderRadius: 4,
    padding: '4px 12px',
    fontSize: 12,
    color: '#888',
    cursor: 'pointer',
    marginTop: 8,
  },
  blockFooter: {
    display: 'flex',
    alignItems: 'flex-start' as const,
    justifyContent: 'space-between' as const,
    marginTop: 10,
    position: 'relative' as const,
  },
  historyBtn: {
    background: 'none',
    border: 'none',
    fontSize: 12,
    color: '#888',
    cursor: 'pointer',
    padding: '4px 0',
  },
  historyDropdown: {
    position: 'absolute' as const,
    bottom: '100%',
    left: 0,
    background: '#fff',
    borderRadius: 8,
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    padding: 8,
    maxHeight: 240,
    overflowY: 'auto' as const,
    minWidth: 260,
    zIndex: 10,
  },
  historyItem: {
    padding: '6px 8px',
    borderBottom: '1px solid #f0f0f0',
  },
  historyMeta: {
    display: 'flex',
    justifyContent: 'space-between' as const,
    marginBottom: 4,
  },
  historyAuthor: {
    fontSize: 12,
    fontWeight: 600,
    color: '#555',
  },
  historyTime: {
    fontSize: 11,
    color: '#bbb',
  },
  historyContent: {
    fontSize: 12,
    color: '#777',
    lineHeight: 1.4,
    whiteSpace: 'pre-wrap' as const,
  },
  forkBtn: {
    background: 'none',
    border: '1px solid #ddd',
    borderRadius: 4,
    padding: '4px 12px',
    fontSize: 12,
    color: '#888',
    cursor: 'pointer',
  },
  addParagraphArea: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
    border: '2px dashed #ddd',
    borderRadius: 8,
    cursor: 'pointer',
    marginTop: 8,
    color: '#aaa',
    transition: 'border-color 0.2s, color 0.2s',
  },
  addParagraphIcon: {
    fontSize: 20,
    fontWeight: 300,
  },
  addParagraphText: {
    fontSize: 14,
  },
  branchLabel: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: 600,
    marginBottom: 8,
    paddingLeft: 8,
    borderLeft: '3px solid #FF9800',
  },
};

export default Editor;
