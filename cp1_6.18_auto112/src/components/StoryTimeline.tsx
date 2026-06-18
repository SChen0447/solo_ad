import { useState, useEffect, useMemo, useRef } from 'react';
import { useStoryStore } from '../stores/useStoryStore';
import { formatTime } from '../utils/storyParser';
import type { Paragraph, Character } from '../utils/storyParser';

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'relative',
    padding: '8px 0 20px 28px',
  },
  timelineLine: {
    position: 'absolute',
    left: 11,
    top: 0,
    bottom: 0,
    width: 3,
    background: 'linear-gradient(180deg, rgba(180, 150, 110, 0.4) 0%, rgba(180, 150, 110, 0.1) 100%)',
    borderRadius: 2,
  },
  card: {
    position: 'relative',
    marginBottom: 20,
    padding: '18px 20px',
    background: 'rgba(255, 251, 240, 0.75)',
    borderRadius: 16,
    border: '1px solid rgba(180, 150, 110, 0.15)',
    boxShadow: '0 2px 12px rgba(93, 78, 55, 0.06)',
    transition: 'all 0.25s ease',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  cardDot: {
    position: 'absolute',
    left: -25,
    top: 24,
    width: 14,
    height: 14,
    borderRadius: '50%',
    border: '3px solid rgba(255, 251, 240, 0.9)',
    boxShadow: '0 0 0 2px rgba(180, 150, 110, 0.3)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    flexShrink: 0,
  },
  authorInfo: {
    flex: 1,
    minWidth: 0,
  },
  authorName: {
    fontSize: 14,
    fontWeight: 700,
    color: '#5d4e37',
  },
  timestamp: {
    fontSize: 12,
    color: '#8a7b65',
    marginTop: 2,
  },
  cardContent: {
    fontSize: 15,
    lineHeight: 1.85,
    color: '#5d4e37',
    wordBreak: 'break-word',
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 10,
  },
  branchBtn: {
    padding: '6px 14px',
    borderRadius: 12,
    border: 'none',
    background: 'rgba(138, 177, 125, 0.12)',
    color: '#6b8f5e',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  highlight: {
    padding: '1px 4px',
    borderRadius: 4,
    fontWeight: 600,
  },
  empty: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#8a7b65',
    fontSize: 14,
  },
  newBranchDialog: {
    marginTop: 12,
    padding: 14,
    background: 'rgba(138, 177, 125, 0.08)',
    borderRadius: 12,
    border: '1px solid rgba(138, 177, 125, 0.25)',
    display: 'flex',
    gap: 10,
    alignItems: 'center',
  },
  branchInput: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid rgba(180, 150, 110, 0.25)',
    background: 'rgba(255, 255, 255, 0.9)',
    color: '#5d4e37',
    fontSize: 13,
    outline: 'none',
  },
  confirmBtn: {
    padding: '8px 16px',
    borderRadius: 10,
    border: 'none',
    background: 'linear-gradient(135deg, #8ab17d 0%, #6b8f5e 100%)',
    color: 'white',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  cancelBranchBtn: {
    padding: '8px 14px',
    borderRadius: 10,
    border: '1px solid rgba(180, 150, 110, 0.25)',
    background: 'transparent',
    color: '#8a7b65',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
};

function renderHighlightedContent(content: string, characters: Character[]) {
  if (characters.length === 0) {
    return <span>{content}</span>;
  }

  const sorted = [...characters].sort((a, b) => b.name.length - a.name.length);
  const pattern = new RegExp(`@(${sorted.map((c) => c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');

  const parts: Array<{ text: string; char?: Character }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: content.slice(lastIndex, match.index) });
    }
    const charName = match[1];
    const char = characters.find((c) => c.name === charName);
    parts.push({ text: `@${charName}`, char });
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < content.length) {
    parts.push({ text: content.slice(lastIndex) });
  }

  return (
    <span>
      {parts.map((p, i) =>
        p.char ? (
          <span
            key={i}
            style={{
              ...styles.highlight,
              color: p.char.color,
              background: `${p.char.color}18`,
            }}
          >
            {p.text}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </span>
  );
}

interface ParagraphCardProps {
  paragraph: Paragraph;
  index: number;
  total: number;
  characters: Character[];
  branchColor: string;
  isNew: boolean;
  onAnimationDone: (id: string) => void;
}

function ParagraphCard({
  paragraph,
  index,
  total,
  characters,
  branchColor,
  isNew,
  onAnimationDone,
}: ParagraphCardProps) {
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleCreateBranch = async () => {
    if (!branchName.trim() || isCreating) return;
    setIsCreating(true);
    try {
      await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentParagraphId: paragraph.id,
          branchName: branchName.trim(),
        }),
      });
      setShowBranchDialog(false);
      setBranchName('');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      ref={cardRef}
      className={isNew ? 'timeline-card-new' : ''}
      style={{
        ...styles.card,
        animationDelay: isNew ? '0s' : undefined,
      }}
      onAnimationEnd={() => isNew && onAnimationDone(paragraph.id)}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          '0 6px 24px rgba(93, 78, 55, 0.1)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          '0 2px 12px rgba(93, 78, 55, 0.06)';
      }}
    >
      <div
        style={{
          ...styles.cardDot,
          background: branchColor,
        }}
      />
      <div style={styles.cardHeader}>
        <div style={{ ...styles.avatar, background: `${branchColor}22` }}>
          {paragraph.authorAvatar}
        </div>
        <div style={styles.authorInfo}>
          <div style={styles.authorName}>{paragraph.authorName}</div>
          <div style={styles.timestamp}>
            {formatTime(paragraph.timestamp)} · 第 {index + 1} / {total} 段
          </div>
        </div>
      </div>
      <div style={styles.cardContent}>
        {renderHighlightedContent(paragraph.content, characters)}
      </div>
      <div style={styles.cardFooter}>
        <button
          style={styles.branchBtn}
          onClick={() => {
            setShowBranchDialog(!showBranchDialog);
            setBranchName('');
          }}
        >
          🌿 创建分支
        </button>
      </div>
      {showBranchDialog && (
        <div style={styles.newBranchDialog}>
          <input
            style={styles.branchInput}
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            placeholder="输入分支名称，例如：另一个结局"
            autoFocus
          />
          <button
            style={styles.cancelBranchBtn}
            onClick={() => {
              setShowBranchDialog(false);
              setBranchName('');
            }}
          >
            取消
          </button>
          <button
            style={styles.confirmBtn}
            onClick={handleCreateBranch}
            disabled={!branchName.trim() || isCreating}
          >
            {isCreating ? '创建中...' : '创建'}
          </button>
        </div>
      )}
    </div>
  );
}

export function StoryTimeline() {
  const { paragraphs, currentBranchId, branches, characters } = useStoryStore();
  const [newParagraphIds, setNewParagraphIds] = useState<Set<string>>(new Set());
  const prevCountRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentParagraphs = useMemo(() => {
    if (!currentBranchId) return [];
    return paragraphs[currentBranchId] || [];
  }, [paragraphs, currentBranchId]);

  const currentBranch = useMemo(
    () => branches.find((b) => b.id === currentBranchId),
    [branches, currentBranchId]
  );

  useEffect(() => {
    if (currentParagraphs.length > prevCountRef.current && prevCountRef.current > 0) {
      const newIds = new Set<string>();
      const startIdx = prevCountRef.current;
      for (let i = startIdx; i < currentParagraphs.length; i++) {
        newIds.add(currentParagraphs[i].id);
      }
      setNewParagraphIds((prev) => {
        const next = new Set(prev);
        newIds.forEach((id) => next.add(id));
        return next;
      });

      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTo({
            top: containerRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
      }, 100);
    }
    prevCountRef.current = currentParagraphs.length;
  }, [currentParagraphs]);

  const handleAnimationDone = (id: string) => {
    setNewParagraphIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  return (
    <div
      ref={containerRef}
      style={{
        ...styles.wrapper,
        maxHeight: 'calc(100vh - 420px)',
        overflowY: 'auto',
        paddingRight: 8,
        scrollBehavior: 'smooth',
      }}
    >
      <style>{`
        @keyframes slideUpFadeIn {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .timeline-card-new {
          animation: slideUpFadeIn 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(180, 150, 110, 0.3);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(180, 150, 110, 0.5);
        }
      `}</style>
      <div style={styles.timelineLine} />
      {currentParagraphs.length === 0 ? (
        <div style={styles.empty}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
          还没有故事段落，开始写下第一段吧！
        </div>
      ) : (
        currentParagraphs.map((p, i) => (
          <ParagraphCard
            key={p.id}
            paragraph={p}
            index={i}
            total={currentParagraphs.length}
            characters={characters}
            branchColor={currentBranch?.color || '#5d4e37'}
            isNew={newParagraphIds.has(p.id)}
            onAnimationDone={handleAnimationDone}
          />
        ))
      )}
    </div>
  );
}
