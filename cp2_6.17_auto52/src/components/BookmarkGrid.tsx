import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Bookmark } from '../types/bookmark';
import { formatTimestamp, truncateText, getFaviconUrl, getDomainFromUrl } from '../utils/bookmarkParser';
import './BookmarkGrid.css';

interface BookmarkGridProps {
  bookmarks: Bookmark[];
  onTagFilter: (tag: string) => void;
  onDelete: (id: string) => void;
}

interface AnimatedBookmark extends Bookmark {
  animationState: 'entering' | 'visible' | 'exiting';
}

export function BookmarkGrid({ bookmarks, onTagFilter, onDelete }: BookmarkGridProps) {
  const [animatedBookmarks, setAnimatedBookmarks] = useState<AnimatedBookmark[]>([]);

  useEffect(() => {
    const currentIds = new Set(animatedBookmarks.map(b => b.id));
    const newIds = new Set(bookmarks.map(b => b.id));

    const exiting = animatedBookmarks
      .filter(b => !newIds.has(b.id))
      .map(b => ({ ...b, animationState: 'exiting' as const }));

    const entering = bookmarks
      .filter(b => !currentIds.has(b.id))
      .map(b => ({ ...b, animationState: 'entering' as const }));

    const staying = animatedBookmarks
      .filter(b => newIds.has(b.id))
      .map(b => ({ ...b, animationState: 'visible' as const }));

    setAnimatedBookmarks([...staying, ...entering, ...exiting]);

    const timers: number[] = [];

    entering.forEach((b, index) => {
      timers.push(window.setTimeout(() => {
        setAnimatedBookmarks(prev =>
          prev.map(item =>
            item.id === b.id ? { ...item, animationState: 'visible' } : item
          )
        );
      }, index * 50));
    });

    exiting.forEach(b => {
      timers.push(window.setTimeout(() => {
        setAnimatedBookmarks(prev => prev.filter(item => item.id !== b.id));
      }, 200));
    });

    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, [bookmarks]);

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('确定要删除这个书签吗？')) {
      onDelete(id);
    }
  };

  const handleTagClick = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation();
    onTagFilter(tag);
  };

  const handleCardClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (animatedBookmarks.length === 0) {
    return (
      <div className="bookmark-grid empty">
        <div className="empty-state">
          <p>暂无书签</p>
          <p className="empty-subtitle">点击"导入书签"或"添加书签"开始收藏</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bookmark-grid">
      {animatedBookmarks.map((bookmark) => (
        <div
          key={bookmark.id}
          className={`bookmark-card ${bookmark.animationState}`}
          onClick={() => handleCardClick(bookmark.url)}
        >
          <button
            className="delete-btn"
            onClick={(e) => handleDeleteClick(e, bookmark.id)}
            title="删除"
          >
            <X size={14} />
          </button>

          <div className="card-icon">
            <img
              src={getFaviconUrl(bookmark.url)}
              alt=""
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>

          <h3 className="card-title" title={bookmark.title}>
            {truncateText(bookmark.title, 25)}
          </h3>

          <div className="card-tags">
            {bookmark.tags.map((tag) => (
              <span
                key={tag}
                className="card-tag"
                onClick={(e) => handleTagClick(e, tag)}
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="card-time">
            {formatTimestamp(bookmark.timestamp)}
          </div>

          <div className="card-url" title={bookmark.url}>
            {truncateText(getDomainFromUrl(bookmark.url), 30)}
          </div>
        </div>
      ))}
    </div>
  );
}
