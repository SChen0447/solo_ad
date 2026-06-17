import { useState, useEffect, useRef } from 'react';
import type { Bookmark } from '@/data/BookmarkDataService';

interface BookmarkGridProps {
  bookmarks: Bookmark[];
  onTagFilter: (tag: string) => void;
  onDelete: (id: string) => void;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '...' : str;
}

interface CardState {
  id: string;
  exiting: boolean;
}

export default function BookmarkGrid({ bookmarks, onTagFilter, onDelete }: BookmarkGridProps) {
  const [cardStates, setCardStates] = useState<Map<string, CardState>>(new Map());
  const prevIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(bookmarks.map((b) => b.id));
    const newStates = new Map<string, CardState>();

    bookmarks.forEach((bm) => {
      if (!prevIds.current.has(bm.id)) {
        newStates.set(bm.id, { id: bm.id, exiting: false });
      } else {
        const existing = cardStates.get(bm.id);
        newStates.set(bm.id, existing || { id: bm.id, exiting: false });
      }
    });

    prevIds.current.forEach((id) => {
      if (!currentIds.has(id) && !newStates.has(id)) {
        const existing = cardStates.get(id);
        if (existing && !existing.exiting) {
          newStates.set(id, { id, exiting: true });
        }
      }
    });

    setCardStates(newStates);
  }, [bookmarks]);

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这个书签吗？')) {
      setCardStates((prev) => {
        const next = new Map(prev);
        next.set(id, { id, exiting: true });
        return next;
      });
      setTimeout(() => onDelete(id), 200);
    }
  };

  const displayBookmarks = bookmarks.filter((bm) => {
    const state = cardStates.get(bm.id);
    return state && !state.exiting;
  });

  const exitingIds = Array.from(cardStates.entries())
    .filter(([, s]) => s.exiting)
    .map(([, s]) => s.id);

  const allDisplayItems = [
    ...displayBookmarks.map((bm) => ({ ...bm, isExiting: false })),
    ...exitingIds
      .map((id) => bookmarks.find((b) => b.id === id))
      .filter((b): b is Bookmark => !!b)
      .map((bm) => ({ ...bm, isExiting: true })),
  ];

  if (bookmarks.length === 0 && exitingIds.length === 0) {
    return (
      <div className="bookmark-grid-empty">
        <div style={{ fontSize: 48, marginBottom: 16 }}>📌</div>
        <div style={{ color: '#888', fontSize: 16 }}>暂无书签，点击"导入书签"或手动添加</div>
      </div>
    );
  }

  return (
    <div className="bookmark-grid">
      {allDisplayItems.map((bm) => (
        <div
          key={bm.id}
          className={`bookmark-card ${bm.isExiting ? 'card-exit' : 'card-enter'}`}
          onClick={() => !bm.isExiting && window.open(bm.url, '_blank')}
        >
          <div className="card-favicon">
            <img
              src={`https://www.google.com/s2/favicons?domain=${getDomain(bm.url)}&sz=32`}
              alt=""
              width={24}
              height={24}
              style={{ borderRadius: 4 }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <div className="card-title" title={bm.title}>
            {truncate(bm.title, 30)}
          </div>
          <div className="card-url" title={bm.url}>
            {truncate(bm.url, 40)}
          </div>
          <div className="card-time">{formatTimestamp(bm.createdAt)}</div>
          <div className="card-tags">
            {bm.tags.map((tag) => (
              <span
                key={tag}
                className="card-tag"
                onClick={(e) => {
                  e.stopPropagation();
                  onTagFilter(tag);
                }}
              >
                {tag}
              </span>
            ))}
          </div>
          <button
            className="card-delete"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(bm.id);
            }}
            title="删除书签"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
