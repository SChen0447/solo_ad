import { useState, useEffect, useRef, useCallback } from 'react';
import type { Bookmark } from '@/data/BookmarkDataService';

interface BookmarkGridProps {
  bookmarks: Bookmark[];
  onTagFilter: (tag: string) => void;
  onDelete: (id: string) => void;
}

interface DisplayCard extends Bookmark {
  isEntering: boolean;
  isExiting: boolean;
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

const EXIT_ANIMATION_DURATION = 200;

export default function BookmarkGrid({ bookmarks, onTagFilter, onDelete }: BookmarkGridProps) {
  const [displayCards, setDisplayCards] = useState<DisplayCard[]>([]);
  const exitTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearExitTimer = useCallback((id: string) => {
    const timer = exitTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      exitTimersRef.current.delete(id);
    }
  }, []);

  useEffect(() => {
    const currentIds = new Set(bookmarks.map((b) => b.id));

    setDisplayCards((prev) => {
      const nextCards: DisplayCard[] = [];
      const exitedIds = new Set<string>();

      for (const bm of bookmarks) {
        const prevCard = prev.find((c) => c.id === bm.id);
        if (prevCard) {
          nextCards.push({ ...bm, isEntering: prevCard.isEntering, isExiting: false });
        } else {
          nextCards.push({ ...bm, isEntering: true, isExiting: false });
          requestAnimationFrame(() => {
            setDisplayCards((curr) =>
              curr.map((c) => (c.id === bm.id ? { ...c, isEntering: false } : c))
            );
          });
        }
      }

      for (const card of prev) {
        if (!currentIds.has(card.id) && !card.isExiting) {
          nextCards.push({ ...card, isExiting: true });
          exitedIds.add(card.id);
          clearExitTimer(card.id);
          const timer = setTimeout(() => {
            setDisplayCards((curr) => curr.filter((c) => c.id !== card.id));
            exitTimersRef.current.delete(card.id);
          }, EXIT_ANIMATION_DURATION);
          exitTimersRef.current.set(card.id, timer);
        } else if (!currentIds.has(card.id) && card.isExiting) {
          nextCards.push(card);
        }
      }

      return nextCards.sort((a, b) => {
        if (a.isExiting !== b.isExiting) return a.isExiting ? 1 : -1;
        return b.createdAt - a.createdAt;
      });
    });
  }, [bookmarks, clearExitTimer]);

  useEffect(() => {
    return () => {
      exitTimersRef.current.forEach((timer) => clearTimeout(timer));
      exitTimersRef.current.clear();
    };
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      if (!window.confirm('确定要删除这个书签吗？')) return;

      setDisplayCards((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isExiting: true } : c))
      );
      clearExitTimer(id);
      const timer = setTimeout(() => {
        setDisplayCards((curr) => curr.filter((c) => c.id !== id));
        exitTimersRef.current.delete(id);
        onDelete(id);
      }, EXIT_ANIMATION_DURATION);
      exitTimersRef.current.set(id, timer);
    },
    [onDelete, clearExitTimer]
  );

  if (displayCards.length === 0) {
    return (
      <div className="bookmark-grid-empty">
        <div style={{ fontSize: 48, marginBottom: 16 }}>📌</div>
        <div style={{ color: '#888', fontSize: 16 }}>暂无书签，点击"导入书签"或手动添加</div>
      </div>
    );
  }

  return (
    <div className="bookmark-grid">
      {displayCards.map((card) => (
        <div
          key={card.id}
          className={`bookmark-card ${card.isEntering ? 'card-enter' : ''} ${card.isExiting ? 'card-exit' : ''}`}
          onClick={() => !card.isExiting && window.open(card.url, '_blank')}
          data-id={card.id}
        >
          <div className="card-favicon">
            <img
              src={`https://www.google.com/s2/favicons?domain=${getDomain(card.url)}&sz=32`}
              alt=""
              width={24}
              height={24}
              style={{ borderRadius: 4 }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.textContent = card.url.charAt(0).toUpperCase();
                  parent.style.display = 'flex';
                  parent.style.alignItems = 'center';
                  parent.style.justifyContent = 'center';
                  parent.style.fontSize = '16px';
                  parent.style.fontWeight = '700';
                  parent.style.color = '#6C63FF';
                  parent.style.background = 'rgba(108,99,255,0.1)';
                }
              }}
            />
          </div>
          <div className="card-title" title={card.title}>
            {truncate(card.title, 30)}
          </div>
          <div className="card-url" title={card.url}>
            {truncate(card.url, 40)}
          </div>
          <div className="card-time">{formatTimestamp(card.createdAt)}</div>
          <div className="card-tags">
            {card.tags.map((tag) => (
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
              handleDelete(card.id);
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
